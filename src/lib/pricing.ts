import { CartItem, ShippingSettings } from '../types';

export interface OrderTotals {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  isFreeShipping: boolean;
}

export function computeSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

/**
 * Client-side preview only, for display. `discount` should come from the
 * validate_promo RPC — the actual order total is always recomputed
 * server-side inside place_order / create_pending_gateway_order.
 */
export function computeOrderTotals(
  cart: CartItem[],
  discount: number,
  shippingSettings: ShippingSettings
): OrderTotals {
  const subtotal = computeSubtotal(cart);
  const isFreeShipping = subtotal >= shippingSettings.free_shipping_threshold;
  const shippingFee = isFreeShipping ? 0 : shippingSettings.shipping_fee;
  const clampedDiscount = Math.min(Math.max(discount, 0), subtotal);
  const total = subtotal - clampedDiscount + shippingFee;
  return { subtotal, discount: clampedDiscount, shippingFee, total, isFreeShipping };
}
