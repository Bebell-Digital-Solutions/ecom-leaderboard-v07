

// Leaderboard functionality
class LeaderboardManager {
    constructor() {
        this.dataStore = null; 
        this.currentFilter = 'performance';
        this.currentTimeFilter = 'all';
    }

    initialize() {
        this.dataStore = window.dataStore;
        if (!this.dataStore) {
            console.error("DataStore not found.");
            return;
        }
        this.updateLeaderboard();
        this.updateStats();
        renderGlobalStatsChart('globalStatsContainer');
        document.querySelector(`.filter-btn[onclick*="'${this.currentFilter}'"]`).classList.add('active');
    }

    updateStats() {
        const totalStores = this.dataStore.stores.length;
        const totalOrders = this.dataStore.transactions.length;
        document.getElementById('totalStores').textContent = totalStores.toLocaleString();
        document.getElementById('totalOrdersValue').textContent = totalOrders.toLocaleString();
    }

    updateLeaderboard() {
        const { podiumStores, tableStores } = this.getSortedStores();
        this.updatePodium(podiumStores);
        this.updateTable(tableStores);
        updateAdminVisibility();
        lucide.createIcons();
    }

    getSortedStores() {
        const allStoresStats = this.dataStore.stores.map(store => {
            const stats = this.dataStore.getStoreStats(store.id);
            const daysActive = Math.max(1, (new Date() - new Date(store.createdAt)) / (1000 * 60 * 60 * 24));
            // Growth is DOP revenue per day
            const growth = stats.totalRevenueDOP / daysActive; 
            return { ...store, ...stats, growth };
        });

        const overallAverageDailyRevenue = allStoresStats.length > 0 ? allStoresStats.reduce((sum, s) => sum + s.growth, 0) / allStoresStats.length : 0;

        const storesWithGrowthPercent = allStoresStats.map(store => {
            const growthPercent = overallAverageDailyRevenue > 0 
                ? ((store.growth - overallAverageDailyRevenue) / overallAverageDailyRevenue) * 100 
                : 0;
            return { ...store, growthPercent };
        });

        switch (this.currentFilter) {
            case 'performance':
                storesWithGrowthPercent.sort((a, b) => b.totalRevenueDOP - a.totalRevenueDOP);
                break;
            case 'orders':
                storesWithGrowthPercent.sort((a, b) => b.totalOrders - a.totalOrders);
                break;
            case 'growth':
                storesWithGrowthPercent.sort((a, b) => b.growth - a.growth);
                break;
        }

        const podiumStores = storesWithGrowthPercent.slice(0, 3);
        const tableStores = storesWithGrowthPercent.slice(3);
        
        return { podiumStores, tableStores };
    }

    formatPerformanceScore(revenueDOP) {
        return `${Math.round(revenueDOP).toLocaleString()} pts`;
    }

    updatePodium(stores) {
        const placeIds = ['firstPlace', 'secondPlace', 'thirdPlace'];
        placeIds.forEach((placeId, index) => {
            const container = document.getElementById(placeId);
            if (!container) return;
            const info = container.querySelector('.podium-info');
            const store = stores[index];
            if (store) {
                info.querySelector('h3').textContent = store.name;
                info.querySelector('p').textContent = this.formatPerformanceScore(store.totalRevenueDOP);
            } else {
                // Reset to default if no store for this podium spot
                info.querySelector('h3').textContent = '-';
                info.querySelector('p').textContent = 'RD$ 0';
            }
        });
    }

    updateTable(stores) {
        const tableContent = document.getElementById('leaderboardContent');
        tableContent.innerHTML = stores.map((store, index) => {
            const rank = index + 4;
            return `
                <div class="leaderboard-row">
                    <div class="col-rank">
                        <div class="rank-badge">${rank}</div>
                    </div>
                    <div class="col-store">
                        <div class="store-info">
                            <div class="store-name">${store.name}</div>
                            <div class="store-url">${this.formatUrl(store.url)}</div>
                        </div>
                    </div>
                    <div class="col-revenue">
                        <div class="revenue-amount">${this.formatPerformanceScore(store.totalRevenueDOP)}</div>
                    </div>
                    <div class="col-orders">
                        <div>${store.totalOrders.toLocaleString()}</div>
                    </div>
                    <div class="col-growth">
                        <div class="growth-badge ${store.growthPercent >= 0 ? 'growth-positive' : 'growth-negative'}">
                            ${store.growthPercent >= 0 ? '+' : ''}${store.growthPercent.toFixed(1)}%
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatUrl(url) {
        if (!url) return '';
        return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
}

let leaderboardManager;

function filterLeaderboard(event, type) {
    if (!leaderboardManager) return;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    leaderboardManager.currentFilter = type;
    leaderboardManager.updateLeaderboard();
}

function updateTimeFilter() {
    if (!leaderboardManager) return;
    leaderboardManager.currentTimeFilter = document.getElementById('timeFilter').value;
    leaderboardManager.updateLeaderboard();
}

document.addEventListener('appReady', function() {
    leaderboardManager = new LeaderboardManager();
    leaderboardManager.initialize();
    if(typeof updateAdminVisibility === 'function') {
        updateAdminVisibility();
    }
});
