import { CartItem, SelectedOptions } from '../types';

/**
 * Two cart lines for the same product but different size/color/variant are
 * genuinely different lines (a Medium Red shirt isn't the same purchase as
 * a Large Blue one) — this key is the single source of truth for "is this
 * the same cart line" everywhere (React keys, update/remove lookups).
 */
export function cartItemKey(item: SelectedOptions & { product: { id: string } }): string {
  return [item.product.id, item.size ?? '', item.color ?? '', item.variant ?? ''].join('::');
}

export function sameOptions(a: SelectedOptions, b: SelectedOptions): boolean {
  return (a.size ?? null) === (b.size ?? null) && (a.color ?? null) === (b.color ?? null) && (a.variant ?? null) === (b.variant ?? null);
}

export function findCartItem(cart: CartItem[], productId: string, options: SelectedOptions): CartItem | undefined {
  return cart.find((item) => item.product.id === productId && sameOptions(item, options));
}

/** "Medium · Red · Gift Wrapped" — for display in cart/checkout/order views. Empty string if none selected. */
export function formatSelectedOptions(options: SelectedOptions): string {
  return [options.size, options.color, options.variant].filter(Boolean).join(' · ');
}
