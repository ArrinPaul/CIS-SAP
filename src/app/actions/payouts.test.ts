import { describe, it, expect, vi } from 'vitest';
import { computePlatformFee, PLATFORM_FEE_RATE } from './payouts';

describe('Organizer Payouts & Ledger Engine', () => {
  it('correctly calculates standard 5% platform fee and net revenue', () => {
    const { platformFee, netAmount } = computePlatformFee(1000, PLATFORM_FEE_RATE);
    expect(platformFee).toBe(50);
    expect(netAmount).toBe(950);
  });

  it('handles zero or fractional amounts cleanly', () => {
    const resZero = computePlatformFee(0);
    expect(resZero.platformFee).toBe(0);
    expect(resZero.netAmount).toBe(0);

    const resDecimal = computePlatformFee(199.99);
    expect(resDecimal.platformFee).toBe(10); // 199.99 * 0.05 = 9.9995 -> 10
    expect(resDecimal.netAmount).toBe(189.99);
  });

  it('never produces a negative net amount', () => {
    const res = computePlatformFee(-50);
    expect(res.netAmount).toBe(0);
  });
});
