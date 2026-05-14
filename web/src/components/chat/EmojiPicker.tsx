import { useState } from 'react';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀','😂','🤣','😊','😍','🥰','😘','😎','🤩','😇','🥺','😢','😭','😤','🤬','🤯','😱','🤗','🤔','😏','😴','🤮','🤧','😷','🤒','👻','💀','👽','🤖','💩','🎃'],
  },
  {
    name: 'Gestures',
    emojis: ['👍','👎','👏','🙌','🤝','✌️','🤞','🤟','🤙','👋','💪','🙏','❤️','🔥','💯','⭐','✨','🎉','🎊','💥','💫','💢','💬','👀','🧠','💅'],
  },
  {
    name: 'Animals',
    emojis: ['🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐵','🐔','🐧','🐦','🦋','🐛','🐝','🐞','🦀','🐍','🦖','🐳','🐬','🦈','🐙'],
  },
  {
    name: 'Food',
    emojis: ['🍎','🍕','🍔','🌮','🍟','🍿','🎂','🍰','🍪','🍩','☕','🍺','🍷','🧃','🍦','🍫','🍬','🌶️','🥑','🍓','🍑','🍌','🥝','🍇','🍉','🥐'],
  },
  {
    name: 'Objects',
    emojis: ['📱','💻','⌨️','🖥️','🎮','🎧','📷','🎬','🎵','🎸','⚽','🏀','🏈','🎯','🚗','✈️','🚀','🏠','💡','📚','✏️','💰','💎','🔑','🎁','🏆'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        right: '0',
        marginBottom: '0.5rem',
        width: '320px',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      {/* Category tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0.25rem' }}>
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(i)}
            style={{
              flex: 1,
              padding: '0.4rem',
              background: activeCategory === i ? 'var(--color-accent-light)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: activeCategory === i ? 'var(--color-accent)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s',
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Emojis grid */}
      <div style={{ padding: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px' }}>
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); onClose(); }}
              style={{
                padding: '0.35rem',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '1.3rem',
                lineHeight: 1,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Close area */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: -1,
        }}
      />
    </div>
  );
}
