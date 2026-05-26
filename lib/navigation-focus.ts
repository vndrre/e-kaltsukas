import { Keyboard, Platform } from 'react-native';

export function releaseFocusBeforeNavigation() {
  Keyboard.dismiss();

  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
}
