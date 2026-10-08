<?php
/* ============================================================
   FAVORITE CAFE - CATEGORIES CRUD API ENDPOINT (MySQL + File DB Engine)
   ============================================================ */
require_once __DIR__ . '/db.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) $data = $_POST;

$action = isset($_GET['action']) ? $_GET['action'] : (isset($data['action']) ? $data['action'] : 'get');

if ($pdo === null) {
    $jsonPath = __DIR__ . '/categories.json';
    $categories = file_exists($jsonPath) ? json_decode(file_get_contents($jsonPath), true) : [];
    if (!is_array($categories)) $categories = [];

    if ($action === 'get') {
        echo json_encode(['status' => 'success', 'categories' => $categories, 'source' => 'file_db']);
        exit;
    }
}

// Auto-create & migrate categories table
try {
    $tableSql = "
    CREATE TABLE IF NOT EXISTS `categories` (
      `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      `name` varchar(100) NOT NULL,
      `slug` varchar(100) NOT NULL UNIQUE,
      `icon` varchar(100) DEFAULT 'fas fa-utensils',
      `is_active` tinyint(1) DEFAULT 1,
      `sort_order` int(11) DEFAULT 0,
      `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($tableSql);

    $count = $pdo->query("SELECT COUNT(*) FROM categories")->fetchColumn();
    if ($count == 0) {
        $jsonPath = __DIR__ . '/categories.json';
        if (file_exists($jsonPath)) {
            $defaultCategories = json_decode(file_get_contents($jsonPath), true);
            if (is_array($defaultCategories)) {
                $stmt = $pdo->prepare("INSERT INTO categories (id, name, slug, icon, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
                foreach ($defaultCategories as $cat) {
                    $stmt->execute([
                        $cat['id'],
                        $cat['name'],
                        $cat['slug'],
                        $cat['icon'] ?? 'fas fa-utensils',
                        $cat['is_active'] ?? 1,
                        $cat['sort_order'] ?? $cat['id']
                    ]);
                }
            }
        }
    }
} catch (PDOException $e) {}

if ($action === 'get') {
    $onlyActive = isset($_GET['active_only']) && $_GET['active_only'] == '1';
    $sql = $onlyActive ? "SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC" : "SELECT * FROM categories ORDER BY sort_order ASC, id ASC";
    $stmt = $pdo->query($sql);
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['status' => 'success', 'categories' => $categories]);
    exit;

} elseif ($action === 'add') {
    $name = isset($data['name']) ? trim($data['name']) : '';
    $slug = isset($data['slug']) && trim($data['slug']) !== '' ? strtolower(preg_replace('/[^a-zA-Z0-9]/', '', trim($data['slug']))) : strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $name));
    $icon = isset($data['icon']) && trim($data['icon']) !== '' ? trim($data['icon']) : 'fas fa-utensils';
    $sortOrder = isset($data['sort_order']) ? intval($data['sort_order']) : 0;
    $isActive = isset($data['is_active']) ? intval($data['is_active']) : 1;

    if (empty($name) || empty($slug)) {
        echo json_encode(['status' => 'error', 'message' => 'Category name and filter key are required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO categories (name, slug, icon, is_active, sort_order) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$name, $slug, $icon, $isActive, $sortOrder]);
        $catId = $pdo->lastInsertId();

        echo json_encode(['status' => 'success', 'message' => 'Category "' . $name . '" created successfully!', 'category_id' => $catId]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            echo json_encode(['status' => 'error', 'message' => 'Category with key "' . $slug . '" already exists.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
        }
    }
    exit;

} elseif ($action === 'update') {
    $id = isset($data['id']) ? intval($data['id']) : 0;
    $name = isset($data['name']) ? trim($data['name']) : '';
    $slug = isset($data['slug']) && trim($data['slug']) !== '' ? strtolower(preg_replace('/[^a-zA-Z0-9]/', '', trim($data['slug']))) : strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $name));
    $icon = isset($data['icon']) ? trim($data['icon']) : 'fas fa-utensils';
    $sortOrder = isset($data['sort_order']) ? intval($data['sort_order']) : 0;

    if ($id <= 0 || empty($name)) {
        echo json_encode(['status' => 'error', 'message' => 'Valid Category ID and Name are required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE categories SET name = ?, slug = ?, icon = ?, sort_order = ? WHERE id = ?");
        $stmt->execute([$name, $slug, $icon, $sortOrder, $id]);

        echo json_encode(['status' => 'success', 'message' => 'Category updated successfully!']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Update failed: ' . $e->getMessage()]);
    }
    exit;

} elseif ($action === 'toggle') {
    $id = isset($data['id']) ? intval($data['id']) : 0;
    if ($id <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Category ID.']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE categories SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['status' => 'success', 'message' => 'Category status toggled successfully!']);
    exit;

} elseif ($action === 'delete') {
    $id = isset($data['id']) ? intval($data['id']) : 0;
    if ($id <= 0) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid Category ID.']);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['status' => 'success', 'message' => 'Category deleted successfully!']);
    exit;
}
?>
