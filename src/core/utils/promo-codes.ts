/**
 * Promo Codes & Discount Calculation Utility
 */

export function calculateDiscount(
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  orderAmount: number
): { discountAmount: number; finalPrice: number; finalAmount: number } {
  if (orderAmount <= 0) {
    return { discountAmount: 0, finalPrice: 0, finalAmount: 0 };
  }

  let discount = 0;
  if (discountType === 'percentage') {
    discount = (orderAmount * Math.min(100, Math.max(0, discountValue))) / 100;
  } else {
    discount = Math.max(0, discountValue);
  }

  // Ensure discount does not exceed total order amount
  const actualDiscount = Math.min(orderAmount, Math.max(0, discount));
  const finalPrice = Math.max(0, orderAmount - actualDiscount);
  const roundedDiscount = Math.round(actualDiscount * 100) / 100;
  const roundedFinal = Math.round(finalPrice * 100) / 100;

  return {
    discountAmount: roundedDiscount,
    finalPrice: roundedFinal,
    finalAmount: roundedFinal,
  };
}
