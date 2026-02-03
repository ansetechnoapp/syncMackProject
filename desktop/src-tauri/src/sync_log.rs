use std::fs;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use log::{error, info};
use uuid::Uuid;

use crate::config::ConfigManager;

const MAX_LOG_ENTRIES: usize = 1000;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncLogEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub operation_type: String,
    pub source: String,
    #[serde(default)]
    pub workspace_id: Option<String>,
    pub items_count: usize,
    pub success: bool,
    #[serde(default)]
    pub error_message: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct SyncLog {
    pub entries: Vec<SyncLogEntry>,
}

impl SyncLog {
    fn get_path() -> std::path::PathBuf {
        ConfigManager::get_sync_dir().join("sync_log.json")
    }

    pub fn load() -> Self {
        let path = Self::get_path();
        if !path.exists() {
            return Self::default();
        }
        match fs::read_to_string(&path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(e) => {
                error!("Erreur lecture sync_log: {}", e);
                Self::default()
            }
        }
    }

    pub fn save(&self) -> Result<(), String> {
        ConfigManager::ensure_sync_dir();
        let path = Self::get_path();
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Erreur serialisation sync_log: {}", e))?;
        fs::write(&path, content)
            .map_err(|e| format!("Erreur ecriture sync_log: {}", e))?;
        Ok(())
    }

    pub fn add_entry(
        &mut self,
        operation_type: &str,
        source: &str,
        workspace_id: Option<&str>,
        items_count: usize,
        success: bool,
        error_message: Option<String>,
    ) {
        let entry = SyncLogEntry {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            operation_type: operation_type.to_string(),
            source: source.to_string(),
            workspace_id: workspace_id.map(|s| s.to_string()),
            items_count,
            success,
            error_message,
        };
        self.entries.push(entry);
        // FIFO: garder max MAX_LOG_ENTRIES
        if self.entries.len() > MAX_LOG_ENTRIES {
            let excess = self.entries.len() - MAX_LOG_ENTRIES;
            self.entries.drain(0..excess);
        }
        if let Err(e) = self.save() {
            error!("Erreur sauvegarde sync_log: {}", e);
        }
    }

    pub fn clear(&mut self) {
        self.entries.clear();
        if let Err(e) = self.save() {
            error!("Erreur sauvegarde sync_log: {}", e);
        }
        info!("Historique de sync effacé");
    }

    pub fn get_entries(&self, limit: Option<usize>) -> Vec<SyncLogEntry> {
        let limit = limit.unwrap_or(self.entries.len());
        self.entries.iter().rev().take(limit).cloned().collect()
    }
}
