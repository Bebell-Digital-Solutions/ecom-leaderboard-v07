
// eCOMLeaderboard 2025 - Main Application Logic

// --- DATA STORAGE ---
class DataStore {
    constructor() {
        this.stores = JSON.parse(localStorage.getItem('ecomLeaderStores') || '[]');
        this.transactions = JSON.parse(localStorage.getItem('ecomLeaderTransactions') || '[]');
        const settings = JSON.parse(localStorage.getItem('ecomLeaderSettings') || '{}');
        this.exchangeRate = settings.exchangeRate || 60.50; // Default exchange rate
        this.initializeDemoData();
    }

    initializeDemoData() {
        if (this.stores.length === 0) {
            const demoStores = [
                { id: '1001', name: 'ElectroMundo', email: 'demo@electromundo.com', url: 'https://electromundo.com', currency: 'DOP'},
                { id: '1002', name: 'Moda Caribeña', email: 'demo@modacaribe.com', url: 'https://modacaribe.com', currency: 'DOP'},
                { id: '1003', name: 'USA Gadgets', email: 'demo@usagadgets.com', url: 'https://usagadgets.com', currency: 'USD'},
                { id: '1004', name: 'Deportes Total', email: 'demo@deportestotal.com', url: 'https://deportestotal.com', currency: 'DOP'},
                { id: '1005', name: 'Belleza Tropical', email: 'demo@bellezatropical.com', url: 'https://bellezatropical.com', currency: 'USD'},
            ];

            this.stores = demoStores.map((store, i) => ({
                ...store,
                password: 'password123',
                apiKey: `apiKey-demo${i + 1}-${Math.random().toString(36).substr(2, 9)}`,
                createdAt: new Date(Date.now() - (30 - i * 5) * 24 * 60 * 60 * 1000).toISOString()
            }));
            localStorage.setItem('ecomLeaderStores', JSON.stringify(this.stores));

            this.transactions = this.stores.flatMap(store => {
                let txs = [];
                for (let i = 0; i < Math.floor(Math.random() * 50) + 20; i++) {
                    const amount = store.currency === 'USD' ? parseFloat((Math.random() * 150 + 20).toFixed(2)) : parseFloat((Math.random() * 8000 + 1000).toFixed(2));
                    txs.push({
                        id: `tx_${store.id}_${i}`,
                        storeId: store.id,
                        amount: amount,
                        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
                    });
                }
                return txs;
            });
            localStorage.setItem('ecomLeaderTransactions', JSON.stringify(this.transactions));
        }
    }

    saveSettings() {
        localStorage.setItem('ecomLeaderSettings', JSON.stringify({ exchangeRate: this.exchangeRate }));
    }

    addStore(storeData) {
        const newStore = {
            apiKey: `apiKey_${storeData.id}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            ...storeData
        };
        this.stores.push(newStore);
        localStorage.setItem('ecomLeaderStores', JSON.stringify(this.stores));
        return newStore;
    }
    
    updateStore(storeId, updatedData) {
        this.stores = this.stores.map(store => {
            if (store.id === storeId) {
                return { ...store, ...updatedData };
            }
            return store;
        });
        localStorage.setItem('ecomLeaderStores', JSON.stringify(this.stores));
    }

    deleteStore(storeId) {
        this.stores = this.stores.filter(s => s.id !== storeId);
        this.transactions = this.transactions.filter(t => t.storeId !== storeId);
        localStorage.setItem('ecomLeaderStores', JSON.stringify(this.stores));
        localStorage.setItem('ecomLeaderTransactions', JSON.stringify(this.transactions));
    }

    getAllStores() {
        return this.stores.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    getStoreByEmail(email) {
        return this.stores.find(s => s.email === email);
    }
    
    getStoreById(id) {
        return this.stores.find(s => s.id === id);
    }

    getRecentTransactions(storeId, limit = 5) {
        return this.transactions
            .filter(t => t.storeId === storeId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
    }

    getStoreStats(storeId) {
        const store = this.getStoreById(storeId);
        const storeTransactions = this.transactions.filter(t => t.storeId === storeId);
        
        let totalRevenueNative = storeTransactions.reduce((sum, t) => sum + t.amount, 0);
        let totalRevenueDOP = totalRevenueNative;
        if (store && store.currency === 'USD') {
            totalRevenueDOP = totalRevenueNative * this.exchangeRate;
        }

        const totalOrders = storeTransactions.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenueNative / totalOrders : 0;

        const leaderboard = this.stores.map(s => {
            const sTransactions = this.transactions.filter(t => t.storeId === s.id);
            let revenue = sTransactions.reduce((sum, t) => sum + t.amount, 0);
            if (s.currency === 'USD') {
                revenue *= this.exchangeRate;
            }
            return { id: s.id, revenue };
        }).sort((a, b) => b.revenue - a.revenue);

        const rank = leaderboard.findIndex(s => s.id === storeId) + 1;
        return { totalRevenue: totalRevenueNative, totalRevenueDOP, totalOrders, avgOrderValue, rank: rank > 0 ? rank : this.stores.length };
    }
}

// --- UTILITIES ---
function formatCurrency(amount, currency = 'DOP') {
    const options = {
        style: 'currency',
        currency: currency,
        currencyDisplay: 'narrowSymbol'
    };
    if (currency === 'DOP') {
        return new Intl.NumberFormat('es-DO', options).format(amount);
    }
    return new Intl.NumberFormat('en-US', options).format(amount);
}

// --- EMAIL NOTIFICATION SERVICE ---
function initializeEmailService() {
    try {
        emailjs.init({ publicKey: 'YOUR_PUBLIC_KEY' });
    } catch(e) {
        console.warn("EmailJS not configured. Add credentials to app.js.");
    }
}

function sendNewRegistrationEmail(storeData) {
    if (typeof emailjs === 'undefined' || !emailjs.send) {
        console.error('EmailJS is not loaded or configured. Cannot send email.');
        return;
    }
    const templateParams = {
        store_name: storeData.name,
        store_email: storeData.email,
        store_url: storeData.url,
        registration_date: new Date().toUTCString(),
    };
    const serviceID = 'YOUR_SERVICE_ID';
    const templateID = 'YOUR_TEMPLATE_ID';
    emailjs.send(serviceID, templateID, templateParams)
        .then(res => console.log('New registration email sent.', res.status))
        .catch(err => console.error('Failed to send registration email.', err));
}

// --- APP STATE & LOGIC ---
var dataStore;
let currentStore = null;

function updateAdminVisibility() {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? 'block' : 'none';
    });
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.querySelector('.tab-btn[onclick="showLogin()"]').classList.add('active');
    document.querySelector('.tab-btn[onclick="showRegister()"]').classList.remove('active');
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.querySelector('.tab-btn[onclick="showLogin()"]').classList.remove('active');
    document.querySelector('.tab-btn[onclick="showRegister()"]').classList.add('active');
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (email.toLowerCase() === 'bebell.digitalsolutions@gmail.com' && password === 'Bebell/25') {
        sessionStorage.setItem('isAdmin', 'true');
        const adminContextStore = dataStore.getStoreByEmail('demo@electromundo.com') || dataStore.stores[0];
        if (adminContextStore) sessionStorage.setItem('currentStoreId', adminContextStore.id);
        window.location.href = 'backend.html';
        return;
    }
    
    sessionStorage.removeItem('isAdmin');
    const store = dataStore.getStoreByEmail(email);

    if (store && store.password === password) {
        currentStore = store;
        sessionStorage.setItem('currentStoreId', store.id);
        initializeDashboard();
    } else {
        alert('Invalid email or password.');
    }
}

function handleRegister(event) {
    event.preventDefault();
    const storeName = document.getElementById('storeName').value;
    const storeId = document.getElementById('storeId').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const url = document.getElementById('storeUrl').value;
    const currency = document.getElementById('currency').value;

    if (dataStore.getStoreByEmail(email)) {
        alert('A store with this email already exists.');
        return;
    }
    if (dataStore.getStoreById(storeId)) {
        alert('A store with this ID already exists.');
        return;
    }

    const newStoreData = { id: storeId, name: storeName, email, password, url, currency };
    const newStore = dataStore.addStore(newStoreData);
    
    sendNewRegistrationEmail(newStore);

    currentStore = newStore;
    sessionStorage.removeItem('isAdmin');
    sessionStorage.setItem('currentStoreId', newStore.id);
    initializeDashboard();
}

function logout() {
    currentStore = null;
    sessionStorage.removeItem('currentStoreId');
    sessionStorage.removeItem('isAdmin');
    window.location.href = 'index.html';
}

function updateDashboardUI() {
    if (!currentStore) return;
    document.getElementById('userStoreName').textContent = currentStore.name;
    const stats = dataStore.getStoreStats(currentStore.id);

    document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue, currentStore.currency);
    document.getElementById('totalOrders').textContent = stats.totalOrders;
    document.getElementById('leaderboardRank').textContent = stats.rank > 0 ? `#${stats.rank}` : '-';
    document.getElementById('avgOrderValue').textContent = formatCurrency(stats.avgOrderValue, currentStore.currency);

    const trackingCodeEl = document.getElementById('trackingCode');
    trackingCodeEl.innerHTML = `&lt;!-- eCOM Leaderboard Tracking Snippet --&gt;
&lt;script&gt;
  window.eCOMLeaderboard = { apiKey: '${currentStore.apiKey}' };
&lt;/script&gt;
&lt;script async src="https://your-domain.com/tracking.js"&gt;&lt;/script&gt;

&lt;!-- 
  ECWID INTEGRATION EXAMPLE: 
  Place this code in your store's "Checkout -> Tracking & Analytics" section.
  It sends purchase data only on the "Thank you for your order" page.
--&gt;
&lt;script&gt;
  if (typeof Ecwid != 'undefined' && Ecwid.getOwnerId()) {
    Ecwid.OnPageLoaded.add(function(page) {
      if (page.type === 'ORDER_CONFIRMATION') {
        Ecwid.Cart.get(function(cart) {
          if (cart && cart.total > 0) {
            eCOMLeaderboard.ecommerce.trackPurchase(
              cart.orderId, 
              cart.total, 
              cart.items.map(item => ({
                id: item.productId,
                name: item.name,
                sku: item.sku,
                price: item.price,
                quantity: item.quantity
              }))
            );
          }
        });
      }
    });
  }
&lt;/script&gt;
`;
    
    updateRecentActivityUI();
}

function updateRecentActivityUI() {
    const activityList = document.getElementById('recentActivity');
    const recentTxs = dataStore.getRecentTransactions(currentStore.id);
    activityList.innerHTML = ''; 
    
    if (recentTxs.length === 0) {
        activityList.innerHTML = '<div class="activity-item">Awaiting first connection...</div>';
        return;
    }
    
    recentTxs.forEach(tx => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <i data-lucide="dollar-sign" class="lucide-icon"></i>
            <span>New sale: <strong>${formatCurrency(tx.amount, currentStore.currency)}</strong></span>
            <span class="activity-time">${new Date(tx.timestamp).toLocaleString()}</span>
        `;
        activityList.appendChild(item);
    });
    lucide.createIcons();
}

function copyTrackingCode() {
    const code = document.getElementById('trackingCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const button = document.querySelector('button[onclick="copyTrackingCode()"]');
        if(!button) return;
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => { button.textContent = originalText; }, 2000);
    });
}

function testConnection() {
    const statusEl = document.getElementById('connectionStatus');
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = document.getElementById('connectionStatusText');
    const button = document.querySelector('button[onclick="testConnection()"]');

    statusEl.style.display = 'flex';
    textEl.textContent = 'Testing...';
    dotEl.className = 'status-dot'; 
    dotEl.style.background = 'var(--warning-color)';
    button.disabled = true;

    setTimeout(() => {
        const trackedData = localStorage.getItem('ecomLeaderboardTracking');
        const isConnected = trackedData && JSON.parse(trackedData).length > 0;

        if (isConnected) {
            textEl.textContent = 'Connection Successful!';
            dotEl.classList.add('connected');
        } else {
            textEl.textContent = 'No Data Received';
        }
        button.disabled = false;
    }, 2000);
}

function renderGlobalStatsChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalStores = dataStore.stores.length;
    const totalTransactions = dataStore.transactions.length;
    const totalSalesDOP = dataStore.stores.reduce((total, store) => {
        return total + dataStore.getStoreStats(store.id).totalRevenueDOP;
    }, 0);

    const stats = [
        { label: 'Total Stores', value: totalStores, color: '#8B5CF6' },
        { label: 'Total Transactions', value: totalTransactions, color: '#3B82F6' },
        { label: 'Total Sales (DOP)', value: totalSalesDOP, color: '#10B981', isCurrency: true }
    ];

    const maxValue = Math.max(...stats.filter(s => !s.isCurrency).map(s => s.value), 1);
    const maxCurrencyValue = Math.max(...stats.filter(s => s.isCurrency).map(s => s.value), 1);

    const chartHTML = `
        <div class="stats-chart-card">
            <h3><i data-lucide="bar-chart-big" class="lucide-icon"></i> Overall Platform Stats</h3>
            <div class="stats-chart-container">
                ${stats.map(stat => `
                    <div class="chart-item">
                        <div class="chart-label">${stat.label}</div>
                        <div class="chart-bar-wrapper">
                            <div class="chart-bar" style="width: ${stat.isCurrency ? (stat.value / maxCurrencyValue * 100) : (stat.value / maxValue * 100)}%; background-color: ${stat.color};"></div>
                        </div>
                        <div class="chart-value">${stat.isCurrency ? formatCurrency(stat.value, 'DOP') : stat.value.toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    container.innerHTML = chartHTML;
    lucide.createIcons();
}


// --- INITIALIZATION ---
function initializeDashboard() {
    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');
    if (!authSection || !dashboardSection) return;

    const storeId = sessionStorage.getItem('currentStoreId');
    if (storeId) currentStore = dataStore.getStoreById(storeId);
    else currentStore = null;

    if (currentStore) {
        authSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        updateDashboardUI();
        renderGlobalStatsChart('globalStatsContainer');
    } else {
        authSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
        showLogin();
    }
    
    updateAdminVisibility();
    lucide.createIcons();
}


document.addEventListener('DOMContentLoaded', () => {
    if (!window.dataStore) {
        window.dataStore = new DataStore();
    }
    dataStore = window.dataStore;

    initializeEmailService();
    
    if (document.getElementById('authSection')) {
        initializeDashboard();
    }
    
    const appReadyEvent = new Event('appReady');
    document.dispatchEvent(appReadyEvent);
});
