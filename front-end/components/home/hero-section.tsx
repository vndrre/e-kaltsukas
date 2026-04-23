import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

export function HeroSection() {
  const { theme } = useAppTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  return (
    <Animated.View className="px-5 py-2" style={{ opacity: fade, transform: [{ translateY: rise }] }}>
      <View className="relative h-96 overflow-hidden rounded-[34px]">
        <Image
          source={{
            uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAr4j7MjARqRB1rzjq3twDSYYF-gQrC1LIt92FCZuLLJv0_54KAnekWa7uYCeFrZDbp33PZldRRfPb7hrWuWaanVzlskZZUb372O6eGatevl1QehhZ5hfvnNfNiW2UTnrFoDo6v5_BjMQIGdvumLSWvbzJ68pFVxQf5UZdjaM3HAAwywnqdiuoZJciL5zeDdnhL0-3G_dACyGA9_pWKU8a_JvO_5b2tjeQFj4fdjAs0dFVQUvfhHAns6Awu5gKP6yps15uiA_4XiU',
          }}
          contentFit="cover"
          className="h-full w-full"
        />
        <View className="absolute inset-0 justify-end bg-black/40 p-7">
          <Text className="self-start rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[2px]" style={{ color: theme.textOnPrimary, backgroundColor: theme.primary }}>
            Seasonal Highlight
          </Text>
          <Text className="mt-3 text-5xl text-white">
            The Silk{'\n'}
            <Text className="italic">Edit.</Text>
          </Text>
          <Text className="mt-3 max-w-[250px] text-sm text-slate-200">
            Redefining modern luxury through minimalist silhouettes and fluid textures.
          </Text>
          <TouchableOpacity className="mt-5 self-start rounded-full bg-white px-7 py-3">
            <Text className="text-sm font-bold" style={{ color: theme.textOnPrimary }}>
              View Editorial
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}
