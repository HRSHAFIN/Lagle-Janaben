/** Short, human-friendly order/invoice number, e.g. #7F1F0524. */
export function shortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

/** What the order was actually charged for shipping (not today's shipping settings). */
export function orderShippingFee(order: { subtotal: number; discount: number; total: number }): number {
  return Math.max(order.total - order.subtotal + order.discount, 0);
}
