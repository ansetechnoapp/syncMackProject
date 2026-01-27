use tauri::State;
use serde_json::{json, Value};
use crate::state::{SharedState, SyncStatus, ConnectedClient};
use crate::config::{Config, ConfigManager};
use crate::bookmarks::{BookmarksData, BookmarksManager};
use crate::workspace::{Workspace, WorkspaceSummary, WorkspaceAssignment, WorkspaceManager, WorkspaceConflict, BatchMoveOperation, BatchMoveResult};
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

// ==================== Commandes pour les Workspaces ====================

/// Liste tous les workspaces (résumés)
#[tauri::command]
pub fn get_workspaces() -> Vec<WorkspaceSummary> {
    WorkspaceManager::list_workspaces()
}

/// Obtient un workspace complet par son ID
#[tauri::command]
pub fn get_workspace(workspace_id: String) -> Result<Workspace, String> {
    WorkspaceManager::load_workspace(&workspace_id)
}

/// Crée un nouveau workspace
#[tauri::command]
pub fn create_workspace(state: State<SharedState>, name: String, color: Option<String>) -> Result<Workspace, String> {
    let workspace = WorkspaceManager::create_workspace(name, color)?;

    // Recharger l'index dans le state
    state.reload_workspaces_index();

    // Notifier le frontend
    let workspaces = WorkspaceManager::list_workspaces();
    state.emit_to_frontend("workspaces_updated", &workspaces);

    Ok(workspace)
}

/// Met à jour un workspace existant
#[tauri::command]
pub fn update_workspace(
    state: State<SharedState>,
    workspace_id: String,
    name: Option<String>,
    color: Option<String>,
    icon: Option<String>,
) -> Result<Workspace, String> {
    let workspace = WorkspaceManager::update_workspace(&workspace_id, name, color, icon)?;

    // Recharger l'index dans le state
    state.reload_workspaces_index();

    // Notifier le frontend
    let workspaces = WorkspaceManager::list_workspaces();
    state.emit_to_frontend("workspaces_updated", &workspaces);

    Ok(workspace)
}

/// Supprime un workspace
#[tauri::command]
pub fn delete_workspace(state: State<SharedState>, workspace_id: String) -> Result<(), String> {
    // Vérifier qu'aucun navigateur n'utilise ce workspace
    let browsers = WorkspaceManager::get_browsers_for_workspace(&workspace_id);
    if !browsers.is_empty() {
        return Err(format!(
            "Impossible de supprimer : {} navigateur(s) utilisent ce workspace",
            browsers.len()
        ));
    }

    WorkspaceManager::delete_workspace(&workspace_id)?;

    // Recharger l'index dans le state
    state.reload_workspaces_index();

    // Notifier le frontend
    let workspaces = WorkspaceManager::list_workspaces();
    state.emit_to_frontend("workspaces_updated", &workspaces);

    Ok(())
}

/// Duplique un workspace
#[tauri::command]
pub fn duplicate_workspace(
    state: State<SharedState>,
    workspace_id: String,
    new_name: String,
) -> Result<Workspace, String> {
    let workspace = WorkspaceManager::duplicate_workspace(&workspace_id, new_name)?;

    // Recharger l'index dans le state
    state.reload_workspaces_index();

    // Notifier le frontend
    let workspaces = WorkspaceManager::list_workspaces();
    state.emit_to_frontend("workspaces_updated", &workspaces);

    Ok(workspace)
}

/// Obtient toutes les assignments (workspace <-> navigateur)
#[tauri::command]
pub fn get_workspace_assignments() -> Vec<WorkspaceAssignment> {
    WorkspaceManager::get_assignments()
}

/// Assigne un workspace à un navigateur
#[tauri::command]
pub fn assign_workspace_to_browser(
    state: State<SharedState>,
    browser_id: String,
    workspace_id: String,
) -> Result<(), String> {
    let (connection_id, browser_name) = {
        let clients = state.connected_clients.read();
        let mut found: Option<(String, String)> = None;
        for (cid, c) in clients.iter() {
            if c.browser_instance_id.as_deref() == Some(browser_id.as_str()) {
                found = Some((cid.clone(), c.browser.clone()));
                break;
            }
        }
        found.ok_or_else(|| "Navigateur non trouvé (non connecté)".to_string())?
    };

    WorkspaceManager::assign_workspace(&browser_id, &browser_name, &workspace_id)?;

    state.update_client_workspace(&connection_id, Some(workspace_id.clone()));

    // Recharger l'index
    state.reload_workspaces_index();

    // Charger le workspace et l'envoyer au navigateur ciblé
    if let Ok(workspace) = WorkspaceManager::load_workspace(&workspace_id) {
        let message = json!({
            "type": "workspace_switched",
            "payload": {
                "targetBrowserInstanceId": browser_id,
                "workspaceId": workspace.id,
                "workspaceName": workspace.name,
                "bookmarks": workspace.bookmarks,
                "folders": workspace.folders,
                "version": workspace.version
            }
        }).to_string();
        state.broadcast_message(&message);
    }

    // Notifier le frontend
    let assignments = WorkspaceManager::get_assignments();
    state.emit_to_frontend("assignments_updated", &assignments);

    Ok(())
}

/// Retire l'assignment d'un navigateur
#[tauri::command]
pub fn unassign_workspace_from_browser(
    state: State<SharedState>,
    browser_id: String,
) -> Result<(), String> {
    WorkspaceManager::unassign_workspace(&browser_id)?;

    let connection_id = {
        let clients = state.connected_clients.read();
        clients.iter()
            .find(|(_, c)| c.browser_instance_id.as_deref() == Some(browser_id.as_str()))
            .map(|(cid, _)| cid.clone())
    };
    if let Some(cid) = connection_id {
        state.update_client_workspace(&cid, None);
    }

    // Recharger l'index
    state.reload_workspaces_index();

    // Notifier le frontend
    let assignments = WorkspaceManager::get_assignments();
    state.emit_to_frontend("assignments_updated", &assignments);

    Ok(())
}

/// Vérifie si une migration depuis l'ancien format est nécessaire
#[tauri::command]
pub fn check_legacy_migration() -> bool {
    WorkspaceManager::needs_legacy_migration()
}

/// Exécute la migration depuis l'ancien format
#[tauri::command]
pub fn run_legacy_migration(state: State<SharedState>) -> Result<Workspace, String> {
    let workspace = WorkspaceManager::migrate_legacy_bookmarks()?;

    // Recharger l'index
    state.reload_workspaces_index();

    // Notifier le frontend
    let workspaces = WorkspaceManager::list_workspaces();
    state.emit_to_frontend("workspaces_updated", &workspaces);

    Ok(workspace)
}

/// Obtient l'arborescence d'un workspace spécifique
#[tauri::command]
pub fn get_workspace_tree(workspace_id: String) -> Result<Value, String> {
    let workspace = WorkspaceManager::load_workspace(&workspace_id)?;

    // Construire l'arborescence comme pour BookmarksManager::build_tree
    // mais avec les données du workspace
    let data = crate::bookmarks::BookmarksData {
        version: "1.0".to_string(),
        created_at: None,
        last_updated: None,
        bookmarks: workspace.bookmarks,
        folders: workspace.folders,
        metadata: crate::bookmarks::Metadata::default(),
    };

    Ok(BookmarksManager::build_tree(&data))
}

#[tauri::command]
pub fn get_workspace_conflicts(workspace_id: String) -> Result<Vec<WorkspaceConflict>, String> {
    WorkspaceManager::list_conflicts(&workspace_id)
}

#[tauri::command]
pub fn resolve_workspace_conflict(
    state: State<SharedState>,
    workspace_id: String,
    conflict_id: String,
    resolution: String,
) -> Result<Workspace, String> {
    let resolved_by = ConfigManager::load_config().client_id.unwrap_or_else(|| "desktop".to_string());
    let ws = WorkspaceManager::resolve_conflict(&workspace_id, &conflict_id, &resolution, &resolved_by)?;
    let workspaces = WorkspaceManager::list_workspaces();
    state.emit_to_frontend("workspaces_updated", &workspaces);
    Ok(ws)
}

#[tauri::command]
pub fn export_workspace_to_file(workspace_id: String) -> Result<String, String> {
    WorkspaceManager::export_workspace(&workspace_id)
}

#[tauri::command]
pub fn import_workspace_from_file(state: State<SharedState>, path: String, mode: String) -> Result<Workspace, String> {
    let ws = WorkspaceManager::import_workspace_from_path(&path, &mode)?;
    state.reload_workspaces_index();
    let workspaces = WorkspaceManager::list_workspaces();
    state.emit_to_frontend("workspaces_updated", &workspaces);
    Ok(ws)
}

#[tauri::command]
pub fn create_backup() -> Result<String, String> {
    WorkspaceManager::backup_all()
}

#[tauri::command]
pub fn restore_backup(state: State<SharedState>, path: String) -> Result<String, String> {
    let (pre_backup, _index) = WorkspaceManager::restore_backup_from_path(&path)?;
    state.reload_workspaces_index();
    let workspaces = WorkspaceManager::list_workspaces();
    state.emit_to_frontend("workspaces_updated", &workspaces);
    Ok(pre_backup)
}

// ==================== CRUD Items in Workspace ====================

#[tauri::command]
pub fn add_bookmark_to_workspace(
    state: State<SharedState>,
    workspace_id: String,
    bookmark: Value
) -> Result<bool, String> {
    let mut b: crate::bookmarks::Bookmark = serde_json::from_value(bookmark)
        .map_err(|e| format!("Invalid bookmark: {}", e))?;
    
    if b.id.is_empty() {
        b.id = Uuid::new_v4().to_string();
    }
    if b.sync_id.is_empty() {
        b.sync_id = Uuid::new_v4().to_string();
    }
    b.updated_at_lamport = 1;
    b.updated_by = "desktop".to_string();

    WorkspaceManager::add_bookmark_to_workspace(&workspace_id, b)?;
    
    // Notify
    if let Ok(workspace) = WorkspaceManager::load_workspace(&workspace_id) {
        let message = json!({
            "type": "bookmarks_updated",
            "payload": {
                "workspaceId": workspace.id,
                "bookmarks": &workspace.bookmarks,
                "folders": &workspace.folders,
                "version": workspace.version,
                "source": "desktop"
            }
        }).to_string();
        state.broadcast_message(&message);
        
        // Refresh workspaces list (counts changed)
        let workspaces = WorkspaceManager::list_workspaces();
        state.emit_to_frontend("workspaces_updated", &workspaces);
    }
    
    Ok(true)
}

#[tauri::command]
pub fn remove_bookmark_from_workspace(
    state: State<SharedState>,
    workspace_id: String,
    bookmark_id: String
) -> Result<bool, String> {
    WorkspaceManager::remove_bookmark_from_workspace(&workspace_id, &bookmark_id)?;
    
    if let Ok(workspace) = WorkspaceManager::load_workspace(&workspace_id) {
        let message = json!({
            "type": "bookmarks_updated",
            "payload": {
                "workspaceId": workspace.id,
                "bookmarks": &workspace.bookmarks,
                "folders": &workspace.folders,
                "version": workspace.version,
                "source": "desktop"
            }
        }).to_string();
        state.broadcast_message(&message);
        
        let workspaces = WorkspaceManager::list_workspaces();
        state.emit_to_frontend("workspaces_updated", &workspaces);
    }
    Ok(true)
}

#[tauri::command]
pub fn update_bookmark_in_workspace(
    state: State<SharedState>,
    workspace_id: String,
    bookmark_id: String,
    title: Option<String>,
    url: Option<String>,
    parent_id: Option<String>
) -> Result<bool, String> {
    WorkspaceManager::update_bookmark_in_workspace(&workspace_id, &bookmark_id, title, url, parent_id)?;
    
    if let Ok(workspace) = WorkspaceManager::load_workspace(&workspace_id) {
        let message = json!({
            "type": "bookmarks_updated",
            "payload": {
                "workspaceId": workspace.id,
                "bookmarks": &workspace.bookmarks,
                "folders": &workspace.folders,
                "version": workspace.version,
                "source": "desktop"
            }
        }).to_string();
        state.broadcast_message(&message);
    }
    Ok(true)
}

#[tauri::command]
pub fn batch_move_items(
    state: State<SharedState>,
    operation: BatchMoveOperation
) -> Result<BatchMoveResult, String> {
    let result = WorkspaceManager::batch_move_items(operation.clone())?;
    
    if result.success {
        // Notify changes
        if let Ok(source) = WorkspaceManager::load_workspace(&operation.source_workspace_id) {
            let message = json!({
                "type": "bookmarks_updated",
                "payload": {
                    "workspaceId": source.id,
                    "bookmarks": &source.bookmarks,
                    "folders": &source.folders,
                    "version": source.version,
                    "source": "desktop"
                }
            }).to_string();
            state.broadcast_message(&message);
        }
        
        if let Ok(target) = WorkspaceManager::load_workspace(&operation.target_workspace_id) {
            let message = json!({
                "type": "bookmarks_updated",
                "payload": {
                    "workspaceId": target.id,
                    "bookmarks": &target.bookmarks,
                    "folders": &target.folders,
                    "version": target.version,
                    "source": "desktop"
                }
            }).to_string();
            state.broadcast_message(&message);
        }
        
        let workspaces = WorkspaceManager::list_workspaces();
        state.emit_to_frontend("workspaces_updated", &workspaces);
    }
    
    Ok(result)
}
