import { invoke } from "@tauri-apps/api/core";

const DEFAULT_INVOKE_TIMEOUT_MS = 8000;

async function invokeWithTimeout<T>(
  command: string,
  args?: Record<string, unknown>,
  timeoutMs: number = DEFAULT_INVOKE_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      invoke<T>(command, args),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Command timeout: ${command}`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export interface Config {
  enabled: boolean;
  auto_sync: boolean;
  sync_interval: number;
  max_bookmarks: number;
  backup_enabled: boolean;
  websocket_port: number;
  theme?: "light" | "dark" | "system";
}

export interface BookmarkData {
  id?: string;
  title?: string;
  url?: string;
  parentId?: string;
  dateAdded?: number;
  isFolder?: boolean;
  children?: TreeNode[];
}

export interface FolderData {
  id?: string;
  title?: string;
  parentId?: string;
  dateAdded?: number;
}

export interface TreeNode {
  id?: string;
  title?: string;
  url?: string;
  parentId?: string;
  dateAdded?: number;
  isFolder?: boolean;
  children?: TreeNode[];
}

export interface BookmarksTree {
  items: TreeNode[];
  total_bookmarks: number;
  total_folders: number;
}

export interface BookmarksData {
  version: string;
  created_at: string | null;
  last_updated: string | null;
  bookmarks: BookmarkData[];
  folders: unknown[];
  metadata: {
    total_bookmarks: number;
    total_folders: number;
    sync_enabled: boolean;
  };
}

export interface SyncStatus {
  last_sync: string | null;
  sync_in_progress: boolean;
  total_bookmarks: number;
  connected_clients: number;
  last_error: string | null;
}

export interface ConnectedClient {
  id: string;
  browser: string;
  browser_instance_id?: string;
  connected_at: string;
  last_activity: string;
  workspace_id?: string;
}

// ==================== Interfaces Workspaces ====================

export interface WorkspaceSummary {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  total_bookmarks: number;
  total_folders: number;
  open_conflicts?: number;
  created_at: string;
  updated_at: string;
  version?: number;
}

export interface Workspace {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
  bookmarks: BookmarkData[];
  folders: FolderData[];
  version: number;
}

export interface WorkspaceConflict {
  id: string;
  workspaceId: string;
  itemType: string;
  syncId: string;
  detectedAt: string;
  status: string;
  desktopSnapshot: unknown;
  incomingSnapshot: unknown;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolution?: string | null;
}

export enum ItemType {
  Bookmark = "bookmark",
  Folder = "folder",
}

export interface MoveOperation {
  itemId: string;
  itemType: ItemType;
  sourceParentId?: string;
  targetParentId?: string;
  targetPosition?: number;
}

export interface BatchMoveOperation {
  sourceWorkspaceId: string;
  targetWorkspaceId: string;
  operations: MoveOperation[];
  preserveHierarchy: boolean;
}

export interface BatchMoveResult {
  success: boolean;
  movedCount: number;
  errors: string[];
}

export interface WorkspaceAssignment {
  browser_id: string;
  browser_name: string;
  workspace_id?: string;
  assigned_at: string;
}

export async function getConfig(): Promise<Config> {
  return invokeWithTimeout<Config>("get_config");
}

export async function saveConfig(config: Config): Promise<boolean> {
  return invokeWithTimeout<boolean>("save_config", { config });
}

export async function getBookmarks(): Promise<BookmarksData> {
  return invokeWithTimeout<BookmarksData>("get_bookmarks", undefined, 12000);
}

export async function syncBookmarks(extensionBookmarks: BookmarkData[]): Promise<BookmarkData[]> {
  return invokeWithTimeout<BookmarkData[]>("sync_bookmarks", { extensionBookmarks }, 20000);
}

export async function addBookmark(bookmark: BookmarkData): Promise<boolean> {
  return invokeWithTimeout<boolean>("add_bookmark", { bookmark });
}

export async function removeBookmark(bookmarkId: string): Promise<boolean> {
  return invokeWithTimeout<boolean>("remove_bookmark", { bookmarkId });
}

export async function updateBookmark(bookmarkId: string, bookmark: BookmarkData): Promise<boolean> {
  return invokeWithTimeout<boolean>("update_bookmark", { bookmarkId, bookmark });
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return invokeWithTimeout<SyncStatus>("get_sync_status");
}

export async function getConnectedClients(): Promise<ConnectedClient[]> {
  return invokeWithTimeout<ConnectedClient[]>("get_connected_clients");
}

export async function requestSyncFromExtensions(): Promise<void> {
  return invokeWithTimeout<void>("request_sync_from_extensions", undefined, 12000);
}

export async function getDataDirectory(): Promise<string> {
  return invokeWithTimeout<string>("get_data_directory");
}

// ==================== Fonctions pour les dossiers ====================

export async function getBookmarksTree(): Promise<BookmarksTree> {
  return invokeWithTimeout<BookmarksTree>("get_bookmarks_tree", undefined, 12000);
}

export async function addFolder(folder: FolderData): Promise<boolean> {
  return invokeWithTimeout<boolean>("add_folder", { folder });
}

export async function removeFolder(folderId: string): Promise<boolean> {
  return invokeWithTimeout<boolean>("remove_folder", { folderId });
}

export async function updateFolder(folderId: string, folder: FolderData): Promise<boolean> {
  return invokeWithTimeout<boolean>("update_folder", { folderId, folder });
}

// ==================== Fonctions pour les Workspaces ====================

export async function getWorkspaces(): Promise<WorkspaceSummary[]> {
  return invokeWithTimeout<WorkspaceSummary[]>("get_workspaces");
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  return invokeWithTimeout<Workspace>("get_workspace", { workspaceId });
}

export async function createWorkspace(name: string, color?: string): Promise<Workspace> {
  return invokeWithTimeout<Workspace>("create_workspace", { name, color });
}

export async function updateWorkspace(
  workspaceId: string,
  name?: string,
  color?: string,
  icon?: string
): Promise<Workspace> {
  return invokeWithTimeout<Workspace>("update_workspace", { workspaceId, name, color, icon });
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  return invokeWithTimeout<void>("delete_workspace", { workspaceId });
}

export async function duplicateWorkspace(workspaceId: string, newName: string): Promise<Workspace> {
  return invokeWithTimeout<Workspace>("duplicate_workspace", { workspaceId, newName });
}

// ==================== Corbeille Workspaces ====================

export interface DeletedWorkspace {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  totalBookmarks: number;
  totalFolders: number;
  deletedAt: string;
  backupPath: string;
}

export async function getDeletedWorkspaces(): Promise<DeletedWorkspace[]> {
  return invokeWithTimeout<DeletedWorkspace[]>("get_deleted_workspaces");
}

export async function restoreWorkspace(workspaceId: string): Promise<Workspace> {
  return invokeWithTimeout<Workspace>("restore_workspace", { workspaceId });
}

export async function permanentlyDeleteWorkspace(workspaceId: string): Promise<void> {
  return invokeWithTimeout<void>("permanently_delete_workspace", { workspaceId });
}

export async function emptyTrash(): Promise<number> {
  return invokeWithTimeout<number>("empty_trash");
}

export async function getWorkspaceAssignments(): Promise<WorkspaceAssignment[]> {
  return invokeWithTimeout<WorkspaceAssignment[]>("get_workspace_assignments");
}

export async function assignWorkspaceToBrowser(browserId: string, workspaceId: string): Promise<void> {
  return invokeWithTimeout<void>("assign_workspace_to_browser", { browserId, workspaceId });
}

export async function unassignWorkspaceFromBrowser(browserId: string): Promise<void> {
  return invokeWithTimeout<void>("unassign_workspace_from_browser", { browserId });
}

export async function checkLegacyMigration(): Promise<boolean> {
  return invokeWithTimeout<boolean>("check_legacy_migration");
}

export async function runLegacyMigration(): Promise<Workspace> {
  return invokeWithTimeout<Workspace>("run_legacy_migration", undefined, 30000);
}

export async function getWorkspaceTree(workspaceId: string): Promise<BookmarksTree> {
  return invokeWithTimeout<BookmarksTree>("get_workspace_tree", { workspaceId }, 12000);
}

export async function getWorkspaceConflicts(workspaceId: string): Promise<WorkspaceConflict[]> {
  return invokeWithTimeout<WorkspaceConflict[]>("get_workspace_conflicts", { workspaceId }, 12000);
}

export async function resolveWorkspaceConflict(
  workspaceId: string,
  conflictId: string,
  resolution: "keep_desktop" | "keep_incoming"
): Promise<Workspace> {
  return invokeWithTimeout<Workspace>("resolve_workspace_conflict", { workspaceId, conflictId, resolution }, 20000);
}

export async function exportWorkspaceToFile(workspaceId: string): Promise<string> {
  return invokeWithTimeout<string>("export_workspace_to_file", { workspaceId }, 20000);
}

export async function importWorkspaceFromFile(path: string, mode: "create"): Promise<Workspace> {
  return invokeWithTimeout<Workspace>("import_workspace_from_file", { path, mode }, 30000);
}

export async function createBackup(): Promise<string> {
  return invokeWithTimeout<string>("create_backup", undefined, 30000);
}

export async function restoreBackup(path: string): Promise<string> {
  return invokeWithTimeout<string>("restore_backup", { path }, 60000);
}

export async function addBookmarkToWorkspace(workspaceId: string, bookmark: BookmarkData): Promise<boolean> {
  return invokeWithTimeout<boolean>("add_bookmark_to_workspace", { workspaceId, bookmark });
}

export async function removeBookmarkFromWorkspace(workspaceId: string, bookmarkId: string): Promise<boolean> {
  return invokeWithTimeout<boolean>("remove_bookmark_from_workspace", { workspaceId, bookmarkId });
}

export async function updateBookmarkInWorkspace(
  workspaceId: string,
  bookmarkId: string,
  updates: { title?: string; url?: string; parentId?: string }
): Promise<boolean> {
  return invokeWithTimeout<boolean>("update_bookmark_in_workspace", {
    workspaceId,
    bookmarkId,
    title: updates.title,
    url: updates.url,
    parentId: updates.parentId,
  });
}

export async function batchMoveItems(operation: BatchMoveOperation): Promise<BatchMoveResult> {
  return invokeWithTimeout<BatchMoveResult>("batch_move_items", { operation }, 30000);
}

// ==================== Recherche Globale ====================

export interface SearchResult {
  workspaceId: string;
  workspaceName: string;
  itemType: string;
  itemId: string;
  title: string;
  url?: string;
  parentPath: string[];
  relevanceScore: number;
}

export async function searchBookmarksGlobal(
  query: string,
  workspaceIds?: string[] | null
): Promise<SearchResult[]> {
  return invokeWithTimeout<SearchResult[]>("search_bookmarks_global", { query, workspaceIds }, 15000);
}

// ==================== Historique de Sync ====================

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  operationType: string;
  source: string;
  workspaceId?: string;
  itemsCount: number;
  success: boolean;
  errorMessage?: string;
}

export async function getSyncHistory(limit?: number): Promise<SyncLogEntry[]> {
  return invokeWithTimeout<SyncLogEntry[]>("get_sync_history", { limit: limit || 100 });
}

export async function clearSyncHistory(): Promise<void> {
  return invokeWithTimeout<void>("clear_sync_history");
}

// ==================== Smart Folders ====================

export interface SmartFolderResult {
  workspaceId: string;
  workspaceName: string;
  bookmarkId: string;
  title: string;
  url: string;
  parentId: string;
  domain?: string;
}

export interface DomainGroup {
  domain: string;
  count: number;
  bookmarks: SmartFolderResult[];
}

export interface DuplicateGroup {
  url: string;
  count: number;
  bookmarks: SmartFolderResult[];
}

export interface CustomFilter {
  id: string;
  name: string;
  keyword?: string;
  domainPattern?: string;
  dateFrom?: string;
  dateTo?: string;
  workspaceIds?: string[];
}

export async function getSmartFolderRecent(days?: number): Promise<SmartFolderResult[]> {
  return invokeWithTimeout<SmartFolderResult[]>("get_smart_folder_recent", { days: days || 7 });
}

export async function getSmartFolderByDomain(): Promise<DomainGroup[]> {
  return invokeWithTimeout<DomainGroup[]>("get_smart_folder_by_domain");
}

export async function getSmartFolderDuplicates(): Promise<DuplicateGroup[]> {
  return invokeWithTimeout<DuplicateGroup[]>("get_smart_folder_duplicates");
}

export async function applyCustomSmartFilter(filter: CustomFilter): Promise<SmartFolderResult[]> {
  return invokeWithTimeout<SmartFolderResult[]>("apply_custom_smart_filter", { filter });
}

export async function saveCustomFilter(filter: CustomFilter): Promise<void> {
  return invokeWithTimeout<void>("save_custom_filter", { filter });
}

export async function deleteCustomFilter(filterId: string): Promise<void> {
  return invokeWithTimeout<void>("delete_custom_filter", { filterId });
}

export async function listCustomFilters(): Promise<CustomFilter[]> {
  return invokeWithTimeout<CustomFilter[]>("list_custom_filters");
}

// ==================== Multi-Navigateur ====================

export async function assignWorkspaceToBrowserWithMode(
  browserId: string,
  workspaceId: string,
  mode?: string
): Promise<void> {
  return invokeWithTimeout<void>("assign_workspace_to_browser_with_mode", {
    browserId,
    workspaceId,
    mode: mode || "ReadWrite",
  });
}

// ==================== Auto-Update ====================

export async function checkForUpdates(): Promise<string | null> {
  return invokeWithTimeout<string | null>("check_for_updates", undefined, 15000);
}
