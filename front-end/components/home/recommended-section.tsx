import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { RecommendedItem } from '@/components/home/types';

type RecommendedSectionProps = {
  items: RecommendedItem[];
};

export function RecommendedSection({ items }: RecommendedSectionProps) {
  return (
    <View className="px-4 py-2">
      <Text className="mb-6 text-2xl italic text-slate-100">Recommended for You</Text>
      <View className="flex-row flex-wrap justify-between">
        {items.map((item) => (
          <View key={item.id} className="mb-6 w-[48%]">
            <View className="mb-3 aspect-square overflow-hidden rounded-xl bg-[#ecb6131a]">
              <Image source={{ uri: item.image }} contentFit="cover" className="h-full w-full" />
            </View>
            <Text className="text-[11px] font-bold uppercase tracking-tight text-slate-400">{item.category}</Text>
            <Text className="text-base text-slate-100">{item.name}</Text>
            <Text className="text-sm font-semibold text-[#ecb613]">{item.price}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
