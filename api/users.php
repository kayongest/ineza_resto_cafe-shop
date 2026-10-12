<?php
/* ============================================================
   INEZA RESTO & COFFEE SHOP - USERS & ROLES/PERMISSIONS API
   ============================================================ */
require_once __DIR__ . '/db.php';

// Accept both JSON payload and $_POST / $_GET data
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

$action = isset($_GET['action']) ? $_GET['action'] : (isset($data['action']) ? $data['action'] : 'list');

if ($action === 'list') {
    // List all users or filtered by role / search term
    $roleFilter = isset($_GET['role']) ? trim($_GET['role']) : (isset($data['role']) ? trim($data['role']) : '');
    $search = isset($_GET['q']) ? trim($_GET['q']) : (isset($data['q']) ? trim($data['q']) : '');

    try {
        $sql = "SELECT id, full_name, email, phone, address, role, permissions, loyalty_points, is_active, created_at FROM users WHERE 1=1";
        $params = [];

        if (!empty($roleFilter)) {
            if ($roleFilter === 'staff_only') {
                $sql .= " AND role IN ('admin', 'staff', 'chef', 'waiter', 'cashier')";
            } elseif ($roleFilter === 'customer_only') {
                $sql .= " AND (role = 'customer' OR role IS NULL)";
            } else {
                $sql .= " AND role = ?";
                $params[] = $roleFilter;
            }
        }

        if (!empty($search)) {
            $sql .= " AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)";
            $searchTerm = '%' . $search . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        $sql .= " ORDER BY created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Separate into staff and customers for easy consumption
        $staff = [];
        $customers = [];
        foreach ($users as $u) {
            $u['id'] = (int)$u['id'];
            $u['is_active'] = (int)$u['is_active'];
            $u['loyalty_points'] = (int)($u['loyalty_points'] ?? 0);
            if (in_array($u['role'], ['admin', 'staff', 'chef', 'waiter', 'cashier'])) {
                $staff[] = $u;
            } else {
                $customers[] = $u;
            }
        }

        echo json_encode([
            'status' => 'success',
            'total' => count($users),
            'staff' => $staff,
            'customers' => $customers,
            'users' => $users
        ]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;

} elseif ($action === 'create_staff') {
    $fullName = trim($data['full_name'] ?? $data['name'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $phone = trim($data['phone'] ?? '');
    $role = trim($data['role'] ?? 'staff');
    $password = trim($data['password'] ?? $data['pass'] ?? 'staff123');
    $permissions = trim($data['permissions'] ?? '');

    if (empty($fullName) || empty($phone)) {
        echo json_encode(['status' => 'error', 'message' => 'Please provide full name and phone number.']);
        exit;
    }

    if (empty($email)) {
        // Auto-generate staff email identifier if not provided
        $cleanName = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $fullName));
        $email = $cleanName . rand(10, 99) . '@ineza.rw';
    }

    // Check duplicate
    $chkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1");
    $chkStmt->execute([$email, $phone]);
    if ($chkStmt->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'A user account with this email or phone number already exists!']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    try {
        $stmt = $pdo->prepare("INSERT INTO users (full_name, email, phone, role, permissions, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
        $stmt->execute([$fullName, $email, $phone, $role, $permissions, $passwordHash]);
        $newId = (int)$pdo->lastInsertId();

        echo json_encode([
            'status' => 'success',
            'message' => "Staff member '$fullName' created successfully with role '$role'!",
            'staff' => [
                'id' => $newId,
                'full_name' => $fullName,
                'email' => $email,
                'phone' => $phone,
                'role' => $role,
                'permissions' => $permissions,
                'is_active' => 1
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;

} elseif ($action === 'create_customer') {
    $fullName = trim($data['full_name'] ?? $data['name'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $phone = trim($data['phone'] ?? '');
    $address = trim($data['address'] ?? '');
    $loyaltyPoints = (int)($data['loyalty_points'] ?? 0);
    $password = trim($data['password'] ?? 'ineza2026');

    if (empty($fullName) || empty($phone)) {
        echo json_encode(['status' => 'error', 'message' => 'Please provide customer name and phone number.']);
        exit;
    }

    if (empty($email)) {
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        $email = 'cust_' . substr($cleanPhone, -6) . '@ineza.rw';
    }

    // Check duplicate email or phone
    $chkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1");
    $chkStmt->execute([$email, $phone]);
    if ($chkStmt->fetch()) {
        echo json_encode(['status' => 'error', 'message' => 'A user account with this email or phone number already exists!']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    try {
        $stmt = $pdo->prepare("INSERT INTO users (full_name, email, phone, address, role, loyalty_points, password_hash, is_active) VALUES (?, ?, ?, ?, 'customer', ?, ?, 1)");
        $stmt->execute([$fullName, $email, $phone, $address, $loyaltyPoints, $passwordHash]);
        $newId = (int)$pdo->lastInsertId();

        echo json_encode([
            'status' => 'success',
            'message' => "Customer account '$fullName' created successfully!",
            'customer' => [
                'id' => $newId,
                'full_name' => $fullName,
                'email' => $email,
                'phone' => $phone,
                'address' => $address,
                'loyalty_points' => $loyaltyPoints,
                'role' => 'customer',
                'is_active' => 1
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;

} elseif ($action === 'get_customer' || $action === 'get') {
    $userId = (int)($data['id'] ?? $data['user_id'] ?? $_GET['id'] ?? 0);
    if ($userId <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Valid User ID required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, full_name, email, phone, address, role, loyalty_points, is_active, created_at FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode(['status' => 'error', 'message' => 'Customer not found.']);
            exit;
        }

        echo json_encode([
            'status' => 'success',
            'customer' => $user
        ]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;

} elseif ($action === 'update_customer') {
    $userId = (int)($data['id'] ?? $data['user_id'] ?? 0);
    $fullName = isset($data['full_name']) ? trim($data['full_name']) : (isset($data['name']) ? trim($data['name']) : null);
    $email = isset($data['email']) ? strtolower(trim($data['email'])) : null;
    $phone = isset($data['phone']) ? trim($data['phone']) : null;
    $address = isset($data['address']) ? trim($data['address']) : null;
    $loyaltyPoints = isset($data['loyalty_points']) ? (int)$data['loyalty_points'] : null;
    $password = isset($data['password']) ? trim($data['password']) : '';

    if ($userId <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Valid Customer ID required.']);
        exit;
    }

    // Check duplicate email or phone against other users
    if (!empty($email) || !empty($phone)) {
        $chk = $pdo->prepare("SELECT id FROM users WHERE (email = ? OR (phone IS NOT NULL AND phone != '' AND phone = ?)) AND id != ? LIMIT 1");
        $chk->execute([$email ?? '', $phone ?? '', $userId]);
        if ($chk->fetch()) {
            echo json_encode(['status' => 'error', 'message' => 'Another account is already using this email or phone number.']);
            exit;
        }
    }

    $fields = [];
    $params = [];

    if ($fullName !== null) { $fields[] = "full_name = ?"; $params[] = $fullName; }
    if ($email !== null) { $fields[] = "email = ?"; $params[] = $email; }
    if ($phone !== null) { $fields[] = "phone = ?"; $params[] = $phone; }
    if ($address !== null) { $fields[] = "address = ?"; $params[] = $address; }
    if ($loyaltyPoints !== null) { $fields[] = "loyalty_points = ?"; $params[] = $loyaltyPoints; }
    if (!empty($password) && $password !== '••••••••') {
        $fields[] = "password_hash = ?";
        $params[] = password_hash($password, PASSWORD_BCRYPT);
    }

    if (!empty($fields)) {
        $params[] = $userId;
        $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode([
                'status' => 'success',
                'message' => 'Customer account details updated successfully!'
            ]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['status' => 'success', 'message' => 'No changes made.']);
    }
    exit;

} elseif ($action === 'update_role') {
    $userId = (int)($data['id'] ?? $data['user_id'] ?? 0);
    $newRole = trim($data['role'] ?? '');
    $permissions = isset($data['permissions']) ? trim($data['permissions']) : null;

    if ($userId <= 0 || empty($newRole)) {
        echo json_encode(['status' => 'error', 'message' => 'User ID and Role are required.']);
        exit;
    }

    try {
        if ($permissions !== null) {
            $stmt = $pdo->prepare("UPDATE users SET role = ?, permissions = ? WHERE id = ?");
            $stmt->execute([$newRole, $permissions, $userId]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
            $stmt->execute([$newRole, $userId]);
        }

        echo json_encode([
            'status' => 'success',
            'message' => "User role updated to '$newRole' successfully!"
        ]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;

} elseif ($action === 'toggle_status') {
    $userId = (int)($data['id'] ?? $data['user_id'] ?? 0);
    if ($userId <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Valid User ID required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT is_active, full_name FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) {
            echo json_encode(['status' => 'error', 'message' => 'User not found.']);
            exit;
        }

        $newStatus = ((int)$user['is_active'] === 1) ? 0 : 1;
        $up = $pdo->prepare("UPDATE users SET is_active = ? WHERE id = ?");
        $up->execute([$newStatus, $userId]);

        $statusLabel = $newStatus === 1 ? 'activated' : 'deactivated/suspended';
        echo json_encode([
            'status' => 'success',
            'is_active' => $newStatus,
            'message' => "Account for {$user['full_name']} has been $statusLabel."
        ]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;

} elseif ($action === 'grant_points') {
    $userId = (int)($data['id'] ?? $data['user_id'] ?? 0);
    $points = (int)($data['points'] ?? 0);

    if ($userId <= 0 || $points == 0) {
        echo json_encode(['status' => 'error', 'message' => 'User ID and non-zero Points amount are required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE users SET loyalty_points = GREATEST(0, COALESCE(loyalty_points, 0) + ?) WHERE id = ?");
        $stmt->execute([$points, $userId]);

        $f = $pdo->prepare("SELECT id, full_name, loyalty_points FROM users WHERE id = ? LIMIT 1");
        $f->execute([$userId]);
        $user = $f->fetch();

        echo json_encode([
            'status' => 'success',
            'message' => "Granted $points points to {$user['full_name']}! New Balance: {$user['loyalty_points']} Pts.",
            'loyalty_points' => (int)$user['loyalty_points']
        ]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;

} elseif ($action === 'delete') {
    $userId = (int)($data['id'] ?? $data['user_id'] ?? 0);
    if ($userId <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Valid User ID required.']);
        exit;
    }

    // Do not delete primary administrator
    if ($userId === 1) {
        echo json_encode(['status' => 'error', 'message' => 'Primary system administrator account cannot be deleted!']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        echo json_encode([
            'status' => 'success',
            'message' => "User account has been deleted successfully."
        ]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;

} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid action specification.']);
    exit;
}
?>
