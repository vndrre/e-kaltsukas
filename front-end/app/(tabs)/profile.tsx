import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const { user, logout } = useAuth();

  return (
    <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: theme.background }}>
      <Text className="text-3xl italic" style={{ color: theme.text }}>
        Profile
      </Text>
      <Text className="mt-2 text-center" style={{ color: theme.textMuted }}>
        {user?.email ?? 'No email'}
      </Text>
      <Text className="mt-2 text-center" style={{ color: theme.textMuted }}>
        Profile page scaffold is ready for next step.
      </Text>
      <Pressable className="mt-6 rounded-xl px-5 py-3" style={{ backgroundColor: theme.primary }} onPress={logout}>
        <Text className="font-semibold" style={{ color: theme.textOnPrimary }}>
          Logout
        </Text>
      </Pressable>
    </View>
  );
}
