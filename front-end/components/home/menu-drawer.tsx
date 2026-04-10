import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { ThemeMode } from '@/hooks/theme-preference-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

type MenuDrawerProps = {
  onClose: () => void;
};

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

export function MenuDrawer({ onClose }: MenuDrawerProps) {
  const { mode, setMode, theme } = useAppTheme();

  return (
    <View
      className="absolute left-0 top-0 h-full w-72 px-4 pb-8 pt-14"
      style={{ backgroundColor: theme.surface, borderRightColor: theme.border, borderRightWidth: 1 }}>
      <View className="mb-5 flex-row items-center justify-between">
        <Text className="text-lg font-semibold" style={{ color: theme.text }}>
          Menu
        </Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <MaterialIcons name="close" size={22} color={theme.text} />
        </Pressable>
      </View>

      <Text className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: theme.textMuted }}>
        Theme
      </Text>

      {MODES.map((option) => {
        const active = mode === option;

        return (
          <Pressable
            key={option}
            className="mb-2 rounded-xl px-3 py-3"
            onPress={() => setMode(option)}
            style={{ backgroundColor: active ? theme.primary : theme.surfaceMuted }}>
            <Text className="text-sm capitalize font-semibold" style={{ color: active ? theme.textOnPrimary : theme.text }}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
