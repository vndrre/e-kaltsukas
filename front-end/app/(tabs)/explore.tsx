import { Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TabTwoScreen() {
  const { theme } = useAppTheme();

  return (
    <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: theme.background }}>
      <Text className="text-3xl italic" style={{ color: theme.text }}>
        Explore
      </Text>
      <Text className="mt-2 text-center" style={{ color: theme.textMuted }}>
        Explore page scaffold is ready for next step.
      </Text>
    </View>
  );
}
