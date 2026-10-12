<?php
/* ============================================================
   INEZA RESTO & COFFEE SHOP - PDF MENU UPLOAD API ENDPOINT
   ============================================================ */
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

if (!isset($_FILES['pdf_menu']) || $_FILES['pdf_menu']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['status' => 'error', 'message' => 'No PDF file uploaded or file error occurred.']);
    exit;
}

$file = $_FILES['pdf_menu'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if ($ext !== 'pdf') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid file format. Only PDF files are allowed.']);
    exit;
}

// Target directory
$targetDir = __DIR__ . '/../docs/';
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}

// Fixed filename so it always overwrites the old menu
$filename = 'menu.pdf';
$targetPath = $targetDir . $filename;
$publicPath = 'docs/' . $filename;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    echo json_encode([
        'status' => 'success',
        'message' => 'PDF Menu uploaded successfully!',
        'pdf_path' => $publicPath
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to save uploaded PDF on server.']);
}
?>
