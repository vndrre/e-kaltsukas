import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';

type Conversation = {
  id: string;
  item_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at?: string | null;
  created_at: string;
  counterpart?: {
    id: string;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  item?: {
    id: string;
    title?: string | null;
    image?: string | null;
    images_json?: string[] | string | null;
  } | null;
};

const parseImages = (value: string[] | string | null | undefined): string[] => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  return [];
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function InboxScreen() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const loadConversations = async () => {
      if (!token) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get('/chat/conversations', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const baseConversations = (response.data?.conversations ?? []) as Conversation[];

        const missingItemIds = [
          ...new Set(
            baseConversations
              .filter((entry) => !entry.item?.title && !entry.item?.image)
              .map((entry) => entry.item_id)
              .filter((id): id is string => Boolean(id) && UUID_REGEX.test(id))
          ),
        ];

        if (!missingItemIds.length) {
          setConversations(baseConversations);
          return;
        }

        const itemResponses = await Promise.allSettled(
          missingItemIds.map((itemId) =>
            api.get(`/items/${itemId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
          )
        );

        const itemsById = new Map<string, { title: string | null; image: string | null }>();
        itemResponses.forEach((result, index) => {
          if (result.status !== 'fulfilled') {
            return;
          }

          const item = result.value.data?.item;
          if (!item) {
            return;
          }

          const itemId = missingItemIds[index];
          const image = (Array.isArray(item.images) ? item.images[0] : null) ?? null;
          itemsById.set(itemId, {
            title: item.title ?? null,
            image,
          });
        });

        const mergedConversations = baseConversations.map((entry) => {
          const fallbackItem = itemsById.get(entry.item_id);
          if (!fallbackItem) {
            return entry;
          }

          return {
            ...entry,
            item: {
              id: entry.item?.id ?? entry.item_id,
              title: entry.item?.title ?? fallbackItem.title,
              image: entry.item?.image ?? fallbackItem.image,
              images_json: entry.item?.images_json ?? null,
            },
          };
        });

        setConversations(mergedConversations);
      } catch (error) {
        console.error('Failed to load conversations', error);
        setConversations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [token]);

  const orderedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const aTime = new Date(a.last_message_at ?? a.created_at).getTime();
        const bTime = new Date(b.last_message_at ?? b.created_at).getTime();
        return bTime - aTime;
      }),
    [conversations]
  );

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="border-b px-4 pb-4 pt-12" style={{ borderBottomColor: theme.border }}>
        <Text className="text-3xl italic" style={{ color: theme.text }}>
          Inbox
        </Text>
        <Text className="mt-1 text-sm" style={{ color: theme.textMuted }}>
          Your active buyer/seller conversations.
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 120 }}>
          {orderedConversations.map((conversation) => {
            const isBuyer = conversation.buyer_id === user?.id;
            const counterpartId = isBuyer ? conversation.seller_id : conversation.buyer_id;
            const parsedImages = parseImages(conversation.item?.images_json);
            const itemImage = conversation.item?.image || parsedImages[0] || null;
            const itemTitle = conversation.item?.title?.trim() || 'Item listing';

            return (
              <Pressable
                key={conversation.id}
                className="mb-3 flex-row rounded-2xl border p-3"
                style={{ borderColor: theme.border, backgroundColor: theme.surface }}
                onPress={() =>
                  router.push({
                    pathname: '/chat/[id]',
                    params: {
                      id: conversation.id,
                      title: conversation.counterpart?.username || conversation.item?.title || 'Item chat',
                    },
                  })
                }>
                <View className="h-16 w-16 overflow-hidden rounded-xl" style={{ backgroundColor: theme.surfaceMuted }}>
                  {itemImage ? (
                    <Image source={{ uri: itemImage }} contentFit="cover" className="h-full w-full" />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <MaterialIcons name="image" size={18} color={theme.textMuted} />
                    </View>
                  )}
                </View>

                <View className="ml-3 flex-1 justify-center">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold" numberOfLines={1} style={{ color: theme.text }}>
                      {itemTitle}
                    </Text>
                    <MaterialIcons name="chevron-right" size={18} color={theme.textMuted} />
                  </View>
                  <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: theme.textMuted }}>
                    {isBuyer ? 'Seller' : 'Buyer'}:{' '}
                    {conversation.counterpart?.username || counterpartId.slice(0, 8)}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {!orderedConversations.length ? (
            <View className="mt-4 rounded-2xl border px-4 py-8" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <Text className="text-center text-sm" style={{ color: theme.textMuted }}>
                No conversations yet. Open any listing and tap Message seller.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
