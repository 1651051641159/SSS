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
    error_log("Tables API Error: " . $e->getMessage());
    sendError($e->getMessage(), 500);
}

// ดึงรายการโต๊ะ
function handleGet($pdo) {
    $tableId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $tableNumber = isset($_GET['table_number']) ? (int)$_GET['table_number'] : null;
    
    if ($tableId) {
        $stmt = $pdo->prepare("SELECT * FROM tables WHERE id = ?");
        $stmt->execute([$tableId]);
        $table = $stmt->fetch();
        
        if (!$table) {
            sendError('Table not found', 404);
        }
        
        sendJSON(['success' => true, 'data' => $table]);
    } elseif ($tableNumber) {
        $stmt = $pdo->prepare("SELECT * FROM tables WHERE table_number = ?");
        $stmt->execute([$tableNumber]);
        $table = $stmt->fetch();
        
        if (!$table) {
            sendError('Table not found', 404);
        }
        
        sendJSON(['success' => true, 'data' => $table]);
    } else {
        $stmt = $pdo->query("SELECT * FROM tables ORDER BY table_number ASC");
        $tables = $stmt->fetchAll();
        
        sendJSON(['success' => true, 'data' => $tables]);
    }
}

// เพิ่มโต๊ะใหม่
function handlePost($pdo) {
    $input = getJSONInput();
    
    if (empty($input['table_number'])) {
        sendError('Table number is required');
    }
    
    $tableNumber = (int)$input['table_number'];
    
    // ตรวจสอบว่าหมายเลขโต๊ะซ้ำหรือไม่
    $stmt = $pdo->prepare("SELECT id FROM tables WHERE table_number = ?");
    $stmt->execute([$tableNumber]);
    if ($stmt->fetch()) {
        sendError('Table number already exists');
    }
    
    $tableName = "โต๊ะที่ " . $tableNumber;
    $status = isset($input['status']) ? $input['status'] : 'available';
    
    $stmt = $pdo->prepare("
        INSERT INTO tables (table_number, table_name, status)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$tableNumber, $tableName, $status]);
    
    $tableId = $pdo->lastInsertId();
    
    sendJSON([
        'success' => true,
        'message' => 'Table created successfully',
        'data' => ['id' => $tableId, 'table_number' => $tableNumber]
    ], 201);
}

// อัปเดตโต๊ะ
function handlePut($pdo) {
    $input = getJSONInput();
    
    if (empty($input['id'])) {
        sendError('Table ID is required');
    }
    
    $tableId = (int)$input['id'];
    
    // Check if table exists
    $stmt = $pdo->prepare("SELECT id FROM tables WHERE id = ?");
    $stmt->execute([$tableId]);
    if (!$stmt->fetch()) {
        sendError('Table not found', 404);
    }
    
    $updates = [];
    $params = [];
    
    if (isset($input['table_number'])) {
        // ตรวจสอบว่าหมายเลขโต๊ะซ้ำหรือไม่
        $stmt = $pdo->prepare("SELECT id FROM tables WHERE table_number = ? AND id != ?");
        $stmt->execute([$input['table_number'], $tableId]);
        if ($stmt->fetch()) {
            sendError('Table number already exists');
        }
        
        $updates[] = "table_number = ?";
        $params[] = (int)$input['table_number'];
        
        $updates[] = "table_name = ?";
        $params[] = "โต๊ะที่ " . $input['table_number'];
    }
    
    if (isset($input['status'])) {
        $updates[] = "status = ?";
        $params[] = $input['status'];
    }
    
    if (empty($updates)) {
        sendError('No fields to update');
    }
    
    $params[] = $tableId;
    $sql = "UPDATE tables SET " . implode(', ', $updates) . " WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    sendJSON([
        'success' => true,
        'message' => 'Table updated successfully'
    ]);
}

// ลบโต๊ะ
function handleDelete($pdo) {
    if (empty($_GET['id'])) {
        sendError('Table ID is required');
    }
    
    $tableId = (int)$_GET['id'];
    
    $stmt = $pdo->prepare("DELETE FROM tables WHERE id = ?");
    $stmt->execute([$tableId]);
    
    if ($stmt->rowCount() === 0) {
        sendError('Table not found', 404);
    }
    
    sendJSON([
        'success' => true,
        'message' => 'Table deleted successfully'
    ]);
}
?>