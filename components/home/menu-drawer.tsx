import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/hooks/auth-provider';
import { ThemeMode } from '@/hooks/theme-preference-provider';
import { useWalletSummary } from '@/hooks/use-wallet-summary';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';
import { releaseFocusBeforeNavigation } from '@/lib/navigation-focus';

type MenuDrawerProps = {
  onClose: () => void;
  isOpen: boolean;
};

type MenuProfile = {
  username: string | null;
  avatar_url: string | null;
  instagram: string | null;
};

const MODES: ThemeMode[] = ['system', 'light', 'dark'];
const fallbackAvatar =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCatomNVqLWwf1u2rVVhjW53qRac0tdL2zeeN6RB7zqZjsrSXsVmQxBQscuEZIqrZY9EzceU8JTPV24fVYk2BHmoDfFC1Yf4xFg-6LfRqUx3HQGVFyT7_ERwVeYniYj7M9X-8IfzHPBaetYSo5ns0oaCJEW3JoKUK6wwbzI-zch26d-99IuLdGj3pVP6JXBjw_J_Xcwn1Aym1P1wMg_lfZidgVYHPaELyZRiqBj4N91Ux2kDwVXt7p9339oM_xQKFwgocpczuEvvSk';

export function MenuDrawer({ onClose, isOpen }: MenuDrawerProps) {
  const router = useRouter();
  const { mode, setMode, theme } = useAppTheme();
  const { user, token, logout } = useAuth();
  const { wallet, isLoading: isWalletLoading, loadWallet } = useWalletSummary();
  const [profile, setProfile] = useState<MenuProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!token) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    try {
      setIsProfileLoading(true);
      const response = await api.get('/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const nextProfile = (response.data?.user ?? null) as MenuProfile | null;
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    } finally {
      setIsProfileLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void Promise.all([loadProfile(), loadWallet()]);
  }, [isOpen, loadProfile, loadWallet]);

  const displayName = profile?.username?.trim() || user?.name?.trim() || user?.email?.split('@')[0] || 'Your closet';
  const handle = profile?.instagram?.trim() || user?.email?.split('@')[0] || 'profile';
  const avatarImage = profile?.avatar_url?.trim() || fallbackAvatar;

  const navigateAfterClose = useCallback(
    (action: () => void) => {
      onClose();
      releaseFocusBeforeNavigation();
      requestAnimationFrame(action);
    },
    [onClose]
  );

  const openEditProfile = () => {
    navigateAfterClose(() => {
      router.push({ pathname: '/(tabs)/profile', params: { edit: '1' } });
    });
  };

  const openWallet = () => {
    navigateAfterClose(() => {
      router.push('/wallet');
    });
  };

  const signOut = () => {
    onClose();
    logout();
  };

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
        elevation: 24,
      }}>
      <View className="mb-5 flex-row items-center justify-between">
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Pressable
          className="mb-4 rounded-3xl border p-4"
          onPress={openEditProfile}
          style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <View className="flex-row items-center">
            <View className="h-14 w-14 overflow-hidden rounded-full border" style={{ borderColor: theme.border }}>
              {isProfileLoading ? (
                <View className="h-full w-full items-center justify-center" style={{ backgroundColor: theme.surfaceMuted }}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : (
                <Image source={{ uri: avatarImage }} contentFit="cover" className="h-full w-full" />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold" style={{ color: theme.text }}>
                {displayName}
              </Text>
              <Text className="mt-0.5 text-xs font-bold uppercase tracking-[1px]" style={{ color: theme.primary }}>
                @{handle}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                Tap to edit profile
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={theme.textMuted} />
          </View>
        </Pressable>

        <Pressable
          className="mb-6 rounded-3xl border p-4"
          onPress={openWallet}
          style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: theme.surfaceMuted }}>
                <MaterialIcons name="account-balance-wallet" size={22} color={theme.primary} />
              </View>
              <View className="ml-3">
                <Text className="text-[10px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
                  Wallet
                </Text>
                {isWalletLoading ? (
                  <ActivityIndicator className="mt-2" color={theme.primary} />
                ) : (
                  <Text className="mt-1 text-2xl font-bold" style={{ color: theme.text }}>
                    €{(wallet?.available ?? 0).toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
            <View className="items-end">
              <Text className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
                Pending
              </Text>
              <Text className="mt-1 text-sm font-semibold" style={{ color: theme.primary }}>
                €{(wallet?.pending ?? 0).toFixed(2)}
              </Text>
              <Text className="mt-2 text-[10px] font-bold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
                Manage
              </Text>
            </View>
          </View>
        </Pressable>

        <Text className="mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: theme.textMuted }}>
          Settings
        </Text>

        <View className="mb-5 flex-row rounded-2xl p-1" style={{ backgroundColor: theme.surfaceMuted }}>
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

        <Pressable
          className="flex-row items-center rounded-2xl px-4 py-3.5"
          onPress={signOut}
          style={{ backgroundColor: theme.surfaceMuted }}>
          <MaterialIcons name="logout" size={20} color={theme.text} />
          <Text className="ml-3 text-sm font-semibold" style={{ color: theme.text }}>
            Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
