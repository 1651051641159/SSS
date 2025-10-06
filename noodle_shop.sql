-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 06, 2025 at 03:38 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `noodle_shop`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `update_daily_sales_summary` (IN `target_date` DATE)   BEGIN
    INSERT INTO daily_sales_summary (
        sale_date,
        total_orders,
        total_revenue,
        cash_orders,
        cash_revenue,
        transfer_orders,
        transfer_revenue
    )
    SELECT 
        target_date,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_orders,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_revenue,
        COUNT(CASE WHEN payment_method = 'transfer' THEN 1 END) as transfer_orders,
        COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END), 0) as transfer_revenue
    FROM orders
    WHERE DATE(order_date) = target_date
        AND status = 'confirmed'
    ON DUPLICATE KEY UPDATE
        total_orders = VALUES(total_orders),
        total_revenue = VALUES(total_revenue),
        cash_orders = VALUES(cash_orders),
        cash_revenue = VALUES(cash_revenue),
        transfer_orders = VALUES(transfer_orders),
        transfer_revenue = VALUES(transfer_revenue),
        updated_at = CURRENT_TIMESTAMP;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `username`, `password`, `full_name`, `created_at`, `last_login`) VALUES
(1, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ', '2025-10-05 09:34:46', '2025-10-06 11:15:42');

-- --------------------------------------------------------

--
-- Table structure for table `daily_sales_summary`
--

CREATE TABLE `daily_sales_summary` (
  `id` int(11) NOT NULL,
  `sale_date` date NOT NULL,
  `total_orders` int(11) DEFAULT 0,
  `total_revenue` decimal(10,2) DEFAULT 0.00,
  `cash_orders` int(11) DEFAULT 0,
  `cash_revenue` decimal(10,2) DEFAULT 0.00,
  `transfer_orders` int(11) DEFAULT 0,
  `transfer_revenue` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `daily_sales_summary`
--

INSERT INTO `daily_sales_summary` (`id`, `sale_date`, `total_orders`, `total_revenue`, `cash_orders`, `cash_revenue`, `transfer_orders`, `transfer_revenue`, `created_at`, `updated_at`) VALUES
(1, '2025-10-05', 4, 200.00, 2, 100.00, 2, 100.00, '2025-10-06 09:31:58', '2025-10-06 09:31:58'),
(2, '2025-10-06', 5, 250.00, 3, 150.00, 2, 100.00, '2025-10-06 09:41:00', '2025-10-06 09:41:06');

-- --------------------------------------------------------

--
-- Table structure for table `menu_items`
--

CREATE TABLE `menu_items` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `normal_price` decimal(10,2) DEFAULT 50.00,
  `special_price` decimal(10,2) DEFAULT 60.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `menu_items`
--

INSERT INTO `menu_items` (`id`, `name`, `normal_price`, `special_price`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'ก๋วยเตี๋ยวน้ำใส', 50.00, 60.00, 1, '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(2, 'ก๋วยเตี๋ยวต้มยำ', 50.00, 60.00, 1, '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(3, 'ก๋วยเตี๋ยวเย็นตาโฟ', 50.00, 60.00, 1, '2025-10-05 09:34:46', '2025-10-05 13:46:58'),
(4, 'ก๋วยเตี๋ยวแห้ง', 50.00, 60.00, 1, '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(5, 'ลูกชิ้นลวก หมู/เนื้อ/เอ็น', 50.00, 60.00, 1, '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(6, 'เกาเหลา', 50.00, 60.00, 1, '2025-10-05 09:34:46', '2025-10-05 09:34:46');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_number` varchar(20) NOT NULL,
  `table_id` int(11) DEFAULT NULL,
  `table_number` int(11) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','transfer','pending') DEFAULT 'pending',
  `payment_text` varchar(50) DEFAULT NULL,
  `status` enum('pending_payment','confirmed','preparing','completed','cancelled') DEFAULT 'pending_payment',
  `order_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_number`, `table_id`, `table_number`, `total_amount`, `payment_method`, `payment_text`, `status`, `order_date`, `completed_at`) VALUES
(28, '0028', 1, 1, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 10:22:54', NULL),
(29, '0029', 1, 1, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 10:24:11', NULL),
(30, '0030', 1, 1, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 10:28:34', NULL),
(31, '0031', 4, 4, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 10:34:32', NULL),
(32, '0032', 4, 4, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 10:40:02', NULL),
(33, '0033', 4, 4, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 10:40:30', NULL),
(34, '0034', 4, 4, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 10:43:13', NULL),
(35, '0035', 4, 4, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 10:43:21', NULL),
(36, '0036', 4, 4, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 10:52:08', NULL),
(37, '0037', 1, 1, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 13:31:07', NULL),
(38, '0038', 1, 1, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 13:33:16', NULL),
(39, '0039', 1, 1, 50.00, 'pending', 'รอแอดมินถาม', 'pending_payment', '2025-10-06 13:33:45', NULL);

--
-- Triggers `orders`
--
DELIMITER $$
CREATE TRIGGER `after_order_confirmed` AFTER UPDATE ON `orders` FOR EACH ROW BEGIN
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        CALL update_daily_sales_summary(DATE(NEW.order_date));
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `menu_item_id` int(11) DEFAULT NULL,
  `menu_name` varchar(255) NOT NULL,
  `normal_qty` int(11) DEFAULT 0,
  `special_qty` int(11) DEFAULT 0,
  `normal_price` decimal(10,2) DEFAULT NULL,
  `special_price` decimal(10,2) DEFAULT NULL,
  `noodle_type` varchar(100) DEFAULT NULL,
  `meatballs` text DEFAULT NULL,
  `vegetables` text DEFAULT NULL,
  `note` text DEFAULT NULL,
  `item_total` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `menu_name`, `normal_qty`, `special_qty`, `normal_price`, `special_price`, `noodle_type`, `meatballs`, `vegetables`, `note`, `item_total`) VALUES
(28, 28, NULL, 'ลูกชิ้นลวก หมู/เนื้อ/เอ็น', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู,ลูกชิ้นเนื้อ,ลูกชิ้นเอ็น', 'ผักบุ้ง', '', 50.00),
(29, 29, NULL, 'ลูกชิ้นลวก หมู/เนื้อ/เอ็น', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู,ลูกชิ้นเนื้อ,ลูกชิ้นเอ็น', 'ผักบุ้ง', '', 50.00),
(30, 30, NULL, 'ลูกชิ้นลวก หมู/เนื้อ/เอ็น', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู,ลูกชิ้นเนื้อ,ลูกชิ้นเอ็น', 'ผักบุ้ง', '', 50.00),
(31, 31, NULL, 'ลูกชิ้นลวก หมู/เนื้อ/เอ็น', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู,ลูกชิ้นเนื้อ,ลูกชิ้นเอ็น', 'ผักบุ้ง', '', 50.00),
(32, 32, NULL, 'ก๋วยเตี๋ยวน้ำใส', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู', 'ผักบุ้ง', '', 50.00),
(33, 33, NULL, 'ก๋วยเตี๋ยวน้ำใส', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู', 'ผักบุ้ง', '', 50.00),
(34, 34, NULL, 'ก๋วยเตี๋ยวน้ำใส', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู', 'ผักบุ้ง', '', 50.00),
(35, 35, NULL, 'ก๋วยเตี๋ยวน้ำใส', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู', 'ผักบุ้ง', '', 50.00),
(36, 36, NULL, 'ก๋วยเตี๋ยวน้ำใส', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู', 'ผักบุ้ง', '', 50.00),
(37, 37, NULL, 'ก๋วยเตี๋ยวน้ำใส', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู', 'ผักบุ้ง', '', 50.00),
(38, 38, NULL, 'ก๋วยเตี๋ยวน้ำใส', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู', 'ผักบุ้ง', '', 50.00),
(39, 39, NULL, 'ก๋วยเตี๋ยวน้ำใส', 1, 0, 50.00, 60.00, 'เส้นเล็ก', 'ลูกชิ้นหมู', 'ผักบุ้ง', '', 50.00);

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `setting_key`, `setting_value`, `description`, `updated_at`) VALUES
(1, 'last_order_number', '39', 'หมายเลขออเดอร์ล่าสุด', '2025-10-06 13:33:45'),
(2, 'shop_name', 'ร้านก๋วยเตี๋ยว', 'ชื่อร้าน', '2025-10-05 09:34:46'),
(3, 'currency', 'บาท', 'สกุลเงิน', '2025-10-05 09:34:46');

-- --------------------------------------------------------

--
-- Table structure for table `tables`
--

CREATE TABLE `tables` (
  `id` int(11) NOT NULL,
  `table_number` int(11) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  `status` enum('available','occupied','reserved') DEFAULT 'available',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tables`
--

INSERT INTO `tables` (`id`, `table_number`, `table_name`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'โต๊ะที่ 1', 'available', '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(2, 2, 'โต๊ะที่ 2', 'available', '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(3, 3, 'โต๊ะที่ 3', 'available', '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(4, 4, 'โต๊ะที่ 4', 'available', '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(5, 5, 'โต๊ะที่ 5', 'available', '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(6, 6, 'โต๊ะที่ 6', 'available', '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(7, 7, 'โต๊ะที่ 7', 'available', '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(8, 8, 'โต๊ะที่ 8', 'available', '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(9, 9, 'โต๊ะที่ 9', 'available', '2025-10-05 09:34:46', '2025-10-05 09:34:46'),
(10, 10, 'โต๊ะที่ 10', 'available', '2025-10-05 09:34:46', '2025-10-05 09:34:46');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `daily_sales_summary`
--
ALTER TABLE `daily_sales_summary`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sale_date` (`sale_date`),
  ADD KEY `idx_sale_date` (`sale_date`);

--
-- Indexes for table `menu_items`
--
ALTER TABLE `menu_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `table_id` (`table_id`),
  ADD KEY `idx_order_number` (`order_number`),
  ADD KEY `idx_table_number` (`table_number`),
  ADD KEY `idx_order_date` (`order_date`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `menu_item_id` (`menu_item_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `tables`
--
ALTER TABLE `tables`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `table_number` (`table_number`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `daily_sales_summary`
--
ALTER TABLE `daily_sales_summary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `menu_items`
--
ALTER TABLE `menu_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tables`
--
ALTER TABLE `tables`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
