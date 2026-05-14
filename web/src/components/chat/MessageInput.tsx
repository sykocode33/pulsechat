import { useState, useRef } from 'react';
import { Send, Smile, Paperclip, Image, FileText, X } from 'lucide-react';
import { getSocket } from '@/services/socket';
import EmojiPicker from './EmojiPicker';
import api from '@/services/api';

interface MessageInputProps {
  chatId: string;
  onSend: (content: string, type?: string, mediaUrl?: string) => void;
}

export default function MessageInput({ chatId, onSend }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ name: string; type: string; url: string } | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const stopTyping = () => {
    if (isTyping.current) {
      isTyping.current = false;
      getSocket().emit('typing_stop', { chatId });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'FILE') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      alert('File too large. Maximum 25MB.');
      return;
    }

    setUploading(true);
    setShowAttach(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Send as message with media
      onSend(file.name, type, data.url);
    } catch (err) {
      console.error('Upload failed:', err);
      // Fallback: send filename as text
      onSend(`📎 ${file.name}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSend = () => {
    const content = message.trim();
    if (!content && !preview) return;

    if (preview) {
      onSend(content || preview.name, preview.type === 'image' ? 'IMAGE' : 'FILE', preview.url);
      setPreview(null);
    } else {
      onSend(content);
    }

    setMessage('');
    stopTyping();
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
        position: 'relative',
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const isImage = file.type.startsWith('image/');
          handleFileSelect(e, isImage ? 'IMAGE' : 'FILE');
        }}
      />

      {/* Attachment button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
          style={{
            width: '38px', height: '38px', borderRadius: 'var(--radius-full)',
            background: showAttach ? 'var(--color-accent-light)' : 'transparent',
            border: 'none', color: showAttach ? 'var(--color-accent)' : 'var(--color-text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.2s',
          }}
        >
          {uploading ? (
            <div style={{
              width: '18px', height: '18px', border: '2px solid var(--color-accent)',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : (
            <Paperclip size={18} />
          )}
        </button>

        {/* Attachment menu */}
        {showAttach && (
          <>
            <div
              style={{
                position: 'absolute', bottom: '100%', left: '0',
                marginBottom: '0.5rem', background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)', overflow: 'hidden',
                minWidth: '180px', zIndex: 50,
              }}
            >
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.accept = 'image/*';
                    fileRef.current.click();
                  }
                  setShowAttach(false);
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', background: 'transparent', border: 'none',
                  color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.85rem',
                  fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Image size={18} style={{ color: 'var(--color-success)' }} />
                Photo / Video
              </button>
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar';
                    fileRef.current.click();
                  }
                  setShowAttach(false);
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', background: 'transparent', border: 'none',
                  color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.85rem',
                  fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <FileText size={18} style={{ color: 'var(--color-info)' }} />
                Document
              </button>
            </div>
            <div onClick={() => setShowAttach(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          </>
        )}
      </div>

      {/* Message input area */}
      <div
        style={{
          flex: 1, background: 'var(--color-bg-tertiary)',
          borderRadius: '20px', border: '1px solid var(--color-border)',
          padding: '0.1rem 0.25rem', display: 'flex', alignItems: 'flex-end',
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
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--color-text-primary)', fontSize: '0.9rem',
            fontFamily: 'var(--font-sans)', padding: '0.6rem 0.75rem',
            resize: 'none', maxHeight: '120px', lineHeight: 1.4,
          }}
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 120) + 'px';
          }}
        />

        {/* Emoji button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
            style={{
              width: '32px', height: '32px', borderRadius: 'var(--radius-full)',
              background: showEmoji ? 'var(--color-accent-light)' : 'transparent',
              border: 'none', color: showEmoji ? 'var(--color-accent)' : 'var(--color-text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginBottom: '0.2rem', transition: 'all 0.15s',
            }}
          >
            <Smile size={18} />
          </button>
          {showEmoji && (
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmoji(false)}
            />
          )}
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!message.trim() && !preview}
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
