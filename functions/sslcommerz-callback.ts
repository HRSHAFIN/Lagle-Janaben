import { createClient, createAdminClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface OrderJson {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  items: { name: string; price: number; quantity: number }[];
}

function shortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function money(n: number): string {
  return `৳${Number(n).toFixed(2)}`;
}

// Self-contained (no import from src/lib — this file deploys standalone).
// Keep in sync with src/lib/api/notifications.ts's invoice template.
function invoiceEmailHtml(order: OrderJson): string {
  const shippingFee = order.total - order.subtotal + order.discount;
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${money(item.price * item.quantity)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f7f7f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:20px;font-weight:800;"><span style="color:#1E2D44;">Lagle</span> <span style="color:#B88E4C;">Janaben</span></div>
        <div style="font-size:11px;color:#9ca3af;letter-spacing:.05em;text-transform:uppercase;margin-top:2px;">Gifts that connect Hearts</div>
      </div>
      <div style="background:#ffffff;border:1px solid #f0f0f0;border-radius:16px;padding:28px;">
        <h1 style="font-size:18px;margin:0 0 12px;">Order Confirmed</h1>
        <p style="font-size:14px;color:#4b5563;">Hi ${order.customerName}, your payment was received and your order is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;">
          <thead>
            <tr>
              <th style="text-align:left;padding-bottom:8px;border-bottom:2px solid #111827;">Item</th>
              <th style="text-align:center;padding-bottom:8px;border-bottom:2px solid #111827;">Qty</th>
              <th style="text-align:right;padding-bottom:8px;border-bottom:2px solid #111827;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <table style="width:100%;font-size:13px;margin-top:12px;">
          <tr><td style="color:#6b7280;padding:2px 0;">Subtotal</td><td style="text-align:right;">${money(order.subtotal)}</td></tr>
          ${order.discount > 0 ? `<tr><td style="color:#059669;padding:2px 0;">Discount</td><td style="text-align:right;color:#059669;">-${money(order.discount)}</td></tr>` : ''}
          <tr><td style="color:#6b7280;padding:2px 0;">Shipping</td><td style="text-align:right;">${shippingFee === 0 ? 'Free' : money(shippingFee)}</td></tr>
          <tr><td style="font-weight:700;padding-top:8px;border-top:1px solid #e5e7eb;">Total</td><td style="text-align:right;font-weight:700;padding-top:8px;border-top:1px solid #e5e7eb;">${money(order.total)}</td></tr>
        </table>
        <p style="font-size:12px;color:#6b7280;margin-top:20px;line-height:1.6;">
          <strong>Order ID:</strong> ${shortId(order.id)}<br/>
          <strong>Payment method:</strong> ${order.paymentMethod}<br/>
          <strong>Shipping to:</strong> ${order.shippingAddress}
        </p>
      </div>
      <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px;">Lagle Janaben &middot; Gulshan-2, Dhaka, Bangladesh</p>
    </div>
  </body>
</html>`;
}

function htmlPage(title: string, message: string, tranId: string, ok: boolean): Response {
  const icon = ok
    ? '<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>'
    : '<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - Lagle Janaben</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-gray-50 flex items-center justify-center min-h-screen">
  <div class="max-w-md w-full mx-4 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
    <div class="h-16 w-16 ${ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} rounded-full flex items-center justify-center mx-auto mb-6">${icon}</div>
    <h1 class="text-2xl font-bold text-gray-900 mb-2">${title}</h1>
    <p class="text-sm text-gray-500 mb-8 leading-relaxed">${message}</p>
    <div class="space-y-3">
      <button onclick="window.close()" class="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors">Close This Tab</button>
      <a href="/?ssl_status=${ok ? 'success' : 'fail'}&tran_id=${encodeURIComponent(tranId)}" class="block w-full border border-gray-200 text-gray-700 bg-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors">Go Back to Store</a>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'fail';

  const fields: Record<string, string> = {};
  try {
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        Object.assign(fields, await req.json());
      } else {
        const form = await req.formData();
        for (const [key, value] of form.entries()) fields[key] = String(value);
      }
    } else {
      url.searchParams.forEach((value, key) => {
        fields[key] = value;
      });
    }
  } catch {
    // leave fields as whatever was parsed before the error
  }

  const tranId = fields.tran_id || '';
  const baseUrl = Deno.env.get('INSFORGE_BASE_URL');
  const apiKey = Deno.env.get('API_KEY');
  const anonKey = Deno.env.get('ANON_KEY');

  if (!baseUrl || !apiKey || !anonKey || !tranId) {
    return htmlPage('Payment Error', 'We could not process this payment notification.', tranId, false);
  }

  const admin = createAdminClient({ baseUrl, apiKey });

  if (type !== 'success' || !['VALID', 'VALIDATED', 'SUCCESS'].includes(fields.status || '')) {
    await admin.database.rpc('mark_gateway_order_failed', { p_order_id: tranId });
    return htmlPage(
      type === 'cancel' ? 'Payment Cancelled' : 'Payment Failed',
      `Your payment for transaction ${tranId} was not completed. Please try again, or choose Cash on Delivery.`,
      tranId,
      false
    );
  }

  // Server-to-server validation — the redirect/IPN payload alone is never trusted.
  const storeId = Deno.env.get('SSLCOMMERZ_STORE_ID') || 'testbox';
  const storePasswd = Deno.env.get('SSLCOMMERZ_STORE_PASSWORD') || 'testbox@ssl';
  const isSandbox = Deno.env.get('SSLCOMMERZ_IS_SANDBOX') !== 'false';
  const validationHost = isSandbox ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com';
  const valId = fields.val_id || '';

  // deno-lint-ignore no-explicit-any
  let validation: any = null;
  try {
    const res = await fetch(
      `${validationHost}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePasswd)}&format=json`
    );
    validation = await res.json();
  } catch {
    validation = null;
  }

  const validStatus = validation && (validation.status === 'VALID' || validation.status === 'VALIDATED');

  // Cross-check the validated amount against what the order actually owes —
  // the previous PHP integration trusted `status` alone and skipped this.
  let amountMatches = false;
  if (validStatus) {
    const anon = createClient({ baseUrl, anonKey });
    const { data: order } = await anon.database.rpc('get_order_by_id', { p_order_id: tranId });
    if (order) {
      const paidAmount = Number(validation.amount ?? validation.currency_amount ?? 0);
      amountMatches = Math.abs(paidAmount - Number(order.total)) < 0.01;
    }
  }

  if (!validStatus || !amountMatches) {
    await admin.database.rpc('mark_gateway_order_failed', { p_order_id: tranId });
    return htmlPage(
      'Payment Verification Failed',
      `We could not verify your payment for transaction ${tranId}. If you were charged, please contact support.`,
      tranId,
      false
    );
  }

  // Idempotent: a second call for an already-paid order (browser redirect +
  // async IPN both land here) is a safe no-op inside fulfill_gateway_order.
  const fulfillRes = await admin.database.rpc('fulfill_gateway_order', {
    p_order_id: tranId,
    p_bank_tran_id: validation.bank_tran_id || fields.bank_tran_id || null,
    p_card_type: fields.card_type || validation.card_type || null,
  });

  // Only send the invoice on the call that actually transitioned the order,
  // never on a repeat (redirect + IPN both landing here for one payment).
  const fulfillData = fulfillRes.data as { order: OrderJson; justFulfilled: boolean } | null;
  if (fulfillData?.justFulfilled && fulfillData.order) {
    try {
      const anon = createClient({ baseUrl, anonKey });
      await anon.emails.send({
        to: fulfillData.order.customerEmail,
        subject: `Your Lagle Janaben order ${shortId(fulfillData.order.id)} is confirmed`,
        html: invoiceEmailHtml(fulfillData.order),
        from: 'Lagle Janaben',
        replyTo: 'support@laglejanaben.com',
      });
    } catch (err) {
      console.error('Could not send invoice email:', err);
    }
  }

  return htmlPage(
    'Payment Successful',
    `Your payment for transaction ${tranId} was completed successfully. Your order is now being processed.`,
    tranId,
    true
  );
}
