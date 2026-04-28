import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/hooks/auth-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import { api } from '@/lib/api';
import { getChatSocket } from '@/lib/chat-socket';

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type ConversationDetails = {
  id: string;
  item?: {
    id: string;
    title?: string | null;
  } | null;
  itemPrice?: number | null;
  counterpart?: {
    id: string;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

type CounterpartProfile = {
  id: string;
  isFollowing: boolean;
};

type OfferPayload = {
  kind: 'offer';
  amount: number;
  currency?: string;
  status: 'pending' | 'accepted' | 'declined' | 'countered';
  createdBy: string;
  updatedAt?: string;
  respondedBy?: string;
};

const OFFER_PREFIX = '__OFFER__';

function parseOffer(body: string): OfferPayload | null {
  if (!body?.startsWith(OFFER_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(body.slice(OFFER_PREFIX.length)) as OfferPayload;
    return parsed?.kind === 'offer' ? parsed : null;
  } catch {
    return null;
  }
}

export default function ChatThreadScreen() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; title?: string; openOffer?: string; initialOffer?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [counterpartProfile, setCounterpartProfile] = useState<CounterpartProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [offerInput, setOfferInput] = useState('');
  const [offerMode, setOfferMode] = useState<'new' | 'counter' | 'update' | null>(null);
  const [activeOfferMessageId, setActiveOfferMessageId] = useState<string | null>(null);
  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);
  const hasAutoOpenedOffer = useRef(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const conversationId = params.id;
  const threadTitle = params.title ?? 'Conversation';

  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId || !token) {
        return;
      }

      try {
        const response = await api.get(`/chat/conversations/${conversationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setConversation((response.data?.conversation ?? null) as ConversationDetails | null);
      } catch {
        setConversation(null);
      }
    };

    loadConversation();
  }, [conversationId, token]);

  useEffect(() => {
    const loadCounterpartProfile = async () => {
      if (!token || !conversation?.counterpart?.id) {
        setCounterpartProfile(null);
        return;
      }

      try {
        const response = await api.get(`/users/${conversation.counterpart.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCounterpartProfile({
          id: conversation.counterpart.id,
          isFollowing: Boolean(response.data?.isFollowing),
        });
      } catch {
        setCounterpartProfile(null);
      }
    };

    loadCounterpartProfile();
  }, [conversation?.counterpart?.id, token]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!conversationId || !token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get(`/chat/conversations/${conversationId}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setMessages((response.data?.messages ?? []) as ChatMessage[]);
      } catch (error: any) {
        const message = error?.response?.data?.message || 'Failed to load messages.';
        Alert.alert('Error', message);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversationId, token]);

  useEffect(() => {
    if (!conversationId || !token) {
      return;
    }

    const socket = getChatSocket(token);

    socket.emit('chat:join', { conversationId });

    const handleIncomingMessage = (message: ChatMessage) => {
      if (message.conversation_id !== conversationId) {
        return;
      }
      setMessages((prev) => {
        if (prev.some((entry) => entry.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    socket.on('chat:message', handleIncomingMessage);

    return () => {
      socket.off('chat:message', handleIncomingMessage);
      socket.emit('chat:leave', { conversationId });
    };
  }, [conversationId, token]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!conversationId || !token || isSending) {
      return;
    }

    const body = draft.trim();
    if (!body) {
      return;
    }

    setIsSending(true);

    try {
      const response = await api.post(
        `/chat/conversations/${conversationId}/messages`,
        { body },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const message = response.data?.message as ChatMessage | undefined;
      setDraft('');
      if (message) {
        setMessages((prev) => {
          if (prev.some((entry) => entry.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to send message.';
      Alert.alert('Error', message);
    } finally {
      setIsSending(false);
    }
  };

  const openOfferModal = (mode: 'new' | 'counter' | 'update', messageId?: string, amount?: number) => {
    setOfferMode(mode);
    setActiveOfferMessageId(messageId ?? null);
    setOfferInput(typeof amount === 'number' && !Number.isNaN(amount) ? String(amount) : '');
    setIsOfferModalVisible(true);
  };

  const closeOfferModal = () => {
    setIsOfferModalVisible(false);
    setOfferMode(null);
    setOfferInput('');
    setActiveOfferMessageId(null);
  };

  useEffect(() => {
    if (hasAutoOpenedOffer.current) {
      return;
    }

    if (params.openOffer !== '1') {
      return;
    }

    hasAutoOpenedOffer.current = true;
    const initialAmount = Number(params.initialOffer);
    openOfferModal('new', undefined, Number.isNaN(initialAmount) ? undefined : initialAmount);
  }, [params.initialOffer, params.openOffer]);

  const groupedMessages = useMemo(() => messages, [messages]);

  const submitOffer = async () => {
    if (!conversationId || !token) {
      return;
    }

    const amount = Number(offerInput);
    if (Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    try {
      let response;
      if (offerMode === 'new') {
        response = await api.post(
          `/chat/conversations/${conversationId}/offers`,
          { amount, currency: 'EUR' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if ((offerMode === 'counter' || offerMode === 'update') && activeOfferMessageId) {
        response = await api.patch(
          `/chat/conversations/${conversationId}/offers/${activeOfferMessageId}`,
          { action: offerMode, amount },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        return;
      }

      const message = response.data?.message as ChatMessage | undefined;
      if (message) {
        setMessages((prev) => {
          const existingIndex = prev.findIndex((entry) => entry.id === message.id);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = message;
            return next;
          }
          return [...prev, message];
        });
      }

      setOfferInput('');
      closeOfferModal();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not submit offer.');
    }
  };

  const actOnOffer = async (messageId: string, action: 'accept' | 'decline') => {
    if (!conversationId || !token) {
      return;
    }

    try {
      const response = await api.patch(
        `/chat/conversations/${conversationId}/offers/${messageId}`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = response.data?.message as ChatMessage | undefined;
      if (updated) {
        setMessages((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not update offer.');
    }
  };

  const counterpartName =
    conversation?.counterpart?.username?.trim() || threadTitle;
  const counterpartAvatar = conversation?.counterpart?.avatar_url?.trim() || '';
  const canFollowCounterpart = Boolean(conversation?.counterpart?.id && conversation?.counterpart?.id !== user?.id);

  const toggleFollowCounterpart = async () => {
    if (!token || !conversation?.counterpart?.id || !canFollowCounterpart) {
      return;
    }

    const previous = Boolean(counterpartProfile?.isFollowing);
    setCounterpartProfile((prev) => ({
      id: conversation.counterpart?.id || prev?.id || '',
      isFollowing: !previous,
    }));

    try {
      if (previous) {
        await api.delete(`/users/${conversation.counterpart.id}/follow`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post(
          `/users/${conversation.counterpart.id}/follow`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch {
      setCounterpartProfile((prev) => ({
        id: conversation.counterpart?.id || prev?.id || '',
        isFollowing: previous,
      }));
    }
  };
  const referencePrice = Number(conversation?.itemPrice);
  const hasReferencePrice = Number.isFinite(referencePrice) && referencePrice > 0;
  const suggestedOffers = hasReferencePrice
    ? [
        Number((referencePrice * 0.8).toFixed(2)),
        Number((referencePrice * 0.9).toFixed(2)),
        Number(referencePrice.toFixed(2)),
      ]
    : [];

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="flex-row items-center border-b px-4 pb-3 pt-12" style={{ borderBottomColor: theme.border, backgroundColor: theme.background }}>
        <Pressable className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <View className="ml-3 flex-1 flex-row items-center">
          {counterpartAvatar ? (
            <Image source={{ uri: counterpartAvatar }} contentFit="cover" className="h-9 w-9 rounded-full" />
          ) : (
            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.surfaceMuted }}>
              <MaterialIcons name="person" size={18} color={theme.textMuted} />
            </View>
          )}
          <Text className="ml-2 text-lg font-semibold" numberOfLines={1} style={{ color: theme.text }}>
            {counterpartName}
          </Text>
        </View>
        {canFollowCounterpart ? (
          <Pressable
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: counterpartProfile?.isFollowing ? theme.surfaceMuted : theme.primary }}
            onPress={toggleFollowCounterpart}>
            <Text className="text-[10px] font-bold uppercase" style={{ color: counterpartProfile?.isFollowing ? theme.text : theme.textOnPrimary }}>
              {counterpartProfile?.isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView ref={scrollRef} className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 20 }}>
          {groupedMessages.map((message) => {
            const isMine = message.sender_id === user?.id;
            const offer = parseOffer(message.body);
            const isOfferSender = offer?.createdBy === user?.id;
            return (
              <View key={message.id} className={`mb-2 ${isMine ? 'items-end' : 'items-start'}`}>
                <View
                  className="max-w-[82%] rounded-2xl px-3 py-2"
                  style={{
                    backgroundColor: isMine ? theme.primary : theme.surface,
                    borderColor: theme.border,
                    borderWidth: isMine ? 0 : 1,
                  }}>
                  {offer ? (
                    <View>
                      <Text className="text-xs font-bold uppercase" style={{ color: isMine ? theme.textOnPrimary : theme.textMuted }}>
                        Offer
                      </Text>
                      <Text className="mt-1 text-lg font-bold" style={{ color: isMine ? theme.textOnPrimary : theme.text }}>
                        €{offer.amount.toFixed(2)}
                      </Text>
                      <Text className="mt-1 text-xs" style={{ color: isMine ? theme.textOnPrimary : theme.textMuted }}>
                        Status: {offer.status}
                      </Text>
                      {offer.status === 'pending' && !isOfferSender ? (
                        <View className="mt-2 flex-row gap-2">
                          <Pressable
                            className="rounded-full px-3 py-1"
                            style={{ backgroundColor: theme.primary }}
                            onPress={() => actOnOffer(message.id, 'accept')}>
                            <Text className="text-[10px] font-bold uppercase" style={{ color: theme.textOnPrimary }}>
                              Accept
                            </Text>
                          </Pressable>
                          <Pressable
                            className="rounded-full px-3 py-1"
                            style={{ backgroundColor: theme.surfaceMuted }}
                            onPress={() => actOnOffer(message.id, 'decline')}>
                            <Text className="text-[10px] font-bold uppercase" style={{ color: theme.text }}>
                              Decline
                            </Text>
                          </Pressable>
                          <Pressable
                            className="rounded-full px-3 py-1"
                            style={{ backgroundColor: theme.surfaceMuted }}
                            onPress={() => {
                              openOfferModal('counter', message.id, offer.amount);
                            }}>
                            <Text className="text-[10px] font-bold uppercase" style={{ color: theme.text }}>
                              Counter
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}
                      {offer.status === 'pending' && isOfferSender ? (
                        <Pressable
                          className="mt-2 self-start rounded-full px-3 py-1"
                          style={{ backgroundColor: theme.surfaceMuted }}
                          onPress={() => {
                            openOfferModal('update', message.id, offer.amount);
                          }}>
                          <Text className="text-[10px] font-bold uppercase" style={{ color: theme.text }}>
                            Update offer
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={{ color: isMine ? theme.textOnPrimary : theme.text }}>{message.body}</Text>
                  )}
                </View>
              </View>
            );
          })}

          {!groupedMessages.length ? (
            <View className="mt-10 items-center rounded-2xl border px-4 py-6" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
              <Text className="text-sm" style={{ color: theme.textMuted }}>
                No messages yet. Start the conversation.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <View className="border-t px-3 pb-6 pt-3" style={{ borderTopColor: theme.border, backgroundColor: theme.background }}>
        <View className="mb-2 flex-row gap-2">
          <Pressable
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: theme.surfaceMuted }}
            onPress={() => {
              openOfferModal('new');
            }}>
            <Text className="text-[14px] font-bold uppercase" style={{ color: theme.text }}>
              Make offer
            </Text>
          </Pressable>
        </View>

        <View className="flex-row items-end rounded-2xl border px-3 py-2" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor={theme.textMuted}
            className="max-h-28 flex-1 py-2"
            multiline
            style={{ color: theme.text }}
          />
          <Pressable
            className="ml-2 h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: draft.trim() ? theme.primary : theme.surfaceMuted }}
            onPress={sendMessage}
            disabled={!draft.trim() || isSending}>
            <MaterialIcons name="send" size={18} color={draft.trim() ? theme.textOnPrimary : theme.textMuted} />
          </Pressable>
        </View>
      </View>

      <Modal visible={isOfferModalVisible} transparent animationType="fade" onRequestClose={closeOfferModal}>
        <View className="flex-1 items-center justify-center px-5">
          <Pressable className="absolute inset-0 bg-black/55" onPress={closeOfferModal} />
          <View className="w-full max-w-[420px] rounded-3xl border p-4" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold" style={{ color: theme.text }}>
                {offerMode === 'counter' ? 'Counter offer' : offerMode === 'update' ? 'Update offer' : 'Make offer'}
              </Text>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full" onPress={closeOfferModal} style={{ backgroundColor: theme.surfaceMuted }}>
                <MaterialIcons name="close" size={18} color={theme.text} />
              </Pressable>
            </View>

            <Text className="text-xs" style={{ color: theme.textMuted }}>
              Enter your best price. The other side can accept, decline, or counter.
            </Text>

            {hasReferencePrice ? (
              <View className="mt-3">
                <Text className="text-xs" style={{ color: theme.textMuted }}>
                  Asking price: €{referencePrice.toFixed(2)}
                </Text>
                <View className="mt-2 flex-row gap-2">
                  {suggestedOffers.map((value, index) => (
                    <Pressable
                      key={`${value}-${index}`}
                      className="rounded-full px-3 py-1.5"
                      style={{ backgroundColor: theme.surfaceMuted }}
                      onPress={() => setOfferInput(value.toFixed(2))}>
                      <Text className="text-[10px] font-bold uppercase" style={{ color: theme.text }}>
                        €{value.toFixed(2)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View className="mt-4 flex-row items-center rounded-2xl border px-3 py-2" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
              <Text className="mr-2 text-lg font-semibold" style={{ color: theme.text }}>
                €
              </Text>
              <TextInput
                value={offerInput}
                onChangeText={setOfferInput}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                className="flex-1 py-2 text-base"
                style={{ color: theme.text }}
                autoFocus
              />
            </View>

            <View className="mt-4 flex-row gap-2">
              <Pressable className="flex-1 items-center rounded-xl border py-3" style={{ borderColor: theme.border }} onPress={closeOfferModal}>
                <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.text }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable className="flex-1 items-center rounded-xl py-3" style={{ backgroundColor: theme.primary }} onPress={submitOffer}>
                <Text className="text-[11px] font-bold uppercase tracking-[1px]" style={{ color: theme.textOnPrimary }}>
                  Send offer
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
