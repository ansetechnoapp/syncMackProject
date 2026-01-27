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
  getWorkspaceTree,
  removeBookmarkFromWorkspace,
  updateBookmarkInWorkspace,
  addBookmarkToWorkspace,
  BookmarksTree,
  TreeNode,
} from "../hooks/useTauriCommands";
import { useBookmarksUpdated } from "../hooks/useRealtimeEvents";
import { findNode } from "../utils/treeUtils";

interface BookmarksExplorerProps {
  workspaceId: string;
}

export default function BookmarksExplorer({ workspaceId }: BookmarksExplorerProps) {
  const [tree, setTree] = useState<BookmarksTree | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  // State for List View
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // State for Editing/Creating
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingBookmark, setCreatingBookmark] = useState(false);
  
  // Drag and Drop
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
      const data = await getWorkspaceTree(workspaceId);
      setTree(data);
    } catch (error) {
      console.error("Failed to fetch bookmarks tree:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTree();
  }, [workspaceId]);

  const handleBookmarksUpdate = useCallback(() => {
    loadTree();
  }, [workspaceId]);

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
      await removeBookmarkFromWorkspace(workspaceId, bookmarkId);
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
    }
  };

  // Note: Folder deletion isn't fully implemented in workspace backend yet for removing children recursively via single call unless we implement removeFolderFromWorkspace. 
  // For now, let's assume removing a folder removes it.
  // Actually, we didn't implement removeFolderFromWorkspace in commands.rs.
  // Let's disable folder deletion for now or assume it works if we add it later.
  // I will just implement bookmark deletion for now.

  const handleSaveBookmark = async (node: TreeNode) => {
    if (!node.id) return;
    try {
      await updateBookmarkInWorkspace(workspaceId, node.id, {
        title: node.title,
        url: node.url,
      });
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update bookmark:", error);
    }
  };

  const handleCreateBookmark = async (title: string, url: string, parentId: string) => {
    try {
      await addBookmarkToWorkspace(workspaceId, {
        title,
        url,
        parentId,
        isFolder: false
      });
      setCreatingBookmark(false);
    } catch (error) {
      console.error("Failed to create bookmark:", error);
    }
  };

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

    const targetId = over.id as string;
    
    // Only support moving bookmarks for now to keep it simple with workspace commands
    // We need to implement updateBookmarkInWorkspace with parentId support
    if (tree) {
        const node = findNode(tree.items, active.id as string);
        if (node && !node.isFolder) { // Only bookmarks for now
            try {
                await updateBookmarkInWorkspace(workspaceId, node.id as string, {
                    parentId: targetId
                });
            } catch (error) {
                console.error("Failed to move item:", error);
            }
        }
    }
  };

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

  // Flatten items for Grid View (show all bookmarks, ignore folders for now or show as groups?)
  // Simple approach: Show all bookmarks in a flat grid
  const getAllBookmarks = (nodes: TreeNode[]): TreeNode[] => {
    let result: TreeNode[] = [];
    for (const node of nodes) {
      if (!node.isFolder) {
        result.push(node);
      } else if (node.children) {
        result = [...result, ...getAllBookmarks(node.children)];
      }
    }
    return result;
  };

  const flatBookmarks = tree ? getAllBookmarks(filteredItems) : [];

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="bookmarks-explorer">
      <div className="explorer-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="view-toggles">
          <button 
            className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Vue liste"
          >
            📋
          </button>
          <button 
            className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Vue grille"
          >
            ▦
          </button>
        </div>
        <button 
            className="btn btn-primary btn-small"
            onClick={() => setCreatingBookmark(true)}
        >
            + Favori
        </button>
      </div>

      {creatingBookmark && (
          <div className="modal-overlay">
             <div className="modal">
                <h3>Nouveau favori</h3>
                <NewBookmarkForm 
                    onSave={(title: string, url: string) => handleCreateBookmark(title, url, "1")} // Default to root/bar
                    onCancel={() => setCreatingBookmark(false)}
                />
             </div>
          </div>
      )}

      {viewMode === 'list' ? (
         <DndContext 
            sensors={sensors} 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
            collisionDetection={pointerWithin}
         >
            <div className="explorer-list-view">
                {filteredItems.length === 0 ? (
                    <div className="empty-state">Aucun favori</div>
                ) : (
                    <ul className="bookmarks-tree">
                        {filteredItems.map(node => (
                            <TreeNodeItem
                                key={node.id}
                                node={node}
                                depth={0}
                                expandedFolders={expandedFolders}
                                onToggleFolder={toggleFolder}
                                onDelete={handleDeleteBookmark}
                                onEdit={setEditingId}
                                editingId={editingId}
                                onSave={handleSaveBookmark}
                                onCancelEdit={() => setEditingId(null)}
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
         </DndContext>
      ) : (
          <div className="explorer-grid-view">
              {flatBookmarks.length === 0 ? (
                  <div className="empty-state">Aucun favori</div>
              ) : (
                  flatBookmarks.map(node => (
                      <BookmarkCard 
                        key={node.id} 
                        node={node} 
                        onDelete={handleDeleteBookmark}
                        onEdit={setEditingId} 
                      />
                  ))
              )}
          </div>
      )}
    </div>
  );
}

// Subcomponents

function TreeNodeItem({ node, depth, expandedFolders, onToggleFolder, onDelete, onEdit, editingId, onSave, onCancelEdit }: any) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: node.id || 'unknown',
        data: node,
    });
    
    const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
        id: node.id || 'unknown',
        data: node,
        disabled: !node.isFolder,
    });

    const style = {
        paddingLeft: `${depth * 20}px`,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isOver && node.isFolder ? 'rgba(0, 120, 215, 0.1)' : undefined,
    };

    const setRef = (el: HTMLElement | null) => {
        setNodeRef(el);
        if (node.isFolder) setDroppableNodeRef(el);
    };

    if (editingId === node.id) {
        return (
            <div className="tree-node-edit" style={{ marginLeft: `${depth * 20}px` }}>
                <BookmarkEditForm node={node} onSave={onSave} onCancel={onCancelEdit} />
            </div>
        );
    }

    if (node.isFolder) {
        const isExpanded = expandedFolders.has(node.id);
        return (
            <>
                <li ref={setRef} className="tree-node folder-node" style={style} {...listeners} {...attributes}>
                    <span className="folder-toggle" onClick={() => onToggleFolder(node.id)}>
                        {isExpanded ? "▼" : "▶"}
                    </span>
                    <span className="folder-icon">📁</span>
                    <span className="node-title">{node.title}</span>
                </li>
                {isExpanded && node.children && (
                    node.children.map((child: any) => (
                        <TreeNodeItem 
                            key={child.id} 
                            node={child} 
                            depth={depth + 1} 
                            expandedFolders={expandedFolders}
                            onToggleFolder={onToggleFolder}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            editingId={editingId}
                            onSave={onSave}
                            onCancelEdit={onCancelEdit}
                        />
                    ))
                )}
            </>
        );
    }

    return (
        <li ref={setRef} className="tree-node bookmark-node" style={style} {...listeners} {...attributes}>
             <BookmarkIcon url={node.url} />
             <a href={node.url} target="_blank" rel="noopener" className="node-title">{node.title}</a>
             <div className="node-actions">
                 <button onClick={() => onEdit(node.id)}>✏️</button>
                 <button onClick={() => onDelete(node.id)}>🗑️</button>
             </div>
        </li>
    );
}

function BookmarkCard({ node, onDelete, onEdit }: any) {
    return (
        <div className="bookmark-card-grid">
            <div className="card-preview">
                <BookmarkIcon url={node.url} size={32} />
            </div>
            <div className="card-info">
                <div className="card-title" title={node.title}>{node.title}</div>
                <div className="card-url" title={node.url}>{new URL(node.url).hostname}</div>
            </div>
            <div className="card-actions">
                <button onClick={() => onEdit(node.id)}>✏️</button>
                <button onClick={() => onDelete(node.id)}>🗑️</button>
            </div>
        </div>
    );
}

function BookmarkIcon({ url, size = 16 }: { url: string, size?: number }) {
    const getFavicon = (u: string) => {
        try {
            const domain = new URL(u).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`;
        } catch {
            return "";
        }
    };
    return <img src={getFavicon(url)} width={size} height={size} alt="" className="favicon" onError={(e) => (e.currentTarget.style.display = 'none')} />;
}

function NewBookmarkForm({ onSave, onCancel }: any) {
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(title, url); }}>
            <input placeholder="Titre" value={title} onChange={e => setTitle(e.target.value)} className="edit-input" />
            <input placeholder="URL" value={url} onChange={e => setUrl(e.target.value)} required className="edit-input" />
            <div className="modal-actions">
                <button type="submit" className="btn-primary">Créer</button>
                <button type="button" onClick={onCancel} className="btn-secondary">Annuler</button>
            </div>
        </form>
    );
}

function BookmarkEditForm({ node, onSave, onCancel }: any) {
    const [title, setTitle] = useState(node.title);
    const [url, setUrl] = useState(node.url);
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...node, title, url }); }} className="edit-form-inline">
            <input value={title} onChange={e => setTitle(e.target.value)} className="edit-input" />
            <input value={url} onChange={e => setUrl(e.target.value)} className="edit-input" />
            <button type="submit">✓</button>
            <button type="button" onClick={onCancel}>✕</button>
        </form>
    );
}
