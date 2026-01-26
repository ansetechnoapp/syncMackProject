use std::fs;
use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use log::{error, info, warn};
use chrono::Local;
use crate::config::ConfigManager;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BookmarksData {
    pub version: String,
    pub created_at: Option<String>,
    pub last_updated: Option<String>,
    pub bookmarks: Vec<Value>,
    pub folders: Vec<Value>,
    pub metadata: Metadata,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Metadata {
    pub total_bookmarks: usize,
    pub total_folders: usize,
    pub sync_enabled: bool,
}

impl Default for BookmarksData {
    fn default() -> Self {
        Self {
            version: "1.0".to_string(),
            created_at: Some(Local::now().to_rfc3339()),
            last_updated: Some(Local::now().to_rfc3339()),
            bookmarks: vec![],
            folders: vec![],
            metadata: Metadata::default(),
        }
    }
}

pub struct BookmarksManager;

impl BookmarksManager {
    pub fn load_bookmarks() -> BookmarksData {
        ConfigManager::ensure_sync_dir();
        let path = ConfigManager::get_bookmarks_path();
        
        if !path.exists() {
            return BookmarksData::default();
        }

        match fs::read_to_string(&path) {
            Ok(content) => {
                // Try parsing as the full structure
                match serde_json::from_str::<BookmarksData>(&content) {
                    Ok(data) => data,
                    Err(_) => {
                        // Fallback: Try parsing as a list (legacy format)
                        match serde_json::from_str::<Vec<Value>>(&content) {
                            Ok(list) => {
                                warn!("Loaded legacy bookmarks list format, converting to structure");
                                let mut data = BookmarksData::default();
                                data.bookmarks = list;
                                data.metadata.total_bookmarks = data.bookmarks.len();
                                data
                            },
                            Err(e) => {
                                error!("Failed to parse bookmarks file: {}", e);
                                BookmarksData::default()
                            }
                        }
                    }
                }
            },
            Err(e) => {
                error!("Failed to read bookmarks file: {}", e);
                BookmarksData::default()
            }
        }
    }

    pub fn save_bookmarks(data: &mut BookmarksData) -> bool {
        ConfigManager::ensure_sync_dir();
        let path = ConfigManager::get_bookmarks_path();
        
        data.last_updated = Some(Local::now().to_rfc3339());
        data.metadata.total_bookmarks = data.bookmarks.len();
        data.metadata.total_folders = data.folders.len();

        match serde_json::to_string_pretty(data) {
            Ok(content) => {
                if let Err(e) = fs::write(path, content) {
                    error!("Failed to write bookmarks file: {}", e);
                    false
                } else {
                    info!("Bookmarks saved: {} items", data.bookmarks.len());
                    true
                }
            },
            Err(e) => {
                error!("Failed to serialize bookmarks: {}", e);
                false
            }
        }
    }

    pub fn merge_bookmarks(local_data: &mut BookmarksData, extension_bookmarks: Vec<Value>) -> Vec<Value> {
        let mut merged_map: BTreeMap<String, Value> = BTreeMap::new();

        // Helper to extract URL
        let get_url = |b: &Value| -> Option<String> {
            b.get("url").and_then(|v| v.as_str()).map(|s| s.to_string())
        };

        // Add local bookmarks
        for b in &local_data.bookmarks {
            if let Some(url) = get_url(b) {
                if !url.is_empty() {
                    merged_map.insert(url, b.clone());
                }
            }
        }

        // Add/Update extension bookmarks
        for b in extension_bookmarks {
            if let Some(url) = get_url(&b) {
                if !url.is_empty() {
                    merged_map.insert(url, b);
                }
            }
        }

        let merged_list: Vec<Value> = merged_map.into_values().collect();
        local_data.bookmarks = merged_list.clone();
        merged_list
    }
}
