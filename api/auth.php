<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config/database.php';

session_set_cookie_params(['lifetime' => 60 * 60 * 24 * 30, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function respond($data, int $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function sanitize_user(array $u): array {
    return [
        'id'           => $u['id'],
        'name'         => $u['name'],
        'email'        => $u['email'],
        'phone'        => $u['phone'],
        'authProvider' => $u['auth_provider'],
    ];
}

function validate_password(string $password): ?string {
    if (strlen($password) < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (!preg_match('/[A-Z]/', $password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!preg_match('/[a-z]/', $password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!preg_match('/[0-9]/', $password)) {
        return 'Password must contain at least one number';
    }
    return null;
}

function validate_bd_phone(string $phone): bool {
    return (bool) preg_match('/^01[3-9][0-9]{8}$/', $phone);
}

switch ("$method:$action") {
    // ---------------------------------------------------------
    // REGISTER
    // ---------------------------------------------------------
    case 'POST:register': {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name     = trim($input['name'] ?? '');
        $email    = trim(strtolower($input['email'] ?? ''));
        $phone    = trim($input['phone'] ?? '');
        $password = (string) ($input['password'] ?? '');

        if (!$name || !$email || !$phone || !$password) {
            respond(['error' => 'Name, email, phone number, and password are all required'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(['error' => 'Please provide a valid email address'], 400);
        }
        if (!validate_bd_phone($phone)) {
            respond(['error' => 'Please provide a valid Bangladeshi phone number (e.g. 017XXXXXXXX)'], 400);
        }
        $passwordError = validate_password($password);
        if ($passwordError) {
            respond(['error' => $passwordError], 400);
        }

        $stmt = $conn->prepare('SELECT id FROM users WHERE email = :email');
        $stmt->execute([':email' => $email]);
        if ($stmt->fetch()) {
            respond(['error' => 'An account with this email already exists'], 409);
        }

        $stmt = $conn->prepare('SELECT id FROM users WHERE phone = :phone');
        $stmt->execute([':phone' => $phone]);
        if ($stmt->fetch()) {
            respond(['error' => 'An account with this phone number already exists'], 409);
        }

        $id = 'user-' . bin2hex(random_bytes(8));
        $hash = password_hash($password, PASSWORD_BCRYPT);

        $stmt = $conn->prepare(
            'INSERT INTO users (id, name, email, phone, password_hash, auth_provider) VALUES (:id, :name, :email, :phone, :hash, "local")'
        );
        $stmt->execute([
            ':id'    => $id,
            ':name'  => $name,
            ':email' => $email,
            ':phone' => $phone,
            ':hash'  => $hash,
        ]);

        $_SESSION['user_id'] = $id;
        respond(['user' => sanitize_user([
            'id' => $id, 'name' => $name, 'email' => $email, 'phone' => $phone, 'auth_provider' => 'local',
        ])], 201);
        break;
    }

    // ---------------------------------------------------------
    // LOGIN (email or phone as the key)
    // ---------------------------------------------------------
    case 'POST:login': {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $identifier = trim(strtolower($input['identifier'] ?? ''));
        $password   = (string) ($input['password'] ?? '');

        if (!$identifier || !$password) {
            respond(['error' => 'Email/phone and password are required'], 400);
        }

        $stmt = $conn->prepare('SELECT * FROM users WHERE email = :email OR phone = :phone LIMIT 1');
        $stmt->execute([':email' => $identifier, ':phone' => $identifier]);
        $user = $stmt->fetch();

        if (!$user) {
            respond(['error' => 'No account found with that email or phone number'], 401);
        }
        if ($user['auth_provider'] === 'google' || !$user['password_hash']) {
            respond(['error' => 'This account uses Google Sign-In. Please continue with Google.'], 401);
        }
        if (!password_verify($password, $user['password_hash'])) {
            respond(['error' => 'Incorrect password'], 401);
        }

        $_SESSION['user_id'] = $user['id'];
        respond(['user' => sanitize_user($user)]);
        break;
    }

    // ---------------------------------------------------------
    // GOOGLE SIGN-IN (verifies the Google Identity Services ID token)
    // ---------------------------------------------------------
    case 'POST:google': {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $credential = $input['credential'] ?? '';

        if (!$credential) {
            respond(['error' => 'Missing Google credential token'], 400);
        }

        $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            respond(['error' => 'Could not verify Google credential'], 401);
        }

        $payload = json_decode($response, true);

        $expectedClientId = getenv('GOOGLE_CLIENT_ID') ?: '';
        if ($expectedClientId && ($payload['aud'] ?? '') !== $expectedClientId) {
            respond(['error' => 'Google credential audience mismatch'], 401);
        }
        if (($payload['email_verified'] ?? 'false') !== 'true' || empty($payload['email'])) {
            respond(['error' => 'Google account email is not verified'], 401);
        }

        $googleId = $payload['sub'];
        $email    = strtolower($payload['email']);
        $name     = $payload['name'] ?? explode('@', $email)[0];

        $stmt = $conn->prepare('SELECT * FROM users WHERE google_id = :gid OR email = :email LIMIT 1');
        $stmt->execute([':gid' => $googleId, ':email' => $email]);
        $user = $stmt->fetch();

        if ($user) {
            if (!$user['google_id']) {
                $stmt = $conn->prepare('UPDATE users SET google_id = :gid WHERE id = :id');
                $stmt->execute([':gid' => $googleId, ':id' => $user['id']]);
                $user['google_id'] = $googleId;
            }
        } else {
            $id = 'user-' . bin2hex(random_bytes(8));
            $stmt = $conn->prepare(
                'INSERT INTO users (id, name, email, phone, password_hash, auth_provider, google_id) VALUES (:id, :name, :email, NULL, NULL, "google", :gid)'
            );
            $stmt->execute([':id' => $id, ':name' => $name, ':email' => $email, ':gid' => $googleId]);
            $user = ['id' => $id, 'name' => $name, 'email' => $email, 'phone' => null, 'auth_provider' => 'google'];
        }

        $_SESSION['user_id'] = $user['id'];
        respond(['user' => sanitize_user($user)]);
        break;
    }

    // ---------------------------------------------------------
    // CURRENT SESSION
    // ---------------------------------------------------------
    case 'GET:me': {
        if (empty($_SESSION['user_id'])) {
            respond(['user' => null]);
        }
        $stmt = $conn->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->execute([':id' => $_SESSION['user_id']]);
        $user = $stmt->fetch();
        respond(['user' => $user ? sanitize_user($user) : null]);
        break;
    }

    // ---------------------------------------------------------
    // LOGOUT
    // ---------------------------------------------------------
    case 'POST:logout': {
        $_SESSION = [];
        session_destroy();
        respond(['message' => 'Logged out']);
        break;
    }

    default:
        respond(['error' => 'Unknown auth action'], 404);
}
