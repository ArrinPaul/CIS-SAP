import { describe, it, expect, vi } from 'vitest';
import { WebRTCStageManager, ICE_SERVERS, SignalPayload } from './webrtc-stage';

describe('WebRTC Virtual Stage Engine', () => {
  it('configures standard STUN servers correctly', () => {
    expect(ICE_SERVERS.iceServers).toBeDefined();
    expect(ICE_SERVERS.iceServers?.length).toBeGreaterThan(0);
    expect(ICE_SERVERS.iceServers?.[0].urls).toContain('stun.l.google.com');
  });

  it('correctly handles stage_active and stage_ended signal events', async () => {
    const onHostStatusChange = vi.fn();
    const sendSignal = vi.fn();

    const manager = new WebRTCStageManager({
      localUserId: 'attendee-1',
      isHost: false,
      onHostStatusChange,
      sendSignal,
    });

    await manager.handleSignal({
      type: 'stage_active',
      hostId: 'host-1',
      hasVideo: true,
      hasAudio: true,
    });

    expect(onHostStatusChange).toHaveBeenCalledWith(true);

    await manager.handleSignal({
      type: 'stage_ended',
      hostId: 'host-1',
    });

    expect(onHostStatusChange).toHaveBeenCalledWith(false);

    manager.destroy();
  });

  it('ignores signals targeted to another peer', async () => {
    const sendSignal = vi.fn();

    const manager = new WebRTCStageManager({
      localUserId: 'attendee-1',
      isHost: false,
      sendSignal,
    });

    await manager.handleSignal({
      type: 'offer',
      from: 'host-1',
      to: 'other-attendee',
      sdp: {} as any,
    });

    expect(sendSignal).not.toHaveBeenCalled();
    manager.destroy();
  });
});
