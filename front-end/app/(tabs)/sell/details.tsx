import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SellDraftImage } from '@/hooks/sell-draft-provider';
import { useSellDraft } from '@/hooks/sell-draft-provider';
import { useAuth } from '@/hooks/auth-provider';
import { getLastNonSellTabHref } from '@/hooks/last-non-sell-tab';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';

type AudienceOption = {
  id: number;
  code: string;
  label: string;
};

type CategoryOption = {
  id: number;
  name: string;
  audienceCode: string | null;
};

type BrandOption = {
  id: number;
  name: string;
};

type SizeOption = {
  id: number;
  value: string;
  groupCode: string | null;
  sortOrder: number;
};

type PickerType = 'category' | 'size' | 'brand';

export default function SellDetailsScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const {
    images,
    clear,
    form,
    patchForm,
    draftHydratedFromServer,
    deleteServerDraft,
    persistDraftSilentlyOnBlur,
    persistDraftToServer,
    hasMeaningfulLocalDraft,
  } = useSellDraft();

  useFocusEffect(
    useCallback(() => {
      return () => {
        void persistDraftSilentlyOnBlur();
      };
    }, [persistDraftSilentlyOnBlur]),
  );

  const conditionOptions = [
    'New with tags',
    'Like new',
    'Very good',
    'Good',
    'Fair',
  ] as const;
  const { title, story, condition, category, size, brand, price, audience } = form;
  const [sizeGroup, setSizeGroup] = useState('');
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [sizes, setSizes] = useState<SizeOption[]>([]);
  const [activePicker, setActivePicker] = useState<PickerType | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  useEffect(() => {
    if (images.length === 0) {
      router.replace('/(tabs)/sell');
    }
  }, [images.length, router]);

  const handlePriceChange = (value: string) => {
    const normalized = value.replace(',', '.');
    const sanitized = normalized.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');

    if (parts.length <= 2) {
      patchForm({ price: sanitized });
      return;
    }

    patchForm({ price: `${parts[0]}.${parts.slice(1).join('')}` });
  };

  const uploadListingImage = async (slot: SellDraftImage, index: number) => {
    const formData = new FormData();
    const fallbackName = slot.fileName ?? `listing-${Date.now()}-${index}.jpg`;
    const mimeType = slot.mimeType ?? 'image/jpeg';

    if (Platform.OS === 'web') {
      const blob = await (await fetch(slot.uri)).blob();
      formData.append('image', blob, fallbackName);
    } else {
      formData.append('image', {
        uri: slot.uri,
        name: fallbackName,
        type: mimeType,
      } as unknown as Blob);
    }

    const response = await api.post('/items/upload-image', formData, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });

    return response.data?.image?.url as string;
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await api.get('/items/options');
        const fetchedAudiences = (response.data?.options?.audiences ?? []) as AudienceOption[];
        const fetchedCategories = (response.data?.options?.categories ?? []) as CategoryOption[];
        const fetchedBrands = (response.data?.options?.brands ?? []) as BrandOption[];
        const fetchedSizes = (response.data?.options?.sizes ?? []) as SizeOption[];

        setAudiences(fetchedAudiences);
        setCategories(fetchedCategories);
        setBrands(fetchedBrands);
        setSizes(fetchedSizes);

        const preferredAudience =
          fetchedAudiences.find((entry) => entry.code === 'women')?.code ?? fetchedAudiences[0]?.code ?? '';
        if (!draftHydratedFromServer) {
          patchForm({ audience: preferredAudience });
        }
        setSizeGroup('general');
      } catch (error) {
        console.error('Failed to load sell options:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, [draftHydratedFromServer, patchForm]);

  const audienceCategories = useMemo(
    () => categories.filter((entry) => entry.audienceCode === audience).map((entry) => entry.name),
    [audience, categories],
  );

  const availableSizeGroups = useMemo(() => {
    const groups = new Set<string>();

    sizes.forEach((entry) => {
      if (!entry.groupCode) {
        return;
      }

      if (audience === 'women' && ['general', 'women_eu', 'jeans', 'shoes_eu'].includes(entry.groupCode)) {
        groups.add(entry.groupCode);
      } else if (audience === 'men' && ['general', 'men_eu', 'jeans', 'shoes_eu'].includes(entry.groupCode)) {
        groups.add(entry.groupCode);
      } else if (audience === 'kids' && ['kids_eu', 'general', 'shoes_eu'].includes(entry.groupCode)) {
        groups.add(entry.groupCode);
      } else if (audience === 'unisex' && ['general', 'shoes_eu'].includes(entry.groupCode)) {
        groups.add(entry.groupCode);
      } else if (!audience) {
        groups.add(entry.groupCode);
      }
    });

    const order = ['general', 'women_eu', 'men_eu', 'jeans', 'shoes_eu', 'kids_eu'];
    return order.filter((code) => groups.has(code));
  }, [audience, sizes]);

  useEffect(() => {
    if (category && !audienceCategories.includes(category)) {
      patchForm({ category: '' });
    }
  }, [audienceCategories, category, patchForm]);

  useEffect(() => {
    if (!availableSizeGroups.includes(sizeGroup)) {
      setSizeGroup(availableSizeGroups[0] ?? '');
      patchForm({ size: '' });
    }
  }, [availableSizeGroups, patchForm, sizeGroup]);

  useEffect(() => {
    if (!availableSizeGroups.length) {
      return;
    }

    const categoryLower = category.trim().toLowerCase();
    let preferredGroup = availableSizeGroups[0];

    if (categoryLower.includes('shoes') && availableSizeGroups.includes('shoes_eu')) {
      preferredGroup = 'shoes_eu';
    } else if (categoryLower.includes('jeans') && availableSizeGroups.includes('jeans')) {
      preferredGroup = 'jeans';
    } else if (audience === 'kids' && availableSizeGroups.includes('kids_eu')) {
      preferredGroup = 'kids_eu';
    } else if (availableSizeGroups.includes('general')) {
      preferredGroup = 'general';
    }

    if (sizeGroup !== preferredGroup) {
      setSizeGroup(preferredGroup);
      patchForm({ size: '' });
    }
  }, [availableSizeGroups, audience, category, patchForm, sizeGroup]);

  const sizeValues = useMemo(
    () =>
      sizes
        .filter((entry) => entry.groupCode === sizeGroup)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((entry) => entry.value),
    [sizeGroup, sizes],
  );

  useEffect(() => {
    if (size && !sizeValues.includes(size)) {
      patchForm({ size: '' });
    }
  }, [patchForm, size, sizeValues]);

  const estimatedEarnings = useMemo(() => {
    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      return '€0.00';
    }
    return `€${(numericPrice * 0.9).toFixed(2)}`;
  }, [price]);

  const audienceLabelByCode = useMemo(() => {
    const nextMap = new Map<string, string>();
    audiences.forEach((entry) => nextMap.set(entry.code, entry.label));
    return nextMap;
  }, [audiences]);

  const pickerTitle = useMemo(() => {
    if (activePicker === 'category') return 'Select Category';
    if (activePicker === 'size') return 'Select Size';
    if (activePicker === 'brand') return 'Select Brand';
    return '';
  }, [activePicker]);

  const pickerOptions = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();

    if (activePicker === 'category') {
      return audienceCategories.filter((entry) => entry.toLowerCase().includes(query));
    }

    if (activePicker === 'size') {
      return sizeValues.filter((entry) => entry.toLowerCase().includes(query));
    }

    if (activePicker === 'brand') {
      return brands
        .map((entry) => entry.name)
        .filter((entry) => entry.toLowerCase().includes(query));
    }

    return [];
  }, [activePicker, pickerSearch, audienceCategories, sizeValues, brands]);

  const openPicker = (picker: PickerType) => {
    setActivePicker(picker);
    setPickerSearch('');
  };

  const closePicker = () => {
    setActivePicker(null);
    setPickerSearch('');
  };

  const handleSaveDraft = useCallback(async () => {
    if (!hasMeaningfulLocalDraft()) {
      Alert.alert('Nothing to save', 'Add photos or listing details first.');
      return;
    }
    setIsSavingDraft(true);
    try {
      const result = await persistDraftToServer();
      if (!result.ok) {
        Alert.alert('Draft not saved', result.message);
        return;
      }
      Alert.alert('Draft saved', 'You can leave and pick this up later from Sell.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', onPress: () => router.replace(getLastNonSellTabHref()) },
      ]);
    } finally {
      setIsSavingDraft(false);
    }
  }, [hasMeaningfulLocalDraft, persistDraftToServer, router]);

  const handlePickOption = (value: string) => {
    if (activePicker === 'category') {
      patchForm({ category: value });
    } else if (activePicker === 'size') {
      patchForm({ size: value });
    } else if (activePicker === 'brand') {
      patchForm({ brand: value });
    }

    closePicker();
  };

  const handlePublishListing = async () => {
    if (isSubmitting) {
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing title', 'Please add a title before publishing.');
      return;
    }

    if (!audience || !category || !size || !brand) {
      Alert.alert('Missing details', 'Please select clothing for, category, size, and brand.');
      return;
    }

    if (!condition) {
      Alert.alert('Missing condition', 'Please choose an item condition.');
      return;
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid price greater than 0.');
      return;
    }

    if (!images.length) {
      Alert.alert('Add images', 'Please add at least one clothing image.');
      return;
    }

    try {
      setIsSubmitting(true);

      const imageUrls: string[] = [];
      for (let index = 0; index < images.length; index += 1) {
        const url = await uploadListingImage(images[index], index);
        if (url) {
          imageUrls.push(url);
        }
      }

      if (!imageUrls.length) {
        throw new Error('No images were uploaded.');
      }

      await api.post(
        '/items',
        {
          title: title.trim(),
          description: story.trim() || null,
          price: numericPrice,
          condition,
          size,
          brand,
          category,
          audience,
          isNew: condition === 'New with tags',
          images: imageUrls,
        },
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        },
      );

      clear();
      await deleteServerDraft();

      Alert.alert('Published', 'Your listing was published successfully.', [
        {
          text: 'View closet',
          onPress: () => router.replace('/(tabs)/profile'),
        },
        {
          text: 'List another',
          onPress: () => router.replace('/(tabs)/sell'),
        },
      ]);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message = err?.response?.data?.message || err?.message || 'Failed to publish listing.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (images.length === 0) {
    return null;
  }

  const footerBottomPad = Math.max(insets.bottom, 12);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View
        className="flex-row items-center border-b px-2 py-3"
        style={{ borderColor: theme.border, paddingTop: Math.max(insets.top, 12) }}>
        <Pressable
          accessibilityLabel="Back"
          hitSlop={16}
          onPress={() => router.back()}
          className="h-10 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.surfaceMuted }}>
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Text className="min-w-0 flex-1 px-1 text-center text-base font-semibold" style={{ color: theme.text }}>
          Listing details
        </Text>
        <Pressable
          accessibilityLabel="Save draft"
          hitSlop={12}
          disabled={isSavingDraft}
          onPress={() => void handleSaveDraft()}
          className="h-10 shrink-0 justify-center px-2"
          style={{ opacity: isSavingDraft ? 0.6 : 1 }}>
          {isSavingDraft ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text className="text-center text-xs font-bold uppercase tracking-wide" style={{ color: theme.primary }}>
              Save draft
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 20, flexGrow: 1 }}>
          <View className="pb-3 pt-4">
            <Text className="text-2xl italic" style={{ color: theme.text }}>
              Finish your post
            </Text>
            <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
              Photos are set — add title, condition, and price.
            </Text>
          </View>

          <Pressable onPress={() => router.push('/(tabs)/sell/review')}>
            <View
              className="rounded-3xl p-4"
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}>
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.primary }}>
                  Photos
                </Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
                    Edit
                  </Text>
                  <MaterialIcons name="chevron-right" size={18} color={theme.textMuted} />
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {images.map((slot, index) => (
                  <View
                    key={`${slot.uri}-${index}`}
                    className="h-28 w-28 overflow-hidden rounded-2xl"
                    style={{ borderWidth: 1, borderColor: theme.border }}>
                    <Image source={{ uri: slot.uri }} className="h-full w-full" contentFit="cover" />
                  </View>
                ))}
              </ScrollView>
            </View>
          </Pressable>

          <View className="mt-5 gap-4">
            <View
              className="rounded-3xl p-4"
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}>
              <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
                Item title
              </Text>
              <TextInput
                value={title}
                onChangeText={(t) => patchForm({ title: t })}
                placeholder="Vintage leather jacket..."
                placeholderTextColor={theme.textMuted}
                className="mt-2 rounded-xl border px-3 py-3 text-lg"
                style={{ color: theme.text, borderColor: theme.border, backgroundColor: theme.background }}
              />

              <Text className="mt-4 text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
                Condition
              </Text>
              <View className="mt-2 flex-row flex-wrap justify-between">
                {conditionOptions.map((option) => {
                  const isSelected = condition === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => patchForm({ condition: option })}
                      className="mb-2 w-[48%] items-center rounded-xl border py-3"
                      style={{
                        borderColor: isSelected ? theme.primary : theme.border,
                        backgroundColor: isSelected ? theme.surfaceMuted : theme.background,
                      }}>
                      <Text
                        className="px-1 text-center text-xs font-bold uppercase tracking-[0.7px]"
                        style={{ color: isSelected ? theme.primary : theme.textMuted }}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="mt-4 text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
                The story
              </Text>
              <TextInput
                value={story}
                onChangeText={(t) => patchForm({ story: t })}
                placeholder="Condition, fit, standout details..."
                placeholderTextColor={theme.textMuted}
                multiline
                className="mt-2 min-h-24 rounded-xl border px-3 py-3"
                style={{
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <View
              className="rounded-3xl p-4"
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}>
              <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
                Clothing for
              </Text>
              <View className="mt-2 flex-row flex-wrap justify-between">
                {(isLoadingOptions ? [] : audiences).map((option) => {
                  const isSelected = audience === option.code;
                  return (
                    <Pressable
                      key={option.id}
                    onPress={() => {
                      patchForm({ audience: option.code, category: '' });
                    }}
                      className="mb-2 w-[48%] items-center rounded-xl border py-4"
                      style={{
                        borderColor: isSelected ? theme.primary : theme.border,
                        backgroundColor: isSelected ? theme.surfaceMuted : theme.background,
                      }}>
                      <Text
                        className="text-sm font-bold uppercase tracking-[1px]"
                        style={{ color: isSelected ? theme.primary : theme.textMuted }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {!isLoadingOptions && audiences.length === 0 ? (
                <Text className="mt-2 text-xs" style={{ color: theme.textMuted }}>
                  No audience options available.
                </Text>
              ) : null}
              {audience ? (
                <Text className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                  Selected: <Text style={{ color: theme.primary }}>{audienceLabelByCode.get(audience) ?? audience}</Text>
                </Text>
              ) : null}

              <Text className="mt-10 text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
                Category
              </Text>
              <Pressable
                className="mt-2 flex-row items-center justify-between rounded-xl border px-3 py-3"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
                onPress={() => openPicker('category')}>
                <Text style={{ color: category ? theme.text : theme.textMuted }}>{category || 'Select category'}</Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.textMuted} />
              </Pressable>
              {category ? (
                <Text className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                  Selected: <Text style={{ color: theme.primary }}>{category}</Text>
                </Text>
              ) : null}
              {!category ? (
                <Text className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                  Choose a category to unlock size and brand.
                </Text>
              ) : null}

              <Text className="mt-10 text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
                Size
              </Text>
              <Pressable
                className="mt-2 flex-row items-center justify-between rounded-xl border px-3 py-3"
                style={{
                  borderColor: theme.border,
                  backgroundColor: category ? theme.background : theme.surfaceMuted,
                  opacity: category ? 1 : 0.6,
                }}
                onPress={() => {
                  if (!category) return;
                  openPicker('size');
                }}
                disabled={!category}>
                <Text style={{ color: category ? (size ? theme.text : theme.textMuted) : theme.textMuted }}>
                  {category ? size || 'Select size' : 'Select category first'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.textMuted} />
              </Pressable>
              {size ? (
                <Text className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                  Selected: <Text style={{ color: theme.primary }}>{size}</Text>
                </Text>
              ) : null}

              <Text className="mt-10 text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
                Brand
              </Text>
              <Pressable
                className="mt-2 flex-row items-center justify-between rounded-xl border px-3 py-3"
                style={{
                  borderColor: theme.border,
                  backgroundColor: category ? theme.background : theme.surfaceMuted,
                  opacity: category ? 1 : 0.6,
                }}
                onPress={() => {
                  if (!category) return;
                  openPicker('brand');
                }}
                disabled={!category}>
                <Text style={{ color: category ? (brand ? theme.text : theme.textMuted) : theme.textMuted }}>
                  {category ? brand || 'Select brand' : 'Select category first'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.textMuted} />
              </Pressable>
              {brand ? (
                <Text className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                  Selected: <Text style={{ color: theme.primary }}>{brand}</Text>
                </Text>
              ) : null}
            </View>

            <View
              className="rounded-3xl p-4"
              style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}>
              <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.primary }}>
                Pricing
              </Text>
              <View
                className="mt-3 flex-row items-center rounded-2xl border px-3 py-2"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                <Text className="mr-2 text-3xl italic" style={{ color: theme.text }}>
                  €
                </Text>
                <TextInput
                  value={price}
                  onChangeText={handlePriceChange}
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  underlineColorAndroid="transparent"
                  className="flex-1 py-3 text-3xl italic outline-none"
                  style={{
                    color: theme.text,
                    minWidth: 0,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                    paddingVertical: 0,
                  }}
                />
              </View>
              <View className="mt-3 flex-row items-center">
                <MaterialIcons name="info-outline" size={16} color={theme.textMuted} />
                <Text className="ml-1.5 text-xs" style={{ color: theme.textMuted }}>
                  Estimated earnings after 10% fee: <Text style={{ color: theme.primary }}>{estimatedEarnings}</Text>
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.surface,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: footerBottomPad,
        }}>
        <Pressable
          className="items-center rounded-full py-4"
          style={{
            backgroundColor: theme.primary,
            opacity: isSubmitting ? 0.7 : 1,
          }}
          onPress={handlePublishListing}
          disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : null}
          <Text className="text-[12px] font-bold uppercase tracking-[1.8px]" style={{ color: theme.textOnPrimary }}>
            {isSubmitting ? 'Publishing...' : 'Publish listing'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={activePicker !== null} transparent animationType="fade" onRequestClose={closePicker}>
        <View className="flex-1 items-center justify-center px-5">
          <Pressable className="absolute inset-0 bg-black/55" onPress={closePicker} />
          <View
            className="w-full max-w-[460px] rounded-3xl border p-4"
            style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                {pickerTitle}
              </Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-full"
                onPress={closePicker}
                style={{ backgroundColor: theme.surfaceMuted }}>
                <MaterialIcons name="close" size={18} color={theme.text} />
              </Pressable>
            </View>

            <View className="rounded-xl border px-3 py-2" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder="Search options..."
                placeholderTextColor={theme.textMuted}
                autoFocus
                style={{ color: theme.text }}
              />
            </View>

            <ScrollView className="mt-3 max-h-80 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
              {isLoadingOptions ? (
                <Text className="px-3 py-3 text-xs" style={{ color: theme.textMuted }}>
                  Loading options...
                </Text>
              ) : pickerOptions.length ? (
                pickerOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => handlePickOption(option)}
                    className="border-b px-3 py-3"
                    style={{ borderBottomColor: theme.border }}>
                    <Text className="text-sm" style={{ color: theme.text }}>
                      {option}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text className="px-3 py-3 text-xs" style={{ color: theme.textMuted }}>
                  No options found.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
