use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::Arc;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use crate::config::Config;
use crate::bookmarks::BookmarksData;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectedClient {
    pub id: String,
    pub browser: String,
    pub connected_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
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
}

impl AppState {
    pub fn new(config: Config, bookmarks: BookmarksData) -> Self {
        let mut status = SyncStatus::default();
        status.total_bookmarks = bookmarks.bookmarks.len();

        Self {
            config: RwLock::new(config),
            bookmarks: RwLock::new(bookmarks),
            sync_status: RwLock::new(status),
            connected_clients: RwLock::new(HashMap::new()),
            websocket_tx: RwLock::new(None),
        }
    }

    pub fn add_client(&self, client: ConnectedClient) {
        let mut clients = self.connected_clients.write();
        clients.insert(client.id.clone(), client);
        self.update_client_count();
    }

    pub fn remove_client(&self, client_id: &str) {
        let mut clients = self.connected_clients.write();
        clients.remove(client_id);
        self.update_client_count();
    }

    pub fn update_client_activity(&self, client_id: &str) {
        let mut clients = self.connected_clients.write();
        if let Some(client) = clients.get_mut(client_id) {
            client.last_activity = Utc::now();
        }
    }

    fn update_client_count(&self) {
        let count = self.connected_clients.read().len();
        let mut status = self.sync_status.write();
        status.connected_clients = count;
    }

    pub fn set_sync_in_progress(&self, in_progress: bool) {
        let mut status = self.sync_status.write();
        status.sync_in_progress = in_progress;
    }

    pub fn update_sync_complete(&self, success: bool, error: Option<String>) {
        let mut status = self.sync_status.write();
        status.sync_in_progress = false;
        if success {
            status.last_sync = Some(Utc::now());
            status.last_error = None;
        } else {
            status.last_error = error;
        }
        status.total_bookmarks = self.bookmarks.read().bookmarks.len();
    }

    pub fn broadcast_message(&self, message: &str) {
        if let Some(tx) = self.websocket_tx.read().as_ref() {
            let _ = tx.send(message.to_string());
        }
    }
}

pub type SharedState = Arc<AppState>;
