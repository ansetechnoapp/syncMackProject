import { useEffect, useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { listen } from '@tauri-apps/api/event';
import { Virtuoso } from 'react-virtuoso';
import { getWorkspaceTree, BookmarksTree, ConnectedClient, WorkspaceAssignment } from '../hooks/useTauriCommands';
import { BookmarkItem } from './BookmarkItem';
import type { BookmarkNode } from './BookmarkItem';
import { flattenBookmarkTree } from '../utils/bookmarkUtils';

interface WorkspaceColumnProps {
  workspaceId: string;
  title: string;
  color: string;
  clients: ConnectedClient[];
  assignments: WorkspaceAssignment[];
  onAssignBrowser: (browserId: string) => void;
  onUnassignBrowser: (browserId: string) => void;
  onEditBookmark: (wsId: string, bId: string) => void;
  onDeleteBookmark: (wsId: string, bId: string) => void;
  onAddBookmark: (wsId: string) => void;
  onAddFolder: (wsId: string) => void;
}

export default function WorkspaceColumn({
  workspaceId,
  title,
  color,
  clients,
  assignments,
  onAssignBrowser,
  onUnassignBrowser,
  onEditBookmark,
  onDeleteBookmark,
  onAddBookmark,
  onAddFolder
}: WorkspaceColumnProps) {
  const [tree, setTree] = useState<BookmarksTree | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { setNodeRef, isOver } = useDroppable({
    id: workspaceId,
    data: { type: 'workspace', workspaceId }
  });

  const loadData = async () => {
    try {
      const data = await getWorkspaceTree(workspaceId);
      setTree(data);
    } catch (e) {
      console.error(`Error loading workspace ${workspaceId}:`, e);
    } finally {
      setLoading(false);
    }
  };

  const loadDataCallback = useCallback(() => {
    loadData();
  }, [workspaceId]);

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  // Real-time updates - listen to workspaces_updated event
  useEffect(() => {
    let disposed = false;

    const setup = async () => {
      const unlisten = await listen('workspaces_updated', () => {
        if (!disposed) {
          loadDataCallback();
        }
      });

      if (disposed) {
        unlisten();
        return;
      }

      return unlisten;
    };

    let unlistenFn: (() => void) | undefined;
    setup().then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      disposed = true;
      unlistenFn?.();
    };
  }, [loadDataCallback]);

  const bookmarks = tree ? flattenBookmarkTree(tree.items) : [];
  const folderCount = tree?.total_folders || 0;
  const bookmarkCount = tree?.total_bookmarks || bookmarks.length;

  // Trouver le navigateur assigné à ce workspace
  const assignedBrowser = assignments.find(a => a.workspace_id === workspaceId);
  const assignedBrowserId = assignedBrowser?.browser_id || "";

  const handleBrowserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      onAssignBrowser(value);
    } else if (assignedBrowserId) {
      onUnassignBrowser(assignedBrowserId);
    }
  };

  return (
    <div className="workspace-column" style={{ borderTop: `4px solid ${color}` }}>
      <div className="column-header" style={{ backgroundColor: `${color}15` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: color, margin: 0 }}>{title}</h3>
            <span className="badge" title={`${bookmarkCount} favoris, ${folderCount} dossiers`}>
                {bookmarkCount} fav, {folderCount} dos
            </span>
        </div>
        <div style={{ marginBottom: '6px' }}>
            <select
                value={assignedBrowserId}
                onChange={handleBrowserChange}
                className="browser-select-compact"
            >
                <option value="">-- Aucun navigateur --</option>
                {clients.map(client => {
                    const browserId = client.browser_instance_id;
                    const label = (!client.browser || client.browser === "Unknown" || client.browser === "Unknown Browser")
                        ? "Navigateur Inconnu"
                        : client.browser;
                    return (
                        <option key={client.id} value={browserId}>
                            {label}
                        </option>
                    );
                })}
            </select>
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
            <button
                className="btn-xs btn-outline"
                onClick={() => onAddBookmark(workspaceId)}
                title="Ajouter un favori"
            >
                + Favori
            </button>
            <button
                className="btn-xs btn-outline"
                onClick={() => onAddFolder(workspaceId)}
                title="Ajouter un dossier"
            >
                + Dossier
            </button>
        </div>
      </div>
      
      <div
        ref={setNodeRef}
        className={`column-body ${isOver ? 'is-over' : ''}`}
        style={{ flex: 1, minHeight: 0 }}
      >
        {loading ? (
          <div className="loading-spinner">...</div>
        ) : bookmarks.length === 0 ? (
          <div className="empty-state-small">Vide</div>
        ) : bookmarks.length <= 30 ? (
          <div className="bookmarks-list">
            {bookmarks.map(node => (
              <BookmarkItem
                key={node.id}
                node={node}
                workspaceId={workspaceId}
                onEdit={(id) => onEditBookmark(workspaceId, id)}
                onDelete={(id) => onDeleteBookmark(workspaceId, id)}
                isCompact={true}
              />
            ))}
          </div>
        ) : (
          <Virtuoso
            style={{ height: '100%' }}
            data={bookmarks}
            overscan={10}
            itemContent={(_index: number, node: BookmarkNode) => (
              <BookmarkItem
                key={node.id}
                node={node}
                workspaceId={workspaceId}
                onEdit={(id) => onEditBookmark(workspaceId, id)}
                onDelete={(id) => onDeleteBookmark(workspaceId, id)}
                isCompact={true}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
