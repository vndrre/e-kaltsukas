import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { RecommendedItem } from '@/components/home/types';
import { useAppTheme } from '@/hooks/use-app-theme';

type RecommendedSectionProps = {
  items: RecommendedItem[];
  onItemPress?: (item: RecommendedItem) => void;
};

export function RecommendedSection({ items, onItemPress }: RecommendedSectionProps) {
  const { theme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View className="px-5 py-2" style={{ opacity }}>
      <Text className="mb-8 text-4xl italic" style={{ color: theme.text }}>
        Selected for You
      </Text>
      <View className="flex-row flex-wrap justify-between">
        {items.map((item) => (
          <Pressable key={item.id} className="mb-8 w-[48%]" onPress={() => onItemPress?.(item)}>
            <View className="mb-4 aspect-square overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
              <Image source={{ uri: item.image }} contentFit="cover" className="h-full w-full" />
            </View>
            <Text className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: theme.textMuted }}>
              {item.category}
            </Text>
            <Text className="mt-1 text-lg" style={{ color: theme.text }}>
              {item.name}
            </Text>
            <Text className="mt-1 text-base font-bold" style={{ color: theme.primary }}>
              {item.price}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}
