import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { RecommendedItem } from '@/components/home/types';
import { useAppTheme } from '@/hooks/use-app-theme';

type RecommendedSectionProps = {
  items: RecommendedItem[];
};

export function RecommendedSection({ items }: RecommendedSectionProps) {
  const { theme } = useAppTheme();

  return (
    <View className="px-4 py-2">
      <Text className="mb-6 text-2xl italic" style={{ color: theme.text }}>
        Recommended for You
      </Text>
      <View className="flex-row flex-wrap justify-between">
        {items.map((item) => (
          <View key={item.id} className="mb-6 w-[48%]">
            <View className="mb-3 aspect-square overflow-hidden rounded-xl" style={{ backgroundColor: theme.surfaceMuted }}>
              <Image source={{ uri: item.image }} contentFit="cover" className="h-full w-full" />
            </View>
            <Text className="text-[11px] font-bold uppercase tracking-tight" style={{ color: theme.textMuted }}>
              {item.category}
            </Text>
            <Text className="text-base" style={{ color: theme.text }}>
              {item.name}
            </Text>
            <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
              {item.price}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
