import { useEffect, useRef } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useCallStore } from '@/store/callStore';
import { getInitials } from '@/lib/utils';

interface IncomingCallProps {
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCall({ onAccept, onReject }: IncomingCallProps) {
  const { remoteUsername, remoteAvatar } = useCallStore();
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Play ringtone
  useEffect(() => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA=='); // silent placeholder
    audio.loop = true;
    ringtoneRef.current = audio;

    // Vibrate on mobile
    if (navigator.vibrate) {
      navigator.vibrate([500, 300, 500, 300, 500]);
    }

    return () => {
      audio.pause();
      if (navigator.vibrate) navigator.vibrate(0);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Pulse rings */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${160 + i * 60}px`,
              height: `${160 + i * 60}px`,
              borderRadius: '50%',
              border: '1px solid rgba(108, 92, 231, 0.3)',
              animation: `pulse-ring 2s ease-out ${i * 0.4}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="animate-fade-in" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Caller Avatar */}
        <div
          style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'var(--color-accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-accent)',
            margin: '0 auto 1.5rem',
            border: '4px solid var(--color-accent)',
            boxShadow: '0 0 40px var(--color-accent-glow)',
          }}
        >
          {remoteAvatar ? (
            <img src={remoteAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : getInitials(remoteUsername || '?')}
        </div>

        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Incoming Call
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {remoteUsername}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '3rem' }}>
          🎙️ Voice Call
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', alignItems: 'center' }}>
          {/* Reject */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onReject}
              style={{
                width: '70px', height: '70px', borderRadius: '50%',
                background: 'var(--color-danger)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 25px rgba(255,71,87,0.4)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <PhoneOff size={28} color="white" />
            </button>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Decline</p>
          </div>

          {/* Accept */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onAccept}
              style={{
                width: '70px', height: '70px', borderRadius: '50%',
                background: 'var(--color-success)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 25px rgba(0,214,143,0.4)',
                transition: 'all 0.2s',
                animation: 'call-ring 1s ease-in-out infinite',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Phone size={28} color="white" />
            </button>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Accept</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes call-ring {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
}
