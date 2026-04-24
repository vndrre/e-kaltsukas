import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA67GEQI9admYdoJkYqrtJdvJsiHDlj6YZxnLnArywDyERWEW_-fhvMq9RkaqqDPUQHphdfYRZ2VgQzswdvstGSsvyAmR9UHJ5WhQSZnWZo33IMlvDD1eRIfw0PhL527wHPd6pzetVCtO_DvainTT9YgvcayuW6jnmWOlPe7p2NNU0mPaLOIQ0Mzg4slYDHNKhprXkquNumDmdE9wI3DVdEoVuk59BxUZLh_jjPdEPJjxL6hC2LcoyVQ_15nw6TJWLKNhagmvGJ-II';

export default function RegisterScreen() {
  const { theme } = useAppTheme();
  const { isAuthenticated, register } = useAuth();
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isDesktop = width >= 960;

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
      const result = await register(name.trim(), email.trim().toLowerCase(), password);

      if (result.needsEmailConfirmation) {
        Alert.alert(
          'Check your email',
          `We created your account for ${result.email}. Verify your email, then log in.`,
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
        return;
      }

      router.replace('/(tabs)');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to register right now.';
      Alert.alert('Registration failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: '#0f0e0a', flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View className="flex-row items-center justify-between px-6 pb-3 pt-3">
          <Text className="text-2xl font-bold italic tracking-wider" style={{ color: theme.primary }}>
            E-Kaltsukas
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable className="flex-row items-center gap-1">
              <Text className="text-[10px] tracking-[2px]" style={{ color: '#9b8f79' }}>
                LOGIN
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color={theme.primary} />
            </Pressable>
          </Link>
        </View>

        <View className="flex-row" style={{ flex: 1 }}>
          {isDesktop ? (
            <View className="h-full" style={{ width: '58%' }}>
              <ImageBackground source={{ uri: HERO_IMAGE }} className="flex-1 justify-end px-10 pb-12">
                <View className="absolute inset-0 bg-black/50" />
                <Text className="text-[10px] uppercase tracking-[4px] text-white/30">E-Kaltsukas</Text>
                <Text className="mt-4 text-5xl italic leading-[54px] text-white">
                  Register{'\n'}
                  <Text className="pl-8">Now.</Text>
                </Text>
              </ImageBackground>
            </View>
          ) : null}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingHorizontal: isDesktop ? 56 : 28,
              paddingBottom: 120,
              maxWidth: isDesktop ? 540 : undefined,
            }}>
            <View className="mb-10 gap-3">
              <Text className="text-5xl italic" style={{ color: '#ece1d1' }}>
                Create account
              </Text>
              <Text className="max-w-sm text-sm leading-6" style={{ color: '#d3c5ac' }}>
                Register with your name, email, and password.
              </Text>
            </View>

            <View className="gap-8">
              <View>
                <Text className="mb-2 text-[10px] tracking-[3px]" style={{ color: theme.primary }}>
                  FULL NAME
                </Text>
                <TextInput
                  className="border-b px-0 pb-3 pt-1 text-xl italic"
                  style={{ borderColor: '#4f4633', color: '#ece1d1' }}
                  placeholder="Your name"
                  placeholderTextColor="rgba(236,225,209,0.32)"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View>
                <Text className="mb-2 text-[10px] tracking-[3px]" style={{ color: theme.primary }}>
                  EMAIL ADDRESS
                </Text>
                <TextInput
                  className="border-b px-0 pb-3 pt-1 text-xl italic"
                  style={{ borderColor: '#4f4633', color: '#ece1d1' }}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(236,225,209,0.32)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[10px] tracking-[3px]" style={{ color: theme.primary }}>
                    PASSWORD
                  </Text>
                  <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                    <Text className="text-[10px] tracking-[2px]" style={{ color: '#9b8f79' }}>
                      {showPassword ? 'HIDE' : 'SHOW'}
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  className="border-b px-0 pb-3 pt-1 text-xl italic"
                  style={{ borderColor: '#4f4633', color: '#ece1d1' }}
                  placeholder="........"
                  placeholderTextColor="rgba(236,225,209,0.3)"
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <View>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[10px] tracking-[3px]" style={{ color: theme.primary }}>
                    CONFIRM PASSWORD
                  </Text>
                  <Pressable onPress={() => setShowConfirmPassword((prev) => !prev)}>
                    <Text className="text-[10px] tracking-[2px]" style={{ color: '#9b8f79' }}>
                      {showConfirmPassword ? 'HIDE' : 'SHOW'}
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  className="border-b px-0 pb-3 pt-1 text-xl italic"
                  style={{ borderColor: '#4f4633', color: '#ece1d1' }}
                  placeholder="........"
                  placeholderTextColor="rgba(236,225,209,0.3)"
                  secureTextEntry={!showConfirmPassword}
                  autoCorrect={false}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <View className="mt-10 gap-6">
              <Pressable
                disabled={isSubmitting}
                onPress={handleRegister}
                className="items-center rounded-xl py-4"
                style={{ backgroundColor: theme.primary, opacity: isSubmitting ? 0.75 : 1 }}>
                <Text className="text-[11px] font-bold tracking-[4px]" style={{ color: '#0f0e0a' }}>
                  {isSubmitting ? 'CREATING...' : 'REGISTER'}
                </Text>
              </Pressable>

              <View className="items-center border-t pt-6" style={{ borderColor: 'rgba(79,70,51,0.35)' }}>
                <Text className="text-[10px] tracking-[2px]" style={{ color: '#9b8f79' }}>
                  ALREADY HAVE AN ACCOUNT?
                </Text>
                <Link href="/(auth)/login" asChild>
                  <Pressable className="mt-2">
                    <Text className="text-[11px] font-bold tracking-[2px]" style={{ color: theme.primary }}>
                      LOGIN
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </ScrollView>
        </View>

        <View className="absolute bottom-8 left-0 right-0 items-center">
          <View
            className="flex-row items-center gap-4 rounded-full border px-4 py-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)' }}>
            <Link href="/(auth)/login" asChild>
              <Pressable className="rounded-full p-2">
                <MaterialIcons name="arrow-back" size={20} color="#d3c5ac" />
              </Pressable>
            </Link>
            <Pressable onPress={() => Alert.alert('Support', 'Help center will be available soon.')} className="rounded-full p-2">
              <MaterialIcons name="help-outline" size={20} color="#d3c5ac" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
