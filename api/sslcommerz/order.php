<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../config/database.php';

$tran_id = $_GET['tran_id'] ?? '';

if (!$tran_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing tran_id parameter']);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM orders WHERE id = :id");
$stmt->execute([':id' => $tran_id]);
$order = $stmt->fetch();

if (!$order) {
    http_response_code(404);
    echo json_encode(['error' => "Order with transaction ID {$tran_id} not found."]);
    exit;
}

$itemsStmt = $conn->prepare("SELECT * FROM order_items WHERE order_id = :order_id");
$itemsStmt->execute([':order_id' => $tran_id]);
$items = $itemsStmt->fetchAll();

$formattedItems = array_map(function ($item) {
    return [
        'productId' => $item['product_id'],
        'name'      => $item['name'],
        'price'     => (float) $item['price'],
        'quantity'  => (int) $item['quantity'],
        'image'     => $item['image'],
    ];
}, $items);

echo json_encode([
    'id'               => $order['id'],
    'customerName'     => $order['customer_name'],
    'customerEmail'    => $order['customer_email'],
    'shippingAddress'  => $order['shipping_address'],
    'items'            => $formattedItems,
    'subtotal'         => (float) $order['subtotal'],
    'discount'         => (float) $order['discount'],
    'total'            => (float) $order['total'],
    'status'           => $order['status'],
    'paymentStatus'    => $order['payment_status'],
    'cardType'         => $order['card_type'],
    'bankTranId'       => $order['bank_tran_id'],
    'paymentMethod'    => $order['payment_method'],
    'createdAt'        => $order['created_at'],
    'validatedAt'      => $order['validated_at'],
]);
