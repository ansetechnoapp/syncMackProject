import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getWorkspaces, type WorkspaceSummary } from '../hooks/useTauriCommands';

interface SearchResult {
  workspaceId: string;
  workspaceName: string;
  itemType: string;
  itemId: string;
  title: string;
  url?: string;
  parentPath: string[];
  relevanceScore: number;
}

export default function SearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);

  useEffect(() => {
    getWorkspaces().then(setWorkspaces).catch(console.error);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await invoke<SearchResult[]>('search_bookmarks_global', {
        query: q.trim(),
        workspaceIds: selectedWorkspaceIds.length > 0 ? selectedWorkspaceIds : null,
      });
      setResults(res);
    } catch (e) {
      console.error('Erreur recherche:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspaceIds]);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const toggleWorkspaceFilter = (id: string) => {
    setSelectedWorkspaceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Grouper par workspace
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.workspaceName] = acc[r.workspaceName] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="settings" style={{ maxWidth: 800 }}>
      <h2>Recherche</h2>

      <div className="search-bar" style={{ marginBottom: 15 }}>
        <input
          type="text"
          className="search-input"
          placeholder="Rechercher dans tous les workspaces..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {workspaces.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 15, flexWrap: 'wrap' }}>
          {workspaces.map(ws => (
            <button
              key={ws.id}
              className={`btn-xs ${selectedWorkspaceIds.includes(ws.id) ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => toggleWorkspaceFilter(ws.id)}
              style={{ borderColor: ws.color || '#3498db' }}
            >
              {ws.name}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="loading">Recherche...</div>}

      {!loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="empty-state">Aucun resultat</div>
      )}

      {!loading && Object.entries(grouped).map(([wsName, items]) => (
        <div key={wsName} className="settings-section" style={{ marginBottom: 15 }}>
          <h3>{wsName} ({items.length})</h3>
          <div>
            {items.map(item => (
              <div key={`${item.workspaceId}-${item.itemId}`} className="bookmark-item compact">
                <span className="icon">{item.itemType === 'folder' ? '📁' : '🔖'}</span>
                <div className="content" style={{ flex: 1, overflow: 'hidden' }}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="title">
                      {item.title}
                    </a>
                  ) : (
                    <span className="title">{item.title}</span>
                  )}
                  {item.url && (
                    <span className="url" style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {item.url}
                    </span>
                  )}
                </div>
                <span className="badge" style={{ fontSize: 10 }}>
                  {Math.round(item.relevanceScore * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
