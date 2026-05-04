import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/auth-provider';
import type { ListingDraftPayload } from '@/hooks/sell-draft-provider';
import { isListingDraftPayloadMeaningful, useSellDraft } from '@/hooks/sell-draft-provider';
import { getLastNonSellTabHref } from '@/hooks/last-non-sell-tab';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';

type FlashMode = 'off' | 'on' | 'auto';

type LeaveChoice = 'save' | 'discard' | 'cancel';

function promptLeaveNative(): Promise<LeaveChoice> {
  return new Promise((resolve) => {
    Alert.alert('Leave selling?', 'Save your listing as a draft to finish later.', [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
      {
        text: "Don't save",
        style: 'destructive',
        onPress: () => resolve('discard'),
      },
      { text: 'Save draft', onPress: () => resolve('save') },
    ]);
  });
}

/** `Alert.alert` with several actions is unreliable on RN Web; use confirms instead. */
function promptLeaveWeb(): Promise<LeaveChoice> {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    return Promise.resolve('cancel');
  }
  const saveFirst = window.confirm(
    'Save your listing as a draft before leaving?\n\nOK = Save draft and leave\nCancel = Choose another option',
  );
  if (saveFirst) {
    return Promise.resolve('save');
  }
  const discard = window.confirm(
    'Leave without saving this session?\n\nOK = Discard and leave\nCancel = Stay on this screen',
  );
  if (discard) {
    return Promise.resolve('discard');
  }
  return Promise.resolve('cancel');
}

export default function SellCaptureScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { token, isHydrated } = useAuth();
  const insets = useSafeAreaInsets();
  /** Safe area + breathing room; web often has insets.top === 0. */
  const headerTopPadding = Math.max(insets.top, 12) + 10;
  const {
    images,
    remainingSlots,
    addFromAssets,
    clear,
    deleteServerDraft,
    hasMeaningfulLocalDraft,
    hydrateFromServerPayload,
    persistDraftToServer,
    persistDraftSilentlyOnBlur,
  } = useSellDraft();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const exitToTabs = useCallback(() => {
    router.replace(getLastNonSellTabHref());
  }, [router]);

  const handleClose = useCallback(() => {
    void (async () => {
      if (!hasMeaningfulLocalDraft()) {
        exitToTabs();
        return;
      }

      const choice = Platform.OS === 'web' ? await promptLeaveWeb() : await promptLeaveNative();
      if (choice === 'cancel') {
        return;
      }
      if (choice === 'discard') {
        void deleteServerDraft();
        clear();
        exitToTabs();
        return;
      }

      const result = await persistDraftToServer();
      if (!result.ok) {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(result.message);
        } else {
          Alert.alert('Draft not saved', result.message);
        }
        return;
      }
      clear();
      exitToTabs();
    })();
  }, [clear, deleteServerDraft, exitToTabs, hasMeaningfulLocalDraft, persistDraftToServer]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void persistDraftSilentlyOnBlur();
      };
    }, [persistDraftSilentlyOnBlur]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!isHydrated || !token) {
        return undefined;
      }

      let cancelled = false;

      const maybeOfferResume = async () => {
        if (hasMeaningfulLocalDraft()) {
          return;
        }

        try {
          const res = await api.get('/items/draft', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cancelled) {
            return;
          }

          const payload = res.data?.draft?.payload as Partial<ListingDraftPayload> | undefined;
          if (!isListingDraftPayloadMeaningful(payload)) {
            return;
          }
          if (cancelled) {
            return;
          }

          const fullPayload: ListingDraftPayload = {
            title: payload.title ?? '',
            story: payload.story ?? '',
            condition: payload.condition ?? '',
            category: payload.category ?? '',
            size: payload.size ?? '',
            brand: payload.brand ?? '',
            price: payload.price ?? '',
            audience: payload.audience ?? '',
            imageUrls: Array.isArray(payload.imageUrls) ? payload.imageUrls : [],
          };

          if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
            const resume = window.confirm(
              'You have an unfinished listing saved from before.\n\nOK = Continue editing\nCancel = Discard saved draft',
            );
            if (resume) {
              hydrateFromServerPayload(fullPayload);
              router.replace('/(tabs)/sell/details');
            } else {
              void deleteServerDraft();
            }
          } else {
            Alert.alert('Resume listing draft?', 'You have an unfinished listing saved from before.', [
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  void deleteServerDraft();
                },
              },
              {
                text: 'Continue',
                onPress: () => {
                  hydrateFromServerPayload(fullPayload);
                  router.replace('/(tabs)/sell/details');
                },
              },
            ]);
          }
        } catch {
          /* ignore */
        }
      };

      void maybeOfferResume();

      return () => {
        cancelled = true;
      };
    }, [
      deleteServerDraft,
      hasMeaningfulLocalDraft,
      hydrateFromServerPayload,
      isHydrated,
      router,
      token,
    ]),
  );

  const openLibrary = useCallback(async () => {
    if (remainingSlots <= 0) {
      Alert.alert('Limit reached', 'You can add up to 4 photos.');
      return;
    }

    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      Alert.alert('Permission required', 'Enable photo library access to pick images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    addFromAssets(
      result.assets.map((a) => ({
        uri: a.uri,
        fileName: a.fileName,
        mimeType: a.mimeType,
      })),
    );
  }, [addFromAssets, remainingSlots]);

  const takePhoto = useCallback(async () => {
    if (remainingSlots <= 0) {
      Alert.alert('Limit reached', 'You can add up to 4 photos.');
      return;
    }

    if (Platform.OS === 'web') {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert('Permission required', 'Allow camera access to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }
      const a = result.assets[0];
      addFromAssets([{ uri: a.uri, fileName: a.fileName, mimeType: a.mimeType }]);
      return;
    }

    if (!cameraRef.current || !cameraReady) {
      return;
    }

    try {
      setIsTakingPhoto(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        addFromAssets([{ uri: photo.uri, mimeType: 'image/jpeg' }]);
      }
    } catch {
      Alert.alert('Camera', 'Could not take photo. Try again.');
    } finally {
      setIsTakingPhoto(false);
    }
  }, [addFromAssets, cameraReady, remainingSlots]);

  const cycleFlash = useCallback(() => {
    setFlash((prev) => (prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off'));
  }, []);

  const goReview = useCallback(() => {
    if (images.length === 0) {
      return;
    }
    router.push('/(tabs)/sell/review');
  }, [images.length, router]);

  const ensureCameraPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      return true;
    }
    if (permission?.granted) {
      return true;
    }
    const res = await requestPermission();
    return res.granted;
  }, [permission?.granted, requestPermission]);

  const flashIcon =
    flash === 'on' ? 'flash-on' : flash === 'auto' ? 'flash-auto' : 'flash-off';

  if (Platform.OS !== 'web' && !permission?.granted) {
    return (
      <View style={[styles.fill, { backgroundColor: '#0a0a0a', paddingTop: headerTopPadding }]}>
        <View className="flex-row items-center justify-between px-4 pb-2 pt-1">
          <Pressable
            accessibilityLabel="Close"
            hitSlop={16}
            onPress={handleClose}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <MaterialIcons name="photo-camera" size={48} color="rgba(255,255,255,0.5)" />
          <Text className="mt-4 text-center text-base" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Camera access lets you snap listing photos in one tap.
          </Text>
          <Pressable
            className="mt-6 rounded-full px-6 py-3"
            style={{ backgroundColor: theme.primary }}
            onPress={() => void ensureCameraPermission()}>
            <Text className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.textOnPrimary }}>
              Allow camera
            </Text>
          </Pressable>
          <Pressable className="mt-6" onPress={openLibrary}>
            <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
              Pick from library instead
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const chromePressableStyle = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : undefined;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fill, { backgroundColor: '#0a0a0a', paddingTop: headerTopPadding }]}>
        <View
          className="flex-row items-center justify-between px-3 pb-3 pt-1"
          style={{ zIndex: 20, position: 'relative' }}>
          <Pressable
            accessibilityLabel="Close"
            hitSlop={16}
            onPress={handleClose}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={[chromePressableStyle, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </Pressable>
          {images.length > 0 ? (
            <Pressable onPress={goReview} hitSlop={8} className="px-3 py-2" style={chromePressableStyle}>
              <Text className="text-base font-bold" style={{ color: theme.primary }}>
                Next
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 56 }} />
          )}
        </View>

        <View className="flex-1 items-center justify-center px-6" style={{ zIndex: 0 }}>
          <Text className="text-center text-lg text-white">Add listing photos</Text>
          <Text className="mt-2 text-center text-sm text-white/60">Use your camera or photo library.</Text>
        </View>

        {images.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
            {images.map((img, i) => (
              <View key={`${img.uri}-${i}`} className="h-16 w-16 overflow-hidden rounded-xl border-2 border-white">
                <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View
          className="flex-row items-end justify-between px-6 pt-3"
          style={{
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: 'rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}>
          <Pressable
            accessibilityLabel="Open photo library"
            onPress={openLibrary}
            className="mb-1 h-14 w-14 overflow-hidden rounded-xl"
            style={{
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.35)',
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}>
            {images.length > 0 ? (
              <Image source={{ uri: images[images.length - 1].uri }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <MaterialIcons name="photo-library" size={26} color="#fff" />
              </View>
            )}
          </Pressable>

          <Pressable
            accessibilityLabel="Take picture"
            onPress={takePhoto}
            className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <View className="h-[58px] w-[58px] rounded-full bg-white" />
          </Pressable>

          <View className="mb-1 h-14 w-14" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        mode="picture"
        onCameraReady={() => setCameraReady(true)}
      />

      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { paddingTop: headerTopPadding, zIndex: 20, elevation: 20 }]}>
        <View
          pointerEvents="box-none"
          className="flex-row items-center justify-between px-3 pt-1"
          style={{ zIndex: 30, elevation: 30 }}>
          <Pressable
            accessibilityLabel="Close"
            hitSlop={16}
            onPress={handleClose}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={[chromePressableStyle, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </Pressable>

          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityLabel="Flash mode"
              hitSlop={12}
              onPress={cycleFlash}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
              <MaterialIcons name={flashIcon} size={22} color="#fff" />
            </Pressable>
            {images.length > 0 ? (
              <Pressable onPress={goReview} hitSlop={8} className="px-3 py-2">
                <Text className="text-base font-bold" style={{ color: theme.primary }}>
                  Next
                </Text>
              </Pressable>
            ) : (
              <View style={{ width: 56 }} />
            )}
          </View>
        </View>

        <View style={{ flex: 1 }} pointerEvents="box-none" />

        <View style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
              {images.map((img, i) => (
                <View key={`${img.uri}-${i}`} className="h-16 w-16 overflow-hidden rounded-xl border-2 border-white">
                  <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View
            className="flex-row items-end justify-between px-6 pt-2"
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: 'rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(0,0,0,0.45)',
            }}>
            <Pressable
              accessibilityLabel="Open photo library"
              onPress={openLibrary}
              className="mb-1 h-14 w-14 overflow-hidden rounded-xl"
              style={{
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.35)',
                backgroundColor: 'rgba(255,255,255,0.08)',
              }}>
              {images.length > 0 ? (
                <Image source={{ uri: images[images.length - 1].uri }} style={{ flex: 1 }} contentFit="cover" />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <MaterialIcons name="photo-library" size={26} color="#fff" />
                </View>
              )}
            </Pressable>

            <Pressable
              accessibilityLabel="Take picture"
              disabled={!cameraReady || isTakingPhoto}
              onPress={takePhoto}
              className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white"
              style={{
                opacity: !cameraReady || isTakingPhoto ? 0.55 : 1,
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}>
              {isTakingPhoto ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="h-[58px] w-[58px] rounded-full bg-white" />
              )}
            </Pressable>

            <Pressable
              accessibilityLabel="Flip camera"
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              className="mb-1 h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
              <MaterialIcons name="flip-camera-ios" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#000',
  },
});
