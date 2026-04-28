import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { api } from '@/lib/api';
import { useAppTheme } from '@/hooks/use-app-theme';

type ProductRecord = {
  id: string;
  seller_id?: string | null;
  title: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  size?: string | null;
  price?: number;
  images?: string[];
};

type SellerProfile = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
};

export default function ProductScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { token } = useAuth();
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);

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

  useEffect(() => {
    const loadSeller = async () => {
      if (!item?.seller_id || !token) {
        setSellerProfile(null);
        return;
      }

      try {
        const response = await api.get(`/users/${item.seller_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setSellerProfile((response.data?.profile ?? null) as SellerProfile | null);
      } catch {
        setSellerProfile(null);
      }
    };

    loadSeller();
  }, [item?.seller_id, token]);

  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (!params.id || !token) {
        setIsFavorite(false);
        return;
      }

      try {
        const response = await api.get(`/items/${params.id}/favorite`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setIsFavorite(Boolean(response.data?.isFavorited));
      } catch {
        setIsFavorite(false);
      }
    };

    loadFavoriteStatus();
  }, [params.id, token]);

  const title = item?.title ?? params.title ?? 'Item';
  const priceValue = typeof item?.price === 'number' ? `$${item.price.toFixed(2)}` : params.price ?? '$0.00';
  const image = item?.images?.[0] ?? params.image;
  const category = item?.category ?? params.category ?? 'Lux Market';
  const description =
    item?.description ??
    params.description ??
    'A curated piece from Lux Market with premium materials and timeless design language.';
  const brand = item?.brand?.trim() || 'Unspecified';
  const size = item?.size?.trim() || 'Not listed';
  const condition = item?.condition?.trim() || 'Not listed';
  const sellerName = sellerProfile?.username?.trim() || 'Seller';
  const sellerAvatar = sellerProfile?.avatar_url?.trim() || '';

  const handleAddToCart = () => {
    Alert.alert('Added to cart', 'Item added to your cart.', [
      {
        text: 'Go to cart',
        onPress: () => router.push('/cart'),
      },
      {
        text: 'Keep browsing',
        style: 'cancel',
      },
    ]);
  };

  const openConversation = async (openOfferComposer = false) => {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to message sellers.');
      return;
    }

    if (!params.id || !item?.seller_id) {
      Alert.alert('Not available', 'This listing is missing seller details right now.');
      return;
    }

    try {
      const response = await api.post(
        '/chat/conversations',
        {
          itemId: params.id,
          sellerId: item.seller_id,
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
          itemId: params.id,
          title,
          openOffer: openOfferComposer ? '1' : '0',
          initialOffer: item?.price ? String(item.price) : '',
        },
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Could not open conversation right now.';
      Alert.alert('Error', message);
    }
  };

  const handleMessageSeller = () => {
    openConversation(false);
  };

  const handleMakeOffer = () => {
    openConversation(true);
  };

  const handleToggleFavorite = async () => {
    if (!params.id) {
      return;
    }

    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to save favorites.');
      return;
    }

    const nextValue = !isFavorite;
    setIsFavorite(nextValue);

    try {
      if (nextValue) {
        await api.post(
          `/items/${params.id}/favorite`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        await api.delete(`/items/${params.id}/favorite`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      setIsFavorite(!nextValue);
      Alert.alert('Error', 'Could not update favorite right now.');
    }
  };

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
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-black/30" onPress={handleToggleFavorite}>
                <MaterialIcons name={isFavorite ? 'favorite' : 'favorite-border'} size={20} color="#fff" />
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

          <View className="mt-8 rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
              Item details
            </Text>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm" style={{ color: theme.textMuted }}>
                Brand
              </Text>
              <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                {brand}
              </Text>
            </View>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-sm" style={{ color: theme.textMuted }}>
                Size
              </Text>
              <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                {size}
              </Text>
            </View>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-sm" style={{ color: theme.textMuted }}>
                Condition
              </Text>
              <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                {condition}
              </Text>
            </View>
          </View>

          <View className="mt-5 rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
              Seller
            </Text>
            <Pressable
              className="mt-3 flex-row items-center rounded-xl border px-3 py-3"
              style={{ borderColor: theme.border, backgroundColor: theme.background }}
              onPress={() => {
                if (!item?.seller_id) return;
                router.push({
                  pathname: '/user/[id]',
                  params: { id: item.seller_id },
                });
              }}>
              {sellerAvatar ? (
                <Image source={{ uri: sellerAvatar }} contentFit="cover" className="h-10 w-10 rounded-full" />
              ) : (
                <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }}>
                  <MaterialIcons name="person" size={18} color={theme.textMuted} />
                </View>
              )}
              <View className="ml-2 flex-1">
                <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                  {sellerName}
                </Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>
                  View closet, followers and following
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
            <Text className="mt-3 text-sm leading-6" style={{ color: theme.textMuted }}>
              Ask questions about fit, shipping, and authenticity. You can also send an offer and negotiate in chat.
            </Text>
            <View className="mt-4 flex-row gap-2">
              <Pressable className="flex-1 items-center rounded-xl border py-3" style={{ borderColor: theme.border }} onPress={handleMessageSeller}>
                <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
                  Message seller
                </Text>
              </Pressable>
              <Pressable className="flex-1 items-center rounded-xl py-3" style={{ backgroundColor: theme.surfaceMuted }} onPress={handleMakeOffer}>
                <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
                  Make offer
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-8 left-6 right-6 flex-row gap-3 rounded-2xl border p-2" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
        <Pressable className="h-12 w-12 items-center justify-center rounded-xl" onPress={handleMessageSeller}>
          <MaterialIcons name="chat-bubble-outline" size={22} color={theme.textMuted} />
        </Pressable>
        <Pressable className="h-12 flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: theme.primary }} onPress={handleAddToCart}>
          <Text className="text-sm font-bold uppercase tracking-[1.4px]" style={{ color: theme.textOnPrimary }}>
            Add to Cart
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
