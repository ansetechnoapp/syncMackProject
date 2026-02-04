use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};
use log::{error, info};
use directories::UserDirs;

use uuid::Uuid;

pub const APP_NAME: &str = "SyncMark";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Config {
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    #[serde(default = "default_auto_sync")]
    pub auto_sync: bool,
    #[serde(default = "default_sync_interval")]
    pub sync_interval: u64,
    #[serde(default = "default_max_bookmarks")]
    pub max_bookmarks: usize,
    #[serde(default = "default_backup_enabled")]
    pub backup_enabled: bool,
    #[serde(default = "default_websocket_port")]
    pub websocket_port: u16,
    #[serde(default)]
    pub client_id: Option<String>,
    #[serde(default = "default_theme")]
    pub theme: String,
}

fn default_enabled() -> bool { true }
fn default_auto_sync() -> bool { true }
fn default_sync_interval() -> u64 { 300 }
fn default_max_bookmarks() -> usize { 10000 }
fn default_backup_enabled() -> bool { true }
fn default_websocket_port() -> u16 { 9876 }
fn default_theme() -> String { "dark".to_string() }

impl Default for Config {
    fn default() -> Self {
        Self {
            enabled: default_enabled(),
            auto_sync: default_auto_sync(),
            sync_interval: default_sync_interval(),
            max_bookmarks: default_max_bookmarks(),
            backup_enabled: default_backup_enabled(),
            websocket_port: default_websocket_port(),
            client_id: Some(Uuid::new_v4().to_string()),
            theme: default_theme(),
        }
    }
}

pub struct ConfigManager;

impl ConfigManager {
    pub fn get_sync_dir() -> PathBuf {
        if let Some(user_dirs) = UserDirs::new() {
            if let Some(docs_dir) = user_dirs.document_dir() {
                return docs_dir.join(APP_NAME);
            }
        }
        if let Some(user_dirs) = UserDirs::new() {
            return user_dirs.home_dir().join(APP_NAME);
        }
        PathBuf::from(APP_NAME)
    }

    pub fn get_config_path() -> PathBuf {
        Self::get_sync_dir().join("config.json")
    }

    pub fn get_bookmarks_path() -> PathBuf {
        Self::get_sync_dir().join("syncmark_bookmarks.json")
    }

    pub fn get_log_path() -> PathBuf {
        Self::get_sync_dir().join("syncmark_desktop.log")
    }

    pub fn ensure_sync_dir() {
        let path = Self::get_sync_dir();
        if !path.exists() {
            if let Err(e) = fs::create_dir_all(&path) {
                error!("Failed to create sync directory: {}", e);
            }
        }
    }

    pub fn load_config() -> Config {
        Self::ensure_sync_dir();
        let path = Self::get_config_path();

        if !path.exists() {
            let config = Config::default();
            Self::save_config(&config);
            return config;
        }

        match fs::read_to_string(&path) {
            Ok(content) => {
                match serde_json::from_str::<Config>(&content) {
                    Ok(mut config) => {
                        // Ensure client_id exists
                        if config.client_id.is_none() {
                            config.client_id = Some(Uuid::new_v4().to_string());
                            Self::save_config(&config);
                        }
                        config
                    },
                    Err(e) => {
                        error!("Failed to parse config: {}", e);
                        Config::default()
                    }
                }
            },
            Err(e) => {
                error!("Failed to read config file: {}", e);
                Config::default()
            }
        }
    }

    pub fn save_config(config: &Config) -> bool {
        Self::ensure_sync_dir();
        let path = Self::get_config_path();

        match serde_json::to_string_pretty(config) {
            Ok(content) => {
                if let Err(e) = fs::write(path, content) {
                    error!("Failed to write config file: {}", e);
                    false
                } else {
                    info!("Config saved");
                    true
                }
            },
            Err(e) => {
                error!("Failed to serialize config: {}", e);
                false
            }
        }
    }
}
