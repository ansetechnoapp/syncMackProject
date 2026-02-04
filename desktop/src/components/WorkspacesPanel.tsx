import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  rectIntersection,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  RotateCw,
  Plus,
  Trash2,
  Undo2,
  Redo2
} from 'lucide-react';
import {
  getWorkspaces,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceAssignments,
  assignWorkspaceToBrowser,
  unassignWorkspaceFromBrowser,
  getConnectedClients,
  removeBookmarkFromWorkspace,
  addBookmarkToWorkspace,
  updateBookmarkInWorkspace,
  batchMoveItems,
  BatchMoveOperation,
  ItemType,
  requestSyncFromExtensions,
  getSyncStatus,
  WorkspaceSummary,
  WorkspaceAssignment,
  ConnectedClient,
  SyncStatus,
} from '../hooks/useTauriCommands';
import { listen } from '@tauri-apps/api/event';
import { useSyncStatusUpdated } from "../hooks/useRealtimeEvents";
import WorkspaceColumn from './WorkspaceColumn';
import { BookmarkItemContent } from './BookmarkItem'; // For DragOverlay
import { useToast } from './Toast';
import { useActionHistory } from '../hooks/useActionHistory';

interface DragItemData {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  isFolder?: boolean;
  sourceWorkspaceId?: string;
}

export default function WorkspacesPanel() {
  // ... (state remains valid, just updating imports) 
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [assignments, setAssignments] = useState<WorkspaceAssignment[]>([]);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceColor, setNewWorkspaceColor] = useState('#3498db');

  // Item Creation State
  const [creatingBookmarkInWs, setCreatingBookmarkInWs] = useState<string | null>(null);
  const [creatingFolderInWs, setCreatingFolderInWs] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemUrl, setNewItemUrl] = useState("");

  // DnD State
  const [activeDragItem, setActiveDragItem] = useState<DragItemData | null>(null);

  // Edit Bookmark Modal
  const [editingBookmark, setEditingBookmark] = useState<{ wsId: string; bookmarkId: string; title: string; url: string } | null>(null);

  const { addToast } = useToast();
  const { recordAction, undo, redo, canUndo, canRedo } = useActionHistory();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor)
  );

  // Custom collision detection that prioritizes workspace droppables
  const customCollisionDetection: CollisionDetection = (args) => {
    const collisions = rectIntersection(args);

    // Prioritize workspace droppables over bookmark items
    const workspaceCollision = collisions.find(
      (collision) => collision.data?.droppableContainer?.data?.current?.type === 'workspace'
    );

    if (workspaceCollision) {
      return [workspaceCollision];
    }

    return collisions;
  };

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [ws, assign, cl, status] = await Promise.all([
        getWorkspaces(),
        getWorkspaceAssignments(),
        getConnectedClients(),
        getSyncStatus(),
      ]);
      setWorkspaces(ws);
      setAssignments(assign);
      setClients(cl);
      setSyncStatus(status);
      setError(null);
    } catch (e) {
      setError(`Erreur chargement: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unlistenWorkspaces = listen('workspaces_updated', loadData);
    const unlistenAssignments = listen('assignments_updated', loadData);
    const unlistenClients = listen('clients_updated', loadData);
    const unlistenConflict = listen<{ workspaceId: string; conflictId: string; syncId: string; itemType: string }>('conflict_detected', (event) => {
      addToast(`Conflit détecté dans le workspace (${event.payload.itemType})`, 'warning', { duration: 8000 });
    });

    return () => {
      unlistenWorkspaces.then(f => f());
      unlistenAssignments.then(f => f());
      unlistenClients.then(f => f());
      unlistenConflict.then(f => f());
    };
  }, []);

  const handleSyncStatusUpdate = (newStatus: SyncStatus) => {
    setSyncStatus(newStatus);
  };

  useSyncStatusUpdated(handleSyncStatusUpdate);

  // Handlers
  const handleRequestSync = async () => {
    try {
      await requestSyncFromExtensions();
    } catch (error) {
      console.error("Failed to request sync:", error);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      await createWorkspace(newWorkspaceName.trim(), newWorkspaceColor);
      setShowCreateModal(false);
      setNewWorkspaceName('');
      setNewWorkspaceColor('#3498db');
      await loadData();
    } catch (e) {
      setError(`Erreur création: ${e}`);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!confirm('Supprimer ce workspace ?')) return;
    try {
      await deleteWorkspace(workspaceId);
      await loadData();
    } catch (e) {
      setError(`Erreur suppression: ${e}`);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current as DragItemData);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    // ... Drag logic unchanged ...
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const sourceWorkspaceId = active.data.current?.sourceWorkspaceId;
    const bookmarkData = active.data.current;

    let destWorkspaceId: string | undefined;

    if (over.data.current?.type === 'workspace') {
      destWorkspaceId = over.data.current.workspaceId;
    } else if (over.data.current?.sourceWorkspaceId) {
      destWorkspaceId = over.data.current.sourceWorkspaceId;
    } else {
      destWorkspaceId = over.id as string;
    }

    if (sourceWorkspaceId && destWorkspaceId && sourceWorkspaceId !== destWorkspaceId) {
      try {
        if (bookmarkData && bookmarkData.id) {
          const operation: BatchMoveOperation = {
            sourceWorkspaceId,
            targetWorkspaceId: destWorkspaceId,
            operations: [{
              itemId: bookmarkData.id,
              itemType: bookmarkData.isFolder ? ItemType.Folder : ItemType.Bookmark,
              targetParentId: '1',
              sourceParentId: bookmarkData.parentId
            }],
            preserveHierarchy: true
          };

          const result = await batchMoveItems(operation);

          if (!result.success) {
            setError(`Erreur déplacement: ${result.errors.join(', ')}`);
          } else {
            await loadData();
          }
        }

      } catch (e) {
        console.error("Move failed:", e);
        setError("Erreur lors du déplacement du favori");
      }
    }
  };

  const handleEditBookmark = (wsId: string, bId: string) => {
    setEditingBookmark({ wsId, bookmarkId: bId, title: '', url: '' });
  };

  const submitEditBookmark = async () => {
    if (!editingBookmark) return;
    try {
      await updateBookmarkInWorkspace(editingBookmark.wsId, editingBookmark.bookmarkId, {
        title: editingBookmark.title || undefined,
        url: editingBookmark.url || undefined,
      });
      setEditingBookmark(null);
    } catch (e) {
      console.error(e);
      setError(`Erreur modification: ${e}`);
    }
  };

  const handleDeleteBookmark = async (wsId: string, bId: string) => {
    if (!confirm("Supprimer ce favori ?")) return;
    try {
      await removeBookmarkFromWorkspace(wsId, bId);
      recordAction({
        type: 'delete_bookmark',
        workspaceId: wsId,
        description: `Suppression du favori ${bId}`,
        undoFn: async () => {
          addToast('Annulation non disponible pour cette action', 'warning');
        },
        redoFn: async () => {
          await removeBookmarkFromWorkspace(wsId, bId);
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ... Add Bookmark/Folder Handlers Unchanged ...
  const handleOpenAddBookmark = (wsId: string) => {
    setCreatingBookmarkInWs(wsId);
    setNewItemTitle("");
    setNewItemUrl("");
  };

  const handleOpenAddFolder = (wsId: string) => {
    setCreatingFolderInWs(wsId);
    setNewItemTitle("");
    setNewItemUrl("");
  };

  const submitAddBookmark = async () => {
    if (!creatingBookmarkInWs || !newItemTitle || !newItemUrl) return;
    const wsId = creatingBookmarkInWs;
    const title = newItemTitle;
    const url = newItemUrl;
    try {
      await addBookmarkToWorkspace(wsId, {
        title,
        url,
        parentId: "1",
        isFolder: false
      });
      setCreatingBookmarkInWs(null);
      recordAction({
        type: 'add_bookmark',
        workspaceId: wsId,
        description: `Ajout du favori "${title}"`,
        undoFn: async () => {
          addToast('Annulation non disponible pour cette action', 'warning');
        },
        redoFn: async () => {
          await addBookmarkToWorkspace(wsId, { title, url, parentId: "1", isFolder: false });
        },
      });
    } catch (e) {
      console.error(e);
      setError(`Erreur ajout favori: ${e}`);
    }
  };

  const submitAddFolder = async () => {
    if (!creatingFolderInWs || !newItemTitle) return;
    try {
      await addBookmarkToWorkspace(creatingFolderInWs, {
        title: newItemTitle,
        parentId: "1", // Root
        isFolder: true
      });
      setCreatingFolderInWs(null);
    } catch (e) {
      console.error(e);
      setError(`Erreur ajout dossier: ${e}`);
    }
  };

  if (loading && workspaces.length === 0) return <div className="loading">Chargement...</div>;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={customCollisionDetection}
    >
      <div className="workspaces-panel-kanban">
        {error && <div className="error-message">{error}</div>}

        <div className="board-header">
          <h2>Workspaces</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn-xs btn-outline" onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)">
              <Undo2 size={16} />
            </button>
            <button className="btn-xs btn-outline" onClick={redo} disabled={!canRedo} title="Rétablir (Ctrl+Y)">
              <Redo2 size={16} />
            </button>
            <button
              className="btn btn-primary"
              onClick={handleRequestSync}
              disabled={syncStatus?.sync_in_progress}
              title="Synchroniser avec les extensions"
            >
              <RotateCw size={16} className={syncStatus?.sync_in_progress ? "spin" : ""} />
              {syncStatus?.sync_in_progress ? "Sync..." : "Synchroniser"}
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> Nouveau Workspace
            </button>
          </div>
        </div>

        <div className="browsers-bar">
          <span className="browsers-info">
            {clients.length === 0
              ? "Aucun navigateur connecté"
              : `${clients.length} navigateur(s) connecté(s)`}
          </span>
        </div>

        <div className="board-content">
          <div className="board-columns-container">
            {workspaces.map(ws => (
              <div key={ws.id} style={{ position: 'relative' }}>
                <WorkspaceColumn
                  workspaceId={ws.id}
                  title={ws.name}
                  color={ws.color || '#3498db'}
                  clients={clients}
                  assignments={assignments}
                  onAssignBrowser={(browserId) => assignWorkspaceToBrowser(browserId, ws.id)}
                  onUnassignBrowser={(browserId) => unassignWorkspaceFromBrowser(browserId)}
                  onEditBookmark={handleEditBookmark}
                  onDeleteBookmark={handleDeleteBookmark}
                  onAddBookmark={handleOpenAddBookmark}
                  onAddFolder={handleOpenAddFolder}
                />
                <div style={{ padding: '8px', textAlign: 'center' }}>
                  <button className="btn-icon-small text-danger" onClick={() => handleDeleteWorkspace(ws.id)} title="Supprimer le workspace">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {workspaces.length === 0 && (
              <div className="empty-state">
                Créez un workspace pour commencer
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Nouveau workspace</h3>
              <div className="form-group">
                <label>Nom</label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={e => setNewWorkspaceName(e.target.value)}
                  placeholder="Ex: Travail..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Couleur</label>
                <div className="color-picker">
                  {['#3498db', '#27ae60', '#e74c3c', '#9b59b6', '#f39c12', '#1abc9c'].map(color => (
                    <button
                      key={color}
                      className={`color-option ${newWorkspaceColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewWorkspaceColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>Annuler</button>
                <button className="btn-primary" onClick={handleCreateWorkspace} disabled={!newWorkspaceName.trim()}>Créer</button>
              </div>
            </div>
          </div>
        )}

        {/* Create Bookmark Modal */}
        {creatingBookmarkInWs && (
          <div className="modal-overlay" onClick={() => setCreatingBookmarkInWs(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Ajouter un favori</h3>
              <div className="form-group">
                <label>Titre</label>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={e => setNewItemTitle(e.target.value)}
                  placeholder="Nom du site"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>URL</label>
                <input
                  type="text"
                  value={newItemUrl}
                  onChange={e => setNewItemUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setCreatingBookmarkInWs(null)}>Annuler</button>
                <button className="btn-primary" onClick={submitAddBookmark} disabled={!newItemTitle.trim() || !newItemUrl.trim()}>Ajouter</button>
              </div>
            </div>
          </div>
        )}

        {/* Create Folder Modal */}
        {creatingFolderInWs && (
          <div className="modal-overlay" onClick={() => setCreatingFolderInWs(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Ajouter un dossier</h3>
              <div className="form-group">
                <label>Nom du dossier</label>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={e => setNewItemTitle(e.target.value)}
                  placeholder="Nom du dossier"
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setCreatingFolderInWs(null)}>Annuler</button>
                <button className="btn-primary" onClick={submitAddFolder} disabled={!newItemTitle.trim()}>Ajouter</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Bookmark Modal */}
        {editingBookmark && (
          <div className="modal-overlay" onClick={() => setEditingBookmark(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Modifier le favori</h3>
              <div className="form-group">
                <label>Titre</label>
                <input
                  type="text"
                  value={editingBookmark.title}
                  onChange={e => setEditingBookmark({ ...editingBookmark, title: e.target.value })}
                  placeholder="Nouveau titre"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>URL</label>
                <input
                  type="text"
                  value={editingBookmark.url}
                  onChange={e => setEditingBookmark({ ...editingBookmark, url: e.target.value })}
                  placeholder="Nouvelle URL"
                />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setEditingBookmark(null)}>Annuler</button>
                <button className="btn-primary" onClick={submitEditBookmark} disabled={!editingBookmark.title.trim() && !editingBookmark.url.trim()}>Enregistrer</button>
              </div>
            </div>
          </div>
        )}

        <DragOverlay>
          {activeDragItem ? (
            <BookmarkItemContent
              node={activeDragItem}
              onEdit={() => { }}
              onDelete={() => { }}
              isCompact={true}
            />
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

