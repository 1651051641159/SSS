// API Configuration
const API_BASE_URL = window.location.origin + '/noodle-shop/api';

// API Helper Functions
const API = {
    // Orders API
    orders: {
        getAll: async (filters = {}) => {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${API_BASE_URL}/orders.php?${params}`);
            return await response.json();
        },
        
        getById: async (id) => {
            const response = await fetch(`${API_BASE_URL}/orders.php?id=${id}`);
            return await response.json();
        },
        
        create: async (orderData) => {
            const response = await fetch(`${API_BASE_URL}/orders.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            return await response.json();
        },
        
        update: async (orderData) => {
            const response = await fetch(`${API_BASE_URL}/orders.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            return await response.json();
        },
        
        delete: async (id) => {
            const response = await fetch(`${API_BASE_URL}/orders.php?id=${id}`, {
                method: 'DELETE'
            });
            return await response.json();
        }
    },
    
    // Menu API
    menu: {
        getAll: async (activeOnly = true) => {
            const response = await fetch(`${API_BASE_URL}/menu.php?active_only=${activeOnly}`);
            return await response.json();
        },
        
        getById: async (id) => {
            const response = await fetch(`${API_BASE_URL}/menu.php?id=${id}`);
            return await response.json();
        },
        
        create: async (menuData) => {
            const response = await fetch(`${API_BASE_URL}/menu.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(menuData)
            });
            return await response.json();
        },
        
        update: async (menuData) => {
            const response = await fetch(`${API_BASE_URL}/menu.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(menuData)
            });
            return await response.json();
        },
        
        delete: async (id) => {
            const response = await fetch(`${API_BASE_URL}/menu.php?id=${id}`, {
                method: 'DELETE'
            });
            return await response.json();
        }
    },
    
    // Tables API
    tables: {
        getAll: async () => {
            const response = await fetch(`${API_BASE_URL}/tables.php`);
            return await response.json();
        },
        
        getByNumber: async (tableNumber) => {
            const response = await fetch(`${API_BASE_URL}/tables.php?table_number=${tableNumber}`);
            return await response.json();
        },
        
        create: async (tableData) => {
            const response = await fetch(`${API_BASE_URL}/tables.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tableData)
            });
            return await response.json();
        },
        
        update: async (tableData) => {
            const response = await fetch(`${API_BASE_URL}/tables.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tableData)
            });
            return await response.json();
        },
        
        delete: async (id) => {
            const response = await fetch(`${API_BASE_URL}/tables.php?id=${id}`, {
                method: 'DELETE'
            });
            return await response.json();
        }
    },
    
    // Statistics API
    statistics: {
        get: async (period = 'all', startDate = null, endDate = null) => {
            let url = `${API_BASE_URL}/statistics.php?period=${period}`;
            if (startDate && endDate) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            const response = await fetch(url);
            return await response.json();
        }
    },
    
    // Authentication API
    auth: {
        login: async (password) => {
            const response = await fetch(`${API_BASE_URL}/auth.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            return await response.json();
        },
        
        checkAuth: async () => {
            const response = await fetch(`${API_BASE_URL}/auth.php`);
            return await response.json();
        },
        
        logout: async () => {
            const response = await fetch(`${API_BASE_URL}/auth.php`, {
                method: 'DELETE'
            });
            return await response.json();
        }
    }
};

// ฟังก์ชันสำหรับจัดการ error
function handleAPIError(error, customMessage = 'เกิดข้อผิดพลาด') {
    console.error('API Error:', error);
    alert(customMessage + ': ' + (error.message || 'กรุณาลองใหม่อีกครั้ง'));
}

// Export API object สำหรับใช้งาน
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}