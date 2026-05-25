import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';
import { formatOrderStatus, type OrderStatus } from '@/lib/order-status';

type OrderRecord = {
  id: string;
  buyerId: string;
  sellerId: string;
  price: number;
  status: OrderStatus;
  item?: {
    id: string;
    title: string;
    images?: string[];
  } | null;
  buyer?: { username?: string | null } | null;
  seller?: { username?: string | null } | null;
};

type RoleFilter = 'buying' | 'selling';

export default function OrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const initialRole: RoleFilter = params.role === 'selling' ? 'selling' : 'buying';
  const [role, setRole] = useState<RoleFilter>(initialRole);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  const loadOrders = useCallback(async () => {
    if (!token) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get('/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { role },
      });
      setOrders((response.data?.orders ?? []) as OrderRecord[]);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [role, token]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

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
            Orders
          </Text>
          <View className="h-9 w-9" />
        </View>

        <View className="mt-4 flex-row gap-2">
          {(['buying', 'selling'] as RoleFilter[]).map((entry) => {
            const active = role === entry;
            return (
              <Pressable
                key={entry}
                className="flex-1 rounded-full py-2.5"
                style={{ backgroundColor: active ? theme.primary : theme.surfaceMuted }}
                onPress={() => setRole(entry)}>
                <Text
                  className="text-center text-[11px] font-bold uppercase tracking-[1px]"
                  style={{ color: active ? theme.textOnPrimary : theme.text }}>
                  {entry === 'buying' ? 'Purchases' : 'Sales'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
          {orders.map((order) => {
            const isBuyer = order.buyerId === user?.id;
            const counterpart = isBuyer ? order.seller?.username : order.buyer?.username;

            return (
              <Pressable
                key={order.id}
                className="mb-3 rounded-2xl border p-4"
                style={{ borderColor: theme.border, backgroundColor: theme.surface }}
                onPress={() =>
                  router.push({
                    pathname: '/order/[id]',
                    params: { id: order.id },
                  })
                }>
                <View className="flex-row">
                  <View className="h-16 w-16 overflow-hidden rounded-xl" style={{ backgroundColor: theme.surfaceMuted }}>
                    {order.item?.images?.[0] ? (
                      <Image source={{ uri: order.item.images[0] }} contentFit="cover" className="h-full w-full" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <MaterialIcons name="image" size={18} color={theme.textMuted} />
                      </View>
                    )}
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-semibold" numberOfLines={1} style={{ color: theme.text }}>
                      {order.item?.title ?? 'Order'}
                    </Text>
                    <Text className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                      {role === 'buying' ? 'Seller' : 'Buyer'}: {counterpart ?? 'Member'}
                    </Text>
                    <Text className="mt-2 text-sm font-bold" style={{ color: theme.primary }}>
                      €{order.price.toFixed(2)}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
                </View>
                <View className="mt-3 rounded-full px-3 py-1.5 self-start" style={{ backgroundColor: theme.surfaceMuted }}>
                  <Text className="text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: theme.text }}>
                    {formatOrderStatus(order.status)}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {!orders.length ? (
            <View className="rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <Text className="text-center text-sm" style={{ color: theme.textMuted }}>
                {role === 'buying' ? 'No purchases yet.' : 'No sales yet.'}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
