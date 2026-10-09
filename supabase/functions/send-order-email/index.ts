// Sends the order confirmation or cancellation email for an order.
//
// The browser only names the order and which email it wants; the order,
// recipient and content are all loaded server-side, so this can't be used
// to send arbitrary mail. Each email only goes to the order's own address,
// and only when the order is actually in the matching state.

import { adminClient, corsHeaders, json } from '../_shared/http.ts';
import { cancellationEmail, invoiceEmail, OrderJson, sendEmail } from '../_shared/email.ts';

// A confirmation can only be (re)triggered shortly after checkout.
const CONFIRMATION_WINDOW_MS = 30 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { orderId?: unknown; type?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const orderId = typeof body.orderId === 'string' ? body.orderId : null;
  const type = body.type === 'confirmed' || body.type === 'cancelled' ? body.type : null;
  if (!orderId || !type) return json({ error: 'orderId and type are required' }, 400);

  const { data, error } = await adminClient().rpc('get_order_by_id', { p_order_id: orderId });
  if (error || !data) return json({ error: 'Order not found' }, 404);
  const order = data as OrderJson;

  if (type === 'confirmed') {
    const fulfilled = order.paymentMethod === 'Cash on Delivery' || order.paymentStatus === 'paid';
    const recent = Date.now() - new Date(order.createdAt).getTime() < CONFIRMATION_WINDOW_MS;
    if (order.status === 'Cancelled' || !fulfilled || !recent) {
      return json({ error: 'This order is not eligible for a confirmation email' }, 400);
    }
  } else if (order.status !== 'Cancelled') {
    return json({ error: 'This order is not cancelled' }, 400);
  }

  try {
    await sendEmail(order.customerEmail, type === 'confirmed' ? invoiceEmail(order) : cancellationEmail(order));
  } catch (err) {
    console.error('send-order-email failed:', err);
    return json({ error: 'Could not send email' }, 502);
  }
  return json({ sent: true });
});
