import { create } from 'zustand';

export interface ChatMember {
  id: string;
  role: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
    isOnline: boolean;
    lastSeen: string;
  };
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  sender: {
    id: string;
    username: string;
    avatar: string | null;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: { id: string; username: string };
  } | null;
}

export interface Chat {
  id: string;
  type: 'PRIVATE' | 'GROUP';
  name: string | null;
  avatar: string | null;
  members: ChatMember[];
  lastMessage: Message | null;
  updatedAt: string;
}

interface TypingUser {
  userId: string;
  username: string;
}

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Record<string, Message[]>; // chatId -> messages
  typingUsers: Record<string, TypingUser[]>; // chatId -> typing users
  onlineUsers: Set<string>;

  setChats: (chats: Chat[]) => void;
  setActiveChat: (chat: Chat | null) => void;
  addChat: (chat: Chat) => void;
  updateChatLastMessage: (chatId: string, message: Message) => void;

  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
  prependMessages: (chatId: string, messages: Message[]) => void;

  setTyping: (chatId: string, userId: string, username: string, isTyping: boolean) => void;

  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;

  updateMessageStatus: (messageId: string, status: 'delivered' | 'read') => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChat: null,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),

  setChats: (chats) => set({ chats }),

  setActiveChat: (chat) => set({ activeChat: chat }),

  addChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats.filter((c) => c.id !== chat.id)],
    })),

  updateChatLastMessage: (chatId, message) =>
    set((state) => ({
      chats: state.chats
        .map((c) => (c.id === chatId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    })),

  setMessages: (chatId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [chatId]: messages },
    })),

  addMessage: (chatId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), message],
      },
    })),

  prependMessages: (chatId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...messages, ...(state.messages[chatId] || [])],
      },
    })),

  setTyping: (chatId, userId, username, isTyping) =>
    set((state) => {
      const current = state.typingUsers[chatId] || [];
      const updated = isTyping
        ? [...current.filter((u) => u.userId !== userId), { userId, username }]
        : current.filter((u) => u.userId !== userId);

      return { typingUsers: { ...state.typingUsers, [chatId]: updated } };
    }),

  setUserOnline: (userId) =>
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.add(userId);
      return { onlineUsers: newSet };
    }),

  setUserOffline: (userId) =>
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.delete(userId);
      return { onlineUsers: newSet };
    }),

  updateMessageStatus: (messageId, status) =>
    set((state) => {
      const newMessages = { ...state.messages };
      for (const chatId of Object.keys(newMessages)) {
        newMessages[chatId] = newMessages[chatId].map((m) =>
          m.id === messageId
            ? { ...m, ...(status === 'delivered' ? { deliveredAt: new Date().toISOString() } : { readAt: new Date().toISOString() }) }
            : m
        );
      }
      return { messages: newMessages };
    }),
}));
