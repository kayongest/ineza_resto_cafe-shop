<?php
/* ============================================================
   FAVORITE CAFE - MENU CRUD API ENDPOINT (MySQL + File DB Engine)
   ============================================================ */
require_once __DIR__ . '/db.php';

// Accept both JSON payload and POST/GET data
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) $data = $_POST;

$action = isset($_GET['action']) ? $_GET['action'] : (isset($data['action']) ? $data['action'] : 'get');

// ============================================================
// 1. FAIL-SAFE FILE DATABASE ENGINE (Used when MySQL is offline)
// ============================================================
if ($pdo === null) {
    $jsonPath = __DIR__ . '/menu.json';
    $jsonItems = file_exists($jsonPath) ? json_decode(file_get_contents($jsonPath), true) : [];
    if (!is_array($jsonItems)) $jsonItems = [];

    if ($action === 'get') {
        echo json_encode(['status' => 'success', 'items' => $jsonItems, 'source' => 'file_db']);
        exit;

    } elseif ($action === 'add') {
        $title = isset($data['title']) ? trim($data['title']) : '';
        $category = isset($data['category']) ? trim($data['category']) : 'burgers';
        $menuType = isset($data['menu_type']) && trim($data['menu_type']) !== '' ? trim($data['menu_type']) : 'lunch';
        $price = isset($data['price']) ? parseFloat($data['price']) : 0;
        $oldPrice = isset($data['old_price']) && $data['old_price'] !== '' ? parseFloat($data['old_price']) : null;
        $image = isset($data['image']) && trim($data['image']) !== '' ? trim($data['image']) : 'img/menu/1.jpg';
        $calories = isset($data['calories']) ? intval($data['calories']) : 400;
        $prepTime = isset($data['prep_time']) ? intval($data['prep_time']) : 15;
        $rating = isset($data['rating']) ? floatval($data['rating']) : 5.0;
        $reviewsCount = isset($data['reviews']) ? intval($data['reviews']) : (isset($data['reviews_count']) ? intval($data['reviews_count']) : 12);
        $description = isset($data['description']) ? trim($data['description']) : '';
        $tags = isset($data['tags']) ? trim($data['tags']) : 'Popular';

        if (empty($title) || $price <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Please provide a valid dish title and price.']);
            exit;
        }

        $newId = time();
        $newItem = [
            'id' => $newId,
            'title' => $title,
            'category' => $category,
            'menu_type' => $menuType,
            'price' => $price,
            'old_price' => $oldPrice,
            'image' => $image,
            'calories' => $calories,
            'prep_time' => $prepTime,
            'rating' => $rating,
            'reviews_count' => $reviewsCount,
            'description' => $description,
            'tags' => $tags,
            'is_available' => 1
        ];

        array_unshift($jsonItems, $newItem);
        file_put_contents($jsonPath, json_encode($jsonItems, JSON_PRETTY_PRINT));
        echo json_encode(['status' => 'success', 'message' => 'Menu item "' . $title . '" saved successfully!', 'item_id' => $newId]);
        exit;

    } elseif ($action === 'update') {
        $id = isset($data['id']) ? intval($data['id']) : 0;
        $title = isset($data['title']) ? trim($data['title']) : '';
        $category = isset($data['category']) ? trim($data['category']) : 'burgers';
        $menuType = isset($data['menu_type']) && trim($data['menu_type']) !== '' ? trim($data['menu_type']) : 'lunch';
        $price = isset($data['price']) ? parseFloat($data['price']) : 0;
        $oldPrice = isset($data['old_price']) && $data['old_price'] !== '' ? parseFloat($data['old_price']) : null;
        $image = isset($data['image']) && trim($data['image']) !== '' ? trim($data['image']) : 'img/menu/1.jpg';
        $calories = isset($data['calories']) ? intval($data['calories']) : 400;
        $prepTime = isset($data['prep_time']) ? intval($data['prep_time']) : 15;
        $rating = isset($data['rating']) ? floatval($data['rating']) : 5.0;
        $reviewsCount = isset($data['reviews']) ? intval($data['reviews']) : (isset($data['reviews_count']) ? intval($data['reviews_count']) : 12);
        $description = isset($data['description']) ? trim($data['description']) : '';
        $tags = isset($data['tags']) ? trim($data['tags']) : 'Popular';

        if (!$id || empty($title) || $price <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid menu item ID, title, or price.']);
            exit;
        }

        foreach ($jsonItems as &$item) {
            if (intval($item['id']) === intval($id)) {
                $item['title'] = $title;
                $item['category'] = $category;
                $item['menu_type'] = $menuType;
                $item['price'] = $price;
                $item['old_price'] = $oldPrice;
                $item['image'] = $image;
                $item['calories'] = $calories;
                $item['prep_time'] = $prepTime;
                $item['rating'] = $rating;
                $item['reviews_count'] = $reviewsCount;
                $item['description'] = $description;
                $item['tags'] = $tags;
                break;
            }
        }
        file_put_contents($jsonPath, json_encode($jsonItems, JSON_PRETTY_PRINT));
        echo json_encode(['status' => 'success', 'message' => 'Menu item updated successfully!']);
        exit;

    } elseif ($action === 'delete') {
        $id = isset($data['id']) ? intval($data['id']) : 0;
        $jsonItems = array_values(array_filter($jsonItems, function($i) use ($id) {
            return intval($i['id']) !== intval($id);
        }));
        file_put_contents($jsonPath, json_encode($jsonItems, JSON_PRETTY_PRINT));
        echo json_encode(['status' => 'success', 'message' => 'Menu item deleted successfully.']);
        exit;

    } elseif ($action === 'toggle_stock') {
        $id = isset($data['id']) ? intval($data['id']) : 0;
        $available = isset($data['is_available']) ? intval($data['is_available']) : 1;
        foreach ($jsonItems as &$item) {
            if (intval($item['id']) === intval($id)) {
                $item['is_available'] = $available;
                break;
            }
        }
        file_put_contents($jsonPath, json_encode($jsonItems, JSON_PRETTY_PRINT));
        echo json_encode(['status' => 'success', 'message' => 'Stock status updated.']);
        exit;
    }
}

// ============================================================
// 2. MYSQL DATABASE ENGINE
// ============================================================
try {
    $tableSql = "
    CREATE TABLE IF NOT EXISTS `menu_items` (
      `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      `title` varchar(150) NOT NULL,
      `category` varchar(50) NOT NULL,
      `price` decimal(10,2) NOT NULL,
      `old_price` decimal(10,2) DEFAULT NULL,
      `image` varchar(255) NOT NULL,
      `rating` decimal(3,1) DEFAULT 5.0,
      `reviews_count` int(11) DEFAULT 12,
      `calories` int(11) DEFAULT 350,
      `prep_time` int(11) DEFAULT 15,
      `description` text DEFAULT NULL,
      `tags` varchar(255) DEFAULT 'Popular',
      `is_available` tinyint(1) DEFAULT 1,
      `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($tableSql);

    $cols = $pdo->query("SHOW COLUMNS FROM menu_items")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('title', $cols) && in_array('name', $cols)) {
        $pdo->exec("ALTER TABLE menu_items CHANGE `name` `title` VARCHAR(150) NOT NULL");
    }
    if (!in_array('image', $cols) && in_array('image_url', $cols)) {
        $pdo->exec("ALTER TABLE menu_items CHANGE `image_url` `image` VARCHAR(255) NOT NULL");
    }
    if (!in_array('rating', $cols)) {
        $pdo->exec("ALTER TABLE menu_items ADD `rating` DECIMAL(3,1) DEFAULT 5.0");
    }
    if (!in_array('reviews_count', $cols)) {
        $pdo->exec("ALTER TABLE menu_items ADD `reviews_count` INT(11) DEFAULT 12");
    }
    if (!in_array('menu_type', $cols)) {
        $pdo->exec("ALTER TABLE menu_items ADD `menu_type` VARCHAR(50) NOT NULL DEFAULT 'lunch' AFTER category");
    }
    
} catch (PDOException $e) {}

if ($action === 'get') {
    $menuTypeFilter = isset($_GET['menu_type']) ? trim($_GET['menu_type']) : '';
    if (!empty($menuTypeFilter) && $menuTypeFilter !== 'all') {
        $stmt = $pdo->prepare("SELECT * FROM menu_items WHERE menu_type = ? OR menu_type = 'all_day' ORDER BY id ASC");
        $stmt->execute([$menuTypeFilter]);
    } else {
        $stmt = $pdo->query("SELECT * FROM menu_items ORDER BY id ASC");
    }
    $items = $stmt->fetchAll();
    if (!is_array($items) || count($items) === 0) {
        $jsonFile = __DIR__ . '/menu.json';
        if (file_exists($jsonFile)) {
            $jsonItems = json_decode(file_get_contents($jsonFile), true);
            if (is_array($jsonItems) && count($jsonItems) > 0) {
                $insStmt = $pdo->prepare("INSERT INTO menu_items (id, title, category, menu_type, price, old_price, image, rating, reviews_count, calories, prep_time, description, tags, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                foreach ($jsonItems as $item) {
                    $insStmt->execute([
                        $item['id'],
                        $item['title'],
                        $item['category'],
                        $item['menu_type'] ?? 'lunch',
                        $item['price'],
                        $item['old_price'] ?? null,
                        $item['image'],
                        $item['rating'] ?? 5.0,
                        $item['reviews_count'] ?? 50,
                        $item['calories'] ?? 350,
                        $item['prep_time'] ?? 15,
                        $item['description'] ?? '',
                        $item['tags'] ?? 'Popular',
                        $item['is_available'] ?? 1
                    ]);
                }
                $stmt = $pdo->query("SELECT * FROM menu_items ORDER BY id ASC");
                $items = $stmt->fetchAll();
            }
        }
    }
    echo json_encode(['status' => 'success', 'items' => $items]);
    exit;

} elseif ($action === 'add') {
    $title = isset($data['title']) ? trim($data['title']) : '';
    $category = isset($data['category']) ? trim($data['category']) : 'burgers';
    $menuType = isset($data['menu_type']) && trim($data['menu_type']) !== '' ? trim($data['menu_type']) : 'lunch';
    $price = isset($data['price']) ? parseFloat($data['price']) : 0;
    $oldPrice = isset($data['old_price']) && $data['old_price'] !== '' ? parseFloat($data['old_price']) : null;
    $image = isset($data['image']) && trim($data['image']) !== '' ? trim($data['image']) : 'img/menu/1.jpg';
    $calories = isset($data['calories']) ? intval($data['calories']) : 400;
    $prepTime = isset($data['prep_time']) ? intval($data['prep_time']) : 15;
    $rating = isset($data['rating']) ? floatval($data['rating']) : 5.0;
    $reviewsCount = isset($data['reviews']) ? intval($data['reviews']) : (isset($data['reviews_count']) ? intval($data['reviews_count']) : 12);
    $description = isset($data['description']) ? trim($data['description']) : '';
    $tags = isset($data['tags']) ? trim($data['tags']) : 'Popular';

    if (empty($title) || $price <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Please provide a valid dish title and price.']);
        exit;
    }

    $insertSql = "INSERT INTO menu_items (title, category, menu_type, price, old_price, image, calories, prep_time, rating, reviews_count, description, tags, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";
    $stmt = $pdo->prepare($insertSql);
    $success = $stmt->execute([$title, $category, $menuType, $price, $oldPrice, $image, $calories, $prepTime, $rating, $reviewsCount, $description, $tags]);

    if ($success) {
        $newItemId = $pdo->lastInsertId();
        syncMenuJsonFile($pdo);
        echo json_encode([
            'status' => 'success',
            'message' => 'Menu item "' . $title . '" added successfully!',
            'item_id' => $newItemId
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to add menu item.']);
    }
    exit;

} elseif ($action === 'update') {
    $id = isset($data['id']) ? intval($data['id']) : 0;
    $title = isset($data['title']) ? trim($data['title']) : '';
    $category = isset($data['category']) ? trim($data['category']) : 'burgers';
    $menuType = isset($data['menu_type']) && trim($data['menu_type']) !== '' ? trim($data['menu_type']) : 'lunch';
    $price = isset($data['price']) ? parseFloat($data['price']) : 0;
    $oldPrice = isset($data['old_price']) && $data['old_price'] !== '' ? parseFloat($data['old_price']) : null;
    $image = isset($data['image']) && trim($data['image']) !== '' ? trim($data['image']) : 'img/menu/1.jpg';
    $calories = isset($data['calories']) ? intval($data['calories']) : 400;
    $prepTime = isset($data['prep_time']) ? intval($data['prep_time']) : 15;
    $rating = isset($data['rating']) ? floatval($data['rating']) : 5.0;
    $reviewsCount = isset($data['reviews']) ? intval($data['reviews']) : (isset($data['reviews_count']) ? intval($data['reviews_count']) : 12);
    $description = isset($data['description']) ? trim($data['description']) : '';
    $tags = isset($data['tags']) ? trim($data['tags']) : 'Popular';

    if (!$id || empty($title) || $price <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid menu item ID, title, or price.']);
        exit;
    }

    $updateSql = "UPDATE menu_items SET title=?, category=?, menu_type=?, price=?, old_price=?, image=?, calories=?, prep_time=?, rating=?, reviews_count=?, description=?, tags=? WHERE id=?";
    $stmt = $pdo->prepare($updateSql);
    $success = $stmt->execute([$title, $category, $menuType, $price, $oldPrice, $image, $calories, $prepTime, $rating, $reviewsCount, $description, $tags, $id]);

    if ($success) {
        syncMenuJsonFile($pdo);
        echo json_encode(['status' => 'success', 'message' => 'Menu item updated successfully!']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update menu item.']);
    }
    exit;

} elseif ($action === 'delete') {
    $id = isset($data['id']) ? intval($data['id']) : 0;
    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid menu item ID.']);
        exit;
    }
    $stmt = $pdo->prepare("DELETE FROM menu_items WHERE id = ?");
    $success = $stmt->execute([$id]);
    if ($success) {
        syncMenuJsonFile($pdo);
        echo json_encode(['status' => 'success', 'message' => 'Menu item deleted successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete menu item.']);
    }
    exit;

} elseif ($action === 'toggle_stock') {
    $id = isset($data['id']) ? intval($data['id']) : 0;
    $available = isset($data['is_available']) ? intval($data['is_available']) : 1;

    $stmt = $pdo->prepare("UPDATE menu_items SET is_available = ? WHERE id = ?");
    $stmt->execute([$available, $id]);
    syncMenuJsonFile($pdo);
    echo json_encode(['status' => 'success', 'message' => 'Stock status updated.']);
    exit;
}

function syncMenuJsonFile($pdo) {
    if (!$pdo) return;
    try {
        $stmt = $pdo->query("SELECT * FROM menu_items ORDER BY FIELD(LOWER(category), 'mains', 'coffee', 'tea', 'smoothies', 'shakes', 'juices', 'salads', 'sides'), id ASC");
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $jsonPath = __DIR__ . '/menu.json';
        if (is_array($items) && count($items) > 0) {
            file_put_contents($jsonPath, json_encode($items, JSON_PRETTY_PRINT));
        }
    } catch (Exception $e) {}
}

function parseFloat($val) {
    return floatval(str_replace(',', '.', preg_replace('/[^0-9.,]/', '', $val)));
}
?>
