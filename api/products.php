<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $conn->query("SELECT * FROM products ORDER BY featured DESC, created_at DESC");
        $products = $stmt->fetchAll();

        $result = array_map(function ($p) {
            return [
                'id'          => $p['id'],
                'name'        => $p['name'],
                'description' => $p['description'],
                'price'       => (float) $p['price'],
                'category'    => $p['category'],
                'image'       => $p['image'],
                'images'      => $p['images'] ? json_decode($p['images'], true) : null,
                'inventory'   => (int) $p['inventory'],
                'rating'      => (float) $p['rating'],
                'featured'    => (bool) $p['featured'],
                'status'      => $p['status'],
            ];
        }, $products);

        echo json_encode($result);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? 'prod-' . bin2hex(random_bytes(4));

        $stmt = $conn->prepare(
            "INSERT INTO products (id, name, description, price, category, image, images, inventory, rating, featured, status)
             VALUES (:id, :name, :description, :price, :category, :image, :images, :inventory, :rating, :featured, :status)"
        );
        $stmt->execute([
            ':id'          => $id,
            ':name'        => $input['name'] ?? '',
            ':description' => $input['description'] ?? '',
            ':price'       => $input['price'] ?? 0,
            ':category'    => $input['category'] ?? 'General',
            ':image'       => $input['image'] ?? null,
            ':images'      => isset($input['images']) ? json_encode($input['images']) : null,
            ':inventory'   => $input['inventory'] ?? 0,
            ':rating'      => $input['rating'] ?? 0,
            ':featured'    => $input['featured'] ?? false,
            ':status'      => $input['status'] ?? 'Active',
        ]);

        echo json_encode(['id' => $id, 'message' => 'Product created']);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? '';

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Product id is required']);
            exit;
        }

        $stmt = $conn->prepare(
            "UPDATE products
                SET name = :name, description = :description, price = :price,
                    category = :category, image = :image, images = :images,
                    inventory = :inventory, rating = :rating, featured = :featured, status = :status
              WHERE id = :id"
        );
        $stmt->execute([
            ':id'          => $id,
            ':name'        => $input['name'] ?? '',
            ':description' => $input['description'] ?? '',
            ':price'       => $input['price'] ?? 0,
            ':category'    => $input['category'] ?? 'General',
            ':image'       => $input['image'] ?? null,
            ':images'      => isset($input['images']) ? json_encode($input['images']) : null,
            ':inventory'   => $input['inventory'] ?? 0,
            ':rating'      => $input['rating'] ?? 0,
            ':featured'    => $input['featured'] ?? false,
            ':status'      => $input['status'] ?? 'Active',
        ]);

        echo json_encode(['message' => 'Product updated']);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? '';
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Product id is required']);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM products WHERE id = :id");
        $stmt->execute([':id' => $id]);

        echo json_encode(['message' => 'Product deleted']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
