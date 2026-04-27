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
      className="h-full w-[325px] px-4 pb-8 pt-16"
      style={{
        backgroundColor: theme.surface,
        borderRightColor: theme.border,
        borderRightWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.24,
        shadowRadius: 10,
        shadowOffset: { width: 2, height: 0 },
        elevation: 12,
      }}>
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-2xl font-semibold" style={{ color: theme.text }}>
          Menu
        </Text>
        <Pressable
          className="h-9 w-9 items-center justify-center rounded-full"
          onPress={onClose}
          hitSlop={10}
          style={{ backgroundColor: theme.surfaceMuted }}>
          <MaterialIcons name="close" size={22} color={theme.text} />
        </Pressable>
      </View>

      <Text className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: theme.textMuted }}>
        Theme
      </Text>

      <View className="mb-4 flex-row rounded-2xl p-1" style={{ backgroundColor: theme.surfaceMuted }}>
        {MODES.map((option) => {
          const active = mode === option;

          return (
            <Pressable
              key={option}
              className="flex-1 rounded-xl px-3 py-2.5"
              onPress={() => setMode(option)}
              style={{ backgroundColor: active ? theme.primary : 'transparent' }}>
              <Text
                className="text-center text-sm font-semibold capitalize"
                style={{ color: active ? theme.textOnPrimary : theme.text }}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
