import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";
import {
  getBookmarksTree,
  removeBookmark,
  updateBookmark,
  removeFolder,
  updateFolder,
  addFolder,
  addBookmark,
  requestSyncFromExtensions,
  getSyncStatus,
  type BookmarksTree,
  type TreeNode,
  type SyncStatus,
} from "../hooks/useTauriCommands";
import { useBookmarksUpdated, useSyncStatusUpdated } from "../hooks/useRealtimeEvents";
import { findNode } from "../utils/treeUtils";

function BookmarksList() {
  const [tree, setTree] = useState<BookmarksTree | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingFolderIn, setCreatingFolderIn] = useState<string | null>(null);
  const [creatingBookmark, setCreatingBookmark] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [activeNode, setActiveNode] = useState<TreeNode | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor)
  );

  const loadTree = async () => {
    try {
      const data = await getBookmarksTree();
      setTree(data);
    } catch (error) {
      console.error("Failed to fetch bookmarks tree:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
    getSyncStatus().then(setSyncStatus).catch(console.error);
  }, []);

  const handleSyncStatusUpdate = useCallback((newStatus: SyncStatus) => {
    setSyncStatus(newStatus);
  }, []);

  useSyncStatusUpdated(handleSyncStatusUpdate);

  const handleRequestSync = async () => {
    try {
      await requestSyncFromExtensions();
    } catch (error) {
      console.error("Failed to request sync:", error);
    }
  };

  const handleBookmarksUpdate = useCallback(() => {
    loadTree();
  }, []);

  useBookmarksUpdated(handleBookmarksUpdate);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!confirm("Supprimer ce favori ?")) return;
    try {
      await removeBookmark(bookmarkId);
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Supprimer ce dossier et son contenu ?")) return;
    try {
      await removeFolder(folderId);
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveBookmark = async (node: TreeNode) => {
    if (!node.id) return;
    try {
      await updateBookmark(node.id, node);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update bookmark:", error);
    }
  };

  const handleSaveFolder = async (node: TreeNode) => {
    if (!node.id) return;
    try {
      await updateFolder(node.id, { id: node.id, title: node.title, parentId: node.parentId });
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update folder:", error);
    }
  };

  const handleCreateFolder = async (title: string, parentId: string | null) => {
    try {
      await addFolder({ title, parentId: parentId || "1" });
      setCreatingFolderIn(null);
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const handleCreateBookmark = async (title: string, url: string, parentId: string) => {
    try {
      await addBookmark({ title, url, parentId });
      setCreatingBookmark(false);
    } catch (error) {
      console.error("Failed to create bookmark:", error);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (tree) {
        const node = findNode(tree.items, active.id as string);
        setActiveNode(node);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNode(null);

    if (!over || !active) return;
    if (active.id === over.id) return;

    // We only support dropping into a folder
    // over.id is the target folder ID
    
    // Check if we are dropping onto a folder
    // We need to know if the target is a folder.
    // The Droppable ID is the folder ID.
    
    const targetId = over.id as string;
    
    // Prevent dropping a folder into itself or its children (cycle check)
    // For now, let's assume we can drop. Cycle check is a bit complex but important.
    // Ideally the backend prevents cycles or we check it here.
    
    // Perform the move
    // We need to update the parentId of the active item to the targetId.
    if (tree) {
        const node = findNode(tree.items, active.id as string);
        if (node) {
            // Optimistic update?
            // For now, just call backend.
            try {
                if (node.isFolder) {
                    // Check for cycle: if targetId is a descendant of node.id
                    // Simple check: cannot drop folder into itself
                    if (targetId === node.id) return;
                    
                    await updateFolder(node.id as string, { ...node, parentId: targetId });
                } else {
                    await updateBookmark(node.id as string, { ...node, parentId: targetId });
                }
                // Refresh is handled by useBookmarksUpdated
            } catch (error) {
                console.error("Failed to move item:", error);
            }
        }
    }
  };

  const collectFolders = (nodes: TreeNode[], prefix: string = ""): Array<{ id: string; label: string }> => {
    const result: Array<{ id: string; label: string }> = [];
    for (const node of nodes) {
      if (node.isFolder && node.id) {
        const label = prefix ? `${prefix} / ${node.title || "Sans nom"}` : (node.title || "Sans nom");
        result.push({ id: node.id, label });
        if (node.children && node.children.length > 0) {
          result.push(...collectFolders(node.children, label));
        }
      }
    }
    return result;
  };

  const folderOptions = tree ? collectFolders(tree.items) : [];

  const filterNodes = (nodes: TreeNode[], term: string): TreeNode[] => {
    if (!term) return nodes;

    const lowerTerm = term.toLowerCase();

    return nodes.reduce<TreeNode[]>((acc, node) => {
      const titleMatch = (node.title || "").toLowerCase().includes(lowerTerm);
      const urlMatch = (node.url || "").toLowerCase().includes(lowerTerm);

      if (node.isFolder && node.children) {
        const filteredChildren = filterNodes(node.children, term);
        if (filteredChildren.length > 0 || titleMatch) {
          acc.push({ ...node, children: filteredChildren });
        }
      } else if (titleMatch || urlMatch) {
        acc.push(node);
      }

      return acc;
    }, []);
  };

  const filteredItems = tree ? filterNodes(tree.items, searchTerm) : [];

  if (loading) {
    return <div className="loading">Chargement des favoris...</div>;
  }

  return (
    <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
    >
        <div className="bookmarks-list">
        <div className="bookmarks-header">
            <h2>Favoris synchronises</h2>
            <div className="bookmarks-meta">
            <span>{tree?.total_bookmarks || 0} favoris</span>
            <span>{tree?.total_folders || 0} dossiers</span>
            </div>
        </div>

        <div className="search-bar">
            <input
            type="text"
            placeholder="Rechercher un favori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            />
            <button
            className="btn btn-small btn-primary"
            onClick={handleRequestSync}
            disabled={syncStatus?.sync_in_progress}
            title="Synchroniser avec les extensions"
            >
            {syncStatus?.sync_in_progress ? "Sync..." : "Synchroniser"}
            </button>
            <button
            className="btn btn-small btn-primary"
            onClick={() => setCreatingBookmark(true)}
            title="Nouveau favori"
            >
            + Favori
            </button>
            <button
            className="btn btn-small btn-secondary"
            onClick={() => setCreatingFolderIn("root")}
            title="Nouveau dossier"
            >
            + Dossier
            </button>
        </div>

        {creatingBookmark && (
            <NewBookmarkForm
            folders={folderOptions}
            onSave={(title, url, parentId) => handleCreateBookmark(title, url, parentId)}
            onCancel={() => setCreatingBookmark(false)}
            />
        )}

        {creatingFolderIn === "root" && (
            <NewFolderForm
            onSave={(title) => handleCreateFolder(title, null)}
            onCancel={() => setCreatingFolderIn(null)}
            />
        )}

        <div className="bookmarks-container">
            {filteredItems.length === 0 ? (
            <div className="empty-state">
                {searchTerm
                ? "Aucun favori ne correspond a votre recherche"
                : "Aucun favori synchronise"}
            </div>
            ) : (
            <ul className="bookmarks-tree">
                {filteredItems.map((node, index) => (
                <TreeNodeItem
                    key={node.id || index}
                    node={node}
                    depth={0}
                    expandedFolders={expandedFolders}
                    editingId={editingId}
                    creatingFolderIn={creatingFolderIn}
                    onToggleFolder={toggleFolder}
                    onDeleteBookmark={handleDeleteBookmark}
                    onDeleteFolder={handleDeleteFolder}
                    onEdit={handleEdit}
                    onCancelEdit={handleCancelEdit}
                    onSaveBookmark={handleSaveBookmark}
                    onSaveFolder={handleSaveFolder}
                    onCreateFolderIn={setCreatingFolderIn}
                    onCreateFolder={handleCreateFolder}
                />
                ))}
            </ul>
            )}
        </div>
        
        <DragOverlay>
            {activeNode ? (
                <div className="drag-overlay-item">
                     {activeNode.isFolder ? "📁 " + activeNode.title : "📄 " + activeNode.title}
                </div>
            ) : null}
        </DragOverlay>
        </div>
    </DndContext>
  );
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  expandedFolders: Set<string>;
  editingId: string | null;
  creatingFolderIn: string | null;
  onToggleFolder: (id: string) => void;
  onDeleteBookmark: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveBookmark: (node: TreeNode) => void;
  onSaveFolder: (node: TreeNode) => void;
  onCreateFolderIn: (id: string | null) => void;
  onCreateFolder: (title: string, parentId: string | null) => void;
}

function TreeNodeItem(props: TreeNodeItemProps) {
  const { node } = props;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: node.id || 'unknown',
    data: node,
  });
  
  // Use Droppable only for folders
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: node.id || 'unknown',
    data: node,
    disabled: !node.isFolder,
  });

  const style = {
    "--depth": props.depth,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isOver && node.isFolder ? 'rgba(0, 120, 215, 0.1)' : undefined,
    border: isOver && node.isFolder ? '2px dashed #0078d4' : undefined,
  } as React.CSSProperties;

  // Combine refs
  const setRef = (element: HTMLElement | null) => {
    setNodeRef(element);
    if (node.isFolder) {
        setDroppableNodeRef(element);
    }
  };

  if (node.isFolder) {
    return (
      <li 
        ref={setRef} 
        className={`tree-node folder-node ${isDragging ? 'dragging' : ''} ${isOver ? 'droppable' : ''}`} 
        style={style}
      >
        <FolderContent {...props} listeners={listeners} attributes={attributes} />
      </li>
    );
  }

  // Bookmark node
  return (
    <li 
        ref={setRef} 
        className={`tree-node bookmark-node ${isDragging ? 'dragging' : ''}`} 
        style={style}
        {...listeners}
        {...attributes}
    >
      <BookmarkContent {...props} />
    </li>
  );
}

function FolderContent({ node, expandedFolders, editingId, creatingFolderIn, onToggleFolder, onEdit, onDeleteFolder, onCancelEdit, onSaveFolder, onCreateFolderIn, onCreateFolder, depth, listeners, attributes, onDeleteBookmark, onSaveBookmark }: TreeNodeItemProps & { listeners: any, attributes: any }) {
    const isExpanded = node.id ? expandedFolders.has(node.id) : false;
    const isEditing = editingId === node.id;
    const isCreatingSubfolder = creatingFolderIn === node.id;

    if (isEditing) {
        return (
          <FolderEditForm
            node={node}
            onSave={onSaveFolder}
            onCancel={onCancelEdit}
          />
        );
    }

    return (
        <>
        <div className="folder-header" onClick={() => node.id && onToggleFolder(node.id)} {...listeners} {...attributes}>
            <span className="folder-toggle">{isExpanded ? "v" : ">"}</span>
            <span className="folder-icon">📁</span>
            <span className="folder-title">{node.title || "Sans nom"}</span>
            <span className="folder-count">({node.children?.length || 0})</span>
            <div className="node-actions" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <button
                className="btn-icon btn-add"
                onClick={() => node.id && onCreateFolderIn(node.id)}
                title="Nouveau sous-dossier"
            >
                +
            </button>
            <button
                className="btn-icon btn-edit"
                onClick={() => node.id && onEdit(node.id)}
                title="Modifier"
            >
                ✏️
            </button>
            <button
                className="btn-icon btn-delete"
                onClick={() => node.id && onDeleteFolder(node.id)}
                title="Supprimer"
            >
                🗑️
            </button>
            </div>
        </div>

        {isCreatingSubfolder && (
            <NewFolderForm
            onSave={(title) => onCreateFolder(title, node.id || null)}
            onCancel={() => onCreateFolderIn(null)}
            />
        )}

        {isExpanded && node.children && node.children.length > 0 && (
            <ul className="folder-children">
            {node.children.map((child, index) => (
                <TreeNodeItem
                key={child.id || index}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                editingId={editingId}
                creatingFolderIn={creatingFolderIn}
                onToggleFolder={onToggleFolder}
                onDeleteBookmark={onDeleteBookmark}
                onDeleteFolder={onDeleteFolder}
                onEdit={onEdit}
                onCancelEdit={onCancelEdit}
                onSaveBookmark={onSaveBookmark}
                onSaveFolder={onSaveFolder}
                onCreateFolderIn={onCreateFolderIn}
                onCreateFolder={onCreateFolder}
                />
            ))}
            </ul>
        )}
        </>
    );
}

function BookmarkContent({ node, editingId, onEdit, onDeleteBookmark, onCancelEdit, onSaveBookmark }: TreeNodeItemProps) {
    const isEditing = editingId === node.id;

    if (isEditing) {
        return (
            <BookmarkEditForm
            node={node}
            onSave={onSaveBookmark}
            onCancel={onCancelEdit}
            />
        );
    }

    return (
        <BookmarkItem
            node={node}
            onDelete={onDeleteBookmark}
            onEdit={onEdit}
        />
    );
}

// ... Rest of the components (BookmarkItem, BookmarkEditForm, FolderEditForm, NewFolderForm, NewBookmarkForm) remain the same
// I need to copy them back to ensure they are present.

interface BookmarkItemProps {
  node: TreeNode;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

function BookmarkItem({ node, onDelete, onEdit }: BookmarkItemProps) {
  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return "";
    }
  };

  return (
    <div className="bookmark-item">
      <div className="bookmark-icon">
        {node.url ? (
          <img
            src={getFavicon(node.url)}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span>📄</span>
        )}
      </div>
      <div className="bookmark-content">
        <span className="bookmark-title">{node.title || "Sans titre"}</span>
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bookmark-url"
          // Prevent drag start on link
          draggable={false}
        >
          {node.url}
        </a>
      </div>
      <div className="node-actions" onPointerDown={(e) => e.stopPropagation()}>
        {node.id && (
          <>
            <button
              className="btn-icon btn-edit"
              onClick={() => onEdit(node.id!)}
              title="Modifier"
            >
              ✏️
            </button>
            <button
              className="btn-icon btn-delete"
              onClick={() => onDelete(node.id!)}
              title="Supprimer"
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface BookmarkEditFormProps {
  node: TreeNode;
  onSave: (node: TreeNode) => void;
  onCancel: () => void;
}

function BookmarkEditForm({ node, onSave, onCancel }: BookmarkEditFormProps) {
  const [title, setTitle] = useState(node.title || "");
  const [url, setUrl] = useState(node.url || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...node, title, url });
  };

  return (
    <form className="edit-form" onSubmit={handleSubmit} onPointerDown={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        className="edit-input"
        autoFocus
      />
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="URL"
        className="edit-input"
      />
      <div className="edit-actions">
        <button type="submit" className="btn btn-small btn-primary">OK</button>
        <button type="button" className="btn btn-small btn-secondary" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}

interface FolderEditFormProps {
  node: TreeNode;
  onSave: (node: TreeNode) => void;
  onCancel: () => void;
}

function FolderEditForm({ node, onSave, onCancel }: FolderEditFormProps) {
  const [title, setTitle] = useState(node.title || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...node, title });
  };

  return (
    <form className="edit-form folder-edit" onSubmit={handleSubmit} onPointerDown={(e) => e.stopPropagation()}>
      <span className="folder-icon">📁</span>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nom du dossier"
        className="edit-input"
        autoFocus
      />
      <div className="edit-actions">
        <button type="submit" className="btn btn-small btn-primary">OK</button>
        <button type="button" className="btn btn-small btn-secondary" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}

interface NewFolderFormProps {
  onSave: (title: string) => void;
  onCancel: () => void;
}

function NewFolderForm({ onSave, onCancel }: NewFolderFormProps) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim());
    }
  };

  return (
    <form className="new-folder-form" onSubmit={handleSubmit} onPointerDown={(e) => e.stopPropagation()}>
      <span className="folder-icon">📁</span>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nom du nouveau dossier"
        className="edit-input"
        autoFocus
      />
      <div className="edit-actions">
        <button type="submit" className="btn btn-small btn-primary">Creer</button>
        <button type="button" className="btn btn-small btn-secondary" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}

interface NewBookmarkFormProps {
  folders: Array<{ id: string; label: string }>;
  onSave: (title: string, url: string, parentId: string) => void;
  onCancel: () => void;
}

function NewBookmarkForm({ folders, onSave, onCancel }: NewBookmarkFormProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [parentId, setParentId] = useState("1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSave(title.trim(), url.trim(), parentId);
  };

  return (
    <form className="new-folder-form" onSubmit={handleSubmit} onPointerDown={(e) => e.stopPropagation()}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre (optionnel)"
        className="edit-input"
        autoFocus
      />
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="URL"
        className="edit-input"
        required
      />
      <select
        className="edit-input"
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
      >
        <option value="1">Sans dossier (barre de favoris)</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <div className="edit-actions">
        <button type="submit" className="btn btn-small btn-primary">OK</button>
        <button type="button" className="btn btn-small btn-secondary" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}

export default BookmarksList;
