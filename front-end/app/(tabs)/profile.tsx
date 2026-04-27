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

const closetItems = [
  {
    id: '1',
    name: 'Trench Coat',
    brand: 'Vintage',
    price: '$125',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB0dikOOSBbdKKE9NyzUX9SSi3bmRjM_7p34kkUhFqYm-1lVPxb_39E0isvPBMQJeblfyUJqXmja6QFSHVLRx-59pbmWe7nFwJrBLNciuUGqK_evF8oMpFsQwzVsj4Lu3K36f5jQ2fBb2as--CzITjFBPYslNeWYp9pb3GiUn8Ds4hfT_E-D6AfVgQQ3yEEMGK1nS0MY_t4H25XeumvBTwE9RRZQxRIN7jwEBJsuw9hN18mzWN2qMImnuTii4WgyBh8ASTY_SXzMS4',
  },
  {
    id: '2',
    name: 'Denim Jeans',
    brand: "Levi's",
    price: '$45',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD2N_bCbF03AjR7FfoaXc05lqQOfdfJCa5SCG4hh8LVIS9_YYibBoSJ2xvL-1lardtngD94B_-Jp1PUbO7TIRnnY1pXMLPAeVsOTLJh8f8EXOS5fTaGeG7TpMvMqBo3OhMYGDzORw4z9wLXv0qGuyK6pWeCZgw743qcIUtepRacpblBorM96-hLFc6aWBeblqngFWVYQJ6FamBMPsZMqgNyKty9rZ-24GGcY1LgHaW_yZj6fXIfyrw3FG3OLlDLpgCD54uj1LGBT8U',
  },
  {
    id: '3',
    name: 'Minimal Watch',
    brand: 'Essentials',
    price: '$89',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDdknah9SaHt4LedFSlnvndrhTlAb-fuU59jl6am82eZlCFspK0LxoEd0qSKjV6Qp7hZNu_jf_7CeWOZZeKI5aMWhrLIwkUuQuNVa3Zmevg3ec95VlmEWeldWRdDre1792IYGh7HFRM2qkJgqctILF0eLnoTvXWscta_hmdD3HqBm17DA_QzqDOS_5kTfyE_pGI8eo_zYTTFRHPhe8vbp9yOkD-BpSKbrbDfhpEmyFVsZZB48vBBagnJC9bMZC7VQov65kl6-MYWsI',
  },
  {
    id: '4',
    name: 'Leather Boots',
    brand: 'Handmade',
    price: '$210',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAgkaegsPWOIQIrbmgSP4h5Gb6LJA3mIxbdSdfevPcoChIT4A9bAyHcPhtdmYYcFCNpbLIhEx4_VznhPgUb18FFWS-t0cddp9_idaMpUcU8WvJ2f4gid2XuFBGqI8WQejUHUXp4nhKZ2DuFWqgM7n1Vor-iMAKaPwx_ArYiTXNq3epc1TK-api1003D60DmnpRwjwhCCVEbG1lpp_QA8-gAMnQl9Jcu6uJBpT3I2aKfPZwTCQVCG2-YdWOvsZqMOHhjegJmSxFNraE',
  },
];

type DbProfile = {
  id: string;
  username: string | null;
  bio: string | null;
  location: string | null;
  instagram: string | null;
  avatar_url: string | null;
  followers_count?: number | null;
  following_count?: number | null;
};

type ListingItem = {
  id: string;
  title: string;
  brand?: string | null;
  category?: string | null;
  price: number;
  images?: string[];
};

type ClosetCard = {
  id: string;
  title: string;
  subtitle: string;
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
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [form, setForm] = useState({ username: '', bio: '', location: '', instagram: '' });
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
        const [profileRes, listingsRes] = await Promise.all([
          api.get('/users/me', { headers }),
          api.get('/items', { params: { sellerId: user.id } }),
        ]);

        const nextProfile = (profileRes.data?.user ?? null) as DbProfile | null;
        const dbListings = (listingsRes.data?.items ?? []) as ListingItem[];

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
      const response = await api.put('/users/me', form, { headers });
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
  const renderedCloset: ClosetCard[] = listings.length
    ? listings.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.brand ?? item.category ?? 'Listing',
        priceLabel: `$${item.price.toFixed(2)}`,
        image: item.images?.[0] ?? profileImage,
      }))
    : closetItems.map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.brand,
        priceLabel: item.price,
        image: item.image,
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
            className="px-4 pb-4 pt-12"
            style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-bold italic" style={{ color: theme.primary }}>
                Profile
              </Text>
              
              <Pressable className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }}>
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
                  <Text className="mt-1 text-sm" numberOfLines={1} style={{ color: theme.text }}>
                    {item.title}
                  </Text>
                  <Text className="mt-0.5 text-base font-bold" style={{ color: theme.primary }}>
                    {item.priceLabel}
                  </Text>
                </View>
              ))}
            </View>
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
    </View>
  );
}
