import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SyncLogEntry {
  id: string;
  timestamp: string;
  operationType: string;
  source: string;
  workspaceId?: string;
  itemsCount: number;
  success: boolean;
  errorMessage?: string;
}

export default function SyncHistory() {
  const [entries, setEntries] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await invoke<SyncLogEntry[]>('get_sync_history', { limit: 100 });
      setEntries(data);
    } catch (e) {
      console.error('Erreur chargement historique:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClear = async () => {
    if (!confirm('Effacer tout l\'historique de synchronisation ?')) return;
    try {
      await invoke('clear_sync_history');
      setEntries([]);
    } catch (e) {
      console.error(e);
    }
  };

  const operationIcons: Record<string, string> = {
    sync_bookmarks: '🔄',
    bookmark_created: '➕',
    bookmark_changed: '✏️',
    bookmark_removed: '🗑️',
    folder_created: '📁',
    folder_changed: '📁',
    folder_removed: '📁',
  };

  const formatDate = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('fr-FR');
    } catch {
      return ts;
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="settings" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Historique de synchronisation</h2>
        {entries.length > 0 && (
          <button className="btn btn-secondary" onClick={handleClear}>
            Effacer l'historique
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">Aucun historique</div>
      ) : (
        <div className="settings-section">
          {entries.map(entry => (
            <div key={entry.id} className="setting-item" style={{ gap: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>
                {entry.success
                  ? (operationIcons[entry.operationType] || '🔄')
                  : '❌'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>
                  {entry.operationType.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {formatDate(entry.timestamp)} — {entry.source}
                  {entry.workspaceId && ` — ws: ${entry.workspaceId.slice(0, 8)}...`}
                </div>
                {entry.errorMessage && (
                  <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 2 }}>
                    {entry.errorMessage}
                  </div>
                )}
              </div>
              <span className="badge">{entry.itemsCount} items</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
