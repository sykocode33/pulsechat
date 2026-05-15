import { createContext, useContext, useRef, useCallback, useEffect, createElement, ReactNode } from 'react';
import { getSocket } from '@/services/socket';
import { useCallStore } from '@/store/callStore';

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
  onCallInitiated: (callId: string) => void;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
}

const WebRTCContext = createContext<WebRTCContextValue | null>(null);

export function WebRTCProvider({ children }: { children: ReactNode }) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Buffer ICE candidates sent before remote description is set
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSet = useRef(false);

  // Buffer ICE candidates to send before server confirms callId
  const pendingEmitBuffer = useRef<RTCIceCandidateInit[]>([]);
  const callIdConfirmed = useRef(false);

  const { isMuted, isSpeakerOn, setActive, setEnded, reset } = useCallStore();

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    iceCandidateBuffer.current = [];
    pendingEmitBuffer.current = [];
    remoteDescSet.current = false;
    callIdConfirmed.current = false;
  }, []);

  const createPeer = useCallback(() => {
    if (peerRef.current) peerRef.current.close();
    const peer = new RTCPeerConnection({
      iceServers: getIceServers(),
      iceTransportPolicy: 'relay', // force TURN relay only — remove after debugging
    });

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      const callId = useCallStore.getState().callId;

      if (callId && callId !== 'pending' && callIdConfirmed.current) {
        // Real callId confirmed — send immediately
        getSocket().emit('ice_candidate', { callId, candidate: event.candidate.toJSON() });
        console.log('📤 ICE sent immediately, callId:', callId);
      } else {
        // Buffer until server confirms callId via call_initiated
        pendingEmitBuffer.current.push(event.candidate.toJSON());
        console.log('📦 ICE buffered (waiting for callId), total:', pendingEmitBuffer.current.length);
      }
    };

    peer.ontrack = (event) => {
      console.log('🔊 Remote track received, streams:', event.streams.length);
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

    peer.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', peer.iceConnectionState);
    };

    peerRef.current = peer;
    return peer;
  }, [setActive, setEnded]);

  // Called when server sends call_initiated with the real callId
  const onCallInitiated = useCallback((callId: string) => {
    useCallStore.getState().setCallId(callId);
    callIdConfirmed.current = true;
    console.log(`✅ CallId confirmed: ${callId}, flushing ${pendingEmitBuffer.current.length} buffered ICE candidates`);

    // Flush all buffered ICE candidates
    for (const candidate of pendingEmitBuffer.current) {
      getSocket().emit('ice_candidate', { callId, candidate });
    }
    pendingEmitBuffer.current = [];
  }, []);

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
      callIdConfirmed.current = false;
      pendingEmitBuffer.current = [];
      remoteDescSet.current = false;

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
      callIdConfirmed.current = true; // Receiver already has real callId from call_offer
      remoteDescSet.current = false;
      iceCandidateBuffer.current = [];

      const stream = await getLocalStream();
      const peer = createPeer();
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      await peer.setRemoteDescription(new RTCSessionDescription(store.pendingSdp as RTCSessionDescriptionInit));
      remoteDescSet.current = true;

      // Flush any ICE candidates that arrived before remote desc was set
      for (const c of iceCandidateBuffer.current) {
        await peer.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      iceCandidateBuffer.current = [];

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
      remoteDescSet.current = true;
      console.log('✅ Remote description set (answer)');

      // Flush any buffered incoming candidates
      for (const c of iceCandidateBuffer.current) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      iceCandidateBuffer.current = [];
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerRef.current) return;

    if (!remoteDescSet.current) {
      // Buffer until remote description is set
      iceCandidateBuffer.current.push(candidate);
      console.log('📦 Incoming ICE buffered (no remote desc yet)');
      return;
    }

    try {
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('ICE candidate error:', e);
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
    startCall, acceptCall, rejectCall, endCall, handleAnswer, handleIceCandidate, onCallInitiated, remoteAudioRef,
  };

  return createElement(WebRTCContext.Provider, { value }, children);
}

export function useWebRTC(): WebRTCContextValue {
  const ctx = useContext(WebRTCContext);
  if (!ctx) throw new Error('useWebRTC must be used inside WebRTCProvider');
  return ctx;
}
