<?php
/* ============================================================
   INEZA RESTO & COFFEE SHOP - DATABASE CONNECTION & AUTO SETUP
   ============================================================ */
header('Content-Type: application/json');

$host = 'localhost';
$user = 'root';
$pass = '';
$dbname = 'favorite_cafe';

$pdo = null;
$dbError = null;

try {
    // 1. Connect to MySQL server
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    try {
        $pdoServer = new PDO("mysql:host=$host", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        $pdoServer->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdoServer->exec("USE `$dbname` ");

        $tableSql = "
        CREATE TABLE IF NOT EXISTS `users` (
          `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
          `full_name` varchar(100) NOT NULL,
          `email` varchar(100) NOT NULL UNIQUE,
          `phone` varchar(20) DEFAULT NULL UNIQUE,
          `address` text DEFAULT NULL,
          `password_hash` varchar(255) NOT NULL,
          `role` enum('customer','staff','admin') DEFAULT 'customer',
          `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          `is_active` tinyint(1) DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $pdoServer->exec($tableSql);

        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    } catch (PDOException $e2) {
        $pdo = null;
        $dbError = $e2->getMessage();
    }
}

if ($pdo) {
    try {
        $cols = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'address'")->fetch();
        if (!$cols) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `address` text DEFAULT NULL AFTER `phone` ");
        }

        $colsAv = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'avatar'")->fetch();
        if (!$colsAv) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `avatar` text DEFAULT NULL AFTER `address` ");
        }

        $colsPerm = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'permissions'")->fetch();
        if (!$colsPerm) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `permissions` text DEFAULT NULL AFTER `role` ");
        }

        $colsPts = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'loyalty_points'")->fetch();
        if (!$colsPts) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `loyalty_points` int(11) DEFAULT 0 AFTER `permissions` ");
        }

        // Expand enum for role if needed
        $pdo->exec("ALTER TABLE `users` MODIFY COLUMN `role` enum('customer','staff','admin','chef','waiter','cashier') DEFAULT 'customer'");

        // Auto-create store_settings table for SuperAdmin configurations
        $settingsSql = "
        CREATE TABLE IF NOT EXISTS `store_settings` (
          `setting_key` varchar(64) NOT NULL PRIMARY KEY,
          `setting_value` text NOT NULL,
          `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $pdo->exec($settingsSql);

        // Seed defaults if empty
        $cnt = $pdo->query("SELECT COUNT(*) FROM `store_settings`")->fetchColumn();
        if ($cnt == 0) {
            $defaultSettings = [
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
            ];
            $insStmt = $pdo->prepare("INSERT INTO `store_settings` (`setting_key`, `setting_value`) VALUES (?, ?)");
            foreach ($defaultSettings as $k => $v) {
                $insStmt->execute([$k, $v]);
            }
        }
    } catch (PDOException $eCol) {
        // Ignore schema check errors
    }
}
?>
