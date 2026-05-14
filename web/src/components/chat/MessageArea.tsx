import { useEffect, useRef } from 'react';
import { ArrowLeft, Phone } from 'lucide-react';
import { useChatStore, type Chat } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { getSocket } from '@/services/socket';
import { formatTime, getInitials } from '@/lib/utils';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

interface MessageAreaProps {
  chat: Chat;
  currentUserId: string;
  onBack: () => void;
}

const EMPTY_MESSAGES: import('@/store/chatStore').Message[] = [];
const EMPTY_TYPING: { userId: string; username: string }[] = [];

export default function MessageArea({ chat, currentUserId, onBack }: MessageAreaProps) {
  const messages = useChatStore((s) => s.messages[chat.id] ?? EMPTY_MESSAGES);
  const setMessages = useChatStore((s) => s.setMessages);
  const typingUsers = useChatStore((s) => s.typingUsers[chat.id] ?? EMPTY_TYPING);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((s) => s.user);

  const otherUser = chat.type === 'PRIVATE'
    ? chat.members.find((m) => m.user.id !== currentUserId)?.user
    : null;

  const chatName = chat.type === 'GROUP' ? chat.name : otherUser?.username || 'Unknown';
  const isOtherOnline = otherUser ? !!onlineUsers[otherUser.id] : false;

  // Load messages
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/chats/${chat.id}/messages`);
        setMessages(chat.id, data.messages.reverse());
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    load();

    // Join chat room
    const socket = getSocket();
    socket.emit('join_chat', { chatId: chat.id });

    return () => {
      socket.emit('leave_chat', { chatId: chat.id });
    };
  }, [chat.id, setMessages]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  // Mark messages as read (only on initial load, not on every update)
  const readRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const socket = getSocket();
    const unread = messages.filter(
      (m) => m.senderId !== currentUserId && !m.readAt && !readRef.current.has(m.id)
    );
    unread.forEach((m) => {
      readRef.current.add(m.id);
      socket.emit('message_read', { messageId: m.id });
    });
  }, [messages, currentUserId]);

  const handleSend = (content: string, type?: string, mediaUrl?: string) => {
    const socket = getSocket();
    socket.emit('send_message', { chatId: chat.id, content, type: type || 'TEXT', mediaUrl });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        className="glass"
        style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid var(--color-border)',
          backdropFilter: 'blur(20px)',
          zIndex: 5,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: 'var(--color-text-secondary)',
            cursor: 'pointer', display: 'flex', padding: '0.25rem',
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ position: 'relative' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: 'var(--radius-full)',
            background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)',
          }}>
            {getInitials(chatName || 'U')}
          </div>
          {isOtherOnline && (
            <div style={{
              position: 'absolute', bottom: '0', right: '0', width: '10px', height: '10px',
              borderRadius: 'var(--radius-full)', background: 'var(--color-success)',
              border: '2px solid var(--color-bg-primary)',
            }} />
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{chatName}</div>
          <div style={{ fontSize: '0.75rem', color: isOtherOnline ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
            {chat.type === 'GROUP'
              ? `${chat.members.length} members`
              : isOtherOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <button
          style={{
            width: '38px', height: '38px', borderRadius: 'var(--radius-full)',
            background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-bg-tertiary)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
        >
          <Phone size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {messages.map((msg, i) => {
          const isSent = msg.senderId === currentUserId;
          const showAvatar = !isSent && (i === 0 || messages[i - 1]?.senderId !== msg.senderId);

          return (
            <div
              key={msg.id}
              className="animate-message"
              style={{
                display: 'flex',
                justifyContent: isSent ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: '0.5rem',
                marginTop: showAvatar ? '0.75rem' : '0',
              }}
            >
              {/* Avatar for received */}
              {!isSent && showAvatar && (
                <div style={{
                  width: '28px', height: '28px', borderRadius: 'var(--radius-full)',
                  background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-accent)',
                  flexShrink: 0,
                }}>
                  {getInitials(msg.sender.username)}
                </div>
              )}
              {!isSent && !showAvatar && <div style={{ width: '28px' }} />}

              {/* Bubble */}
              <div
                style={{
                  maxWidth: '65%',
                  padding: '0.6rem 0.9rem',
                  borderRadius: isSent
                    ? '18px 18px 4px 18px'
                    : '18px 18px 18px 4px',
                  background: isSent ? 'var(--color-msg-sent)' : 'var(--color-msg-received)',
                  border: isSent ? 'none' : '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  wordBreak: 'break-word',
                }}
              >
                {chat.type === 'GROUP' && !isSent && showAvatar && (
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-accent)', marginBottom: '0.2rem' }}>
                    {msg.sender.username}
                  </div>
                )}

                {/* Media content */}
                {msg.type === 'IMAGE' && msg.mediaUrl && (
                  <img
                    src={msg.mediaUrl}
                    alt={msg.content}
                    style={{
                      maxWidth: '100%', maxHeight: '250px', borderRadius: 'var(--radius-md)',
                      marginBottom: '0.3rem', cursor: 'pointer', objectFit: 'cover',
                    }}
                    onClick={() => window.open(msg.mediaUrl!, '_blank')}
                  />
                )}
                {msg.type === 'FILE' && msg.mediaUrl && (
                  <a
                    href={msg.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)',
                      borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                      color: 'var(--color-accent)', marginBottom: '0.3rem',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    📄 <span style={{ fontSize: '0.85rem' }}>{msg.content}</span>
                  </a>
                )}

                {msg.type === 'TEXT' && <p style={{ fontSize: '0.9rem', lineHeight: 1.45, margin: 0 }}>{msg.content}</p>}
                <div style={{
                  display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.3rem',
                  marginTop: '0.2rem',
                }}>
                  <span style={{ fontSize: '0.65rem', color: isSent ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)' }}>
                    {formatTime(msg.createdAt)}
                  </span>
                  {isSent && (
                    <span style={{ fontSize: '0.65rem', color: msg.readAt ? '#00d68f' : 'rgba(255,255,255,0.4)' }}>
                      {msg.readAt ? '✓✓' : msg.deliveredAt ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
      </div>

      {/* Input */}
      <MessageInput chatId={chat.id} onSend={handleSend} />
    </div>
  );
}
