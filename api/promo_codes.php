<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config/database.php';

// Auto-create table if missing
$conn->exec(
    "CREATE TABLE IF NOT EXISTS promo_codes (
        id               INT UNSIGNED   NOT NULL AUTO_INCREMENT PRIMARY KEY,
        code             VARCHAR(50)    NOT NULL,
        type             ENUM('percentage','flat') NOT NULL DEFAULT 'percentage',
        value            DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
        min_order_amount DECIMAL(10,2)  DEFAULT NULL,
        usage_limit      INT            DEFAULT NULL,
        used_count       INT            NOT NULL DEFAULT 0,
        is_active        TINYINT(1)     NOT NULL DEFAULT 1,
        expires_at       DATE           DEFAULT NULL,
        created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);
$check = $conn->query("SELECT COUNT(*) as cnt FROM promo_codes")->fetch();
if ((int)$check['cnt'] === 0) {
    $conn->exec("INSERT INTO promo_codes (code, type, value, usage_limit) VALUES
        ('WELCOME10', 'percentage', 10.00, 100),
        ('AURA20',    'percentage', 20.00, 50),
        ('FREESHIP',  'flat',       5.00,  NULL)");
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            $code = $_GET['code'] ?? '';
            if ($code) {
                $stmt = $conn->prepare(
                    "SELECT * FROM promo_codes
                     WHERE code = :code AND is_active = 1
                       AND (usage_limit IS NULL OR used_count < usage_limit)
                       AND (expires_at IS NULL OR expires_at >= CURDATE())"
                );
                $stmt->execute([':code' => $code]);
                $promo = $stmt->fetch();

                if (!$promo) {
                    http_response_code(404);
                    echo json_encode(['valid' => false, 'error' => 'Invalid or expired promo code']);
                    exit;
                }

                echo json_encode([
                    'valid' => true,
                    'code'  => $promo['code'],
                    'type'  => $promo['type'],
                    'value' => (float) $promo['value'],
                    'min_order_amount' => $promo['min_order_amount'] ? (float) $promo['min_order_amount'] : null,
                ]);
            } else {
                $stmt = $conn->query("SELECT * FROM promo_codes ORDER BY created_at DESC");
                $rows = $stmt->fetchAll();
                $codes = array_map(function($r) {
                    return [
                        'id'               => (int) $r['id'],
                        'code'             => $r['code'],
                        'type'             => $r['type'],
                        'value'            => (float) $r['value'],
                        'min_order_amount' => $r['min_order_amount'] !== null ? (float) $r['min_order_amount'] : null,
                        'usage_limit'      => $r['usage_limit'] !== null ? (int) $r['usage_limit'] : null,
                        'used_count'       => (int) $r['used_count'],
                        'is_active'        => (int) $r['is_active'],
                        'expires_at'       => $r['expires_at'],
                        'created_at'       => $r['created_at'],
                    ];
                }, $rows);
                echo json_encode($codes);
            }
        } catch (PDOException $e) {
            echo json_encode([]);
        }
        break;

    case 'POST':
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (empty($input['code']) || empty($input['type']) || !isset($input['value'])) {
                http_response_code(400);
                echo json_encode(['error' => 'code, type, and value are required']);
                exit;
            }

            $stmt = $conn->prepare(
                "INSERT INTO promo_codes (code, type, value, min_order_amount, usage_limit, is_active, expires_at)
                 VALUES (:code, :type, :value, :min_order_amount, :usage_limit, :is_active, :expires_at)"
            );
            $stmt->execute([
                ':code'             => strtoupper($input['code']),
                ':type'             => $input['type'],
                ':value'            => $input['value'],
                ':min_order_amount'  => $input['min_order_amount'] ?? null,
                ':usage_limit'      => $input['usage_limit'] ?? null,
                ':is_active'        => $input['is_active'] ?? 1,
                ':expires_at'       => $input['expires_at'] ?? null,
            ]);

            echo json_encode(['message' => 'Promo code created']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: table may not exist. Run database/schema.sql first.']);
        }
        break;

    case 'DELETE':
        try {
            $id = $_GET['id'] ?? '';
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Promo code id is required']);
                exit;
            }

            $stmt = $conn->prepare("DELETE FROM promo_codes WHERE id = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(['message' => 'Promo code deleted']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: table may not exist. Run database/schema.sql first.']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
