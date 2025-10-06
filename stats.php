<?php
require_once '../config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed', 405);
}

$pdo = getDBConnection();

try {
    $period = isset($_GET['period']) ? $_GET['period'] : 'all';
    $startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
    $endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;
    
    $stats = getStatistics($pdo, $period, $startDate, $endDate);
    
    sendJSON([
        'success' => true,
        'data' => $stats
    ]);
    
} catch (Exception $e) {
    error_log("Statistics API Error: " . $e->getMessage());
    sendError($e->getMessage(), 500);
}

function getStatistics($pdo, $period, $startDate = null, $endDate = null) {
    // คำนวณช่วงวันที่
    $dateCondition = "";
    $params = [];
    
    if ($startDate && $endDate) {
        $dateCondition = "AND DATE(o.order_date) BETWEEN ? AND ?";
        $params = [$startDate, $endDate];
    } else {
        switch ($period) {
            case 'daily':
                $dateCondition = "AND DATE(o.order_date) = CURDATE()";
                break;
            case 'weekly':
                $dateCondition = "AND o.order_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                break;
            case 'monthly':
                $dateCondition = "AND o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
                break;
            case 'all':
            default:
                $dateCondition = "";
                break;
        }
    }
    
    // สถิติรวม
    $sql = "
        SELECT 
            COUNT(*) as total_orders,
            COALESCE(SUM(total_amount), 0) as total_revenue,
            COALESCE(AVG(total_amount), 0) as average_order_value,
            COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_orders,
            COUNT(CASE WHEN payment_method = 'transfer' THEN 1 END) as transfer_orders,
            COUNT(CASE WHEN payment_method = 'pending' THEN 1 END) as pending_orders,
            COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_revenue,
            COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END), 0) as transfer_revenue
        FROM orders o
        WHERE 1=1 $dateCondition
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $summary = $stmt->fetch();
    
    // ยอดขายแยกตามเมนู
    $sql = "
        SELECT 
            oi.menu_name,
            SUM(oi.normal_qty + oi.special_qty) as total_qty,
            COALESCE(SUM(oi.item_total), 0) as total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE 1=1 $dateCondition
        GROUP BY oi.menu_name
        ORDER BY total_revenue DESC
        LIMIT 20
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $menuSales = $stmt->fetchAll();
    
    // ยอดขายรายวัน (7 วันล่าสุด)
    $sql = "
        SELECT 
            DATE(order_date) as date,
            COUNT(*) as orders,
            COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE order_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(order_date)
        ORDER BY date DESC
    ";
    
    $stmt = $pdo->query($sql);
    $dailySales = $stmt->fetchAll();
    
    // ยอดขายแยกตามโต๊ะ
    $sql = "
        SELECT 
            table_number,
            COUNT(*) as total_orders,
            COALESCE(SUM(total_amount), 0) as total_revenue
        FROM orders
        WHERE table_number IS NOT NULL $dateCondition
        GROUP BY table_number
        ORDER BY total_revenue DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $tableSales = $stmt->fetchAll();
    
    // ยอดขายแยกตามช่วงเวลา
    $sql = "
        SELECT 
            HOUR(order_date) as hour,
            COUNT(*) as orders,
            COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE 1=1 $dateCondition
        GROUP BY HOUR(order_date)
        ORDER BY hour
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $hourlySales = $stmt->fetchAll();
    
    return [
        'period' => $period,
        'summary' => $summary,
        'menu_sales' => $menuSales,
        'daily_sales' => $dailySales,
        'table_sales' => $tableSales,
        'hourly_sales' => $hourlySales
    ];
}
?>