<?php
/* ============================================================
   FAVORITE CAFE - PROMOS & BANNERS CRUD API ENDPOINT (MySQL + File DB Engine)
   ============================================================ */
require_once __DIR__ . '/db.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) $data = $_POST;

$action = isset($_GET['action']) ? $_GET['action'] : (isset($data['action']) ? $data['action'] : 'get');

$jsonPath = __DIR__ . '/promos.json';

// File DB Fallback if MySQL offline
if ($pdo === null) {
    $promos = file_exists($jsonPath) ? json_decode(file_get_contents($jsonPath), true) : [];
    if (!is_array($promos) || count($promos) === 0) {
        $promos = [
            ['id' => 1, 'title' => 'Order Salmon Steak Today', 'subtitle' => 'And Save Up To', 'discount' => '35%', 'img' => 'img/menu/6.jpg', 'is_active' => 1, 'sort_order' => 1],
            ['id' => 2, 'title' => 'Fresh Salads', 'subtitle' => 'Healthy & Green', 'discount' => '20%', 'img' => 'img/menu/1.jpg', 'is_active' => 1, 'sort_order' => 2],
            ['id' => 3, 'title' => 'Coffee & Pastries', 'subtitle' => 'Morning Special', 'discount' => '15%', 'img' => 'img/menu/4.jpg', 'is_active' => 1, 'sort_order' => 3]
        ];
        @file_put_contents($jsonPath, json_encode($promos, JSON_PRETTY_PRINT));
    }

    if ($action === 'get') {
        $activeOnly = isset($_GET['active_only']) && $_GET['active_only'] == '1';
        $filtered = $activeOnly ? array_values(array_filter($promos, function($p) { return !isset($p['is_active']) || $p['is_active'] == 1; })) : $promos;
        echo json_encode(['status' => 'success', 'promos' => $filtered, 'source' => 'file_db']);
        exit;
    }
}

// Auto-create & migrate promos table
try {
    $tableSql = "
    CREATE TABLE IF NOT EXISTS `promos` (
      `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      `title` varchar(150) NOT NULL,
      `subtitle` varchar(150) NOT NULL,
      `discount` varchar(50) NOT NULL,
      `img` varchar(255) NOT NULL,
      `is_active` tinyint(1) DEFAULT 1,
      `sort_order` int(11) DEFAULT 0,
      `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($tableSql);

    $count = $pdo->query("SELECT COUNT(*) FROM promos")->fetchColumn();
    if ($count == 0) {
        $defaultPromos = [
            ['title' => 'Order Salmon Steak Today', 'subtitle' => 'And Save Up To', 'discount' => '35%', 'img' => 'img/menu/6.jpg', 'is_active' => 1, 'sort_order' => 1],
            ['title' => 'Fresh Salads', 'subtitle' => 'Healthy & Green', 'discount' => '20%', 'img' => 'img/menu/1.jpg', 'is_active' => 1, 'sort_order' => 2],
            ['title' => 'Coffee & Pastries', 'subtitle' => 'Morning Special', 'discount' => '15%', 'img' => 'img/menu/4.jpg', 'is_active' => 1, 'sort_order' => 3]
        ];
        $stmt = $pdo->prepare("INSERT INTO promos (title, subtitle, discount, img, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($defaultPromos as $p) {
            $stmt->execute([$p['title'], $p['subtitle'], $p['discount'], $p['img'], $p['is_active'], $p['sort_order']]);
        }
    }
} catch (PDOException $e) {}

if ($action === 'get') {
    $onlyActive = isset($_GET['active_only']) && $_GET['active_only'] == '1';
    $sql = $onlyActive ? "SELECT * FROM promos WHERE is_active = 1 ORDER BY sort_order ASC, id DESC" : "SELECT * FROM promos ORDER BY sort_order ASC, id DESC";
    $stmt = $pdo->query($sql);
    $promos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['status' => 'success', 'promos' => $promos]);
    exit;

} elseif ($action === 'save') {
    $id = isset($data['id']) ? intval($data['id']) : 0;
    $title = isset($data['title']) ? trim($data['title']) : '';
    $subtitle = isset($data['subtitle']) ? trim($data['subtitle']) : '';
    $discount = isset($data['discount']) ? trim($data['discount']) : '';
    $img = isset($data['img']) && trim($data['img']) !== '' ? trim($data['img']) : 'img/promo/promoBanner.png';
    $isActive = isset($data['is_active']) ? intval($data['is_active']) : 1;
    $sortOrder = isset($data['sort_order']) ? intval($data['sort_order']) : 0;

    if (empty($title) || empty($discount)) {
        echo json_encode(['status' => 'error', 'message' => 'Title and Discount text are required.']);
        exit;
    }

    try {
        if ($id > 0) {
            $stmt = $pdo->prepare("UPDATE promos SET title = ?, subtitle = ?, discount = ?, img = ?, is_active = ?, sort_order = ? WHERE id = ?");
            $stmt->execute([$title, $subtitle, $discount, $img, $isActive, $sortOrder, $id]);
            $promoId = $id;
            $msg = 'Promo updated successfully!';
        } else {
            $stmt = $pdo->prepare("INSERT INTO promos (title, subtitle, discount, img, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$title, $subtitle, $discount, $img, $isActive, $sortOrder]);
            $promoId = $pdo->lastInsertId();
            $msg = 'Promo created successfully!';
        }

        echo json_encode(['status' => 'success', 'message' => $msg, 'id' => $promoId]);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;

} elseif ($action === 'toggle') {
    $id = isset($data['id']) ? intval($data['id']) : (isset($_GET['id']) ? intval($_GET['id']) : (isset($_POST['id']) ? intval($_POST['id']) : 0));
    if ($id <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Promo ID.']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE promos SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['status' => 'success', 'message' => 'Promo status toggled successfully!']);
    exit;

} elseif ($action === 'delete') {
    $id = isset($data['id']) ? intval($data['id']) : (isset($_GET['id']) ? intval($_GET['id']) : (isset($_POST['id']) ? intval($_POST['id']) : 0));
    if ($id <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Promo ID.']);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM promos WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['status' => 'success', 'message' => 'Promo deleted successfully!']);
    exit;
}
?>
