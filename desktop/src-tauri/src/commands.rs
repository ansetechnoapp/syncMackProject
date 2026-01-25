use tauri::State;
use serde_json::{json, Value};
use crate::state::{SharedState, SyncStatus, ConnectedClient};
use crate::config::{Config, ConfigManager};
use crate::bookmarks::{BookmarksData, BookmarksManager};

#[tauri::command]
pub fn get_config(state: State<SharedState>) -> Config {
    state.config.read().clone()
}

#[tauri::command]
pub fn save_config(state: State<SharedState>, config: Config) -> bool {
    let result = ConfigManager::save_config(&config);
    if result {
        *state.config.write() = config.clone();

        // Broadcast config update to connected clients
        let message = json!({
            "type": "config_updated",
            "payload": config
        }).to_string();
        state.broadcast_message(&message);
    }
    result
}

#[tauri::command]
pub fn get_bookmarks(state: State<SharedState>) -> BookmarksData {
    state.bookmarks.read().clone()
}

#[tauri::command]
pub fn sync_bookmarks(state: State<SharedState>, extension_bookmarks: Vec<Value>) -> Vec<Value> {
    state.set_sync_in_progress(true);

    let mut bookmarks = state.bookmarks.write();
    let merged = BookmarksManager::merge_bookmarks(&mut bookmarks, extension_bookmarks);

    let success = BookmarksManager::save_bookmarks(&mut bookmarks);
    let bookmarks_data = bookmarks.clone();
    drop(bookmarks);

    state.update_sync_complete(success, if success { None } else { Some("Failed to save bookmarks".to_string()) });

    // Broadcast update to all connected clients (extensions)
    let message = json!({
        "type": "bookmarks_updated",
        "payload": {
            "bookmarks": merged
        }
    }).to_string();
    state.broadcast_message(&message);

    // Émettre vers le frontend React
    state.emit_to_frontend("bookmarks_updated", &bookmarks_data);

    merged
}

#[tauri::command]
pub fn add_bookmark(state: State<SharedState>, bookmark: Value) -> bool {
    let mut bookmarks = state.bookmarks.write();
    let result = BookmarksManager::add_bookmark(&mut bookmarks, bookmark);

    if result {
        let bookmarks_data = bookmarks.clone();
        let message = json!({
            "type": "bookmarks_updated",
            "payload": {
                "bookmarks": bookmarks.bookmarks
            }
        }).to_string();
        drop(bookmarks);
        state.broadcast_message(&message);
        // Émettre vers le frontend React
        state.emit_to_frontend("bookmarks_updated", &bookmarks_data);
    }

    result
}

#[tauri::command]
pub fn remove_bookmark(state: State<SharedState>, bookmark_id: String) -> bool {
    let mut bookmarks = state.bookmarks.write();
    let result = BookmarksManager::remove_bookmark(&mut bookmarks, &bookmark_id);

    if result {
        let bookmarks_data = bookmarks.clone();
        let message = json!({
            "type": "bookmarks_updated",
            "payload": {
                "bookmarks": bookmarks.bookmarks
            }
        }).to_string();
        drop(bookmarks);
        state.broadcast_message(&message);
        // Émettre vers le frontend React
        state.emit_to_frontend("bookmarks_updated", &bookmarks_data);
    }

    result
}

#[tauri::command]
pub fn update_bookmark(state: State<SharedState>, bookmark_id: String, bookmark: Value) -> bool {
    let mut bookmarks = state.bookmarks.write();
    let result = BookmarksManager::update_bookmark(&mut bookmarks, &bookmark_id, bookmark);

    if result {
        let bookmarks_data = bookmarks.clone();
        let message = json!({
            "type": "bookmarks_updated",
            "payload": {
                "bookmarks": bookmarks.bookmarks
            }
        }).to_string();
        drop(bookmarks);
        state.broadcast_message(&message);
        // Émettre vers le frontend React
        state.emit_to_frontend("bookmarks_updated", &bookmarks_data);
    }

    result
}

#[tauri::command]
pub fn get_sync_status(state: State<SharedState>) -> SyncStatus {
    state.sync_status.read().clone()
}

#[tauri::command]
pub fn get_connected_clients(state: State<SharedState>) -> Vec<ConnectedClient> {
    state.connected_clients.read().values().cloned().collect()
}

#[tauri::command]
pub fn request_sync_from_extensions(state: State<SharedState>) {
    let message = json!({
        "type": "sync_request"
    }).to_string();
    state.broadcast_message(&message);
}

#[tauri::command]
pub fn get_data_directory() -> String {
    ConfigManager::get_sync_dir().to_string_lossy().to_string()
}
