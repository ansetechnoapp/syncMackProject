import { invoke } from "@tauri-apps/api/core";

export interface Config {
  enabled: boolean;
  auto_sync: boolean;
  sync_interval: number;
  max_bookmarks: number;
  backup_enabled: boolean;
  websocket_port: number;
}

export interface BookmarkData {
  id?: string;
  title?: string;
  url?: string;
  parentId?: string;
  dateAdded?: number;
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
  connected_at: string;
  last_activity: string;
}

export async function getConfig(): Promise<Config> {
  return invoke<Config>("get_config");
}

export async function saveConfig(config: Config): Promise<boolean> {
  return invoke<boolean>("save_config", { config });
}

export async function getBookmarks(): Promise<BookmarksData> {
  return invoke<BookmarksData>("get_bookmarks");
}

export async function syncBookmarks(extensionBookmarks: BookmarkData[]): Promise<BookmarkData[]> {
  return invoke<BookmarkData[]>("sync_bookmarks", { extensionBookmarks });
}

export async function addBookmark(bookmark: BookmarkData): Promise<boolean> {
  return invoke<boolean>("add_bookmark", { bookmark });
}

export async function removeBookmark(bookmarkId: string): Promise<boolean> {
  return invoke<boolean>("remove_bookmark", { bookmarkId });
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return invoke<SyncStatus>("get_sync_status");
}

export async function getConnectedClients(): Promise<ConnectedClient[]> {
  return invoke<ConnectedClient[]>("get_connected_clients");
}

export async function requestSyncFromExtensions(): Promise<void> {
  return invoke<void>("request_sync_from_extensions");
}

export async function getDataDirectory(): Promise<string> {
  return invoke<string>("get_data_directory");
}
