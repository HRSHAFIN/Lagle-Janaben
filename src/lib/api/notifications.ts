import { supabase } from '../supabase';
import { Order } from '../../types';

// The templates and the SMTP credentials live in the send-order-email edge
// function (supabase/functions/_shared/email.ts). The browser only names the
// order; the function loads it server-side and checks it's in the right state.

async function sendOrderEmail(orderId: string, type: 'confirmed' | 'cancelled'): Promise<void> {
  const { error } = await supabase.functions.invoke('send-order-email', { body: { orderId, type } });
  if (error) throw new Error(error.message);
}

/** Sent once a COD order is placed. Gateway orders get theirs from sslcommerz-callback on confirmed payment. */
export async function sendInvoiceEmail(order: Order): Promise<void> {
  await sendOrderEmail(order.id, 'confirmed');
}

/** Sent whenever an order transitions to Cancelled, whether by the customer or an admin. */
export async function sendCancellationEmail(order: Order): Promise<void> {
  await sendOrderEmail(order.id, 'cancelled');
}
