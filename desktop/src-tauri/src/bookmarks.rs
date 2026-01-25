use std::fs;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use log::{error, info, warn};
use chrono::Local;
use uuid::Uuid;
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FolderData {
    pub id: String,
    pub title: String,
    pub parent_id: Option<String>,
    pub children: Vec<String>, // IDs des favoris/dossiers enfants
    pub date_added: Option<i64>,
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
    pub fn flatten_chrome_tree(nodes: &[Value]) -> (Vec<Value>, Vec<Value>) {
        let mut bookmarks: Vec<Value> = Vec::new();
        let mut folders: Vec<Value> = Vec::new();

        fn walk(node: &Value, bookmarks: &mut Vec<Value>, folders: &mut Vec<Value>) {
            let Some(obj) = node.as_object() else {
                return;
            };

            let id = obj.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let has_children = obj.get("children").and_then(|v| v.as_array()).is_some();
            let url = obj.get("url").and_then(|v| v.as_str());

            if let Some(url) = url {
                if !url.is_empty() {
                    bookmarks.push(node.clone());
                }
            } else if has_children {
                // Ignore Chrome root nodes
                if id != "0" && id != "1" && id != "2" {
                    let mut folder_obj = obj.clone();
                    folder_obj.remove("children");
                    folders.push(Value::Object(folder_obj));
                }
            }

            if let Some(children) = obj.get("children").and_then(|v| v.as_array()) {
                for child in children {
                    walk(child, bookmarks, folders);
                }
            }
        }

        for n in nodes {
            walk(n, &mut bookmarks, &mut folders);
        }

        (bookmarks, folders)
    }
    pub fn load_bookmarks() -> BookmarksData {
        ConfigManager::ensure_sync_dir();
        let path = ConfigManager::get_bookmarks_path();

        if !path.exists() {
            return BookmarksData::default();
        }

        match fs::read_to_string(&path) {
            Ok(content) => {
                match serde_json::from_str::<BookmarksData>(&content) {
                    Ok(data) => data,
                    Err(_) => {
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

    /// Synchronise les favoris depuis l'extension.
    /// STRATÉGIE : Le navigateur est la source de vérité.
    /// On remplace complètement les données locales par celles de l'extension.
    pub fn merge_bookmarks(local_data: &mut BookmarksData, extension_bookmarks: Vec<Value>) -> Vec<Value> {
        // Filtrer pour ne garder que les favoris valides (avec URL non vide)
        let valid_bookmarks: Vec<Value> = extension_bookmarks
            .into_iter()
            .filter(|b| {
                b.get("url")
                    .and_then(|v| v.as_str())
                    .map(|s| !s.is_empty())
                    .unwrap_or(false)
            })
            .collect();

        info!("Sync: remplacement de {} favoris locaux par {} favoris du navigateur",
              local_data.bookmarks.len(), valid_bookmarks.len());

        // Remplacer complètement les favoris locaux
        local_data.bookmarks = valid_bookmarks.clone();
        valid_bookmarks
    }

    pub fn add_bookmark(data: &mut BookmarksData, bookmark: Value) -> bool {
        let url = bookmark.get("url").and_then(|v| v.as_str());
        let Some(url) = url else { return false; };
        if url.is_empty() { return false; }

        let parent_id = bookmark.get("parentId").and_then(|v| v.as_str()).unwrap_or("1");
        let bookmark_id = bookmark.get("id").and_then(|v| v.as_str());

        // Vérifier si un favori identique existe (même ID ou même URL+parentId)
        let exists = data.bookmarks.iter().any(|b| {
            // Si les deux ont un ID, comparer par ID
            if let (Some(existing_id), Some(new_id)) = (
                b.get("id").and_then(|v| v.as_str()),
                bookmark_id
            ) {
                return existing_id == new_id;
            }
            // Sinon comparer par URL + parentId
            let same_url = b.get("url").and_then(|v| v.as_str()) == Some(url);
            let same_parent = b.get("parentId").and_then(|v| v.as_str()).unwrap_or("1") == parent_id;
            same_url && same_parent
        });
        if exists {
            return false;
        }

        let mut obj = bookmark.as_object().cloned().unwrap_or_default();

        if obj.get("id").and_then(|v| v.as_str()).unwrap_or("").is_empty() {
            obj.insert("id".to_string(), Value::String(Uuid::new_v4().to_string()));
        }
        if obj.get("parentId").and_then(|v| v.as_str()).unwrap_or("").is_empty() {
            obj.insert("parentId".to_string(), Value::String("1".to_string()));
        }
        if obj.get("dateAdded").is_none() {
            obj.insert(
                "dateAdded".to_string(),
                Value::Number(chrono::Utc::now().timestamp_millis().into()),
            );
        }

        data.bookmarks.push(Value::Object(obj));
        Self::save_bookmarks(data)
    }

    pub fn remove_bookmark(data: &mut BookmarksData, bookmark_id: &str) -> bool {
        let initial_len = data.bookmarks.len();
        data.bookmarks.retain(|b| {
            b.get("id").and_then(|v| v.as_str()) != Some(bookmark_id)
        });
        if data.bookmarks.len() != initial_len {
            return Self::save_bookmarks(data);
        }
        false
    }

    pub fn update_bookmark(data: &mut BookmarksData, bookmark_id: &str, updated: Value) -> bool {
        // D'abord chercher par ID
        let mut pos = data.bookmarks.iter().position(|b| {
            b.get("id").and_then(|v| v.as_str()) == Some(bookmark_id)
        });

        // Si pas trouvé par ID, chercher par URL (les IDs Chrome sont locaux)
        if pos.is_none() {
            if let Some(url) = updated.get("url").and_then(|v| v.as_str()) {
                pos = data.bookmarks.iter().position(|b| {
                    b.get("url").and_then(|v| v.as_str()) == Some(url)
                });
            }
        }

        if let Some(p) = pos {
            // Fusionner les données existantes avec les nouvelles
            if let Some(existing) = data.bookmarks.get(p).cloned() {
                let mut merged = existing.as_object().cloned().unwrap_or_default();
                if let Some(new_obj) = updated.as_object() {
                    for (key, value) in new_obj {
                        if !value.is_null() {
                            merged.insert(key.clone(), value.clone());
                        }
                    }
                }
                data.bookmarks[p] = Value::Object(merged);
            } else {
                data.bookmarks[p] = updated;
            }
            return Self::save_bookmarks(data);
        }
        false
    }

    // ==================== Gestion des dossiers ====================

    pub fn add_folder(data: &mut BookmarksData, folder: Value) -> bool {
        let folder_id = folder.get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        // Vérifier si le dossier existe déjà (par ID ou titre+parentId)
        let exists = data.folders.iter().any(|f| {
            let same_id = f.get("id").and_then(|v| v.as_str()) == Some(&folder_id);
            let same_title_parent = {
                let title = folder.get("title").and_then(|v| v.as_str());
                let parent = folder.get("parentId").and_then(|v| v.as_str());
                let f_title = f.get("title").and_then(|v| v.as_str());
                let f_parent = f.get("parentId").and_then(|v| v.as_str());
                title.is_some() && title == f_title && parent == f_parent
            };
            same_id || same_title_parent
        });

        if !exists {
            let mut folder_obj = folder.as_object().cloned().unwrap_or_default();
            folder_obj.insert("id".to_string(), Value::String(folder_id.clone()));
            if folder_obj.get("dateAdded").is_none() {
                folder_obj.insert("dateAdded".to_string(), Value::Number(chrono::Utc::now().timestamp_millis().into()));
            }
            data.folders.push(Value::Object(folder_obj));
            info!("Folder added: {}", folder_id);
            return Self::save_bookmarks(data);
        }
        false
    }

    pub fn remove_folder(data: &mut BookmarksData, folder_id: &str) -> bool {
        let initial_len = data.folders.len();

        // Supprimer le dossier
        data.folders.retain(|f| {
            f.get("id").and_then(|v| v.as_str()) != Some(folder_id)
        });

        // Supprimer aussi les favoris qui ont ce dossier comme parent
        data.bookmarks.retain(|b| {
            b.get("parentId").and_then(|v| v.as_str()) != Some(folder_id)
        });

        // Supprimer les sous-dossiers récursivement
        let child_folder_ids: Vec<String> = data.folders.iter()
            .filter(|f| f.get("parentId").and_then(|v| v.as_str()) == Some(folder_id))
            .filter_map(|f| f.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .collect();

        for child_id in child_folder_ids {
            Self::remove_folder(data, &child_id);
        }

        if data.folders.len() != initial_len {
            info!("Folder removed: {}", folder_id);
            return Self::save_bookmarks(data);
        }
        false
    }

    pub fn update_folder(data: &mut BookmarksData, folder_id: &str, updated: Value) -> bool {
        let pos = data.folders.iter().position(|f| {
            f.get("id").and_then(|v| v.as_str()) == Some(folder_id)
        });

        if let Some(p) = pos {
            if let Some(existing) = data.folders.get(p).cloned() {
                let mut merged = existing.as_object().cloned().unwrap_or_default();
                if let Some(new_obj) = updated.as_object() {
                    for (key, value) in new_obj {
                        if !value.is_null() {
                            merged.insert(key.clone(), value.clone());
                        }
                    }
                }
                data.folders[p] = Value::Object(merged);
            } else {
                data.folders[p] = updated;
            }
            info!("Folder updated: {}", folder_id);
            return Self::save_bookmarks(data);
        }
        false
    }

    /// Synchronise les dossiers depuis l'extension.
    /// STRATÉGIE : Le navigateur est la source de vérité.
    /// On remplace complètement les dossiers locaux par ceux de l'extension.
    pub fn merge_folders(local_data: &mut BookmarksData, extension_folders: Vec<Value>) -> Vec<Value> {
        info!("Sync: remplacement de {} dossiers locaux par {} dossiers du navigateur",
              local_data.folders.len(), extension_folders.len());

        // Remplacer complètement les dossiers locaux
        local_data.folders = extension_folders.clone();
        extension_folders
    }

    pub fn remap_folder_id(data: &mut BookmarksData, from_id: &str, to_id: &str) -> bool {
        if from_id == to_id {
            return false;
        }

        let mut changed = false;

        let to_exists = data.folders.iter().any(|f| {
            f.get("id").and_then(|v| v.as_str()) == Some(to_id)
        });

        // Update folder ID (or remove duplicate if the target already exists)
        let mut updated_folders: Vec<Value> = Vec::with_capacity(data.folders.len());
        for f in data.folders.iter() {
            let current_id = f.get("id").and_then(|v| v.as_str()).unwrap_or("");
            if current_id == from_id {
                if to_exists {
                    changed = true;
                    continue;
                }
                let mut obj = f.as_object().cloned().unwrap_or_default();
                obj.insert("id".to_string(), Value::String(to_id.to_string()));
                updated_folders.push(Value::Object(obj));
                changed = true;
            } else {
                updated_folders.push(f.clone());
            }
        }
        if changed {
            data.folders = updated_folders;
        }

        // Update parentId references in folders
        for f in data.folders.iter_mut() {
            if let Some(obj) = f.as_object_mut() {
                if let Some(pid) = obj.get("parentId").and_then(|v| v.as_str()) {
                    if pid == from_id {
                        obj.insert("parentId".to_string(), Value::String(to_id.to_string()));
                        changed = true;
                    }
                }
            }
        }

        // Update parentId references in bookmarks
        for b in data.bookmarks.iter_mut() {
            if let Some(obj) = b.as_object_mut() {
                if let Some(pid) = obj.get("parentId").and_then(|v| v.as_str()) {
                    if pid == from_id {
                        obj.insert("parentId".to_string(), Value::String(to_id.to_string()));
                        changed = true;
                    }
                }
            }
        }

        if changed {
            info!("Folder ID remapped: {} -> {}", from_id, to_id);
            return Self::save_bookmarks(data);
        }

        false
    }

    /// Construit l'arborescence complète pour le frontend
    pub fn build_tree(data: &BookmarksData) -> Value {
        let mut root_items: Vec<Value> = vec![];

        // Collecter tous les IDs de dossiers existants
        let folder_ids: std::collections::HashSet<String> = data.folders.iter()
            .filter_map(|f| f.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .collect();

        // Créer un map des favoris par parentId
        let mut bookmarks_by_parent: HashMap<String, Vec<&Value>> = HashMap::new();
        let mut orphan_bookmarks: Vec<&Value> = vec![];

        for b in &data.bookmarks {
            let parent_id = b.get("parentId").and_then(|v| v.as_str());

            match parent_id {
                Some(pid) if pid == "1" || pid == "2" || pid == "0" => {
                    // Favoris racine (barre de favoris ou autres favoris)
                    bookmarks_by_parent.entry("root".to_string()).or_default().push(b);
                }
                Some(pid) if folder_ids.contains(pid) => {
                    // Favoris dans un dossier existant
                    bookmarks_by_parent.entry(pid.to_string()).or_default().push(b);
                }
                _ => {
                    // Favoris sans parent valide -> afficher à la racine
                    orphan_bookmarks.push(b);
                }
            }
        }

        // Créer un map des dossiers par parentId
        let mut folders_by_parent: HashMap<String, Vec<&Value>> = HashMap::new();
        for f in &data.folders {
            let parent_id = f.get("parentId")
                .and_then(|v| v.as_str())
                .unwrap_or("root");

            // Dossiers racine (parent = "0", "1", "2" ou absent)
            let key = if parent_id == "0" || parent_id == "1" || parent_id == "2" {
                "root".to_string()
            } else {
                parent_id.to_string()
            };
            folders_by_parent.entry(key).or_default().push(f);
        }

        // Fonction récursive pour construire l'arbre
        fn build_node(
            folder: &Value,
            folders_by_parent: &HashMap<String, Vec<&Value>>,
            bookmarks_by_parent: &HashMap<String, Vec<&Value>>,
        ) -> Value {
            let folder_id = folder.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let mut children: Vec<Value> = vec![];

            // Ajouter les sous-dossiers
            if let Some(sub_folders) = folders_by_parent.get(folder_id) {
                for sf in sub_folders {
                    children.push(build_node(sf, folders_by_parent, bookmarks_by_parent));
                }
            }

            // Ajouter les favoris
            if let Some(bookmarks) = bookmarks_by_parent.get(folder_id) {
                for b in bookmarks {
                    children.push((*b).clone());
                }
            }

            let mut node = folder.as_object().cloned().unwrap_or_default();
            node.insert("children".to_string(), Value::Array(children));
            node.insert("isFolder".to_string(), Value::Bool(true));
            Value::Object(node)
        }

        // Construire les dossiers racine
        if let Some(root_folders) = folders_by_parent.get("root") {
            for f in root_folders {
                root_items.push(build_node(f, &folders_by_parent, &bookmarks_by_parent));
            }
        }

        // Ajouter les favoris racine
        if let Some(root_bookmarks) = bookmarks_by_parent.get("root") {
            for b in root_bookmarks {
                root_items.push((*b).clone());
            }
        }

        // Ajouter les favoris orphelins (sans parentId ou avec parentId invalide)
        for b in orphan_bookmarks {
            root_items.push(b.clone());
        }

        serde_json::json!({
            "items": root_items,
            "total_bookmarks": data.bookmarks.len(),
            "total_folders": data.folders.len()
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn flattens_chrome_tree_into_bookmarks_and_folders() {
        let tree = vec![json!({
            "id": "0",
            "children": [
                {
                    "id": "1",
                    "title": "Bookmarks bar",
                    "children": [
                        {
                            "id": "10",
                            "title": "Work",
                            "parentId": "1",
                            "children": [
                                {"id": "11", "title": "Example", "url": "https://example.com", "parentId": "10"}
                            ]
                        }
                    ]
                },
                {"id": "2", "title": "Other bookmarks", "children": []}
            ]
        })];

        let (bookmarks, folders) = BookmarksManager::flatten_chrome_tree(&tree);
        assert_eq!(bookmarks.len(), 1);
        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].get("id").and_then(|v| v.as_str()), Some("10"));
        assert_eq!(bookmarks[0].get("url").and_then(|v| v.as_str()), Some("https://example.com"));
    }

    #[test]
    fn remaps_folder_id_and_parent_references() {
        let mut data = BookmarksData::default();
        data.folders.push(json!({"id": "tmp", "title": "Tmp", "parentId": "1"}));
        data.bookmarks.push(json!({"id": "b1", "title": "Example", "url": "https://example.com", "parentId": "tmp"}));

        let ok = BookmarksManager::remap_folder_id(&mut data, "tmp", "100");
        assert!(ok);

        let folder_ids: Vec<String> = data
            .folders
            .iter()
            .filter_map(|f| f.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .collect();
        assert!(folder_ids.contains(&"100".to_string()));

        let bookmark_parent = data.bookmarks[0].get("parentId").and_then(|v| v.as_str());
        assert_eq!(bookmark_parent, Some("100"));
    }
}
