import { useEffect, useState } from 'react';
import api from '@/services/api';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatList from '@/components/chat/ChatList';
import MessageArea from '@/components/chat/MessageArea';

export default function Chat() {
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const setChats = useChatStore((s) => s.setChats);
  const activeChat = useChatStore((s) => s.activeChat);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const loadChats = async () => {
      try {
        const { data } = await api.get('/chats');
        setChats(data.chats);
      } catch (err) {
        console.error('Failed to load chats:', err);
      }
    };
    loadChats();
  }, [setChats]);

  const handleSelectChat = (chat: any) => {
    setActiveChat(chat);
    setMobileView('chat');
  };

  const handleBack = () => {
    setActiveChat(null);
    setMobileView('list');
  };

  return (
    <div id="chat-page" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar - always visible on desktop */}
      <ChatSidebar />

      {/* Chat List Panel */}
      <div
        style={{
          width: '340px',
          minWidth: '340px',
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          ...(window.innerWidth < 768
            ? {
                position: 'absolute',
                inset: 0,
                width: '100%',
                zIndex: 10,
                display: mobileView === 'list' ? 'flex' : 'none',
              }
            : {}),
        }}
      >
        <ChatList onSelectChat={handleSelectChat} />
      </div>

      {/* Message Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-bg-primary)',
          ...(window.innerWidth < 768
            ? {
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: mobileView === 'chat' ? 'flex' : 'none',
              }
            : {}),
        }}
      >
        {activeChat ? (
          <MessageArea chat={activeChat} currentUserId={user?.id || ''} onBack={handleBack} />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              color: 'var(--color-text-muted)',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--color-accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Select a conversation
            </h2>
            <p style={{ fontSize: '0.9rem' }}>Choose a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
