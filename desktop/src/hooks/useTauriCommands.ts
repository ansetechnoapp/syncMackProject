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
