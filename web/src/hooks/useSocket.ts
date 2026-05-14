import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || initialized.current) return;
    initialized.current = true;

    const socket = connectSocket();

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    // ─── New Message ─────────────────────────────
    socket.on('new_message', (data) => {
      const message = {
        id: data.id,
        chatId: data.chatId,
        senderId: data.senderId,
        content: data.content,
        type: data.type,
        createdAt: data.createdAt,
        sender: data.sender,
      };

      useChatStore.getState().addMessage(data.chatId, message);
      useChatStore.getState().updateChatLastMessage(data.chatId, message);

      // Auto-deliver if not sender
      if (data.senderId !== userId) {
        socket.emit('message_delivered', { messageId: data.id });

        // Increment unread if this chat is not currently active
        const activeChat = useChatStore.getState().activeChat;
        if (!activeChat || activeChat.id !== data.chatId) {
          useChatStore.getState().incrementUnread(data.chatId);
        }
      }
    });

    // ─── Typing Indicators ───────────────────────
    socket.on('typing', (data) => {
      useChatStore.getState().setTyping(data.chatId, data.userId, data.username, data.isTyping);
    });

    // ─── Message Status ──────────────────────────
    socket.on('message_status', (data) => {
      useChatStore.getState().updateMessageStatus(data.messageId, data.status);
    });

    // ─── Presence ────────────────────────────────
    socket.on('user_online', (data) => {
      useChatStore.getState().setUserOnline(data.userId);
    });

    socket.on('user_offline', (data) => {
      useChatStore.getState().setUserOffline(data.userId);
    });

    // ─── Error ───────────────────────────────────
    socket.on('error', (data) => {
      console.error('Socket error:', data.message);
    });

    return () => {
      initialized.current = false;
      disconnectSocket();
    };
  }, [isAuthenticated, userId]);
}
