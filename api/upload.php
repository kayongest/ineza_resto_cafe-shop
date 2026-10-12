<?php
/* ============================================================
   INEZA RESTO & COFFEE SHOP - IMAGE FILE UPLOAD API ENDPOINT
   ============================================================ */
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['status' => 'error', 'message' => 'No image file uploaded or file error occurred.']);
    exit;
}

$file = $_FILES['image'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

// Allowed extensions
$allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
if (!in_array($ext, $allowed)) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid file format. Allowed formats: JPG, PNG, WEBP, GIF.']);
    exit;
}

// Target directory
$targetDir = __DIR__ . '/../img/menu/';
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}

// Unique filename
$filename = 'dish_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
$targetPath = $targetDir . $filename;
$publicPath = 'img/menu/' . $filename;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Image uploaded successfully!',
        'image_path' => $publicPath
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to save uploaded file on server.']);
}
?>
