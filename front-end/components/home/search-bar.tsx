import { MaterialIcons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';

export function SearchBar() {
  return (
    <View className="px-4 pb-2 pt-4">
      <View className="flex-row items-center rounded-xl bg-[#ecb61314] px-3">
        <MaterialIcons name="search" size={20} color="#94a3b8" />
        <TextInput
          placeholder="Search brands, styles, or items..."
          placeholderTextColor="#94a3b8"
          className="ml-2 flex-1 py-3 text-sm text-slate-100"
        />
      </View>
    </View>
  );
}
