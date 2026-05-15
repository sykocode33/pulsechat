import { createContext, useContext, useRef, useCallback, useEffect, ReactNode } from 'react';
import { getSocket } from '@/services/socket';
import { useCallStore } from '@/store/callStore';

// ICE servers — STUN + TURN
const getIceServers = (): RTCIceServer[] => [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: [
      'turn:chat.ankitktool.site:3478?transport=udp',
      'turn:chat.ankitktool.site:3478?transport=tcp',
    ],
    username: 'pulsechat',
    credential: 'pulsechat_turn_secret',
  },
];

interface WebRTCContextValue {
  startCall: (targetUserId: string, targetUsername: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  handleAnswer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
}

const WebRTCContext = createContext<WebRTCContextValue | null>(null);

export function WebRTCProvider({ children }: { children: ReactNode }) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const { isMuted, isSpeakerOn, setActive, setEnded, reset } = useCallStore();

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
  }, []);

  const createPeer = useCallback(() => {
    if (peerRef.current) peerRef.current.close();
    const peer = new RTCPeerConnection({ iceServers: getIceServers() });

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      const callId = useCallStore.getState().callId;
      if (callId && callId !== 'pending') {
        getSocket().emit('ice_candidate', { callId, candidate: event.candidate.toJSON() });
      }
    };

    peer.ontrack = (event) => {
      console.log('🔊 Remote track received');
      const stream = event.streams[0];
      if (!stream) return;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch((e) => console.warn('Audio play blocked:', e));
      }
    };

    peer.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', peer.connectionState);
      if (peer.connectionState === 'connected') setActive();
      if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) setEnded();
    };

    peerRef.current = peer;
    return peer;
  }, [setActive, setEnded]);

  const getLocalStream = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone requires HTTPS. Voice calls are not available over HTTP.');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const startCall = useCallback(async (targetUserId: string, targetUsername: string) => {
    try {
      const stream = await getLocalStream();
      const peer = createPeer();
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const offer = await peer.createOffer({ offerToReceiveAudio: true });
      await peer.setLocalDescription(offer);
      useCallStore.getState().setOutgoingCall('pending', targetUserId, targetUsername);
      getSocket().emit('call_offer', { targetUserId, sdp: offer });
    } catch (err: any) {
      console.error('startCall error:', err);
      alert(err.message || 'Failed to start call. Check microphone permissions.');
      reset();
    }
  }, [createPeer, getLocalStream, reset]);

  const acceptCall = useCallback(async () => {
    const store = useCallStore.getState();
    if (!store.pendingSdp || !store.callId) return;
    try {
      const stream = await getLocalStream();
      const peer = createPeer();
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      await peer.setRemoteDescription(new RTCSessionDescription(store.pendingSdp as RTCSessionDescriptionInit));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      getSocket().emit('call_answer', { callId: store.callId, sdp: answer });
      setActive();
    } catch (err: any) {
      console.error('acceptCall error:', err);
      alert(err.message || 'Failed to accept call.');
      reset();
    }
  }, [createPeer, getLocalStream, setActive, reset]);

  const handleAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (peerRef.current) {
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('ICE candidate error:', e);
      }
    }
  }, []);

  const rejectCall = useCallback(() => {
    const { callId } = useCallStore.getState();
    if (callId) getSocket().emit('call_reject', { callId });
    cleanup();
    reset();
  }, [cleanup, reset]);

  const endCall = useCallback(() => {
    const { callId } = useCallStore.getState();
    if (callId) getSocket().emit('call_end', { callId });
    cleanup();
    reset();
  }, [cleanup, reset]);

  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !isMuted; });
  }, [isMuted]);

  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.0;
  }, [isSpeakerOn]);

  const value: WebRTCContextValue = {
    startCall, acceptCall, rejectCall, endCall, handleAnswer, handleIceCandidate, remoteAudioRef,
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTC(): WebRTCContextValue {
  const ctx = useContext(WebRTCContext);
  if (!ctx) throw new Error('useWebRTC must be used inside WebRTCProvider');
  return ctx;
}
