import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/hooks/auth-provider';
import { useAddressSearch, type AddressSuggestion } from '@/hooks/use-address-search';
import { useCart } from '@/hooks/cart-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';
import { releaseFocusBeforeNavigation } from '@/lib/navigation-focus';

export default function CheckoutScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { token } = useAuth();
  const { refreshCartCount } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const { results, isSearching, isAvailable } = useAddressSearch(addressQuery, token);

  const applySuggestion = (suggestion: AddressSuggestion) => {
    setLine1(suggestion.line1);
    setCity(suggestion.city);
    setPostalCode(suggestion.postalCode);
    setCountry(suggestion.country);
    setAddressQuery(suggestion.label);
    releaseFocusBeforeNavigation();
  };

  const placeOrder = async () => {
    if (!token || isSubmitting) {
      return;
    }

    if (!fullName.trim() || !line1.trim() || !city.trim() || !country.trim()) {
      Alert.alert('Missing details', 'Enter your delivery address to continue.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post(
        '/orders/checkout',
        {
          shippingAddress: {
            name: fullName.trim(),
            line1: line1.trim(),
            city: city.trim(),
            postalCode: postalCode.trim() || undefined,
            country: country.trim(),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await refreshCartCount();
      const orders = (response.data?.orders ?? []) as { id: string }[];
      const firstOrderId = orders[0]?.id;

      if (firstOrderId) {
        releaseFocusBeforeNavigation();
        requestAnimationFrame(() => {
          router.replace({
            pathname: '/order/[id]',
            params: { id: firstOrderId },
          });
        });
        return;
      }

      releaseFocusBeforeNavigation();
      requestAnimationFrame(() => {
        router.replace('/orders');
      });
    } catch (error: any) {
      Alert.alert('Checkout failed', error?.response?.data?.message || 'Could not place your order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View
        className="px-4 pb-4 pt-12"
        style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full"
            onPress={() => {
              releaseFocusBeforeNavigation();
              requestAnimationFrame(() => {
                router.back();
              });
            }}
            style={{ backgroundColor: theme.surfaceMuted }}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <Text className="text-2xl font-bold italic" style={{ color: theme.primary }}>
            Checkout
          </Text>
          <View className="h-9 w-9" />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-5" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
          <Text className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
            Delivery
          </Text>

          <Text className="mt-5 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
            Full name
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            placeholderTextColor={theme.textMuted}
            className="mt-2 rounded-2xl border px-3 py-3"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
          />

          {isAvailable ? (
            <>
              <Text className="mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
                Search
              </Text>
              <View className="mt-2 rounded-2xl border px-3 py-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                <TextInput
                  value={addressQuery}
                  onChangeText={setAddressQuery}
                  placeholder="Start typing an address"
                  placeholderTextColor={theme.textMuted}
                  className="py-1"
                  style={{ color: theme.text }}
                />
                {isSearching ? (
                  <View className="mt-2">
                    <ActivityIndicator color={theme.primary} />
                  </View>
                ) : null}
                {results.length > 0 ? (
                  <View className="mt-2 border-t pt-2" style={{ borderTopColor: theme.border }}>
                    {results.map((suggestion, index) => (
                      <Pressable
                        key={`${suggestion.label}-${index}`}
                        className="py-2"
                        onPress={() => applySuggestion(suggestion)}>
                        <Text className="text-sm" style={{ color: theme.text }}>
                          {suggestion.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          <Text className="mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
            Street
          </Text>
          <TextInput
            value={line1}
            onChangeText={setLine1}
            placeholder="Street address"
            placeholderTextColor={theme.textMuted}
            className="mt-2 rounded-2xl border px-3 py-3"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
          />

          <View className="mt-4 flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
                City
              </Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor={theme.textMuted}
                className="mt-2 rounded-2xl border px-3 py-3"
                style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
              />
            </View>
            <View className="w-28">
              <Text className="text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
                Postal
              </Text>
              <TextInput
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="Postal"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                className="mt-2 rounded-2xl border px-3 py-3"
                style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
              />
            </View>
          </View>

          <Text className="mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
            Country
          </Text>
          <TextInput
            value={country}
            onChangeText={setCountry}
            placeholder="Country"
            placeholderTextColor={theme.textMuted}
            className="mt-2 rounded-2xl border px-3 py-3"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.background }}
          />
        </View>
      </ScrollView>

      <View className="px-4 pb-8 pt-3">
        <Pressable
          className="rounded-full items-center justify-center py-4"
          style={{ backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }}
          disabled={isSubmitting}
          onPress={placeOrder}>
          {isSubmitting ? (
            <ActivityIndicator color={theme.textOnPrimary} />
          ) : (
            <Text className="text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
              Place order
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
