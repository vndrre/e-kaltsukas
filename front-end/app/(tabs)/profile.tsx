import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';

const profileImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCatomNVqLWwf1u2rVVhjW53qRac0tdL2zeeN6RB7zqZjsrSXsVmQxBQscuEZIqrZY9EzceU8JTPV24fVYk2BHmoDfFC1Yf4xFg-6LfRqUx3HQGVFyT7_ERwVeYniYj7M9X-8IfzHPBaetYSo5ns0oaCJEW3JoKUK6wwbzI-zch26d-99IuLdGj3pVP6JXBjw_J_Xcwn1Aym1P1wMg_lfZidgVYHPaELyZRiqBj4N91Ux2kDwVXt7p9339oM_xQKFwgocpczuEvvSk';

type DbProfile = {
  id: string;
  username: string | null;
  bio: string | null;
  location: string | null;
  instagram: string | null;
  avatar_url: string | null;
  closet_name?: string | null;
  closet_description?: string | null;
  style_tags?: string[] | null;
  followers_count?: number | null;
  following_count?: number | null;
};

type ListingItem = {
  id: string;
  seller_id?: string;
  title: string;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  size?: string | null;
  price: number;
  images?: string[];
};

type ClosetCard = {
  id: string;
  title: string;
  subtitle: string;
  meta: string[];
  priceLabel: string;
  image: string;
};

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const { user, token, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editing, setEditing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [form, setForm] = useState({
    username: '',
    bio: '',
    location: '',
    instagram: '',
  });
  const [avatarRefreshToken, setAvatarRefreshToken] = useState(0);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  useEffect(() => {
    const load = async () => {
      if (!token || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        const profileRes = await api.get('/users/me', { headers });
        const nextProfile = (profileRes.data?.user ?? null) as DbProfile | null;
        const sellerId = nextProfile?.id || user.id;

        const listingsRes = await api.get('/items', { params: { sellerId } });
        const dbListings = ((listingsRes.data?.items ?? []) as ListingItem[]).filter(
          (item) => !item.seller_id || item.seller_id === sellerId
        );

        setProfile(nextProfile);
        setListings(dbListings);
        setForm({
          username: nextProfile?.username ?? '',
          bio: nextProfile?.bio ?? '',
          location: nextProfile?.location ?? '',
          instagram: nextProfile?.instagram ?? '',
        });
      } catch {
        Alert.alert('Error', 'Failed to load profile data from database.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [headers, token, user?.id]);

  const saveProfile = async () => {
    if (!token) {
      return;
    }
    try {
      setSaving(true);
      const payload = {
        username: form.username,
        bio: form.bio,
        location: form.location,
        instagram: form.instagram,
      };

      const response = await api.put('/users/me', payload, { headers });
      const nextProfile = response.data?.user as DbProfile;
      setProfile(nextProfile);
      setEditing(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = () => {
    setForm({
      username: profile?.username ?? '',
      bio: profile?.bio ?? '',
      location: profile?.location ?? '',
      instagram: profile?.instagram ?? '',
    });
    setEditing(true);
  };

  const closeEditModal = () => {
    if (saving || uploadingAvatar) {
      return;
    }
    setEditing(false);
  };

  const uploadAvatar = async () => {
    if (!token) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Enable photo library access to upload a profile picture.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (pickerResult.canceled || !pickerResult.assets?.length) {
      return;
    }

    const asset = pickerResult.assets[0];
    if (!asset.uri) {
      Alert.alert('Error', 'Could not read selected image.');
      return;
    }

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      const fallbackName = asset.fileName ?? `avatar-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? 'image/jpeg';

      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        formData.append('avatar', blob, fallbackName);
      } else {
        formData.append('avatar', {
          uri: asset.uri,
          name: fallbackName,
          type: mimeType,
        } as unknown as Blob);
      }

      const response = await api.post('/users/me/avatar', formData, {
        headers: {
          ...headers,
        },
      });

      const nextProfile = (response.data?.user ?? null) as DbProfile | null;
      if (nextProfile) {
        setProfile(nextProfile);
        setAvatarRefreshToken(Date.now());
      }
      Alert.alert('Saved', 'Profile picture updated.');
    } catch (error: any) {
      const serverMessage = error?.response?.data?.message;
      console.error('Avatar upload error:', error?.response?.data || error);
      Alert.alert('Error', serverMessage || 'Failed to upload profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const displayName = profile?.username?.trim() || user?.name?.trim() || user?.email?.split('@')[0] || 'Your closet';
  const handle = profile?.instagram?.trim() || user?.email?.split('@')[0] || 'profile';
  const about = profile?.bio?.trim() || 'Add a short bio so buyers know the style behind your closet.';
  const avatarImageRaw = profile?.avatar_url?.trim() || profileImage;
  const avatarImage = avatarImageRaw.startsWith('http')
    ? `${avatarImageRaw}${avatarImageRaw.includes('?') ? '&' : '?'}v=${avatarRefreshToken}`
    : avatarImageRaw;
  const renderedCloset: ClosetCard[] = listings.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.brand ?? item.category ?? 'Listing',
    meta: [item.category, item.size, item.condition]
      .filter((value): value is string => Boolean(value && value.trim()))
      .map((value) => value.trim()),
    priceLabel: `$${item.price.toFixed(2)}`,
    image: item.images?.[0] ?? profileImage,
  }));
  const listingsCount = listings.length;
  const followersCount = Number.isFinite(profile?.followers_count as number) ? Number(profile?.followers_count) : 0;
  const followingCount = Number.isFinite(profile?.following_count as number) ? Number(profile?.following_count) : 0;

  const formatCompact = (value: number) =>
    new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Math.max(0, value));

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <View
            className="px-4 pb-4 pt-8"
            style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-bold italic" style={{ color: theme.primary }}>
                Profile
              </Text>
              
              <Pressable
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.surfaceMuted }}
                onPress={() => setSettingsVisible(true)}>
                <MaterialIcons name="settings" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <View className="px-4 pt-5">
            <View className="rounded-3xl p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
              <View className="items-center">
                <View className="h-28 w-28 overflow-hidden rounded-full border-2 p-1.5" style={{ borderColor: theme.border }}>
                  <Image key={avatarImage} source={{ uri: avatarImage }} contentFit="cover" className="h-full w-full rounded-full" />
                </View>
                <Text className="mt-4 text-3xl font-light" style={{ color: theme.text }}>
                  {displayName}
                </Text>
                <Text className="mt-1 text-[11px] font-bold uppercase tracking-[2px]" style={{ color: theme.primary }}>
                  @{handle}
                </Text>
                <Text className="mt-4 text-center text-sm leading-6" style={{ color: theme.textMuted }}>
                  {about}
                </Text>
              </View>

              <View className="mt-6 flex-row gap-3">
                <Pressable className="flex-1 rounded-full border py-3" style={{ borderColor: theme.border }} onPress={openEditModal}>
                  <Text className="text-center text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
                    Edit Profile
                  </Text>
                </Pressable>
                <Pressable className="flex-1 rounded-full py-3" style={{ backgroundColor: theme.primary }}>
                  <Text className="text-center text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
                    Share Closet
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View className="mx-4 mt-4 rounded-3xl border px-4 py-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <View className="flex-row items-center justify-between">
              {[
                { label: 'Followers', value: formatCompact(followersCount) },
                { label: 'Following', value: formatCompact(followingCount) },
                { label: 'Listings', value: formatCompact(listingsCount) },
              ].map((stat) => (
                <View key={stat.label} className="items-center">
                  <Text className="text-lg font-bold" style={{ color: theme.text }}>
                    {stat.value}
                  </Text>
                  <Text className="text-[9px] font-extrabold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-6 px-4">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-4xl font-light italic" style={{ color: theme.text }}>
                My Closet
              </Text>
              <Text className="text-lg font-semibold" style={{ color: theme.primary }}>
                {listingsCount}
              </Text>
            </View>
            <View className="flex-row flex-wrap justify-between">
              {renderedCloset.map((item) => (
                <View key={item.id} className="mb-6 w-[48%]">
                  <View className="aspect-[3/4] overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
                    <Image source={{ uri: item.image }} contentFit="cover" className="h-full w-full" />
                  </View>
                  <Text className="mt-2 text-[9px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
                    {item.subtitle}
                  </Text>
                  {item.meta.length ? (
                    <View className="mt-1 flex-row flex-wrap">
                      {item.meta.map((meta) => (
                        <View
                          key={`${item.id}-${meta}`}
                          className="mb-1 mr-1 rounded-full px-2 py-1"
                          style={{ backgroundColor: theme.surfaceMuted }}>
                          <Text className="text-[10px] font-semibold uppercase" style={{ color: theme.textMuted }}>
                            {meta}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text className="mt-1 text-sm" numberOfLines={1} style={{ color: theme.text }}>
                    {item.title}
                  </Text>
                  <Text className="mt-0.5 text-base font-bold" style={{ color: theme.primary }}>
                    {item.priceLabel}
                  </Text>
                </View>
              ))}
            </View>
            {!renderedCloset.length ? (
              <View className="rounded-2xl border px-4 py-8" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <Text className="text-center text-sm" style={{ color: theme.textMuted }}>
                  No items in your closet yet. Add a listing from the Sell tab and it will appear here.
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <Modal visible={editing} transparent animationType="fade" onRequestClose={closeEditModal}>
        <View className="flex-1 items-center justify-center px-4">
          <Pressable className="absolute inset-0 bg-black/55" onPress={closeEditModal} />
          <View className="w-full max-w-[420px] rounded-3xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                Edit profile
              </Text>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full" onPress={closeEditModal} style={{ backgroundColor: theme.surfaceMuted }}>
                <MaterialIcons name="close" size={18} color={theme.text} />
              </Pressable>
            </View>

            <View className="mb-4 items-center">
              <View className="h-20 w-20 overflow-hidden rounded-full border p-1.5" style={{ borderColor: theme.border }}>
                <Image key={`modal-${avatarImage}`} source={{ uri: avatarImage }} contentFit="cover" className="h-full w-full rounded-full" />
              </View>
              <Pressable
                className="mt-2 rounded-full border px-4 py-2"
                style={{ borderColor: theme.border }}
                onPress={uploadAvatar}
                disabled={uploadingAvatar}>
                <Text className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
                  {uploadingAvatar ? 'Uploading...' : 'Change Picture'}
                </Text>
              </Pressable>
            </View>

            <TextInput
              value={form.username}
              onChangeText={(value) => setForm((prev) => ({ ...prev, username: value }))}
              placeholder="Username"
              placeholderTextColor={theme.textMuted}
              className="mb-3 rounded-xl border px-3 py-2.5"
              style={{ color: theme.text, borderColor: theme.border, backgroundColor: theme.background }}
            />
            <TextInput
              value={form.location}
              onChangeText={(value) => setForm((prev) => ({ ...prev, location: value }))}
              placeholder="Location"
              placeholderTextColor={theme.textMuted}
              className="mb-3 rounded-xl border px-3 py-2.5"
              style={{ color: theme.text, borderColor: theme.border, backgroundColor: theme.background }}
            />
            <TextInput
              value={form.instagram}
              onChangeText={(value) => setForm((prev) => ({ ...prev, instagram: value }))}
              placeholder="Instagram handle"
              placeholderTextColor={theme.textMuted}
              className="mb-3 rounded-xl border px-3 py-2.5"
              style={{ color: theme.text, borderColor: theme.border, backgroundColor: theme.background }}
            />
            <TextInput
              value={form.bio}
              onChangeText={(value) => setForm((prev) => ({ ...prev, bio: value }))}
              placeholder="Bio"
              placeholderTextColor={theme.textMuted}
              multiline
              className="mb-3 min-h-20 rounded-xl border px-3 py-2.5"
              style={{ color: theme.text, borderColor: theme.border, backgroundColor: theme.background, textAlignVertical: 'top' }}
            />
            <Pressable className="rounded-full py-3" style={{ backgroundColor: theme.primary }} onPress={saveProfile} disabled={saving}>
              <Text className="text-center text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={settingsVisible} transparent animationType="fade" onRequestClose={() => setSettingsVisible(false)}>
        <View className="flex-1 items-center justify-center px-6">
          <Pressable className="absolute inset-0 bg-black/55" onPress={() => setSettingsVisible(false)} />
          <View className="w-full max-w-[340px] rounded-3xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                Settings
              </Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-full"
                onPress={() => setSettingsVisible(false)}
                style={{ backgroundColor: theme.surfaceMuted }}>
                <MaterialIcons name="close" size={18} color={theme.text} />
              </Pressable>
            </View>

            <Pressable
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: theme.surfaceMuted }}
              onPress={() => {
                setSettingsVisible(false);
                logout();
              }}>
              <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                Sign out
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
