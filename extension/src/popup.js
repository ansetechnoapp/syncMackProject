document.addEventListener('DOMContentLoaded', () => {
    const syncBtn = document.getElementById('syncBtn');
    const statusDiv = document.getElementById('status');
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const connectionDot = document.getElementById('connectionDot');
    const connectionText = document.getElementById('connectionText');
    const workspaceName = document.getElementById('workspaceName');
    const workspaceColor = document.getElementById('workspaceColor');
    const workspaceSelect = document.getElementById('workspaceSelect');

    // Thème
    const applyTheme = () => {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    };

    applyTheme();
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener('change', applyTheme);

    // État local
    let currentWorkspace = null;
    let availableWorkspaces = [];

    // Update connection status
    const updateConnectionStatus = (connected, workspace = null) => {
        if (connected) {
            connectionDot.classList.remove('disconnected');
            connectionDot.classList.add('connected');
            connectionText.textContent = 'Connecté au desktop';
            workspaceSelect.disabled = false;
        } else {
            connectionDot.classList.remove('connected');
            connectionDot.classList.add('disconnected');
            connectionText.textContent = 'Desktop déconnecté';
            workspaceSelect.disabled = true;
        }

        if (workspace) {
            updateWorkspaceDisplay(workspace);
        }
    };

    // Update workspace display
    const updateWorkspaceDisplay = (workspace) => {
        currentWorkspace = workspace;
        if (workspace) {
            workspaceName.textContent = workspace.name;
            workspaceColor.style.backgroundColor = workspace.color || '#3498db';
            workspaceColor.style.display = 'inline-block';
        } else {
            workspaceName.textContent = 'Aucun workspace';
            workspaceColor.style.display = 'none';
        }
    };

    // Update workspace select dropdown
    const updateWorkspaceSelect = (workspaces, current) => {
        availableWorkspaces = workspaces || [];
        workspaceSelect.innerHTML = '';

        if (workspaces.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Aucun workspace disponible';
            workspaceSelect.appendChild(option);
            workspaceSelect.disabled = true;
            return;
        }

        for (const ws of workspaces) {
            const option = document.createElement('option');
            option.value = ws.id;
            option.textContent = ws.name;
            if (ws.totalBookmarks !== undefined) {
                option.textContent += ` (${ws.totalBookmarks} favoris)`;
            }
            if (current && ws.id === current.id) {
                option.selected = true;
            }
            workspaceSelect.appendChild(option);
        }

        workspaceSelect.disabled = false;
    };

    // Load workspaces from background
    const loadWorkspaces = () => {
        chrome.runtime.sendMessage({ action: "get_workspaces" }, (response) => {
            if (response) {
                updateWorkspaceSelect(response.workspaces || [], response.current);
                if (response.current) {
                    updateWorkspaceDisplay(response.current);
                }
            }
        });
    };

    // Check initial connection status
    chrome.runtime.sendMessage({ action: "get_status" }, (response) => {
        if (response) {
            updateConnectionStatus(response.connected, response.workspace);
            if (response.connected) {
                loadWorkspaces();
            }
        }
    });

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "connection_status") {
            updateConnectionStatus(message.connected, message.workspace);
            if (message.connected) {
                loadWorkspaces();
            }
        }

        if (message.type === "workspace_changed") {
            updateWorkspaceDisplay(message.workspace);
            if (message.created) {
                showStatus(`Workspace "${message.workspace?.name}" créé !`, 'success');
            } else {
                showStatus(`Workspace "${message.workspace?.name}" chargé`, 'success');
            }
        }

        if (message.type === "workspaces_updated") {
            updateWorkspaceSelect(message.workspaces, currentWorkspace);
        }
    });

    // Workspace select change handler
    workspaceSelect.addEventListener('change', () => {
        const selectedId = workspaceSelect.value;
        if (!selectedId || (currentWorkspace && selectedId === currentWorkspace.id)) {
            return;
        }

        // Demander le switch
        setUiLoading(true);
        showStatus('Changement de workspace...', 'info');

        chrome.runtime.sendMessage({
            action: "switch_workspace",
            workspaceId: selectedId
        }, (response) => {
            if (!response || !response.success) {
                setUiLoading(false);
                showStatus(response?.error || 'Erreur lors du changement', 'error');
                // Remettre la sélection précédente
                if (currentWorkspace) {
                    workspaceSelect.value = currentWorkspace.id;
                }
            }
            // Le reste sera géré par workspace_changed
        });
    });

    const setUiLoading = (isLoading) => {
        syncBtn.disabled = isLoading;
        btnText.classList.toggle('hidden', isLoading);
        loader.classList.toggle('hidden', !isLoading);
        if (isLoading) {
            workspaceSelect.disabled = true;
        }
    };

    const showStatus = (message, type = 'info') => {
        statusDiv.textContent = message;
        statusDiv.className = type;
        setUiLoading(false);
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
                updateConnectionStatus(response.connected, response.workspace);
            }
        });
    }, 5000);
});
