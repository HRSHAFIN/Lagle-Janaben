import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Simple in-memory store for tracking pending and completed orders
// In a production app, this would be a persistent database like Firestore
const ordersStore = new Map<string, any>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares to parse request bodies (especially URL-encoded from SSLCommerz POSTs)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --------------------------------------------------------
  // SSLCOMMERZ PAYMENTS INTEGRATION (SANDBOX)
  // --------------------------------------------------------
  
  // 1. Initiate Payment Session
  app.post('/api/sslcommerz/initiate', async (req, res) => {
    try {
      const {
        amount,
        currency = 'BDT',
        tran_id,
        cus_name,
        cus_email,
        cus_address,
        cus_city,
        cus_state,
        cus_zip,
        cus_phone,
        order_details, // Custom object containing cart items, discounts, etc.
      } = req.body;

      if (!amount || !tran_id || !cus_name || !cus_email) {
        return res.status(400).json({ error: 'Missing required fields for payment initiation.' });
      }

      // Store the order details in memory before redirecting
      ordersStore.set(tran_id, {
        id: tran_id,
        customerName: cus_name,
        customerEmail: cus_email,
        shippingAddress: `${cus_address}, ${cus_city}, ${cus_state} ${cus_zip}`,
        items: order_details.items,
        subtotal: order_details.subtotal,
        discount: order_details.discount,
        total: parseFloat(amount),
        status: 'Pending',
        paymentMethod: 'SSLCommerz',
        createdAt: new Date().toISOString(),
        paymentStatus: 'unpaid',
      });

      // Construct return URLs dynamically based on current protocol and host
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host');
      const success_url = `${protocol}://${host}/api/sslcommerz/success`;
      const fail_url = `${protocol}://${host}/api/sslcommerz/fail`;
      const cancel_url = `${protocol}://${host}/api/sslcommerz/cancel`;

      const store_id = process.env.SSLCOMMERZ_STORE_ID || 'testbox';
      const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || 'testbox@ssl';
      const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== 'false';
      const initUrl = isSandbox 
        ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php' 
        : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

      // Build parameters for SSLCommerz API
      const sslParams = new URLSearchParams({
        store_id: store_id,
        store_passwd: store_passwd,
        total_amount: amount.toString(),
        currency: currency,
        tran_id: tran_id,
        success_url: success_url,
        fail_url: fail_url,
        cancel_url: cancel_url,
        ipn_url: success_url, // Use success URL as fallback IPN
        shipping_method: 'NO',
        product_name: 'Lagle Janaben Curated Purchase',
        product_category: 'E-commerce',
        product_profile: 'general',
        cus_name: cus_name,
        cus_email: cus_email,
        cus_add1: cus_address || 'Not Provided',
        cus_city: cus_city || 'Not Provided',
        cus_state: cus_state || 'Not Provided',
        cus_postcode: cus_zip || 'Not Provided',
        cus_country: 'Bangladesh',
        cus_phone: cus_phone || '01700000000',
      });

      console.log(`Initiating SSLCommerz for Transaction: ${tran_id}, Amount: ${amount}`);

      const response = await fetch(initUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: sslParams.toString(),
      });

      if (!response.ok) {
        throw new Error(`SSLCommerz API responded with HTTP ${response.status}`);
      }

      const data = await response.json() as any;

      if (data.status === 'SUCCESS' && data.GatewayPageURL) {
        console.log(`SSLCommerz Session Created. Redirect URL: ${data.GatewayPageURL}`);
        return res.json({ redirectUrl: data.GatewayPageURL });
      } else {
        console.error('SSLCommerz initiation failed:', data);
        return res.status(500).json({
          error: 'SSLCommerz payment gateway initiation failed',
          details: data.failedreason || 'Unknown error from payment gateway',
        });
      }
    } catch (error: any) {
      console.error('Error initiating SSLCommerz payment:', error);
      return res.status(500).json({ error: 'Internal Server Error during payment initiation', message: error.message });
    }
  });

  // 2. SSLCommerz Success Redirect
  app.post('/api/sslcommerz/success', async (req, res) => {
    try {
      console.log('SSLCommerz payment success POST callback received:', req.body);
      const { status, tran_id, val_id, amount, card_type } = req.body;

      if (status !== 'VALID' && status !== 'SUCCESS') {
        console.warn(`Transaction received success redirect but status was: ${status}`);
        return res.redirect(`/?ssl_status=fail&tran_id=${tran_id}`);
      }

      const store_id = process.env.SSLCOMMERZ_STORE_ID || 'testbox';
      const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || 'testbox@ssl';
      const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== 'false';
      const validationUrlHost = isSandbox 
        ? 'https://sandbox.sslcommerz.com' 
        : 'https://securepay.sslcommerz.com';

      // Call validation API to securely verify with SSLCommerz server
      const validateUrl = `${validationUrlHost}/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${store_id}&store_passwd=${store_passwd}&format=json`;
      const validationResponse = await fetch(validateUrl);
      
      if (!validationResponse.ok) {
        throw new Error('Failed to connect to SSLCommerz validation server');
      }

      const validationData = await validationResponse.json() as any;
      console.log('SSLCommerz Validation Response:', validationData);

      if (validationData.status === 'VALID' || validationData.status === 'VALIDATED') {
        // Retrieve and update the order in our server memory
        const order = ordersStore.get(tran_id);
        if (order) {
          order.status = 'Processing';
          order.paymentStatus = 'paid';
          order.cardType = card_type || validationData.card_type;
          order.bankTranId = validationData.bank_tran_id;
          order.validatedAt = new Date().toISOString();
          ordersStore.set(tran_id, order);
          console.log(`Order ${tran_id} marked as PAID and updated successfully.`);
        } else {
          console.error(`Order details for transaction ${tran_id} not found in store.`);
        }

        // Return beautiful responsive success HTML page in the new tab/window
        return res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Successful - Lagle Janaben</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; }
            </style>
          </head>
          <body class="bg-gray-50 flex items-center justify-center min-h-screen">
            <div class="max-w-md w-full mx-4 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
              <div class="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Payment Successful</h1>
              <p class="text-sm text-gray-500 mb-8 leading-relaxed">
                Your payment for transaction <strong class="text-gray-800 font-mono">${tran_id}</strong> was completed successfully. Your order is now being processed.
              </p>
              
              <div class="space-y-3">
                <button onclick="window.close()" class="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors">
                  Close This Tab
                </button>
                <a href="/?ssl_status=success&tran_id=${tran_id}" class="block w-full border border-gray-200 text-gray-700 bg-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Go Back to Store
                </a>
              </div>
            </div>
          </body>
          </html>
        `);
      } else {
        console.error(`Payment validation failed for ${tran_id}. Status: ${validationData.status}`);
        return res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Failed - Lagle Janaben</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Inter', sans-serif; }
            </style>
          </head>
          <body class="bg-gray-50 flex items-center justify-center min-h-screen">
            <div class="max-w-md w-full mx-4 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
              <div class="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
              <p class="text-sm text-gray-500 mb-8 leading-relaxed">
                Unfortunately, the secure transaction <strong class="text-gray-800 font-mono">${tran_id}</strong> could not be validated.
              </p>
              
              <div class="space-y-3">
                <button onclick="window.close()" class="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors">
                  Close This Tab
                </button>
                <a href="/?ssl_status=fail&tran_id=${tran_id}" class="block w-full border border-gray-200 text-gray-700 bg-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Return to Checkout
                </a>
              </div>
            </div>
          </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Error handling payment success redirect:', error);
      res.redirect('/?ssl_status=error');
    }
  });

  // 3. SSLCommerz Fail Redirect
  app.post('/api/sslcommerz/fail', (req, res) => {
    const { tran_id } = req.body;
    console.log(`SSLCommerz payment failed for transaction: ${tran_id}`);
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed - Lagle Janaben</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; }
        </style>
      </head>
      <body class="bg-gray-50 flex items-center justify-center min-h-screen">
        <div class="max-w-md w-full mx-4 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <div class="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
          <p class="text-sm text-gray-500 mb-8 leading-relaxed">
            Unfortunately, the secure transaction <strong class="text-gray-800 font-mono">${tran_id}</strong> was failed by the bank or gateway.
          </p>
          
          <div class="space-y-3">
            <button onclick="window.close()" class="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors">
              Close This Tab
            </button>
            <a href="/?ssl_status=fail&tran_id=${tran_id}" class="block w-full border border-gray-200 text-gray-700 bg-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Return to Checkout
            </a>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // 4. SSLCommerz Cancel Redirect
  app.post('/api/sslcommerz/cancel', (req, res) => {
    const { tran_id } = req.body;
    console.log(`SSLCommerz payment cancelled for transaction: ${tran_id}`);
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Cancelled - Lagle Janaben</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; }
        </style>
      </head>
      <body class="bg-gray-50 flex items-center justify-center min-h-screen">
        <div class="max-w-md w-full mx-4 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
          <div class="h-16 w-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
          <p class="text-sm text-gray-500 mb-8 leading-relaxed">
            Your transaction <strong class="text-gray-800 font-mono">${tran_id}</strong> has been cancelled.
          </p>
          
          <div class="space-y-3">
            <button onclick="window.close()" class="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors">
              Close This Tab
            </button>
            <a href="/?ssl_status=cancel&tran_id=${tran_id}" class="block w-full border border-gray-200 text-gray-700 bg-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors">
              Return to Checkout
            </a>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // 5. Fetch Order Details from server-side memory
  app.get('/api/sslcommerz/order/:tran_id', (req, res) => {
    const { tran_id } = req.params;
    const order = ordersStore.get(tran_id);

    if (order) {
      return res.json(order);
    } else {
      return res.status(404).json({ error: `Order with transaction ID ${tran_id} not found.` });
    }
  });

  // --------------------------------------------------------
  // CLIENT AND VITE INTEGRATION
  // --------------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lagle Janaben running on http://localhost:${PORT}`);
  });
}

startServer();
