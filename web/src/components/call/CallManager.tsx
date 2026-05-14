import { useEffect, useRef } from 'react';
import { getSocket } from '@/services/socket';
import { useCallStore } from '@/store/callStore';
import { useAuthStore } from '@/store/authStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import IncomingCall from './IncomingCall';
import ActiveCall from './ActiveCall';

export default function CallManager() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const status = useCallStore((s) => s.status);
  const setIncomingCall = useCallStore((s) => s.setIncomingCall);
  const { acceptCall, rejectCall, endCall, handleAnswer, handleIceCandidate, remoteAudioRef } = useWebRTC();

  // Hidden audio element for remote stream
  const audioEl = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioEl.current) {
      remoteAudioRef.current = audioEl.current;
    }
  }, [remoteAudioRef]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    // ─── Incoming call ──────────────────────────
    socket.on('call_offer', (data) => {
      setIncomingCall(data.callId, data.callerId, data.callerName, data.sdp);
    });

    // ─── Call answered ──────────────────────────
    socket.on('call_answer', (data) => {
      handleAnswer(data.sdp as RTCSessionDescriptionInit);
      useCallStore.getState().setActive();
    });

    // ─── ICE candidates ─────────────────────────
    socket.on('ice_candidate', (data) => {
      handleIceCandidate(data.candidate as RTCIceCandidateInit);
    });

    // ─── Call rejected ──────────────────────────
    socket.on('call_reject', () => {
      useCallStore.getState().setEnded();
      setTimeout(() => useCallStore.getState().reset(), 2000);
    });

    // ─── Call ended by remote ───────────────────
    socket.on('call_end', () => {
      useCallStore.getState().setEnded();
      setTimeout(() => useCallStore.getState().reset(), 2000);
    });

    return () => {
      socket.off('call_offer');
      socket.off('call_answer');
      socket.off('ice_candidate');
      socket.off('call_reject');
      socket.off('call_end');
    };
  }, [isAuthenticated, setIncomingCall, handleAnswer, handleIceCandidate]);

  const handleEndCall = () => {
    endCall();
  };

  return (
    <>
      {/* Hidden remote audio element */}
      <audio ref={audioEl} autoPlay style={{ display: 'none' }} />

      {/* Incoming call overlay */}
      {status === 'incoming' && (
        <IncomingCall onAccept={acceptCall} onReject={rejectCall} />
      )}

      {/* Active / Outgoing call overlay */}
      {(status === 'calling' || status === 'active') && (
        <ActiveCall onEnd={handleEndCall} />
      )}

      {/* Call ended banner */}
      {status === 'ended' && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '1rem 2rem',
            zIndex: 200, boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            color: 'var(--color-text-secondary)', fontSize: '0.9rem',
          }}
        >
          📞 Call ended
        </div>
      )}
    </>
  );
}
