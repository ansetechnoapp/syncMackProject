import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  pointerWithin,
} from '@dnd-kit/core';
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
import { BookmarkItem } from './BookmarkItem'; // For DragOverlay

export default function WorkspacesPanel() {
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
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor)
  );

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

    return () => {
      unlistenWorkspaces.then(f => f());
      unlistenAssignments.then(f => f());
      unlistenClients.then(f => f());
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

  const handleDragStart = (event: any) => {
      setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const sourceWorkspaceId = active.data.current?.sourceWorkspaceId;
    const destWorkspaceId = over.id as string; // WorkspaceColumn id is workspaceId
    const bookmarkData = active.data.current;

    // Check if moving to a different workspace
    // Also ensure we are dropping onto a workspace column (check type if needed, but id should be enough)
    if (sourceWorkspaceId && destWorkspaceId && sourceWorkspaceId !== destWorkspaceId) {
        // Prevent moving folders for now if complex
        if (bookmarkData && bookmarkData.isFolder) {
            // Optional: Show toast "Moving folders not supported yet"
            console.warn("Moving folders between workspaces not fully supported yet");
            return;
        }

        try {
            // 1. Add to destination
            // Clean data: remove DnD specific props
            if (bookmarkData) {
                const { sourceWorkspaceId: _, sortable: __, type: ___, ...cleanBookmark } = bookmarkData;
                
                await addBookmarkToWorkspace(destWorkspaceId, cleanBookmark);

                // 2. Remove from source
                if (bookmarkData.id) {
                    await removeBookmarkFromWorkspace(sourceWorkspaceId, bookmarkData.id);
                }
            }

        } catch (e) {
            console.error("Move failed:", e);
            setError("Erreur lors du déplacement du favori");
        }
    }
  };

  const handleEditBookmark = (wsId: string, bId: string) => {
      // Implement edit modal logic if needed, or pass down to column
      console.log("Edit", wsId, bId);
  };

  const handleDeleteBookmark = async (wsId: string, bId: string) => {
      if(!confirm("Supprimer ce favori ?")) return;
      try {
          await removeBookmarkFromWorkspace(wsId, bId);
      } catch(e) {
          console.error(e);
      }
  };

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
      try {
          await addBookmarkToWorkspace(creatingBookmarkInWs, {
              title: newItemTitle,
              url: newItemUrl,
              parentId: "1", // Root
              isFolder: false
          });
          setCreatingBookmarkInWs(null);
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
        collisionDetection={pointerWithin}
    >
        <div className="workspaces-panel-kanban">
            {error && <div className="error-message">{error}</div>}

            <div className="board-header">
                <h2>Workspaces</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleRequestSync}
                    disabled={syncStatus?.sync_in_progress}
                    title="Synchroniser avec les extensions"
                  >
                    {syncStatus?.sync_in_progress ? "Sync..." : "Synchroniser"}
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                      + Nouveau Workspace
                  </button>
                </div>
            </div>

            <div className="browsers-bar">
                <div className="browsers-list-horizontal">
                    {clients.length === 0 ? (
                        <div className="empty-state-small">Aucun navigateur connecté</div>
                    ) : (
                        clients.map(client => {
                            const browserId = client.browser_instance_id;
                            const assignment = assignments.find(a => a.browser_id === browserId);
                            
                            return (
                                <div key={client.id} className="client-item-horizontal">
                                    <span className="client-icon">{getBrowserIcon(client.browser)}</span>
                                    <div className="client-info">
                                        <span className="client-browser">
                                          {(!client.browser || client.browser === "Unknown" || client.browser === "Unknown Browser")
                                            ? "Navigateur Inconnu"
                                            : client.browser}
                                        </span>
                                        <div style={{ marginTop: '2px' }}>
                                            <select 
                                                value={assignment?.workspace_id || ""} 
                                                onChange={(e) => {
                                                    if (e.target.value) assignWorkspaceToBrowser(browserId!, e.target.value);
                                                    else unassignWorkspaceFromBrowser(browserId!);
                                                }}
                                                className="browser-select-compact"
                                            >
                                                <option value="">-- Non assigné --</option>
                                                {workspaces.map(ws => (
                                                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="board-content">
                <div className="board-columns-container">
                    {workspaces.map(ws => (
                        <div key={ws.id} style={{ position: 'relative' }}>
                             {/* Workspace Actions Overlay or Header Buttons could go here */}
                             <WorkspaceColumn 
                                workspaceId={ws.id}
                                title={ws.name}
                                color={ws.color || '#3498db'}
                                onEditBookmark={handleEditBookmark}
                                onDeleteBookmark={handleDeleteBookmark}
                                onAddBookmark={handleOpenAddBookmark}
                                onAddFolder={handleOpenAddFolder}
                             />
                             <div style={{ padding: '5px', textAlign: 'center' }}>
                                <button className="btn-icon-small text-danger" onClick={() => handleDeleteWorkspace(ws.id)} title="Supprimer le workspace">
                                    🗑️
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
            
            <DragOverlay>
                {activeDragItem ? (
                     <BookmarkItem 
                        node={activeDragItem} 
                        onEdit={() => {}} 
                        onDelete={() => {}}
                        isCompact={true}
                     />
                ) : null}
            </DragOverlay>
        </div>
    </DndContext>
  );
}

function getBrowserIcon(browser: string): string {
  const name = browser.toLowerCase();
  if (name.includes('chrome')) return '🌐';
  if (name.includes('firefox')) return '🦊';
  if (name.includes('edge')) return '🔷';
  if (name.includes('brave')) return '🦁';
  if (name.includes('opera')) return '🔴';
  if (name.includes('safari')) return '🧭';
  return '🌐';
}
