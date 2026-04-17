import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function RegisterScreen() {
  const { theme } = useAppTheme();
  const { isAuthenticated, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing fields', 'Please complete all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Password and confirmation must match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register(name.trim(), email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to register right now.';
      Alert.alert('Registration failed', message);
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
            Create an account to get started.
          </Text>
        </View>

        <View className="rounded-2xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <Text className="text-sm font-semibold" style={{ color: theme.text }}>
            Full Name
          </Text>
          <TextInput
            className="mt-2 rounded-xl border px-3 py-3"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceMuted }}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text className="mt-4 text-sm font-semibold" style={{ color: theme.text }}>
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
            placeholder="Create password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text className="mt-4 text-sm font-semibold" style={{ color: theme.text }}>
            Confirm password
          </Text>
          <TextInput
            className="mt-2 rounded-xl border px-3 py-3"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceMuted }}
            placeholder="Repeat password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Pressable
            disabled={isSubmitting}
            onPress={handleRegister}
            className="mt-6 items-center rounded-xl py-3"
            style={{ backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }}>
            <Text className="font-bold" style={{ color: theme.textOnPrimary }}>
              {isSubmitting ? 'Creating account...' : 'Register'}
            </Text>
          </Pressable>
        </View>

        <View className="mt-6 flex-row justify-center">
          <Text style={{ color: theme.textMuted }}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="font-semibold" style={{ color: theme.primary }}>
                Login
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
