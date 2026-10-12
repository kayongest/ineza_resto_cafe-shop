<?php
/* ============================================================
   INEZA RESTO & COFFEE SHOP - LIVE ORDERS CRUD & STAFF AUDIT API ENDPOINT
   ============================================================ */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) $data = $_POST;

$action = isset($_GET['action']) ? $_GET['action'] : (isset($data['action']) ? $data['action'] : 'get');
$jsonPath = __DIR__ . '/orders.json';

function getJsonOrders($jsonPath) {
    if (!file_exists($jsonPath)) return [];
    $content = file_get_contents($jsonPath);
    $arr = json_decode($content, true);
    return is_array($arr) ? $arr : [];
}

function saveJsonOrders($jsonPath, $orders) {
    file_put_contents($jsonPath, json_encode($orders, JSON_PRETTY_PRINT));
}

// ------------------------------------------------------------
// FILE DB ENGINE (Fallback)
// ------------------------------------------------------------
if ($pdo === null) {
    $orders = getJsonOrders($jsonPath);

    if ($action === 'get') {
        echo json_encode(['status' => 'success', 'orders' => $orders, 'source' => 'file_db']);
        exit;
    }

    if ($action === 'create') {
        $customerName = trim($data['customerName'] ?? 'Guest Customer');
        $phone = trim($data['phone'] ?? '');
        $address = trim($data['address'] ?? 'Counter');
        $serviceType = trim($data['serviceType'] ?? 'delivery');
        $itemsSummary = trim($data['itemsSummary'] ?? 'Custom Order');
        $total = floatval($data['total'] ?? 0);
        $status = trim($data['status'] ?? 'Order Received');
        $paymentMethod = trim($data['paymentMethod'] ?? 'Cash');
        $paymentStatus = trim($data['paymentStatus'] ?? $data['payment_status'] ?? 'Paid');
        $acceptedBy = trim($data['acceptedBy'] ?? 'Staff Taker');
        $preparedBy = trim($data['preparedBy'] ?? 'Head Chef');
        $servedBy = trim($data['servedBy'] ?? 'Floor Waiter');

        $newId = !empty($data['id']) ? trim($data['id']) : ('FC-' . rand(1000, 9999));
        $newOrder = [
            'id' => $newId,
            'date' => date('c'),
            'customerName' => $customerName,
            'phone' => $phone,
            'address' => $address,
            'serviceType' => $serviceType,
            'itemsSummary' => $itemsSummary,
            'total' => $total,
            'status' => $status,
            'paymentMethod' => $paymentMethod,
            'paymentStatus' => $paymentStatus,
            'payment_status' => $paymentStatus,
            'acceptedBy' => $acceptedBy,
            'preparedBy' => $preparedBy,
            'servedBy' => $servedBy,
            'isDisabled' => false
        ];

        array_unshift($orders, $newOrder);
        saveJsonOrders($jsonPath, $orders);

        echo json_encode(['status' => 'success', 'message' => 'Order created successfully', 'order' => $newOrder, 'source' => 'file_db']);
        exit;
    }

    if ($action === 'update') {
        $id = trim($data['id'] ?? '');
        if (!$id) {
            echo json_encode(['status' => 'error', 'message' => 'Order ID is required']);
            exit;
        }

        $foundIndex = -1;
        foreach ($orders as $idx => $o) {
            if ($o['id'] === $id) {
                $foundIndex = $idx;
                break;
            }
        }

        if ($foundIndex === -1) {
            echo json_encode(['status' => 'error', 'message' => 'Order not found']);
            exit;
        }

        if (isset($data['customerName'])) $orders[$foundIndex]['customerName'] = trim($data['customerName']);
        if (isset($data['phone'])) $orders[$foundIndex]['phone'] = trim($data['phone']);
        if (isset($data['address'])) $orders[$foundIndex]['address'] = trim($data['address']);
        if (isset($data['serviceType'])) $orders[$foundIndex]['serviceType'] = trim($data['serviceType']);
        if (isset($data['itemsSummary'])) $orders[$foundIndex]['itemsSummary'] = trim($data['itemsSummary']);
        if (isset($data['total'])) $orders[$foundIndex]['total'] = floatval($data['total']);
        if (isset($data['status'])) $orders[$foundIndex]['status'] = trim($data['status']);
        if (isset($data['paymentMethod'])) $orders[$foundIndex]['paymentMethod'] = trim($data['paymentMethod']);
        if (isset($data['paymentStatus'])) {
            $orders[$foundIndex]['paymentStatus'] = trim($data['paymentStatus']);
            $orders[$foundIndex]['payment_status'] = trim($data['paymentStatus']);
        } else if (isset($data['payment_status'])) {
            $orders[$foundIndex]['paymentStatus'] = trim($data['payment_status']);
            $orders[$foundIndex]['payment_status'] = trim($data['payment_status']);
        }
        if (isset($data['acceptedBy'])) $orders[$foundIndex]['acceptedBy'] = trim($data['acceptedBy']);
        if (isset($data['preparedBy'])) $orders[$foundIndex]['preparedBy'] = trim($data['preparedBy']);
        if (isset($data['servedBy'])) $orders[$foundIndex]['servedBy'] = trim($data['servedBy']);
        if (isset($data['isDisabled'])) $orders[$foundIndex]['isDisabled'] = (bool)$data['isDisabled'];

        saveJsonOrders($jsonPath, $orders);
        echo json_encode(['status' => 'success', 'message' => 'Order updated successfully', 'order' => $orders[$foundIndex], 'source' => 'file_db']);
        exit;
    }

    if ($action === 'disable' || $action === 'archive') {
        $id = trim($data['id'] ?? $_GET['id'] ?? '');
        if (!$id) {
            echo json_encode(['status' => 'error', 'message' => 'Order ID required']);
            exit;
        }

        foreach ($orders as &$o) {
            if ($o['id'] === $id) {
                $o['isDisabled'] = true;
                $o['status'] = 'Disabled / Archived';
                break;
            }
        }
        saveJsonOrders($jsonPath, $orders);
        echo json_encode(['status' => 'success', 'message' => 'Order archived/disabled for reporting', 'source' => 'file_db']);
        exit;
    }

    if ($action === 'delete') {
        $id = trim($data['id'] ?? $_GET['id'] ?? '');
        if (!$id) {
            echo json_encode(['status' => 'error', 'message' => 'Order ID is required']);
            exit;
        }

        // Soft delete / archive fallback
        foreach ($orders as &$o) {
            if ($o['id'] === $id) {
                $o['isDisabled'] = true;
                $o['status'] = 'Disabled / Archived';
                break;
            }
        }
        saveJsonOrders($jsonPath, $orders);
        echo json_encode(['status' => 'success', 'message' => 'Order archived successfully', 'source' => 'file_db']);
        exit;
    }

    if ($action === 'clear_all' || $action === 'clear') {
        saveJsonOrders($jsonPath, []);
        echo json_encode(['status' => 'success', 'message' => 'All orders cleared successfully', 'source' => 'file_db']);
        exit;
    }
}

// ------------------------------------------------------------
// MYSQL DB ENGINE
// ------------------------------------------------------------
try {
    $tableSql = "
    CREATE TABLE IF NOT EXISTS `orders` (
      `id` varchar(50) NOT NULL PRIMARY KEY,
      `date` datetime DEFAULT CURRENT_TIMESTAMP,
      `customer_name` varchar(100) NOT NULL,
      `phone` varchar(50) DEFAULT NULL,
      `address` varchar(255) DEFAULT NULL,
      `service_type` varchar(50) DEFAULT 'delivery',
      `items_summary` text NOT NULL,
      `total` decimal(10,2) NOT NULL DEFAULT 0.00,
      `status` varchar(50) DEFAULT 'Order Received',
      `payment_method` varchar(50) DEFAULT 'Cash',
      `payment_status` varchar(50) DEFAULT 'Paid',
      `accepted_by` varchar(100) DEFAULT 'Staff Taker',
      `prepared_by` varchar(100) DEFAULT 'Head Chef',
      `served_by` varchar(100) DEFAULT 'Floor Waiter',
      `is_disabled` tinyint(1) DEFAULT 0,
      `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($tableSql);

    // Auto-migrate missing columns if table existed
    try { $pdo->exec("ALTER TABLE `orders` ADD COLUMN `payment_status` varchar(50) DEFAULT 'Paid'"); } catch (PDOException $ex) {}
    try { $pdo->exec("ALTER TABLE `orders` ADD COLUMN `accepted_by` varchar(100) DEFAULT 'Staff Taker'"); } catch (PDOException $ex) {}
    try { $pdo->exec("ALTER TABLE `orders` ADD COLUMN `prepared_by` varchar(100) DEFAULT 'Head Chef'"); } catch (PDOException $ex) {}
    try { $pdo->exec("ALTER TABLE `orders` ADD COLUMN `served_by` varchar(100) DEFAULT 'Floor Waiter'"); } catch (PDOException $ex) {}
    try { $pdo->exec("ALTER TABLE `orders` ADD COLUMN `is_disabled` tinyint(1) DEFAULT 0"); } catch (PDOException $ex) {}

    // Seed if empty
    $count = $pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
    if ($count == 0) {
        $initialOrders = getJsonOrders($jsonPath);
        if (!empty($initialOrders)) {
            $stmt = $pdo->prepare("INSERT INTO orders (id, date, customer_name, phone, address, service_type, items_summary, total, status, payment_method, payment_status, accepted_by, prepared_by, served_by, is_disabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($initialOrders as $o) {
                $stmt->execute([
                    $o['id'],
                    date('Y-m-d H:i:s', strtotime($o['date'] ?? 'now')),
                    $o['customerName'],
                    $o['phone'] ?? '',
                    $o['address'] ?? '',
                    $o['serviceType'] ?? 'delivery',
                    $o['itemsSummary'],
                    $o['total'] ?? 0,
                    $o['status'] ?? 'Order Received',
                    $o['paymentMethod'] ?? 'Cash',
                    $o['paymentStatus'] ?? $o['payment_status'] ?? 'Paid',
                    $o['acceptedBy'] ?? 'Staff Taker',
                    $o['preparedBy'] ?? 'Head Chef',
                    $o['servedBy'] ?? 'Floor Waiter',
                    !empty($o['isDisabled']) ? 1 : 0
                ]);
            }
        }
    }
} catch (PDOException $e) {}

if ($action === 'get') {
    try {
        $stmt = $pdo->query("SELECT id, date, customer_name as customerName, phone, address, service_type as serviceType, items_summary as itemsSummary, total, status, payment_method as paymentMethod, payment_status as paymentStatus, accepted_by as acceptedBy, prepared_by as preparedBy, served_by as servedBy, is_disabled as isDisabled FROM orders ORDER BY date DESC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['isDisabled'] = (bool)$r['isDisabled'];
        }
        echo json_encode(['status' => 'success', 'orders' => $rows, 'source' => 'mysql']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'create') {
    $customerName = trim($data['customerName'] ?? 'Guest Customer');
    $phone = trim($data['phone'] ?? '');
    $address = trim($data['address'] ?? 'Counter');
    $serviceType = trim($data['serviceType'] ?? 'delivery');
    $itemsSummary = trim($data['itemsSummary'] ?? 'Custom Order');
    $total = floatval($data['total'] ?? 0);
    $status = trim($data['status'] ?? 'Order Received');
    $paymentMethod = trim($data['paymentMethod'] ?? 'Cash');
    $paymentStatus = trim($data['paymentStatus'] ?? $data['payment_status'] ?? 'Paid');
    $acceptedBy = trim($data['acceptedBy'] ?? 'Staff Taker');
    $preparedBy = trim($data['preparedBy'] ?? 'Head Chef');
    $servedBy = trim($data['servedBy'] ?? 'Floor Waiter');

    $newId = !empty($data['id']) ? trim($data['id']) : ('FC-' . rand(1000, 9999));
    $now = date('Y-m-d H:i:s');

    try {
        $stmt = $pdo->prepare("INSERT INTO orders (id, date, customer_name, phone, address, service_type, items_summary, total, status, payment_method, payment_status, accepted_by, prepared_by, served_by, is_disabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)");
        $stmt->execute([$newId, $now, $customerName, $phone, $address, $serviceType, $itemsSummary, $total, $status, $paymentMethod, $paymentStatus, $acceptedBy, $preparedBy, $servedBy]);

        $newOrder = [
            'id' => $newId,
            'date' => date('c'),
            'customerName' => $customerName,
            'phone' => $phone,
            'address' => $address,
            'serviceType' => $serviceType,
            'itemsSummary' => $itemsSummary,
            'total' => $total,
            'status' => $status,
            'paymentMethod' => $paymentMethod,
            'paymentStatus' => $paymentStatus,
            'acceptedBy' => $acceptedBy,
            'preparedBy' => $preparedBy,
            'servedBy' => $servedBy,
            'isDisabled' => false
        ];

        echo json_encode(['status' => 'success', 'message' => 'Order created successfully', 'order' => $newOrder, 'source' => 'mysql']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'update') {
    $id = trim($data['id'] ?? '');
    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'Order ID is required']);
        exit;
    }

    try {
        // Fetch existing order so we only overwrite provided fields
        $stmt = $pdo->prepare("SELECT id, customer_name, phone, address, service_type, items_summary, total, status, payment_method, payment_status, accepted_by, prepared_by, served_by, is_disabled FROM orders WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            echo json_encode(['status' => 'error', 'message' => 'Order not found', 'source' => 'mysql']);
            exit;
        }

        $customerName = isset($data['customerName']) ? trim($data['customerName']) : $existing['customer_name'];
        $phone = isset($data['phone']) ? trim($data['phone']) : $existing['phone'];
        $address = isset($data['address']) ? trim($data['address']) : $existing['address'];
        $serviceType = isset($data['serviceType']) ? trim($data['serviceType']) : $existing['service_type'];
        $itemsSummary = isset($data['itemsSummary']) ? trim($data['itemsSummary']) : $existing['items_summary'];
        $total = isset($data['total']) ? floatval($data['total']) : floatval($existing['total']);
        $status = isset($data['status']) ? trim($data['status']) : $existing['status'];
        $paymentMethod = isset($data['paymentMethod']) ? trim($data['paymentMethod']) : $existing['payment_method'];
        $paymentStatus = isset($data['paymentStatus']) ? trim($data['paymentStatus']) : (isset($data['payment_status']) ? trim($data['payment_status']) : ($existing['payment_status'] ?? 'Paid'));
        $acceptedBy = isset($data['acceptedBy']) ? trim($data['acceptedBy']) : $existing['accepted_by'];
        $preparedBy = isset($data['preparedBy']) ? trim($data['preparedBy']) : $existing['prepared_by'];
        $servedBy = isset($data['servedBy']) ? trim($data['servedBy']) : $existing['served_by'];
        $isDisabled = isset($data['isDisabled']) ? (!empty($data['isDisabled']) ? 1 : 0) : (!empty($existing['is_disabled']) ? 1 : 0);

        $updateStmt = $pdo->prepare("UPDATE orders SET customer_name = ?, phone = ?, address = ?, service_type = ?, items_summary = ?, total = ?, status = ?, payment_method = ?, payment_status = ?, accepted_by = ?, prepared_by = ?, served_by = ?, is_disabled = ? WHERE id = ?");
        $updateStmt->execute([
            $customerName,
            $phone,
            $address,
            $serviceType,
            $itemsSummary,
            $total,
            $status,
            $paymentMethod,
            $paymentStatus,
            $acceptedBy,
            $preparedBy,
            $servedBy,
            $isDisabled,
            $id
        ]);

        echo json_encode(['status' => 'success', 'message' => 'Order updated successfully', 'source' => 'mysql']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'disable' || $action === 'archive' || $action === 'delete') {
    $id = trim($data['id'] ?? $_GET['id'] ?? '');
    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'Order ID required']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE orders SET is_disabled = 1, status = 'Disabled / Archived' WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['status' => 'success', 'message' => 'Order archived/disabled for reporting', 'source' => 'mysql']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'clear_all' || $action === 'clear') {
    try {
        $pdo->exec("TRUNCATE TABLE orders");
        saveJsonOrders($jsonPath, []);
        echo json_encode(['status' => 'success', 'message' => 'All orders cleared successfully', 'source' => 'mysql']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
?>
