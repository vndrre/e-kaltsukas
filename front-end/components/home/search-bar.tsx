import { MaterialIcons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

export function SearchBar() {
  const { theme } = useAppTheme();

  return (
    <View className="px-5 pb-2 pt-5">
      <View className="flex-row items-center rounded-2xl px-4" style={{ backgroundColor: theme.surface }}>
        <MaterialIcons name="search" size={20} color={theme.textMuted} />
        <TextInput
          placeholder="Search curated collections..."
          placeholderTextColor={theme.textMuted}
          className="ml-2 flex-1 py-4 text-sm"
          style={{ color: theme.text }}
        />
      </View>
    </View>
  );
}
