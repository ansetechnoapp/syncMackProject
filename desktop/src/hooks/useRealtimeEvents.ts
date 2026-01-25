import { useEffect } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { BookmarksData, SyncStatus, ConnectedClient } from "./useTauriCommands";

// Types d'événements émis par le backend
export type BookmarksUpdatedEvent = BookmarksData;
export type SyncStatusUpdatedEvent = SyncStatus;
export type ClientsUpdatedEvent = ConnectedClient[];

interface RealtimeEventHandlers {
  onBookmarksUpdated?: (data: BookmarksData) => void;
  onSyncStatusUpdated?: (status: SyncStatus) => void;
  onClientsUpdated?: (clients: ConnectedClient[]) => void;
}

/**
 * Hook pour écouter les événements temps réel du backend Tauri
 */
export function useRealtimeEvents(handlers: RealtimeEventHandlers) {
  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    const setupListeners = async () => {
      // Écouter les mises à jour des favoris
      if (handlers.onBookmarksUpdated) {
        const unlisten = await listen<BookmarksUpdatedEvent>("bookmarks_updated", (event) => {
          console.log("Event received: bookmarks_updated", event.payload);
          handlers.onBookmarksUpdated?.(event.payload);
        });
        unlisteners.push(unlisten);
      }

      // Écouter les mises à jour du statut de synchronisation
      if (handlers.onSyncStatusUpdated) {
        const unlisten = await listen<SyncStatusUpdatedEvent>("sync_status_updated", (event) => {
          console.log("Event received: sync_status_updated", event.payload);
          handlers.onSyncStatusUpdated?.(event.payload);
        });
        unlisteners.push(unlisten);
      }

      // Écouter les mises à jour des clients connectés
      if (handlers.onClientsUpdated) {
        const unlisten = await listen<ClientsUpdatedEvent>("clients_updated", (event) => {
          console.log("Event received: clients_updated", event.payload);
          handlers.onClientsUpdated?.(event.payload);
        });
        unlisteners.push(unlisten);
      }
    };

    setupListeners();

    // Cleanup: retirer tous les listeners à la destruction du composant
    return () => {
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [handlers.onBookmarksUpdated, handlers.onSyncStatusUpdated, handlers.onClientsUpdated]);
}

/**
 * Hook simplifié pour écouter un seul événement
 */
export function useBookmarksUpdated(callback: (data: BookmarksData) => void) {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    listen<BookmarksUpdatedEvent>("bookmarks_updated", (event) => {
      console.log("Bookmarks updated:", event.payload);
      callback(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [callback]);
}

export function useSyncStatusUpdated(callback: (status: SyncStatus) => void) {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    listen<SyncStatusUpdatedEvent>("sync_status_updated", (event) => {
      console.log("Sync status updated:", event.payload);
      callback(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [callback]);
}

export function useClientsUpdated(callback: (clients: ConnectedClient[]) => void) {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    listen<ClientsUpdatedEvent>("clients_updated", (event) => {
      console.log("Clients updated:", event.payload);
      callback(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [callback]);
}
