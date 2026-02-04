use std::fs;
use std::collections::HashMap;
use std::sync::OnceLock;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use log::{error, info, warn};
use uuid::Uuid;
use serde_json::Value;

use crate::bookmarks::{Bookmark, Folder, BookmarksManager};
use crate::config::ConfigManager;

static INDEX_LOCK: OnceLock<parking_lot::Mutex<()>> = OnceLock::new();

pub(crate) fn index_lock() -> &'static parking_lot::Mutex<()> {
    INDEX_LOCK.get_or_init(|| parking_lot::Mutex::new(()))
}

const MAX_BOOKMARKS_PER_WORKSPACE: usize = 5000;

/// Représente un workspace de favoris
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub bookmarks: Vec<Bookmark>,
    pub folders: Vec<Folder>,
    #[serde(default)]
    pub version: u64,
    #[serde(default)]
    pub conflicts: Vec<WorkspaceConflict>,
    #[serde(default, skip_serializing)]
    pub version_log: Vec<WorkspaceVersionEntry>,
}

impl Default for Workspace {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: "Nouveau workspace".to_string(),
            color: Some("#3498db".to_string()),
            icon: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            bookmarks: vec![],
            folders: vec![],
            version: 1,
            conflicts: vec![],
            version_log: vec![],
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceConflict {
    pub id: String,
    pub workspace_id: String,
    pub item_type: String,
    pub sync_id: String,
    pub detected_at: DateTime<Utc>,
    pub status: String,
    pub desktop_snapshot: Value,
    pub incoming_snapshot: Value,
    #[serde(default)]
    pub resolved_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub resolved_by: Option<String>,
    #[serde(default)]
    pub resolution: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceVersionEntry {
    pub id: String,
    pub workspace_id: String,
    pub item_type: String,
    pub sync_id: String,
    pub lamport: u64,
    pub source: String,
    pub created_at: DateTime<Utc>,
    pub snapshot: Value,
}

/// Métadonnées légères d'un workspace pour l'index
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSummary {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    pub total_bookmarks: usize,
    pub total_folders: usize,
    #[serde(default)]
    pub open_conflicts: usize,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub version: u64,
}

impl From<&Workspace> for WorkspaceSummary {
    fn from(ws: &Workspace) -> Self {
        let open_conflicts = ws.conflicts.iter().filter(|c| c.status == "open").count();
        Self {
            id: ws.id.clone(),
            name: ws.name.clone(),
            color: ws.color.clone(),
            icon: ws.icon.clone(),
            total_bookmarks: ws.bookmarks.len(),
            total_folders: ws.folders.len(),
            open_conflicts,
            created_at: ws.created_at,
            updated_at: ws.updated_at,
            version: ws.version,
        }
    }
}

/// Mode d'assignation d'un navigateur à un workspace
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum AssignmentMode {
    ReadWrite,
    ReadOnly,
}

impl Default for AssignmentMode {
    fn default() -> Self {
        AssignmentMode::ReadWrite
    }
}

/// Association entre un navigateur et un workspace
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceAssignment {
    pub browser_id: String,
    pub browser_name: String,
    #[serde(default)]
    pub workspace_id: Option<String>,
    pub assigned_at: DateTime<Utc>,
    #[serde(default)]
    pub mode: AssignmentMode,
}

/// Workspace supprimé (corbeille)
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeletedWorkspace {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub total_bookmarks: usize,
    pub total_folders: usize,
    pub deleted_at: DateTime<Utc>,
    /// Chemin vers le fichier de sauvegarde du workspace
    pub backup_path: String,
}

/// Index central des workspaces
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacesIndex {
    #[serde(default = "default_version")]
    pub version: String,
    pub workspaces: Vec<WorkspaceSummary>,
    pub assignments: Vec<WorkspaceAssignment>,
    #[serde(default)]
    pub default_workspace_id: Option<String>,
    #[serde(default)]
    pub deleted_workspaces: Vec<DeletedWorkspace>,
    pub last_updated: DateTime<Utc>,
}

fn default_version() -> String {
    "1.0".to_string()
}

impl Default for WorkspacesIndex {
    fn default() -> Self {
        Self {
            version: default_version(),
            workspaces: vec![],
            assignments: vec![],
            default_workspace_id: None,
            deleted_workspaces: vec![],
            last_updated: Utc::now(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BatchMoveOperation {
    pub source_workspace_id: String,
    pub target_workspace_id: String,
    pub operations: Vec<MoveOperation>,
    pub preserve_hierarchy: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MoveOperation {
    pub item_id: String,
    pub item_type: ItemType,
    pub source_parent_id: Option<String>,
    pub target_parent_id: Option<String>,
    pub target_position: Option<usize>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ItemType {
    Bookmark,
    Folder,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BatchMoveResult {
    pub success: bool,
    pub moved_count: usize,
    pub errors: Vec<String>,
}

pub struct WorkspaceManager;

impl WorkspaceManager {
    // ==================== Batch Operations ====================

    pub fn batch_move_items(operation: BatchMoveOperation) -> Result<BatchMoveResult, String> {
        let mut source_workspace = Self::load_workspace(&operation.source_workspace_id)?;
        let mut target_workspace = Self::load_workspace(&operation.target_workspace_id)?;
        
        // Validate all operations first
        Self::validate_batch_operations(&operation, &source_workspace, &target_workspace)?;
        
        // Create transaction backup
        let backup = Self::create_transaction_backup(&source_workspace, &target_workspace)?;
        
        // Execute operations atomically
        match Self::execute_batch_operations(&operation, &mut source_workspace, &mut target_workspace) {
            Ok(result) => {
                // Save both workspaces
                Self::save_workspace(&source_workspace)?;
                Self::save_workspace(&target_workspace)?;

                Self::with_index(|index| {
                    Self::update_index_summary(index, &source_workspace);
                    Self::update_index_summary(index, &target_workspace);
                    Ok(())
                })?;

                Ok(result)
            }
            Err(e) => {
                // Rollback on failure
                Self::restore_from_backup(backup)?;
                Err(format!("Batch move failed: {}", e))
            }
        }
    }

    fn validate_batch_operations(
        operation: &BatchMoveOperation,
        source_workspace: &Workspace,
        _target_workspace: &Workspace
    ) -> Result<(), String> {
        for op in &operation.operations {
             match op.item_type {
                ItemType::Bookmark => {
                    if !source_workspace.bookmarks.iter().any(|b| b.id == op.item_id) {
                         return Err(format!("Bookmark not found in source: {}", op.item_id));
                    }
                },
                ItemType::Folder => {
                    if !source_workspace.folders.iter().any(|f| f.id == op.item_id) {
                         return Err(format!("Folder not found in source: {}", op.item_id));
                    }
                }
             }
        }
        Ok(())
    }

    fn create_transaction_backup(source: &Workspace, target: &Workspace) -> Result<(Workspace, Workspace), String> {
        Ok((source.clone(), target.clone()))
    }

    fn restore_from_backup(backup: (Workspace, Workspace)) -> Result<(), String> {
        let (source, target) = backup;
        Self::save_workspace(&source)?;
        Self::save_workspace(&target)?;
        Ok(())
    }

    fn execute_batch_operations(
        operation: &BatchMoveOperation,
        source: &mut Workspace,
        target: &mut Workspace
    ) -> Result<BatchMoveResult, String> {
        let mut moved_count = 0;
        let mut errors = Vec::new();

        // 1. Collect items to move
        let mut bookmarks_to_move: Vec<Bookmark> = Vec::new();
        let mut folders_to_move: Vec<Folder> = Vec::new();
        let mut bookmark_ids_to_remove: Vec<String> = Vec::new();
        let mut folder_ids_to_remove: Vec<String> = Vec::new();

        for op in &operation.operations {
            match op.item_type {
                ItemType::Bookmark => {
                    if let Some(b) = source.bookmarks.iter().find(|b| b.id == op.item_id) {
                        let mut new_b = b.clone();
                        new_b.parent_id = op.target_parent_id.clone().unwrap_or("1".to_string());
                        new_b.updated_at_lamport = b.updated_at_lamport.saturating_add(1);
                        new_b.updated_by = "desktop".to_string();
                        bookmarks_to_move.push(new_b);
                        bookmark_ids_to_remove.push(op.item_id.clone());
                    } else {
                        errors.push(format!("Bookmark not found: {}", op.item_id));
                    }
                },
                ItemType::Folder => {
                    if let Some(f) = source.folders.iter().find(|f| f.id == op.item_id) {
                        // Move the folder itself
                        let mut new_f = f.clone();
                        new_f.parent_id = Some(op.target_parent_id.clone().unwrap_or("1".to_string()));
                        new_f.updated_at_lamport = f.updated_at_lamport.saturating_add(1);
                        new_f.updated_by = "desktop".to_string();
                        folders_to_move.push(new_f);
                        folder_ids_to_remove.push(op.item_id.clone());

                        // Recursively find descendants if hierarchy preservation is requested
                        if operation.preserve_hierarchy {
                            let mut stack = vec![op.item_id.clone()];
                            while let Some(parent_id) = stack.pop() {
                                // Find children bookmarks
                                for b in &source.bookmarks {
                                    if b.parent_id == parent_id && !bookmark_ids_to_remove.contains(&b.id) {
                                        let mut new_b = b.clone();
                                        new_b.updated_at_lamport = b.updated_at_lamport.saturating_add(1);
                                        new_b.updated_by = "desktop".to_string();
                                        bookmarks_to_move.push(new_b);
                                        bookmark_ids_to_remove.push(b.id.clone());
                                    }
                                }
                                // Find children folders
                                for sub_f in &source.folders {
                                    if sub_f.parent_id.as_deref() == Some(&parent_id) && !folder_ids_to_remove.contains(&sub_f.id) {
                                        let mut new_sub_f = sub_f.clone();
                                        new_sub_f.updated_at_lamport = sub_f.updated_at_lamport.saturating_add(1);
                                        new_sub_f.updated_by = "desktop".to_string();
                                        folders_to_move.push(new_sub_f);
                                        folder_ids_to_remove.push(sub_f.id.clone());
                                        stack.push(sub_f.id.clone());
                                    }
                                }
                            }
                        }
                    } else {
                        errors.push(format!("Folder not found: {}", op.item_id));
                    }
                }
            }
        }

        // 2. Add to target
        for b in bookmarks_to_move {
            if let Some(pos) = target.bookmarks.iter().position(|x| x.id == b.id) {
                target.bookmarks[pos] = b;
            } else {
                target.bookmarks.push(b);
            }
        }
        for f in folders_to_move {
            if let Some(pos) = target.folders.iter().position(|x| x.id == f.id) {
                target.folders[pos] = f;
            } else {
                target.folders.push(f);
            }
        }

        // 3. Remove from source
        source.bookmarks.retain(|b| !bookmark_ids_to_remove.contains(&b.id));
        source.folders.retain(|f| !folder_ids_to_remove.contains(&f.id));

        moved_count = bookmark_ids_to_remove.len() + folder_ids_to_remove.len();

        source.version += 1;
        source.updated_at = Utc::now();
        target.version += 1;
        target.updated_at = Utc::now();

        Ok(BatchMoveResult {
            success: errors.is_empty(),
            moved_count,
            errors
        })
    }

    // ==================== Chemins ====================

    /// Retourne le chemin du dossier des workspaces
    pub fn get_workspaces_dir() -> std::path::PathBuf {
        ConfigManager::get_sync_dir().join("workspaces")
    }

    pub fn get_exports_dir() -> std::path::PathBuf {
        ConfigManager::get_sync_dir().join("exports")
    }

    pub fn get_backups_dir() -> std::path::PathBuf {
        ConfigManager::get_sync_dir().join("backups")
    }

    /// Retourne le chemin du fichier d'index
    pub fn get_index_path() -> std::path::PathBuf {
        ConfigManager::get_sync_dir().join("workspaces_index.json")
    }

    fn validate_workspace_id(id: &str) -> Result<(), String> {
        if Uuid::parse_str(id).is_ok() {
            return Ok(());
        }
        if !id.is_empty() && id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
            return Ok(());
        }
        Err(format!("Invalid workspace ID: {}", id))
    }

    /// Retourne le chemin d'un workspace spécifique
    pub fn get_workspace_path(id: &str) -> Result<std::path::PathBuf, String> {
        Self::validate_workspace_id(id)?;
        Ok(Self::get_workspaces_dir().join(format!("{}.json", id)))
    }

    /// Retourne le chemin du fichier de version log d'un workspace
    pub fn get_version_log_path(id: &str) -> Result<std::path::PathBuf, String> {
        Self::validate_workspace_id(id)?;
        Ok(Self::get_workspaces_dir().join(format!("{}_log.json", id)))
    }

    /// Charge le version log d'un workspace depuis son fichier séparé
    pub fn load_version_log(id: &str) -> Vec<WorkspaceVersionEntry> {
        match Self::get_version_log_path(id) {
            Ok(path) => {
                if !path.exists() {
                    return vec![];
                }
                match fs::read_to_string(&path) {
                    Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
                    Err(e) => {
                        warn!("Échec lecture version_log {}: {}", id, e);
                        vec![]
                    }
                }
            }
            Err(_) => vec![],
        }
    }

    /// Sauvegarde le version log complet d'un workspace
    fn save_version_log(id: &str, log: &[WorkspaceVersionEntry]) -> Result<(), String> {
        Self::ensure_workspaces_dir();
        let path = Self::get_version_log_path(id)?;
        let content = serde_json::to_string_pretty(log)
            .map_err(|e| format!("Échec sérialisation version_log: {}", e))?;
        fs::write(&path, content)
            .map_err(|e| format!("Échec écriture version_log: {}", e))?;
        Ok(())
    }

    /// Ajoute une entrée au version log (avec troncature à 2000 entrées)
    fn append_version_log_entry(workspace_id: &str, entry: WorkspaceVersionEntry) -> Result<(), String> {
        let mut log = Self::load_version_log(workspace_id);
        log.push(entry);
        if log.len() > 2000 {
            let excess = log.len() - 2000;
            log.drain(0..excess);
        }
        Self::save_version_log(workspace_id, &log)
    }

    /// S'assure que le dossier des workspaces existe
    pub fn ensure_workspaces_dir() {
        let path = Self::get_workspaces_dir();
        if !path.exists() {
            if let Err(e) = fs::create_dir_all(&path) {
                error!("Échec création dossier workspaces: {}", e);
            }
        }
    }

    fn ensure_dir(path: &std::path::Path) {
        if !path.exists() {
            if let Err(e) = fs::create_dir_all(path) {
                error!("Échec création dossier: {}", e);
            }
        }
    }

    // ==================== Index ====================

    /// Exécute une opération atomique sur l'index (load → modify → save) sous lock global
    fn with_index<F, R>(f: F) -> Result<R, String>
    where F: FnOnce(&mut WorkspacesIndex) -> Result<R, String> {
        let _guard = index_lock().lock();
        let mut index = Self::load_index();
        let result = f(&mut index)?;
        Self::save_index(&index)?;
        Ok(result)
    }

    /// Lecture seule de l'index sous lock global (snapshot cohérent)
    fn read_index<F, R>(f: F) -> R
    where F: FnOnce(&WorkspacesIndex) -> R {
        let _guard = index_lock().lock();
        let index = Self::load_index();
        f(&index)
    }

    /// Charge l'index des workspaces
    pub fn load_index() -> WorkspacesIndex {
        let path = Self::get_index_path();

        if !path.exists() {
            return WorkspacesIndex::default();
        }

        match fs::read_to_string(&path) {
            Ok(content) => {
                match serde_json::from_str::<WorkspacesIndex>(&content) {
                    Ok(index) => index,
                    Err(e) => {
                        error!("Échec parsing index workspaces: {}", e);
                        WorkspacesIndex::default()
                    }
                }
            }
            Err(e) => {
                error!("Échec lecture index workspaces: {}", e);
                WorkspacesIndex::default()
            }
        }
    }

    /// Sauvegarde l'index des workspaces
    pub fn save_index(index: &WorkspacesIndex) -> Result<(), String> {
        ConfigManager::ensure_sync_dir();
        let path = Self::get_index_path();

        let mut index_to_save = index.clone();
        index_to_save.last_updated = Utc::now();

        match serde_json::to_string_pretty(&index_to_save) {
            Ok(content) => {
                fs::write(&path, content)
                    .map_err(|e| format!("Échec écriture index: {}", e))?;
                info!("Index workspaces sauvegardé");
                Ok(())
            }
            Err(e) => Err(format!("Échec sérialisation index: {}", e))
        }
    }

    /// Met à jour le résumé d'un workspace dans l'index
    pub fn update_index_summary(index: &mut WorkspacesIndex, workspace: &Workspace) {
        let summary = WorkspaceSummary::from(workspace);

        if let Some(pos) = index.workspaces.iter().position(|w| w.id == workspace.id) {
            index.workspaces[pos] = summary;
        } else {
            index.workspaces.push(summary);
        }
    }

    // ==================== CRUD Workspaces ====================

    /// Crée un nouveau workspace
    pub fn create_workspace(name: String, color: Option<String>) -> Result<Workspace, String> {
        Self::ensure_workspaces_dir();

        let workspace = Workspace {
            id: Uuid::new_v4().to_string(),
            name,
            color: color.or(Some("#3498db".to_string())),
            icon: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            bookmarks: vec![],
            folders: vec![],
            version: 1,
            conflicts: vec![],
            version_log: vec![],
        };

        Self::save_workspace(&workspace)?;

        Self::with_index(|index| {
            Self::update_index_summary(index, &workspace);
            Ok(())
        })?;

        info!("Workspace créé: {} ({})", workspace.name, workspace.id);
        Ok(workspace)
    }

    /// Charge un workspace par son ID
    pub fn load_workspace(id: &str) -> Result<Workspace, String> {
        let path = Self::get_workspace_path(id)?;

        if !path.exists() {
            return Err(format!("Workspace non trouvé: {}", id));
        }

        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Échec lecture workspace: {}", e))?;

        let mut workspace: Workspace = serde_json::from_str(&content)
            .map_err(|e| format!("Échec parsing workspace: {}", e))?;

        // Migration : si version_log non vide (ancien format), sauver dans fichier séparé
        if !workspace.version_log.is_empty() {
            info!("Migration version_log pour workspace {}: {} entrées", id, workspace.version_log.len());
            let mut existing_log = Self::load_version_log(id);
            existing_log.extend(workspace.version_log.drain(..));
            if existing_log.len() > 2000 {
                let excess = existing_log.len() - 2000;
                existing_log.drain(0..excess);
            }
            let _ = Self::save_version_log(id, &existing_log);
            // Re-sauver le workspace sans le version_log (skip_serializing)
            let _ = Self::save_workspace(&workspace);
        }

        Ok(workspace)
    }

    /// Sauvegarde un workspace
    pub fn save_workspace(workspace: &Workspace) -> Result<(), String> {
        Self::ensure_workspaces_dir();
        let path = Self::get_workspace_path(&workspace.id)?;
        let temp_path = path.with_extension("tmp");
        let bak_path = path.with_extension("bak");

        let mut ws = workspace.clone();
        ws.updated_at = Utc::now();

        let content = serde_json::to_string_pretty(&ws)
            .map_err(|e| format!("Échec sérialisation workspace: {}", e))?;

        // Écriture atomique
        fs::write(&temp_path, &content)
            .map_err(|e| format!("Échec écriture temp: {}", e))?;

        if path.exists() {
            if let Err(e) = fs::rename(&path, &bak_path) {
                warn!("Échec backup workspace: {}", e);
                let _ = fs::remove_file(&path);
            }
        }

        fs::rename(&temp_path, &path)
            .map_err(|e| format!("Échec commit workspace: {}", e))?;

        info!("Workspace sauvegardé: {}", workspace.id);
        Ok(())
    }

    /// Met à jour un workspace
    pub fn update_workspace(id: &str, name: Option<String>, color: Option<String>, icon: Option<String>) -> Result<Workspace, String> {
        let mut workspace = Self::load_workspace(id)?;

        if let Some(n) = name {
            workspace.name = n;
        }
        if let Some(c) = color {
            workspace.color = Some(c);
        }
        if let Some(i) = icon {
            workspace.icon = Some(i);
        }
        workspace.updated_at = Utc::now();

        Self::save_workspace(&workspace)?;

        Self::with_index(|index| {
            Self::update_index_summary(index, &workspace);
            Ok(())
        })?;

        Ok(workspace)
    }

    /// Supprime un workspace (déplace vers la corbeille)
    pub fn delete_workspace(id: &str) -> Result<(), String> {
        let workspace = Self::load_workspace(id)?;
        let path = Self::get_workspace_path(id)?;

        // Créer le dossier de la corbeille
        let trash_dir = Self::get_trash_dir();
        Self::ensure_dir(&trash_dir);

        // Déplacer le fichier workspace vers la corbeille
        let trash_path = trash_dir.join(format!("{}.json", id));
        if path.exists() {
            // Sur Windows, rename échoue si la destination existe. On supprime d'abord.
            if trash_path.exists() {
                let _ = fs::remove_file(&trash_path);
            }
            fs::rename(&path, &trash_path)
                .map_err(|e| format!("Échec déplacement vers corbeille: {}", e))?;
        }

        // Supprimer le backup s'il existe
        let bak_path = path.with_extension("bak");
        let _ = fs::remove_file(&bak_path);

        // Déplacer le fichier de version log vers la corbeille
        if let Ok(log_path) = Self::get_version_log_path(id) {
            if log_path.exists() {
                let trash_log_path = trash_dir.join(format!("{}_log.json", id));
                if trash_log_path.exists() {
                    let _ = fs::remove_file(&trash_log_path);
                }
                let _ = fs::rename(&log_path, &trash_log_path);
            }
        }

        // Créer l'entrée DeletedWorkspace
        let deleted_entry = DeletedWorkspace {
            id: workspace.id.clone(),
            name: workspace.name.clone(),
            color: workspace.color.clone(),
            icon: workspace.icon.clone(),
            total_bookmarks: workspace.bookmarks.iter().filter(|b| !b.deleted).count(),
            total_folders: workspace.folders.iter().filter(|f| !f.deleted).count(),
            deleted_at: Utc::now(),
            backup_path: trash_path.to_string_lossy().to_string(),
        };

        let id_owned = id.to_string();
        Self::with_index(|index| {
            // Retirer de la liste des workspaces actifs
            index.workspaces.retain(|w| w.id != id_owned);
            index.assignments.retain(|a| a.workspace_id.as_deref() != Some(id_owned.as_str()));
            if index.default_workspace_id.as_deref() == Some(id_owned.as_str()) {
                index.default_workspace_id = None;
            }
            // Ajouter à la corbeille
            index.deleted_workspaces.push(deleted_entry);
            Ok(())
        })?;

        info!("Workspace déplacé vers la corbeille: {}", id);
        Ok(())
    }

    /// Retourne le dossier de la corbeille
    pub fn get_trash_dir() -> std::path::PathBuf {
        ConfigManager::get_sync_dir().join("trash")
    }

    /// Liste les workspaces supprimés (corbeille)
    pub fn get_deleted_workspaces() -> Vec<DeletedWorkspace> {
        Self::read_index(|index| index.deleted_workspaces.clone())
    }

    /// Restaure un workspace depuis la corbeille
    pub fn restore_workspace(id: &str) -> Result<Workspace, String> {
        let trash_dir = Self::get_trash_dir();
        let trash_path = trash_dir.join(format!("{}.json", id));

        if !trash_path.exists() {
            return Err(format!("Workspace non trouvé dans la corbeille: {}", id));
        }

        // Charger le workspace depuis la corbeille
        let content = fs::read_to_string(&trash_path)
            .map_err(|e| format!("Échec lecture workspace: {}", e))?;
        let mut workspace: Workspace = serde_json::from_str(&content)
            .map_err(|e| format!("Échec parsing workspace: {}", e))?;

        // Mettre à jour la date
        workspace.updated_at = Utc::now();

        // Sauvegarder dans le dossier des workspaces actifs
        Self::save_workspace(&workspace)?;

        // Supprimer de la corbeille
        let _ = fs::remove_file(&trash_path);

        // Restaurer aussi le version log s'il existe
        let trash_log_path = trash_dir.join(format!("{}_log.json", id));
        if trash_log_path.exists() {
            if let Ok(target_log_path) = Self::get_version_log_path(id) {
                let _ = fs::rename(&trash_log_path, &target_log_path);
            }
        }

        let id_owned = id.to_string();
        Self::with_index(|index| {
            // Retirer de la corbeille
            index.deleted_workspaces.retain(|w| w.id != id_owned);
            // Ajouter à la liste des workspaces actifs
            Self::update_index_summary(index, &workspace);
            Ok(())
        })?;

        info!("Workspace restauré depuis la corbeille: {}", id);
        Ok(workspace)
    }

    /// Supprime définitivement un workspace de la corbeille
    pub fn permanently_delete_workspace(id: &str) -> Result<(), String> {
        let trash_dir = Self::get_trash_dir();
        let trash_path = trash_dir.join(format!("{}.json", id));
        let trash_log_path = trash_dir.join(format!("{}_log.json", id));

        // Supprimer les fichiers de la corbeille
        if trash_path.exists() {
            fs::remove_file(&trash_path)
                .map_err(|e| format!("Échec suppression définitive: {}", e))?;
        }
        let _ = fs::remove_file(&trash_log_path);

        let id_owned = id.to_string();
        Self::with_index(|index| {
            index.deleted_workspaces.retain(|w| w.id != id_owned);
            Ok(())
        })?;

        info!("Workspace supprimé définitivement: {}", id);
        Ok(())
    }

    /// Vide complètement la corbeille
    pub fn empty_trash() -> Result<usize, String> {
        let deleted = Self::get_deleted_workspaces();
        let count = deleted.len();

        for ws in deleted {
            let _ = Self::permanently_delete_workspace(&ws.id);
        }

        info!("Corbeille vidée: {} workspace(s) supprimé(s)", count);
        Ok(count)
    }

    /// Duplique un workspace
    pub fn duplicate_workspace(id: &str, new_name: String) -> Result<Workspace, String> {
        let original = Self::load_workspace(id)?;

        let new_workspace = Workspace {
            id: Uuid::new_v4().to_string(),
            name: new_name,
            color: original.color.clone(),
            icon: original.icon.clone(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            bookmarks: original.bookmarks.clone(),
            folders: original.folders.clone(),
            version: 1,
            conflicts: vec![],
            version_log: vec![],
        };

        Self::save_workspace(&new_workspace)?;

        Self::with_index(|index| {
            Self::update_index_summary(index, &new_workspace);
            Ok(())
        })?;

        info!("Workspace dupliqué: {} -> {}", id, new_workspace.id);
        Ok(new_workspace)
    }

    /// Liste tous les workspaces (résumés)
    pub fn list_workspaces() -> Vec<WorkspaceSummary> {
        Self::read_index(|index| index.workspaces.clone())
    }

    // ==================== Assignments ====================

    /// Assigne un workspace à un navigateur
    pub fn assign_workspace(browser_id: &str, browser_name: &str, workspace_id: &str) -> Result<(), String> {
        Self::assign_workspace_with_mode(browser_id, browser_name, workspace_id, "ReadWrite")
    }

    /// Assigne un workspace à un navigateur avec un mode (ReadWrite ou ReadOnly)
    pub fn assign_workspace_with_mode(browser_id: &str, browser_name: &str, workspace_id: &str, mode: &str) -> Result<(), String> {
        // Vérifier que le workspace existe
        let _ = Self::load_workspace(workspace_id)?;

        let assignment_mode = match mode {
            "ReadOnly" => AssignmentMode::ReadOnly,
            _ => AssignmentMode::ReadWrite,
        };

        let bid = browser_id.to_string();
        let bname = browser_name.to_string();
        let wsid = workspace_id.to_string();
        Self::with_index(|index| {
            if let Some(pos) = index.assignments.iter().position(|a| a.browser_id == bid) {
                index.assignments[pos].workspace_id = Some(wsid.clone());
                index.assignments[pos].assigned_at = Utc::now();
                index.assignments[pos].mode = assignment_mode.clone();
            } else {
                index.assignments.push(WorkspaceAssignment {
                    browser_id: bid.clone(),
                    browser_name: bname.clone(),
                    workspace_id: Some(wsid.clone()),
                    assigned_at: Utc::now(),
                    mode: assignment_mode.clone(),
                });
            }
            Ok(())
        })?;
        info!("Workspace {} assigné à {} (mode: {})", workspace_id, browser_name, mode);
        Ok(())
    }

    /// Retire l'assignment d'un navigateur
    pub fn unassign_workspace(browser_id: &str) -> Result<(), String> {
        let bid = browser_id.to_string();
        Self::with_index(|index| {
            if let Some(pos) = index.assignments.iter().position(|a| a.browser_id == bid) {
                index.assignments[pos].workspace_id = None;
                index.assignments[pos].assigned_at = Utc::now();
            }
            Ok(())
        })?;
        info!("Workspace désassigné pour navigateur {}", browser_id);
        Ok(())
    }

    /// Obtient le workspace assigné à un navigateur
    pub fn get_workspace_for_browser(browser_id: &str) -> Option<String> {
        let bid = browser_id.to_string();
        Self::read_index(|index| {
            index.assignments
                .iter()
                .find(|a| a.browser_id == bid)
                .and_then(|a| a.workspace_id.clone())
        })
    }

    /// Obtient tous les navigateurs assignés à un workspace
    pub fn get_browsers_for_workspace(workspace_id: &str) -> Vec<String> {
        let wsid = workspace_id.to_string();
        Self::read_index(|index| {
            index.assignments
                .iter()
                .filter(|a| a.workspace_id.as_deref() == Some(wsid.as_str()))
                .map(|a| a.browser_id.clone())
                .collect()
        })
    }

    /// Obtient toutes les assignments
    pub fn get_assignments() -> Vec<WorkspaceAssignment> {
        Self::read_index(|index| index.assignments.clone())
    }

    // ==================== Migration ====================

    /// Vérifie si une migration depuis l'ancien format est nécessaire
    pub fn needs_legacy_migration() -> bool {
        let legacy_path = ConfigManager::get_bookmarks_path();
        let index_path = Self::get_index_path();

        // Migration nécessaire si l'ancien fichier existe et pas l'index
        legacy_path.exists() && !index_path.exists()
    }

    /// Migre les favoris depuis l'ancien format vers un nouveau workspace
    pub fn migrate_legacy_bookmarks() -> Result<Workspace, String> {
        let legacy_path = ConfigManager::get_bookmarks_path();

        if !legacy_path.exists() {
            return Err("Aucun fichier legacy à migrer".to_string());
        }

        // Charger l'ancien fichier
        let legacy_data = BookmarksManager::load_bookmarks();

        // Créer un workspace "Principal" avec les données existantes
        let workspace = Workspace {
            id: Uuid::new_v4().to_string(),
            name: "Principal".to_string(),
            color: Some("#3498db".to_string()),
            icon: Some("⭐".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            bookmarks: legacy_data.bookmarks,
            folders: legacy_data.folders,
            version: 1,
            conflicts: vec![],
            version_log: vec![],
        };

        // Sauvegarder le nouveau workspace
        Self::save_workspace(&workspace)?;

        // Créer l'index avec ce workspace comme défaut
        Self::with_index(|index| {
            Self::update_index_summary(index, &workspace);
            index.default_workspace_id = Some(workspace.id.clone());
            Ok(())
        })?;

        // Renommer l'ancien fichier
        let backup_path = legacy_path.with_extension("legacy.bak");
        if let Err(e) = fs::rename(&legacy_path, &backup_path) {
            warn!("Échec backup fichier legacy: {}", e);
        } else {
            info!("Fichier legacy sauvegardé: {:?}", backup_path);
        }

        info!("Migration réussie: {} favoris, {} dossiers",
              workspace.bookmarks.len(), workspace.folders.len());

        Ok(workspace)
    }

    /// Crée un workspace à partir des favoris d'un navigateur (première connexion)
    pub fn create_workspace_from_browser(
        browser_name: &str,
        browser_id: &str,
        bookmarks: Vec<Bookmark>,
        folders: Vec<Folder>,
    ) -> Result<Workspace, String> {
        let workspace_name = format!("{} - Importé", browser_name);

        let workspace = Workspace {
            id: Uuid::new_v4().to_string(),
            name: workspace_name,
            color: Some(Self::get_browser_color(browser_name)),
            icon: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            bookmarks,
            folders,
            version: 1,
            conflicts: vec![],
            version_log: vec![],
        };

        Self::save_workspace(&workspace)?;

        Self::with_index(|index| {
            Self::update_index_summary(index, &workspace);
            Ok(())
        })?;

        // Assigner ce workspace au navigateur
        Self::assign_workspace(browser_id, browser_name, &workspace.id)?;

        info!("Workspace créé depuis {}: {}", browser_name, workspace.id);
        Ok(workspace)
    }

    /// Retourne une couleur par défaut selon le navigateur
    fn get_browser_color(browser_name: &str) -> String {
        match browser_name.to_lowercase().as_str() {
            "chrome" | "google chrome" => "#4285F4".to_string(),
            "firefox" | "mozilla firefox" => "#FF7139".to_string(),
            "edge" | "microsoft edge" => "#0078D4".to_string(),
            "brave" => "#FB542B".to_string(),
            "opera" => "#FF1B2D".to_string(),
            "safari" => "#007AFF".to_string(),
            "vivaldi" => "#EF3939".to_string(),
            _ => "#3498db".to_string(),
        }
    }

    // ==================== Opérations sur les favoris du workspace ====================

    /// Ajoute un favori à un workspace
    pub fn add_bookmark_to_workspace(workspace_id: &str, bookmark: Bookmark) -> Result<(), String> {
        let mut workspace = Self::load_workspace(workspace_id)?;

        if workspace.bookmarks.len() >= MAX_BOOKMARKS_PER_WORKSPACE {
            return Err(format!("Limite de favoris atteinte ({})", MAX_BOOKMARKS_PER_WORKSPACE));
        }

        // Vérifier si le favori existe déjà
        let exists = workspace.bookmarks.iter().any(|b| {
            b.id == bookmark.id || (b.url == bookmark.url && b.parent_id == bookmark.parent_id)
        });

        if !exists {
            workspace.bookmarks.push(bookmark);
            workspace.version += 1;
            Self::save_workspace(&workspace)?;

            Self::with_index(|index| {
                Self::update_index_summary(index, &workspace);
                Ok(())
            })?;
        }

        Ok(())
    }

    /// Supprime un favori d'un workspace
    pub fn remove_bookmark_from_workspace(workspace_id: &str, bookmark_id: &str) -> Result<(), String> {
        let mut workspace = Self::load_workspace(workspace_id)?;
        let initial_len = workspace.bookmarks.len();

        workspace.bookmarks.retain(|b| b.id != bookmark_id);

        if workspace.bookmarks.len() != initial_len {
            workspace.version += 1;
            Self::save_workspace(&workspace)?;

            Self::with_index(|index| {
                Self::update_index_summary(index, &workspace);
                Ok(())
            })?;
        }

        Ok(())
    }

    /// Met à jour un favori dans un workspace
    pub fn update_bookmark_in_workspace(
        workspace_id: &str,
        bookmark_id: &str,
        title: Option<String>,
        url: Option<String>,
        parent_id: Option<String>,
    ) -> Result<(), String> {
        let mut workspace = Self::load_workspace(workspace_id)?;

        if let Some(bookmark) = workspace.bookmarks.iter_mut().find(|b| b.id == bookmark_id) {
            if let Some(t) = title {
                bookmark.title = t;
            }
            if let Some(u) = url {
                bookmark.url = u;
            }
            if let Some(p) = parent_id {
                bookmark.parent_id = p;
            }
            bookmark.updated_at_lamport += 1;

            workspace.version += 1;
            Self::save_workspace(&workspace)?;

            Self::with_index(|index| {
                Self::update_index_summary(index, &workspace);
                Ok(())
            })?;
        }

        Ok(())
    }

    /// Synchronise les favoris d'un navigateur avec son workspace assigné
    pub fn sync_bookmarks_to_workspace(
        workspace_id: &str,
        bookmarks: Vec<Bookmark>,
        folders: Vec<Folder>,
    ) -> Result<Workspace, String> {
        if bookmarks.len() > MAX_BOOKMARKS_PER_WORKSPACE {
            return Err(format!("Trop de favoris à synchroniser (max {})", MAX_BOOKMARKS_PER_WORKSPACE));
        }

        let mut workspace = Self::load_workspace(workspace_id)?;

        // Merge non-destructif des bookmarks
        workspace.bookmarks = Self::merge_bookmarks(&workspace.bookmarks, &bookmarks);
        // Merge non-destructif des folders
        workspace.folders = Self::merge_folders(&workspace.folders, &folders);

        // Limite de taille
        if workspace.bookmarks.len() > MAX_BOOKMARKS_PER_WORKSPACE {
            workspace.bookmarks.truncate(MAX_BOOKMARKS_PER_WORKSPACE);
        }

        workspace.version += 1;
        workspace.updated_at = Utc::now();

        Self::save_workspace(&workspace)?;

        Self::with_index(|index| {
            Self::update_index_summary(index, &workspace);
            Ok(())
        })?;

        info!("Workspace {} synchronisé: {} favoris, {} dossiers",
              workspace_id, workspace.bookmarks.len(), workspace.folders.len());

        Ok(workspace)
    }

    /// Merge non-destructif de bookmarks : conserve les ajouts locaux, résout par Lamport
    fn merge_bookmarks(local: &[Bookmark], incoming: &[Bookmark]) -> Vec<Bookmark> {
        let mut incoming_by_sync: HashMap<String, &Bookmark> = HashMap::new();
        for b in incoming {
            if !b.sync_id.is_empty() {
                incoming_by_sync.insert(b.sync_id.clone(), b);
            }
        }

        let mut result: Vec<Bookmark> = Vec::new();
        let mut seen_sync_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

        // 1. Parcourir les bookmarks locaux
        for local_b in local {
            if local_b.sync_id.is_empty() {
                result.push(local_b.clone());
                continue;
            }

            if let Some(inc_b) = incoming_by_sync.remove(&local_b.sync_id) {
                // Présent dans les deux : garder celui avec le Lamport le plus haut
                if inc_b.deleted || local_b.deleted {
                    // Si supprimé dans l'un, marquer deleted
                    let mut merged = if local_b.updated_at_lamport >= inc_b.updated_at_lamport {
                        local_b.clone()
                    } else {
                        inc_b.clone()
                    };
                    merged.deleted = true;
                    result.push(merged);
                } else if inc_b.updated_at_lamport > local_b.updated_at_lamport {
                    result.push(inc_b.clone());
                } else {
                    result.push(local_b.clone());
                }
                seen_sync_ids.insert(local_b.sync_id.clone());
            } else {
                // Seulement en local → garder (ajouté depuis le desktop)
                result.push(local_b.clone());
                seen_sync_ids.insert(local_b.sync_id.clone());
            }
        }

        // 2. Ajouter les bookmarks incoming non vus (nouveaux depuis le navigateur)
        for inc_b in incoming {
            if inc_b.sync_id.is_empty() {
                result.push(inc_b.clone());
                continue;
            }
            if !seen_sync_ids.contains(&inc_b.sync_id) {
                // Déduplication par (url, parent_id) pour les bookmarks sans correspondance sync_id
                let dup = result.iter().position(|r| {
                    !r.sync_id.is_empty() && r.url == inc_b.url && r.parent_id == inc_b.parent_id && !r.deleted
                });
                if let Some(pos) = dup {
                    // Garder celui avec le Lamport le plus haut
                    if inc_b.updated_at_lamport > result[pos].updated_at_lamport {
                        result[pos] = inc_b.clone();
                    }
                } else {
                    result.push(inc_b.clone());
                }
            }
        }

        result
    }

    /// Merge non-destructif de folders : conserve les ajouts locaux, résout par Lamport
    fn merge_folders(local: &[Folder], incoming: &[Folder]) -> Vec<Folder> {
        let mut incoming_by_sync: HashMap<String, &Folder> = HashMap::new();
        for f in incoming {
            if !f.sync_id.is_empty() {
                incoming_by_sync.insert(f.sync_id.clone(), f);
            }
        }

        let mut result: Vec<Folder> = Vec::new();
        let mut seen_sync_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

        // 1. Parcourir les folders locaux
        for local_f in local {
            if local_f.sync_id.is_empty() {
                result.push(local_f.clone());
                continue;
            }

            if let Some(inc_f) = incoming_by_sync.remove(&local_f.sync_id) {
                if inc_f.deleted || local_f.deleted {
                    let mut merged = if local_f.updated_at_lamport >= inc_f.updated_at_lamport {
                        local_f.clone()
                    } else {
                        inc_f.clone()
                    };
                    merged.deleted = true;
                    result.push(merged);
                } else if inc_f.updated_at_lamport > local_f.updated_at_lamport {
                    result.push(inc_f.clone());
                } else {
                    result.push(local_f.clone());
                }
                seen_sync_ids.insert(local_f.sync_id.clone());
            } else {
                result.push(local_f.clone());
                seen_sync_ids.insert(local_f.sync_id.clone());
            }
        }

        // 2. Ajouter les folders incoming non vus
        for inc_f in incoming {
            if inc_f.sync_id.is_empty() {
                result.push(inc_f.clone());
                continue;
            }
            if !seen_sync_ids.contains(&inc_f.sync_id) {
                result.push(inc_f.clone());
            }
        }

        result
    }

    pub fn list_conflicts(workspace_id: &str) -> Result<Vec<WorkspaceConflict>, String> {
        let workspace = Self::load_workspace(workspace_id)?;
        Ok(workspace.conflicts)
    }

    pub fn resolve_conflict(
        workspace_id: &str,
        conflict_id: &str,
        resolution: &str,
        resolved_by: &str,
    ) -> Result<Workspace, String> {
        let mut workspace = Self::load_workspace(workspace_id)?;
        let pos = workspace.conflicts.iter().position(|c| c.id == conflict_id);
        let Some(idx) = pos else {
            return Err(format!("Conflict not found: {}", conflict_id));
        };

        let mut conflict = workspace.conflicts[idx].clone();
        if conflict.status != "open" {
            return Ok(workspace);
        }

        let chosen = match resolution {
            "keep_desktop" => conflict.desktop_snapshot.clone(),
            "keep_incoming" => conflict.incoming_snapshot.clone(),
            _ => return Err("Invalid resolution".to_string()),
        };

        match conflict.item_type.as_str() {
            "bookmark" => {
                if let Ok(mut b) = serde_json::from_value::<Bookmark>(chosen.clone()) {
                    if let Some(existing) = workspace.bookmarks.iter_mut().find(|x| x.sync_id == conflict.sync_id) {
                        let next = existing.updated_at_lamport.saturating_add(1);
                        b.updated_at_lamport = next;
                        b.updated_by = resolved_by.to_string();
                        *existing = b;
                    }
                }
            }
            "folder" => {
                if let Ok(mut f) = serde_json::from_value::<Folder>(chosen.clone()) {
                    if let Some(existing) = workspace.folders.iter_mut().find(|x| x.sync_id == conflict.sync_id) {
                        let next = existing.updated_at_lamport.saturating_add(1);
                        f.updated_at_lamport = next;
                        f.updated_by = resolved_by.to_string();
                        *existing = f;
                    }
                }
            }
            _ => {}
        }

        conflict.status = "resolved".to_string();
        conflict.resolved_at = Some(Utc::now());
        conflict.resolved_by = Some(resolved_by.to_string());
        conflict.resolution = Some(resolution.to_string());
        workspace.conflicts[idx] = conflict;
        workspace.version += 1;
        workspace.updated_at = Utc::now();

        Self::save_workspace(&workspace)?;

        Self::with_index(|index| {
            Self::update_index_summary(index, &workspace);
            Ok(())
        })?;

        Ok(workspace)
    }

    pub fn apply_workspace_item_change(
        workspace_id: &str,
        item_type: &str,
        payload: &Value,
        source: &str,
    ) -> Result<(Workspace, Option<WorkspaceConflict>), String> {
        let mut workspace = Self::load_workspace(workspace_id)?;
        let sync_id = payload.get("syncId").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if sync_id.is_empty() {
            return Err("Missing syncId".to_string());
        }
        let base_lamport = payload.get("baseUpdatedAtLamport").and_then(|v| v.as_u64());

        let mut conflict_created: Option<WorkspaceConflict> = None;

        match item_type {
            "bookmark_created" | "bookmark_changed" => {
                let incoming_value = payload.clone();
                let incoming_snapshot = incoming_value.clone();
                let existing_opt = workspace.bookmarks.iter().find(|b| b.sync_id == sync_id).cloned();
                if let Some(existing) = existing_opt {
                    if let Some(base) = base_lamport {
                        if base != existing.updated_at_lamport {
                            let same_title = payload.get("title").and_then(|v| v.as_str()).map(|s| s == existing.title).unwrap_or(true);
                            let same_url = payload.get("url").and_then(|v| v.as_str()).map(|s| s == existing.url).unwrap_or(true);
                            let same_parent = payload.get("parentId").and_then(|v| v.as_str()).map(|s| s == existing.parent_id).unwrap_or(true);
                            if !(same_title && same_url && same_parent) {
                                let conflict = WorkspaceConflict {
                                    id: Uuid::new_v4().to_string(),
                                    workspace_id: workspace.id.clone(),
                                    item_type: "bookmark".to_string(),
                                    sync_id: sync_id.clone(),
                                    detected_at: Utc::now(),
                                    status: "open".to_string(),
                                    desktop_snapshot: serde_json::to_value(existing.clone()).unwrap_or(Value::Null),
                                    incoming_snapshot: incoming_snapshot.clone(),
                                    resolved_at: None,
                                    resolved_by: None,
                                    resolution: None,
                                };
                                workspace.conflicts.push(conflict.clone());
                                conflict_created = Some(conflict);
                            }
                        }
                    }

                    let mut updated = existing.clone();
                    if let Some(title) = payload.get("title").and_then(|v| v.as_str()) {
                        updated.title = title.to_string();
                    }
                    if let Some(url) = payload.get("url").and_then(|v| v.as_str()) {
                        updated.url = url.to_string();
                    }
                    if let Some(parent_id) = payload.get("parentId").and_then(|v| v.as_str()) {
                        updated.parent_id = parent_id.to_string();
                    }
                    updated.updated_at_lamport = updated.updated_at_lamport.saturating_add(1);
                    updated.updated_by = source.to_string();

                    let entry = WorkspaceVersionEntry {
                        id: Uuid::new_v4().to_string(),
                        workspace_id: workspace.id.clone(),
                        item_type: "bookmark".to_string(),
                        sync_id: sync_id.clone(),
                        lamport: updated.updated_at_lamport,
                        source: source.to_string(),
                        created_at: Utc::now(),
                        snapshot: serde_json::to_value(updated.clone()).unwrap_or(Value::Null),
                    };
                    Self::append_version_log_entry(&workspace.id, entry)?;

                    if let Some(slot) = workspace.bookmarks.iter_mut().find(|b| b.sync_id == sync_id) {
                        *slot = updated;
                    }
                } else {
                    let mut created: Bookmark = serde_json::from_value(payload.clone())
                        .map_err(|e| format!("Invalid bookmark payload: {}", e))?;
                    if created.id.is_empty() {
                        created.id = Uuid::new_v4().to_string();
                    }
                    created.sync_id = sync_id.clone();
                    created.updated_at_lamport = 1;
                    created.updated_by = source.to_string();
                    workspace.bookmarks.push(created.clone());

                    let entry = WorkspaceVersionEntry {
                        id: Uuid::new_v4().to_string(),
                        workspace_id: workspace.id.clone(),
                        item_type: "bookmark".to_string(),
                        sync_id: sync_id.clone(),
                        lamport: created.updated_at_lamport,
                        source: source.to_string(),
                        created_at: Utc::now(),
                        snapshot: serde_json::to_value(created).unwrap_or(Value::Null),
                    };
                    Self::append_version_log_entry(&workspace.id, entry)?;
                }
            }
            "bookmark_removed" => {
                if let Some(existing) = workspace.bookmarks.iter_mut().find(|b| b.sync_id == sync_id) {
                    existing.deleted = true;
                    existing.updated_at_lamport = existing.updated_at_lamport.saturating_add(1);
                    existing.updated_by = source.to_string();
                    let entry = WorkspaceVersionEntry {
                        id: Uuid::new_v4().to_string(),
                        workspace_id: workspace.id.clone(),
                        item_type: "bookmark".to_string(),
                        sync_id: sync_id.clone(),
                        lamport: existing.updated_at_lamport,
                        source: source.to_string(),
                        created_at: Utc::now(),
                        snapshot: serde_json::to_value(existing.clone()).unwrap_or(Value::Null),
                    };
                    Self::append_version_log_entry(&workspace.id, entry)?;
                }
            }
            "folder_created" | "folder_changed" => {
                let incoming_snapshot = payload.clone();
                let existing_opt = workspace.folders.iter().find(|f| f.sync_id == sync_id).cloned();
                if let Some(existing) = existing_opt {
                    if let Some(base) = base_lamport {
                        if base != existing.updated_at_lamport {
                            let same_title = payload.get("title").and_then(|v| v.as_str()).map(|s| s == existing.title).unwrap_or(true);
                            let same_parent = payload.get("parentId").and_then(|v| v.as_str()).map(|s| existing.parent_id.as_deref() == Some(s)).unwrap_or(true);
                            if !(same_title && same_parent) {
                                let conflict = WorkspaceConflict {
                                    id: Uuid::new_v4().to_string(),
                                    workspace_id: workspace.id.clone(),
                                    item_type: "folder".to_string(),
                                    sync_id: sync_id.clone(),
                                    detected_at: Utc::now(),
                                    status: "open".to_string(),
                                    desktop_snapshot: serde_json::to_value(existing.clone()).unwrap_or(Value::Null),
                                    incoming_snapshot: incoming_snapshot.clone(),
                                    resolved_at: None,
                                    resolved_by: None,
                                    resolution: None,
                                };
                                workspace.conflicts.push(conflict.clone());
                                conflict_created = Some(conflict);
                            }
                        }
                    }

                    let mut updated = existing.clone();
                    if let Some(title) = payload.get("title").and_then(|v| v.as_str()) {
                        updated.title = title.to_string();
                    }
                    if let Some(parent_id) = payload.get("parentId").and_then(|v| v.as_str()) {
                        updated.parent_id = Some(parent_id.to_string());
                    }
                    updated.updated_at_lamport = updated.updated_at_lamport.saturating_add(1);
                    updated.updated_by = source.to_string();

                    let entry = WorkspaceVersionEntry {
                        id: Uuid::new_v4().to_string(),
                        workspace_id: workspace.id.clone(),
                        item_type: "folder".to_string(),
                        sync_id: sync_id.clone(),
                        lamport: updated.updated_at_lamport,
                        source: source.to_string(),
                        created_at: Utc::now(),
                        snapshot: serde_json::to_value(updated.clone()).unwrap_or(Value::Null),
                    };
                    Self::append_version_log_entry(&workspace.id, entry)?;

                    if let Some(slot) = workspace.folders.iter_mut().find(|f| f.sync_id == sync_id) {
                        *slot = updated;
                    }
                } else {
                    let mut created: Folder = serde_json::from_value(payload.clone())
                        .map_err(|e| format!("Invalid folder payload: {}", e))?;
                    if created.id.is_empty() {
                        created.id = Uuid::new_v4().to_string();
                    }
                    created.sync_id = sync_id.clone();
                    created.updated_at_lamport = 1;
                    created.updated_by = source.to_string();
                    workspace.folders.push(created.clone());

                    let entry = WorkspaceVersionEntry {
                        id: Uuid::new_v4().to_string(),
                        workspace_id: workspace.id.clone(),
                        item_type: "folder".to_string(),
                        sync_id: sync_id.clone(),
                        lamport: created.updated_at_lamport,
                        source: source.to_string(),
                        created_at: Utc::now(),
                        snapshot: serde_json::to_value(created).unwrap_or(Value::Null),
                    };
                    Self::append_version_log_entry(&workspace.id, entry)?;
                }
            }
            "folder_removed" => {
                if let Some(existing) = workspace.folders.iter_mut().find(|f| f.sync_id == sync_id) {
                    existing.deleted = true;
                    existing.updated_at_lamport = existing.updated_at_lamport.saturating_add(1);
                    existing.updated_by = source.to_string();
                    let entry = WorkspaceVersionEntry {
                        id: Uuid::new_v4().to_string(),
                        workspace_id: workspace.id.clone(),
                        item_type: "folder".to_string(),
                        sync_id: sync_id.clone(),
                        lamport: existing.updated_at_lamport,
                        source: source.to_string(),
                        created_at: Utc::now(),
                        snapshot: serde_json::to_value(existing.clone()).unwrap_or(Value::Null),
                    };
                    Self::append_version_log_entry(&workspace.id, entry)?;
                }
            }
            _ => return Err("Unsupported item_type".to_string()),
        }

        workspace.version += 1;
        workspace.updated_at = Utc::now();

        Self::save_workspace(&workspace)?;
        Self::with_index(|index| {
            Self::update_index_summary(index, &workspace);
            Ok(())
        })?;

        Ok((workspace, conflict_created))
    }

    pub fn export_workspace(workspace_id: &str) -> Result<String, String> {
        let workspace = Self::load_workspace(workspace_id)?;
        let dir = Self::get_exports_dir();
        Self::ensure_dir(&dir);
        let safe_name: String = workspace.name.chars().map(|c| {
            match c {
                '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
                _ => c,
            }
        }).collect();
        let file_name = format!("workspace-{}-{}.json", safe_name, workspace.id);
        let path = dir.join(file_name);
        let content = serde_json::to_string_pretty(&workspace)
            .map_err(|e| format!("Serialize failed: {}", e))?;
        fs::write(&path, content)
            .map_err(|e| format!("Write failed: {}", e))?;
        Ok(path.to_string_lossy().to_string())
    }

    pub fn import_workspace_from_path(path: &str, mode: &str) -> Result<Workspace, String> {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Read failed: {}", e))?;
        let imported: Workspace = serde_json::from_str(&content)
            .map_err(|e| format!("Parse failed: {}", e))?;

        match mode {
            "create" => {
                let mut ws = imported.clone();
                ws.id = Uuid::new_v4().to_string();
                ws.created_at = Utc::now();
                ws.updated_at = Utc::now();
                ws.version = 1;
                ws.conflicts = vec![];
                ws.version_log = vec![];
                Self::save_workspace(&ws)?;

                Self::with_index(|index| {
                    Self::update_index_summary(index, &ws);
                    if index.default_workspace_id.is_none() {
                        index.default_workspace_id = Some(ws.id.clone());
                    }
                    Ok(())
                })?;
                Ok(ws)
            }
            _ => Err("Unsupported import mode".to_string()),
        }
    }

    pub fn backup_all() -> Result<String, String> {
        let dir = Self::get_backups_dir();
        Self::ensure_dir(&dir);

        let index = Self::read_index(|i| i.clone());
        let mut workspaces_json: Vec<Value> = Vec::new();
        for ws in &index.workspaces {
            if let Ok(full) = Self::load_workspace(&ws.id) {
                // Sérialiser le workspace (sans version_log dû à skip_serializing)
                if let Ok(mut ws_val) = serde_json::to_value(&full) {
                    // Charger et injecter le version_log séparé pour le backup
                    let version_log = Self::load_version_log(&ws.id);
                    if let Ok(log_val) = serde_json::to_value(&version_log) {
                        ws_val.as_object_mut().map(|obj| obj.insert("versionLog".to_string(), log_val));
                    }
                    workspaces_json.push(ws_val);
                }
            }
        }

        let backup = serde_json::json!({
            "formatVersion": "1.0",
            "createdAt": Utc::now(),
            "index": index,
            "workspaces": workspaces_json,
        });

        let ts = Utc::now().format("%Y%m%d-%H%M%S").to_string();
        let path = dir.join(format!("backup-{}.json", ts));
        let content = serde_json::to_string_pretty(&backup)
            .map_err(|e| format!("Serialize failed: {}", e))?;
        fs::write(&path, content)
            .map_err(|e| format!("Write failed: {}", e))?;
        Ok(path.to_string_lossy().to_string())
    }

    pub fn restore_backup_from_path(path: &str) -> Result<(String, WorkspacesIndex), String> {
        let pre_backup = Self::backup_all().unwrap_or_else(|_| "".to_string());
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Read failed: {}", e))?;
        let v: Value = serde_json::from_str(&content)
            .map_err(|e| format!("Parse failed: {}", e))?;
        let index_val = v.get("index").cloned().unwrap_or(Value::Null);
        let restored_index: WorkspacesIndex = serde_json::from_value(index_val)
            .map_err(|e| format!("Invalid backup index: {}", e))?;

        let workspaces_val = v.get("workspaces").and_then(|x| x.as_array()).cloned().unwrap_or_default();
        Self::ensure_workspaces_dir();
        for ws_val in workspaces_val {
            if let Ok(ws) = serde_json::from_value::<Workspace>(ws_val) {
                if let Err(e) = Self::save_workspace(&ws) {
                    error!("Skipping invalid workspace in backup: {}", e);
                }
            }
        }

        {
            let _guard = index_lock().lock();
            Self::save_index(&restored_index)?;
        }
        Ok((pre_backup, restored_index))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workspace_default() {
        let ws = Workspace::default();
        assert!(!ws.id.is_empty());
        assert_eq!(ws.name, "Nouveau workspace");
        assert_eq!(ws.version, 1);
    }

    #[test]
    fn test_workspace_summary_from() {
        let ws = Workspace {
            id: "test-id".to_string(),
            name: "Test".to_string(),
            color: Some("#ff0000".to_string()),
            icon: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            bookmarks: vec![],
            folders: vec![],
            version: 1,
            conflicts: vec![],
            version_log: vec![],
        };

        let summary = WorkspaceSummary::from(&ws);
        assert_eq!(summary.id, "test-id");
        assert_eq!(summary.name, "Test");
        assert_eq!(summary.total_bookmarks, 0);
    }

    #[test]
    fn test_browser_color() {
        assert_eq!(WorkspaceManager::get_browser_color("Chrome"), "#4285F4");
        assert_eq!(WorkspaceManager::get_browser_color("Firefox"), "#FF7139");
        assert_eq!(WorkspaceManager::get_browser_color("Unknown"), "#3498db");
    }
}
