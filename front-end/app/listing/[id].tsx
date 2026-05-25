import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';

type ItemRecord = {
  id: string;
  seller_id?: string | null;
  title: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  condition?: string | null;
  size?: string | null;
  price?: number;
  images?: string[];
  isAvailableForPurchase?: boolean;
};

type BrandOption = {
  id: number;
  name: string;
};

const CONDITION_OPTIONS = ['New with tags', 'Like new', 'Very good', 'Good', 'Fair'] as const;
const MAX_IMAGES = 4;

export default function ManageListingScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { token, user } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [category, setCategory] = useState('');
  const [size, setSize] = useState('');
  const [brand, setBrand] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

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
      if (!listingId || !headers) {
        setIsLoading(false);
        return;
      }

      try {
        const [itemRes, optionsRes] = await Promise.all([
          api.get(`/items/${listingId}`),
          api.get('/items/options'),
        ]);

        const item = (itemRes.data?.item ?? null) as ItemRecord | null;
        if (!item) {
          Alert.alert('Listing not found', 'This listing could not be loaded.');
          router.back();
          return;
        }

        if (item.seller_id && user?.id && item.seller_id !== user.id) {
          Alert.alert('Not allowed', 'You can only manage your own listings.');
          router.back();
          return;
        }

        setTitle(item.title ?? '');
        setDescription(item.description ?? '');
        setPrice(typeof item.price === 'number' ? item.price.toFixed(2) : '');
        setCondition(item.condition ?? '');
        setCategory(item.category ?? '');
        setSize(item.size ?? '');
        setBrand(item.brand ?? '');
        setImages(Array.isArray(item.images) ? item.images.filter(Boolean) : []);
        setIsLocked(item.isAvailableForPurchase === false);
        setBrands((optionsRes.data?.brands ?? []) as BrandOption[]);
      } catch (error: any) {
        Alert.alert('Error', error?.response?.data?.message || 'Failed to load listing.');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [headers, listingId, router, user?.id]);

  const handlePriceChange = (value: string) => {
    const normalized = value.replace(',', '.');
    const sanitized = normalized.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length <= 2) {
      setPrice(sanitized);
      return;
    }
    setPrice(`${parts[0]}.${parts.slice(1).join('')}`);
  };

  const uploadListingImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!headers || !asset.uri) {
      return null;
    }

    const formData = new FormData();
    const fallbackName = asset.fileName ?? `listing-${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? 'image/jpeg';

    if (Platform.OS === 'web') {
      const blob = await (await fetch(asset.uri)).blob();
      formData.append('image', blob, fallbackName);
    } else {
      formData.append('image', {
        uri: asset.uri,
        name: fallbackName,
        type: mimeType,
      } as unknown as Blob);
    }

    const response = await api.post('/items/upload-image', formData, { headers });
    return (response.data?.image?.url as string | undefined) ?? null;
  };

  const addImage = async () => {
    if (!headers || isLocked || isUploadingImage || images.length >= MAX_IMAGES) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Enable photo library access to add listing photos.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (pickerResult.canceled || !pickerResult.assets?.length) {
      return;
    }

    try {
      setIsUploadingImage(true);
      const uploadedUrl = await uploadListingImage(pickerResult.assets[0]);
      if (!uploadedUrl) {
        throw new Error('Upload failed');
      }
      setImages((prev) => [...prev, uploadedUrl]);
    } catch (error: any) {
      Alert.alert('Upload failed', error?.response?.data?.message || 'Could not upload image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    if (isLocked) {
      return;
    }
    setImages((prev) => prev.filter((_, entryIndex) => entryIndex !== index));
  };

  const saveListing = async () => {
    if (!listingId || !headers || isSaving || isLocked) {
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing title', 'Please add a title.');
      return;
    }

    if (!category.trim() || !size.trim() || !brand.trim()) {
      Alert.alert('Missing details', 'Please fill in category, size, and brand.');
      return;
    }

    if (!condition) {
      Alert.alert('Missing condition', 'Please choose a condition.');
      return;
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid price greater than 0.');
      return;
    }

    if (!images.length) {
      Alert.alert('Add photos', 'Keep at least one photo on the listing.');
      return;
    }

    try {
      setIsSaving(true);
      await api.put(
        `/items/${listingId}`,
        {
          title: title.trim(),
          description: description.trim() || null,
          price: numericPrice,
          condition,
          size: size.trim(),
          brand: brand.trim(),
          category: category.trim(),
          isNew: condition === 'New with tags',
          images,
        },
        { headers }
      );

      Alert.alert('Saved', 'Your listing was updated.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Save failed', error?.response?.data?.message || 'Could not update listing.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteListing = () => {
    if (!listingId || !headers || isDeleting || isLocked) {
      return;
    }

    setIsDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) {
      return;
    }

    setIsDeleteModalVisible(false);
  };

  const confirmDeleteListing = async () => {
    if (!listingId || !headers || isDeleting || isLocked) {
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(`/items/${listingId}`, { headers });
      setIsDeleteModalVisible(false);
      router.replace('/(tabs)/profile');
    } catch (error: any) {
      Alert.alert('Delete failed', error?.response?.data?.message || 'Could not delete listing.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View
        className="px-4 pb-4 pt-12"
        style={{ backgroundColor: theme.background, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
        <View className="flex-row items-center justify-between">
          <Pressable className="h-9 w-9 items-center justify-center rounded-full" onPress={() => router.back()} style={{ backgroundColor: theme.surfaceMuted }}>
            <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <Text className="text-xl font-semibold" style={{ color: theme.text }}>
            Manage listing
          </Text>
          <View className="h-9 w-9" />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {isLocked ? (
          <View className="mb-4 rounded-2xl border px-4 py-3" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <Text className="text-sm leading-6" style={{ color: theme.textMuted }}>
              This listing has an active order, so it can’t be edited or deleted right now.
            </Text>
          </View>
        ) : null}

        <Text className="mb-2 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
          Photos
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} className="relative h-36 w-28 overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
              <Image source={{ uri }} contentFit="cover" className="h-full w-full" />
              {!isLocked ? (
                <Pressable className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: theme.surface }} onPress={() => removeImage(index)}>
                  <MaterialIcons name="close" size={16} color={theme.text} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {!isLocked && images.length < MAX_IMAGES ? (
            <Pressable className="h-36 w-28 items-center justify-center rounded-2xl border" style={{ borderColor: theme.border, backgroundColor: theme.surface }} onPress={addImage} disabled={isUploadingImage}>
              {isUploadingImage ? <ActivityIndicator color={theme.primary} /> : <MaterialIcons name="add-a-photo" size={24} color={theme.textMuted} />}
            </Pressable>
          ) : null}
        </ScrollView>

        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
          Title
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          editable={!isLocked}
          className="rounded-2xl border px-3 py-3"
          style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
        />

        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!isLocked}
          multiline
          className="min-h-24 rounded-2xl border px-3 py-3"
          style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface, textAlignVertical: 'top' }}
        />

        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
          Price
        </Text>
        <TextInput
          value={price}
          onChangeText={handlePriceChange}
          editable={!isLocked}
          keyboardType="decimal-pad"
          className="rounded-2xl border px-3 py-3"
          style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
        />

        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
          Category
        </Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          editable={!isLocked}
          className="rounded-2xl border px-3 py-3"
          style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
        />

        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
          Size
        </Text>
        <TextInput
          value={size}
          onChangeText={setSize}
          editable={!isLocked}
          className="rounded-2xl border px-3 py-3"
          style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
        />

        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
          Brand
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {brands.map((option) => {
            const selected = brand === option.name;
            return (
              <Pressable
                key={option.id}
                className="rounded-full px-3 py-2"
                disabled={isLocked}
                onPress={() => setBrand(option.name)}
                style={{ backgroundColor: selected ? theme.primary : theme.surfaceMuted }}>
                <Text className="text-xs font-semibold" style={{ color: selected ? theme.textOnPrimary : theme.text }}>
                  {option.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[1px]" style={{ color: theme.textMuted }}>
          Condition
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {CONDITION_OPTIONS.map((option) => {
            const selected = condition === option;
            return (
              <Pressable
                key={option}
                className="rounded-full px-3 py-2"
                disabled={isLocked}
                onPress={() => setCondition(option)}
                style={{ backgroundColor: selected ? theme.primary : theme.surfaceMuted }}>
                <Text className="text-xs font-semibold" style={{ color: selected ? theme.textOnPrimary : theme.text }}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          className="mt-8 items-center rounded-full py-4"
          style={{ backgroundColor: theme.primary, opacity: isLocked || isSaving ? 0.55 : 1 }}
          disabled={isLocked || isSaving}
          onPress={saveListing}>
          {isSaving ? (
            <ActivityIndicator color={theme.textOnPrimary} />
          ) : (
            <Text className="text-sm font-semibold" style={{ color: theme.textOnPrimary }}>
              Save changes
            </Text>
          )}
        </Pressable>

        <Pressable
          className="mt-3 items-center rounded-full border py-4"
          style={{ borderColor: theme.border, opacity: isLocked || isDeleting ? 0.55 : 1 }}
          disabled={isLocked || isDeleting}
          onPress={deleteListing}>
          {isDeleting ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <Text className="text-sm font-semibold" style={{ color: theme.text }}>
              Delete listing
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal visible={isDeleteModalVisible} transparent animationType="fade" onRequestClose={closeDeleteModal}>
        <View className="flex-1 items-center justify-center px-5">
          <Pressable className="absolute inset-0 bg-black/55" onPress={closeDeleteModal} />
          <View className="w-full max-w-[420px] rounded-2xl border p-5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <Text className="text-lg font-semibold" style={{ color: theme.text }}>
              Delete listing?
            </Text>
            <Text className="mt-3 text-sm leading-6" style={{ color: theme.textMuted }}>
              This removes the listing from your closet and the marketplace.
            </Text>
            <View className="mt-5 flex-row gap-3">
              <Pressable
                className="flex-1 items-center rounded-full border py-3.5"
                style={{ borderColor: theme.border }}
                disabled={isDeleting}
                onPress={closeDeleteModal}>
                <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center rounded-full py-3.5"
                style={{ backgroundColor: theme.primary, opacity: isDeleting ? 0.6 : 1 }}
                disabled={isDeleting}
                onPress={confirmDeleteListing}>
                {isDeleting ? (
                  <ActivityIndicator color={theme.textOnPrimary} />
                ) : (
                  <Text className="text-sm font-semibold" style={{ color: theme.textOnPrimary }}>
                    Delete
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
