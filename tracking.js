
// eCOMLeaderboard 2025 Tracking Script
(function(window, document) {
    'use strict';
    
    // Do not initialize if the script is already running
    if (window.eCOMLeaderboard && window.eCOMLeaderboard.initialized) {
        return;
    }

    const ECL = window.eCOMLeaderboard || {};
    window.eCOMLeaderboard = ECL;

    ECL.initialized = true;
    ECL.queue = ECL.queue || [];
    
    // --- Configuration ---
    ECL.config = {
        apiEndpoint: 'https://api.ecomleaderboard.com/track', // Mock endpoint
        debug: false
    };

    // --- Utility Functions ---
    const utils = {
        log: function(message, ...args) {
            if (ECL.config.debug) {
                console.log('[eCOMLeaderboard]', message, ...args);
            }
        },
        // In a real scenario, this would generate a more robust user/session ID
        getSessionId: function() {
            let sessionId = localStorage.getItem('ecl_session_id');
            if (!sessionId) {
                sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem('ecl_session_id', sessionId);
            }
            return sessionId;
        }
    };
    
    // --- Main Tracking Function ---
    ECL.track = function(event, data) {
        if (!ECL.apiKey) {
            utils.log('Error: API key not set. Please set window.eCOMLeaderboard.apiKey');
            return;
        }
        
        const payload = {
            apiKey: ECL.apiKey,
            event_type: event,
            event_data: data || {},
            session_id: utils.getSessionId(),
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        
        utils.log('Tracking event:', payload);
        
        // This is the core of the "Test Connection" feature.
        // It saves tracking data to localStorage so the dashboard can verify it.
        // In a real application, this would be a fetch call to an API endpoint.
        try {
            const existingData = JSON.parse(localStorage.getItem('ecomLeaderboardTracking') || '[]');
            existingData.push(payload);
            // Keep the log short to avoid filling up localStorage
            if (existingData.length > 20) {
                existingData.shift(); 
            }
            localStorage.setItem('ecomLeaderboardTracking', JSON.stringify(existingData));
            utils.log('Data stored locally for connection test.');
        } catch (e) {
            utils.log('Error storing tracking data:', e);
        }

        /* 
        // EXAMPLE: Real-world API call
        fetch(ECL.config.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true // Ensures request is sent even if page is closing
        }).catch(error => utils.log('Tracking API error:', error));
        */
    };
    
    // --- E-commerce Specific Helpers ---
    ECL.ecommerce = {
        trackPurchase: function(orderId, amount, items) {
            ECL.track('purchase', {
                order_id: orderId,
                total_value: parseFloat(amount),
                currency: 'STORE_CURRENCY', // This would ideally be dynamic
                items: items || []
            });
        }
    };

    // --- Process any commands that were queued before the script loaded ---
    while (ECL.queue.length > 0) {
        const command = ECL.queue.shift();
        const [method, ...args] = command;
        if (typeof ECL[method] === 'function') {
            ECL[method](...args);
        } else if (method.startsWith('ecommerce.') && ECL.ecommerce) {
            const subMethod = method.substring(10);
            if(typeof ECL.ecommerce[subMethod] === 'function') {
                ECL.ecommerce[subMethod](...args);
            }
        }
    }
    
    utils.log('Tracking script initialized.');

})(window, document);
