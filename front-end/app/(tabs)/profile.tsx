import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
  const opacity = useRef(new Animated.Value(0)).current;

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

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
  const avatarImage = profile?.avatar_url?.trim() || profileImage;
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

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
      <Animated.View className="flex-1" style={{ opacity }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="px-5 pb-4 pt-14">
          <View className="flex-row items-center justify-between">
            <MaterialIcons name="settings" size={22} color={theme.text} />
            <Text className="text-xs font-extrabold uppercase tracking-[3px]" style={{ color: theme.text }}>
              Lux Market
            </Text>
            <MaterialIcons name="share" size={22} color={theme.text} />
          </View>
        </View>

        <View className="items-center px-6 pt-4">
          <View className="h-36 w-36 overflow-hidden rounded-full border p-1.5" style={{ borderColor: theme.border }}>
            <Image source={{ uri: avatarImage }} contentFit="cover" className="h-full w-full rounded-full" />
          </View>
          <Pressable
            className="mt-3 rounded-full border px-4 py-2"
            style={{ borderColor: theme.border }}
            onPress={uploadAvatar}
            disabled={uploadingAvatar}>
            <Text className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
              {uploadingAvatar ? 'Uploading...' : 'Change Profile Picture'}
            </Text>
          </Pressable>
          <Text className="mt-6 text-4xl font-light" style={{ color: theme.text }}>{displayName}</Text>
          <Text className="mt-1 text-[11px] font-bold uppercase tracking-[2px]" style={{ color: theme.primary }}>
            @{handle}
          </Text>
          <Text className="mt-5 px-4 text-center text-sm italic leading-6" style={{ color: theme.textMuted }}>
            {about}
          </Text>

          <View className="mt-8 w-full flex-row gap-3">
            <Pressable className="flex-1 rounded-full border py-3" style={{ borderColor: theme.border }} onPress={() => setEditing((v) => !v)}>
              <Text className="text-center text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
                {editing ? 'Cancel' : 'Edit Profile'}
              </Text>
            </Pressable>
            <Pressable className="flex-1 rounded-full py-3" style={{ backgroundColor: theme.text }}>
              <Text className="text-center text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.background }}>
                Share Closet
              </Text>
            </Pressable>
          </View>
        </View>

        {editing ? (
          <View className="mx-6 mt-6 rounded-2xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <TextInput
              value={form.username}
              onChangeText={(value) => setForm((prev) => ({ ...prev, username: value }))}
              placeholder="Username"
              placeholderTextColor={theme.textMuted}
              className="mb-3 rounded-xl border px-3 py-2"
              style={{ color: theme.text, borderColor: theme.border }}
            />
            <TextInput
              value={form.location}
              onChangeText={(value) => setForm((prev) => ({ ...prev, location: value }))}
              placeholder="Location"
              placeholderTextColor={theme.textMuted}
              className="mb-3 rounded-xl border px-3 py-2"
              style={{ color: theme.text, borderColor: theme.border }}
            />
            <TextInput
              value={form.instagram}
              onChangeText={(value) => setForm((prev) => ({ ...prev, instagram: value }))}
              placeholder="Instagram handle"
              placeholderTextColor={theme.textMuted}
              className="mb-3 rounded-xl border px-3 py-2"
              style={{ color: theme.text, borderColor: theme.border }}
            />
            <TextInput
              value={form.bio}
              onChangeText={(value) => setForm((prev) => ({ ...prev, bio: value }))}
              placeholder="Bio"
              placeholderTextColor={theme.textMuted}
              multiline
              className="mb-3 min-h-20 rounded-xl border px-3 py-2"
              style={{ color: theme.text, borderColor: theme.border, textAlignVertical: 'top' }}
            />
            <Pressable className="rounded-full py-3" style={{ backgroundColor: theme.primary }} onPress={saveProfile} disabled={saving}>
              <Text className="text-center text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mx-6 mt-8 flex-row items-center justify-between rounded-2xl border px-4 py-4" style={{ borderColor: theme.border }}>
          {[
            { label: 'Followers', value: '1.2k' },
            { label: 'Following', value: '850' },
            { label: 'Listings', value: String(listingsCount) },
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

        <View className="mt-8 flex-row flex-wrap justify-between px-6">
          {renderedCloset.map((item) => (
            <View key={item.id} className="mb-8 w-[48%]">
              <View className="aspect-[3/4] overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
                <Image source={{ uri: item.image }} contentFit="cover" className="h-full w-full" />
              </View>
              <Text className="mt-3 text-[9px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
                {item.subtitle}
              </Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-sm" style={{ color: theme.text }}>
                  {item.title}
                </Text>
                <Text className="text-sm font-bold" style={{ color: theme.text }}>
                  {item.priceLabel}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable
        className="absolute right-6 top-14 rounded-full px-4 py-2"
        style={{ backgroundColor: theme.primary }}
        onPress={logout}>
        <Text className="text-xs font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
          Logout
        </Text>
      </Pressable>
      </Animated.View>
      )}
    </View>
  );
}
