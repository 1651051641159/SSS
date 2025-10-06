<?php
// ตั้งค่า CORS Headers ก่อนอื่น
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// จัดการ Preflight Request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ตั้งค่าการแสดงผล error
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

// ตั้งค่าฐานข้อมูล
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'noodle_shop');
define('DB_CHARSET', 'utf8mb4');

// ตั้งค่า timezone
date_default_timezone_set('Asia/Bangkok');

// ฟังก์ชันเชื่อมต่อฐานข้อมูล
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database connection error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ฟังก์ชันส่ง JSON response
function sendJSON($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// ฟังก์ชันส่ง error
function sendError($message, $statusCode = 400) {
    sendJSON(['success' => false, 'error' => $message], $statusCode);
}

// ฟังก์ชันตรวจสอบ request method
function checkMethod($method) {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        sendError('Invalid request method', 405);
    }
}

// ฟังก์ชันรับ JSON input
function getJSONInput() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendError('Invalid JSON input');
    }
    
    return $data;
}

// ฟังก์ชัน sanitize input
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

// ฟังก์ชันตรวจสอบว่าเป็น AJAX request
function isAjax() {
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest';
}

// ฟังก์ชันแปลง array เป็น comma-separated string
function arrayToString($array) {
    if (is_array($array)) {
        return implode(',', $array);
    }
    return $array;
}

// ฟังก์ชันแปลง comma-separated string เป็น array
function stringToArray($string) {
    if (empty($string)) {
        return [];
    }
    if (is_array($string)) {
        return $string;
    }
    return explode(',', $string);
}
?>