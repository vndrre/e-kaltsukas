import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { useAppTheme } from '@/hooks/use-app-theme';

type ProductRecord = {
  id: string;
  title: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  size?: string | null;
  price?: number;
  images?: string[];
};

export default function ProductScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    price?: string;
    image?: string;
    category?: string;
    description?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<ProductRecord | null>(null);

  useEffect(() => {
    const loadItem = async () => {
      if (!params.id) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/items/${params.id}`);
        setItem(response.data?.item ?? null);
      } catch {
        setItem(null);
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, [params.id]);

  const title = item?.title ?? params.title ?? 'Item';
  const priceValue = typeof item?.price === 'number' ? `$${item.price.toFixed(2)}` : params.price ?? '$0.00';
  const image = item?.images?.[0] ?? params.image;
  const category = item?.category ?? params.category ?? 'Lux Market';
  const description =
    item?.description ??
    params.description ??
    'A curated piece from Lux Market with premium materials and timeless design language.';

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View className="relative h-[420px]">
          {image ? (
            <Image source={{ uri: image }} contentFit="cover" className="h-full w-full" />
          ) : (
            <View className="h-full w-full items-center justify-center" style={{ backgroundColor: theme.surface }}>
              {loading ? <ActivityIndicator color={theme.primary} /> : <MaterialIcons name="image" size={32} color={theme.textMuted} />}
            </View>
          )}
          <View className="absolute left-5 right-5 top-14 flex-row justify-between">
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-black/30" onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-black/30">
                <MaterialIcons name="favorite-border" size={20} color="#fff" />
              </Pressable>
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-black/30">
                <MaterialIcons name="share" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="px-6 pt-8">
          <Text className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: theme.primary }}>
            {category}
          </Text>
          <Text className="mt-3 text-4xl italic" style={{ color: theme.text }}>
            {title}
          </Text>
          <Text className="mt-2 text-2xl" style={{ color: theme.text }}>
            {priceValue}
          </Text>
          <Text className="mt-8 border-t pt-7 text-base italic leading-7" style={{ color: theme.textMuted, borderTopColor: theme.border }}>
            {description}
          </Text>
        </View>
      </ScrollView>

      <View className="absolute bottom-8 left-6 right-6 flex-row gap-3 rounded-2xl border p-2" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
        <Pressable className="h-12 w-12 items-center justify-center rounded-xl">
          <MaterialIcons name="shopping-bag" size={22} color={theme.textMuted} />
        </Pressable>
        <Pressable className="h-12 flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: theme.primary }}>
          <Text className="text-sm font-bold uppercase tracking-[1.4px]" style={{ color: theme.textOnPrimary }}>
            Add to Cart
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
