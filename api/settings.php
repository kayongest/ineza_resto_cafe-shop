<?php
/* ============================================================
   INEZA RESTO & COFFEE SHOP - STORE SETTINGS API (SUPERADMIN)
   ============================================================ */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

if (!$pdo) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection unavailable.',
        'settings' => [
            'store_name' => 'INEZA RESTO & COFFEE SHOP',
            'store_location' => '108 Kimironko St, Kigali - Rwanda',
            'store_phone' => '+250 788 000 000',
            'store_tin' => '102938475',
            'momo_code' => '004587',
            'momo_name' => 'INEZA Resto & Cafe Shop',
            'delivery_fee' => '1000',
            'currency' => 'RWF',
            'vat_percent' => '18',
            'opening_hours' => 'Mon - Sun: 07:00 AM - 11:00 PM'
        ]
    ]);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'get';
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (is_array($data) && isset($data['action'])) {
    $action = $data['action'];
}

/* ------------------------------------------------------------
   ACTION 1: GET ALL STORE SETTINGS
   ------------------------------------------------------------ */
if ($action === 'get') {
    try {
        $settings = $pdo->query("SELECT setting_key, setting_value FROM store_settings")->fetchAll(PDO::FETCH_KEY_PAIR);
        echo json_encode([
            'status' => 'success',
            'settings' => $settings
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
    exit;
}

/* ------------------------------------------------------------
   ACTION 2: UPDATE STORE SETTINGS (SUPERADMIN)
   ------------------------------------------------------------ */
if ($action === 'update') {
    $settingsToUpdate = $data['settings'] ?? $data;
    if (!is_array($settingsToUpdate)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid settings payload.']);
        exit;
    }

    $allowedKeys = [
        'store_name',
        'store_location',
        'store_phone',
        'store_tin',
        'momo_code',
        'momo_name',
        'delivery_fee',
        'currency',
        'vat_percent',
        'opening_hours'
    ];

    try {
        $stmt = $pdo->prepare("INSERT INTO store_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        
        $updatedCount = 0;
        foreach ($settingsToUpdate as $key => $val) {
            if (in_array($key, $allowedKeys, true)) {
                $stmt->execute([$key, (string)$val]);
                $updatedCount++;
            }
        }

        // Fetch fresh settings
        $allSettings = $pdo->query("SELECT setting_key, setting_value FROM store_settings")->fetchAll(PDO::FETCH_KEY_PAIR);

        echo json_encode([
            'status' => 'success',
            'message' => 'Store operational settings updated successfully.',
            'settings' => $allSettings
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
    exit;
}

/* ------------------------------------------------------------
   FALLBACK
   ------------------------------------------------------------ */
echo json_encode([
    'status' => 'error',
    'message' => "Unknown action: '$action'."
]);
exit;
