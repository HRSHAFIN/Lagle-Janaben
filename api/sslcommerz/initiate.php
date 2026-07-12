<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);

$amount        = $input['amount'] ?? null;
$currency      = $input['currency'] ?? 'BDT';
$tran_id       = $input['tran_id'] ?? null;
$cus_name      = $input['cus_name'] ?? null;
$cus_email     = $input['cus_email'] ?? null;
$cus_phone     = $input['cus_phone'] ?? '';
$cus_address   = $input['cus_address'] ?? '';
$cus_city      = $input['cus_city'] ?? '';
$cus_state     = $input['cus_state'] ?? '';
$cus_zip       = $input['cus_zip'] ?? '';
$order_details = $input['order_details'] ?? [];

if (!$amount || !$tran_id || !$cus_name || !$cus_email) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields for payment initiation.']);
    exit;
}

// Save order to database with status Pending
$shippingAddress = "$cus_address, $cus_city, $cus_state $cus_zip";
$subtotal  = $order_details['subtotal'] ?? 0;
$discount  = $order_details['discount'] ?? 0;

$stmt = $conn->prepare(
    "INSERT INTO orders (id, customer_name, customer_email, shipping_address, subtotal, discount, total, status, payment_method, payment_status, created_at)
     VALUES (:id, :customer_name, :customer_email, :shipping_address, :subtotal, :discount, :total, 'Pending', 'SSLCommerz', 'unpaid', NOW())"
);
$stmt->execute([
    ':id'               => $tran_id,
    ':customer_name'    => $cus_name,
    ':customer_email'   => $cus_email,
    ':shipping_address' => $shippingAddress,
    ':subtotal'         => $subtotal,
    ':discount'         => $discount,
    ':total'            => $amount,
]);

// Insert order items
if (!empty($order_details['items'])) {
    $stmtItem = $conn->prepare(
        "INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
         VALUES (:order_id, :product_id, :name, :price, :quantity, :image)"
    );
    foreach ($order_details['items'] as $item) {
        $stmtItem->execute([
            ':order_id'   => $tran_id,
            ':product_id' => $item['productId'] ?? null,
            ':name'       => $item['name'] ?? '',
            ':price'      => $item['price'] ?? 0,
            ':quantity'   => $item['quantity'] ?? 1,
            ':image'      => $item['image'] ?? null,
        ]);
    }
}

// SSLCommerz API call
$store_id    = getenv('SSLCOMMERZ_STORE_ID') ?: 'testbox';
$store_passwd = getenv('SSLCOMMERZ_STORE_PASSWORD') ?: 'testbox@ssl';
$isSandbox   = getenv('SSLCOMMERZ_IS_SANDBOX') !== 'false';

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' ? 'https' : 'http';
$host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
$baseUrl  = "$protocol://$host";

$initUrl = $isSandbox
    ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
    : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

$postData = [
    'store_id'          => $store_id,
    'store_passwd'      => $store_passwd,
    'total_amount'      => $amount,
    'currency'          => $currency,
    'tran_id'           => $tran_id,
    'success_url'       => "$baseUrl/api/sslcommerz/success.php",
    'fail_url'          => "$baseUrl/api/sslcommerz/fail.php",
    'cancel_url'        => "$baseUrl/api/sslcommerz/cancel.php",
    'ipn_url'           => "$baseUrl/api/sslcommerz/success.php",
    'shipping_method'   => 'NO',
    'product_name'      => 'Lagle Janaben Curated Purchase',
    'product_category'  => 'E-commerce',
    'product_profile'   => 'general',
    'cus_name'          => $cus_name,
    'cus_email'         => $cus_email,
    'cus_add1'          => $cus_address ?: 'Not Provided',
    'cus_city'          => $cus_city ?: 'Not Provided',
    'cus_state'         => $cus_state ?: 'Not Provided',
    'cus_postcode'      => $cus_zip ?: 'Not Provided',
    'cus_country'       => 'Bangladesh',
    'cus_phone'         => $cus_phone ?: '01700000000',
];

$ch = curl_init($initUrl);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => http_build_query($postData),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => false,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$response) {
    http_response_code(500);
    echo json_encode(['error' => 'SSLCommerz API connection failed']);
    exit;
}

$data = json_decode($response, true);

if (($data['status'] ?? '') === 'SUCCESS' && !empty($data['GatewayPageURL'])) {
    echo json_encode(['redirectUrl' => $data['GatewayPageURL']]);
} else {
    http_response_code(500);
    echo json_encode([
        'error'   => 'SSLCommerz payment gateway initiation failed',
        'details' => $data['failedreason'] ?? 'Unknown error from payment gateway',
    ]);
}
