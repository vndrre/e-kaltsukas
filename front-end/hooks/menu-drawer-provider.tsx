import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';

import { MenuDrawer } from '@/components/home/menu-drawer';

type MenuDrawerContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
  isMenuOpen: boolean;
};

const MenuDrawerContext = createContext<MenuDrawerContextValue | null>(null);

export function MenuDrawerProvider({ children }: { children: ReactNode }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const openMenu = useCallback(() => {
    setMenuVisible(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const closeMenu = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuVisible(false);
      }
    });
  }, [progress]);

  const drawerTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 0],
  });

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  const value = useMemo(
    () => ({
      openMenu,
      closeMenu,
      isMenuOpen: menuVisible,
    }),
    [closeMenu, menuVisible, openMenu]
  );

  return (
    <MenuDrawerContext.Provider value={value}>
      {children}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu} statusBarTranslucent>
        <View className="flex-1">
          <Pressable className="absolute inset-0" onPress={closeMenu}>
            <Animated.View className="h-full w-full bg-black" style={{ opacity: backdropOpacity }} />
          </Pressable>

          <Animated.View
            className="absolute bottom-0 left-0 top-0"
            style={{
              height: '100%',
              transform: [{ translateX: drawerTranslateX }],
            }}>
            <MenuDrawer onClose={closeMenu} isOpen={menuVisible} />
          </Animated.View>
        </View>
      </Modal>
    </MenuDrawerContext.Provider>
  );
}

export function useMenuDrawer() {
  const context = useContext(MenuDrawerContext);

  if (!context) {
    throw new Error('useMenuDrawer must be used within MenuDrawerProvider');
  }

  return context;
}
