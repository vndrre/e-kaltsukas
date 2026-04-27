import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

type HomeHeaderProps = {
  onMenuPress: () => void;
};

export function HomeHeader({ onMenuPress }: HomeHeaderProps) {
  const { theme } = useAppTheme();

  return (
    <View className="px-4 pb-4 pt-12" style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
      <View className="flex-row items-center justify-between">
        <Pressable onPress={onMenuPress} hitSlop={10}>
          <MaterialIcons name="menu" size={24} color={theme.primary} />
        </Pressable>
        <Text className="text-2xl font-bold italic" style={{ color: theme.primary }}>
          E-Kaltsukas
        </Text>
        <View className="relative">
          <MaterialIcons name="shopping-bag" size={24} color={theme.text} />
          <View className="absolute -right-2 -top-1 rounded-full px-1.5 py-0.5" style={{ backgroundColor: theme.primary }}>
            <Text className="text-[10px] font-bold" style={{ color: theme.textOnPrimary }}>
              3
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
