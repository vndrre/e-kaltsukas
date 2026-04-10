import { ScrollView, View } from 'react-native';

import { HeroSection } from '@/components/home/hero-section';
import { HomeHeader } from '@/components/home/home-header';
import { newArrivals, recommendedItems } from '@/components/home/home-data';
import { NewArrivalsSection } from '@/components/home/new-arrivals-section';
import { RecommendedSection } from '@/components/home/recommended-section';
import { SearchBar } from '@/components/home/search-bar';

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-[#221d10]">
      <HomeHeader />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <SearchBar />
        <HeroSection />
        <NewArrivalsSection items={newArrivals} />
        <RecommendedSection items={recommendedItems} />
      </ScrollView>
    </View>
  );
}
