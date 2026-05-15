import { useEffect } from 'react';
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

  // ✅ All components share ONE WebRTC instance via context
  const { acceptCall, rejectCall, endCall, handleAnswer, handleIceCandidate, onCallInitiated, remoteAudioRef } = useWebRTC();

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();

    // ✅ Server sends back the real callId to caller — flush buffered ICE candidates
    socket.on('call_initiated', (data) => {
      console.log('📞 call_initiated received, real callId:', data.callId);
      onCallInitiated(data.callId);
    });

    socket.on('call_offer', (data) => {
      setIncomingCall(data.callId, data.callerId, data.callerName, data.sdp);
    });

    socket.on('call_answer', (data) => {
      handleAnswer(data.sdp as RTCSessionDescriptionInit);
      useCallStore.getState().setActive();
    });

    socket.on('ice_candidate', (data) => {
      handleIceCandidate(data.candidate as RTCIceCandidateInit);
    });

    socket.on('call_reject', () => {
      useCallStore.getState().setEnded();
      setTimeout(() => useCallStore.getState().reset(), 2000);
    });

    socket.on('call_end', () => {
      useCallStore.getState().setEnded();
      setTimeout(() => useCallStore.getState().reset(), 2000);
    });

    return () => {
      socket.off('call_initiated');
      socket.off('call_offer');
      socket.off('call_answer');
      socket.off('ice_candidate');
      socket.off('call_reject');
      socket.off('call_end');
    };
  }, [isAuthenticated, setIncomingCall, handleAnswer, handleIceCandidate]);

  return (
    <>
      {/* ✅ Single shared audio element — remoteAudioRef wired here */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      {status === 'incoming' && (
        <IncomingCall onAccept={acceptCall} onReject={rejectCall} />
      )}

      {(status === 'calling' || status === 'active') && (
        <ActiveCall onEnd={endCall} />
      )}

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
