<?php
require_once '../config.php';

// เปิด session ก่อนส่ง headers
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    switch ($method) {
        case 'POST':
            handleLogin($pdo);
            break;
        case 'GET':
            handleCheckAuth();
            break;
        case 'DELETE':
            handleLogout();
            break;
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log("Auth API Error: " . $e->getMessage());
    sendError($e->getMessage(), 500);
}

// ล็อกอิน
function handleLogin($pdo) {
    $input = getJSONInput();
    
    if (empty($input['password'])) {
        sendError('Password is required');
    }
    
    $password = $input['password'];
    
    // ตรวจสอบรหัสผ่านแบบง่าย (111223)
    if ($password === '111223') {
        // ตั้งค่า session ให้คงอยู่
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_id'] = 1;
        $_SESSION['login_time'] = time();
        
        // ต่ออายุ session
        ini_set('session.gc_maxlifetime', 86400); // 24 ชั่วโมง
        session_set_cookie_params(86400); // 24 ชั่วโมง
        
        // อัปเดต last_login
        $stmt = $pdo->prepare("UPDATE admins SET last_login = NOW() WHERE id = 1");
        $stmt->execute();
        
        sendJSON([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'admin_id' => 1,
                'logged_in' => true
            ]
        ]);
    } else {
        sendError('รหัสผ่านไม่ถูกต้อง', 401);
    }
}

// ตรวจสอบสถานะการล็อกอิน
function handleCheckAuth() {
    if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
        sendJSON([
            'success' => true,
            'logged_in' => true,
            'admin_id' => $_SESSION['admin_id']
        ]);
    } else {
        sendJSON([
            'success' => true,
            'logged_in' => false
        ]);
    }
}

// ออกจากระบบ
function handleLogout() {
    $_SESSION = array();
    
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    session_destroy();
    
    sendJSON([
        'success' => true,
        'message' => 'Logout successful'
    ]);
}
?>เดต last_login
        $stmt = $pdo->prepare("UPDATE admins SET last_login = NOW() WHERE id = 1");
        $stmt->execute();
        
        sendJSON([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'admin_id' => 1,
                'logged_in' => true
            ]
        ]);
    } else {
        sendError('รหัสผ่านไม่ถูกต้อง', 401);
    }
}

// ตรวจสอบสถานะการล็อกอิน
function handleCheckAuth() {
    if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
        sendJSON([
            'success' => true,
            'logged_in' => true,
            'admin_id' => $_SESSION['admin_id']
        ]);
    } else {
        sendJSON([
            'success' => true,
            'logged_in' => false
        ]);
    }
}

// ออกจากระบบ
function handleLogout() {
    session_unset();
    session_destroy();
    
    sendJSON([
        'success' => true,
        'message' => 'Logout successful'
    ]);
}
?>