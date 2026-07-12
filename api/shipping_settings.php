<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config/database.php';

// Auto-create table if missing
$conn->exec(
    "CREATE TABLE IF NOT EXISTS shipping_settings (
        id                      INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
        shipping_fee            DECIMAL(10,2) NOT NULL DEFAULT 10.00,
        free_shipping_threshold DECIMAL(10,2) NOT NULL DEFAULT 150.00,
        is_active               TINYINT(1)    NOT NULL DEFAULT 1,
        updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);
$check = $conn->query("SELECT COUNT(*) as cnt FROM shipping_settings")->fetch();
if ((int)$check['cnt'] === 0) {
    $conn->exec("INSERT INTO shipping_settings (shipping_fee, free_shipping_threshold) VALUES (10.00, 150.00)");
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            $stmt = $conn->query("SELECT * FROM shipping_settings WHERE is_active = 1 LIMIT 1");
            $settings = $stmt->fetch();

            if ($settings) {
                echo json_encode([
                    'shipping_fee'            => (float) $settings['shipping_fee'],
                    'free_shipping_threshold' => (float) $settings['free_shipping_threshold'],
                ]);
            } else {
                echo json_encode([
                    'shipping_fee'            => 10.00,
                    'free_shipping_threshold' => 150.00,
                ]);
            }
        } catch (PDOException $e) {
            echo json_encode([
                'shipping_fee'            => 10.00,
                'free_shipping_threshold' => 150.00,
            ]);
        }
        break;

    case 'PUT':
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            // Ensure the table has a row
            $check = $conn->query("SELECT COUNT(*) as cnt FROM shipping_settings")->fetch();
            if ((int)$check['cnt'] === 0) {
                $conn->exec("INSERT INTO shipping_settings (shipping_fee, free_shipping_threshold) VALUES (10.00, 150.00)");
            }

            $stmt = $conn->prepare("UPDATE shipping_settings SET shipping_fee = :fee, free_shipping_threshold = :threshold WHERE is_active = 1");
            $stmt->execute([
                ':fee'       => $input['shipping_fee'] ?? 10.00,
                ':threshold' => $input['free_shipping_threshold'] ?? 150.00,
            ]);

            echo json_encode(['message' => 'Shipping settings updated']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: table may not exist. Run database/schema.sql first.']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
