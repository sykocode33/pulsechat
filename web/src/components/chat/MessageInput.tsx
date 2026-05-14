import { useState, useRef } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';
import { getSocket } from '@/services/socket';

interface MessageInputProps {
  chatId: string;
  onSend: (content: string) => void;
}

export default function MessageInput({ chatId, onSend }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const handleTyping = () => {
    const socket = getSocket();

    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit('typing_start', { chatId });
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit('typing_stop', { chatId });
    }, 2000);
  };

  const handleSend = () => {
    const content = message.trim();
    if (!content) return;

    onSend(content);
    setMessage('');

    // Stop typing indicator
    if (isTyping.current) {
      isTyping.current = false;
      const socket = getSocket();
      socket.emit('typing_stop', { chatId });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.5rem',
      }}
    >
      <button
        style={{
          width: '38px', height: '38px', borderRadius: 'var(--radius-full)',
          background: 'transparent', border: 'none', color: 'var(--color-text-muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
      >
        <Paperclip size={18} />
      </button>

      <div
        style={{
          flex: 1,
          background: 'var(--color-bg-tertiary)',
          borderRadius: '20px',
          border: '1px solid var(--color-border)',
          padding: '0.1rem 0.25rem',
          display: 'flex',
          alignItems: 'flex-end',
          transition: 'border-color 0.2s',
        }}
      >
        <textarea
          value={message}
          onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--color-text-primary)',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-sans)',
            padding: '0.6rem 0.75rem',
            resize: 'none',
            maxHeight: '120px',
            lineHeight: 1.4,
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          style={{
            width: '32px', height: '32px', borderRadius: 'var(--radius-full)',
            background: 'transparent', border: 'none', color: 'var(--color-text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginBottom: '0.2rem',
          }}
        >
          <Smile size={18} />
        </button>
      </div>

      <button
        onClick={handleSend}
        disabled={!message.trim()}
        style={{
          width: '42px', height: '42px', borderRadius: 'var(--radius-full)',
          background: message.trim() ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
          border: 'none', color: message.trim() ? 'white' : 'var(--color-text-muted)',
          cursor: message.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.2s',
          boxShadow: message.trim() ? '0 0 15px var(--color-accent-glow)' : 'none',
        }}
      >
        <Send size={18} />
      </button>
    </div>
  );
}
