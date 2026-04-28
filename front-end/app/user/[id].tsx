import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';

const fallbackAvatar =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCatomNVqLWwf1u2rVVhjW53qRac0tdL2zeeN6RB7zqZjsrSXsVmQxBQscuEZIqrZY9EzceU8JTPV24fVYk2BHmoDfFC1Yf4xFg-6LfRqUx3HQGVFyT7_ERwVeYniYj7M9X-8IfzHPBaetYSo5ns0oaCJEW3JoKUK6wwbzI-zch26d-99IuLdGj3pVP6JXBjw_J_Xcwn1Aym1P1wMg_lfZidgVYHPaELyZRiqBj4N91Ux2kDwVXt7p9339oM_xQKFwgocpczuEvvSk';

type ProfileUser = {
  id: string;
  username?: string | null;
  bio?: string | null;
  location?: string | null;
  instagram?: string | null;
  avatar_url?: string | null;
  followers_count?: number | null;
  following_count?: number | null;
};

type Listing = {
  id: string;
  title: string;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  size?: string | null;
  image?: string | null;
  price?: number;
};

type FollowUser = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  isFollowing?: boolean;
};

export default function PublicUserProfileScreen() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const profileId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followersOffset, setFollowersOffset] = useState(0);
  const [followingOffset, setFollowingOffset] = useState(0);
  const [followersHasMore, setFollowersHasMore] = useState(false);
  const [followingHasMore, setFollowingHasMore] = useState(false);
  const [isLoadingMoreList, setIsLoadingMoreList] = useState(false);
  const [activeList, setActiveList] = useState<'followers' | 'following' | null>(null);

  const headers = useMemo(
    () =>
      token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    [token]
  );

  useEffect(() => {
    const load = async () => {
      if (!profileId || !headers) {
        setIsLoading(false);
        return;
      }

      try {
        const [profileRes, followersRes, followingRes] = await Promise.all([
          api.get(`/users/${profileId}`, { headers }),
          api.get(`/users/${profileId}/followers`, { headers, params: { limit: 20, offset: 0 } }),
          api.get(`/users/${profileId}/following`, { headers, params: { limit: 20, offset: 0 } }),
        ]);

        setProfile((profileRes.data?.profile ?? null) as ProfileUser | null);
        setListings((profileRes.data?.listings ?? []) as Listing[]);
        setIsFollowing(Boolean(profileRes.data?.isFollowing));
        setFollowers((followersRes.data?.users ?? []) as FollowUser[]);
        setFollowing((followingRes.data?.users ?? []) as FollowUser[]);
        setFollowersOffset(Number(followersRes.data?.nextOffset ?? (followersRes.data?.users ?? []).length));
        setFollowingOffset(Number(followingRes.data?.nextOffset ?? (followingRes.data?.users ?? []).length));
        setFollowersHasMore(Boolean(followersRes.data?.hasMore));
        setFollowingHasMore(Boolean(followingRes.data?.hasMore));
      } catch (error: any) {
        const message = error?.response?.data?.message || 'Failed to load profile.';
        console.error('Public profile load error:', message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [headers, profileId]);

  const toggleFollow = async () => {
    if (!headers || !profileId || profileId === user?.id) {
      return;
    }

    const previous = isFollowing;
    const currentFollowers = Number(profile?.followers_count ?? 0);
    setIsFollowing(!previous);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            followers_count: Math.max(0, currentFollowers + (previous ? -1 : 1)),
          }
        : prev
    );

    try {
      if (previous) {
        await api.delete(`/users/${profileId}/follow`, { headers });
      } else {
        await api.post(`/users/${profileId}/follow`, {}, { headers });
      }
    } catch (error: any) {
      setIsFollowing(previous);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              followers_count: currentFollowers,
            }
          : prev
      );
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update follow status.');
    }
  };

  const avatar = profile?.avatar_url?.trim() || fallbackAvatar;
  const username = profile?.username?.trim() || 'Closet';
  const about = profile?.bio?.trim() || 'No bio yet.';
  const followersCount = Number(profile?.followers_count ?? 0);
  const followingCount = Number(profile?.following_count ?? 0);

  const loadMoreUsers = async () => {
    if (!headers || !profileId || !activeList || isLoadingMoreList) {
      return;
    }

    const offset = activeList === 'followers' ? followersOffset : followingOffset;
    const hasMore = activeList === 'followers' ? followersHasMore : followingHasMore;
    if (!hasMore) {
      return;
    }

    setIsLoadingMoreList(true);
    try {
      const response = await api.get(`/users/${profileId}/${activeList}`, {
        headers,
        params: { limit: 20, offset },
      });
      const nextUsers = (response.data?.users ?? []) as FollowUser[];
      if (activeList === 'followers') {
        setFollowers((prev) => [...prev, ...nextUsers.filter((entry) => !prev.some((p) => p.id === entry.id))]);
        setFollowersOffset(Number(response.data?.nextOffset ?? offset + nextUsers.length));
        setFollowersHasMore(Boolean(response.data?.hasMore));
      } else {
        setFollowing((prev) => [...prev, ...nextUsers.filter((entry) => !prev.some((p) => p.id === entry.id))]);
        setFollowingOffset(Number(response.data?.nextOffset ?? offset + nextUsers.length));
        setFollowingHasMore(Boolean(response.data?.hasMore));
      }
    } finally {
      setIsLoadingMoreList(false);
    }
  };

  const toggleFollowFromList = async (entry: FollowUser) => {
    if (!headers || !entry?.id || entry.id === user?.id) {
      return;
    }

    const applyUpdate = (updater: (userEntry: FollowUser) => FollowUser) => {
      if (activeList === 'followers') {
        setFollowers((prev) => prev.map((item) => (item.id === entry.id ? updater(item) : item)));
      } else {
        setFollowing((prev) => prev.map((item) => (item.id === entry.id ? updater(item) : item)));
      }
    };

    const next = !Boolean(entry.isFollowing);
    applyUpdate((item) => ({ ...item, isFollowing: next }));

    try {
      if (next) {
        await api.post(`/users/${entry.id}/follow`, {}, { headers });
      } else {
        await api.delete(`/users/${entry.id}/follow`, { headers });
      }
    } catch (error: any) {
      applyUpdate((item) => ({ ...item, isFollowing: !next }));
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update follow status.');
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="flex-row items-center border-b px-4 pb-3 pt-12" style={{ borderBottomColor: theme.border }}>
        <Pressable className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <Text className="ml-3 text-xl font-semibold" style={{ color: theme.text }}>
          Seller profile
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 130 }}>
          <View className="px-4 pt-5">
            <View className="rounded-3xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <View className="items-center">
                <Image source={{ uri: avatar }} contentFit="cover" className="h-24 w-24 rounded-full" />
                <Text className="mt-3 text-2xl font-semibold" style={{ color: theme.text }}>
                  {username}
                </Text>
                <Text className="mt-2 text-center text-sm" style={{ color: theme.textMuted }}>
                  {about}
                </Text>
              </View>

              <View className="mt-5 flex-row justify-between">
                <Pressable className="flex-1 items-center" onPress={() => setActiveList('followers')}>
                  <Text className="text-lg font-bold" style={{ color: theme.text }}>
                    {followersCount}
                  </Text>
                  <Text className="text-xs font-semibold uppercase" style={{ color: theme.textMuted }}>
                    Followers
                  </Text>
                </Pressable>
                <Pressable className="flex-1 items-center" onPress={() => setActiveList('following')}>
                  <Text className="text-lg font-bold" style={{ color: theme.text }}>
                    {followingCount}
                  </Text>
                  <Text className="text-xs font-semibold uppercase" style={{ color: theme.textMuted }}>
                    Following
                  </Text>
                </Pressable>
                <View className="flex-1 items-center">
                  <Text className="text-lg font-bold" style={{ color: theme.text }}>
                    {listings.length}
                  </Text>
                  <Text className="text-xs font-semibold uppercase" style={{ color: theme.textMuted }}>
                    Listings
                  </Text>
                </View>
              </View>

              {profileId !== user?.id ? (
                <Pressable className="mt-5 items-center rounded-full py-3" style={{ backgroundColor: isFollowing ? theme.surfaceMuted : theme.primary }} onPress={toggleFollow}>
                  <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: isFollowing ? theme.text : theme.textOnPrimary }}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View className="mt-6 px-4">
            <Text className="mb-4 text-3xl italic" style={{ color: theme.text }}>
              Listings
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {listings.map((listing) => (
                <Pressable
                  key={listing.id}
                  className="mb-6 w-[48%]"
                  onPress={() =>
                    router.push({
                      pathname: '/product/[id]',
                      params: {
                        id: listing.id,
                        title: listing.title,
                        category: listing.category ?? 'Listing',
                        price: typeof listing.price === 'number' ? `$${listing.price.toFixed(2)}` : '$0.00',
                        image: listing.image ?? '',
                      },
                    })
                  }>
                  <View className="aspect-[3/4] overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surfaceMuted }}>
                    {listing.image ? (
                      <Image source={{ uri: listing.image }} contentFit="cover" className="h-full w-full" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <MaterialIcons name="image" size={24} color={theme.textMuted} />
                      </View>
                    )}
                  </View>
                  <Text className="mt-2 text-[10px] font-semibold uppercase" style={{ color: theme.textMuted }}>
                    {listing.brand ?? listing.category ?? 'Listing'}
                  </Text>
                  <Text className="mt-1 text-sm" numberOfLines={1} style={{ color: theme.text }}>
                    {listing.title}
                  </Text>
                  <Text className="text-sm font-bold" style={{ color: theme.primary }}>
                    {typeof listing.price === 'number' ? `€${listing.price.toFixed(2)}` : '€0.00'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!listings.length ? (
              <View className="rounded-2xl border px-4 py-8" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <Text className="text-center text-sm" style={{ color: theme.textMuted }}>
                  No listings yet.
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <Modal visible={activeList !== null} transparent animationType="fade" onRequestClose={() => setActiveList(null)}>
        <View className="flex-1 items-center justify-center px-5">
          <Pressable className="absolute inset-0 bg-black/55" onPress={() => setActiveList(null)} />
          <View className="w-full max-w-[420px] rounded-3xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                {activeList === 'followers' ? 'Followers' : 'Following'}
              </Text>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }} onPress={() => setActiveList(null)}>
                <MaterialIcons name="close" size={18} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView className="max-h-80">
              {(activeList === 'followers' ? followers : following).map((entry) => (
                <View
                  key={entry.id}
                  className="mb-2 flex-row items-center rounded-xl px-2 py-2"
                  style={{ backgroundColor: theme.background }}>
                  <Pressable
                    className="flex-1 flex-row items-center"
                    onPress={() => {
                      setActiveList(null);
                      router.push({
                        pathname: '/user/[id]',
                        params: { id: entry.id },
                      });
                    }}>
                    <Image source={{ uri: entry.avatar_url || fallbackAvatar }} contentFit="cover" className="h-9 w-9 rounded-full" />
                    <Text className="ml-2 text-sm font-semibold" style={{ color: theme.text }}>
                      {entry.username || 'User'}
                    </Text>
                  </Pressable>

                  {entry.id !== user?.id ? (
                    <Pressable
                      className="rounded-full px-3 py-1.5"
                      style={{ backgroundColor: entry.isFollowing ? theme.surfaceMuted : theme.primary }}
                      onPress={() => toggleFollowFromList(entry)}>
                      <Text className="text-[10px] font-bold uppercase" style={{ color: entry.isFollowing ? theme.text : theme.textOnPrimary }}>
                        {entry.isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {!(activeList === 'followers' ? followers : following).length ? (
                <Text className="text-sm" style={{ color: theme.textMuted }}>
                  No users to show.
                </Text>
              ) : null}
              {(activeList === 'followers' ? followersHasMore : followingHasMore) ? (
                <Pressable
                  className="mt-2 items-center rounded-xl border py-2"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                  onPress={loadMoreUsers}
                  disabled={isLoadingMoreList}>
                  {isLoadingMoreList ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <Text className="text-xs font-semibold uppercase" style={{ color: theme.text }}>
                      Load more
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
