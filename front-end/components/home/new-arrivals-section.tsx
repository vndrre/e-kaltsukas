import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ProductItem } from '@/components/home/types';
import { useAppTheme } from '@/hooks/use-app-theme';

type NewArrivalsSectionProps = {
  items: ProductItem[];
  onItemPress: (item: ProductItem) => void;
  favoriteItemIds: Set<string>;
  onToggleFavorite: (itemId: string, willFavorite: boolean) => void;
};

export function NewArrivalsSection({ items, onItemPress, favoriteItemIds, onToggleFavorite }: NewArrivalsSectionProps) {
  const { theme } = useAppTheme();

  return (
    <View className="py-6">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="text-2xl italic" style={{ color: theme.text }}>
          New Arrivals
        </Text>
        <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
          View All
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {items.map((item) => (
          <Pressable key={item.id} className="mr-4 w-64" onPress={() => onItemPress(item)}>
            <View className="relative mb-3 h-80 overflow-hidden rounded-xl" style={{ backgroundColor: theme.surfaceMuted }}>
              <Image source={{ uri: item.image }} contentFit="cover" className="h-full w-full" />
              <TouchableOpacity
                className="absolute right-3 top-3 rounded-full bg-black/20 p-2"
                onPress={() => onToggleFavorite(item.id, !favoriteItemIds.has(item.id))}>
                <MaterialIcons name={favoriteItemIds.has(item.id) ? "favorite" : "favorite-border"} size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text className="text-lg" style={{ color: theme.text }}>
              {item.name}
            </Text>
            <Text className="mt-1 font-semibold" style={{ color: theme.primary }}>
              {item.price}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
