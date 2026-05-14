import { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { useChatStore, type Chat } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { formatTime, getInitials } from '@/lib/utils';
import api from '@/services/api';

interface ChatListProps {
  onSelectChat: (chat: Chat) => void;
}

export default function ChatList({ onSelectChat }: ChatListProps) {
  const chats = useChatStore((s) => s.chats);
  const activeChat = useChatStore((s) => s.activeChat);
  const addChat = useChatStore((s) => s.addChat);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const currentUser = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleUserSearch = async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data.users);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const handleStartChat = async (targetUserId: string) => {
    try {
      const { data } = await api.post('/chats/private', { targetUserId });
      addChat(data.chat);
      onSelectChat(data.chat);
      setShowNewChat(false);
      setUserSearch('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  const getChatName = (chat: Chat) => {
    if (chat.type === 'GROUP') return chat.name || 'Group';
    const other = chat.members.find((m) => m.user.id !== currentUser?.id);
    return other?.user.username || 'Unknown';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'GROUP') return chat.avatar;
    const other = chat.members.find((m) => m.user.id !== currentUser?.id);
    return other?.user.avatar || null;
  };

  const isOnline = (chat: Chat) => {
    if (chat.type === 'GROUP') return false;
    const other = chat.members.find((m) => m.user.id !== currentUser?.id);
    return other ? onlineUsers.has(other.user.id) : false;
  };

  const filteredChats = chats.filter((c) =>
    getChatName(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div style={{ padding: '1.25rem 1rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Chats</h2>
        <button
          onClick={() => setShowNewChat(!showNewChat)}
          style={{
            width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
            background: showNewChat ? 'var(--color-danger)' : 'var(--color-accent)',
            border: 'none', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {showNewChat ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '0 1rem 0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="input-field"
            placeholder={showNewChat ? 'Search users to chat...' : 'Search conversations...'}
            value={showNewChat ? userSearch : searchQuery}
            onChange={(e) => showNewChat ? handleUserSearch(e.target.value) : setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', fontSize: '0.85rem', padding: '0.6rem 0.75rem 0.6rem 2.5rem' }}
          />
        </div>
      </div>

      {/* New Chat - User Search Results */}
      {showNewChat && searchResults.length > 0 && (
        <div style={{ padding: '0 0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
          {searchResults.map((u) => (
            <button
              key={u.id}
              onClick={() => handleStartChat(u.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem', background: 'transparent', border: 'none',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text-primary)',
                transition: 'background 0.15s', textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: 'var(--radius-full)',
                background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-accent)',
              }}>
                {getInitials(u.username)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.username}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.bio || 'PulseChat user'}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Chat List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.5rem' }}>
        {filteredChats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className="animate-fade-in"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem', background: activeChat?.id === chat.id ? 'var(--color-bg-active)' : 'transparent',
              border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              color: 'var(--color-text-primary)', transition: 'background 0.15s', textAlign: 'left',
            }}
            onMouseEnter={(e) => { if (activeChat?.id !== chat.id) e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
            onMouseLeave={(e) => { if (activeChat?.id !== chat.id) e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: 'var(--radius-full)',
                background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-accent)',
              }}>
                {getChatAvatar(chat) ? (
                  <img src={getChatAvatar(chat)!} alt="" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-full)', objectFit: 'cover' }} />
                ) : getInitials(getChatName(chat))}
              </div>
              {isOnline(chat) && (
                <div style={{
                  position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px',
                  borderRadius: 'var(--radius-full)', background: 'var(--color-success)',
                  border: '2px solid var(--color-bg-secondary)',
                }} />
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{getChatName(chat)}</span>
                {chat.lastMessage && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    {formatTime(chat.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <p style={{
                fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {chat.lastMessage?.content || 'No messages yet'}
              </p>
            </div>
          </button>
        ))}

        {filteredChats.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            {showNewChat ? 'Search for users to start a conversation' : 'No conversations yet. Click + to start one!'}
          </div>
        )}
      </div>
    </>
  );
}
