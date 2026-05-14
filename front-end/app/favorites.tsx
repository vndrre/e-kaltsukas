import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';

type FavoriteItem = {
  id: string;
  title: string;
  brand?: string | null;
  category?: string | null;
  price?: number;
  images?: string[];
};

export default function FavoritesScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    if (!token) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get('/items/favorites/items', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setItems((response.data?.items ?? []) as FavoriteItem[]);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const openItem = (item: FavoriteItem) => {
    router.push({
      pathname: '/product/[id]',
      params: {
        id: item.id,
        title: item.title,
        price: typeof item.price === 'number' ? `€${item.price.toFixed(2)}` : undefined,
        image: item.images?.[0],
        category: item.category ?? undefined,
      },
    });
  };

  const removeFavorite = async (itemId: string) => {
    if (!token || updatingItemId) {
      return;
    }

    try {
      setUpdatingItemId(itemId);
      await api.delete(`/items/${itemId}/favorite`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setItems((prev) => prev.filter((entry) => entry.id !== itemId));
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not remove favorite.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View
        className="px-4 pb-4 pt-12"
        style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
        <View className="flex-row items-center justify-between">
          <Pressable className="h-9 w-9 items-center justify-center rounded-full" onPress={() => router.back()} style={{ backgroundColor: theme.surfaceMuted }}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <Text className="text-2xl font-bold italic" style={{ color: theme.primary }}>
            Favorites
          </Text>
          <View className="h-9 w-9" />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-5" contentContainerStyle={{ paddingBottom: 24 }}>
        <Text className="text-sm leading-6" style={{ color: theme.textMuted }}>
          Saved listings only you can see here.
        </Text>

        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : items.length === 0 ? (
          <View className="mt-4 rounded-3xl border px-5 py-10" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <Text className="text-center text-base font-semibold" style={{ color: theme.text }}>
              No favorites yet
            </Text>
            <Text className="mt-2 text-center text-sm leading-6" style={{ color: theme.textMuted }}>
              Tap the heart on a listing to save it here for later.
            </Text>
          </View>
        ) : (
          <View className="mt-4 gap-3">
            {items.map((item) => (
              <View key={item.id} className="rounded-2xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <Pressable className="flex-row" onPress={() => openItem(item)}>
                  <View className="h-24 w-24 overflow-hidden rounded-xl" style={{ backgroundColor: theme.surfaceMuted }}>
                    {item.images?.[0] ? (
                      <Image source={{ uri: item.images[0] }} contentFit="cover" className="h-full w-full" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <MaterialIcons name="image" size={20} color={theme.textMuted} />
                      </View>
                    )}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
                      {item.brand ?? item.category ?? 'Item'}
                    </Text>
                    <Text className="mt-1 text-sm font-semibold" style={{ color: theme.text }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text className="mt-2 text-base font-bold" style={{ color: theme.primary }}>
                      {typeof item.price === 'number' ? `€${item.price.toFixed(2)}` : '—'}
                    </Text>
                  </View>
                </Pressable>
                <View className="mt-3 flex-row justify-end">
                  <Pressable
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.surfaceMuted, opacity: updatingItemId === item.id ? 0.6 : 1 }}
                    disabled={updatingItemId === item.id}
                    onPress={() => removeFavorite(item.id)}>
                    <MaterialIcons name="favorite" size={18} color={theme.primary} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
