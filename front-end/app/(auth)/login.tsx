import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to login right now.';
      Alert.alert('Login failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-center px-6">
        <View className="mb-8">
          <Text className="text-4xl font-bold italic" style={{ color: theme.primary }}>
            E-Kaltsukas
          </Text>
          <Text className="mt-2 text-base" style={{ color: theme.textMuted }}>
            Sign in to continue shopping.
          </Text>
        </View>

        <View className="rounded-2xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <Text className="text-sm font-semibold" style={{ color: theme.text }}>
            Email
          </Text>
          <TextInput
            className="mt-2 rounded-xl border px-3 py-3"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceMuted }}
            placeholder="you@example.com"
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text className="mt-4 text-sm font-semibold" style={{ color: theme.text }}>
            Password
          </Text>
          <TextInput
            className="mt-2 rounded-xl border px-3 py-3"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceMuted }}
            placeholder="Your password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            disabled={isSubmitting}
            onPress={handleLogin}
            className="mt-6 items-center rounded-xl py-3"
            style={{ backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }}>
            <Text className="font-bold" style={{ color: theme.textOnPrimary }}>
              {isSubmitting ? 'Signing in...' : 'Login'}
            </Text>
          </Pressable>
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text style={{ color: theme.textMuted }}>No account yet? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text className="font-semibold" style={{ color: theme.primary }}>
                Register
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
