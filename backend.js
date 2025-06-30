
// Security check: Redirect non-admins immediately.
if (sessionStorage.getItem('isAdmin') !== 'true') {
    alert('Access Denied: You must be an administrator to view this page.');
    window.location.href = 'index.html';
}

// Admin Panel Logic
class BackendManager {
    constructor() {
        this.dataStore = null; 
        this.tableContent = document.getElementById('adminTableContent');
        this.modal = document.getElementById('editStoreModal');
        this.editForm = document.getElementById('editStoreForm');
        this.settingsForm = document.getElementById('settingsForm');
    }

    initialize() {
        this.dataStore = window.dataStore;
        if (!this.dataStore) {
            console.error("DataStore not found.");
            return;
        }

        this.renderTable();
        this.setupEventListeners();
        this.loadSettings();
    }
    
    setupEventListeners() {
        this.editForm.addEventListener('submit', (e) => this.handleSave(e));
        this.settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
    }

    loadSettings() {
        document.getElementById('exchangeRate').value = this.dataStore.exchangeRate;
    }

    handleSaveSettings(event) {
        event.preventDefault();
        const newRate = parseFloat(document.getElementById('exchangeRate').value);
        if (isNaN(newRate) || newRate <= 0) {
            alert('Please enter a valid, positive exchange rate.');
            return;
        }
        this.dataStore.exchangeRate = newRate;
        this.dataStore.saveSettings();
        alert('Global settings saved successfully!');
        this.renderTable(); // Re-render table to reflect new rate
    }

    formatUrl(url) {
        if (!url) return '';
        return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    renderTable() {
        const stores = this.dataStore.getAllStores();
        this.tableContent.innerHTML = ''; 

        if (stores.length === 0) {
            this.tableContent.innerHTML = '<div class="admin-table-row wide" style="text-align: center; grid-column: 1 / -1;">No stores found.</div>';
            return;
        }

        stores.forEach(store => {
            const stats = this.dataStore.getStoreStats(store.id);
            const row = document.createElement('div');
            row.className = 'admin-table-row wide';
            row.innerHTML = `
                <div>${store.email}</div>
                <div>${store.id}</div>
                <div><a href="${store.url}" title="${store.url}" target="_blank" rel="noopener noreferrer">${this.formatUrl(store.url)}</a></div>
                <div>${store.currency}</div>
                <div>${stats.totalOrders.toLocaleString()}</div>
                <div>${formatCurrency(stats.totalRevenueDOP, 'DOP')}</div>
                <div class="admin-actions">
                    <button class="btn-icon btn-edit" onclick="backendManager.handleEdit('${store.id}')">
                        <i data-lucide="edit"></i> Edit
                    </button>
                    <button class="btn-icon btn-delete" onclick="backendManager.handleDelete('${store.id}')">
                        <i data-lucide="trash-2"></i> Delete
                    </button>
                </div>
            `;
            this.tableContent.appendChild(row);
        });
        
        lucide.createIcons();
    }

    handleEdit(storeId) {
        const store = this.dataStore.getStoreById(storeId);
        if (store) {
            document.getElementById('editStoreId').value = store.id;
            document.getElementById('editModalStoreId').value = store.id; // Populate the new read-only field
            document.getElementById('editStoreName').value = store.name;
            document.getElementById('editStoreUrl').value = store.url;
            document.getElementById('editStoreEmail').value = store.email;
            document.getElementById('editCurrency').value = store.currency;
            this.modal.style.display = 'flex';
        }
    }

    handleSave(event) {
        event.preventDefault();
        const storeId = document.getElementById('editStoreId').value;
        const updatedData = {
            name: document.getElementById('editStoreName').value,
            url: document.getElementById('editStoreUrl').value,
            email: document.getElementById('editStoreEmail').value,
            currency: document.getElementById('editCurrency').value,
        };
        this.dataStore.updateStore(storeId, updatedData);
        this.closeEditModal();
        this.renderTable();
    }
    
    handleDelete(storeId) {
        const store = this.dataStore.getStoreById(storeId);
        if (!store) return;

        const confirmation = confirm(`Are you sure you want to delete the store "${store.name}"? This action cannot be undone.`);
        if (confirmation) {
            this.dataStore.deleteStore(storeId);
            this.renderTable();
        }
    }

    closeEditModal() {
        this.modal.style.display = 'none';
        this.editForm.reset();
    }
}

let backendManager;

function closeEditModal() {
    if (backendManager) backendManager.closeEditModal();
}

document.addEventListener('appReady', () => {
    backendManager = new BackendManager();
    backendManager.initialize();
});
