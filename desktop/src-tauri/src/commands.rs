use tauri::State;
use serde_json::{json, Value};
use crate::state::{SharedState, SyncStatus, ConnectedClient};
use crate::config::{Config, ConfigManager};
use crate::bookmarks::{BookmarksData, BookmarksManager};
use uuid::Uuid;

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
    state.mark_internal_save();

    let (success, merged, folders_merged, bookmarks_data) = {
        let mut bookmarks = state.bookmarks.write();
        let (success, merged, folders_merged) = BookmarksManager::process_sync_payload(&mut bookmarks, extension_bookmarks);
        let data = bookmarks.clone();
        (success, merged, folders_merged, data)
    };

    state.update_sync_complete(success, if success { None } else { Some("Failed to save bookmarks".to_string()) });

    // Broadcast update to all connected clients (extensions)
    let message = json!({
        "type": "bookmarks_updated",
        "payload": {
            "bookmarks": &merged
        }
    }).to_string();
    state.broadcast_message(&message);

    if !folders_merged.is_empty() {
        let folders_msg = json!({
            "type": "folders_updated",
            "payload": {
                "folders": &folders_merged
            }
        }).to_string();
        state.broadcast_message(&folders_msg);
    }

    // Émettre vers le frontend React
    state.emit_to_frontend("bookmarks_updated", &bookmarks_data);

    // Convert to Vec<Value> for return type
    merged.into_iter().map(|b| serde_json::to_value(b).unwrap_or(Value::Null)).collect()
}

#[tauri::command]
pub fn add_bookmark(state: State<SharedState>, bookmark: Value) -> bool {
    // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
    state.mark_internal_save();
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
    // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
    state.mark_internal_save();
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
    // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
    state.mark_internal_save();
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

// ==================== Commandes pour les dossiers ====================

#[tauri::command]
pub fn get_bookmarks_tree(state: State<SharedState>) -> Value {
    let bookmarks = state.bookmarks.read();
    BookmarksManager::build_tree(&bookmarks)
}

#[tauri::command]
pub fn add_folder(state: State<SharedState>, folder: Value) -> bool {
    // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
    state.mark_internal_save();
    let mut folder_obj = folder.as_object().cloned().unwrap_or_default();

    // Desktop-created folders need a temporary ID so the extension can create the folder
    // in Chrome and send back the real Chrome folder ID.
    let temp_id = folder_obj
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    folder_obj.insert("id".to_string(), Value::String(temp_id.clone()));

    let parent_id = folder_obj
        .get("parentId")
        .and_then(|v| v.as_str())
        .unwrap_or("1")
        .to_string();
    folder_obj.insert("parentId".to_string(), Value::String(parent_id.clone()));

    let mut bookmarks = state.bookmarks.write();
    let result = BookmarksManager::add_folder(&mut bookmarks, Value::Object(folder_obj));

    if result {
        let bookmarks_data = bookmarks.clone();
        let message = json!({
            "type": "folders_updated",
            "payload": {
                "folders": bookmarks.folders
            }
        }).to_string();
        drop(bookmarks);
        state.broadcast_message(&message);
        state.emit_to_frontend("bookmarks_updated", &bookmarks_data);

        // Ask extensions to create the folder in the browser.
        // The extension will respond with `folder_created` containing `tempId` + real Chrome `id`.
        let create_folder = json!({
            "type": "create_folder",
            "payload": {
                "tempId": temp_id,
                "title": folder.get("title").cloned().unwrap_or(Value::Null),
                "parentId": parent_id
            }
        }).to_string();
        state.broadcast_message(&create_folder);
    }

    result
}

#[tauri::command]
pub fn remove_folder(state: State<SharedState>, folder_id: String) -> bool {
    // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
    state.mark_internal_save();
    let mut bookmarks = state.bookmarks.write();
    let result = BookmarksManager::remove_folder(&mut bookmarks, &folder_id);

    if result {
        let bookmarks_data = bookmarks.clone();
        let message = json!({
            "type": "folders_updated",
            "payload": {
                "folders": bookmarks.folders
            }
        }).to_string();
        drop(bookmarks);
        state.broadcast_message(&message);
        state.emit_to_frontend("bookmarks_updated", &bookmarks_data);
    }

    result
}

#[tauri::command]
pub fn update_folder(state: State<SharedState>, folder_id: String, folder: Value) -> bool {
    // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
    state.mark_internal_save();
    let mut bookmarks = state.bookmarks.write();
    let result = BookmarksManager::update_folder(&mut bookmarks, &folder_id, folder);

    if result {
        let bookmarks_data = bookmarks.clone();
        let message = json!({
            "type": "folders_updated",
            "payload": {
                "folders": bookmarks.folders
            }
        }).to_string();
        drop(bookmarks);
        state.broadcast_message(&message);
        state.emit_to_frontend("bookmarks_updated", &bookmarks_data);
    }

    result
}
