import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { useAppTheme } from '@/hooks/use-app-theme';

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

type SearchItem = {
  id: string;
  title: string;
  price?: number;
  category?: string | null;
  images?: string[];
  description?: string | null;
  brand?: string | null;
  size?: string | null;
};

type PickerType = 'category' | 'brand' | 'size';

type SubmittedFilters = {
  categories: string[];
  sizes: string[];
  brand: string;
};

function getAudienceAllowedSizeGroups(audience: string) {
  if (audience === 'women') {
    return ['general', 'women_eu', 'jeans', 'shoes_eu'];
  }

  if (audience === 'men') {
    return ['general', 'men_eu', 'jeans', 'shoes_eu'];
  }

  if (audience === 'kids') {
    return ['kids_eu', 'general', 'shoes_eu'];
  }

  if (audience === 'unisex') {
    return ['general', 'shoes_eu'];
  }

  return [];
}

function getSizeGroupsForCategory(audience: string, category: string, allowedGroups: string[]) {
  const normalized = category.trim().toLowerCase();
  const allow = (groups: string[]) => groups.filter((group) => allowedGroups.includes(group));

  if (normalized === 'shoes') {
    return allow(['shoes_eu']);
  }

  if (normalized === 'jeans') {
    return allow(['jeans']);
  }

  if (audience === 'kids') {
    return allow(['kids_eu', 'general']);
  }

  return allow(['general']);
}

function formatSelectionSummary(values: string[], emptyLabel: string) {
  if (!values.length) {
    return emptyLabel;
  }

  if (values.length === 1) {
    return values[0];
  }

  return `${values.length} selected`;
}

export default function ExploreScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [audience, setAudience] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [brand, setBrand] = useState('');
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([]);
  const [activePicker, setActivePicker] = useState<PickerType | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [hasAppliedAttributes, setHasAppliedAttributes] = useState(false);
  const [submittedFilters, setSubmittedFilters] = useState<SubmittedFilters>({
    categories: [],
    sizes: [],
    brand: '',
  });

  const keywordQuery = useMemo(() => keywords.join(' ').trim(), [keywords]);

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
        setSizeOptions(fetchedSizes);
      } catch (error) {
        console.error('Failed to load explore options:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  const audienceCategories = useMemo(
    () => categories.filter((entry) => entry.audienceCode === audience).map((entry) => entry.name),
    [audience, categories]
  );

  const activeSizeGroups = useMemo(() => {
    if (!audience || !selectedCategories.length) {
      return [];
    }

    const allowedGroups = getAudienceAllowedSizeGroups(audience);
    const groups = new Set<string>();

    selectedCategories.forEach((category) => {
      getSizeGroupsForCategory(audience, category, allowedGroups).forEach((group) => groups.add(group));
    });

    return Array.from(groups);
  }, [audience, selectedCategories]);

  const availableSizes = useMemo(() => {
    const seen = new Set<string>();
    return sizeOptions
      .filter((entry) => entry.groupCode && activeSizeGroups.includes(entry.groupCode))
      .filter((entry) => {
        if (seen.has(entry.value)) {
          return false;
        }
        seen.add(entry.value);
        return true;
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((entry) => entry.value);
  }, [activeSizeGroups, sizeOptions]);

  useEffect(() => {
    setSelectedCategories((prev) => prev.filter((entry) => audienceCategories.includes(entry)));
  }, [audienceCategories]);

  useEffect(() => {
    setSelectedSizes((prev) => prev.filter((entry) => availableSizes.includes(entry)));
  }, [availableSizes]);

  const isReadyToExplore = Boolean(audience && selectedCategories.length);

  const isMultiSelectPicker = activePicker === 'category' || activePicker === 'size';

  const pickerTitle = useMemo(() => {
    if (activePicker === 'category') return 'Select Categories';
    if (activePicker === 'size') return 'Select Sizes';
    if (activePicker === 'brand') return 'Select Brand';
    return '';
  }, [activePicker]);

  const pickerOptions = useMemo(() => {
    const queryLower = pickerSearch.trim().toLowerCase();

    if (activePicker === 'category') {
      return audienceCategories.filter((entry) => entry.toLowerCase().includes(queryLower));
    }

    if (activePicker === 'size') {
      return availableSizes.filter((entry) => entry.toLowerCase().includes(queryLower));
    }

    if (activePicker === 'brand') {
      return brands.map((entry) => entry.name).filter((entry) => entry.toLowerCase().includes(queryLower));
    }

    return [];
  }, [activePicker, audienceCategories, availableSizes, brands, pickerSearch]);

  const selectedPickerValues = useMemo(() => {
    if (activePicker === 'category') {
      return selectedCategories;
    }

    if (activePicker === 'size') {
      return selectedSizes;
    }

    return [];
  }, [activePicker, selectedCategories, selectedSizes]);

  useEffect(() => {
    if (!hasAppliedAttributes || !submittedFilters.categories.length) {
      setItems([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setIsLoadingItems(true);
        const response = await api.get('/items', {
          params: {
            q: keywordQuery || undefined,
            category: submittedFilters.categories.join(','),
            size: submittedFilters.sizes.length ? submittedFilters.sizes.join(',') : undefined,
            brand: submittedFilters.brand || undefined,
          },
        });
        setItems(response.data?.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setIsLoadingItems(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [hasAppliedAttributes, keywordQuery, submittedFilters]);

  const openPicker = (picker: PickerType) => {
    setActivePicker(picker);
    setPickerSearch('');
  };

  const closePicker = () => {
    setActivePicker(null);
    setPickerSearch('');
  };

  const markFiltersDirty = () => {
    setHasAppliedAttributes(false);
  };

  const handlePickOption = (value: string) => {
    if (activePicker === 'category') {
      setSelectedCategories((prev) =>
        prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value]
      );
      markFiltersDirty();
      return;
    }

    if (activePicker === 'size') {
      setSelectedSizes((prev) =>
        prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value]
      );
      markFiltersDirty();
      return;
    }

    if (activePicker === 'brand') {
      setBrand(value);
      markFiltersDirty();
      closePicker();
    }
  };

  const handleApplyAttributes = () => {
    if (!isReadyToExplore) {
      return;
    }

    setHasAppliedAttributes(true);
    setSubmittedFilters({
      categories: selectedCategories,
      sizes: selectedSizes,
      brand,
    });
  };

  const handleAddKeyword = () => {
    const nextKeyword = keywordInput.trim().toLowerCase();
    if (!nextKeyword || keywords.includes(nextKeyword)) {
      return;
    }

    setKeywords((prev) => [...prev, nextKeyword]);
    setKeywordInput('');
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setKeywords((prev) => prev.filter((entry) => entry !== keywordToRemove));
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View className="px-5 pb-3 pt-14">
          <Text className="text-3xl italic" style={{ color: theme.text }}>
            Explore
          </Text>

          <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
            Set your style attributes first to unlock a personalized feed.
          </Text>
        </View>

        <View
          className="mx-5 rounded-3xl border p-4"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.surface,
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
                    setAudience(option.code);
                    setSelectedCategories([]);
                    setSelectedSizes([]);
                    setBrand('');
                    setKeywords([]);
                    setKeywordInput('');
                    setHasAppliedAttributes(false);
                    setItems([]);
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

          <Text className="mt-8 text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
            Category
          </Text>
          <Pressable
            className="mt-2 flex-row items-center justify-between rounded-xl border px-3 py-3"
            style={{
              borderColor: theme.border,
              backgroundColor: audience ? theme.background : theme.surfaceMuted,
              opacity: audience ? 1 : 0.6,
            }}
            onPress={() => {
              if (!audience) return;
              openPicker('category');
            }}
            disabled={!audience}>
            <Text style={{ color: audience ? (selectedCategories.length ? theme.text : theme.textMuted) : theme.textMuted }}>
              {audience
                ? formatSelectionSummary(selectedCategories, 'Select categories')
                : 'Select clothing for first'}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.textMuted} />
          </Pressable>
          {selectedCategories.length ? (
            <View className="mt-3 flex-row flex-wrap">
              {selectedCategories.map((entry) => (
                <Pressable
                  key={entry}
                  className="mb-2 mr-2 flex-row items-center rounded-full px-3 py-1.5"
                  style={{ backgroundColor: theme.surfaceMuted }}
                  onPress={() => {
                    setSelectedCategories((prev) => prev.filter((value) => value !== entry));
                    markFiltersDirty();
                  }}>
                  <Text className="text-xs font-semibold" style={{ color: theme.text }}>
                    {entry}
                  </Text>
                  <MaterialIcons name="close" size={14} color={theme.textMuted} style={{ marginLeft: 6 }} />
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text className="mt-8 text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
            Size (optional)
          </Text>
          <Pressable
            className="mt-2 flex-row items-center justify-between rounded-xl border px-3 py-3"
            style={{
              borderColor: theme.border,
              backgroundColor: isReadyToExplore ? theme.background : theme.surfaceMuted,
              opacity: isReadyToExplore ? 1 : 0.6,
            }}
            onPress={() => {
              if (!isReadyToExplore) return;
              openPicker('size');
            }}
            disabled={!isReadyToExplore}>
            <Text style={{ color: isReadyToExplore ? (selectedSizes.length ? theme.text : theme.textMuted) : theme.textMuted }}>
              {isReadyToExplore ? formatSelectionSummary(selectedSizes, 'Select sizes') : 'Complete required attributes first'}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.textMuted} />
          </Pressable>
          {selectedSizes.length ? (
            <View className="mt-3 flex-row flex-wrap">
              {selectedSizes.map((entry) => (
                <Pressable
                  key={entry}
                  className="mb-2 mr-2 flex-row items-center rounded-full px-3 py-1.5"
                  style={{ backgroundColor: theme.surfaceMuted }}
                  onPress={() => {
                    setSelectedSizes((prev) => prev.filter((value) => value !== entry));
                    markFiltersDirty();
                  }}>
                  <Text className="text-xs font-semibold" style={{ color: theme.text }}>
                    {entry}
                  </Text>
                  <MaterialIcons name="close" size={14} color={theme.textMuted} style={{ marginLeft: 6 }} />
                </Pressable>
              ))}
              <Pressable
                className="mb-2 rounded-full px-3 py-1.5"
                style={{ backgroundColor: theme.background }}
                onPress={() => {
                  setSelectedSizes([]);
                  markFiltersDirty();
                }}>
                <Text className="text-xs font-semibold" style={{ color: theme.textMuted }}>
                  Clear sizes
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Text className="mt-8 text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: theme.textMuted }}>
            Brand (optional)
          </Text>
          <Pressable
            className="mt-2 flex-row items-center justify-between rounded-xl border px-3 py-3"
            style={{
              borderColor: theme.border,
              backgroundColor: isReadyToExplore ? theme.background : theme.surfaceMuted,
              opacity: isReadyToExplore ? 1 : 0.6,
            }}
            onPress={() => {
              if (!isReadyToExplore) return;
              openPicker('brand');
            }}
            disabled={!isReadyToExplore}>
            <Text style={{ color: isReadyToExplore ? (brand ? theme.text : theme.textMuted) : theme.textMuted }}>
              {isReadyToExplore ? brand || 'Select brand' : 'Complete required attributes first'}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.textMuted} />
          </Pressable>

          {brand ? (
            <Pressable
              className="mt-3 self-start rounded-full px-3 py-1"
              style={{ backgroundColor: theme.surfaceMuted }}
              onPress={() => {
                setBrand('');
                markFiltersDirty();
              }}>
              <Text className="text-[11px] font-semibold" style={{ color: theme.textMuted }}>
                Clear brand filter
              </Text>
            </Pressable>
          ) : null}

          {hasAppliedAttributes ? (
            <View className="mt-5">
              <View className="flex-row items-center rounded-2xl px-4" style={{ backgroundColor: theme.background }}>
                <MaterialIcons name="label-outline" size={20} color={theme.textMuted} />
                <TextInput
                  value={keywordInput}
                  onChangeText={setKeywordInput}
                  placeholder="Add a keyword (e.g. vintage, denim)"
                  placeholderTextColor={theme.textMuted}
                  className="ml-2 flex-1 py-4"
                  style={{ color: theme.text }}
                  onSubmitEditing={handleAddKeyword}
                />
                <Pressable
                  className="rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: keywordInput.trim() ? theme.primary : theme.surfaceMuted,
                  }}
                  onPress={handleAddKeyword}
                  disabled={!keywordInput.trim()}>
                  <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: keywordInput.trim() ? theme.textOnPrimary : theme.textMuted }}>
                    Add
                  </Text>
                </Pressable>
              </View>
              {keywords.length ? (
                <View className="mt-3 flex-row flex-wrap">
                  {keywords.map((keyword) => (
                    <Pressable
                      key={keyword}
                      className="mb-2 mr-2 flex-row items-center rounded-full px-3 py-1.5"
                      style={{ backgroundColor: theme.surfaceMuted }}
                      onPress={() => handleRemoveKeyword(keyword)}>
                      <Text className="text-xs font-semibold" style={{ color: theme.text }}>
                        {keyword}
                      </Text>
                      <MaterialIcons name="close" size={14} color={theme.textMuted} style={{ marginLeft: 6 }} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text className="mt-2 text-xs" style={{ color: theme.textMuted }}>
                  Add keywords and we will use them to refine your feed. Leave empty to browse all for your attributes.
                </Text>
              )}
            </View>
          ) : null}

          <Pressable
            className="mt-5 items-center rounded-xl py-3"
            style={{
              backgroundColor: isReadyToExplore ? theme.primary : theme.surfaceMuted,
              opacity: isReadyToExplore ? 1 : 0.7,
            }}
            onPress={handleApplyAttributes}
            disabled={!isReadyToExplore}>
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: isReadyToExplore ? theme.textOnPrimary : theme.textMuted }}>
              Apply attributes
            </Text>
          </Pressable>
        </View>

        {hasAppliedAttributes ? (
          <>
            {isLoadingItems ? (
              <View className="px-5 pt-10">
                <View className="items-center rounded-2xl border px-5 py-10" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                  <ActivityIndicator color={theme.primary} />
                  <Text className="mt-3 text-sm" style={{ color: theme.textMuted }}>
                    Loading items for your preferences...
                  </Text>
                </View>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between px-5 pt-5">
                {items.map((item) => (
                  <Pressable
                    key={item.id}
                    className="mb-8 w-[48%]"
                    onPress={() =>
                      router.push({
                        pathname: '/product/[id]',
                        params: {
                          id: item.id,
                          title: item.title,
                          category: item.category ?? 'Lux Market',
                          price: typeof item.price === 'number' ? `€${item.price.toFixed(2)}` : '€0.00',
                          image: item.images?.[0],
                          description: item.description ?? '',
                        },
                      })
                    }>
                    <View className="aspect-[3/4] overflow-hidden rounded-2xl" style={{ backgroundColor: theme.surface }}>
                      {item.images?.[0] ? (
                        <Image source={{ uri: item.images[0] }} contentFit="cover" className="h-full w-full" />
                      ) : (
                        <View className="h-full w-full items-center justify-center">
                          <MaterialIcons name="image" size={24} color={theme.textMuted} />
                        </View>
                      )}
                    </View>
                    <Text className="mt-3 text-[9px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textMuted }}>
                      {item.category ?? 'Item'}
                    </Text>
                    <View className="mt-1 flex-row items-center justify-between">
                      <Text className="text-sm" style={{ color: theme.text }}>
                        {item.title}
                      </Text>
                      <Text className="text-sm font-bold" style={{ color: theme.text }}>
                        {typeof item.price === 'number' ? `€${item.price.toFixed(2)}` : '€0.00'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {!isLoadingItems && !items.length ? (
              <View className="px-5 pt-2">
                <View className="items-center rounded-2xl border px-5 py-10" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                  <Text className="text-xl italic" style={{ color: theme.text }}>
                    Nothing yet
                  </Text>
                  <Text className="mt-2 text-center text-sm" style={{ color: theme.textMuted }}>
                    Try removing brand or size filters, or choosing different categories.
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <View className="px-5 pt-6">
            <View className="rounded-2xl border px-5 py-10" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <Text className="text-2xl italic" style={{ color: theme.text }}>
                Personalize your Explore
              </Text>
              <Text className="mt-3 text-sm leading-6" style={{ color: theme.textMuted }}>
                Pick clothing for and at least one category above, then tap Apply attributes. Add optional size and brand filters to narrow the feed.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={activePicker !== null} transparent animationType="fade" onRequestClose={closePicker}>
        <View className="flex-1 items-center justify-center px-5">
          <Pressable className="absolute inset-0 bg-black/55" onPress={closePicker} />
          <View className="w-full max-w-[460px] rounded-3xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                {pickerTitle}
              </Text>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full" onPress={closePicker} style={{ backgroundColor: theme.surfaceMuted }}>
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
                pickerOptions.map((option) => {
                  const isSelected = isMultiSelectPicker ? selectedPickerValues.includes(option) : false;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => handlePickOption(option)}
                      className="flex-row items-center justify-between border-b px-3 py-3"
                      style={{ borderBottomColor: theme.border, backgroundColor: isSelected ? theme.surfaceMuted : 'transparent' }}>
                      <Text className="text-sm" style={{ color: theme.text }}>
                        {option}
                      </Text>
                      {isMultiSelectPicker ? (
                        <MaterialIcons
                          name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                          size={18}
                          color={isSelected ? theme.primary : theme.textMuted}
                        />
                      ) : null}
                    </Pressable>
                  );
                })
              ) : (
                <Text className="px-3 py-3 text-xs" style={{ color: theme.textMuted }}>
                  No options found.
                </Text>
              )}
            </ScrollView>

            {isMultiSelectPicker ? (
              <Pressable className="mt-4 items-center rounded-xl py-3" style={{ backgroundColor: theme.primary }} onPress={closePicker}>
                <Text className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: theme.textOnPrimary }}>
                  Done
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
