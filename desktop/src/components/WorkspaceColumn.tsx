import { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { getWorkspaceTree, BookmarksTree, TreeNode } from '../hooks/useTauriCommands';
import { useBookmarksUpdated } from '../hooks/useRealtimeEvents';
import { BookmarkItem, BookmarkNode } from './BookmarkItem';

interface WorkspaceColumnProps {
  workspaceId: string;
  title: string;
  color: string;
  onEditBookmark: (wsId: string, bId: string) => void;
  onDeleteBookmark: (wsId: string, bId: string) => void;
  onAddBookmark: (wsId: string) => void;
  onAddFolder: (wsId: string) => void;
}

export default function WorkspaceColumn({ 
  workspaceId, 
  title, 
  color,
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

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  // Real-time updates
  useBookmarksUpdated(() => {
    loadData();
  });

  // Flatten the tree for the column view
  const getAllBookmarks = (nodes: TreeNode[]): BookmarkNode[] => {
    let result: BookmarkNode[] = [];
    for (const node of nodes) {
      if (!node.isFolder) {
        // Ensure ID is present
        if (node.id) {
            result.push(node as BookmarkNode);
        }
      } else if (node.children) {
        result = [...result, ...getAllBookmarks(node.children)];
      }
    }
    return result;
  };

  const bookmarks = tree ? getAllBookmarks(tree.items) : [];
  const folderCount = tree?.total_folders || 0;
  const bookmarkCount = tree?.total_bookmarks || bookmarks.length;

  return (
    <div className="workspace-column" style={{ borderTop: `4px solid ${color}` }}>
      <div className="column-header" style={{ backgroundColor: `${color}15` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ color: color, margin: 0 }}>{title}</h3>
            <span className="badge" title={`${bookmarkCount} favoris, ${folderCount} dossiers`}>
                {bookmarkCount} fav, {folderCount} dos
            </span>
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
      >
        {loading ? (
          <div className="loading-spinner">...</div>
        ) : bookmarks.length === 0 ? (
          <div className="empty-state-small">Vide</div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
