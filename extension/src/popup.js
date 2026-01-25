document.addEventListener('DOMContentLoaded', () => {
    const syncBtn = document.getElementById('syncBtn');
    const statusDiv = document.getElementById('status');
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const connectionDot = document.getElementById('connectionDot');
    const connectionText = document.getElementById('connectionText');

    // Update connection status
    const updateConnectionStatus = (connected) => {
        if (connected) {
            connectionDot.classList.remove('disconnected');
            connectionDot.classList.add('connected');
            connectionText.textContent = 'Connecté au desktop';
        } else {
            connectionDot.classList.remove('connected');
            connectionDot.classList.add('disconnected');
            connectionText.textContent = 'Desktop déconnecté';
        }
    };

    // Check initial connection status
    chrome.runtime.sendMessage({ action: "get_status" }, (response) => {
        if (response) {
            updateConnectionStatus(response.connected);
        }
    });

    // Listen for connection status changes from background
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "connection_status") {
            updateConnectionStatus(message.connected);
        }
    });

    const setUiLoading = (isLoading) => {
        syncBtn.disabled = isLoading;
        btnText.classList.toggle('hidden', isLoading);
        loader.classList.toggle('hidden', !isLoading);
    };

    const showStatus = (message, type = 'info') => {
        statusDiv.textContent = message;
        statusDiv.className = type;
    };

    syncBtn.addEventListener('click', () => {
        setUiLoading(true);
        showStatus('Synchronisation en cours...', 'info');

        chrome.runtime.sendMessage({ action: "sync" }, (response) => {
            setUiLoading(false);
            if (response && response.success) {
                showStatus('Synchronisation terminée !', 'success');
            } else {
                showStatus(response?.error || 'Erreur inconnue.', 'error');
            }
        });
    });

    // Periodic status check
    setInterval(() => {
        chrome.runtime.sendMessage({ action: "get_status" }, (response) => {
            if (response) {
                updateConnectionStatus(response.connected);
            }
        });
    }, 5000);
});
