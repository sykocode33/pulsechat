import { create } from 'zustand';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'active' | 'ended';

export interface CallState {
  status: CallStatus;
  callId: string | null;
  // Remote party info
  remoteUserId: string | null;
  remoteUsername: string | null;
  remoteAvatar: string | null;
  // SDP from offer (for incoming)
  pendingSdp: unknown | null;
  // Timers
  startedAt: number | null;
  // Audio state
  isMuted: boolean;
  isSpeakerOn: boolean;

  // Actions
  setOutgoingCall: (callId: string, remoteUserId: string, remoteUsername: string) => void;
  setIncomingCall: (callId: string, callerId: string, callerName: string, sdp: unknown) => void;
  setActive: () => void;
  setEnded: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  reset: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  status: 'idle',
  callId: null,
  remoteUserId: null,
  remoteUsername: null,
  remoteAvatar: null,
  pendingSdp: null,
  startedAt: null,
  isMuted: false,
  isSpeakerOn: true,

  setOutgoingCall: (callId, remoteUserId, remoteUsername) =>
    set({ status: 'calling', callId, remoteUserId, remoteUsername, pendingSdp: null }),

  setIncomingCall: (callId, callerId, callerName, sdp) =>
    set({ status: 'incoming', callId, remoteUserId: callerId, remoteUsername: callerName, pendingSdp: sdp }),

  setActive: () =>
    set({ status: 'active', startedAt: Date.now(), pendingSdp: null }),

  setEnded: () =>
    set({ status: 'ended' }),

  toggleMute: () =>
    set((state) => ({ isMuted: !state.isMuted })),

  toggleSpeaker: () =>
    set((state) => ({ isSpeakerOn: !state.isSpeakerOn })),

  reset: () =>
    set({
      status: 'idle', callId: null, remoteUserId: null, remoteUsername: null,
      remoteAvatar: null, pendingSdp: null, startedAt: null, isMuted: false, isSpeakerOn: true,
    }),
}));
