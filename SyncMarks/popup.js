document.addEventListener('DOMContentLoaded', () => {
    const syncBtn = document.getElementById('syncBtn');
    const statusDiv = document.getElementById('status');
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');

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

        // Envoyer un message au service worker (background.js) pour démarrer le processus
        chrome.runtime.sendMessage({ action: "sync" }, (response) => {
            setUiLoading(false);
            if (response.success) {
                showStatus('Synchronisation terminée !', 'success');
            } else {
                showStatus(response.error || 'Erreur inconnue.', 'error');
            }
        });
    });
});

