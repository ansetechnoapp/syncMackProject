use std::time::Duration;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use tokio::sync::mpsc;
use log::{error, info};
use serde_json::json;

use crate::config::ConfigManager;
use crate::bookmarks::BookmarksManager;
use crate::state::SharedState;

pub async fn start_file_watcher(state: SharedState) {
    let (tx, mut rx) = mpsc::channel::<Event>(100);

    let sync_dir = ConfigManager::get_sync_dir();

    let watcher_tx = tx.clone();
    let mut watcher = match RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = watcher_tx.blocking_send(event);
            }
        },
        Config::default().with_poll_interval(Duration::from_secs(2)),
    ) {
        Ok(w) => w,
        Err(e) => {
            error!("Failed to create file watcher: {}", e);
            return;
        }
    };

    if let Err(e) = watcher.watch(&sync_dir, RecursiveMode::NonRecursive) {
        error!("Failed to watch directory {:?}: {}", sync_dir, e);
        return;
    }

    info!("File watcher started for {:?}", sync_dir);

    // Debounce timer to avoid multiple notifications for same change
    let mut last_event_time = std::time::Instant::now();
    let debounce_duration = Duration::from_millis(500);

    while let Some(event) = rx.recv().await {
        let now = std::time::Instant::now();
        if now.duration_since(last_event_time) < debounce_duration {
            continue;
        }
        last_event_time = now;

        // Check if the event is for our files
        let bookmarks_path = ConfigManager::get_bookmarks_path();
        let config_path = ConfigManager::get_config_path();

        for path in &event.paths {
            if path == &bookmarks_path {
                handle_bookmarks_change(&state).await;
            } else if path == &config_path {
                handle_config_change(&state).await;
            }
        }
    }

    // Keep watcher alive
    drop(watcher);
}

async fn handle_bookmarks_change(state: &SharedState) {
    info!("Bookmarks file changed externally");

    // Reload bookmarks from file
    let new_bookmarks = BookmarksManager::load_bookmarks();

    // Update state
    *state.bookmarks.write() = new_bookmarks.clone();

    // Update sync status
    let mut status = state.sync_status.write();
    status.total_bookmarks = new_bookmarks.bookmarks.len();
    drop(status);

    // Broadcast to connected clients
    let message = json!({
        "type": "bookmarks_updated",
        "payload": {
            "bookmarks": new_bookmarks.bookmarks,
            "source": "file_change"
        }
    });
    state.broadcast_message(&message.to_string());
}

async fn handle_config_change(state: &SharedState) {
    info!("Config file changed externally");

    // Reload config from file
    let new_config = ConfigManager::load_config();

    // Update state
    *state.config.write() = new_config.clone();

    // Broadcast to connected clients
    let message = json!({
        "type": "config_updated",
        "payload": new_config
    });
    state.broadcast_message(&message.to_string());
}
