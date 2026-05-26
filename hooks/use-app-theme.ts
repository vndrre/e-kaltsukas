import { useThemePreference } from '@/hooks/theme-preference-provider';

export function useAppTheme() {
  return useThemePreference();
}
