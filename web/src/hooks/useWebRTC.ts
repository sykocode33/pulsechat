import { useRef, useCallback, useEffect } from 'react';
import { getSocket } from '@/services/socket';
import { useCallStore } from '@/store/callStore';

// ICE servers — public STUN + optional TURN
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add your Coturn TURN server here for production:
  // { urls: 'turn:YOUR_DOMAIN:3478', username: 'pulsechat', credential: 'YOUR_SECRET' },
];

export function useWebRTC() {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const { isMuted, isSpeakerOn, callId, setActive, setEnded, reset } = useCallStore();

  // ─── Cleanup ───────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
  }, []);

  // ─── Create Peer Connection ─────────────────────
  const createPeer = useCallback(() => {
    if (peerRef.current) peerRef.current.close();

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peer.onicecandidate = (event) => {
      if (event.candidate && callId) {
        getSocket().emit('ice_candidate', {
          callId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    peer.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') setActive();
      if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) setEnded();
    };

    peerRef.current = peer;
    return peer;
  }, [callId, setActive, setEnded]);

  // ─── Get Local Audio Stream ─────────────────────
  const getLocalStream = useCallback(async () => {
    // getUserMedia requires HTTPS or localhost
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        'Microphone access requires a secure connection (HTTPS). ' +
        'Voice calls are not available over plain HTTP.'
      );
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  }, []);

  // ─── Initiate Call ─────────────────────────────
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
      console.error('Failed to start call:', err);
      alert(err.message || 'Failed to start call. Please check microphone permissions.');
      reset();
    }
  }, [createPeer, getLocalStream, reset]);

  // ─── Accept Incoming Call ──────────────────────
  const acceptCall = useCallback(async () => {
    const store = useCallStore.getState();
    if (!store.pendingSdp || !store.callId) return;

    try {
      const stream = await getLocalStream();
      const peer = createPeer();

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      await peer.setRemoteDescription(
        new RTCSessionDescription(store.pendingSdp as RTCSessionDescriptionInit)
      );

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      getSocket().emit('call_answer', { callId: store.callId, sdp: answer });

      setActive();
    } catch (err: any) {
      console.error('Failed to accept call:', err);
      alert(err.message || 'Failed to accept call. Microphone may be blocked.');
      reset();
    }
  }, [createPeer, getLocalStream, setActive, reset]);

  // ─── Handle Answer (from remote) ───────────────
  const handleAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }, []);

  // ─── Handle ICE Candidate (from remote) ────────
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (peerRef.current) {
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  // ─── Reject Call ───────────────────────────────
  const rejectCall = useCallback(() => {
    const { callId: cid } = useCallStore.getState();
    if (cid) getSocket().emit('call_reject', { callId: cid });
    cleanup();
    reset();
  }, [cleanup, reset]);

  // ─── End Call ──────────────────────────────────
  const endCall = useCallback(() => {
    const { callId: cid } = useCallStore.getState();
    if (cid) getSocket().emit('call_end', { callId: cid });
    cleanup();
    reset();
  }, [cleanup, reset]);

  // ─── Mute control ──────────────────────────────
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // ─── Speaker control ───────────────────────────
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.0;
    }
  }, [isSpeakerOn]);

  return {
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    handleAnswer,
    handleIceCandidate,
    remoteAudioRef,
    localStreamRef,
  };
}
