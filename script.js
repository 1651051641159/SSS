// ตัวแปรสำหรับเก็บข้อมูล
let currentItem = null;
let cart = [];
let currentQuantity = 1;
let isAdminLoggedIn = false;
let menuItems = [
    { id: 1, name: "ก๋วยเตี๋ยวน้ำใส", price: 50 },
    { id: 2, name: "ก๋วยเตี๋ยวต้มยำ", price: 50 },
    { id: 3, name: "ก๋วยเตี๋ยวเย็นตาโฟ", price: 50 },
    { id: 4, name: "ก๋วยเตี๋ยวแห้ง", price: 50 },
    { id: 5, name: "ลูกชิ้นลวก หมู/เนื้อ/เอ็น", price: 50 },
    { id: 6, name: "เกาเหลา", price: 50 },
];
let editingMenuId = null;
let orderHistory = [];

// เพิ่มข้อมูลตัวอย่างสำหรับทดสอบ (เฉพาะครั้งแรกที่ไม่มีข้อมูลใน localStorage)
function initializeSampleData() {
    // ตรวจสอบว่ามีข้อมูลใน localStorage หรือไม่
    const saved = localStorage.getItem("orderHistory");
    if (!saved || saved === "[]") {
        // เพิ่มออเดอร์ตัวอย่าง 2 รายการเพื่อแสดงว่าระบบทำงาน
        orderHistory.push({
            id: Date.now() - 3600000, // ใช้ timestamp เป็น ID
            timestamp: new Date(Date.now() - 3600000), // 1 ชั่วโมงที่แล้ว
            items: [
                {
                    name: "ก๋วยเตี๋ยวน้ำใส",
                    normalQty: 1,
                    specialQty: 0,
                    noodleType: "เส้นเล็ก",
                    meatballs: ["ลูกชิ้นหมู"],
                    vegetables: ["ผักบุ้ง"],
                    note: "",
                    total: 50,
                },
            ],
            paymentMethod: "cash",
            paymentText: "เงินสด",
            total: 50,
            status: "confirmed",
        });

        orderHistory.push({
            id: Date.now() - 1800000,
            timestamp: new Date(Date.now() - 1800000), // 30 นาทีที่แล้ว
            items: [
                {
                    name: "ก๋วยเตี๋ยวต้มยำ",
                    normalQty: 0,
                    specialQty: 1,
                    noodleType: "บะหมี่เหลือง",
                    meatballs: ["ลูกชิ้นเนื้อ", "ลูกชิ้นเอ็น"],
                    vegetables: ["กะหล่ำ"],
                    note: "เผ็ดน้อย",
                    total: 60,
                },
            ],
            paymentMethod: "transfer",
            paymentText: "โอนเงิน",
            total: 60,
            status: "confirmed",
        });

        // บันทึกข้อมูลตัวอย่างไว้ใน localStorage
        saveOrderHistory();
    }
}

// ฟังก์ชันแสดงหน้าเมนู
function showMenuPage() {
    document.getElementById("qr-page").classList.remove("active");
    document.getElementById("menu-page").classList.add("active");
}

// ฟังก์ชันย้อนกลับหน้าแรก
function goBackToQR() {
    document.getElementById("menu-page").classList.remove("active");
    document.getElementById("qr-page").classList.add("active");
}

// ฟังก์ชันเลือกเมนู
function selectMenuItem(menuName) {
    // กำหนดราคาคงที่: ธรรมดา 50 บาท พิเศษ 60 บาท
    currentItem = {
        name: menuName,
        normalPrice: 50,
        specialPrice: 60,
    };

    // อัพเดทหน้าเลือกตัวเลือก
    document.getElementById("selected-menu-name").textContent = menuName;
    document.getElementById("normal-price").textContent = "50 บาท";
    document.getElementById("special-price").textContent = "60 บาท";

    // รีเซ็ตค่าเริ่มต้น
    currentQuantity = 1;
    document.getElementById("quantity").textContent = currentQuantity;
    document.getElementById("normal-size").checked = true;
    document.getElementById("special-size").checked = false;

    // ซ่อน/แสดงส่วนเลือกเส้นสำหรับเกาเหลา
    const noodleSection = document.querySelector(".option-group");
    if (menuName === "เกาเหลา") {
        noodleSection.style.display = "none";
    } else {
        noodleSection.style.display = "block";
        // รีเซ็ตตัวเลือกเส้น
        document.querySelector(
            'input[name="noodle"][value="เส้นเล็ก"]',
        ).checked = true;
    }

    // รีเซ็ต checkbox และเปิดใช้งานคืน
    document.querySelectorAll('input[name="meatball"]').forEach((cb) => {
        cb.checked = false;
        cb.disabled = false; // เปิดใช้งานคืนสำหรับออเดอร์ใหม่
    });
    document.querySelector(
        'input[name="meatball"][value="ลูกชิ้นหมู"]',
    ).checked = true;

    document
        .querySelectorAll('input[name="vegetable"]')
        .forEach((cb) => (cb.checked = false));
    document.querySelector('input[name="vegetable"][value="ผักบุ้ง"]').checked =
        true;

    // ตรวจสอบการจำกัดลูกชิ้นหลังจากรีเซ็ต
    limitMeatballSelection();

    document.getElementById("special-note").value = "";

    // คำนวณราคา
    calculateTotal();

    // แสดงหน้าเลือกตัวเลือก
    document.getElementById("menu-page").classList.remove("active");
    document.getElementById("option-page").classList.add("active");

    // เลื่อนขึ้นบนสุด
    document.getElementById("option-page").scrollTop = 0;
}

// ฟังก์ชันกลับไปหน้าเมนู
function goBackToMenu() {
    document.getElementById("option-page").classList.remove("active");
    document.getElementById("menu-page").classList.add("active");
}

// ฟังก์ชันเพิ่ม/ลดจำนวน
function increaseQuantity() {
    currentQuantity++;
    document.getElementById("quantity").textContent = currentQuantity;
    calculateTotal();
}

function decreaseQuantity() {
    if (currentQuantity > 1) {
        currentQuantity--;
        document.getElementById("quantity").textContent = currentQuantity;
        calculateTotal();
    }
}

// ฟังก์ชันคำนวณราคารวม
function calculateTotal() {
    if (!currentItem) return;

    const sizeSelection = document.querySelector('input[name="size"]:checked');
    let total = 0;

    if (sizeSelection) {
        if (sizeSelection.value === "normal") {
            total = currentItem.normalPrice * currentQuantity;
        } else if (sizeSelection.value === "special") {
            total = currentItem.specialPrice * currentQuantity;
        }
    }

    document.getElementById("item-total").textContent = total + " บาท";
}

// จำกัดการเลือกลูกชิ้นไม่เกิน 3 ชนิด
function limitMeatballSelection() {
    const meatballCheckboxes = document.querySelectorAll(
        'input[name="meatball"]',
    );
    const checkedMeatballs = document.querySelectorAll(
        'input[name="meatball"]:checked',
    );

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

// เพิ่ม event listener สำหรับการเปลี่ยนแปลงขนาด
document.addEventListener("DOMContentLoaded", function () {
    const sizeRadios = document.querySelectorAll('input[name="size"]');

    sizeRadios.forEach((radio) => {
        radio.addEventListener("change", calculateTotal);
    });

    // เพิ่ม event listener สำหรับการจำกัดลูกชิ้น
    const meatballCheckboxes = document.querySelectorAll(
        'input[name="meatball"]',
    );
    meatballCheckboxes.forEach((cb) => {
        cb.addEventListener("change", limitMeatballSelection);
    });
});

// ฟังก์ชันเพิ่มลงตะกร้า
function addToCart() {
    if (!currentItem) return;

    const sizeSelection = document.querySelector('input[name="size"]:checked');

    if (!sizeSelection) {
        alert("กรุณาเลือกขนาดอาหาร");
        return;
    }

    // รวบรวมตัวเลือกที่เลือก
    const noodleType =
        currentItem.name === "เกาเหลา"
            ? "ไม่มีเส้น"
            : document.querySelector('input[name="noodle"]:checked')?.value ||
              "";

    const selectedMeatballs = [];
    document
        .querySelectorAll('input[name="meatball"]:checked')
        .forEach((cb) => {
            selectedMeatballs.push(cb.value);
        });

    const selectedVegetables = [];
    document
        .querySelectorAll('input[name="vegetable"]:checked')
        .forEach((cb) => {
            selectedVegetables.push(cb.value);
        });

    const specialNote = document.getElementById("special-note").value;

    // สร้างรายการสำหรับตะกร้า
    let total = 0;
    if (sizeSelection.value === "normal") {
        total = currentItem.normalPrice * currentQuantity;
    } else if (sizeSelection.value === "special") {
        total = currentItem.specialPrice * currentQuantity;
    }

    const cartItem = {
        id: Date.now(),
        name: currentItem.name,
        normalQty: sizeSelection.value === "normal" ? currentQuantity : 0,
        specialQty: sizeSelection.value === "special" ? currentQuantity : 0,
        normalPrice: currentItem.normalPrice,
        specialPrice: currentItem.specialPrice,
        noodleType: noodleType,
        meatballs: selectedMeatballs,
        vegetables: selectedVegetables,
        note: specialNote,
        total: total,
    };

    cart.push(cartItem);
    updateCartDisplay();

    // กลับไปหน้ารายการสั่งซื้อ
    document.getElementById("option-page").classList.remove("active");
    document.getElementById("cart-page").classList.add("active");
}

// ฟังก์ชันอัพเดทการแสดงผลตะกร้า
function updateCartDisplay() {
    const cartItemsContainer = document.getElementById("cart-items");
    const cartTotalElement = document.getElementById("cart-total-price");

    // ล้างรายการเก่า
    cartItemsContainer.innerHTML = "";

    let totalPrice = 0;

    cart.forEach((item) => {
        const cartItemElement = document.createElement("div");
        cartItemElement.className = "cart-item";

        // สร้างรายละเอียดสินค้า
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
            <div class="cart-item-details">${itemDetails.join(", ")}</div>
            <div class="cart-item-details">เส้น: ${item.noodleType}</div>
            ${item.meatballs.length > 0 ? `<div class="cart-item-details">ลูกชิ้น: ${item.meatballs.join(", ")}</div>` : ""}
            ${item.vegetables.length > 0 ? `<div class="cart-item-details">ผัก: ${item.vegetables.join(", ")}</div>` : ""}
            ${item.note ? `<div class="cart-item-details">หมายเหตุ: ${item.note}</div>` : ""}
            <div class="cart-item-price">${item.total} บาท</div>
            <div class="cart-item-actions">
                <button onclick="editCartItem(${item.id})" class="edit-cart-btn">แก้ไข</button>
                <button onclick="deleteCartItem(${item.id})" class="delete-cart-btn">ลบ</button>
            </div>
        `;

        cartItemsContainer.appendChild(cartItemElement);
        totalPrice += item.total;
    });

    cartTotalElement.textContent = totalPrice + " บาท";
}

// ฟังก์ชันสร้างหมายเลขออเดอร์แบบลำดับ
function generateOrderNumber() {
    // โหลดหมายเลขออเดอร์ล่าสุดจาก localStorage
    let lastOrderNumber = localStorage.getItem("lastOrderNumber");

    if (lastOrderNumber === null) {
        // ถ้าไม่มีในระบบ เริ่มจาก 0000
        lastOrderNumber = 0;
    } else {
        lastOrderNumber = parseInt(lastOrderNumber);
    }

    // เพิ่มหมายเลขขึ้น 1
    lastOrderNumber += 1;

    // ถ้าเกิน 9999 ให้กลับไป 0000
    if (lastOrderNumber > 9999) {
        lastOrderNumber = 0;
    }

    // บันทึกหมายเลขล่าสุดลง localStorage
    localStorage.setItem("lastOrderNumber", lastOrderNumber.toString());

    // ส่งคืนตัวเลข (numeric) เพื่อให้ admin functions ทำงานถูกต้อง
    return lastOrderNumber;
}

// ฟังก์ชันแปลงหมายเลขออเดอร์เป็นรูปแบบ 4 หลักสำหรับการแสดงผล
function formatOrderId(orderId) {
    return orderId.toString().padStart(4, "0");
}

// ฟังก์ชันสั่งอาหาร
function placeOrder() {
    if (cart.length === 0) {
        alert("ไม่มีรายการในตะกร้า");
        return;
    }

    // คำนวณราคารวม
    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);

    // สร้างหมายเลขออเดอร์แบบลำดับ
    const orderNumber = generateOrderNumber();

    // เก็บประวัติการสั่งซื้อ
    const order = {
        id: orderNumber, // ใช้หมายเลขลำดับแทน timestamp (เก็บเป็น numeric เพื่อ admin functions)
        timestamp: new Date(),
        items: [...cart],
        paymentMethod: "pending", // รอแอดมินถาม
        paymentText: "รอแอดมินถาม",
        total: totalAmount,
        status: "pending_payment", // สถานะรอการชำระเงิน
    };

    orderHistory.push(order);

    // บันทึกลง localStorage เพื่อให้คงอยู่ระหว่างการรีเฟรช
    saveOrderHistory();

    // แสดงหมายเลขออเดอร์ 4 หลัก สำหรับ UI
    const displayOrderId = formatOrderId(orderNumber);
    alert(
        `สั่งอาหารเรียบร้อยแล้ว!\nหมายเลขออเดอร์: #${displayOrderId}\nยอดรวม: ${totalAmount} บาท\nพนักงานจะมาถามวิธีการชำระเงิน\nรอสักครู่อาหารจะมาเสิร์ฟ`,
    );

    // รีเซ็ตตะกร้า
    cart = [];
    updateCartDisplay();

    // กลับไปหน้าเมนู
    document.getElementById("cart-page").classList.remove("active");
    document.getElementById("menu-page").classList.add("active");
}

// ฟังก์ชันแก้ไขรายการในตะกร้า
function editCartItem(itemId) {
    // หารายการที่ต้องการแก้ไข
    const itemIndex = cart.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];

    // ลบรายการออกจากตะกร้าชั่วคราว
    cart.splice(itemIndex, 1);

    // ตั้งค่าข้อมูลเมนูปัจจุบัน
    currentItem = {
        name: item.name,
        normalPrice: item.normalPrice,
        specialPrice: item.specialPrice,
    };

    // อัพเดทหน้าเลือกตัวเลือกด้วยข้อมูลเดิม
    document.getElementById("selected-menu-name").textContent = item.name;
    document.getElementById("normal-price").textContent =
        item.normalPrice + " บาท";
    document.getElementById("special-price").textContent =
        item.specialPrice + " บาท";

    // ตั้งค่าจำนวนและขนาด
    if (item.normalQty > 0) {
        currentQuantity = item.normalQty;
        document.getElementById("normal-size").checked = true;
    } else if (item.specialQty > 0) {
        currentQuantity = item.specialQty;
        document.getElementById("special-size").checked = true;
    }
    document.getElementById("quantity").textContent = currentQuantity;

    // ซ่อน/แสดงส่วนเลือกเส้นสำหรับเกาเหลา
    const noodleSection = document.querySelector(".option-group");
    if (item.name === "เกาเหลา") {
        noodleSection.style.display = "none";
    } else {
        noodleSection.style.display = "block";
        // ตั้งค่าตัวเลือกเส้น
        document.querySelectorAll('input[name="noodle"]').forEach((radio) => {
            if (radio.value === item.noodleType) {
                radio.checked = true;
            }
        });
    }

    // ตั้งค่าลูกชิ้น
    document.querySelectorAll('input[name="meatball"]').forEach((cb) => {
        cb.checked = item.meatballs.includes(cb.value);
        cb.disabled = false;
    });
    limitMeatballSelection();

    // ตั้งค่าผัก
    document.querySelectorAll('input[name="vegetable"]').forEach((cb) => {
        cb.checked = item.vegetables.includes(cb.value);
    });

    // ตั้งค่าหมายเหตุ
    document.getElementById("special-note").value = item.note;

    // คำนวณราคา
    calculateTotal();

    // แสดงหน้าเลือกตัวเลือก
    document.getElementById("cart-page").classList.remove("active");
    document.getElementById("option-page").classList.add("active");

    // เลื่อนขึ้นบนสุด
    document.getElementById("option-page").scrollTop = 0;
}

// ฟังก์ชันลบรายการออกจากตะกร้า
function deleteCartItem(itemId) {
    if (confirm("คุณต้องการลบรายการนี้หรือไม่?")) {
        cart = cart.filter((item) => item.id !== itemId);
        updateCartDisplay();
    }
}

// ฟังก์ชันเพิ่มเติมสำหรับการนำทาง
function showCartPage() {
    document.getElementById("menu-page").classList.remove("active");
    document.getElementById("cart-page").classList.add("active");
    updateCartDisplay();
}

// ฟังก์ชันย้อนกลับจากหน้าตะกร้าไปหน้าเมนู
function goBackToMenuFromCart() {
    document.getElementById("cart-page").classList.remove("active");
    document.getElementById("menu-page").classList.add("active");
}

// เพิ่มปุ่มดูตะกร้าในหน้าเมนู (ถ้าต้องการ)
document.addEventListener("DOMContentLoaded", function () {
    // โหลดประวัติการสั่งซื้อเมื่อเริ่มต้น
    loadOrderHistory();
    // ถ้าไม่มีข้อมูลในประวัติ ให้เพิ่มข้อมูลตัวอย่าง
    if (orderHistory.length === 0) {
        initializeSampleData();
    }

    // เพิ่มปุ่มดูตะกร้าในหน้าเมนู
    const menuPage = document.getElementById("menu-page");
    if (menuPage) {
        const cartButton = document.createElement("button");
        cartButton.textContent = "ดูตะกร้า (" + cart.length + ")";
        cartButton.className = "cart-button";
        cartButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #f44336;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 20px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 1000;
        `;
        cartButton.onclick = showCartPage;

        document.body.appendChild(cartButton);

        // อัพเดทจำนวนในปุ่ม
        const originalUpdateCart = updateCartDisplay;
        updateCartDisplay = function () {
            originalUpdateCart();
            cartButton.textContent = "ดูตะกร้า (" + cart.length + ")";
        };
    }
});

// ฟังก์ชันสำหรับระบบแอดมิน
function showAdminLogin() {
    document.getElementById("qr-page").classList.remove("active");
    document.getElementById("admin-login-page").classList.add("active");
}

function goBackToQR() {
    document.getElementById("admin-login-page").classList.remove("active");
    document.getElementById("qr-page").classList.add("active");
}

function adminLogin() {
    const password = document.getElementById("admin-password").value;

    if (password === "111223") {
        isAdminLoggedIn = true;
        document.getElementById("admin-login-page").classList.remove("active");
        document.getElementById("admin-dashboard").classList.add("active");
        document.getElementById("admin-password").value = "";
    } else {
        alert("รหัสผ่านไม่ถูกต้อง");
        document.getElementById("admin-password").value = "";
    }
}

function adminLogout() {
    isAdminLoggedIn = false;
    document.getElementById("admin-dashboard").classList.remove("active");
    document.getElementById("menu-management-page").classList.remove("active");
    document.getElementById("order-history-page").classList.remove("active");
    document.getElementById("sales-summary-page").classList.remove("active");
    document.getElementById("qr-page").classList.add("active");
}

function showMenuManagement() {
    document.getElementById("admin-dashboard").classList.remove("active");
    document.getElementById("menu-management-page").classList.add("active");
    displayMenuList();
}

function showOrderHistory() {
    document.getElementById("admin-dashboard").classList.remove("active");
    document.getElementById("order-history-page").classList.add("active");
    displayOrderHistory();
}

function showSalesSummary() {
    document.getElementById("admin-dashboard").classList.remove("active");
    document.getElementById("sales-summary-page").classList.add("active");
    displaySalesSummary();
}

function goBackToAdminDashboard() {
    document.getElementById("menu-management-page").classList.remove("active");
    document.getElementById("order-history-page").classList.remove("active");
    document.getElementById("sales-summary-page").classList.remove("active");
    document.getElementById("admin-dashboard").classList.add("active");
}

function showAddMenuForm() {
    document.getElementById("add-menu-form").style.display = "block";
    editingMenuId = null;
    document.getElementById("new-menu-name").value = "";
    document.getElementById("new-menu-price").value = "";
}

function cancelAddMenu() {
    document.getElementById("add-menu-form").style.display = "none";
    editingMenuId = null;
}

function addNewMenu() {
    const name = document.getElementById("new-menu-name").value.trim();
    // ใช้ราคาคงที่ 50 บาท ไม่อ่านจาก form
    const price = 50;

    if (!name) {
        alert("กรุณากรอกชื่อเมนู");
        return;
    }

    if (editingMenuId !== null) {
        // แก้ไขเมนูที่มีอยู่
        const menuIndex = menuItems.findIndex(
            (item) => item.id === editingMenuId,
        );
        if (menuIndex !== -1) {
            menuItems[menuIndex].name = name;
            menuItems[menuIndex].price = price; // ราคาคงที่ 50 บาท
        }
    } else {
        // เพิ่มเมนูใหม่
        const newId = Math.max(...menuItems.map((item) => item.id)) + 1;
        menuItems.push({ id: newId, name: name, price: price }); // ราคาคงที่ 50 บาท
    }

    updateMenuDisplay();
    displayMenuList();
    cancelAddMenu();
    alert(
        editingMenuId !== null
            ? "แก้ไขเมนูเรียบร้อยแล้ว"
            : "เพิ่มเมนูใหม่เรียบร้อยแล้ว",
    );
}

function editMenu(id) {
    const menu = menuItems.find((item) => item.id === id);
    if (menu) {
        editingMenuId = id;
        document.getElementById("new-menu-name").value = menu.name;
        document.getElementById("new-menu-price").value = menu.price;
        document.getElementById("add-menu-form").style.display = "block";
    }
}

function deleteMenu(id) {
    if (confirm("คุณต้องการลบเมนูนี้หรือไม่?")) {
        menuItems = menuItems.filter((item) => item.id !== id);
        updateMenuDisplay();
        displayMenuList();
        alert("ลบเมนูเรียบร้อยแล้ว");
    }
}

function displayMenuList() {
    const menuListContainer = document.getElementById("menu-list-admin");
    menuListContainer.innerHTML = "";

    menuItems.forEach((menu) => {
        const menuElement = document.createElement("div");
        menuElement.className = "admin-menu-item";
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

function updateMenuDisplay() {
    const menuListContainer = document.querySelector(
        ".menu-list .menu-category",
    );

    // ลบเมนูเก่าออก (เก็บเฉพาะ header)
    const header = menuListContainer.querySelector("h3");
    menuListContainer.innerHTML = "";
    menuListContainer.appendChild(header);

    // เพิ่มเมนูใหม่
    menuItems.forEach((menu) => {
        const menuElement = document.createElement("div");
        menuElement.className = "menu-item";
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

// ฟังก์ชันบันทึกประวัติการสั่งซื้อ
function saveOrderHistory() {
    try {
        localStorage.setItem("orderHistory", JSON.stringify(orderHistory));
    } catch (error) {
        console.log("ไม่สามารถบันทึกประวัติการสั่งซื้อได้");
    }
}

// ฟังก์ชันโหลดประวัติการสั่งซื้อ
function loadOrderHistory() {
    try {
        const saved = localStorage.getItem("orderHistory");
        if (saved && saved !== "[]") {
            const parsed = JSON.parse(saved);
            // แปลง timestamp string กลับเป็น Date object
            orderHistory = parsed.map((order) => ({
                ...order,
                timestamp: new Date(order.timestamp),
                status: order.status || "confirmed", // ให้ค่าเริ่มต้นกรณีไม่มี status
            }));
        } else {
            // ถ้าไม่มีข้อมูลหรือเป็น array ว่าง ให้เตรียมข้อมูลตัวอย่าง
            orderHistory = [];
        }
    } catch (error) {
        console.log("ไม่สามารถโหลดประวัติการสั่งซื้อได้:", error);
        orderHistory = [];
    }
}

function displayOrderHistory() {
    const orderListContainer = document.getElementById("order-list");
    orderListContainer.innerHTML = "";

    // โหลดข้อมูลล่าสุดจาก localStorage
    loadOrderHistory();

    // ถ้าไม่มีข้อมูลในประวัติ ให้เพิ่มข้อมูลตัวอย่าง
    if (orderHistory.length === 0) {
        initializeSampleData();
    }

    if (orderHistory.length === 0) {
        orderListContainer.innerHTML =
            '<div class="no-orders">ยังไม่มีรายการสั่งซื้อ</div>';
        return;
    }

    // เรียงลำดับจากใหม่ไปเก่า
    const sortedOrders = [...orderHistory].reverse();

    sortedOrders.forEach((order) => {
        const orderElement = document.createElement("div");
        orderElement.className = "order-item";

        const paymentClass =
            order.paymentMethod === "transfer" ? "transfer" : "";

        let itemsHtml = "";
        order.items.forEach((item) => {
            let itemDetails = [];
            if (item.normalQty > 0)
                itemDetails.push(`ธรรมดา ${item.normalQty} ชาม`);
            if (item.specialQty > 0)
                itemDetails.push(`พิเศษ ${item.specialQty} ชาม`);

            itemsHtml += `
                <div class="order-item-detail">
                    <strong>${item.name}</strong> - ${itemDetails.join(", ")} (${item.total} บาท)
                    <br>เส้น: ${item.noodleType}
                    ${item.meatballs.length > 0 ? "<br>ลูกชิ้น: " + item.meatballs.join(", ") : ""}
                    ${item.vegetables.length > 0 ? "<br>ผัก: " + item.vegetables.join(", ") : ""}
                    ${item.note ? "<br>หมายเหตุ: " + item.note : ""}
                </div>
            `;
        });

        // แสดงหมายเลขออเดอร์ในรูปแบบ 4 หลักสำหรับ UI
        const displayId = formatOrderId(order.id);
        const orderStatus = order.status || "confirmed"; // กรณีที่ไม่มี status

        // ปลอดภัยกับ timestamp ที่อาจเป็น string
        const orderTime = order.timestamp
            ? new Date(order.timestamp)
            : new Date();
        const timeStr = orderTime.toLocaleString("th-TH");

        const paymentButtons =
            order.status === "pending_payment"
                ? `
            <div class="payment-actions" style="margin-top: 10px;">
                <button onclick="confirmPayment('${order.id}', 'cash')" class="payment-btn cash-btn">ยืนยันเงินสด</button>
                <button onclick="confirmPayment('${order.id}', 'transfer')" class="payment-btn transfer-btn">ยืนยันโอนเงิน</button>
            </div>
        `
                : "";

        orderElement.innerHTML = `
            <div class="order-header">
                <span class="order-id">ออเดอร์ #${displayId}</span>
                <div>
                    <span class="order-payment ${paymentClass}">${order.paymentText}</span>
                    <div class="order-time">${timeStr}</div>
                </div>
            </div>
            <div class="order-details">
                ${itemsHtml}
            </div>
            <div class="order-total">รวม: ${order.total} บาท</div>
            <div class="order-status">สถานะ: ${orderStatus === "confirmed" ? "ยืนยันแล้ว" : orderStatus === "pending_payment" ? "รอยืนยันการชำระเงิน" : "รอดำเนินการ"}</div>
            ${paymentButtons}
        `;

        orderListContainer.appendChild(orderElement);
    });
}

// ฟังก์ชันยืนยันการชำระเงิน
function confirmPayment(orderId, paymentMethod) {
    const orderIndex = orderHistory.findIndex(
        (order) => order.id.toString() === orderId.toString(),
    );
    if (orderIndex !== -1) {
        orderHistory[orderIndex].paymentMethod = paymentMethod;
        orderHistory[orderIndex].paymentText =
            paymentMethod === "cash" ? "เงินสด" : "โอนเงิน";
        orderHistory[orderIndex].status = "confirmed";
        saveOrderHistory();
        displayOrderHistory(); // รีเฟรชการแสดงผล
        alert("ยืนยันการชำระเงินเรียบร้อยแล้ว");
    }
}

function displaySalesSummary() {
    const salesContainer = document.getElementById("sales-summary");
    salesContainer.innerHTML = "";

    // โหลดข้อมูลล่าสุดจาก localStorage
    loadOrderHistory();

    if (orderHistory.length === 0) {
        salesContainer.innerHTML =
            '<div class="no-sales">ยังไม่มีรายการขาย</div>';
        return;
    }

    // เพิ่มตัวเลือกช่วงเวลา
    const periodButtons = `
        <div class="period-selector" style="margin-bottom: 20px;">
            <button onclick="showSalesByPeriod('daily')" class="period-btn">รายวัน</button>
            <button onclick="showSalesByPeriod('weekly')" class="period-btn">รายสัปดาห์</button>
            <button onclick="showSalesByPeriod('monthly')" class="period-btn">รายเดือน</button>
            <button onclick="showSalesByPeriod('all')" class="period-btn active">ทั้งหมด</button>
        </div>
    `;

    salesContainer.innerHTML = periodButtons + '<div id="sales-data"></div>';
    showSalesByPeriod("all");
}
function showSalesByPeriod(period) {
    // ลบ active class จากปุ่มทั้งหมด
    document
        .querySelectorAll(".period-btn")
        .forEach((btn) => btn.classList.remove("active"));
    event.target.classList.add("active");

    let filteredOrders = [...orderHistory];
    const now = new Date();

    if (period === "daily") {
        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
        );
        filteredOrders = orderHistory.filter((order) => {
            const orderDate = new Date(order.timestamp);
            return orderDate >= today;
        });
    } else if (period === "weekly") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredOrders = orderHistory.filter((order) => {
            const orderDate = new Date(order.timestamp);
            return orderDate >= weekAgo;
        });
    } else if (period === "monthly") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredOrders = orderHistory.filter((order) => {
            const orderDate = new Date(order.timestamp);
            return orderDate >= monthAgo;
        });
    }

    // คำนวณสถิติ
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce(
        (sum, order) => sum + order.total,
        0,
    );
    const averageOrderValue =
        totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // นับจำนวนการชำระแต่ละประเภท
    const cashOrders = filteredOrders.filter(
        (order) => order.paymentMethod === "cash",
    ).length;
    const transferOrders = filteredOrders.filter(
        (order) => order.paymentMethod === "transfer",
    ).length;
    const pendingOrders = filteredOrders.filter(
        (order) => order.paymentMethod === "pending",
    ).length;
    const cashRevenue = filteredOrders
        .filter((order) => order.paymentMethod === "cash")
        .reduce((sum, order) => sum + order.total, 0);
    const transferRevenue = filteredOrders
        .filter((order) => order.paymentMethod === "transfer")
        .reduce((sum, order) => sum + order.total, 0);

    // นับยอดขายแต่ละเมนู
    const menuSales = {};
    filteredOrders.forEach((order) => {
        order.items.forEach((item) => {
            if (!menuSales[item.name]) {
                menuSales[item.name] = { qty: 0, revenue: 0 };
            }
            const totalQty = (item.normalQty || 0) + (item.specialQty || 0);
            menuSales[item.name].qty += totalQty;
            menuSales[item.name].revenue += item.total;
        });
    });

    // เรียงลำดับเมนูตามยอดขาย
    const sortedMenuSales = Object.entries(menuSales).sort(
        (a, b) => b[1].revenue - a[1].revenue,
    );

    const periodText = {
        daily: "วันนี้",
        weekly: "สัปดาห์นี้",
        monthly: "เดือนนี้",
        all: "ทั้งหมด",
    };

    // สร้าง HTML
    const summaryHTML = `
        <div class="summary-stats">
            <h3>สถิติรวม (${periodText[period]})</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${totalOrders}</div>
                    <div class="stat-label">จำนวนออเดอร์</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalRevenue.toLocaleString()}</div>
                    <div class="stat-label">ยอดขาย (บาท)</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${averageOrderValue}</div>
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
                        <span>จำนวน: ${cashOrders} ครั้ง</span>
                        <span>ยอดเงิน: ${cashRevenue.toLocaleString()} บาท</span>
                    </div>
                </div>
                <div class="payment-item">
                    <div class="payment-type">โอนเงิน</div>
                    <div class="payment-details">
                        <span>จำนวน: ${transferOrders} ครั้ง</span>
                        <span>ยอดเงิน: ${transferRevenue.toLocaleString()} บาท</span>
                    </div>
                </div>
                ${
                    pendingOrders > 0
                        ? `
                <div class="payment-item">
                    <div class="payment-type">รอยืนยัน</div>
                    <div class="payment-details">
                        <span>จำนวน: ${pendingOrders} ครั้ง</span>
                    </div>
                </div>
                `
                        : ""
                }
            </div>
        </div>
        
        ${
            sortedMenuSales.length > 0
                ? `
        <div class="menu-sales-stats">
            <h3>เมนูยอดนิยม</h3>
            <div class="menu-sales-list">
                ${sortedMenuSales
                    .slice(0, 10)
                    .map(
                        (menu, index) => `
                    <div class="menu-sales-item">
                        <div class="rank">${index + 1}</div>
                        <div class="menu-name">${menu[0]}</div>
                        <div class="menu-stats">
                            <div>ขาย: ${menu[1].qty} ชาม</div>
                            <div>รายได้: ${menu[1].revenue.toLocaleString()} บาท</div>
                        </div>
                    </div>
                `,
                    )
                    .join("")}
            </div>
        </div>
        `
                : ""
        }
    `;

    document.getElementById("sales-data").innerHTML = summaryHTML;
}

// ฟังก์ชันสำหรับ Modal (หลายหน้า)
function closeOptionModal() {
    const optionModal = document.getElementById("option-modal");
    if (optionModal) {
        optionModal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

function closeEditModal() {
    const editModal = document.getElementById("edit-modal");
    if (editModal) {
        editModal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

// ฟังก์ชันอัพเดท Cart Counter
function updateCartCounter() {
    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
        const totalItems = cart.reduce(
            (sum, item) => sum + item.normalQty + item.specialQty,
            0,
        );
        cartCount.textContent = totalItems;
    }
}

// ฟังก์ชันโหลด cart จาก localStorage
function loadCart() {
    const saved = localStorage.getItem("cart");
    if (saved) {
        cart = JSON.parse(saved);
    }
}

// ฟังก์ชันบันทึก cart ลง localStorage
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

// Real-time update: ฟังการเปลี่ยนแปลงจาก localStorage
window.addEventListener("storage", function (e) {
    if (e.key === "orderHistory") {
        loadOrderHistory();
        const orderHistoryPage = document.getElementById("order-history-page");
        const salesSummaryPage = document.getElementById("sales-summary-page");

        if (orderHistoryPage && orderHistoryPage.classList.contains("active")) {
            displayOrderHistory();
        }
        if (salesSummaryPage && salesSummaryPage.classList.contains("active")) {
            displaySalesSummary();
        }
    }

    if (e.key === "cart") {
        loadCart();
        updateCartCounter();
        const cartPage = document.getElementById("cart-page");
        if (cartPage && cartPage.classList.contains("active")) {
            updateCartDisplay();
        }
    }
});

// เมื่อโหลดหน้า - ใช้สำหรับหลายหน้า
window.addEventListener("DOMContentLoaded", function () {
    // โหลด cart และแสดง counter
    loadCart();
    updateCartCounter();

    // ถ้าอยู่ในหน้า cart ให้แสดงรายการ
    const cartPage = document.getElementById("cart-page");
    if (cartPage && cartPage.classList.contains("active")) {
        updateCartDisplay();
    }

    // ถ้าอยู่ในหน้า menu ให้ update counter
    const menuPage = document.getElementById("menu-page");
    if (menuPage && menuPage.classList.contains("active")) {
        updateCartCounter();
    }

    // ถ้าอยู่ในหน้า admin
    const adminLoginPage = document.getElementById("admin-login-page");
    if (adminLoginPage && adminLoginPage.classList.contains("active")) {
        loadOrderHistory();
    }

    // ถ้าอยู่ในหน้า admin dashboard
    const adminDashboard = document.getElementById("admin-dashboard");
    if (adminDashboard && adminDashboard.classList.contains("active")) {
        loadOrderHistory();
    }
});

// แทนที่ฟังก์ชันเดิมด้วยฟังก์ชันที่รองรับหลายหน้า
const originalSelectMenuItem = selectMenuItem;
selectMenuItem = function (menuName) {
    const optionModal = document.getElementById("option-modal");

    if (optionModal) {
        // สำหรับหน้าแยก - ใช้ modal
        currentItem = {
            name: menuName,
            normalPrice: 50,
            specialPrice: 60,
        };

        document.getElementById("selected-menu-name").textContent = menuName;
        document.getElementById("normal-price").textContent = "50 บาท";
        document.getElementById("special-price").textContent = "60 บาท";

        currentQuantity = 1;
        document.getElementById("quantity").textContent = currentQuantity;
        document.getElementById("normal-size").checked = true;
        document.getElementById("special-size").checked = false;

        const noodleSection = optionModal.querySelector(".option-group");
        if (noodleSection) {
            if (menuName === "เกาเหลา") {
                noodleSection.style.display = "none";
            } else {
                noodleSection.style.display = "block";
                optionModal.querySelector(
                    'input[name="noodle"][value="เส้นเล็ก"]',
                ).checked = true;
            }
        }

        optionModal.querySelectorAll('input[name="meatball"]').forEach((cb) => {
            cb.checked = false;
            cb.disabled = false;
        });
        optionModal.querySelector(
            'input[name="meatball"][value="ลูกชิ้นหมู"]',
        ).checked = true;

        optionModal
            .querySelectorAll('input[name="vegetable"]')
            .forEach((cb) => (cb.checked = false));
        optionModal.querySelector(
            'input[name="vegetable"][value="ผักบุ้ง"]',
        ).checked = true;

        document.getElementById("special-note").value = "";
        calculateTotal();

        optionModal.style.display = "block";
        document.body.style.overflow = "hidden";
    } else {
        // สำหรับหน้าเดียว - ใช้ฟังก์ชันเดิม
        originalSelectMenuItem(menuName);
    }
};

// อัพเดท addToCart ให้บันทึก cart และปิด modal
const originalAddToCart = addToCart;
addToCart = function () {
    originalAddToCart.call(this);
    saveCart();
    updateCartCounter();
    closeOptionModal();
};

// อัพเดท placeOrder ให้ redirect กลับหน้าแรก
const originalPlaceOrder = placeOrder;
placeOrder = function () {
    if (cart.length === 0) {
        alert("ตะกร้าของคุณว่างเปล่า กรุณาเพิ่มสินค้าก่อนสั่งซื้อ");
        return;
    }

    const orderNumber = generateOrderNumber();
    const displayId = formatOrderId(orderNumber);

    const newOrder = {
        id: orderNumber,
        timestamp: new Date(),
        items: [...cart],
        total: cart.reduce((sum, item) => sum + item.total, 0),
        status: "pending_payment",
        paymentMethod: null,
        paymentText: "รอยืนยัน",
    };

    orderHistory.push(newOrder);
    saveOrderHistory();

    cart = [];
    saveCart();
    updateCartCounter();

    alert(
        `สั่งอาหารเรียบร้อย!\nหมายเลขออเดอร์: #${displayId}\n\nพนักงานจะถามวิธีการชำระเงินในภายหลัง`,
    );

    // ตรวจสอบว่าอยู่ในหน้าแยกหรือไม่
    if (window.location.pathname.includes("cart.html")) {
        window.location.href = "index.html";
    } else {
        // ถ้าอยู่ในหน้าเดียว ให้แสดงหน้าแรก
        document.getElementById("cart-page").classList.remove("active");
        document.getElementById("qr-page").classList.add("active");
    }
};

// อัพเดท editCartItem สำหรับหลายหน้า
const originalEditCartItem = editCartItem;
editCartItem = function (itemId) {
    const editModal = document.getElementById("edit-modal");

    if (editModal) {
        // สำหรับหน้าแยก - ใช้ edit modal
        const itemIndex = cart.findIndex((item) => item.id === itemId);
        if (itemIndex === -1) return;

        const item = cart[itemIndex];

        // เก็บ ID สำหรับบันทึกภายหลัง
        window.editingItemId = itemId;
        window.editingItemIndex = itemIndex;

        // ตั้งค่าข้อมูลเมนูปัจจุบัน
        currentItem = {
            name: item.name,
            normalPrice: item.normalPrice,
            specialPrice: item.specialPrice,
        };

        document.getElementById("edit-menu-name").textContent = item.name;
        document.getElementById("edit-normal-price").textContent =
            item.normalPrice + " บาท";
        document.getElementById("edit-special-price").textContent =
            item.specialPrice + " บาท";

        if (item.normalQty > 0) {
            currentQuantity = item.normalQty;
            document.getElementById("edit-normal-size").checked = true;
        } else if (item.specialQty > 0) {
            currentQuantity = item.specialQty;
            document.getElementById("edit-special-size").checked = true;
        }
        document.getElementById("edit-quantity").textContent = currentQuantity;

        const noodleSection = editModal.querySelector("#edit-noodle-section");
        if (item.name === "เกาเหลา") {
            noodleSection.style.display = "none";
        } else {
            noodleSection.style.display = "block";
            editModal
                .querySelectorAll('input[name="edit-noodle"]')
                .forEach((radio) => {
                    if (radio.value === item.noodleType) {
                        radio.checked = true;
                    }
                });
        }

        editModal
            .querySelectorAll('input[name="edit-meatball"]')
            .forEach((cb) => {
                cb.checked = item.meatballs.includes(cb.value);
                cb.disabled = false;
            });

        editModal
            .querySelectorAll('input[name="edit-vegetable"]')
            .forEach((cb) => {
                cb.checked = item.vegetables.includes(cb.value);
            });

        document.getElementById("edit-special-note").value = item.note;

        calculateEditTotal();

        editModal.style.display = "block";
        document.body.style.overflow = "hidden";
    } else {
        // สำหรับหน้าเดียว
        originalEditCartItem(itemId);
    }
};

function calculateEditTotal() {
    if (!currentItem) return;

    const sizeSelection = document.querySelector(
        'input[name="edit-size"]:checked',
    );
    let total = 0;

    if (sizeSelection) {
        if (sizeSelection.value === "normal") {
            total = currentItem.normalPrice * currentQuantity;
        } else if (sizeSelection.value === "special") {
            total = currentItem.specialPrice * currentQuantity;
        }
    }

    const editItemTotal = document.getElementById("edit-item-total");
    if (editItemTotal) {
        editItemTotal.textContent = total + " บาท";
    }
}

function increaseEditQuantity() {
    currentQuantity++;
    document.getElementById("edit-quantity").textContent = currentQuantity;
    calculateEditTotal();
}

function decreaseEditQuantity() {
    if (currentQuantity > 1) {
        currentQuantity--;
        document.getElementById("edit-quantity").textContent = currentQuantity;
        calculateEditTotal();
    }
}

function saveEditedItem() {
    const itemIndex = window.editingItemIndex;
    if (itemIndex === undefined) return;

    const sizeSelection = document.querySelector(
        'input[name="edit-size"]:checked',
    );
    const noodleType =
        document.querySelector('input[name="edit-noodle"]:checked')?.value ||
        "-";

    const selectedMeatballs = [];
    document
        .querySelectorAll('input[name="edit-meatball"]:checked')
        .forEach((cb) => {
            selectedMeatballs.push(cb.value);
        });

    const selectedVegetables = [];
    document
        .querySelectorAll('input[name="edit-vegetable"]:checked')
        .forEach((cb) => {
            selectedVegetables.push(cb.value);
        });

    const specialNote = document.getElementById("edit-special-note").value;

    let total = 0;
    if (sizeSelection.value === "normal") {
        total = currentItem.normalPrice * currentQuantity;
    } else if (sizeSelection.value === "special") {
        total = currentItem.specialPrice * currentQuantity;
    }

    cart[itemIndex] = {
        id: cart[itemIndex].id,
        name: currentItem.name,
        normalQty: sizeSelection.value === "normal" ? currentQuantity : 0,
        specialQty: sizeSelection.value === "special" ? currentQuantity : 0,
        normalPrice: currentItem.normalPrice,
        specialPrice: currentItem.specialPrice,
        noodleType: noodleType,
        meatballs: selectedMeatballs,
        vegetables: selectedVegetables,
        note: specialNote,
        total: total,
    };

    saveCart();
    updateCartDisplay();
    updateCartCounter();
    closeEditModal();
}
