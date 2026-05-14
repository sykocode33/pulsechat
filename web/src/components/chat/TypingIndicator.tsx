interface TypingIndicatorProps {
  users: { userId: string; username: string }[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const names = users.map((u) => u.username);
  const text = names.length === 1
    ? `${names[0]} is typing`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing`
    : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.75rem',
      }}
    >
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
        <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)' }} />
        <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)' }} />
        <span className="typing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent)' }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
        {text}
      </span>
    </div>
  );
}
