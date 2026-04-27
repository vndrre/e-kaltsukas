import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

type HomeHeaderProps = {
  onMenuPress: () => void;
  onCartPress: () => void;
  cartCount?: number;
};

export function HomeHeader({ onMenuPress, onCartPress, cartCount = 0 }: HomeHeaderProps) {
  const { theme } = useAppTheme();

  return (
    <View className="px-4 pb-4 pt-8" style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={onMenuPress} hitSlop={10}>
          <MaterialIcons name="menu" size={24} color={theme.primary} />
        </Pressable>
        <Text className="text-2xl font-bold italic" style={{ color: theme.primary }}>
          E-Kaltsukas
        </Text>
        <Pressable className="relative" onPress={onCartPress} hitSlop={10}>
          <MaterialIcons name="shopping-bag" size={24} color={theme.text} />
          {cartCount > 0 ? (
            <View className="absolute -right-2 -top-1 rounded-full px-1.5 py-0.5" style={{ backgroundColor: theme.primary }}>
              <Text className="text-[10px] font-bold" style={{ color: theme.textOnPrimary }}>
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
