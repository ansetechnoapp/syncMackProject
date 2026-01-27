import { useDraggable } from '@dnd-kit/core';

export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  isFolder?: boolean;
  children?: BookmarkNode[];
  parentId?: string;
}

interface BookmarkItemProps {
  node: BookmarkNode;
  workspaceId?: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isCompact?: boolean;
}

export function BookmarkItem({ node, workspaceId, onEdit, onDelete, isCompact = false }: BookmarkItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: node.id,
    data: { ...node, type: 'bookmark', sourceWorkspaceId: workspaceId },
  });

  const style = {
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  if (node.isFolder) {
      // Folders in column view might just be containers or distinct items
      // For now, render them simply
      return (
        <div 
            ref={setNodeRef} 
            className={`bookmark-item folder-item ${isCompact ? 'compact' : ''}`} 
            style={style} 
            {...listeners} 
            {...attributes}
        >
            <span className="icon">📁</span>
            <span className="title">{node.title}</span>
        </div>
      );
  }

  return (
    <div 
        ref={setNodeRef} 
        className={`bookmark-item ${isCompact ? 'compact' : ''}`} 
        style={style} 
        {...listeners} 
        {...attributes}
    >
        <BookmarkIcon url={node.url || ''} />
        <div className="content">
            <a href={node.url} target="_blank" rel="noopener noreferrer" className="title" onClick={e => e.stopPropagation()}>
                {node.title}
            </a>
            {!isCompact && <span className="url">{new URL(node.url || 'http://localhost').hostname}</span>}
        </div>
        <div className="actions">
            <button onClick={(e) => { e.stopPropagation(); onEdit(node.id); }} className="btn-icon-small">✏️</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="btn-icon-small text-danger">🗑️</button>
        </div>
    </div>
  );
}

export function BookmarkCard({ node, onEdit, onDelete }: BookmarkItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: node.id,
        data: { ...node, type: 'bookmark' },
    });

    const style = {
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
    };

    return (
        <div 
            ref={setNodeRef} 
            className="bookmark-card" 
            style={style} 
            {...listeners} 
            {...attributes}
        >
            <div className="card-header">
                <BookmarkIcon url={node.url || ''} size={24} />
                <div className="card-actions-absolute">
                    <button onClick={() => onEdit(node.id)}>✏️</button>
                    <button onClick={() => onDelete(node.id)} className="text-danger">🗑️</button>
                </div>
            </div>
            <div className="card-body">
                <div className="card-title" title={node.title}>{node.title}</div>
                <div className="card-url">{node.url ? new URL(node.url).hostname : ''}</div>
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
    
    return (
        <img 
            src={getFavicon(url)} 
            width={size} 
            height={size} 
            alt="" 
            className="favicon" 
            onError={(e) => (e.currentTarget.style.display = 'none')} 
        />
    );
}
