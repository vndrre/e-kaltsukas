import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

const galleryImages = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD2V_jGlnIPOnkeXolqUcHOT7gtxsGIr6Gh6RkWzpKP_8FSnhrRNWsQ7-vxJj0PanWk_cEhfr4DyVM1EEpvISMu6_uJlE-w83WxP0X6-bO6pOQ6ReEqvuou4iU3iiPEQGtg5417LM9fG5vP1gBIY1QXW23yFv9rrr-xtG1o1V8TInUT6IKbDkhuzuexF5pJV37haVrevtKNlcSdOuksycJjIe3eWhA4SV_YFCwsjVF59gxpaH1F730d8a1dUAWH3eAZCku-v_qlYLs',
];

export default function SellScreen() {
  const { theme } = useAppTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="border-b px-5 pb-4 pt-14" style={{ borderBottomColor: theme.border }}>
        <View className="flex-row items-center justify-between">
          <MaterialIcons name="close" size={22} color={theme.primary} />
          <View className="items-center">
            <Text className="text-[9px] font-bold uppercase tracking-[3px]" style={{ color: theme.textMuted }}>
              Lux Market
            </Text>
            <Text className="text-2xl italic" style={{ color: theme.primary }}>
              Listing
            </Text>
          </View>
          <Text className="text-[11px] font-bold uppercase tracking-[2px]" style={{ color: theme.primary }}>
            Post
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="px-5 pt-6">
          <View className="mb-10 flex-row gap-3">
            <View className="h-60 flex-1 overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
              <Image source={{ uri: galleryImages[0] }} contentFit="cover" className="h-full w-full" />
            </View>
            <View className="w-24 gap-3">
              {['Front', 'Detail', 'Back'].map((slot) => (
                <View
                  key={slot}
                  className="h-[76px] items-center justify-center rounded-xl border"
                  style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                  <MaterialIcons name="add" size={20} color={theme.primary} />
                  <Text className="mt-1 text-[9px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
                    {slot}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mb-10">
            <Text className="mb-2 text-[10px] font-bold uppercase tracking-[3px]" style={{ color: theme.textMuted }}>
              Nom de la Piece
            </Text>
            <TextInput
              placeholder="A Vintage Archive..."
              placeholderTextColor={theme.textMuted}
              className="text-4xl italic"
              style={{ color: theme.text }}
            />
            <View className="mt-4 h-px w-12" style={{ backgroundColor: theme.primary }} />
          </View>

          <View className="mb-10">
            <Text className="mb-3 text-[10px] font-bold uppercase tracking-[3px]" style={{ color: theme.textMuted }}>
              L'Histoire
            </Text>
            <TextInput
              multiline
              placeholder="Describe the provenance, texture, and character..."
              placeholderTextColor={theme.textMuted}
              style={{ color: theme.text, minHeight: 120, textAlignVertical: 'top' }}
              className="text-base"
            />
          </View>

          <View className="rounded-3xl border px-5 py-8" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <Text className="text-center text-[10px] font-bold uppercase tracking-[4px]" style={{ color: theme.textMuted }}>
              Market Valuation
            </Text>
            <View className="mt-6 flex-row items-center justify-center">
              <Text className="mr-2 text-4xl italic" style={{ color: theme.primary }}>
                $
              </Text>
              <TextInput
                keyboardType="numeric"
                placeholder="000"
                placeholderTextColor={theme.textMuted}
                className="text-6xl italic"
                style={{ color: theme.primary }}
              />
            </View>
            <Text className="mt-8 text-center text-sm" style={{ color: theme.textMuted }}>
              Artist payout: $0.00
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
