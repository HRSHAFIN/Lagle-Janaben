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

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $conn->query("SELECT * FROM customers ORDER BY created_at DESC");
        $customers = $stmt->fetchAll();

        $result = array_map(function ($c) {
            return [
                'id'          => $c['id'],
                'name'        => $c['name'],
                'email'       => $c['email'],
                'joinDate'    => $c['join_date'],
                'totalOrders' => (int) $c['total_orders'],
                'totalSpent'  => (float) $c['total_spent'],
                'status'      => $c['status'],
            ];
        }, $customers);

        echo json_encode($result);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        $id     = $input['id'] ?? '';
        $status = $input['status'] ?? '';

        if (!$id || !$status) {
            http_response_code(400);
            echo json_encode(['error' => 'Customer id and status are required']);
            exit;
        }

        $stmt = $conn->prepare("UPDATE customers SET status = :status WHERE id = :id");
        $stmt->execute([':status' => $status, ':id' => $id]);

        echo json_encode(['message' => 'Customer status updated']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
