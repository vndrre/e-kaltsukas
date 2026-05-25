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

const MAX_PHOTOS = 4;

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

type SellCaptureHeaderProps = {
  onClose: () => void;
  onNext?: () => void;
  showNext: boolean;
  topPadding: number;
  theme: ReturnType<typeof useAppTheme>['theme'];
  variant?: 'camera' | 'default';
};

function SellCaptureHeader({
  onClose,
  onNext,
  showNext,
  topPadding,
  theme,
  variant = 'default',
}: SellCaptureHeaderProps) {
  const isCamera = variant === 'camera';
  const iconColor = isCamera ? '#fff' : theme.text;
  const closeBackground = isCamera ? 'rgba(0,0,0,0.35)' : theme.surfaceMuted;

  return (
    <View
      className="flex-row items-center justify-between px-4 pb-4"
      style={{
        paddingTop: topPadding,
        borderBottomWidth: isCamera ? 0 : 1,
        borderBottomColor: theme.border,
        backgroundColor: isCamera ? 'transparent' : theme.background,
      }}>
      <Pressable
        accessibilityLabel="Close"
        hitSlop={16}
        onPress={onClose}
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: closeBackground }}>
        <MaterialIcons name="close" size={22} color={iconColor} />
      </Pressable>
      <Text className="text-2xl font-bold italic" style={{ color: theme.primary }}>
        Sell
      </Text>
      {showNext ? (
        <Pressable onPress={onNext} hitSlop={8} className="rounded-full px-3 py-2" style={{ backgroundColor: theme.primary }}>
          <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
            Next
          </Text>
        </Pressable>
      ) : (
        <View className="h-10 w-10" />
      )}
    </View>
  );
}

type PhotoStripProps = {
  images: { uri: string }[];
  theme: ReturnType<typeof useAppTheme>['theme'];
  variant?: 'camera' | 'default';
};

function PhotoStrip({ images, theme, variant = 'default' }: PhotoStripProps) {
  if (!images.length) {
    return null;
  }

  const borderColor = variant === 'camera' ? 'rgba(255,255,255,0.85)' : theme.border;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 12 }}>
      {images.map((img, index) => (
        <View
          key={`${img.uri}-${index}`}
          className="h-16 w-16 overflow-hidden rounded-2xl border"
          style={{ borderColor, backgroundColor: theme.surfaceMuted }}>
          <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        </View>
      ))}
    </ScrollView>
  );
}

export default function SellCaptureScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { token, isHydrated } = useAuth();
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 12) + 8;
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
      Alert.alert('Limit reached', `You can add up to ${MAX_PHOTOS} photos.`);
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
      result.assets.map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      })),
    );
  }, [addFromAssets, remainingSlots]);

  const takePhoto = useCallback(async () => {
    if (remainingSlots <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_PHOTOS} photos.`);
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
      const asset = result.assets[0];
      addFromAssets([{ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType }]);
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

  const flashIcon = flash === 'on' ? 'flash-on' : flash === 'auto' ? 'flash-auto' : 'flash-off';
  const showNext = images.length > 0;
  const chromePressableStyle = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : undefined;
  const photoCountLabel = `${images.length}/${MAX_PHOTOS}`;

  const renderSetupCard = (options: { showCameraAction: boolean; showPermissionAction?: boolean }) => (
    <View className="rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
      <Text className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
        Listing photos
      </Text>
      <Text className="mt-3 text-xl font-semibold" style={{ color: theme.text }}>
        Add up to {MAX_PHOTOS} photos
      </Text>
      <Text className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
        The first photo becomes your cover. Clear, well-lit shots help buyers trust the listing.
      </Text>

      <View
        className="mt-5 items-center rounded-3xl border border-dashed px-4 py-8"
        style={{ borderColor: theme.border, backgroundColor: theme.background }}>
        <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }}>
          <MaterialIcons name="photo-camera" size={28} color={theme.primary} />
        </View>
        <Text className="mt-4 text-sm font-semibold" style={{ color: theme.text }}>
          {images.length ? `${images.length} photo${images.length === 1 ? '' : 's'} added` : 'No photos yet'}
        </Text>
        <Text className="mt-1 text-xs uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
          {photoCountLabel} selected
        </Text>
      </View>

      <PhotoStrip images={images} theme={theme} />

      <Pressable
        className="mt-5 flex-row items-center justify-center rounded-full py-4"
        style={[chromePressableStyle, { backgroundColor: theme.primary }]}
        onPress={openLibrary}>
        <MaterialIcons name="photo-library" size={20} color={theme.textOnPrimary} />
        <Text className="ml-2 text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
          Upload from gallery
        </Text>
      </Pressable>

      {options.showCameraAction ? (
        <Pressable
          className="mt-3 flex-row items-center justify-center rounded-full border py-4"
          style={[chromePressableStyle, { borderColor: theme.border, backgroundColor: theme.background }]}
          onPress={takePhoto}>
          <MaterialIcons name="photo-camera" size={20} color={theme.text} />
          <Text className="ml-2 text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
            Take photo
          </Text>
        </Pressable>
      ) : null}

      {options.showPermissionAction ? (
        <Pressable
          className="mt-3 flex-row items-center justify-center rounded-full py-4"
          style={[chromePressableStyle, { backgroundColor: theme.primary }]}
          onPress={() => void ensureCameraPermission()}>
          <MaterialIcons name="photo-camera" size={20} color={theme.textOnPrimary} />
          <Text className="ml-2 text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
            Allow camera
          </Text>
        </Pressable>
      ) : null}

      {Platform.OS === 'web' ? (
        <Text className="mt-4 text-xs leading-5" style={{ color: theme.textMuted }}>
          On web, gallery upload works everywhere. Take photo uses your browser camera when it is available.
        </Text>
      ) : null}
    </View>
  );

  if (Platform.OS === 'web' || (Platform.OS !== 'web' && !permission?.granted)) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <SellCaptureHeader
          onClose={handleClose}
          onNext={goReview}
          showNext={showNext}
          topPadding={headerTopPadding}
          theme={theme}
        />
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 96 }}>
          {renderSetupCard({
            showCameraAction: Platform.OS === 'web',
            showPermissionAction: Platform.OS !== 'web',
          })}
        </ScrollView>
        {showNext ? (
          <View
            className="border-t px-4 pt-3"
            style={{
              borderTopColor: theme.border,
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            }}>
            <Pressable
              className="items-center rounded-full py-4"
              style={{ backgroundColor: theme.primary }}
              onPress={goReview}>
              <Text className="text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
                Continue to review
              </Text>
            </Pressable>
          </View>
        ) : null}
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

      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: headerTopPadding, zIndex: 20, elevation: 20 }]}>
        <View pointerEvents="box-none" className="flex-row items-center justify-between px-3 pt-1" style={{ zIndex: 30, elevation: 30 }}>
          <Pressable
            accessibilityLabel="Close"
            hitSlop={16}
            onPress={handleClose}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={[chromePressableStyle, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </Pressable>

          <Text className="text-2xl font-bold italic" style={{ color: theme.primary }}>
            Sell
          </Text>

          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityLabel="Flash mode"
              hitSlop={12}
              onPress={cycleFlash}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
              <MaterialIcons name={flashIcon} size={22} color="#fff" />
            </Pressable>
            {showNext ? (
              <Pressable onPress={goReview} hitSlop={8} className="rounded-full px-3 py-2" style={{ backgroundColor: theme.primary }}>
                <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
                  Next
                </Text>
              </Pressable>
            ) : (
              <View className="h-10 w-10" />
            )}
          </View>
        </View>

        <View style={{ flex: 1 }} pointerEvents="box-none" />

        <View style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          <PhotoStrip images={images} theme={theme} variant="camera" />
          <View
            className="flex-row items-end justify-between px-6 pt-3"
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: 'rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(0,0,0,0.45)',
            }}>
            <Pressable
              accessibilityLabel="Open photo library"
              onPress={openLibrary}
              className="mb-1 h-14 w-14 overflow-hidden rounded-2xl"
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
              className="mb-1 h-[72px] w-[72px] items-center justify-center rounded-full border-4"
              style={{
                opacity: !cameraReady || isTakingPhoto ? 0.55 : 1,
                borderColor: theme.primary,
                backgroundColor: 'rgba(0,0,0,0.35)',
              }}>
              {isTakingPhoto ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <View className="h-[58px] w-[58px] rounded-full" style={{ backgroundColor: theme.primary }} />
              )}
            </Pressable>

            <Pressable
              accessibilityLabel="Flip camera"
              onPress={() => setFacing((value) => (value === 'back' ? 'front' : 'back'))}
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
