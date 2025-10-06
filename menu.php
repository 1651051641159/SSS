<?php
require_once '../config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDBConnection();

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'POST':
            handlePost($pdo);
            break;
        case 'PUT':
            handlePut($pdo);
            break;
        case 'DELETE':
            handleDelete($pdo);
            break;
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log("Menu API Error: " . $e->getMessage());
    sendError($e->getMessage(), 500);
}

// ดึงรายการเมนู
function handleGet($pdo) {
    $menuId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $activeOnly = isset($_GET['active_only']) && $_GET['active_only'] === 'true';
    
    if ($menuId) {
        $stmt = $pdo->prepare("SELECT * FROM menu_items WHERE id = ?");
        $stmt->execute([$menuId]);
        $menu = $stmt->fetch();
        
        if (!$menu) {
            sendError('Menu not found', 404);
        }
        
        sendJSON(['success' => true, 'data' => $menu]);
    } else {
        $sql = "SELECT * FROM menu_items";
        if ($activeOnly) {
            $sql .= " WHERE is_active = 1";
        }
        $sql .= " ORDER BY id ASC";
        
        $stmt = $pdo->query($sql);
        $menus = $stmt->fetchAll();
        
        sendJSON(['success' => true, 'data' => $menus]);
    }
}

// เพิ่มเมนูใหม่
function handlePost($pdo) {
    $input = getJSONInput();
    
    if (empty($input['name'])) {
        sendError('Menu name is required');
    }
    
    $name = sanitizeInput($input['name']);
    $normalPrice = isset($input['normal_price']) ? (float)$input['normal_price'] : 50.00;
    $specialPrice = isset($input['special_price']) ? (float)$input['special_price'] : 60.00;
    $isActive = isset($input['is_active']) ? (bool)$input['is_active'] : true;
    
    $stmt = $pdo->prepare("
        INSERT INTO menu_items (name, normal_price, special_price, is_active)
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([$name, $normalPrice, $specialPrice, $isActive]);
    
    $menuId = $pdo->lastInsertId();
    
    sendJSON([
        'success' => true,
        'message' => 'Menu created successfully',
        'data' => ['id' => $menuId]
    ], 201);
}

// อัปเดตเมนู
function handlePut($pdo) {
    $input = getJSONInput();
    
    if (empty($input['id'])) {
        sendError('Menu ID is required');
    }
    
    $menuId = (int)$input['id'];
    
    // Check if menu exists
    $stmt = $pdo->prepare("SELECT id FROM menu_items WHERE id = ?");
    $stmt->execute([$menuId]);
    if (!$stmt->fetch()) {
        sendError('Menu not found', 404);
    }
    
    $updates = [];
    $params = [];
    
    if (isset($input['name'])) {
        $updates[] = "name = ?";
        $params[] = sanitizeInput($input['name']);
    }
    
    if (isset($input['normal_price'])) {
        $updates[] = "normal_price = ?";
        $params[] = (float)$input['normal_price'];
    }
    
    if (isset($input['special_price'])) {
        $updates[] = "special_price = ?";
        $params[] = (float)$input['special_price'];
    }
    
    if (isset($input['is_active'])) {
        $updates[] = "is_active = ?";
        $params[] = (bool)$input['is_active'];
    }
    
    if (empty($updates)) {
        sendError('No fields to update');
    }
    
    $params[] = $menuId;
    $sql = "UPDATE menu_items SET " . implode(', ', $updates) . " WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    sendJSON([
        'success' => true,
        'message' => 'Menu updated successfully'
    ]);
}

// ลบเมนู
function handleDelete($pdo) {
    if (empty($_GET['id'])) {
        sendError('Menu ID is required');
    }
    
    $menuId = (int)$_GET['id'];
    
    $stmt = $pdo->prepare("DELETE FROM menu_items WHERE id = ?");
    $stmt->execute([$menuId]);
    
    if ($stmt->rowCount() === 0) {
        sendError('Menu not found', 404);
    }
    
    sendJSON([
        'success' => true,
        'message' => 'Menu deleted successfully'
    ]);
}
?>