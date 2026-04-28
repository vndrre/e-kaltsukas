import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
  counterpart?: {
    id: string;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

export default function ChatThreadScreen() {
  const { theme } = useAppTheme();
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; title?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
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

  const groupedMessages = useMemo(() => messages, [messages]);

  const counterpartName =
    conversation?.counterpart?.username?.trim() || threadTitle;
  const counterpartAvatar = conversation?.counterpart?.avatar_url?.trim() || '';

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
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <ScrollView ref={scrollRef} className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 20 }}>
          {groupedMessages.map((message) => {
            const isMine = message.sender_id === user?.id;
            return (
              <View key={message.id} className={`mb-2 ${isMine ? 'items-end' : 'items-start'}`}>
                <View
                  className="max-w-[82%] rounded-2xl px-3 py-2"
                  style={{
                    backgroundColor: isMine ? theme.primary : theme.surface,
                    borderColor: theme.border,
                    borderWidth: isMine ? 0 : 1,
                  }}>
                  <Text style={{ color: isMine ? theme.textOnPrimary : theme.text }}>{message.body}</Text>
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
    </View>
  );
}
