import { createClient } from 'npm:@insforge/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId : undefined;
  const cusPhone = (typeof body.cusPhone === 'string' && body.cusPhone) || '01700000000';
  const cusAddress = (typeof body.cusAddress === 'string' && body.cusAddress) || 'Not Provided';
  const cusCity = (typeof body.cusCity === 'string' && body.cusCity) || 'Not Provided';
  const cusState = (typeof body.cusState === 'string' && body.cusState) || 'Not Provided';
  const cusZip = (typeof body.cusZip === 'string' && body.cusZip) || 'Not Provided';

  if (!orderId) {
    return json({ error: 'orderId is required' }, 400);
  }

  const baseUrl = Deno.env.get('INSFORGE_BASE_URL');
  const anonKey = Deno.env.get('ANON_KEY');
  if (!baseUrl || !anonKey) {
    return json({ error: 'Server misconfiguration' }, 500);
  }

  const client = createClient({ baseUrl, anonKey });

  // Authoritative order + amount, fetched server-side — never trust a
  // client-sent amount for the gateway call.
  const { data: order, error: orderError } = await client.database.rpc('get_order_by_id', {
    p_order_id: orderId,
  });

  if (orderError || !order) {
    return json({ error: 'Order not found' }, 404);
  }
  if (order.paymentMethod !== 'SSLCommerz' || order.paymentStatus !== 'unpaid') {
    return json({ error: 'This order cannot be paid through the gateway' }, 400);
  }

  const storeId = Deno.env.get('SSLCOMMERZ_STORE_ID') || 'testbox';
  const storePasswd = Deno.env.get('SSLCOMMERZ_STORE_PASSWORD') || 'testbox@ssl';
  const isSandbox = Deno.env.get('SSLCOMMERZ_IS_SANDBOX') !== 'false';

  const initUrl = isSandbox
    ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
    : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

  const callbackBase = `${baseUrl}/functions/sslcommerz-callback`;

  const postData: Record<string, string> = {
    store_id: storeId,
    store_passwd: storePasswd,
    total_amount: String(order.total),
    currency: 'BDT',
    tran_id: orderId,
    success_url: `${callbackBase}?type=success`,
    fail_url: `${callbackBase}?type=fail`,
    cancel_url: `${callbackBase}?type=cancel`,
    ipn_url: `${callbackBase}?type=success`,
    shipping_method: 'NO',
    product_name: 'Lagle Janaben Curated Purchase',
    product_category: 'E-commerce',
    product_profile: 'general',
    cus_name: order.customerName,
    cus_email: order.customerEmail,
    cus_add1: cusAddress,
    cus_city: cusCity,
    cus_state: cusState,
    cus_postcode: cusZip,
    cus_country: 'Bangladesh',
    cus_phone: cusPhone,
  };

  let response: Response;
  try {
    response = await fetch(initUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(postData).toString(),
    });
  } catch {
    return json({ error: 'SSLCommerz API connection failed' }, 500);
  }

  if (!response.ok) {
    return json({ error: 'SSLCommerz API connection failed' }, 500);
  }

  const data = await response.json();

  if (data.status === 'SUCCESS' && data.GatewayPageURL) {
    return json({ redirectUrl: data.GatewayPageURL });
  }

  return json(
    {
      error: 'SSLCommerz payment gateway initiation failed',
      details: data.failedreason || 'Unknown error from payment gateway',
    },
    500
  );
}
