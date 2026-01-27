use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use log::info;
use crate::config::Config;
use crate::bookmarks::BookmarksData;
use crate::workspace::{WorkspacesIndex, WorkspaceManager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectedClient {
    pub id: String,
    pub browser: String,
    #[serde(default)]
    pub browser_instance_id: Option<String>,
    pub connected_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    /// ID du workspace assigné à ce client (None si pas encore assigné)
    #[serde(default)]
    pub workspace_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub last_sync: Option<DateTime<Utc>>,
    pub sync_in_progress: bool,
    pub total_bookmarks: usize,
    pub connected_clients: usize,
    pub last_error: Option<String>,
}

impl Default for SyncStatus {
    fn default() -> Self {
        Self {
            last_sync: None,
            sync_in_progress: false,
            total_bookmarks: 0,
            connected_clients: 0,
            last_error: None,
        }
    }
}

pub struct AppState {
    pub config: RwLock<Config>,
    pub bookmarks: RwLock<BookmarksData>,
    pub sync_status: RwLock<SyncStatus>,
    pub connected_clients: RwLock<HashMap<String, ConnectedClient>>,
    pub websocket_tx: RwLock<Option<tokio::sync::broadcast::Sender<String>>>,
    pub app_handle: RwLock<Option<AppHandle>>,
    /// Flag pour ignorer le prochain changement de fichier (évite double notification)
    pub skip_file_change: AtomicBool,
    /// Index des workspaces
    pub workspaces_index: RwLock<WorkspacesIndex>,
}

impl AppState {
    pub fn new(config: Config, bookmarks: BookmarksData) -> Self {
        let mut status = SyncStatus::default();
        status.total_bookmarks = bookmarks.bookmarks.len();

        // Charger l'index des workspaces
        let workspaces_index = WorkspaceManager::load_index();

        Self {
            config: RwLock::new(config),
            bookmarks: RwLock::new(bookmarks),
            sync_status: RwLock::new(status),
            connected_clients: RwLock::new(HashMap::new()),
            websocket_tx: RwLock::new(None),
            app_handle: RwLock::new(None),
            skip_file_change: AtomicBool::new(false),
            workspaces_index: RwLock::new(workspaces_index),
        }
    }

    /// Marque qu'une sauvegarde interne va avoir lieu (le file_watcher doit ignorer)
    pub fn mark_internal_save(&self) {
        self.skip_file_change.store(true, Ordering::SeqCst);
    }

    /// Vérifie et reset le flag de sauvegarde interne
    pub fn should_skip_file_change(&self) -> bool {
        self.skip_file_change.swap(false, Ordering::SeqCst)
    }

    pub fn set_app_handle(&self, handle: AppHandle) {
        *self.app_handle.write() = Some(handle);
    }

    /// Émet un événement vers le frontend React
    pub fn emit_to_frontend<S: Serialize + Clone>(&self, event: &str, payload: S) {
        if let Some(handle) = self.app_handle.read().as_ref() {
            if let Err(e) = handle.emit(event, payload) {
                log::error!("Failed to emit event {}: {}", event, e);
            } else {
                info!("Event emitted: {}", event);
            }
        }
    }

    pub fn add_client(&self, client: ConnectedClient) {
        let (count, clients_list) = {
            let mut clients = self.connected_clients.write();
            clients.insert(client.id.clone(), client);
            (clients.len(), clients.values().cloned().collect::<Vec<_>>())
        };
        self.update_client_count(count);
        // Émettre l'événement vers le frontend
        self.emit_to_frontend("clients_updated", &clients_list);
    }

    pub fn remove_client(&self, client_id: &str) {
        let (count, clients_list) = {
            let mut clients = self.connected_clients.write();
            clients.remove(client_id);
            (clients.len(), clients.values().cloned().collect::<Vec<_>>())
        };
        self.update_client_count(count);
        // Émettre l'événement vers le frontend
        self.emit_to_frontend("clients_updated", &clients_list);
    }

    pub fn update_client_activity(&self, client_id: &str) {
        let mut clients = self.connected_clients.write();
        if let Some(client) = clients.get_mut(client_id) {
            client.last_activity = Utc::now();
        }
    }

    fn update_client_count(&self, count: usize) {
        let mut status = self.sync_status.write();
        status.connected_clients = count;
    }

    pub fn set_sync_in_progress(&self, in_progress: bool) {
        let mut status = self.sync_status.write();
        status.sync_in_progress = in_progress;
    }

    pub fn update_sync_complete(&self, success: bool, error: Option<String>) {
        let status_clone = {
            let mut status = self.sync_status.write();
            status.sync_in_progress = false;
            if success {
                status.last_sync = Some(Utc::now());
                status.last_error = None;
            } else {
                status.last_error = error;
            }
            status.total_bookmarks = self.bookmarks.read().bookmarks.len();
            status.clone()
        };
        // Émettre l'événement vers le frontend
        self.emit_to_frontend("sync_status_updated", &status_clone);
    }

    pub fn broadcast_message(&self, message: &str) {
        if let Some(tx) = self.websocket_tx.read().as_ref() {
            let _ = tx.send(message.to_string());
        }
    }

    /// Met à jour le workspace_id d'un client
    pub fn update_client_workspace(&self, client_id: &str, workspace_id: Option<String>) {
        let clients_list = {
            let mut clients = self.connected_clients.write();
            if let Some(client) = clients.get_mut(client_id) {
                client.workspace_id = workspace_id;
                client.last_activity = Utc::now();
            }
            clients.values().cloned().collect::<Vec<_>>()
        };
        self.emit_to_frontend("clients_updated", &clients_list);
    }

    /// Met à jour les informations du navigateur d'un client (browser name, instance id)
    pub fn update_client_info(&self, client_id: &str, browser: &str, browser_instance_id: &str) {
        let clients_list = {
            let mut clients = self.connected_clients.write();
            if let Some(client) = clients.get_mut(client_id) {
                client.browser = browser.to_string();
                client.browser_instance_id = Some(browser_instance_id.to_string());
                client.last_activity = Utc::now();
            }
            clients.values().cloned().collect::<Vec<_>>()
        };
        self.emit_to_frontend("clients_updated", &clients_list);
    }

    /// Obtient le workspace_id d'un client
    pub fn get_client_workspace(&self, client_id: &str) -> Option<String> {
        let clients = self.connected_clients.read();
        clients.get(client_id).and_then(|c| c.workspace_id.clone())
    }

    /// Recharge l'index des workspaces depuis le disque
    pub fn reload_workspaces_index(&self) {
        let index = WorkspaceManager::load_index();
        *self.workspaces_index.write() = index;
    }

    /// Envoie un message à un client spécifique (via broadcast avec filtre côté réception)
    pub fn send_to_client(&self, _client_id: &str, message: &str) {
        // Pour l'instant on broadcast, le filtrage se fera côté réception
        // Une amélioration future serait d'avoir des channels par client
        self.broadcast_message(message);
    }
}

pub type SharedState = Arc<AppState>;
