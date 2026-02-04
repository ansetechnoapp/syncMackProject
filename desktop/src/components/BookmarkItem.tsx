import type { CSSProperties, ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Folder, Globe, Pencil, Trash2 } from 'lucide-react';

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

type BookmarkItemContentProps = {
    node: BookmarkNode;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    isCompact?: boolean;
    style?: CSSProperties;
    innerRef?: (node: HTMLDivElement | null) => void;
} & Omit<ComponentPropsWithoutRef<'div'>, 'ref'>;

export function BookmarkItemContent({ node, onEdit, onDelete, isCompact = false, style, innerRef, ...props }: BookmarkItemContentProps) {
    if (node.isFolder) {
        return (
            <div
                ref={innerRef}
                className={`bookmark-item folder-item ${isCompact ? 'compact' : ''}`}
                style={style}
                {...props}
            >
                <div className="bookmark-icon">
                    <Folder size={18} fill="currentColor" fillOpacity={0.2} color="var(--primary)" />
                </div>
                <span className="bookmark-title">{node.title}</span>
            </div>
        );
    }
    return (
        <div
            ref={innerRef}
            className={`bookmark-item ${isCompact ? 'compact' : ''}`}
            style={style}
            {...props}
        >
            <div className="bookmark-icon">
                <BookmarkIcon url={node.url || ''} />
            </div>
            <div className="bookmark-content">
                <a href={node.url} target="_blank" rel="noopener noreferrer" className="bookmark-title" onClick={e => e.stopPropagation()}>
                    {node.title}
                </a>
                {!isCompact && <span className="bookmark-url">{new URL(node.url || 'http://localhost').hostname}</span>}
            </div>
            <div className="bookmark-actions" style={{ display: 'flex', gap: '4px' }}>
                <button onClick={(e) => { e.stopPropagation(); onEdit(node.id); }} className="btn-icon-small" title="Modifier">
                    <Pencil size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="btn-icon-small text-danger" title="Supprimer">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
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

    return (
        <BookmarkItemContent
            node={node}
            onEdit={onEdit}
            onDelete={onDelete}
            isCompact={isCompact}
            style={style}
            innerRef={setNodeRef}
            {...listeners}
            {...attributes}
        />
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
                    <button onClick={() => onEdit(node.id)}><Pencil size={14} /></button>
                    <button onClick={() => onDelete(node.id)} className="text-danger"><Trash2 size={14} /></button>
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
    const [error, setError] = useState(false);

    // We need useState imported.
    // Actually, let's keep it simple and just use img with fallback.
    // If it fails, show default icon.
    // But this component logic was: <img onError={() => display='none'} />
    // If display none, we see nothing. Better to show Globe icon if error.

    const getFavicon = (u: string) => {
        try {
            const domain = new URL(u).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`;
        } catch {
            return "";
        }
    };

    if (error || !url) {
        return <Globe size={size} className="text-secondary" />;
    }

    return (
        <img
            src={getFavicon(url)}
            width={size}
            height={size}
            alt=""
            className="favicon"
            onError={() => setError(true)}
            style={{ display: 'block' }}
        />
    );
}
