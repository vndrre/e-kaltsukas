import { Image } from 'expo-image';
import { Text, TouchableOpacity, View } from 'react-native';

export function HeroSection() {
  return (
    <View className="px-4 py-2">
      <View className="relative h-64 overflow-hidden rounded-xl">
        <Image
          source={{
            uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAr4j7MjARqRB1rzjq3twDSYYF-gQrC1LIt92FCZuLLJv0_54KAnekWa7uYCeFrZDbp33PZldRRfPb7hrWuWaanVzlskZZUb372O6eGatevl1QehhZ5hfvnNfNiW2UTnrFoDo6v5_BjMQIGdvumLSWvbzJ68pFVxQf5UZdjaM3HAAwywnqdiuoZJciL5zeDdnhL0-3G_dACyGA9_pWKU8a_JvO_5b2tjeQFj4fdjAs0dFVQUvfhHAns6Awu5gKP6yps15uiA_4XiU',
          }}
          contentFit="cover"
          className="h-full w-full"
        />
        <View className="absolute inset-0 justify-end bg-black/35 p-5">
          <Text className="text-xs font-bold uppercase tracking-widest text-[#ecb613]">Trending Now</Text>
          <Text className="mt-1 text-3xl text-white">The Silk Edit</Text>
          <Text className="mt-2 max-w-[250px] text-sm text-slate-200">
            Timeless elegance meets modern silhouettes in our latest curated collection.
          </Text>
          <TouchableOpacity className="mt-3 self-start rounded-full bg-[#ecb613] px-5 py-2">
            <Text className="text-sm font-bold text-[#221d10]">Explore Collection</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
