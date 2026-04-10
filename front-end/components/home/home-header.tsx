import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

export function HomeHeader() {
  return (
    <View className="border-b border-[#ecb6131a] bg-[#221d10]/95 px-4 pb-4 pt-12">
      <View className="flex-row items-center justify-between">
        <MaterialIcons name="menu" size={24} color="#ecb613" />
        <Text className="text-2xl font-bold italic text-[#ecb613]">E-Kaltsukas</Text>
        <View className="relative">
          <MaterialIcons name="shopping-bag" size={24} color="#f1f5f9" />
          <View className="absolute -right-2 -top-1 rounded-full bg-[#ecb613] px-1.5 py-0.5">
            <Text className="text-[10px] font-bold text-[#221d10]">3</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
