import { useRef, useCallback, useEffect } from 'react';
import { getSocket } from '@/services/socket';
import { useCallStore } from '@/store/callStore';

// ICE servers — STUN + TURN (required for production behind NAT)
const getIceServers = (): RTCIceServer[] => [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Coturn TURN server (set up on your AWS server)
  {
    urls: [
      'turn:chat.ankitktool.site:3478?transport=udp',
      'turn:chat.ankitktool.site:3478?transport=tcp',
    ],
    username: 'pulsechat',
    credential: 'pulsechat_turn_secret',
  },
];

export function useWebRTC() {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const { isMuted, isSpeakerOn, setActive, setEnded, reset } = useCallStore();

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

    const peer = new RTCPeerConnection({ iceServers: getIceServers() });

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;

      // ⚠️ Always read callId fresh from store — it may not be set when peer is created
      const currentCallId = useCallStore.getState().callId;
      if (currentCallId && currentCallId !== 'pending') {
        getSocket().emit('ice_candidate', {
          callId: currentCallId,
          candidate: event.candidate.toJSON(),
        });
      } else {
        // Buffer candidate until callId is known
        setTimeout(() => {
          const retryCallId = useCallStore.getState().callId;
          if (retryCallId && retryCallId !== 'pending') {
            getSocket().emit('ice_candidate', {
              callId: retryCallId,
              candidate: event.candidate!.toJSON(),
            });
          }
        }, 1000);
      }
    };

    peer.ontrack = (event) => {
      console.log('🔊 Remote track received:', event.streams);
      remoteStreamRef.current = event.streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        // Force play (browsers may block autoplay)
        remoteAudioRef.current.play().catch((e) => console.warn('Audio play blocked:', e));
      }
    };

    peer.onconnectionstatechange = () => {
      console.log('🔗 Peer connection state:', peer.connectionState);
      if (peer.connectionState === 'connected') setActive();
      if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) setEnded();
    };

    peer.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', peer.iceConnectionState);
    };

    peerRef.current = peer;
    return peer;
  }, [setActive, setEnded]);

  // ─── Get Local Audio Stream ─────────────────────
  const getLocalStream = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        'Microphone access requires HTTPS. Voice calls are not available over HTTP.'
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

      // Add tracks BEFORE creating offer
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const offer = await peer.createOffer({ offerToReceiveAudio: true });
      await peer.setLocalDescription(offer);

      // Set callId in store BEFORE emitting so ICE callbacks have it
      useCallStore.getState().setOutgoingCall('pending', targetUserId, targetUsername);

      getSocket().emit('call_offer', { targetUserId, sdp: offer });
    } catch (err: any) {
      console.error('Failed to start call:', err);
      alert(err.message || 'Failed to start call. Check microphone permissions.');
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

      // Add tracks BEFORE setting remote description
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
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('ICE candidate error:', e);
      }
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
