import { useCallback, useEffect, useState } from "react";
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

function BookmarksList() {
  const [tree, setTree] = useState<BookmarksTree | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingFolderIn, setCreatingFolderIn] = useState<string | null>(null);
  const [creatingBookmark, setCreatingBookmark] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

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

  // Écouter les mises à jour du statut de synchronisation
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

  // Recharger l'arbre quand les bookmarks sont mis à jour
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

  // Filtrer les nœuds par recherche
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
    </div>
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

function TreeNodeItem({
  node,
  depth,
  expandedFolders,
  editingId,
  creatingFolderIn,
  onToggleFolder,
  onDeleteBookmark,
  onDeleteFolder,
  onEdit,
  onCancelEdit,
  onSaveBookmark,
  onSaveFolder,
  onCreateFolderIn,
  onCreateFolder,
}: TreeNodeItemProps) {
  const isExpanded = node.id ? expandedFolders.has(node.id) : false;
  const isEditing = editingId === node.id;
  const isCreatingSubfolder = creatingFolderIn === node.id;

  if (node.isFolder) {
    return (
      <li className="tree-node folder-node" style={{ "--depth": depth } as React.CSSProperties}>
        {isEditing ? (
          <FolderEditForm
            node={node}
            onSave={onSaveFolder}
            onCancel={onCancelEdit}
          />
        ) : (
          <>
            <div className="folder-header" onClick={() => node.id && onToggleFolder(node.id)}>
              <span className="folder-toggle">{isExpanded ? "v" : ">"}</span>
              <span className="folder-icon">📁</span>
              <span className="folder-title">{node.title || "Sans nom"}</span>
              <span className="folder-count">({node.children?.length || 0})</span>
              <div className="node-actions" onClick={(e) => e.stopPropagation()}>
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
        )}
      </li>
    );
  }

  // Bookmark node
  return (
    <li className="tree-node bookmark-node" style={{ "--depth": depth } as React.CSSProperties}>
      {isEditing ? (
        <BookmarkEditForm
          node={node}
          onSave={onSaveBookmark}
          onCancel={onCancelEdit}
        />
      ) : (
        <BookmarkItem
          node={node}
          onDelete={onDeleteBookmark}
          onEdit={onEdit}
        />
      )}
    </li>
  );
}

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
        >
          {node.url}
        </a>
      </div>
      <div className="node-actions">
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
    <form className="edit-form" onSubmit={handleSubmit}>
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
    <form className="edit-form folder-edit" onSubmit={handleSubmit}>
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
    <form className="new-folder-form" onSubmit={handleSubmit}>
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
    <form className="new-folder-form" onSubmit={handleSubmit}>
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
