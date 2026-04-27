import { MaterialIcons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

export function SearchBar() {
  const { theme } = useAppTheme();

  return (
    <View className="px-4 pb-2 pt-4">
      <View className="flex-row items-center rounded-xl px-3" style={{ backgroundColor: theme.surfaceMuted }}>
        <MaterialIcons name="search" size={20} color={theme.textMuted} />
        <TextInput
          placeholder="Search brands, styles, or items..."
          placeholderTextColor={theme.textMuted}
          className="ml-2 flex-1 py-3 text-sm"
          style={{ color: theme.text }}
        />
      </View>
    </View>
  );
}
