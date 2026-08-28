import { createClient, createAdminClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
  await admin.database.rpc('fulfill_gateway_order', {
    p_order_id: tranId,
    p_bank_tran_id: validation.bank_tran_id || fields.bank_tran_id || null,
    p_card_type: fields.card_type || validation.card_type || null,
  });

  return htmlPage(
    'Payment Successful',
    `Your payment for transaction ${tranId} was completed successfully. Your order is now being processed.`,
    tranId,
    true
  );
}
