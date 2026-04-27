import { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';

import { HeroSection } from '@/components/home/hero-section';
import { HomeHeader } from '@/components/home/home-header';
import { newArrivals, recommendedItems } from '@/components/home/home-data';
import { MenuDrawer } from '@/components/home/menu-drawer';
import { NewArrivalsSection } from '@/components/home/new-arrivals-section';
import { RecommendedSection } from '@/components/home/recommended-section';
import { SearchBar } from '@/components/home/search-bar';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function HomeScreen() {
  const { theme } = useAppTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuVisible(false);
      }
    });
  };

  const drawerTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 0],
  });

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <HomeHeader onMenuPress={openMenu} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <SearchBar />
        <HeroSection />
        <NewArrivalsSection items={newArrivals} />
        <RecommendedSection items={recommendedItems} />
      </ScrollView>

      {menuVisible ? (
        <View className="absolute inset-0 z-40">
          <Pressable className="absolute inset-0" onPress={closeMenu}>
            <Animated.View className="h-full w-full bg-black" style={{ opacity: backdropOpacity }} />
          </Pressable>

          <Animated.View
            className="absolute bottom-0 left-0 top-0"
            style={{
              height: '100%',
              transform: [{ translateX: drawerTranslateX }],
            }}>
            <MenuDrawer onClose={closeMenu} />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}
