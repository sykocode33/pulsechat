import { useEffect, useState } from 'react';
import { Phone, MicOff, Mic, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { useCallStore } from '@/store/callStore';
import { getInitials } from '@/lib/utils';

interface ActiveCallProps {
  onEnd: () => void;
}

export default function ActiveCall({ onEnd }: ActiveCallProps) {
  const { remoteUsername, remoteAvatar, isMuted, isSpeakerOn, startedAt, status, toggleMute, toggleSpeaker } = useCallStore();
  const [elapsed, setElapsed] = useState(0);

  // Timer
  useEffect(() => {
    if (status !== 'active' || !startedAt) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startedAt]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isConnecting = status === 'calling';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1232 50%, #0d0a1a 100%)',
      }}
    >
      {/* Background ambient */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,92,231,0.2) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      <div className="animate-fade-in" style={{ textAlign: 'center', position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px', padding: '2rem' }}>

        {/* Status */}
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {isConnecting ? (
            <span style={{ color: 'var(--color-accent)' }}>
              ● Calling...
            </span>
          ) : (
            <span style={{ color: 'var(--color-success)' }}>
              ● {formatTime(elapsed)}
            </span>
          )}
        </p>

        {/* Avatar */}
        <div
          style={{
            width: '120px', height: '120px', borderRadius: '50%',
            background: 'var(--color-accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '3rem', fontWeight: 800, color: 'var(--color-accent)',
            margin: '0 auto 1.5rem',
            border: `4px solid ${isConnecting ? 'var(--color-accent)' : 'var(--color-success)'}`,
            boxShadow: `0 0 50px ${isConnecting ? 'var(--color-accent-glow)' : 'rgba(0,214,143,0.3)'}`,
            transition: 'all 0.5s',
          }}
        >
          {remoteAvatar ? (
            <img src={remoteAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : getInitials(remoteUsername || '?')}
        </div>

        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          {remoteUsername}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '3rem', fontSize: '0.9rem' }}>
          🎙️ Voice Call
        </p>

        {/* Control buttons */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', marginBottom: '2rem' }}>

          {/* Mute */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={toggleMute}
              style={{
                width: '58px', height: '58px', borderRadius: '50%',
                background: isMuted ? 'var(--color-danger)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isMuted ? <MicOff size={22} color="white" /> : <Mic size={22} color="white" />}
            </button>
            <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {isMuted ? 'Unmute' : 'Mute'}
            </p>
          </div>

          {/* End Call */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onEnd}
              style={{
                width: '70px', height: '70px', borderRadius: '50%',
                background: 'var(--color-danger)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px rgba(255,71,87,0.5)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <PhoneOff size={28} color="white" />
            </button>
            <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>End</p>
          </div>

          {/* Speaker */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={toggleSpeaker}
              style={{
                width: '58px', height: '58px', borderRadius: '50%',
                background: !isSpeakerOn ? 'var(--color-warning)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isSpeakerOn ? <Volume2 size={22} color="white" /> : <VolumeX size={22} color="white" />}
            </button>
            <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {isSpeakerOn ? 'Speaker' : 'Muted'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
