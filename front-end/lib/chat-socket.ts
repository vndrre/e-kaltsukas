import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/api';

let socket: Socket | null = null;

export function getChatSocket(token: string) {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(API_BASE_URL, {
    transports: ['websocket'],
    auth: {
      token: `Bearer ${token}`,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
  });

  return socket;
}

export function disconnectChatSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
