import { describe, it, expect } from 'vitest';
import { calculateDiscount } from '@/core/utils/promo-codes';

describe('Promo Codes & Discount Engine', () => {
  it('calculates percentage discounts accurately', () => {
    const { discountAmount, finalAmount } = calculateDiscount('percentage', 20, 100);
    expect(discountAmount).toBe(20);
    expect(finalAmount).toBe(80);
  });

  it('calculates 50% discount accurately', () => {
    const { discountAmount, finalAmount } = calculateDiscount('percentage', 50, 45);
    expect(discountAmount).toBe(22.5);
    expect(finalAmount).toBe(22.5);
  });

  it('handles 100% discount for free VIP tickets', () => {
    const { discountAmount, finalAmount } = calculateDiscount('percentage', 100, 150);
    expect(discountAmount).toBe(150);
    expect(finalAmount).toBe(0);
  });

  it('calculates fixed dollar discounts accurately', () => {
    const { discountAmount, finalAmount } = calculateDiscount('fixed', 15, 60);
    expect(discountAmount).toBe(15);
    expect(finalAmount).toBe(45);
  });

  it('caps fixed discount at total order amount so price never goes negative', () => {
    const { discountAmount, finalAmount } = calculateDiscount('fixed', 50, 30);
    expect(discountAmount).toBe(30);
    expect(finalAmount).toBe(0);
  });

  it('handles zero amount orders safely', () => {
    const { discountAmount, finalAmount } = calculateDiscount('percentage', 20, 0);
    expect(discountAmount).toBe(0);
    expect(finalAmount).toBe(0);
  });

  it('rounds fractional cents correctly to two decimal places', () => {
    const { discountAmount, finalAmount } = calculateDiscount('percentage', 33.33, 99.99);
    expect(discountAmount).toBe(33.33);
    expect(finalAmount).toBe(66.66);
  });
});
