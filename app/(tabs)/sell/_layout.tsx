import { Stack } from 'expo-router';
import { SellDraftProvider } from '@/hooks/sell-draft-provider';

export default function SellLayout() {
  return (
    <SellDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="review" />
        <Stack.Screen name="details" />
      </Stack>
    </SellDraftProvider>
  );
}
