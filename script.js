// API Configuration
const API_BASE_URL = window.location.origin + '/noodle-shop/api';

// ตัวแปรสำหรับเก็บข้อมูล
let currentItem = null;
let cart = [];
let currentQuantity = 1;
let isAdminLoggedIn = false;
let menuItems = [];
let editingMenuId = null;
let orderHistory = [];
let tables = [];
let currentTableNumber = null;

// ฟังก์ชันจัดการ cart ใน sessionStorage
function saveCartToSession() {
    try {
        sessionStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

function loadCartFromSession() {
    try {
        const saved = sessionStorage.getItem('cart');
        if (saved) {
            cart = JSON.parse(saved);
        } else {
            cart = [];
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
    }
}

function clearCart() {
    cart = [];
    sessionStorage.removeItem('cart');
}

// ==================== API Helper Functions ====================
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'API Error');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== โหลดข้อมูลเริ่มต้น ====================
async function loadInitialData() {
    try {
        // โหลดโต๊ะ
        await loadTablesFromAPI();
        
        // โหลดเมนู
        await loadMenuFromAPI();
        
        // โหลดหมายเลขโต๊ะจาก URL
        getTableFromURL();
        
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// ==================== Tables Functions ====================
async function loadTablesFromAPI() {
    try {
        const result = await apiCall('/tables.php');
        tables = result.data || [];
    } catch (error) {
        console.error('Error loading tables:', error);
        tables = [];
    }
}

async function addTable(tableNumber) {
    try {
        await apiCall('/tables.php', 'POST', {
            table_number: tableNumber
        });
        await loadTablesFromAPI();
        return true;
    } catch (error) {
        alert('ไม่สามารถเพิ่มโต๊ะได้: ' + error.message);
        return false;
    }
}

async function deleteTable(tableId) {
    try {
        await apiCall(`/tables.php?id=${tableId}`, 'DELETE');
        await loadTablesFromAPI();
    } catch (error) {
        alert('ไม่สามารถลบโต๊ะได้: ' + error.message);
    }
}

// ฟังก์ชันจัดการหมายเลขโต๊ะใน sessionStorage
function saveTableToSession() {
    try {
        sessionStorage.setItem('currentTableNumber', currentTableNumber.toString());
    } catch (error) {
        console.error('Error saving table number:', error);
    }
}

function loadTableFromSession() {
    try {
        const saved = sessionStorage.getItem('currentTableNumber');
        if (saved) {
            currentTableNumber = parseInt(saved);
        }
    } catch (error) {
        console.error('Error loading table number:', error);
    }
}

function getTableFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    if (tableParam) {
        const parsed = parseInt(tableParam);
        currentTableNumber = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        saveTableToSession(); // บันทึกลง sessionStorage
    } else {
        // ถ้าไม่มี parameter ให้โหลดจาก sessionStorage
        loadTableFromSession();
        if (!currentTableNumber) {
            currentTableNumber = 1;
        }
    }
    updateTableDisplay();
}

function updateTableDisplay() {
    const tableNumElement = document.getElementById('table-num');
    if (tableNumElement && currentTableNumber) {
        tableNumElement.textContent = currentTableNumber;
    }

    const tableInfoElements = document.querySelectorAll('.table-info');
    tableInfoElements.forEach((elem) => {
        if (currentTableNumber) {
            elem.textContent = `โต๊ะที่ - ${currentTableNumber}`;
        }
    });
}

// ==================== Menu Functions ====================
async function loadMenuFromAPI() {
    try {
        const result = await apiCall('/menu.php?active_only=true');
        menuItems = result.data || [];
        updateMenuDisplay();
    } catch (error) {
        console.error('Error loading menu:', error);
        menuItems = [];
    }
}

function updateMenuDisplay() {
    const menuListContainer = document.querySelector('.menu-list .menu-category');
    if (!menuListContainer) return;

    const header = menuListContainer.querySelector('h3');
    menuListContainer.innerHTML = '';
    if (header) {
        menuListContainer.appendChild(header);
    }

    menuItems.forEach((menu) => {
        const menuElement = document.createElement('div');
        menuElement.className = 'menu-item';
        menuElement.onclick = () => selectMenuItem(menu.name);
        menuElement.innerHTML = `
            <div class="menu-info">
                <h4>${menu.name}</h4>
                <p class="price">ธรรมดา 50 / พิเศษ 60 บาท</p>
            </div>
            <div class="menu-image"></div>
        `;
        menuListContainer.appendChild(menuElement);
    });
}

async function addNewMenu() {
    const name = document.getElementById('new-menu-name').value.trim();
    const price = 50;

    if (!name) {
        alert('กรุณากรอกชื่อเมนู');
        return;
    }

    try {
        if (editingMenuId !== null) {
            await apiCall('/menu.php', 'PUT', {
                id: editingMenuId,
                name: name,
                normal_price: 50,
                special_price: 60
            });
        } else {
            await apiCall('/menu.php', 'POST', {
                name: name,
                normal_price: 50,
                special_price: 60
            });
        }
        
        await loadMenuFromAPI();
        displayMenuList();
        cancelAddMenu();
        alert(editingMenuId !== null ? 'แก้ไขเมนูเรียบร้อยแล้ว' : 'เพิ่มเมนูใหม่เรียบร้อยแล้ว');
    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    }
}

function editMenu(id) {
    const menu = menuItems.find(item => item.id === id);
    if (menu) {
        editingMenuId = id;
        document.getElementById('new-menu-name').value = menu.name;
        document.getElementById('new-menu-price').value = menu.normal_price;
        document.getElementById('add-menu-form').style.display = 'block';
    }
}

async function deleteMenu(id) {
    if (confirm('คุณต้องการลบเมนูนี้หรือไม่?')) {
        try {
            await apiCall(`/menu.php?id=${id}`, 'DELETE');
            await loadMenuFromAPI();
            displayMenuList();
            alert('ลบเมนูเรียบร้อยแล้ว');
        } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        }
    }
}

function displayMenuList() {
    const menuListContainer = document.getElementById('menu-list-admin');
    if (!menuListContainer) return;
    
    menuListContainer.innerHTML = '';

    menuItems.forEach((menu) => {
        const menuElement = document.createElement('div');
        menuElement.className = 'admin-menu-item';
        menuElement.innerHTML = `
            <div>
                <h4>${menu.name}</h4>
                <p class="price">ธรรมดา 50 / พิเศษ 60 บาท</p>
            </div>
            <div class="admin-menu-actions">
                <button onclick="editMenu(${menu.id})" class="edit-btn">แก้ไข</button>
                <button onclick="deleteMenu(${menu.id})" class="delete-btn">ลบ</button>
            </div>
        `;
        menuListContainer.appendChild(menuElement);
    });
}

// ==================== Order Functions ====================
async function placeOrder() {
    if (cart.length === 0) {
        alert('ไม่มีรายการในตะกร้า');
        return;
    }

    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);

    try {
        const result = await apiCall('/orders.php', 'POST', {
            table_number: currentTableNumber,
            total: totalAmount,
            items: cart.map(item => ({
                name: item.name,
                normalQty: item.normalQty || 0,
                specialQty: item.specialQty || 0,
                normalPrice: item.normalPrice || 50,
                specialPrice: item.specialPrice || 60,
                noodleType: item.noodleType || '',
                meatballs: item.meatballs || [],
                vegetables: item.vegetables || [],
                note: item.note || '',
                total: item.total
            }))
        });

        alert(
            `สั่งอาหารเรียบร้อยแล้ว!\n` +
            `หมายเลขออเดอร์: #${result.data.order_number}\n` +
            `ยอดรวม: ${totalAmount} บาท\n\n` +
            `พนักงานจะถามวิธีการชำระเงินในภายหลัง\n` +
            `รอสักครู่อาหารจะมาเสิร์ฟ`
        );

        cart = [];
        updateCartDisplay();
        
        window.location.href = `/?table=${currentTableNumber}`;
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการสั่งอาหาร: ' + error.message);
    }
}

async function loadOrderHistory() {
    try {
        const result = await apiCall('/orders.php');
        orderHistory = result.data || [];
    } catch (error) {
        console.error('Error loading orders:', error);
        orderHistory = [];
    }
}

async function confirmPayment(orderId, paymentMethod) {
    try {
        await apiCall('/orders.php', 'PUT', {
            id: orderId,
            payment_method: paymentMethod,
            status: 'confirmed'
        });
        
        await loadOrderHistory();
        displayOrderHistory();
        alert('ยืนยันการชำระเงินเรียบร้อยแล้ว');
    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    }
}

function displayOrderHistory() {
    const orderListContainer = document.getElementById('order-list');
    if (!orderListContainer) return;
    
    orderListContainer.innerHTML = '';

    if (orderHistory.length === 0) {
        orderListContainer.innerHTML = '<div class="no-orders">ยังไม่มีรายการสั่งซื้อ</div>';
        return;
    }

    const sortedOrders = [...orderHistory].reverse();

    sortedOrders.forEach((order) => {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-item';

        const paymentClass = order.payment_method === 'transfer' ? 'transfer' : '';

        let itemsHtml = '';
        order.items.forEach((item) => {
            let itemDetails = [];
            if (item.normal_qty > 0) itemDetails.push(`ธรรมดา ${item.normal_qty} ชาม`);
            if (item.special_qty > 0) itemDetails.push(`พิเศษ ${item.special_qty} ชาม`);

            itemsHtml += `
                <div class="order-item-detail">
                    <strong>${item.menu_name}</strong> - ${itemDetails.join(', ')} (${item.item_total} บาท)
                    <br>เส้น: ${item.noodle_type}
                    ${item.meatballs ? '<br>ลูกชิ้น: ' + item.meatballs : ''}
                    ${item.vegetables ? '<br>ผัก: ' + item.vegetables : ''}
                    ${item.note ? '<br>หมายเหตุ: ' + item.note : ''}
                </div>
            `;
        });

        const orderTime = new Date(order.order_date);
        const timeStr = orderTime.toLocaleString('th-TH');

        const paymentButtons = order.status === 'pending_payment' ? `
            <div class="payment-actions" style="margin-top: 10px;">
                <button onclick="confirmPayment(${order.id}, 'cash')" class="payment-btn cash-btn">ยืนยันเงินสด</button>
                <button onclick="confirmPayment(${order.id}, 'transfer')" class="payment-btn transfer-btn">ยืนยันโอนเงิน</button>
            </div>
        ` : '';

        orderElement.innerHTML = `
            <div class="order-header">
                <span class="order-id">ออเดอร์ #${order.order_number} ${order.table_number ? `<br><small style="font-size: 14px; color: #666;">โต๊ะที่ ${order.table_number}</small>` : ''}</span>
                <div>
                    <span class="order-payment ${paymentClass}">${order.payment_text}</span>
                    <div class="order-time">${timeStr}</div>
                </div>
            </div>
            <div class="order-details">
                ${itemsHtml}
            </div>
            <div class="order-total">รวม: ${order.total_amount} บาท</div>
            <div class="order-status">สถานะ: ${order.status === 'confirmed' ? 'ยืนยันแล้ว' : order.status === 'pending_payment' ? 'รอยืนยันการชำระเงิน' : 'รอดำเนินการ'}</div>
            ${paymentButtons}
        `;

        orderListContainer.appendChild(orderElement);
    });
}

// ==================== Statistics Functions ====================
async function displaySalesSummary() {
    const salesContainer = document.getElementById('sales-summary');
    if (!salesContainer) return;

    salesContainer.innerHTML = '';

    const periodButtons = `
        <div class="period-selector" style="margin-bottom: 20px;">
            <button onclick="showSalesByPeriod('daily')" class="period-btn">รายวัน</button>
            <button onclick="showSalesByPeriod('weekly')" class="period-btn">รายสัปดาห์</button>
            <button onclick="showSalesByPeriod('monthly')" class="period-btn">รายเดือน</button>
            <button onclick="showSalesByPeriod('all')" class="period-btn active">ทั้งหมด</button>
        </div>
    `;

    salesContainer.innerHTML = periodButtons + '<div id="sales-data"></div>';
    showSalesByPeriod('all');
}

async function showSalesByPeriod(period) {
    document.querySelectorAll('.period-btn').forEach((btn) => btn.classList.remove('active'));
    event.target.classList.add('active');

    try {
        const result = await apiCall(`/statistics.php?period=${period}`);
        const stats = result.data;

        const summary = stats.summary;
        const menuSales = stats.menu_sales || [];

        const periodText = {
            daily: 'วันนี้',
            weekly: 'สัปดาห์นี้',
            monthly: 'เดือนนี้',
            all: 'ทั้งหมด'
        };

        const summaryHTML = `
            <div class="summary-stats">
                <h3>สถิติรวม (${periodText[period]})</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${summary.total_orders}</div>
                        <div class="stat-label">จำนวนออเดอร์</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${parseFloat(summary.total_revenue).toLocaleString()}</div>
                        <div class="stat-label">ยอดขาย (บาท)</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${Math.round(parseFloat(summary.average_order_value))}</div>
                        <div class="stat-label">ยอดเฉลี่ยต่อออเดอร์</div>
                    </div>
                </div>
            </div>
            
            <div class="payment-stats">
                <h3>สถิติการชำระเงิน</h3>
                <div class="payment-grid">
                    <div class="payment-item">
                        <div class="payment-type">เงินสด</div>
                        <div class="payment-details">
                            <span>จำนวน: ${summary.cash_orders} ครั้ง</span>
                            <span>ยอดเงิน: ${parseFloat(summary.cash_revenue).toLocaleString()} บาท</span>
                        </div>
                    </div>
                    <div class="payment-item">
                        <div class="payment-type">โอนเงิน</div>
                        <div class="payment-details">
                            <span>จำนวน: ${summary.transfer_orders} ครั้ง</span>
                            <span>ยอดเงิน: ${parseFloat(summary.transfer_revenue).toLocaleString()} บาท</span>
                        </div>
                    </div>
                    ${summary.pending_orders > 0 ? `
                    <div class="payment-item">
                        <div class="payment-type">รอยืนยัน</div>
                        <div class="payment-details">
                            <span>จำนวน: ${summary.pending_orders} ครั้ง</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${menuSales.length > 0 ? `
            <div class="menu-sales-stats">
                <h3>เมนูยอดนิยม</h3>
                <div class="menu-sales-list">
                    ${menuSales.slice(0, 10).map((menu, index) => `
                        <div class="menu-sales-item">
                            <div class="rank">${index + 1}</div>
                            <div class="menu-name">${menu.menu_name}</div>
                            <div class="menu-stats">
                                <div>ขาย: ${menu.total_qty} ชาม</div>
                                <div>รายได้: ${parseFloat(menu.total_revenue).toLocaleString()} บาท</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        `;

        document.getElementById('sales-data').innerHTML = summaryHTML;
    } catch (error) {
        document.getElementById('sales-data').innerHTML = '<div class="no-sales">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// ==================== Admin Functions ====================
async function adminLogin() {
    const password = document.getElementById('admin-password').value;

    try {
        const result = await apiCall('/auth.php', 'POST', { password });
        
        if (result.success) {
            isAdminLoggedIn = true;
            document.getElementById('admin-login-page').classList.remove('active');
            document.getElementById('admin-dashboard').classList.add('active');
            document.getElementById('admin-password').value = '';
        }
    } catch (error) {
        alert('รหัสผ่านไม่ถูกต้อง');
        document.getElementById('admin-password').value = '';
    }
}

async function adminLogout() {
    try {
        await apiCall('/auth.php', 'DELETE');
        isAdminLoggedIn = false;
        
        const dashboardPage = document.getElementById('admin-dashboard');
        const menuManagementPage = document.getElementById('menu-management-page');
        const orderHistoryPage = document.getElementById('order-history-page');
        const salesSummaryPage = document.getElementById('sales-summary-page');
        const tableManagementPage = document.getElementById('table-management-page');
        const qrPage = document.getElementById('qr-page');
        const adminLoginPage = document.getElementById('admin-login-page');

        if (dashboardPage) dashboardPage.classList.remove('active');
        if (menuManagementPage) menuManagementPage.classList.remove('active');
        if (orderHistoryPage) orderHistoryPage.classList.remove('active');
        if (salesSummaryPage) salesSummaryPage.classList.remove('active');
        if (tableManagementPage) tableManagementPage.classList.remove('active');
        
        if (qrPage) {
            qrPage.classList.add('active');
        } else if (adminLoginPage) {
            adminLoginPage.classList.add('active');
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ==================== UI Navigation Functions ====================
function showMenuManagement() {
    document.getElementById('admin-dashboard').classList.remove('active');
    document.getElementById('menu-management-page').classList.add('active');
    displayMenuList();
}

function showOrderHistory() {
    document.getElementById('admin-dashboard').classList.remove('active');
    document.getElementById('order-history-page').classList.add('active');
    loadOrderHistory().then(() => displayOrderHistory());
}

function showSalesSummary() {
    document.getElementById('admin-dashboard').classList.remove('active');
    document.getElementById('sales-summary-page').classList.add('active');
    displaySalesSummary();
}

function showTableManagement() {
    document.getElementById('admin-dashboard').classList.remove('active');
    document.getElementById('table-management-page').classList.add('active');
    displayTableList();
}

function goBackToAdminDashboard() {
    document.getElementById('menu-management-page').classList.remove('active');
    document.getElementById('order-history-page').classList.remove('active');
    document.getElementById('sales-summary-page').classList.remove('active');
    document.getElementById('table-management-page').classList.remove('active');
    document.getElementById('admin-dashboard').classList.add('active');
}

function showAddMenuForm() {
    document.getElementById('add-menu-form').style.display = 'block';
    editingMenuId = null;
    document.getElementById('new-menu-name').value = '';
    document.getElementById('new-menu-price').value = '50';
}

function cancelAddMenu() {
    document.getElementById('add-menu-form').style.display = 'none';
    editingMenuId = null;
}

function showAddTableForm() {
    document.getElementById('add-table-form').style.display = 'block';
    document.getElementById('new-table-number').value = '';
}

function cancelAddTable() {
    document.getElementById('add-table-form').style.display = 'none';
}

async function addNewTable() {
    const tableNumber = parseInt(document.getElementById('new-table-number').value);

    if (!tableNumber || tableNumber < 1) {
        alert('กรุณากรอกหมายเลขโต๊ะที่ถูกต้อง');
        return;
    }

    if (await addTable(tableNumber)) {
        alert('เพิ่มโต๊ะเรียบร้อยแล้ว');
        cancelAddTable();
        displayTableList();
    }
}

function displayTableList() {
    const tableListContainer = document.getElementById('table-list-admin');
    if (!tableListContainer) return;
    
    tableListContainer.innerHTML = '';

    if (tables.length === 0) {
        tableListContainer.innerHTML = '<div class="no-data">ยังไม่มีข้อมูลโต๊ะ</div>';
        return;
    }

    tables.forEach((table) => {
        const tableItem = document.createElement('div');
        tableItem.className = 'menu-item-admin';
        tableItem.innerHTML = `
            <div class="menu-item-info">
                <h4>โต๊ะที่ ${table.table_number}</h4>
                <p>${table.table_name}</p>
            </div>
            <div class="menu-item-actions">
                <button onclick="deleteTableAdmin(${table.id})" class="delete-btn">ลบ</button>
            </div>
        `;
        tableListContainer.appendChild(tableItem);
    });
}

async function deleteTableAdmin(tableId) {
    if (confirm('คุณต้องการลบโต๊ะนี้หรือไม่?')) {
        await deleteTable(tableId);
        displayTableList();
        alert('ลบโต๊ะเรียบร้อยแล้ว');
    }
}

// ==================== Cart Functions ====================
function selectMenuItem(menuName) {
    currentItem = {
        name: menuName,
        normalPrice: 50,
        specialPrice: 60,
    };

    document.getElementById('selected-menu-name').textContent = menuName;
    document.getElementById('normal-price').textContent = '50 บาท';
    document.getElementById('special-price').textContent = '60 บาท';

    currentQuantity = 1;
    document.getElementById('quantity').textContent = currentQuantity;
    document.getElementById('normal-size').checked = true;
    document.getElementById('special-size').checked = false;

    const noodleSection = document.querySelector('.option-group');
    // เมนูที่ไม่มีเส้น: เกาเหลา และ ลูกชิ้นลวก
    const noNoodleMenus = ['เกาเหลา', 'ลูกชิ้นลวก หมู/เนื้อ/เอ็น'];
    if (noNoodleMenus.includes(menuName)) {
        noodleSection.style.display = 'none';
    } else {
        noodleSection.style.display = 'block';
        document.querySelector('input[name="noodle"][value="เส้นเล็ก"]').checked = true;
    }

    document.querySelectorAll('input[name="meatball"]').forEach((cb) => {
        cb.checked = false;
        cb.disabled = false;
    });
    document.querySelector('input[name="meatball"][value="ลูกชิ้นหมู"]').checked = true;

    document.querySelectorAll('input[name="vegetable"]').forEach((cb) => (cb.checked = false));
    document.querySelector('input[name="vegetable"][value="ผักบุ้ง"]').checked = true;

    limitMeatballSelection();
    document.getElementById('special-note').value = '';
    calculateTotal();

    const optionModal = document.getElementById('option-modal');
    if (optionModal) {
        optionModal.style.display = 'flex';
    }
}

function closeOptionModal() {
    const optionModal = document.getElementById('option-modal');
    if (optionModal) {
        optionModal.style.display = 'none';
    }
}

function increaseQuantity() {
    currentQuantity++;
    document.getElementById('quantity').textContent = currentQuantity;
    calculateTotal();
}

function decreaseQuantity() {
    if (currentQuantity > 1) {
        currentQuantity--;
        document.getElementById('quantity').textContent = currentQuantity;
        calculateTotal();
    }
}

function calculateTotal() {
    if (!currentItem) return;

    const sizeSelection = document.querySelector('input[name="size"]:checked');
    let total = 0;

    if (sizeSelection) {
        if (sizeSelection.value === 'normal') {
            total = currentItem.normalPrice * currentQuantity;
        } else if (sizeSelection.value === 'special') {
            total = currentItem.specialPrice * currentQuantity;
        }
    }

    document.getElementById('item-total').textContent = total + ' บาท';
}

function limitMeatballSelection() {
    const meatballCheckboxes = document.querySelectorAll('input[name="meatball"]');
    const checkedMeatballs = document.querySelectorAll('input[name="meatball"]:checked');

    if (checkedMeatballs.length >= 3) {
        meatballCheckboxes.forEach((cb) => {
            if (!cb.checked) {
                cb.disabled = true;
            }
        });
    } else {
        meatballCheckboxes.forEach((cb) => {
            cb.disabled = false;
        });
    }
}

function addToCart() {
    if (!currentItem) return;

    const sizeSelection = document.querySelector('input[name="size"]:checked');

    if (!sizeSelection) {
        alert('กรุณาเลือกขนาดอาหาร');
        return;
    }

    const noodleType = currentItem.name === 'เกาเหลา' ? 'ไม่มีเส้น' : document.querySelector('input[name="noodle"]:checked')?.value || '';

    const selectedMeatballs = [];
    document.querySelectorAll('input[name="meatball"]:checked').forEach((cb) => {
        selectedMeatballs.push(cb.value);
    });

    const selectedVegetables = [];
    document.querySelectorAll('input[name="vegetable"]:checked').forEach((cb) => {
        selectedVegetables.push(cb.value);
    });

    const specialNote = document.getElementById('special-note').value;

    let total = 0;
    if (sizeSelection.value === 'normal') {
        total = currentItem.normalPrice * currentQuantity;
    } else if (sizeSelection.value === 'special') {
        total = currentItem.specialPrice * currentQuantity;
    }

    const cartItem = {
        id: Date.now(),
        name: currentItem.name,
        normalQty: sizeSelection.value === 'normal' ? currentQuantity : 0,
        specialQty: sizeSelection.value === 'special' ? currentQuantity : 0,
        normalPrice: currentItem.normalPrice,
        specialPrice: currentItem.specialPrice,
        noodleType: noodleType,
        meatballs: selectedMeatballs,
        vegetables: selectedVegetables,
        note: specialNote,
        total: total,
    };

    cart.push(cartItem);
    saveCartToSession(); // บันทึกลง sessionStorage
    updateCartDisplay();
    alert('เพิ่มเมนูลงตะกร้าเรียบร้อย!');
    closeOptionModal();
}

function updateCartDisplay() {
    // โหลด cart จาก sessionStorage ทุกครั้งที่ update
    loadCartFromSession();
    
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total-price');
    const cartCount = document.getElementById('cart-count');
    
    if (cartCount) {
        cartCount.textContent = cart.length;
    }

    if (!cartItemsContainer || !cartTotalElement) {
        return;
    }

    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">ไม่มีรายการในตะกร้า<br><a href="menu.html?table=' + currentTableNumber + '" style="color: #2196F3;">กลับไปเลือกเมนู</a></div>';
        cartTotalElement.textContent = '0 บาท';
        return;
    }

    let totalPrice = 0;

    cart.forEach((item) => {
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';

        let itemDetails = [];
        if (item.normalQty > 0) {
            itemDetails.push(`ธรรมดา ${item.normalQty} ชาม`);
        }
        if (item.specialQty > 0) {
            itemDetails.push(`พิเศษ ${item.specialQty} ชาม`);
        }

        cartItemElement.innerHTML = `
            <div class="cart-item-header">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-image"></div>
            </div>
            <div class="cart-item-details">${itemDetails.join(', ')}</div>
            <div class="cart-item-details">เส้น: ${item.noodleType}</div>
            ${item.meatballs.length > 0 ? `<div class="cart-item-details">ลูกชิ้น: ${item.meatballs.join(', ')}</div>` : ''}
            ${item.vegetables.length > 0 ? `<div class="cart-item-details">ผัก: ${item.vegetables.join(', ')}</div>` : ''}
            ${item.note ? `<div class="cart-item-details">หมายเหตุ: ${item.note}</div>` : ''}
            <div class="cart-item-price">${item.total} บาท</div>
            <div class="cart-item-actions">
                <button onclick="editCartItem(${item.id})" class="edit-cart-btn">แก้ไข</button>
                <button onclick="deleteCartItem(${item.id})" class="delete-cart-btn">ลบ</button>
            </div>
        `;

        cartItemsContainer.appendChild(cartItemElement);
        totalPrice += item.total;
    });

    cartTotalElement.textContent = totalPrice + ' บาท';
}

function deleteCartItem(itemId) {
    if (confirm('คุณต้องการลบรายการนี้หรือไม่?')) {
        cart = cart.filter((item) => item.id !== itemId);
        saveCartToSession(); // บันทึกลง sessionStorage
        updateCartDisplay();
    }
}

function editCartItem(itemId) {
    const itemIndex = cart.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    cart.splice(itemIndex, 1);

    currentItem = {
        name: item.name,
        normalPrice: item.normalPrice,
        specialPrice: item.specialPrice,
    };

    document.getElementById('selected-menu-name').textContent = item.name;
    document.getElementById('normal-price').textContent = item.normalPrice + ' บาท';
    document.getElementById('special-price').textContent = item.specialPrice + ' บาท';

    if (item.normalQty > 0) {
        currentQuantity = item.normalQty;
        document.getElementById('normal-size').checked = true;
    } else if (item.specialQty > 0) {
        currentQuantity = item.specialQty;
        document.getElementById('special-size').checked = true;
    }
    document.getElementById('quantity').textContent = currentQuantity;

    const noodleSection = document.querySelector('.option-group');
    if (item.name === 'เกาเหลา') {
        noodleSection.style.display = 'none';
    } else {
        noodleSection.style.display = 'block';
        document.querySelectorAll('input[name="noodle"]').forEach((radio) => {
            if (radio.value === item.noodleType) {
                radio.checked = true;
            }
        });
    }

    document.querySelectorAll('input[name="meatball"]').forEach((cb) => {
        cb.checked = item.meatballs.includes(cb.value);
        cb.disabled = false;
    });
    limitMeatballSelection();

    document.querySelectorAll('input[name="vegetable"]').forEach((cb) => {
        cb.checked = item.vegetables.includes(cb.value);
    });

    document.getElementById('special-note').value = item.note;
    calculateTotal();

    const optionModal = document.getElementById('option-modal');
    if (optionModal) {
        optionModal.style.display = 'flex';
    }
}

// ==================== Event Listeners ====================
document.addEventListener('DOMContentLoaded', function () {
    // โหลด cart จาก sessionStorage
    loadCartFromSession();
    
    // โหลดข้อมูลเริ่มต้น
    loadInitialData();

    // Event listeners สำหรับการเปลี่ยนแปลงขนาด
    const sizeRadios = document.querySelectorAll('input[name="size"]');
    sizeRadios.forEach((radio) => {
        radio.addEventListener('change', calculateTotal);
    });

    // Event listeners สำหรับการจำกัดลูกชิ้น
    const meatballCheckboxes = document.querySelectorAll('input[name="meatball"]');
    meatballCheckboxes.forEach((cb) => {
        cb.addEventListener('change', limitMeatballSelection);
    });

    // อัปเดต cart display
    updateCartDisplay();
});

// ==================== Navigation Functions (รักษาหมายเลขโต๊ะ) ====================
function goToHome() {
    window.location.href = `index.html?table=${currentTableNumber}`;
}

function goToMenu() {
    window.location.href = `menu.html?table=${currentTableNumber}`;
}

function goToCart() {
    window.location.href = `cart.html?table=${currentTableNumber}`;
}

// ==================== Utility Functions ====================
function showAdminLogin() {
    document.getElementById('qr-page').classList.remove('active');
    document.getElementById('admin-login-page').classList.add('active');
}

function goBackToQR() {
    document.getElementById('admin-login-page').classList.remove('active');
    document.getElementById('qr-page').classList.add('active');
}