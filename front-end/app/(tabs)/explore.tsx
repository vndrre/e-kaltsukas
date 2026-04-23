import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Pressable, TextInput } from 'react-native';
import { api } from '@/lib/api';
import { useAppTheme } from '@/hooks/use-app-theme';

type SearchItem = {
  id: string;
  title: string;
  price?: number;
  category?: string | null;
  images?: string[];
  description?: string | null;
};

export default function ExploreScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const response = await api.get('/items', { params: { q: query || undefined } });
        setItems(response.data?.items ?? []);
      } catch {
        setItems([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View className="px-5 pb-3 pt-14">
          <Text className="text-3xl italic" style={{ color: theme.text }}>
            Explore
          </Text>
          <View className="mt-4 flex-row items-center rounded-2xl px-4" style={{ backgroundColor: theme.surface }}>
            <MaterialIcons name="search" size={20} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search products, brands, categories..."
              placeholderTextColor={theme.textMuted}
              className="ml-2 flex-1 py-4"
              style={{ color: theme.text }}
            />
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between px-5 pt-5">
          {items.map((item) => (
            <Pressable
              key={item.id}
              className="mb-8 w-[48%]"
              onPress={() =>
                router.push({
                  pathname: '/product/[id]',
                  params: {
                    id: item.id,
                    title: item.title,
                    category: item.category ?? 'Lux Market',
                    price: typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : '$0.00',
                    image: item.images?.[0],
                    description: item.description ?? '',
                  },
                })
              }>
              <View className="aspect-[3/4] overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
                {item.images?.[0] ? (
                  <Image source={{ uri: item.images[0] }} contentFit="cover" className="h-full w-full" />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <MaterialIcons name="image" size={24} color={theme.textMuted} />
                  </View>
                )}
              </View>
              <Text className="mt-3 text-[9px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
                {item.category ?? 'Item'}
              </Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-sm" style={{ color: theme.text }}>
                  {item.title}
                </Text>
                <Text className="text-sm font-bold" style={{ color: theme.text }}>
                  {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : '$0.00'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
