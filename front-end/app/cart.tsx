import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/hooks/auth-provider';
import { useCart } from '@/hooks/cart-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';

type CartItem = {
  id: string;
  itemId: string;
  unitPrice: number;
  lineTotal: number;
  item: {
    id: string;
    sellerId?: string;
    title: string;
    brand?: string | null;
    category?: string | null;
    images?: string[];
  };
};

export default function CartScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const { refreshCartCount } = useCart();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  const loadCart = useCallback(async () => {
    if (!token) {
      setItems([]);
      setSubtotal(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get('/cart', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const nextItems = (response.data?.items ?? []) as CartItem[];
      setItems(nextItems);
      setSubtotal(Number(response.data?.summary?.subtotal ?? 0));
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to load cart.');
      setItems([]);
      setSubtotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [loadCart])
  );

  const removeItem = async (itemId: string) => {
    if (!token || isUpdating) {
      return;
    }

    try {
      setIsUpdating(true);
      await api.delete(`/cart/items/${itemId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await Promise.all([loadCart(), refreshCartCount()]);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not remove item from cart.');
    } finally {
      setIsUpdating(false);
    }
  };

  const messageSeller = async (entry: CartItem) => {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to message sellers.');
      return;
    }

    if (!entry.item?.id || !entry.item?.sellerId) {
      Alert.alert('Unavailable', 'Seller details are missing for this item right now.');
      return;
    }

    try {
      const response = await api.post(
        '/chat/conversations',
        {
          itemId: entry.item.id,
          sellerId: entry.item.sellerId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const conversationId = response.data?.conversation?.id as string | undefined;
      if (!conversationId) {
        Alert.alert('Error', 'Could not open chat conversation.');
        return;
      }

      router.push({
        pathname: '/chat/[id]',
        params: {
          id: conversationId,
          itemId: entry.item.id,
          title: entry.item.title,
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not open conversation right now.');
    }
  };

  const shipping = 0;
  const total = subtotal + shipping;

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
            Cart
          </Text>
          <View className="h-9 w-9" />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-5" contentContainerStyle={{ paddingBottom: 24 }}>
        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : items.length === 0 ? (
          <View className="rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <Text className="text-xl font-semibold" style={{ color: theme.text }}>
              Your cart is empty
            </Text>
            <Text className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
              Add items from product pages and they will show up here.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {items.map((entry) => (
              <View key={entry.id} className="rounded-2xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <View className="flex-row">
                  <View className="h-20 w-20 overflow-hidden rounded-xl" style={{ backgroundColor: theme.surfaceMuted }}>
                    {entry.item?.images?.[0] ? (
                      <Image source={{ uri: entry.item.images[0] }} contentFit="cover" className="h-full w-full" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <MaterialIcons name="image" size={20} color={theme.textMuted} />
                      </View>
                    )}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
                      {entry.item.brand ?? entry.item.category ?? 'Item'}
                    </Text>
                    <Text className="mt-1 text-sm font-semibold" style={{ color: theme.text }} numberOfLines={1}>
                      {entry.item.title}
                    </Text>
                    <Text className="mt-0.5 text-sm font-bold" style={{ color: theme.primary }}>
                      €{entry.lineTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <View className="flex-row gap-2">
                    <Pressable
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.surfaceMuted }}
                      onPress={() => messageSeller(entry)}>
                      <MaterialIcons name="chat-bubble-outline" size={18} color={theme.textMuted} />
                    </Pressable>
                    <Pressable
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.surfaceMuted }}
                      disabled={isUpdating}
                      onPress={() => removeItem(entry.itemId)}>
                      <MaterialIcons name="delete-outline" size={18} color={theme.textMuted} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="mt-4 rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
          <Text className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
            Summary
          </Text>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: theme.textMuted }}>
              Subtotal
            </Text>
            <Text className="text-sm font-semibold" style={{ color: theme.text }}>
              €{subtotal.toFixed(2)}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: theme.textMuted }}>
              Shipping
            </Text>
            <Text className="text-sm font-semibold" style={{ color: theme.text }}>
              €{shipping.toFixed(2)}
            </Text>
          </View>
          <View className="mt-4 h-px" style={{ backgroundColor: theme.border }} />
          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-base font-semibold" style={{ color: theme.text }}>
              Total
            </Text>
            <Text className="text-lg font-bold" style={{ color: theme.primary }}>
              €{total.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-4 pb-8 pt-3">
        <Pressable
          className="rounded-full items-center justify-center py-4"
          style={{ backgroundColor: theme.primary, opacity: items.length ? 1 : 0.7 }}
          disabled={!items.length}>
          <Text className="text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
            Checkout (coming soon)
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
