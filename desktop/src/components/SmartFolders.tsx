import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SmartFolderResult {
  workspaceId: string;
  workspaceName: string;
  bookmarkId: string;
  title: string;
  url: string;
  parentId: string;
  domain?: string;
}

interface DomainGroup {
  domain: string;
  count: number;
  bookmarks: SmartFolderResult[];
}

interface DuplicateGroup {
  url: string;
  count: number;
  bookmarks: SmartFolderResult[];
}

interface CustomFilter {
  id: string;
  name: string;
  keyword?: string;
  domainPattern?: string;
  dateFrom?: string;
  dateTo?: string;
  workspaceIds?: string[];
}

type SmartTab = 'recent' | 'domains' | 'duplicates' | 'custom';

export default function SmartFolders() {
  const [activeTab, setActiveTab] = useState<SmartTab>('recent');
  const [recentBookmarks, setRecentBookmarks] = useState<SmartFolderResult[]>([]);
  const [domainGroups, setDomainGroups] = useState<DomainGroup[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [customResults, setCustomResults] = useState<SmartFolderResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulaire nouveau filtre
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterKeyword, setNewFilterKeyword] = useState('');
  const [newFilterDomain, setNewFilterDomain] = useState('');

  const loadTab = async (tab: SmartTab) => {
    setLoading(true);
    try {
      switch (tab) {
        case 'recent':
          setRecentBookmarks(await invoke<SmartFolderResult[]>('get_smart_folder_recent', { days: 7 }));
          break;
        case 'domains':
          setDomainGroups(await invoke<DomainGroup[]>('get_smart_folder_by_domain'));
          break;
        case 'duplicates':
          setDuplicates(await invoke<DuplicateGroup[]>('get_smart_folder_duplicates'));
          break;
        case 'custom':
          setCustomFilters(await invoke<CustomFilter[]>('list_custom_filters'));
          break;
      }
    } catch (e) {
      console.error('Erreur chargement:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

  const handleCreateFilter = async () => {
    if (!newFilterName.trim()) return;
    try {
      const filter: CustomFilter = {
        id: '',
        name: newFilterName.trim(),
        keyword: newFilterKeyword.trim() || undefined,
        domainPattern: newFilterDomain.trim() || undefined,
      };
      await invoke('save_custom_filter', { filter });
      setNewFilterName('');
      setNewFilterKeyword('');
      setNewFilterDomain('');
      loadTab('custom');
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyFilter = async (filter: CustomFilter) => {
    setLoading(true);
    try {
      const results = await invoke<SmartFolderResult[]>('apply_custom_smart_filter', { filter });
      setCustomResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFilter = async (id: string) => {
    try {
      await invoke('delete_custom_filter', { filterId: id });
      loadTab('custom');
    } catch (e) {
      console.error(e);
    }
  };

  const renderBookmarkList = (items: SmartFolderResult[]) => (
    <div>
      {items.map((item, i) => (
        <div key={`${item.bookmarkId}-${i}`} className="bookmark-item compact">
          <span className="icon">🔖</span>
          <div className="content" style={{ flex: 1, overflow: 'hidden' }}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="title">
              {item.title}
            </a>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)' }}>
              {item.domain || item.url}
            </span>
          </div>
          <span className="badge" style={{ fontSize: 10 }}>{item.workspaceName}</span>
        </div>
      ))}
      {items.length === 0 && <div className="empty-state-small">Aucun resultat</div>}
    </div>
  );

  return (
    <div className="scrollable-page">
      <div className="settings" style={{ maxWidth: 900 }}>
        <h2>Dossiers intelligents</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {([
            ['recent', 'Recents'],
            ['domains', 'Par domaine'],
            ['duplicates', 'Doublons'],
            ['custom', 'Filtres perso'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              className={`btn-xs ${activeTab === key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <div className="loading">Chargement...</div>}

        {!loading && activeTab === 'recent' && (
          <div className="settings-section">
            <h3>Favoris recents (7 derniers jours)</h3>
            {renderBookmarkList(recentBookmarks)}
          </div>
        )}

        {!loading && activeTab === 'domains' && (
          <div>
            {domainGroups.slice(0, 20).map(group => (
              <div key={group.domain} className="settings-section" style={{ marginBottom: 12 }}>
                <h3>{group.domain} ({group.count})</h3>
                {renderBookmarkList(group.bookmarks.slice(0, 10))}
                {group.bookmarks.length > 10 && (
                  <div className="muted" style={{ padding: '8px 0' }}>
                    ... et {group.bookmarks.length - 10} autres
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === 'duplicates' && (
          <div>
            {duplicates.length === 0 ? (
              <div className="empty-state">Aucun doublon detecte</div>
            ) : (
              duplicates.map(group => (
                <div key={group.url} className="settings-section" style={{ marginBottom: 12 }}>
                  <h3 style={{ wordBreak: 'break-all' }}>{group.url} ({group.count} copies)</h3>
                  {renderBookmarkList(group.bookmarks)}
                </div>
              ))
            )}
          </div>
        )}

        {!loading && activeTab === 'custom' && (
          <div>
            <div className="settings-section" style={{ marginBottom: 15 }}>
              <h3>Nouveau filtre</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="input-text"
                  placeholder="Nom du filtre"
                  value={newFilterName}
                  onChange={e => setNewFilterName(e.target.value)}
                  style={{ flex: 1, minWidth: 150 }}
                />
                <input
                  className="input-text"
                  placeholder="Mot-cle"
                  value={newFilterKeyword}
                  onChange={e => setNewFilterKeyword(e.target.value)}
                  style={{ flex: 1, minWidth: 150 }}
                />
                <input
                  className="input-text"
                  placeholder="Domaine"
                  value={newFilterDomain}
                  onChange={e => setNewFilterDomain(e.target.value)}
                  style={{ flex: 1, minWidth: 150 }}
                />
                <button className="btn btn-primary" onClick={handleCreateFilter} disabled={!newFilterName.trim()}>
                  Creer
                </button>
              </div>
            </div>

            {customFilters.map(f => (
              <div key={f.id} className="settings-section" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>{f.name}</h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-xs btn-outline" onClick={() => handleApplyFilter(f)}>Appliquer</button>
                    <button className="btn-xs btn-outline text-danger" onClick={() => handleDeleteFilter(f.id)}>Supprimer</button>
                  </div>
                </div>
                <div className="muted">
                  {f.keyword && `Mot-cle: ${f.keyword}`}
                  {f.domainPattern && ` | Domaine: ${f.domainPattern}`}
                </div>
              </div>
            ))}

            {customResults.length > 0 && (
              <div className="settings-section">
                <h3>Resultats ({customResults.length})</h3>
                {renderBookmarkList(customResults)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
