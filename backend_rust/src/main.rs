mod protocol;
mod config;
mod bookmarks;

use std::fs::File;
use simplelog::{WriteLogger, LevelFilter, Config as LogConfig};
use serde_json::{json, Value};
use log::{info, warn};
use crate::config::ConfigManager;
use crate::bookmarks::BookmarksManager;

fn setup_logging() {
    let log_path = ConfigManager::get_log_path();
    ConfigManager::ensure_sync_dir();
    
    if let Ok(file) = File::create(log_path) {
        let _ = WriteLogger::init(LevelFilter::Info, LogConfig::default(), file);
    }
}

fn handle_message(message: Value) {
    let msg_type = message.get("type").and_then(|t| t.as_str()).unwrap_or("unknown");
    
    // Check if sync is enabled (unless it's a config/status check)
    if msg_type == "sync_bookmarks" && !ConfigManager::load_config().enabled {
        info!("Sync disabled by user");
        protocol::send_message(&json!({
            "type": "sync_response",
            "status": "disabled",
            "message": "Synchronisation désactivée dans les paramètres"
        }));
        return;
    }

    match msg_type {
        "sync_bookmarks" | "unknown" => {
            // "unknown" might be legacy message containing only bookmarks
            let bookmarks_list = if let Some(list) = message.get("bookmarks") {
                list.as_array().cloned().unwrap_or_default()
            } else if message.is_array() {
                message.as_array().cloned().unwrap_or_default()
            } else {
                vec![]
            };

            info!("Processing sync request with {} bookmarks", bookmarks_list.len());

            let mut local_data = BookmarksManager::load_bookmarks();
            let merged = BookmarksManager::merge_bookmarks(&mut local_data, bookmarks_list);
            
            if BookmarksManager::save_bookmarks(&mut local_data) {
                protocol::send_message(&json!({
                    "type": "sync_response",
                    "status": "success",
                    "bookmarks": merged,
                    "message": format!("Synchronisation réussie : {} favoris", merged.len())
                }));
            } else {
                protocol::send_message(&json!({
                    "type": "sync_response",
                    "status": "error",
                    "message": "Erreur lors de la sauvegarde des favoris"
                }));
            }
        },
        "get_status" => {
            let config = ConfigManager::load_config();
            let local_data = BookmarksManager::load_bookmarks();
            let last_sync = local_data.last_updated.unwrap_or_default();

            protocol::send_message(&json!({
                "type": "status_response",
                "status": "success",
                "sync_enabled": config.enabled,
                "auto_sync": config.auto_sync,
                "sync_interval": config.sync_interval,
                "local_bookmarks_count": local_data.bookmarks.len(),
                "last_sync": last_sync 
            }));
        },
        "ping" => {
            protocol::send_message(&json!({
                "type": "pong",
                "status": "success",
                "timestamp": message.get("timestamp").unwrap_or(&json!(0))
            }));
        },
        _ => {
            warn!("Unsupported message type: {}", msg_type);
            protocol::send_message(&json!({
                "type": "error",
                "status": "error",
                "message": format!("Type de message non supporté : {}", msg_type)
            }));
        }
    }
}

fn main() {
    setup_logging();
    info!("Native Host Rust started");

    loop {
        match protocol::read_message() {
            Some(message) => {
                handle_message(message);
            },
            None => {
                info!("Communication ended");
                break;
            }
        }
    }
}
