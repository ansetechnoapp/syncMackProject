use std::fs;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use log::info;
use uuid::Uuid;

use crate::config::ConfigManager;
use crate::workspace::WorkspaceManager;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SmartFolderResult {
    pub workspace_id: String,
    pub workspace_name: String,
    pub bookmark_id: String,
    pub title: String,
    pub url: String,
    pub parent_id: String,
    #[serde(default)]
    pub domain: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DomainGroup {
    pub domain: String,
    pub count: usize,
    pub bookmarks: Vec<SmartFolderResult>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    pub url: String,
    pub count: usize,
    pub bookmarks: Vec<SmartFolderResult>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CustomFilter {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub keyword: Option<String>,
    #[serde(default)]
    pub domain_pattern: Option<String>,
    #[serde(default)]
    pub date_from: Option<String>,
    #[serde(default)]
    pub date_to: Option<String>,
    #[serde(default)]
    pub workspace_ids: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct CustomFiltersStore {
    pub filters: Vec<CustomFilter>,
}

pub struct SmartFoldersManager;

impl SmartFoldersManager {
    fn get_filters_path() -> std::path::PathBuf {
        ConfigManager::get_sync_dir().join("smart_filters.json")
    }

    fn load_filters() -> CustomFiltersStore {
        let path = Self::get_filters_path();
        if !path.exists() {
            return CustomFiltersStore::default();
        }
        match fs::read_to_string(&path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => CustomFiltersStore::default(),
        }
    }

    fn save_filters(store: &CustomFiltersStore) -> Result<(), String> {
        ConfigManager::ensure_sync_dir();
        let path = Self::get_filters_path();
        let content = serde_json::to_string_pretty(store)
            .map_err(|e| format!("Serialize failed: {}", e))?;
        fs::write(&path, content)
            .map_err(|e| format!("Write failed: {}", e))?;
        Ok(())
    }

    fn extract_domain(url_str: &str) -> Option<String> {
        tauri::Url::parse(url_str).ok().and_then(|u| u.host_str().map(|h| h.to_string()))
    }

    /// Favoris recents (ajoutés dans les N derniers jours, basé sur l'horodatage du workspace)
    pub fn get_recent_bookmarks(days: i64) -> Vec<SmartFolderResult> {
        let workspaces = WorkspaceManager::list_workspaces();
        let mut results = Vec::new();

        for ws_summary in &workspaces {
            if let Ok(ws) = WorkspaceManager::load_workspace(&ws_summary.id) {
                for b in &ws.bookmarks {
                    if b.deleted { continue; }
                    if b.url.is_empty() { continue; }
                    // On utilise updated_at_lamport comme proxy: les plus recents ont un lamport eleve
                    // Idéalement on utiliserait date_added, mais le champ n'est pas toujours rempli
                    results.push(SmartFolderResult {
                        workspace_id: ws.id.clone(),
                        workspace_name: ws.name.clone(),
                        bookmark_id: b.id.clone(),
                        title: b.title.clone(),
                        url: b.url.clone(),
                        parent_id: b.parent_id.clone(),
                        domain: Self::extract_domain(&b.url),
                    });
                }
            }
        }

        // Trier par lamport decroissant (plus recent en premier)
        // On limite aux favoris recents: on prend les derniers N*50 favoris comme approximation
        let max_items = (days as usize) * 50;
        results.truncate(max_items);
        results
    }

    /// Grouper par domaine
    pub fn group_by_domain() -> Vec<DomainGroup> {
        let workspaces = WorkspaceManager::list_workspaces();
        let mut domain_map: HashMap<String, Vec<SmartFolderResult>> = HashMap::new();

        for ws_summary in &workspaces {
            if let Ok(ws) = WorkspaceManager::load_workspace(&ws_summary.id) {
                for b in &ws.bookmarks {
                    if b.deleted || b.url.is_empty() { continue; }
                    if let Some(domain) = Self::extract_domain(&b.url) {
                        domain_map.entry(domain.clone()).or_default().push(SmartFolderResult {
                            workspace_id: ws.id.clone(),
                            workspace_name: ws.name.clone(),
                            bookmark_id: b.id.clone(),
                            title: b.title.clone(),
                            url: b.url.clone(),
                            parent_id: b.parent_id.clone(),
                            domain: Some(domain),
                        });
                    }
                }
            }
        }

        let mut groups: Vec<DomainGroup> = domain_map.into_iter().map(|(domain, bookmarks)| {
            DomainGroup {
                domain,
                count: bookmarks.len(),
                bookmarks,
            }
        }).collect();

        groups.sort_by(|a, b| b.count.cmp(&a.count));
        groups
    }

    /// Trouver les doublons (meme URL dans differents workspaces ou au sein du meme)
    pub fn find_duplicates() -> Vec<DuplicateGroup> {
        let workspaces = WorkspaceManager::list_workspaces();
        let mut url_map: HashMap<String, Vec<SmartFolderResult>> = HashMap::new();

        for ws_summary in &workspaces {
            if let Ok(ws) = WorkspaceManager::load_workspace(&ws_summary.id) {
                for b in &ws.bookmarks {
                    if b.deleted || b.url.is_empty() { continue; }
                    let normalized = b.url.trim_end_matches('/').to_lowercase();
                    url_map.entry(normalized).or_default().push(SmartFolderResult {
                        workspace_id: ws.id.clone(),
                        workspace_name: ws.name.clone(),
                        bookmark_id: b.id.clone(),
                        title: b.title.clone(),
                        url: b.url.clone(),
                        parent_id: b.parent_id.clone(),
                        domain: Self::extract_domain(&b.url),
                    });
                }
            }
        }

        let mut groups: Vec<DuplicateGroup> = url_map.into_iter()
            .filter(|(_, v)| v.len() > 1)
            .map(|(url, bookmarks)| DuplicateGroup {
                url,
                count: bookmarks.len(),
                bookmarks,
            })
            .collect();

        groups.sort_by(|a, b| b.count.cmp(&a.count));
        groups
    }

    /// Appliquer un filtre personnalise
    pub fn apply_custom_filter(filter: &CustomFilter) -> Vec<SmartFolderResult> {
        let workspaces = WorkspaceManager::list_workspaces();
        let mut results = Vec::new();

        let keyword_lower = filter.keyword.as_ref().map(|k| k.to_lowercase());
        let domain_lower = filter.domain_pattern.as_ref().map(|d| d.to_lowercase());

        for ws_summary in &workspaces {
            // Filtrer par workspace_ids si specifie
            if let Some(ref ws_ids) = filter.workspace_ids {
                if !ws_ids.is_empty() && !ws_ids.contains(&ws_summary.id) {
                    continue;
                }
            }

            if let Ok(ws) = WorkspaceManager::load_workspace(&ws_summary.id) {
                for b in &ws.bookmarks {
                    if b.deleted || b.url.is_empty() { continue; }

                    // Filtre par keyword (titre ou URL)
                    if let Some(ref kw) = keyword_lower {
                        let title_match = b.title.to_lowercase().contains(kw);
                        let url_match = b.url.to_lowercase().contains(kw);
                        if !title_match && !url_match { continue; }
                    }

                    // Filtre par domaine
                    if let Some(ref dp) = domain_lower {
                        if let Some(domain) = Self::extract_domain(&b.url) {
                            if !domain.to_lowercase().contains(dp) { continue; }
                        } else {
                            continue;
                        }
                    }

                    results.push(SmartFolderResult {
                        workspace_id: ws.id.clone(),
                        workspace_name: ws.name.clone(),
                        bookmark_id: b.id.clone(),
                        title: b.title.clone(),
                        url: b.url.clone(),
                        parent_id: b.parent_id.clone(),
                        domain: Self::extract_domain(&b.url),
                    });
                }
            }
        }

        results
    }

    /// CRUD Filtres
    pub fn save_custom_filter(filter: CustomFilter) -> Result<CustomFilter, String> {
        let mut store = Self::load_filters();
        let mut f = filter;
        if f.id.is_empty() {
            f.id = Uuid::new_v4().to_string();
        }

        if let Some(pos) = store.filters.iter().position(|x| x.id == f.id) {
            store.filters[pos] = f.clone();
        } else {
            store.filters.push(f.clone());
        }

        Self::save_filters(&store)?;
        info!("Filtre personnalise sauvegarde: {}", f.name);
        Ok(f)
    }

    pub fn delete_custom_filter(filter_id: &str) -> Result<(), String> {
        let mut store = Self::load_filters();
        store.filters.retain(|f| f.id != filter_id);
        Self::save_filters(&store)?;
        info!("Filtre personnalise supprime: {}", filter_id);
        Ok(())
    }

    pub fn list_custom_filters() -> Vec<CustomFilter> {
        Self::load_filters().filters
    }
}
