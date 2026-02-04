import { useState, useEffect } from 'react';
import {
    Trash2,
    RotateCcw,
    AlertTriangle,
    Archive,
    Folder,
    Bookmark,
    Clock,
    XCircle,
    RefreshCw
} from 'lucide-react';
import {
    getDeletedWorkspaces,
    restoreWorkspace,
    permanentlyDeleteWorkspace,
    emptyTrash,
    DeletedWorkspace
} from '../hooks/useTauriCommands';
import { listen } from '@tauri-apps/api/event';
import { useToast } from './Toast';

export default function WorkspaceTrash() {
    const [deletedWorkspaces, setDeletedWorkspaces] = useState<DeletedWorkspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { addToast } = useToast();

    const loadData = async () => {
        try {
            setLoading(true);
            const deleted = await getDeletedWorkspaces();
            setDeletedWorkspaces(deleted);
            setError(null);
        } catch (e) {
            setError(`Erreur chargement: ${e}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const unlistenDeleted = listen('deleted_workspaces_updated', loadData);

        return () => {
            unlistenDeleted.then(f => f());
        };
    }, []);

    const handleRestore = async (workspaceId: string, workspaceName: string) => {
        try {
            setActionLoading(workspaceId);
            await restoreWorkspace(workspaceId);
            addToast(`Workspace "${workspaceName}" restauré avec succès`, 'success');
            await loadData();
        } catch (e) {
            addToast(`Erreur lors de la restauration: ${e}`, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePermanentDelete = async (workspaceId: string, workspaceName: string) => {
        if (!confirm(`Supprimer définitivement "${workspaceName}" ?\n\nCette action est irréversible.`)) {
            return;
        }
        try {
            setActionLoading(workspaceId);
            await permanentlyDeleteWorkspace(workspaceId);
            addToast(`Workspace "${workspaceName}" supprimé définitivement`, 'success');
            await loadData();
        } catch (e) {
            addToast(`Erreur lors de la suppression: ${e}`, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleEmptyTrash = async () => {
        if (!confirm(`Vider la corbeille ?\n\n${deletedWorkspaces.length} workspace(s) seront supprimés définitivement.\n\nCette action est irréversible.`)) {
            return;
        }
        try {
            setActionLoading('empty');
            const count = await emptyTrash();
            addToast(`${count} workspace(s) supprimé(s) définitivement`, 'success');
            await loadData();
        } catch (e) {
            addToast(`Erreur lors du vidage: ${e}`, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeSinceDelete = (dateString: string) => {
        const deleted = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - deleted.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffDays > 0) {
            return `il y a ${diffDays} jour(s)`;
        } else if (diffHours > 0) {
            return `il y a ${diffHours} heure(s)`;
        } else if (diffMinutes > 0) {
            return `il y a ${diffMinutes} minute(s)`;
        }
        return 'à l\'instant';
    };

    if (loading && deletedWorkspaces.length === 0) {
        return <div className="loading">Chargement...</div>;
    }

    return (
        <div className="workspace-trash-panel scrollable-page">
            <div className="trash-header">
                <div className="trash-title">
                    <Archive size={28} className="trash-icon" />
                    <div>
                        <h2>Corbeille</h2>
                        <p className="trash-subtitle">
                            {deletedWorkspaces.length === 0
                                ? 'La corbeille est vide'
                                : `${deletedWorkspaces.length} workspace(s) supprimé(s)`}
                        </p>
                    </div>
                </div>
                <div className="trash-actions">
                    <button
                        className="btn btn-outline"
                        onClick={loadData}
                        disabled={loading}
                        title="Actualiser"
                    >
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    </button>
                    {deletedWorkspaces.length > 0 && (
                        <button
                            className="btn btn-danger"
                            onClick={handleEmptyTrash}
                            disabled={actionLoading === 'empty'}
                        >
                            <Trash2 size={16} />
                            {actionLoading === 'empty' ? 'Vidage...' : 'Vider la corbeille'}
                        </button>
                    )}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {deletedWorkspaces.length === 0 ? (
                <div className="trash-empty-state">
                    <Archive size={64} className="empty-icon" />
                    <h3>Aucun workspace supprimé</h3>
                    <p>Les workspaces supprimés apparaîtront ici et pourront être restaurés.</p>
                </div>
            ) : (
                <div className="trash-grid">
                    {deletedWorkspaces.map(ws => (
                        <div key={ws.id} className="trash-card">
                            <div className="trash-card-header">
                                <div
                                    className="trash-card-color"
                                    style={{ backgroundColor: ws.color || '#6b7280' }}
                                />
                                <div className="trash-card-info">
                                    <h3 className="trash-card-title">{ws.name}</h3>
                                    <div className="trash-card-meta">
                                        <span className="meta-item">
                                            <Bookmark size={14} />
                                            {ws.totalBookmarks} favori(s)
                                        </span>
                                        <span className="meta-item">
                                            <Folder size={14} />
                                            {ws.totalFolders} dossier(s)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="trash-card-date">
                                <Clock size={14} />
                                <span title={formatDate(ws.deletedAt)}>
                                    Supprimé {getTimeSinceDelete(ws.deletedAt)}
                                </span>
                            </div>

                            <div className="trash-card-warning">
                                <AlertTriangle size={14} />
                                <span>Sera définitivement supprimé après 30 jours</span>
                            </div>

                            <div className="trash-card-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleRestore(ws.id, ws.name)}
                                    disabled={actionLoading === ws.id}
                                >
                                    <RotateCcw size={16} />
                                    {actionLoading === ws.id ? 'Restauration...' : 'Restaurer'}
                                </button>
                                <button
                                    className="btn btn-outline btn-danger-outline"
                                    onClick={() => handlePermanentDelete(ws.id, ws.name)}
                                    disabled={actionLoading === ws.id}
                                    title="Supprimer définitivement"
                                >
                                    <XCircle size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
