import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useCart } from '@/hooks/cart-provider';
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
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ProductScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { token, user } = useAuth();
  const { cartCount, refreshCartCount } = useCart();
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
  const [isInCart, setIsInCart] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const routeItemId = Array.isArray(params.id) ? params.id[0] : params.id;
  const resolvedItemId = item?.id ?? routeItemId;

  useEffect(() => {
    const loadItem = async () => {
      if (!routeItemId) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get(`/items/${routeItemId}`);
        setItem(response.data?.item ?? null);
      } catch {
        setItem(null);
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, [routeItemId]);

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
    const loadCartStatus = async () => {
      if (!token || !item?.id) {
        setIsInCart(false);
        return;
      }

      try {
        const response = await api.get('/cart', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const cartItems = (response.data?.items ?? []) as Array<{ itemId?: string }>;
        setIsInCart(cartItems.some((entry) => entry.itemId === item.id));
      } catch {
        setIsInCart(false);
      }
    };

    loadCartStatus();
  }, [item?.id, token]);

  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (!resolvedItemId || !token) {
        setIsFavorite(false);
        return;
      }

      try {
        const response = await api.get(`/items/${resolvedItemId}/favorite`, {
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
  }, [resolvedItemId, token]);

  const title = item?.title ?? params.title ?? 'Item';
  const priceValue = typeof item?.price === 'number' ? `€${item.price.toFixed(2)}` : params.price ?? '€0.00';
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
  const isOwnListing = Boolean(item?.seller_id && user?.id && item.seller_id === user.id);
  const canAddToCart = Boolean(item?.id && UUID_REGEX.test(item.id));
  const canPressAddToCart = canAddToCart && !isInCart;

  const handleAddToCart = async () => {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to add items to your cart.');
      return;
    }

    if (!canAddToCart || !item?.id) {
      Alert.alert('Unavailable', 'This item cannot be added right now.');
      return;
    }
    if (isInCart) {
      Alert.alert('Already in cart', 'This item is already in your cart.');
      return;
    }

    try {
      const response = await api.post(
        '/cart/items',
        { itemId: item.id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await refreshCartCount();
      setIsInCart(true);

      const alreadyInCart = Boolean(response.data?.alreadyInCart);
      Alert.alert(alreadyInCart ? 'Already in cart' : 'Added to cart', alreadyInCart ? 'This unique listing is already in your cart.' : 'Item added to your cart.', [
        {
          text: 'Go to cart',
          onPress: () => router.push('/cart'),
        },
        {
          text: 'Keep browsing',
          style: 'cancel',
        },
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Could not add item to cart.';
      Alert.alert('Error', message);
    }
  };

  const openConversation = async (openOfferComposer = false) => {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to message sellers.');
      return;
    }

    if (!resolvedItemId || !item?.seller_id) {
      Alert.alert('Not available', 'This listing is missing seller details right now.');
      return;
    }

    try {
      const response = await api.post(
        '/chat/conversations',
        {
          itemId: resolvedItemId,
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
          itemId: resolvedItemId,
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

  const handleManageListing = () => {
    router.push('/(tabs)/profile');
  };

  const handleToggleFavorite = async () => {
    if (!resolvedItemId) {
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
          `/items/${resolvedItemId}/favorite`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        await api.delete(`/items/${resolvedItemId}/favorite`, {
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
      <View
        className="px-5 pb-3 pt-5"
        style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
        <View className="flex-row items-center justify-between">
          <Pressable className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <View className="flex-row gap-2">
            <Pressable className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }} onPress={handleToggleFavorite}>
              <MaterialIcons name={isFavorite ? 'favorite' : 'favorite-border'} size={20} color={theme.text} />
            </Pressable>
            <Pressable className="relative h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }} onPress={() => router.push('/cart')}>
              <MaterialIcons name="shopping-cart" size={20} color={theme.text} />
              {cartCount > 0 ? (
                <View className="absolute -right-1 -top-1 rounded-full px-1.5 py-0.5" style={{ backgroundColor: theme.primary }}>
                  <Text className="text-[10px] font-bold" style={{ color: theme.textOnPrimary }}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }}>
              <MaterialIcons name="share" size={20} color={theme.text} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View className="h-[420px]">
          {image ? (
            <Image source={{ uri: image }} contentFit="cover" className="h-full w-full" />
          ) : (
            <View className="h-full w-full items-center justify-center" style={{ backgroundColor: theme.surface }}>
              {loading ? <ActivityIndicator color={theme.primary} /> : <MaterialIcons name="image" size={32} color={theme.textMuted} />}
            </View>
          )}
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
            {isOwnListing ? (
              <>
                <Text className="mt-3 text-sm leading-6" style={{ color: theme.textMuted }}>
                  This is your listing. You can manage it from your closet.
                </Text>
                <Pressable className="mt-4 items-center rounded-xl border py-3" style={{ borderColor: theme.border }} onPress={handleManageListing}>
                  <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
                    Manage listing
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-8 left-6 right-6 flex-row gap-3 rounded-2xl border p-2" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
        <Pressable className="h-12 w-12 items-center justify-center rounded-xl" onPress={isOwnListing ? handleManageListing : handleMessageSeller}>
          <MaterialIcons name={isOwnListing ? 'edit' : 'chat-bubble-outline'} size={22} color={theme.textMuted} />
        </Pressable>
        <Pressable
          className="h-12 flex-1 items-center justify-center rounded-xl"
          style={{ backgroundColor: theme.primary, opacity: isOwnListing ? 1 : canPressAddToCart ? 1 : 0.55 }}
          onPress={isOwnListing ? handleManageListing : handleAddToCart}
          disabled={!isOwnListing && !canPressAddToCart}>
          <Text className="text-sm font-bold uppercase tracking-[1.4px]" style={{ color: theme.textOnPrimary }}>
            {isOwnListing ? 'Manage Listing' : !canAddToCart ? 'Unavailable' : isInCart ? 'Already in Cart' : 'Add to Cart'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
