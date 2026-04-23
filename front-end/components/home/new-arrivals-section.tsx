import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ProductItem } from '@/components/home/types';
import { useAppTheme } from '@/hooks/use-app-theme';

type NewArrivalsSectionProps = {
  items: ProductItem[];
  onItemPress?: (item: ProductItem) => void;
};

export function NewArrivalsSection({ items, onItemPress }: NewArrivalsSectionProps) {
  const { theme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View className="py-10" style={{ opacity }}>
      <View className="mb-6 flex-row items-center justify-between px-5">
        <Text className="text-4xl italic" style={{ color: theme.text }}>
          New Arrivals
        </Text>
        <Text className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: theme.primary }}>
          View All
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {items.map((item) => (
          <TouchableOpacity key={item.id} className="mr-5 w-72" activeOpacity={0.9} onPress={() => onItemPress?.(item)}>
            <View className="relative mb-4 h-96 overflow-hidden rounded-3xl" style={{ backgroundColor: theme.surface }}>
              <Image source={{ uri: item.image }} contentFit="cover" className="h-full w-full" />
              <TouchableOpacity className="absolute right-4 top-4 rounded-full bg-black/20 p-2.5">
                <MaterialIcons name="favorite-border" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text className="text-2xl" style={{ color: theme.text }}>
              {item.name}
            </Text>
            <Text className="mt-1 text-lg font-bold" style={{ color: theme.primary }}>
              {item.price}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
}
