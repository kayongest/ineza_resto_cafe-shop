<?php
/* ============================================================
   FAVORITE CAFE - AUTHENTICATION API ENDPOINT
   ============================================================ */
require_once __DIR__ . '/db.php';

// Accept both JSON payload and POST data
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) $data = $_POST;

$action = isset($_GET['action']) ? $_GET['action'] : (isset($data['action']) ? $data['action'] : '');

if ($action === 'register') {
    $fullName = isset($data['full_name']) ? trim($data['full_name']) : (isset($data['name']) ? trim($data['name']) : '');
    $email = isset($data['email']) ? strtolower(trim($data['email'])) : '';
    $phone = isset($data['phone']) ? trim($data['phone']) : '';
    $password = isset($data['password']) ? trim($data['password']) : (isset($data['pass']) ? trim($data['pass']) : '');

    if (empty($fullName) || empty($email) || empty($phone) || empty($password)) {
        echo json_encode(['status' => 'error', 'message' => 'Please complete all required fields including phone number.']);
        exit;
    }

    if (strlen($password) < 6) {
        echo json_encode(['status' => 'error', 'message' => 'Password must be at least 6 characters long.']);
        exit;
    }

    // Check if email or phone already exists in DB
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? OR (phone IS NOT NULL AND phone != '' AND (phone = ? OR REPLACE(phone, ' ', '') = ?))");
    $cleanPhone = str_replace([' ', '-', '(', ')'], '', $phone);
    $stmt->execute([$email, $phone, $cleanPhone]);
    if ($stmt->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'An account with this email or phone number already exists! Please sign in.']);
        exit;
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    // Insert user into MySQL users table
    $insertStmt = $pdo->prepare("INSERT INTO users (full_name, email, phone, password_hash, role, is_active) VALUES (?, ?, ?, ?, 'customer', 1)");
    $success = $insertStmt->execute([$fullName, $email, $phone, $passwordHash]);

    if ($success) {
        $userId = $pdo->lastInsertId();
        echo json_encode([
            'status' => 'success',
            'message' => "Welcome to INEZA RESTO & COFFEE SHOP, $fullName! Your customer account has been created successfully.",
            'user' => [
                'id' => $userId,
                'full_name' => $fullName,
                'email' => $email,
                'phone' => $phone,
                'address' => null,
                'role' => 'customer'
            ]
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to create user account. Please try again.']);
    }
    exit;

} elseif ($action === 'login') {
    $loginIdentifier = isset($data['email']) ? trim($data['email']) : (isset($data['phone']) ? trim($data['phone']) : '');
    $password = isset($data['password']) ? trim($data['password']) : (isset($data['pass']) ? trim($data['pass']) : '');

    if (empty($loginIdentifier) || empty($password)) {
        echo json_encode(['status' => 'error', 'message' => 'Please enter both email/phone and password.']);
        exit;
    }

    // Query user by email or phone from MySQL users table
    $cleanIdent = str_replace([' ', '-', '(', ')'], '', $loginIdentifier);
    $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = ? OR (phone IS NOT NULL AND phone != '' AND (phone = ? OR REPLACE(phone, ' ', '') = ?)) LIMIT 1");
    $stmt->execute([strtolower($loginIdentifier), $loginIdentifier, $cleanIdent]);
    $user = $stmt->fetch();

    // 1. User not found in DB
    if (!$user) {
        echo json_encode(['status' => 'error', 'message' => 'User not found in our database. Please register an account first!']);
        exit;
    }

    // 2. Account deactivated check
    if (isset($user['is_active']) && (int)$user['is_active'] === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Account is deactivated. Please contact support.']);
        exit;
    }

    // 3. Password verification
    if (!password_verify($password, $user['password_hash']) && $password !== $user['password_hash']) {
        echo json_encode(['status' => 'error', 'message' => 'Incorrect password! Please check your details and try again.']);
        exit;
    }

    // Success
    echo json_encode([
        'status' => 'success',
        'message' => "Welcome back, {$user['full_name']}! You are now logged in to place orders.",
        'user' => [
            'id' => $user['id'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'address' => isset($user['address']) ? $user['address'] : '',
            'avatar' => isset($user['avatar']) ? $user['avatar'] : '',
            'role' => $user['role']
        ]
    ]);
    exit;

} elseif ($action === 'verify' || $action === 'get_profile') {
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : (isset($data['id']) ? (int)$data['id'] : 0);
    $email = isset($data['email']) ? strtolower(trim($data['email'])) : '';

    if ($userId > 0) {
        $stmt = $pdo->prepare("SELECT id, full_name, email, phone, address, avatar, role FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$userId]);
    } else if (!empty($email)) {
        $stmt = $pdo->prepare("SELECT id, full_name, email, phone, address, avatar, role FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
    } else {
        echo json_encode(['valid' => false, 'status' => 'error', 'message' => 'User identifier required']);
        exit;
    }

    $user = $stmt->fetch();
    if ($user) {
        echo json_encode([
            'valid' => true,
            'status' => 'success',
            'user' => [
                'id' => $user['id'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'phone' => $user['phone'],
                'address' => isset($user['address']) ? $user['address'] : '',
                'avatar' => isset($user['avatar']) ? $user['avatar'] : '',
                'role' => $user['role']
            ]
        ]);
    } else {
        echo json_encode(['valid' => false, 'status' => 'error', 'message' => 'User not found']);
    }
    exit;

} elseif ($action === 'update_profile') {
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : (isset($data['id']) ? (int)$data['id'] : 0);
    $currentEmail = isset($data['current_email']) ? strtolower(trim($data['current_email'])) : '';
    
    $fullName = isset($data['full_name']) ? trim($data['full_name']) : (isset($data['name']) ? trim($data['name']) : null);
    $email = isset($data['email']) ? strtolower(trim($data['email'])) : null;
    $phone = isset($data['phone']) ? trim($data['phone']) : null;
    $address = isset($data['address']) ? trim($data['address']) : null;
    $avatar = isset($data['avatar']) ? trim($data['avatar']) : null;

    if ($userId <= 0 && !empty($currentEmail)) {
        $stmtFind = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmtFind->execute([$currentEmail]);
        $row = $stmtFind->fetch();
        if ($row) $userId = (int)$row['id'];
    }

    if ($userId <= 0) {
        if (!empty($email)) {
            $stmtFind = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
            $stmtFind->execute([$email]);
            $row = $stmtFind->fetch();
            if ($row) $userId = (int)$row['id'];
        }
    }

    if ($userId > 0) {
        if (!empty($email)) {
            $stmtChk = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1");
            $stmtChk->execute([$email, $userId]);
            if ($stmtChk->fetch()) {
                echo json_encode(['status' => 'error', 'message' => 'Email address is already in use by another account.']);
                exit;
            }
        }

        $fields = [];
        $params = [];

        if ($fullName !== null) { $fields[] = "`full_name` = ?"; $params[] = $fullName; }
        if ($email !== null) { $fields[] = "`email` = ?"; $params[] = $email; }
        if ($phone !== null) { $fields[] = "`phone` = ?"; $params[] = $phone; }
        if ($address !== null) { $fields[] = "`address` = ?"; $params[] = $address; }
        if ($avatar !== null) { $fields[] = "`avatar` = ?"; $params[] = $avatar; }

        if (!empty($fields)) {
            $params[] = $userId;
            $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
            $upStmt = $pdo->prepare($sql);
            $upStmt->execute($params);
        }

        $fetchStmt = $pdo->prepare("SELECT id, full_name, email, phone, address, avatar, role FROM users WHERE id = ? LIMIT 1");
        $fetchStmt->execute([$userId]);
        $updatedUser = $fetchStmt->fetch();

        echo json_encode([
            'status' => 'success',
            'message' => 'Profile updated successfully!',
            'user' => [
                'id' => $updatedUser['id'],
                'full_name' => $updatedUser['full_name'],
                'email' => $updatedUser['email'],
                'phone' => $updatedUser['phone'],
                'address' => isset($updatedUser['address']) ? $updatedUser['address'] : '',
                'avatar' => isset($updatedUser['avatar']) ? $updatedUser['avatar'] : '',
                'role' => $updatedUser['role']
            ]
        ]);
    } else {
        echo json_encode([
            'status' => 'success',
            'message' => 'Profile updated locally!',
            'user' => [
                'full_name' => $fullName ?? 'Customer',
                'email' => $email ?? '',
                'phone' => $phone ?? '',
                'address' => $address ?? '',
                'avatar' => $avatar ?? ''
            ]
        ]);
    }
    exit;

} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid action specification.']);
    exit;
}
?>
