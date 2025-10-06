<?php
require_once '../config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
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
    error_log("Orders API Error: " . $e->getMessage());
    sendError($e->getMessage(), 500);
}

// ดึงรายการออเดอร์
function handleGet($pdo) {
    $orderId = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
    $endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $tableNumber = isset($_GET['table_number']) ? (int)$_GET['table_number'] : null;
    
    if ($orderId) {
        // ดึงออเดอร์เดียว
        $stmt = $pdo->prepare("
            SELECT o.*, 
                   GROUP_CONCAT(
                       CONCAT(
                           '{\"menu_name\":\"', oi.menu_name, '\",',
                           '\"normal_qty\":', COALESCE(oi.normal_qty, 0), ',',
                           '\"special_qty\":', COALESCE(oi.special_qty, 0), ',',
                           '\"normal_price\":', COALESCE(oi.normal_price, 0), ',',
                           '\"special_price\":', COALESCE(oi.special_price, 0), ',',
                           '\"noodle_type\":\"', COALESCE(oi.noodle_type, ''), '\",',
                           '\"meatballs\":\"', COALESCE(oi.meatballs, ''), '\",',
                           '\"vegetables\":\"', COALESCE(oi.vegetables, ''), '\",',
                           '\"note\":\"', COALESCE(oi.note, ''), '\",',
                           '\"item_total\":', oi.item_total, '}'
                       )
                       SEPARATOR '|||'
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
            GROUP BY o.id
        ");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        
        if (!$order) {
            sendError('Order not found', 404);
        }
        
        $order['items'] = parseOrderItems($order['items']);
        sendJSON(['success' => true, 'data' => $order]);
    } else {
        // ดึงรายการออเดอร์ทั้งหมด
        $sql = "
            SELECT o.*, 
                   GROUP_CONCAT(
                       CONCAT(
                           '{\"menu_name\":\"', oi.menu_name, '\",',
                           '\"normal_qty\":', COALESCE(oi.normal_qty, 0), ',',
                           '\"special_qty\":', COALESCE(oi.special_qty, 0), ',',
                           '\"normal_price\":', COALESCE(oi.normal_price, 0), ',',
                           '\"special_price\":', COALESCE(oi.special_price, 0), ',',
                           '\"noodle_type\":\"', COALESCE(oi.noodle_type, ''), '\",',
                           '\"meatballs\":\"', COALESCE(oi.meatballs, ''), '\",',
                           '\"vegetables\":\"', COALESCE(oi.vegetables, ''), '\",',
                           '\"note\":\"', COALESCE(oi.note, ''), '\",',
                           '\"item_total\":', oi.item_total, '}'
                       )
                       SEPARATOR '|||'
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($startDate && $endDate) {
            $sql .= " AND DATE(o.order_date) BETWEEN ? AND ?";
            $params[] = $startDate;
            $params[] = $endDate;
        }
        
        if ($status) {
            $sql .= " AND o.status = ?";
            $params[] = $status;
        }
        
        if ($tableNumber) {
            $sql .= " AND o.table_number = ?";
            $params[] = $tableNumber;
        }
        
        $sql .= " GROUP BY o.id ORDER BY o.order_date DESC LIMIT 100";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();
        
        // แปลง items string เป็น array
        foreach ($orders as &$order) {
            $order['items'] = parseOrderItems($order['items']);
        }
        
        sendJSON(['success' => true, 'data' => $orders]);
    }
}

// สร้างออเดอร์ใหม่
function handlePost($pdo) {
    $input = getJSONInput();
    
    // Validate input
    if (empty($input['items']) || !is_array($input['items'])) {
        sendError('Items are required');
    }
    
    $tableNumber = isset($input['table_number']) ? (int)$input['table_number'] : null;
    $totalAmount = isset($input['total']) ? (float)$input['total'] : 0;
    
    // หา table_id จาก table_number
    $tableId = null;
    if ($tableNumber) {
        $stmt = $pdo->prepare("SELECT id FROM tables WHERE table_number = ?");
        $stmt->execute([$tableNumber]);
        $table = $stmt->fetch();
        if ($table) {
            $tableId = $table['id'];
        }
    }
    
    // เริ่ม transaction
    $pdo->beginTransaction();
    
    try {
        // สร้างหมายเลขออเดอร์
        $orderNumber = generateOrderNumber($pdo);
        
        // Insert order พร้อม table_id
        $stmt = $pdo->prepare("
            INSERT INTO orders (order_number, table_id, table_number, total_amount, payment_method, payment_text, status)
            VALUES (?, ?, ?, ?, 'pending', 'รอแอดมินถาม', 'pending_payment')
        ");
        $stmt->execute([$orderNumber, $tableId, $tableNumber, $totalAmount]);
        $orderId = $pdo->lastInsertId();
        
        // Insert order items
        $itemStmt = $pdo->prepare("
            INSERT INTO order_items (
                order_id, menu_name, normal_qty, special_qty, 
                normal_price, special_price, noodle_type, 
                meatballs, vegetables, note, item_total
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($input['items'] as $item) {
            $itemStmt->execute([
                $orderId,
                $item['name'],
                isset($item['normalQty']) ? $item['normalQty'] : 0,
                isset($item['specialQty']) ? $item['specialQty'] : 0,
                isset($item['normalPrice']) ? $item['normalPrice'] : 50,
                isset($item['specialPrice']) ? $item['specialPrice'] : 60,
                isset($item['noodleType']) ? $item['noodleType'] : '',
                isset($item['meatballs']) ? implode(',', $item['meatballs']) : '',
                isset($item['vegetables']) ? implode(',', $item['vegetables']) : '',
                isset($item['note']) ? $item['note'] : '',
                $item['total']
            ]);
        }
        
        $pdo->commit();
        
        sendJSON([
            'success' => true,
            'message' => 'Order created successfully',
            'data' => [
                'order_id' => $orderId,
                'order_number' => $orderNumber
            ]
        ], 201);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// อัปเดตออเดอร์ (สำหรับยืนยันการชำระเงิน)
function handlePut($pdo) {
    $input = getJSONInput();
    
    if (empty($input['id'])) {
        sendError('Order ID is required');
    }
    
    $orderId = (int)$input['id'];
    
    // Check if order exists
    $stmt = $pdo->prepare("SELECT id FROM orders WHERE id = ?");
    $stmt->execute([$orderId]);
    if (!$stmt->fetch()) {
        sendError('Order not found', 404);
    }
    
    $updates = [];
    $params = [];
    
    if (isset($input['payment_method'])) {
        $updates[] = "payment_method = ?";
        $params[] = $input['payment_method'];
        
        $paymentText = $input['payment_method'] === 'cash' ? 'เงินสด' : 'โอนเงิน';
        $updates[] = "payment_text = ?";
        $params[] = $paymentText;
    }
    
    if (isset($input['status'])) {
        $updates[] = "status = ?";
        $params[] = $input['status'];
        
        if ($input['status'] === 'completed') {
            $updates[] = "completed_at = NOW()";
        }
    }
    
    if (empty($updates)) {
        sendError('No fields to update');
    }
    
    $params[] = $orderId;
    $sql = "UPDATE orders SET " . implode(', ', $updates) . " WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    sendJSON([
        'success' => true,
        'message' => 'Order updated successfully'
    ]);
}

// ลบออเดอร์
function handleDelete($pdo) {
    if (empty($_GET['id'])) {
        sendError('Order ID is required');
    }
    
    $orderId = (int)$_GET['id'];
    
    $stmt = $pdo->prepare("DELETE FROM orders WHERE id = ?");
    $stmt->execute([$orderId]);
    
    if ($stmt->rowCount() === 0) {
        sendError('Order not found', 404);
    }
    
    sendJSON([
        'success' => true,
        'message' => 'Order deleted successfully'
    ]);
}

// สร้างหมายเลขออเดอร์
function generateOrderNumber($pdo) {
    $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'last_order_number'");
    $stmt->execute();
    $result = $stmt->fetch();
    
    $lastNumber = $result ? (int)$result['setting_value'] : 0;
    $newNumber = ($lastNumber + 1) % 10000; // รีเซ็ตเมื่อถึง 9999
    
    // อัปเดตหมายเลขล่าสุด
    $stmt = $pdo->prepare("UPDATE settings SET setting_value = ? WHERE setting_key = 'last_order_number'");
    $stmt->execute([$newNumber]);
    
    return str_pad($newNumber, 4, '0', STR_PAD_LEFT);
}

// แปลง items string เป็น array
function parseOrderItems($itemsString) {
    if (empty($itemsString)) {
        return [];
    }
    
    $items = [];
    $itemParts = explode('|||', $itemsString);
    
    foreach ($itemParts as $part) {
        $item = json_decode($part, true);
        if ($item) {
            // แปลง meatballs และ vegetables กลับเป็น array
            if (!empty($item['meatballs'])) {
                $item['meatballs'] = explode(',', $item['meatballs']);
            } else {
                $item['meatballs'] = [];
            }
            
            if (!empty($item['vegetables'])) {
                $item['vegetables'] = explode(',', $item['vegetables']);
            } else {
                $item['vegetables'] = [];
            }
            
            $items[] = $item;
        }
    }
    
    return $items;
}
?>