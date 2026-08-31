/**
 * WebRTC Virtual Stage Engine
 * Facilitates peer-to-peer real-time audio/video streaming between stage presenters and attendees
 * using Supabase Realtime broadcast channels as the signaling layer.
 */

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export type SignalPayload =
  | { type: 'stage_active'; hostId: string; hasVideo: boolean; hasAudio: boolean }
  | { type: 'stage_ended'; hostId: string }
  | { type: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit };

export interface WebRTCStageConfig {
  localUserId: string;
  isHost: boolean;
  onRemoteStream?: (stream: MediaStream) => void;
  onHostStatusChange?: (isActive: boolean) => void;
  sendSignal: (signal: SignalPayload) => void;
}

export class WebRTCStageManager {
  private localUserId: string;
  private isHost: boolean;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private onRemoteStream?: (stream: MediaStream) => void;
  private onHostStatusChange?: (isActive: boolean) => void;
  private sendSignal: (signal: SignalPayload) => void;
  private isDestroyed = false;

  constructor(config: WebRTCStageConfig) {
    this.localUserId = config.localUserId;
    this.isHost = config.isHost;
    this.onRemoteStream = config.onRemoteStream;
    this.onHostStatusChange = config.onHostStatusChange;
    this.sendSignal = config.sendSignal;
  }

  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (this.isHost) {
      // Update tracks for all existing peer connections
      this.peerConnections.forEach((pc) => {
        const senders = pc.getSenders();
        if (stream) {
          stream.getTracks().forEach((track) => {
            const sender = senders.find((s) => s.track?.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track).catch(() => {});
            } else {
              try {
                pc.addTrack(track, stream);
              } catch {}
            }
          });
        } else {
          senders.forEach((s) => {
            try {
              pc.removeTrack(s);
            } catch {}
          });
        }
      });

      this.sendSignal({
        type: stream ? 'stage_active' : 'stage_ended',
        hostId: this.localUserId,
        hasVideo: !!stream?.getVideoTracks().some((t) => t.enabled),
        hasAudio: !!stream?.getAudioTracks().some((t) => t.enabled),
      });
    }
  }

  /**
   * Handle incoming signaling messages from other peers on the stage channel.
   */
  public async handleSignal(signal: SignalPayload) {
    if (this.isDestroyed) return;

    if (signal.type === 'stage_active') {
      this.onHostStatusChange?.(true);
      if (!this.isHost) {
        // Attendee initiates connection to the active host
        await this.connectToHost(signal.hostId);
      }
      return;
    }

    if (signal.type === 'stage_ended') {
      this.onHostStatusChange?.(false);
      return;
    }

    // Direct peer messages
    if (signal.to !== this.localUserId) return;

    if (signal.type === 'offer') {
      await this.handleOffer(signal.from, signal.sdp);
    } else if (signal.type === 'answer') {
      await this.handleAnswer(signal.from, signal.sdp);
    } else if (signal.type === 'ice') {
      await this.handleIceCandidate(signal.from, signal.candidate);
    }
  }

  private getOrCreatePeerConnection(peerId: string): RTCPeerConnection {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks if host
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          try {
            pc!.addTrack(track, this.localStream!);
          } catch {}
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal({
            type: 'ice',
            from: this.localUserId,
            to: peerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.onRemoteStream?.(event.streams[0]);
        }
      };

      this.peerConnections.set(peerId, pc);
    }
    return pc;
  }

  private async connectToHost(hostId: string) {
    if (typeof RTCPeerConnection === 'undefined') return;
    const pc = this.getOrCreatePeerConnection(hostId);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      this.sendSignal({
        type: 'offer',
        from: this.localUserId,
        to: hostId,
        sdp: offer,
      });
    } catch (err) {
      console.warn('[WebRTCStage] connectToHost failed:', err);
    }
  }

  private async handleOffer(peerId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.getOrCreatePeerConnection(peerId);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendSignal({
        type: 'answer',
        from: this.localUserId,
        to: peerId,
        sdp: answer,
      });
    } catch (err) {
      console.warn('[WebRTCStage] handleOffer error:', err);
    }
  }

  private async handleAnswer(peerId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.warn('[WebRTCStage] handleAnswer error:', err);
      }
    }
  }

  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTCStage] handleIceCandidate error:', err);
      }
    }
  }

  public destroy() {
    this.isDestroyed = true;
    this.peerConnections.forEach((pc) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.localStream = null;
  }
}
