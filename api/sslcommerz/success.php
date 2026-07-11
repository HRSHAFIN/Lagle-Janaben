<?php
require_once __DIR__ . '/../config/database.php';

$input = $_POST;
$status   = $input['status'] ?? '';
$tran_id  = $input['tran_id'] ?? '';
$val_id   = $input['val_id'] ?? '';
$amount   = $input['amount'] ?? '';
$card_type = $input['card_type'] ?? '';

if ($status !== 'VALID' && $status !== 'SUCCESS') {
    $redirect = "/?ssl_status=fail&tran_id=" . urlencode($tran_id);
    header("Location: $redirect");
    exit;
}

$store_id    = getenv('SSLCOMMERZ_STORE_ID') ?: 'testbox';
$store_passwd = getenv('SSLCOMMERZ_STORE_PASSWORD') ?: 'testbox@ssl';
$isSandbox   = getenv('SSLCOMMERZ_IS_SANDBOX') !== 'false';
$validationUrlHost = $isSandbox ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com';

$validateUrl = "{$validationUrlHost}/validator/api/validationserverAPI.php?val_id={$val_id}&store_id={$store_id}&store_passwd={$store_passwd}&format=json";

$ch = curl_init($validateUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => false,
]);
$validationResponse = curl_exec($ch);
curl_close($ch);

$validationData = json_decode($validationResponse, true);

$isValid = ($validationData['status'] ?? '') === 'VALID' || ($validationData['status'] ?? '') === 'VALIDATED';

if ($isValid) {
    $stmt = $conn->prepare(
        "UPDATE orders
            SET status = 'Processing',
                payment_status = 'paid',
                card_type = :card_type,
                bank_tran_id = :bank_tran_id,
                validated_at = NOW()
          WHERE id = :tran_id"
    );
    $stmt->execute([
        ':card_type'    => $card_type ?: ($validationData['card_type'] ?? null),
        ':bank_tran_id'  => $validationData['bank_tran_id'] ?? null,
        ':tran_id'       => $tran_id,
    ]);

    // Upsert customer
    $orderStmt = $conn->prepare("SELECT * FROM orders WHERE id = :id");
    $orderStmt->execute([':id' => $tran_id]);
    $order = $orderStmt->fetch();

    if ($order) {
        $custStmt = $conn->prepare("SELECT * FROM customers WHERE email = :email");
        $custStmt->execute([':email' => $order['customer_email']]);
        $customer = $custStmt->fetch();

        if ($customer) {
            $upd = $conn->prepare(
                "UPDATE customers
                    SET total_orders = total_orders + 1,
                        total_spent  = total_spent + :total
                  WHERE email = :email"
            );
            $upd->execute([':total' => $order['total'], ':email' => $order['customer_email']]);
        } else {
            $newId = 'cust-' . bin2hex(random_bytes(4));
            $ins = $conn->prepare(
                "INSERT INTO customers (id, name, email, join_date, total_orders, total_spent, status)
                 VALUES (:id, :name, :email, CURDATE(), 1, :total, 'Active')"
            );
            $ins->execute([
                ':id'    => $newId,
                ':name'  => $order['customer_name'],
                ':email' => $order['customer_email'],
                ':total' => $order['total'],
            ]);
        }

        // Decrement product inventory
        $itemsStmt = $conn->prepare("SELECT * FROM order_items WHERE order_id = :order_id");
        $itemsStmt->execute([':order_id' => $tran_id]);
        $items = $itemsStmt->fetchAll();

        $invStmt = $conn->prepare(
            "UPDATE products
                SET inventory = GREATEST(inventory - :qty, 0),
                    status   = CASE WHEN GREATEST(inventory - :qty2, 0) = 0 THEN 'Out of Stock' ELSE status END
              WHERE id = :product_id"
        );
        foreach ($items as $item) {
            $invStmt->execute([
                ':qty'        => $item['quantity'],
                ':qty2'       => $item['quantity'],
                ':product_id' => $item['product_id'],
            ]);
        }
    }

    echo getSuccessPage($tran_id);
} else {
    $redirect = "/?ssl_status=fail&tran_id=" . urlencode($tran_id);
    header("Location: $redirect");
}

function getSuccessPage(string $tranId): string {
    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful - Lagle Janaben</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>body { font-family: 'Inter', sans-serif; }</style>
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
      Your payment for transaction <strong class="text-gray-800 font-mono">{$tranId}</strong> was completed successfully. Your order is now being processed.
    </p>
    <div class="space-y-3">
      <button onclick="window.close()" class="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 transition-colors">Close This Tab</button>
      <a href="/?ssl_status=success&tran_id={$tranId}" class="block w-full border border-gray-200 text-gray-700 bg-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors">Go Back to Store</a>
    </div>
  </div>
</body>
</html>
HTML;
}
