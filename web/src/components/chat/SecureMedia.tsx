import { useState, useEffect } from 'react';
import { isUrlExpired, refreshSignedUrl } from '@/services/signedUrl';

interface SecureMediaProps {
  url: string;
  alt?: string;
  type: 'image' | 'file';
  fileName?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export default function SecureMedia({ url, alt, type, fileName, style, onClick }: SecureMediaProps) {
  const [validUrl, setValidUrl] = useState(url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function ensureValid() {
      if (url && isUrlExpired(url)) {
        setLoading(true);
        const fresh = await refreshSignedUrl(url);
        if (!cancelled) {
          setValidUrl(fresh);
          setLoading(false);
        }
      } else {
        setValidUrl(url);
      }
    }

    ensureValid();
    return () => { cancelled = true; };
  }, [url]);

  if (type === 'image') {
    if (loading) {
      return (
        <div style={{
          width: '200px', height: '150px', borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg-tertiary)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-text-muted)', fontSize: '0.8rem',
          ...style,
        }}>
          Loading...
        </div>
      );
    }

    if (error) {
      return (
        <div
          onClick={async () => {
            setError(false);
            const fresh = await refreshSignedUrl(url);
            setValidUrl(fresh);
          }}
          style={{
            width: '200px', height: '150px', borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-tertiary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            color: 'var(--color-text-muted)', fontSize: '0.8rem', flexDirection: 'column', gap: '0.25rem',
            ...style,
          }}
        >
          ⚠️ Click to retry
        </div>
      );
    }

    return (
      <img
        src={validUrl}
        alt={alt || ''}
        style={{
          maxWidth: '100%', maxHeight: '250px', borderRadius: 'var(--radius-md)',
          marginBottom: '0.3rem', cursor: 'pointer', objectFit: 'cover',
          ...style,
        }}
        onClick={onClick || (() => window.open(validUrl, '_blank'))}
        onError={async () => {
          // Try refreshing the URL on error (likely expired mid-view)
          const fresh = await refreshSignedUrl(url);
          if (fresh !== validUrl) {
            setValidUrl(fresh);
          } else {
            setError(true);
          }
        }}
      />
    );
  }

  // File type
  return (
    <a
      href={validUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)',
        borderRadius: 'var(--radius-sm)', textDecoration: 'none',
        color: 'var(--color-accent)', marginBottom: '0.3rem',
        border: '1px solid var(--color-border)',
        ...style,
      }}
    >
      📄 <span style={{ fontSize: '0.85rem' }}>{fileName || alt || 'Download'}</span>
    </a>
  );
}
