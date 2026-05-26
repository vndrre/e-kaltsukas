import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSellDraft } from '@/hooks/sell-draft-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function SellReviewScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { images, removeAt, moveUp, moveDown, persistDraftSilentlyOnBlur } = useSellDraft();

  useFocusEffect(
    useCallback(() => {
      return () => {
        void persistDraftSilentlyOnBlur();
      };
    }, [persistDraftSilentlyOnBlur]),
  );

  useEffect(() => {
    if (images.length === 0) {
      router.replace('/(tabs)/sell');
    }
  }, [images.length, router]);

  if (images.length === 0) {
    return null;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between border-b px-4 py-3" style={{ borderColor: theme.border }}>
        <Pressable
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.surfaceMuted }}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Text className="text-base font-semibold" style={{ color: theme.text }}>
          Review photos
        </Text>
        <Pressable accessibilityLabel="Add more photos" hitSlop={12} onPress={() => router.back()} className="px-2 py-1">
          <Text className="text-sm font-bold" style={{ color: theme.primary }}>
            Add
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="text-sm" style={{ color: theme.textMuted }}>
          Reorder with arrows. Up to 4 images — the first is your cover.
        </Text>

        <View className="mt-5 gap-4">
          {images.map((img, index) => (
            <View
              key={`${img.uri}-${index}`}
              className="overflow-hidden rounded-2xl border"
              style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <View className="aspect-[4/3] w-full">
                <Image source={{ uri: img.uri }} className="h-full w-full" contentFit="cover" />
              </View>
              <View className="flex-row items-center justify-between px-3 py-2">
                <View className="flex-row gap-2">
                  <Pressable
                    accessibilityLabel="Move up"
                    disabled={index === 0}
                    onPress={() => moveUp(index)}
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: theme.surfaceMuted,
                      opacity: index === 0 ? 0.35 : 1,
                    }}>
                    <MaterialIcons name="keyboard-arrow-up" size={22} color={theme.text} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Move down"
                    disabled={index === images.length - 1}
                    onPress={() => moveDown(index)}
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: theme.surfaceMuted,
                      opacity: index === images.length - 1 ? 0.35 : 1,
                    }}>
                    <MaterialIcons name="keyboard-arrow-down" size={22} color={theme.text} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityLabel="Remove photo"
                  onPress={() => removeAt(index)}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.surfaceMuted }}>
                  <MaterialIcons name="delete-outline" size={22} color={theme.primary} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        className="absolute left-0 right-0 border-t px-5 py-4"
        style={{
          bottom: 0,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }}>
        <Pressable
          className="items-center rounded-full py-4"
          style={{ backgroundColor: theme.primary }}
          onPress={() => router.push('/(tabs)/sell/details')}>
          <Text className="text-[12px] font-bold uppercase tracking-[1.8px]" style={{ color: theme.textOnPrimary }}>
            Continue to details
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
