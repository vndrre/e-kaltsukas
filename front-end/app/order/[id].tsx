import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';
import { releaseFocusBeforeNavigation } from '@/lib/navigation-focus';
import { formatOrderStatus, orderTimelineSteps, type OrderStatus } from '@/lib/order-status';

const SHIPPING_CARRIER = 'DPD';
const DPD_TRACKING_NUMBER_LENGTH = 14;
const DPD_TRACKING_NUMBER_PATTERN = /^\d{14}$/;

const isValidDpdTrackingNumber = (value: string) => DPD_TRACKING_NUMBER_PATTERN.test(value);

type OrderRecord = {
  id: string;
  buyerId: string;
  sellerId: string;
  price: number;
  status: OrderStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  completedAt?: string | null;
  item?: {
    id: string;
    title: string;
    images?: string[];
  } | null;
  buyer?: { username?: string | null } | null;
  seller?: { username?: string | null } | null;
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState(false);
  const [receiptReady, setReceiptReady] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!token || !orderId) {
      setOrder(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get(`/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const nextOrder = (response.data?.order ?? null) as OrderRecord | null;
      setOrder(nextOrder);
      if (nextOrder?.trackingNumber) {
        setTrackingNumber(nextOrder.trackingNumber);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to load order.');
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, token]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder])
  );

  const markShipped = async () => {
    if (!token || !orderId || isSubmitting) {
      return;
    }

    if (!isValidDpdTrackingNumber(trackingNumber.trim())) {
      Alert.alert('Invalid tracking number', 'Enter the 14-digit DPD tracking number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post(
        `/orders/${orderId}/mark-shipped`,
        {
          carrier: SHIPPING_CARRIER,
          trackingNumber: trackingNumber.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setOrder((response.data?.order ?? null) as OrderRecord | null);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not mark order shipped.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmReceipt = async () => {
    if (!token || !orderId || isSubmitting || !receiptReady) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post(
        `/orders/${orderId}/confirm-receipt`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setOrder((response.data?.order ?? null) as OrderRecord | null);
      setIsReceiptModalVisible(false);
      setReceiptReady(false);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not confirm receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReceiptModal = () => {
    setReceiptReady(false);
    setIsReceiptModalVisible(true);
  };

  const closeReceiptModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsReceiptModalVisible(false);
    setReceiptReady(false);
  };

  const isBuyer = order?.buyerId === user?.id;
  const isSeller = order?.sellerId === user?.id;
  const timeline = order ? orderTimelineSteps(order.status) : [];
  const ordersRole = isSeller ? 'selling' : 'buying';
  const buyerWaitingForShipment = Boolean(isBuyer && order?.status === 'paid');
  const buyerAwaitingDelivery = Boolean(isBuyer && order?.status === 'shipped');
  const buyerOrderComplete = Boolean(isBuyer && order?.status === 'completed');
  const trackingLabel = [order?.carrier ?? SHIPPING_CARRIER, order?.trackingNumber ?? trackingNumber].filter(Boolean).join(' · ');
  const canMarkShipped = isValidDpdTrackingNumber(trackingNumber.trim());

  const goHome = () => {
    releaseFocusBeforeNavigation();
    requestAnimationFrame(() => {
      router.replace('/(tabs)');
    });
  };

  const goOrders = () => {
    releaseFocusBeforeNavigation();
    requestAnimationFrame(() => {
      router.push({
        pathname: '/orders',
        params: { role: ordersRole },
      });
    });
  };

  const goListing = () => {
    if (!order?.item?.id) {
      return;
    }

    releaseFocusBeforeNavigation();
    requestAnimationFrame(() => {
      router.push({
        pathname: '/product/[id]',
        params: { id: order.item?.id ?? '' },
      });
    });
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
            Order
          </Text>
          <View className="h-9 w-9" />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : !order ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm" style={{ color: theme.textMuted }}>
            Order not found.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-5" contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="rounded-3xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <View className="flex-row">
              <View className="h-20 w-20 overflow-hidden rounded-xl" style={{ backgroundColor: theme.surfaceMuted }}>
                {order.item?.images?.[0] ? (
                  <Image source={{ uri: order.item.images[0] }} contentFit="cover" className="h-full w-full" />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <MaterialIcons name="image" size={20} color={theme.textMuted} />
                  </View>
                )}
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold" style={{ color: theme.text }}>
                  {order.item?.title ?? 'Listing'}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
                  {isBuyer ? 'Seller' : 'Buyer'}: {isBuyer ? order.seller?.username ?? 'Seller' : order.buyer?.username ?? 'Buyer'}
                </Text>
                <Text className="mt-2 text-lg font-bold" style={{ color: theme.primary }}>
                  €{order.price.toFixed(2)}
                </Text>
              </View>
            </View>
            <View className="mt-4 rounded-full px-3 py-1.5 self-start" style={{ backgroundColor: theme.surfaceMuted }}>
              <Text className="text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: theme.text }}>
                {formatOrderStatus(order.status)}
              </Text>
            </View>
          </View>

          <View className="mt-4 rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
              Progress
            </Text>
            <View className="mt-4 gap-3">
              {timeline.map((step) => (
                <View key={step.key} className="flex-row items-center">
                  <View
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: step.done || step.current ? theme.primary : theme.surfaceMuted,
                    }}>
                    <MaterialIcons
                      name={step.done ? 'check' : step.current ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={16}
                      color={step.done || step.current ? theme.textOnPrimary : theme.textMuted}
                    />
                  </View>
                  <Text className="ml-3 text-sm font-medium" style={{ color: theme.text }}>
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {buyerWaitingForShipment ? (
            <View className="mt-4 rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <View className="flex-row items-start">
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }}>
                  <MaterialIcons name="schedule" size={22} color={theme.primary} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold" style={{ color: theme.text }}>
                    Waiting for the seller to ship
                  </Text>
                  <Text className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                    Your payment is in. Once the seller marks this order as shipped, tracking will appear here and you can confirm delivery.
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {order.status === 'shipped' || order.status === 'completed' ? (
            <View className="mt-4 rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <Text className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
                Tracking
              </Text>
              <Text className="mt-2 text-sm" style={{ color: theme.text }}>
                {trackingLabel || 'Tracking details will appear here once the seller ships your order.'}
              </Text>
            </View>
          ) : null}

          {buyerAwaitingDelivery ? (
            <View className="mt-4 rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <View className="flex-row items-start">
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }}>
                  <MaterialIcons name="local-shipping" size={22} color={theme.primary} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold" style={{ color: theme.text }}>
                    Your order is on the way
                  </Text>
                  <Text className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                    When the parcel arrives, use the button below to confirm delivery and complete the order.
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {buyerOrderComplete ? (
            <View className="mt-4 rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <View className="flex-row items-start">
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }}>
                  <MaterialIcons name="check-circle" size={22} color={theme.primary} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold" style={{ color: theme.text }}>
                    Delivery confirmed
                  </Text>
                  <Text className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
                    Thanks for confirming. This order is complete and payment has been released to the seller.
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {isSeller && order.status === 'paid' ? (
            <View className="mt-4 rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <Text className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
                Mark as shipped
              </Text>
              <Text className="mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
                Carrier
              </Text>
              <View
                className="mt-2 rounded-2xl border px-3 py-3"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                  {SHIPPING_CARRIER}
                </Text>
              </View>
              <Text className="mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
                Tracking number
              </Text>
              <TextInput
                value={trackingNumber}
                onChangeText={(value) => {
                  setTrackingNumber(value.replace(/\D/g, '').slice(0, DPD_TRACKING_NUMBER_LENGTH));
                }}
                placeholder="14-digit DPD tracking number"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                maxLength={DPD_TRACKING_NUMBER_LENGTH}
                className="mt-2 rounded-2xl border px-3 py-3"
                style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
              />
              <Text className="mt-2 text-xs" style={{ color: theme.textMuted }}>
                Enter exactly 14 digits.
              </Text>
              <Pressable
                className="mt-4 items-center rounded-full py-3.5"
                style={{ backgroundColor: theme.primary, opacity: isSubmitting || !canMarkShipped ? 0.7 : 1 }}
                disabled={isSubmitting || !canMarkShipped}
                onPress={markShipped}>
                <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
                  Mark shipped
                </Text>
              </Pressable>
            </View> 
          ) : null}
        </ScrollView>
      )}

      {order ? (
        <View className="border-t px-4 pb-8 pt-4" style={{ borderTopColor: theme.border, backgroundColor: theme.background }}>
          {buyerAwaitingDelivery ? (
            <>
              <Pressable
                className="items-center rounded-full py-4"
                style={{ backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }}
                disabled={isSubmitting}
                onPress={openReceiptModal}>
                <Text className="text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
                  Confirm delivery
                </Text>
              </Pressable>
              <Text className="mt-3 text-center text-sm leading-5" style={{ color: theme.textMuted }}>
                Only confirm once you have received the item.
              </Text>
            </>
          ) : buyerWaitingForShipment ? (
            <View className="rounded-2xl border px-4 py-3" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <Text className="text-center text-sm leading-5" style={{ color: theme.textMuted }}>
                Confirm delivery will appear here after the seller ships your order.
              </Text>
            </View>
          ) : buyerOrderComplete ? (
            <View className="rounded-2xl border px-4 py-3" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <Text className="text-center text-sm font-medium" style={{ color: theme.text }}>
                This order is complete.
              </Text>
            </View>
          ) : (
            <Pressable
              className="items-center rounded-full py-4"
              style={{ backgroundColor: theme.primary }}
              onPress={goHome}>
              <Text className="text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
                Browse home
              </Text>
            </Pressable>
          )}
          <View className="mt-3 flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-full border py-3.5"
              style={{ borderColor: theme.border }}
              onPress={goOrders}>
              <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
                My orders
              </Text>
            </Pressable>
            {order.item?.id ? (
              <Pressable
                className="flex-1 items-center rounded-full border py-3.5"
                style={{ borderColor: theme.border }}
                onPress={goListing}>
                <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
                  View listing
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <Modal visible={isReceiptModalVisible} transparent animationType="fade" onRequestClose={closeReceiptModal}>
        <View className="flex-1 items-center justify-center px-5">
          <Pressable className="absolute inset-0 bg-black/55" onPress={closeReceiptModal} />
          <View className="w-full max-w-[420px] rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                Confirm delivery
              </Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-full"
                onPress={closeReceiptModal}
                disabled={isSubmitting}
                style={{ backgroundColor: theme.surfaceMuted }}>
                <MaterialIcons name="close" size={18} color={theme.text} />
              </Pressable>
            </View>

            <Text className="mt-3 text-sm leading-6" style={{ color: theme.textMuted }}>
              Confirm only after the item has arrived and matches the listing. This completes the order and releases payment to the seller.
            </Text>

            {order?.item?.title ? (
              <View className="mt-4 rounded-2xl border px-4 py-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                <Text className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
                  Order
                </Text>
                <Text className="mt-1 text-sm font-semibold" style={{ color: theme.text }}>
                  {order.item.title}
                </Text>
                {trackingLabel ? (
                  <Text className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>
                    {trackingLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Pressable
              className="mt-4 flex-row items-start rounded-2xl border px-4 py-3"
              style={{ borderColor: receiptReady ? theme.primary : theme.border, backgroundColor: theme.background }}
              onPress={() => setReceiptReady((value) => !value)}>
              <View
                className="mt-0.5 h-5 w-5 items-center justify-center rounded-md border"
                style={{ borderColor: receiptReady ? theme.primary : theme.border, backgroundColor: receiptReady ? theme.primary : 'transparent' }}>
                {receiptReady ? <MaterialIcons name="check" size={14} color={theme.textOnPrimary} /> : null}
              </View>
              <Text className="ml-3 flex-1 text-sm leading-6" style={{ color: theme.text }}>
                I have received this item and it matches the listing.
              </Text>
            </Pressable>

            <Pressable
              className="mt-5 items-center rounded-full py-4"
              style={{ backgroundColor: theme.primary, opacity: receiptReady && !isSubmitting ? 1 : 0.45 }}
              disabled={!receiptReady || isSubmitting}
              onPress={confirmReceipt}>
              {isSubmitting ? (
                <ActivityIndicator color={theme.textOnPrimary} />
              ) : (
                <Text className="text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
                  Complete order
                </Text>
              )}
            </Pressable>

            <Pressable className="mt-3 items-center py-2" disabled={isSubmitting} onPress={closeReceiptModal}>
              <Text className="text-sm font-medium" style={{ color: theme.textMuted }}>
                Not yet
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
