import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { RecommendedItem } from '@/components/home/types';
import { useAppTheme } from '@/hooks/use-app-theme';

type RecommendedSectionProps = {
  items: RecommendedItem[];
  onItemPress: (item: RecommendedItem) => void;
  favoriteItemIds: Set<string>;
  onToggleFavorite: (itemId: string, willFavorite: boolean) => void;
};

export function RecommendedSection({ items, onItemPress, favoriteItemIds, onToggleFavorite }: RecommendedSectionProps) {
  const { theme } = useAppTheme();

  return (
    <View className="px-4 py-2">
      <Text className="mb-6 text-2xl italic" style={{ color: theme.text }}>
        Recommended for You
      </Text>
      <View className="flex-row flex-wrap justify-between">
        {items.map((item) => (
          <Pressable key={item.id} className="mb-6 w-[48%]" onPress={() => onItemPress(item)}>
            <View className="relative mb-3 aspect-square overflow-hidden rounded-xl" style={{ backgroundColor: theme.surfaceMuted }}>
              <Image source={{ uri: item.image }} contentFit="cover" className="h-full w-full" />
              <Pressable
                className="absolute right-2 top-2 rounded-full bg-black/20 p-2"
                onPress={() => onToggleFavorite(item.id, !favoriteItemIds.has(item.id))}>
                <MaterialIcons name={favoriteItemIds.has(item.id) ? "favorite" : "favorite-border"} size={16} color="#fff" />
              </Pressable>
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
          </Pressable>
        ))}
      </View>
    </View>
  );
}
