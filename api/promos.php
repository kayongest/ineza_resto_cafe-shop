<?php
/* ============================================================
   INEZA RESTO & COFFEE SHOP - PROMOS & BANNERS CRUD API
   ============================================================ */
require_once __DIR__ . '/db.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) $data = $_POST;

$action = isset($_GET['action']) ? $_GET['action'] : (isset($data['action']) ? $data['action'] : 'get');

$jsonPath = __DIR__ . '/promos.json';

// Auto-create table if MySQL available
if ($pdo) {
    try {
        $tableSql = "
        CREATE TABLE IF NOT EXISTS `promos` (
          `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `title` varchar(255) NOT NULL,
          `subtitle` varchar(255) DEFAULT '',
          `discount` varchar(50) DEFAULT '',
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
                ['*for All Menus', 'Happy Weekend', '60% OFF', 'img/menu/7.jpg', 1],
                ['Fresh Salads', 'Healthy & Green', '20%', 'img/menu/3.png', 2],
                ['Coffee & Pastries', 'Morning Special', '15%', 'img/menu/5.jpg', 3]
            ];
            $stmt = $pdo->prepare("INSERT INTO promos (title, subtitle, discount, img, sort_order) VALUES (?, ?, ?, ?, ?)");
            foreach ($defaultPromos as $p) {
                $stmt->execute([$p[0], $p[1], $p[2], $p[3], $p[4]]);
            }
        }
    } catch (PDOException $e) {}
}

if ($action === 'get') {
    $promos = [];
    $onlyActive = isset($_GET['active_only']) && $_GET['active_only'] == '1';

    if ($pdo) {
        try {
            $sql = $onlyActive ? "SELECT * FROM promos WHERE is_active = 1 ORDER BY sort_order ASC, id ASC" : "SELECT * FROM promos ORDER BY sort_order ASC, id ASC";
            $promos = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {}
    }

    if (empty($promos) && file_exists($jsonPath)) {
        $promos = json_decode(file_get_contents($jsonPath), true) ?: [];
        if ($onlyActive) {
            $promos = array_filter($promos, function($p) { return !isset($p['is_active']) || $p['is_active'] == 1; });
            $promos = array_values($promos);
        }
    }

    if (empty($promos)) {
        $promos = [
            ['id' => 1, 'title' => '*for All Menus', 'subtitle' => 'Happy Weekend', 'discount' => '60% OFF', 'img' => 'img/menu/7.jpg', 'is_active' => 1],
            ['id' => 2, 'title' => 'Fresh Salads', 'subtitle' => 'Healthy & Green', 'discount' => '20%', 'img' => 'img/menu/3.png', 'is_active' => 1],
            ['id' => 3, 'title' => 'Coffee & Pastries', 'subtitle' => 'Morning Special', 'discount' => '15%', 'img' => 'img/menu/5.jpg', 'is_active' => 1]
        ];
    }

    echo json_encode(['status' => 'success', 'promos' => $promos]);
    exit;

} elseif ($action === 'add') {
    $title = isset($data['title']) ? trim($data['title']) : '';
    $subtitle = isset($data['subtitle']) ? trim($data['subtitle']) : '';
    $discount = isset($data['discount']) ? trim($data['discount']) : '';
    $img = isset($data['img']) && trim($data['img']) !== '' ? trim($data['img']) : 'img/menu/1.jpg';

    if (empty($title)) {
        echo json_encode(['status' => 'error', 'message' => 'Promo title is required.']);
        exit;
    }

    $newId = null;
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO promos (title, subtitle, discount, img) VALUES (?, ?, ?, ?)");
            $stmt->execute([$title, $subtitle, $discount, $img]);
            $newId = $pdo->lastInsertId();
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            exit;
        }
    } else {
        $newId = time();
    }

    // Sync json file
    syncPromosJson($pdo, $jsonPath);

    echo json_encode(['status' => 'success', 'message' => 'Promo created successfully!', 'promo_id' => $newId]);
    exit;

} elseif ($action === 'update') {
    $id = isset($data['id']) ? intval($data['id']) : 0;
    $title = isset($data['title']) ? trim($data['title']) : '';
    $subtitle = isset($data['subtitle']) ? trim($data['subtitle']) : '';
    $discount = isset($data['discount']) ? trim($data['discount']) : '';
    $img = isset($data['img']) ? trim($data['img']) : '';

    if ($id <= 0 || empty($title)) {
        echo json_encode(['status' => 'error', 'message' => 'Valid ID and Title required.']);
        exit;
    }

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("UPDATE promos SET title = ?, subtitle = ?, discount = ?, img = ? WHERE id = ?");
            $stmt->execute([$title, $subtitle, $discount, $img, $id]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            exit;
        }
    }

    syncPromosJson($pdo, $jsonPath);
    echo json_encode(['status' => 'success', 'message' => 'Promo updated successfully!']);
    exit;

} elseif ($action === 'delete') {
    $id = isset($data['id']) ? intval($data['id']) : 0;
    if ($id <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Promo ID.']);
        exit;
    }

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM promos WHERE id = ?");
            $stmt->execute([$id]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            exit;
        }
    }

    syncPromosJson($pdo, $jsonPath);
    echo json_encode(['status' => 'success', 'message' => 'Promo deleted successfully!']);
    exit;
}

function syncPromosJson($pdo, $jsonPath) {
    if (!$pdo) return;
    try {
        $all = $pdo->query("SELECT * FROM promos ORDER BY sort_order ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC);
        file_put_contents($jsonPath, json_encode($all, JSON_PRETTY_PRINT));
    } catch (Exception $e) {}
}
?>
