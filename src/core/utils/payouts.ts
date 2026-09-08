export const PLATFORM_FEE_RATE = 0.05; // 5% standard platform fee
export const MIN_PAYOUT_AMOUNT = 100; // Minimum withdrawal amount

export function computePlatformFee(gross: number, feeRate: number = PLATFORM_FEE_RATE) {
  const fee = Math.round(gross * feeRate * 100) / 100;
  const net = Math.round((gross - fee) * 100) / 100;
  return { platformFee: fee, netAmount: Math.max(0, net) };
}
