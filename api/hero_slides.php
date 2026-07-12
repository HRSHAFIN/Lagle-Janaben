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

$conn->exec(
    "CREATE TABLE IF NOT EXISTS hero_slides (
        id          INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
        image_url   VARCHAR(500)  NOT NULL,
        alt_text    VARCHAR(255)  DEFAULT NULL,
        sort_order  INT           NOT NULL DEFAULT 0,
        is_active   TINYINT(1)    NOT NULL DEFAULT 1,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
);

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

function handleUpload(): ?string {
    global $uploadDir;
    if (empty($_FILES['image_file']) || $_FILES['image_file']['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    $ext = strtolower(pathinfo($_FILES['image_file']['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
    if (!in_array($ext, $allowed)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type. Allowed: ' . implode(', ', $allowed)]);
        exit;
    }
    $filename = 'slide_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $destPath = $uploadDir . $filename;
    if (!move_uploaded_file($_FILES['image_file']['tmp_name'], $destPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save uploaded file']);
        exit;
    }
    return '/uploads/' . $filename;
}

function getInput(): array {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($contentType, 'multipart/form-data')) {
        $imageUrl = handleUpload();
        return [
            'image_url'  => $imageUrl ?? ($_POST['image_url'] ?? ''),
            'alt_text'   => $_POST['alt_text'] ?? '',
            'sort_order' => isset($_POST['sort_order']) ? (int)$_POST['sort_order'] : 0,
            'is_active'  => isset($_POST['is_active']) ? (int)$_POST['is_active'] : 1,
            'id'         => $_POST['id'] ?? '',
        ];
    }
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    if (!empty($_FILES['image_file'])) {
        $uploaded = handleUpload();
        if ($uploaded) $input['image_url'] = $uploaded;
    }
    return $input;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            $stmt = $conn->query("SELECT * FROM hero_slides ORDER BY sort_order ASC, id ASC");
            $rows = $stmt->fetchAll();
            $slides = array_map(function($r) {
                return [
                    'id'         => (int) $r['id'],
                    'image_url'  => $r['image_url'],
                    'alt_text'   => $r['alt_text'],
                    'sort_order' => (int) $r['sort_order'],
                    'is_active'  => (int) $r['is_active'],
                ];
            }, $rows);
            echo json_encode($slides);
        } catch (PDOException $e) {
            echo json_encode([]);
        }
        break;

    case 'POST':
        try {
            $input = getInput();

            if (empty($input['image_url'])) {
                http_response_code(400);
                echo json_encode(['error' => 'image_url or image_file is required']);
                exit;
            }

            $stmt = $conn->prepare(
                "INSERT INTO hero_slides (image_url, alt_text, sort_order, is_active)
                 VALUES (:image_url, :alt_text, :sort_order, :is_active)"
            );
            $stmt->execute([
                ':image_url'  => $input['image_url'],
                ':alt_text'   => $input['alt_text'] ?? '',
                ':sort_order' => $input['sort_order'] ?? 0,
                ':is_active'  => $input['is_active'] ?? 1,
            ]);

            echo json_encode(['message' => 'Slide created', 'id' => (int) $conn->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error']);
        }
        break;

    case 'PUT':
        try {
            $input = getInput();

            if (empty($input['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'id is required']);
                exit;
            }

            $fields = [];
            $params = [':id' => $input['id']];

            if (isset($input['image_url']) && $input['image_url'] !== '') {
                $fields[] = 'image_url = :image_url';
                $params[':image_url'] = $input['image_url'];
            }
            if (isset($input['alt_text'])) {
                $fields[] = 'alt_text = :alt_text';
                $params[':alt_text'] = $input['alt_text'];
            }
            if (isset($input['sort_order'])) {
                $fields[] = 'sort_order = :sort_order';
                $params[':sort_order'] = $input['sort_order'];
            }
            if (isset($input['is_active'])) {
                $fields[] = 'is_active = :is_active';
                $params[':is_active'] = $input['is_active'];
            }

            if (empty($fields)) {
                http_response_code(400);
                echo json_encode(['error' => 'No fields to update']);
                exit;
            }

            $sql = "UPDATE hero_slides SET " . implode(', ', $fields) . " WHERE id = :id";
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['message' => 'Slide updated']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error']);
        }
        break;

    case 'DELETE':
        try {
            $id = $_GET['id'] ?? '';
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Slide id is required']);
                exit;
            }

            $stmt = $conn->prepare("DELETE FROM hero_slides WHERE id = :id");
            $stmt->execute([':id' => $id]);
            echo json_encode(['message' => 'Slide deleted']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
