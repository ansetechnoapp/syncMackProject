pub mod bookmarks;
pub mod commands;
pub mod config;
pub mod file_watcher;
pub mod smart_folders;
pub mod state;
pub mod sync_log;
pub mod websocket;
pub mod workspace;

use std::sync::Arc;
use log::info;

use bookmarks::BookmarksManager;
use commands::*;
use config::ConfigManager;
use state::AppState;
use workspace::WorkspaceManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    let _ = env_logger::try_init();

    // Load initial state
    let config = ConfigManager::load_config();
    let bookmarks = BookmarksManager::load_bookmarks();
    let ws_port = config.websocket_port;

    let app_state = Arc::new(AppState::new(config, bookmarks));

    info!("SyncMark Desktop starting...");

    // Build Tauri application
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state.clone())
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            get_bookmarks,
            get_bookmarks_tree,
            sync_bookmarks,
            add_bookmark,
            remove_bookmark,
            update_bookmark,
            add_folder,
            remove_folder,
            update_folder,
            get_sync_status,
            get_connected_clients,
            request_sync_from_extensions,
            get_data_directory,
            // Commandes Workspaces
            get_workspaces,
            get_workspace,
            create_workspace,
            update_workspace,
            delete_workspace,
            duplicate_workspace,
            // Commandes Corbeille
            get_deleted_workspaces,
            restore_workspace,
            permanently_delete_workspace,
            empty_trash,
            get_workspace_assignments,
            assign_workspace_to_browser,
            unassign_workspace_from_browser,
            check_legacy_migration,
            run_legacy_migration,
            get_workspace_tree,
            get_workspace_conflicts,
            resolve_workspace_conflict,
            export_workspace_to_file,
            import_workspace_from_file,
            create_backup,
            restore_backup,
            add_bookmark_to_workspace,
            remove_bookmark_from_workspace,
            update_bookmark_in_workspace,
            batch_move_items,
            // Recherche Globale
            search_bookmarks_global,
            // Historique de Sync
            get_sync_history,
            clear_sync_history,
            // Smart Folders
            get_smart_folder_recent,
            get_smart_folder_by_domain,
            get_smart_folder_duplicates,
            apply_custom_smart_filter,
            save_custom_filter,
            delete_custom_filter,
            list_custom_filters,
            // Multi-navigateur
            assign_workspace_to_browser_with_mode,
            // Auto-update
            check_for_updates,
        ])
        .setup(move |app| {
            // Store AppHandle for event emission
            app_state.set_app_handle(app.handle().clone());

            // Migration automatique depuis l'ancien format si nécessaire
            if WorkspaceManager::needs_legacy_migration() {
                info!("Migration legacy détectée, exécution...");
                match WorkspaceManager::migrate_legacy_bookmarks() {
                    Ok(ws) => info!("Migration réussie: workspace '{}' créé", ws.name),
                    Err(e) => log::error!("Échec migration: {}", e),
                }
                // Recharger l'index après migration
                app_state.reload_workspaces_index();
            }

            let state = app_state.clone();
            let state_for_watcher = app_state.clone();

            // Start WebSocket server
            std::thread::spawn(move || {
                let rt = match tokio::runtime::Runtime::new() {
                    Ok(rt) => rt,
                    Err(e) => {
                        log::error!("Failed to create Tokio runtime (websocket): {}", e);
                        return;
                    }
                };
                rt.block_on(async {
                    websocket::start_websocket_server(state, ws_port).await;
                });
            });

            // Start file watcher
            std::thread::spawn(move || {
                let rt = match tokio::runtime::Runtime::new() {
                    Ok(rt) => rt,
                    Err(e) => {
                        log::error!("Failed to create Tokio runtime (file watcher): {}", e);
                        return;
                    }
                };
                rt.block_on(async {
                    file_watcher::start_file_watcher(state_for_watcher).await;
                });
            });

            info!("SyncMark Desktop initialized");
            Ok(())
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            log::error!("Tauri runtime error: {}", e);
        });
}
