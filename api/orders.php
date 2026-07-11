<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $conn->query("SELECT * FROM orders ORDER BY created_at DESC");
        $orders = $stmt->fetchAll();

        $result = array_map(function ($order) use ($conn) {
            $itemsStmt = $conn->prepare("SELECT * FROM order_items WHERE order_id = :order_id");
            $itemsStmt->execute([':order_id' => $order['id']]);
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

            return [
                'id'              => $order['id'],
                'customerName'    => $order['customer_name'],
                'customerEmail'   => $order['customer_email'],
                'shippingAddress' => $order['shipping_address'],
                'items'           => $formattedItems,
                'subtotal'        => (float) $order['subtotal'],
                'discount'        => (float) $order['discount'],
                'total'           => (float) $order['total'],
                'status'          => $order['status'],
                'paymentMethod'   => $order['payment_method'],
                'createdAt'       => $order['created_at'],
            ];
        }, $orders);

        echo json_encode($result);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || empty($input['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid order data']);
            exit;
        }

        $stmt = $conn->prepare(
            "INSERT INTO orders (id, customer_name, customer_email, shipping_address, subtotal, discount, total, status, payment_method, payment_status, created_at)
             VALUES (:id, :customer_name, :customer_email, :shipping_address, :subtotal, :discount, :total, :status, :payment_method, :payment_status, NOW())"
        );
        $stmt->execute([
            ':id'               => $input['id'],
            ':customer_name'    => $input['customerName'] ?? '',
            ':customer_email'   => $input['customerEmail'] ?? '',
            ':shipping_address' => $input['shippingAddress'] ?? '',
            ':subtotal'         => $input['subtotal'] ?? 0,
            ':discount'         => $input['discount'] ?? 0,
            ':total'            => $input['total'] ?? 0,
            ':status'           => $input['status'] ?? 'Pending',
            ':payment_method'   => $input['paymentMethod'] ?? 'Cash on Delivery',
            ':payment_status'   => 'unpaid',
        ]);

        // Insert order items
        if (!empty($input['items'])) {
            $stmtItem = $conn->prepare(
                "INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
                 VALUES (:order_id, :product_id, :name, :price, :quantity, :image)"
            );
            foreach ($input['items'] as $item) {
                $stmtItem->execute([
                    ':order_id'   => $input['id'],
                    ':product_id' => $item['productId'] ?? null,
                    ':name'       => $item['name'] ?? '',
                    ':price'      => $item['price'] ?? 0,
                    ':quantity'   => $item['quantity'] ?? 1,
                    ':image'      => $item['image'] ?? null,
                ]);
            }
        }

        // Upsert customer
        $custStmt = $conn->prepare("SELECT * FROM customers WHERE email = :email");
        $custStmt->execute([':email' => $input['customerEmail'] ?? '']);
        $customer = $custStmt->fetch();

        if ($customer) {
            $upd = $conn->prepare(
                "UPDATE customers
                    SET total_orders = total_orders + 1,
                        total_spent  = total_spent + :total
                  WHERE email = :email"
            );
            $upd->execute([':total' => $input['total'] ?? 0, ':email' => $input['customerEmail'] ?? '']);
        } else {
            $newId = 'cust-' . bin2hex(random_bytes(4));
            $ins = $conn->prepare(
                "INSERT INTO customers (id, name, email, join_date, total_orders, total_spent, status)
                 VALUES (:id, :name, :email, CURDATE(), 1, :total, 'Active')"
            );
            $ins->execute([
                ':id'    => $newId,
                ':name'  => $input['customerName'] ?? '',
                ':email' => $input['customerEmail'] ?? '',
                ':total' => $input['total'] ?? 0,
            ]);
        }

        // Decrement inventory
        if (!empty($input['items'])) {
            $invStmt = $conn->prepare(
                "UPDATE products
                    SET inventory = GREATEST(inventory - :qty, 0),
                        status   = CASE WHEN GREATEST(inventory - :qty2, 0) = 0 THEN 'Out of Stock' ELSE status END
                  WHERE id = :product_id"
            );
            foreach ($input['items'] as $item) {
                $invStmt->execute([
                    ':qty'        => $item['quantity'] ?? 0,
                    ':qty2'       => $item['quantity'] ?? 0,
                    ':product_id' => $item['productId'] ?? '',
                ]);
            }
        }

        echo json_encode(['message' => 'Order created', 'id' => $input['id']]);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        $id     = $input['id'] ?? '';
        $status = $input['status'] ?? '';

        if (!$id || !$status) {
            http_response_code(400);
            echo json_encode(['error' => 'Order id and status are required']);
            exit;
        }

        $stmt = $conn->prepare("UPDATE orders SET status = :status WHERE id = :id");
        $stmt->execute([':status' => $status, ':id' => $id]);

        echo json_encode(['message' => 'Order status updated']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
