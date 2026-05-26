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

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const { isAuthenticated, login } = useAuth();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isDesktop = width >= 960;

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
    <SafeAreaView style={{ backgroundColor: '#0f0e0a', flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View className="flex-row items-center justify-between px-6 pb-3 pt-3">
          <Text className="text-2xl font-bold italic tracking-wider" style={{ color: theme.primary }}>
            E-Kaltsukas
          </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable className="flex-row items-center gap-1">
              <Text className="text-[10px] tracking-[2px]" style={{ color: '#9b8f79' }}>
                REGISTER
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
                  Login{'\n'}
                  <Text className="pl-8">Welcome.</Text>
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
                Welcome back
              </Text>
              <Text className="max-w-sm text-sm leading-6" style={{ color: '#d3c5ac' }}>
                Log in with your email and password.
              </Text>
            </View>

            <View className="gap-8">
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

              <Pressable className="self-end">
                <Text className="text-[10px] tracking-[2px]" style={{ color: '#9b8f79' }}>
                  FORGOT PASSWORD?
                </Text>
              </Pressable>
            </View>

            <View className="mt-10 gap-6">
              <Pressable
                disabled={isSubmitting}
                onPress={handleLogin}
                className="items-center rounded-xl py-4"
                style={{ backgroundColor: theme.primary, opacity: isSubmitting ? 0.75 : 1 }}>
                <Text className="text-[11px] font-bold tracking-[4px]" style={{ color: '#0f0e0a' }}>
                  {isSubmitting ? 'SIGNING IN...' : 'LOGIN'}
                </Text>
              </Pressable>

              <View className="items-center border-t pt-6" style={{ borderColor: 'rgba(79,70,51,0.35)' }}>
                <Text className="text-[10px] tracking-[2px]" style={{ color: '#9b8f79' }}>
                  NO ACCOUNT YET?
                </Text>
                <Link href="/(auth)/register" asChild>
                  <Pressable className="mt-2">
                    <Text className="text-[11px] font-bold tracking-[2px]" style={{ color: theme.primary }}>
                      REGISTER
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
            <Link href="/(auth)/register" asChild>
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
