import { useEffect, useRef } from "react";
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
 * Corrige le race condition si le composant est démonté avant que les listeners soient configurés
 */
export function useRealtimeEvents(handlers: RealtimeEventHandlers) {
  // Use refs to store handlers so we don't re-subscribe when they change
  const handlersRef = useRef(handlers);

  // Update refs when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let disposed = false;
    const unlisteners: UnlistenFn[] = [];

    const setupListeners = async () => {
      // Écouter les mises à jour des favoris
      // On vérifie toujours handlersRef.current pour savoir si le callback existe
      const unlistenBookmarks = await listen<BookmarksUpdatedEvent>("bookmarks_updated", (event) => {
        // console.log("Event received: bookmarks_updated", event.payload);
        handlersRef.current.onBookmarksUpdated?.(event.payload);
      });

      if (disposed) {
        unlistenBookmarks();
        return;
      }
      unlisteners.push(unlistenBookmarks);

      // Écouter les mises à jour du statut de synchronisation
      const unlistenSync = await listen<SyncStatusUpdatedEvent>("sync_status_updated", (event) => {
        handlersRef.current.onSyncStatusUpdated?.(event.payload);
      });

      if (disposed) {
        unlistenSync();
        return;
      }
      unlisteners.push(unlistenSync);

      // Écouter les mises à jour des clients connectés
      const unlistenClients = await listen<ClientsUpdatedEvent>("clients_updated", (event) => {
        handlersRef.current.onClientsUpdated?.(event.payload);
      });

      if (disposed) {
        unlistenClients();
        return;
      }
      unlisteners.push(unlistenClients);
    };

    setupListeners();

    // Cleanup: retirer tous les listeners à la destruction du composant
    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []); // Empty dependency array: subscribe once
}

/**
 * Hook simplifié pour écouter un seul événement
 * Corrige le race condition si le composant est démonté avant que listen() se résolve
 */
export function useBookmarksUpdated(callback: (data: BookmarksData) => void) {
  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | undefined;

    (async () => {
      const fn = await listen<BookmarksUpdatedEvent>("bookmarks_updated", (event) => {
        console.log("Bookmarks updated:", event.payload);
        callback(event.payload);
      });

      // Si déjà démonté, cleanup immédiat
      if (disposed) {
        fn();
        return;
      }

      unlisten = fn;
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [callback]);
}

export function useSyncStatusUpdated(callback: (status: SyncStatus) => void) {
  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | undefined;

    (async () => {
      const fn = await listen<SyncStatusUpdatedEvent>("sync_status_updated", (event) => {
        console.log("Sync status updated:", event.payload);
        callback(event.payload);
      });

      if (disposed) {
        fn();
        return;
      }

      unlisten = fn;
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [callback]);
}

export function useClientsUpdated(callback: (clients: ConnectedClient[]) => void) {
  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | undefined;

    (async () => {
      const fn = await listen<ClientsUpdatedEvent>("clients_updated", (event) => {
        console.log("Clients updated:", event.payload);
        callback(event.payload);
      });

      if (disposed) {
        fn();
        return;
      }

      unlisten = fn;
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [callback]);
}
