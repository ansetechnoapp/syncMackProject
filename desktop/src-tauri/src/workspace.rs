use std::fs;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use log::{error, info, warn};
use uuid::Uuid;
use serde_json::Value;

use crate::bookmarks::{Bookmark, Folder, BookmarksManager};
use crate::config::ConfigManager;

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
    #[serde(default)]
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

/// Association entre un navigateur et un workspace
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceAssignment {
    pub browser_id: String,
    pub browser_name: String,
    #[serde(default)]
    pub workspace_id: Option<String>,
    pub assigned_at: DateTime<Utc>,
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
            last_updated: Utc::now(),
        }
    }
}

pub struct WorkspaceManager;

impl WorkspaceManager {
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

    /// Retourne le chemin d'un workspace spécifique
    pub fn get_workspace_path(id: &str) -> std::path::PathBuf {
        Self::get_workspaces_dir().join(format!("{}.json", id))
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

        // Mettre à jour l'index
        let mut index = Self::load_index();
        Self::update_index_summary(&mut index, &workspace);
        Self::save_index(&index)?;

        info!("Workspace créé: {} ({})", workspace.name, workspace.id);
        Ok(workspace)
    }

    /// Charge un workspace par son ID
    pub fn load_workspace(id: &str) -> Result<Workspace, String> {
        let path = Self::get_workspace_path(id);

        if !path.exists() {
            return Err(format!("Workspace non trouvé: {}", id));
        }

        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Échec lecture workspace: {}", e))?;

        serde_json::from_str::<Workspace>(&content)
            .map_err(|e| format!("Échec parsing workspace: {}", e))
    }

    /// Sauvegarde un workspace
    pub fn save_workspace(workspace: &Workspace) -> Result<(), String> {
        Self::ensure_workspaces_dir();
        let path = Self::get_workspace_path(&workspace.id);
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

        // Mettre à jour l'index
        let mut index = Self::load_index();
        Self::update_index_summary(&mut index, &workspace);
        Self::save_index(&index)?;

        Ok(workspace)
    }

    /// Supprime un workspace
    pub fn delete_workspace(id: &str) -> Result<(), String> {
        let path = Self::get_workspace_path(id);

        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| format!("Échec suppression workspace: {}", e))?;
        }

        // Supprimer le backup s'il existe
        let bak_path = path.with_extension("bak");
        let _ = fs::remove_file(&bak_path);

        // Mettre à jour l'index
        let mut index = Self::load_index();
        index.workspaces.retain(|w| w.id != id);

        // Supprimer les assignments liés
        index.assignments.retain(|a| a.workspace_id.as_deref() != Some(id));

        // Si c'était le workspace par défaut, le retirer
        if index.default_workspace_id.as_deref() == Some(id) {
            index.default_workspace_id = None;
        }

        Self::save_index(&index)?;

        info!("Workspace supprimé: {}", id);
        Ok(())
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

        // Mettre à jour l'index
        let mut index = Self::load_index();
        Self::update_index_summary(&mut index, &new_workspace);
        Self::save_index(&index)?;

        info!("Workspace dupliqué: {} -> {}", id, new_workspace.id);
        Ok(new_workspace)
    }

    /// Liste tous les workspaces (résumés)
    pub fn list_workspaces() -> Vec<WorkspaceSummary> {
        let index = Self::load_index();
        index.workspaces
    }

    // ==================== Assignments ====================

    /// Assigne un workspace à un navigateur
    pub fn assign_workspace(browser_id: &str, browser_name: &str, workspace_id: &str) -> Result<(), String> {
        // Vérifier que le workspace existe
        let _ = Self::load_workspace(workspace_id)?;

        let mut index = Self::load_index();

        // Chercher si ce navigateur a déjà une assignment
        if let Some(pos) = index.assignments.iter().position(|a| a.browser_id == browser_id) {
            index.assignments[pos].workspace_id = Some(workspace_id.to_string());
            index.assignments[pos].assigned_at = Utc::now();
        } else {
            index.assignments.push(WorkspaceAssignment {
                browser_id: browser_id.to_string(),
                browser_name: browser_name.to_string(),
                workspace_id: Some(workspace_id.to_string()),
                assigned_at: Utc::now(),
            });
        }

        Self::save_index(&index)?;
        info!("Workspace {} assigné à {}", workspace_id, browser_name);
        Ok(())
    }

    /// Retire l'assignment d'un navigateur
    pub fn unassign_workspace(browser_id: &str) -> Result<(), String> {
        let mut index = Self::load_index();

        if let Some(pos) = index.assignments.iter().position(|a| a.browser_id == browser_id) {
            index.assignments[pos].workspace_id = None;
            index.assignments[pos].assigned_at = Utc::now();
            Self::save_index(&index)?;
            info!("Workspace désassigné pour navigateur {}", browser_id);
        }

        Ok(())
    }

    /// Obtient le workspace assigné à un navigateur
    pub fn get_workspace_for_browser(browser_id: &str) -> Option<String> {
        let index = Self::load_index();
        index.assignments
            .iter()
            .find(|a| a.browser_id == browser_id)
            .and_then(|a| a.workspace_id.clone())
    }

    /// Obtient tous les navigateurs assignés à un workspace
    pub fn get_browsers_for_workspace(workspace_id: &str) -> Vec<String> {
        let index = Self::load_index();
        index.assignments
            .iter()
            .filter(|a| a.workspace_id.as_deref() == Some(workspace_id))
            .map(|a| a.browser_id.clone())
            .collect()
    }

    /// Obtient toutes les assignments
    pub fn get_assignments() -> Vec<WorkspaceAssignment> {
        let index = Self::load_index();
        index.assignments
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
        let mut index = WorkspacesIndex::default();
        Self::update_index_summary(&mut index, &workspace);
        index.default_workspace_id = Some(workspace.id.clone());
        Self::save_index(&index)?;

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

        // Mettre à jour l'index
        let mut index = Self::load_index();
        Self::update_index_summary(&mut index, &workspace);
        Self::save_index(&index)?;

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

        // Vérifier si le favori existe déjà
        let exists = workspace.bookmarks.iter().any(|b| {
            b.id == bookmark.id || (b.url == bookmark.url && b.parent_id == bookmark.parent_id)
        });

        if !exists {
            workspace.bookmarks.push(bookmark);
            workspace.version += 1;
            Self::save_workspace(&workspace)?;

            // Mettre à jour l'index
            let mut index = Self::load_index();
            Self::update_index_summary(&mut index, &workspace);
            Self::save_index(&index)?;
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

            // Mettre à jour l'index
            let mut index = Self::load_index();
            Self::update_index_summary(&mut index, &workspace);
            Self::save_index(&index)?;
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

            // Mettre à jour l'index
            let mut index = Self::load_index();
            Self::update_index_summary(&mut index, &workspace);
            Self::save_index(&index)?;
        }

        Ok(())
    }

    /// Synchronise les favoris d'un navigateur avec son workspace assigné
    pub fn sync_bookmarks_to_workspace(
        workspace_id: &str,
        bookmarks: Vec<Bookmark>,
        folders: Vec<Folder>,
    ) -> Result<Workspace, String> {
        let mut workspace = Self::load_workspace(workspace_id)?;

        let mut local_bookmarks_by_sync: HashMap<String, &Bookmark> = HashMap::new();
        for b in &workspace.bookmarks {
            if !b.sync_id.is_empty() {
                local_bookmarks_by_sync.insert(b.sync_id.clone(), b);
            }
        }
        let mut local_folders_by_sync: HashMap<String, &Folder> = HashMap::new();
        for f in &workspace.folders {
            if !f.sync_id.is_empty() {
                local_folders_by_sync.insert(f.sync_id.clone(), f);
            }
        }

        let mut incoming_bookmarks = bookmarks;
        for b in &mut incoming_bookmarks {
            if let Some(local) = local_bookmarks_by_sync.get(&b.sync_id) {
                b.updated_at_lamport = local.updated_at_lamport;
                b.updated_by = local.updated_by.clone();
            }
        }

        let mut incoming_folders = folders;
        for f in &mut incoming_folders {
            if let Some(local) = local_folders_by_sync.get(&f.sync_id) {
                f.updated_at_lamport = local.updated_at_lamport;
                f.updated_by = local.updated_by.clone();
            }
        }

        workspace.bookmarks = incoming_bookmarks;
        workspace.folders = incoming_folders;
        workspace.version += 1;
        workspace.updated_at = Utc::now();

        Self::save_workspace(&workspace)?;

        // Mettre à jour l'index
        let mut index = Self::load_index();
        Self::update_index_summary(&mut index, &workspace);
        Self::save_index(&index)?;

        info!("Workspace {} synchronisé: {} favoris, {} dossiers",
              workspace_id, workspace.bookmarks.len(), workspace.folders.len());

        Ok(workspace)
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

        let mut index = Self::load_index();
        Self::update_index_summary(&mut index, &workspace);
        Self::save_index(&index)?;

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
                    workspace.version_log.push(entry);

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
                    workspace.version_log.push(entry);
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
                    workspace.version_log.push(entry);
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
                    workspace.version_log.push(entry);

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
                    workspace.version_log.push(entry);
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
                    workspace.version_log.push(entry);
                }
            }
            _ => return Err("Unsupported item_type".to_string()),
        }

        if workspace.version_log.len() > 2000 {
            let excess = workspace.version_log.len() - 2000;
            workspace.version_log.drain(0..excess);
        }

        workspace.version += 1;
        workspace.updated_at = Utc::now();

        Self::save_workspace(&workspace)?;
        let mut index = Self::load_index();
        Self::update_index_summary(&mut index, &workspace);
        Self::save_index(&index)?;

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

                let mut index = Self::load_index();
                Self::update_index_summary(&mut index, &ws);
                if index.default_workspace_id.is_none() {
                    index.default_workspace_id = Some(ws.id.clone());
                }
                Self::save_index(&index)?;
                Ok(ws)
            }
            _ => Err("Unsupported import mode".to_string()),
        }
    }

    pub fn backup_all() -> Result<String, String> {
        let dir = Self::get_backups_dir();
        Self::ensure_dir(&dir);

        let index = Self::load_index();
        let mut workspaces: Vec<Workspace> = Vec::new();
        for ws in &index.workspaces {
            if let Ok(full) = Self::load_workspace(&ws.id) {
                workspaces.push(full);
            }
        }

        let backup = serde_json::json!({
            "formatVersion": "1.0",
            "createdAt": Utc::now(),
            "index": index,
            "workspaces": workspaces,
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
                let _ = Self::save_workspace(&ws);
            }
        }

        Self::save_index(&restored_index)?;
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
