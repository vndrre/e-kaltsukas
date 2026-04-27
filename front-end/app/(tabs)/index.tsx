import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { HomeHeader } from '@/components/home/home-header';
import { ProductItem, RecommendedItem } from '@/components/home/types';
import { newArrivals, recommendedItems } from '@/components/home/home-data';
import { MenuDrawer } from '@/components/home/menu-drawer';
import { NewArrivalsSection } from '@/components/home/new-arrivals-section';
import { RecommendedSection } from '@/components/home/recommended-section';
import { SearchBar } from '@/components/home/search-bar';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';

type ApiItem = {
  id: string;
  title: string;
  category?: string | null;
  price?: number;
  price_cents?: number;
  images?: string[];
  images_json?: string[] | string | null;
  created_at?: string;
};

export default function HomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [arrivalItems, setArrivalItems] = useState<ProductItem[]>(newArrivals);
  const [recommendedDbItems, setRecommendedDbItems] = useState<RecommendedItem[]>(recommendedItems);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadNewArrivals = async () => {
      try {
        const response = await api.get('/items');
        const items = (response.data?.items ?? []) as ApiItem[];

        if (!items.length) {
          return;
        }

        const mapImageAndPrice = (item: ApiItem) => {
          const rawImages = Array.isArray(item.images)
            ? item.images
            : Array.isArray(item.images_json)
              ? item.images_json
              : [];
          const image = rawImages[0] || newArrivals[0]?.image || '';
          const numericPrice = typeof item.price === 'number'
            ? item.price
            : typeof item.price_cents === 'number'
              ? item.price_cents / 100
              : 0;
          return { image, numericPrice };
        };

        const newestItems = [...items].sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });

        const mappedItems: ProductItem[] = newestItems.slice(0, 4).map((item) => {
          const { image, numericPrice } = mapImageAndPrice(item);
          return {
            id: item.id,
            name: item.title || 'Untitled item',
            price: `$${numericPrice.toFixed(2)}`,
            image,
          };
        });

        const mappedRecommended: RecommendedItem[] = newestItems.slice(4, 8).map((item) => {
          const { image, numericPrice } = mapImageAndPrice(item);
          return {
            id: item.id,
            category: item.category?.trim() || 'Featured',
            name: item.title || 'Untitled item',
            price: `$${numericPrice.toFixed(2)}`,
            image,
          };
        });

        setArrivalItems(mappedItems);
        if (mappedRecommended.length) {
          setRecommendedDbItems(mappedRecommended);
        }
      } catch (error) {
        console.error('Failed to load new arrivals:', error);
      } finally {
        setIsLoadingFeed(false);
      }
    };

    loadNewArrivals();
  }, []);

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
      <HomeHeader onMenuPress={openMenu} onCartPress={() => router.push('/cart')} cartCount={3} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {isLoadingFeed ? (
          <View>
            <View className="py-6">
              <View className="mb-4 px-4">
                <Text className="text-2xl italic" style={{ color: theme.text }}>
                  New Arrivals
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {[1, 2, 3, 4].map((item) => (
                  <View key={item} className="mr-4 w-64">
                    <View className="mb-3 h-80 rounded-xl" style={{ backgroundColor: theme.surfaceMuted }} />
                    <View className="h-5 w-40 rounded-md" style={{ backgroundColor: theme.surfaceMuted }} />
                    <View className="mt-2 h-4 w-24 rounded-md" style={{ backgroundColor: theme.surfaceMuted }} />
                  </View>
                ))}
              </ScrollView>
            </View>

            <View className="px-4 py-2">
              <Text className="mb-6 text-2xl italic" style={{ color: theme.text }}>
                Recommended for You
              </Text>
              <View className="flex-row flex-wrap justify-between">
                {[1, 2, 3, 4].map((item) => (
                  <View key={item} className="mb-6 w-[48%]">
                    <View className="mb-3 aspect-square rounded-xl" style={{ backgroundColor: theme.surfaceMuted }} />
                    <View className="mb-2 h-3 w-20 rounded-md" style={{ backgroundColor: theme.surfaceMuted }} />
                    <View className="mb-2 h-4 w-32 rounded-md" style={{ backgroundColor: theme.surfaceMuted }} />
                    <View className="h-4 w-20 rounded-md" style={{ backgroundColor: theme.surfaceMuted }} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <>
            <NewArrivalsSection items={arrivalItems} />
            <RecommendedSection items={recommendedDbItems} />
          </>
        )}
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
