import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

type HomeHeaderProps = {
  onMenuPress: () => void;
};

export function HomeHeader({ onMenuPress }: HomeHeaderProps) {
  const { theme } = useAppTheme();

  return (
    <View className="px-5 pb-4 pt-12" style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onMenuPress}
          hitSlop={10}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.surface }}>
          <MaterialIcons name="menu" size={22} color={theme.text} />
        </Pressable>
        <Text className="text-3xl font-bold italic" style={{ color: theme.primary }}>
          LuxMarket
        </Text>
        <Pressable className="relative h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.surface }}>
          <MaterialIcons name="shopping-bag" size={20} color={theme.text} />
          <View className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ backgroundColor: theme.primary }} />
        </Pressable>
      </View>
    </View>
  );
}
