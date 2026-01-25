pub mod bookmarks;
pub mod commands;
pub mod config;
pub mod file_watcher;
pub mod state;
pub mod websocket;

use std::sync::Arc;
use log::info;

use bookmarks::BookmarksManager;
use commands::*;
use config::ConfigManager;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::init();

    // Load initial state
    let config = ConfigManager::load_config();
    let bookmarks = BookmarksManager::load_bookmarks();
    let ws_port = config.websocket_port;

    let app_state = Arc::new(AppState::new(config, bookmarks));

    info!("SyncMark Desktop starting...");

    // Build Tauri application
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state.clone())
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            get_bookmarks,
            sync_bookmarks,
            add_bookmark,
            remove_bookmark,
            get_sync_status,
            get_connected_clients,
            request_sync_from_extensions,
            get_data_directory,
        ])
        .setup(move |_app| {
            let state = app_state.clone();
            let state_for_watcher = app_state.clone();

            // Start WebSocket server
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    websocket::start_websocket_server(state, ws_port).await;
                });
            });

            // Start file watcher
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    file_watcher::start_file_watcher(state_for_watcher).await;
                });
            });

            info!("SyncMark Desktop initialized");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
