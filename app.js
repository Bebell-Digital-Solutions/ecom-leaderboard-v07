
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
                { id: '106401', name: 'ElectroMundo', email: 'demo@electromundo.com', url: 'https://electromundo.com', currency: 'DOP'},
                { id: '135002', name: 'Moda Caribeña', email: 'demo@modacaribe.com', url: 'https://modacaribe.com', currency: 'DOP'},
                { id: '108403', name: 'USA Gadgets', email: 'demo@usagadgets.com', url: 'https://usagadgets.com', currency: 'USD'},
                { id: '105004', name: 'Deportes Total', email: 'demo@deportestotal.com', url: 'https://deportestotal.com', currency: 'DOP'},
                { id: '109905', name: 'Belleza Tropical', email: 'demo@bellezatropical.com', url: 'https://bellezatropical.com', currency: 'USD'},
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
                        timestamp: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
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

function compactCurrency(value, currency) {
    let formattedValue;
    if (currency === 'DOP') {
        formattedValue = 'RD$';
    } else {
        formattedValue = '$';
    }

    if (value >= 1000000) {
        return formattedValue + (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (value >= 1000) {
        return formattedValue + (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return formatCurrency(value, currency).replace(/\.00$/, '');
}


// --- EMAIL NOTIFICATION SERVICE ---
function initializeEmailService() {
    try {
        emailjs.init({ publicKey: 'pzi6GkEVpxFMX_PUe' });
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
    const serviceID = 'El_Negocio_Digital';
    const templateID = 'pzi6GkEVpxFMX_PUe';
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

function resetLeaderboardData() {
    const confirmation = confirm('Are you sure you want to reset all data? This action cannot be undone.');
    if (confirmation) {
        localStorage.removeItem('ecomLeaderStores');
        localStorage.removeItem('ecomLeaderTransactions');
        localStorage.removeItem('ecomLeaderSettings');
        localStorage.removeItem('ecomLeaderboardTracking');
        
        alert('All data has been reset. The application will now reload.');
        logout();
    }
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

    // 1. Prepare data structure for the last 12 months
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyData.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            label: monthNames[date.getMonth()],
            totalSales: 0
        });
    }

    // 2. Aggregate transaction data
    const storeMap = new Map(dataStore.stores.map(s => [s.id, { currency: s.currency }]));
    dataStore.transactions.forEach(tx => {
        const txDate = new Date(tx.timestamp);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth();

        const monthBucket = monthlyData.find(d => d.year === txYear && d.month === txMonth);
        if (monthBucket) {
            const store = storeMap.get(tx.storeId);
            let saleInDOP = tx.amount;
            if (store && store.currency === 'USD') {
                saleInDOP = tx.amount * dataStore.exchangeRate;
            }
            monthBucket.totalSales += saleInDOP;
        }
    });

    // 3. Determine chart scale
    const allSales = monthlyData.map(d => d.totalSales);
    const maxSale = allSales.length > 0 ? Math.max(...allSales) : 0;
    // Create a "nice" upper bound for the Y-axis, ensuring a minimum for empty charts
    const niceMaxSale = Math.max(50000, Math.ceil((maxSale || 1) / 5) * 5); 

    const yAxisLabels = [];
    const numTicks = 5;
    for (let i = numTicks; i >= 0; i--) {
        const value = (niceMaxSale / numTicks) * i;
        yAxisLabels.push(`<div>${compactCurrency(value, 'DOP')}</div>`);
    }

    // 4. Generate HTML for the new monthly chart with Y-Axis
    const chartHTML = `
        <div class="stats-chart-card">
            <h3><i data-lucide="bar-chart-big" class="lucide-icon"></i> Monthly Revenue (Last 12 Months)</h3>
            <div class="chart-wrapper">
                <div class="chart-y-axis">
                    ${yAxisLabels.join('')}
                </div>
                <div class="monthly-chart-container">
                    ${monthlyData.map(data => {
                        const barHeight = niceMaxSale > 0 ? (data.totalSales / niceMaxSale) * 100 : 0;
                        return `
                        <div class="monthly-chart-item" title="${data.label} ${data.year}: ${formatCurrency(data.totalSales, 'DOP')}">
                            <div class="monthly-chart-value">${formatCurrency(data.totalSales, 'DOP')}</div>
                            <div class="monthly-chart-bar-wrapper">
                                <div class="monthly-chart-bar" style="height: ${barHeight}%;"></div>
                            </div>
                            <div class="monthly-chart-label">${data.label}</div>
                        </div>
                    `}).join('')}
                </div>
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

