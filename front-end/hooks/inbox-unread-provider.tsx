import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/auth-provider';
import { api } from '@/lib/api';
import { disconnectChatSocket, getChatSocket } from '@/lib/chat-socket';

type InboxUnreadContextValue = {
  unreadMessageCount: number;
  unreadConversationCount: number;
  refreshInboxUnread: () => Promise<void>;
};

const InboxUnreadContext = createContext<InboxUnreadContextValue | null>(null);

export function InboxUnreadProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadConversationCount, setUnreadConversationCount] = useState(0);

  const refreshInboxUnread = useCallback(async () => {
    if (!token) {
      setUnreadMessageCount(0);
      setUnreadConversationCount(0);
      return;
    }

    try {
      const response = await api.get('/chat/unread', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUnreadMessageCount(Number(response.data?.unreadMessageCount ?? 0));
      setUnreadConversationCount(Number(response.data?.unreadConversationCount ?? 0));
    } catch {
      setUnreadMessageCount(0);
      setUnreadConversationCount(0);
    }
  }, [token]);

  useEffect(() => {
    void refreshInboxUnread();
  }, [refreshInboxUnread]);

  useEffect(() => {
    if (!token) {
      disconnectChatSocket();
      return;
    }

    const socket = getChatSocket(token);
    const handleUnread = () => {
      void refreshInboxUnread();
    };

    socket.on('chat:unread', handleUnread);

    return () => {
      socket.off('chat:unread', handleUnread);
    };
  }, [refreshInboxUnread, token]);

  const value = useMemo(
    () => ({
      unreadMessageCount,
      unreadConversationCount,
      refreshInboxUnread,
    }),
    [refreshInboxUnread, unreadConversationCount, unreadMessageCount]
  );

  return <InboxUnreadContext.Provider value={value}>{children}</InboxUnreadContext.Provider>;
}

export function useInboxUnread() {
  const context = useContext(InboxUnreadContext);

  if (!context) {
    throw new Error('useInboxUnread must be used within InboxUnreadProvider');
  }

  return context;
}
