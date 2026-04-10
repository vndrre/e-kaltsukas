import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ProductItem } from '@/components/home/types';

type NewArrivalsSectionProps = {
  items: ProductItem[];
};

export function NewArrivalsSection({ items }: NewArrivalsSectionProps) {
  return (
    <View className="py-6">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="text-2xl italic text-slate-100">New Arrivals</Text>
        <Text className="text-sm font-semibold text-[#ecb613]">View All</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {items.map((item) => (
          <View key={item.id} className="mr-4 w-64">
            <View className="relative mb-3 h-80 overflow-hidden rounded-xl bg-[#ecb6131a]">
              <Image source={{ uri: item.image }} contentFit="cover" className="h-full w-full" />
              <TouchableOpacity className="absolute right-3 top-3 rounded-full bg-black/20 p-2">
                <MaterialIcons name="favorite-border" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text className="text-lg text-slate-100">{item.name}</Text>
            <Text className="mt-1 font-semibold text-[#ecb613]">{item.price}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
