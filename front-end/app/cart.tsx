import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function CartScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

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

      <View className="flex-1 px-4 pt-5">
        <View className="rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
          <Text className="text-xl font-semibold" style={{ color: theme.text }}>
            Your cart is empty
          </Text>
          <Text className="mt-2 text-sm leading-6" style={{ color: theme.textMuted }}>
            This screen is now wired and ready. Next step: connect cart items, quantity updates, and checkout flow.
          </Text>
        </View>

        <View className="mt-4 rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
          <Text className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
            Summary
          </Text>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: theme.textMuted }}>
              Subtotal
            </Text>
            <Text className="text-sm font-semibold" style={{ color: theme.text }}>
              $0.00
            </Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: theme.textMuted }}>
              Shipping
            </Text>
            <Text className="text-sm font-semibold" style={{ color: theme.text }}>
              $0.00
            </Text>
          </View>
          <View className="mt-4 h-px" style={{ backgroundColor: theme.border }} />
          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-base font-semibold" style={{ color: theme.text }}>
              Total
            </Text>
            <Text className="text-lg font-bold" style={{ color: theme.primary }}>
              $0.00
            </Text>
          </View>
        </View>
      </View>

      <View className="px-4 pb-8 pt-3">
        <Pressable className="rounded-full py-4 items-center justify-center" style={{ backgroundColor: theme.primary }}>
          <Text className="text-sm font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
            Checkout (coming soon)
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
