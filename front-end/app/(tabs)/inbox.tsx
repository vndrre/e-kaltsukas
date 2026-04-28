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
  } | null;
};

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
        setConversations((response.data?.conversations ?? []) as Conversation[]);
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
                  {conversation.item?.image ? (
                    <Image source={{ uri: conversation.item.image }} contentFit="cover" className="h-full w-full" />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <MaterialIcons name="image" size={18} color={theme.textMuted} />
                    </View>
                  )}
                </View>

                <View className="ml-3 flex-1 justify-center">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold" numberOfLines={1} style={{ color: theme.text }}>
                      {conversation.item?.title || `Item: ${conversation.item_id.slice(0, 8)}`}
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
