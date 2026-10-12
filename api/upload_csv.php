<?php
/* ============================================================
   INEZA RESTO & COFFEE SHOP - BULK IMPORT CSV ENDPOINT
   ============================================================ */
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

if (!isset($_FILES['csv_menu']) || $_FILES['csv_menu']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['status' => 'error', 'message' => 'No file uploaded or upload error.']);
    exit;
}

$file = $_FILES['csv_menu'];
$tmpName = $file['tmp_name'];

// Verify it's a CSV by reading extension
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if ($ext !== 'csv') {
    echo json_encode(['status' => 'error', 'message' => 'Only CSV files are allowed.']);
    exit;
}

if (($handle = fopen($tmpName, 'r')) !== false) {
    // Read header row
    $headers = fgetcsv($handle, 1000, ',');
    if (!$headers) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to read CSV headers.']);
        fclose($handle);
        exit;
    }
    
    // Normalize headers (lowercase, replace spaces with underscores)
    $headers = array_map(function($h) {
        return strtolower(trim(str_replace(' ', '_', $h)));
    }, $headers);

    if (!in_array('title', $headers)) {
        echo json_encode(['status' => 'error', 'message' => 'CSV must contain a "title" column.']);
        fclose($handle);
        exit;
    }

    $allowedColumns = [
        'title', 'category', 'price', 'old_price', 'image',
        'rating', 'reviews_count', 'calories', 'prep_time',
        'description', 'tags', 'is_available'
    ];
    
    // Find matching columns
    $colMap = [];
    foreach ($headers as $index => $col) {
        if (in_array($col, $allowedColumns)) {
            $colMap[$col] = $index;
        }
    }

    $imported = 0;
    $updated = 0;

    $pdo->beginTransaction();

    try {
        while (($data = fgetcsv($handle, 1000, ',')) !== false) {
            $row = [];
            foreach ($colMap as $col => $index) {
                $row[$col] = isset($data[$index]) ? trim($data[$index]) : null;
            }

            if (empty($row['title'])) continue;
            
            // Set some defaults if not provided in CSV
            if (!isset($row['price']) || $row['price'] === '') $row['price'] = 0.00;
            if (!isset($row['category']) || $row['category'] === '') $row['category'] = 'uncategorized';
            if (!isset($row['image']) || $row['image'] === '') $row['image'] = 'img/menu/placeholder.jpg';
            if (!isset($row['is_available']) || $row['is_available'] === '') $row['is_available'] = 1;

            $columns = array_keys($row);
            
            // Check if exists
            $checkStmt = $pdo->prepare("SELECT id FROM menu_items WHERE title = ?");
            $checkStmt->execute([$row['title']]);
            $exists = $checkStmt->fetchColumn();
            
            if ($exists) {
                // Update
                $updCols = [];
                $updVals = [];
                foreach ($columns as $c) {
                    if ($c !== 'title') {
                        $updCols[] = "`$c` = ?";
                        $updVals[] = $row[$c];
                    }
                }
                if (!empty($updCols)) {
                    $updSql = "UPDATE `menu_items` SET " . implode(', ', $updCols) . " WHERE id = ?";
                    $updVals[] = $exists;
                    $stmt = $pdo->prepare($updSql);
                    $stmt->execute($updVals);
                }
                $updated++;
            } else {
                // Insert
                $placeholders = array_fill(0, count($columns), '?');
                $colNames = implode(', ', array_map(function($c) { return "`$c`"; }, $columns));
                $placeholderStr = implode(', ', $placeholders);

                $insSql = "INSERT INTO `menu_items` ($colNames) VALUES ($placeholderStr)";
                $stmt = $pdo->prepare($insSql);
                $stmt->execute(array_values($row));
                $imported++;
            }
        }
        $pdo->commit();
        echo json_encode([
            'status' => 'success',
            'message' => "Successfully imported $imported new items and updated $updated existing items."
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
    
    fclose($handle);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Could not read uploaded file.']);
}
?>
