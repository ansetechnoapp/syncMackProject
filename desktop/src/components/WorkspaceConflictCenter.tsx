import { useEffect, useMemo, useState } from 'react';
import {
  getWorkspaceConflicts,
  resolveWorkspaceConflict,
  type WorkspaceConflict,
} from '../hooks/useTauriCommands';

export default function WorkspaceConflictCenter({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<WorkspaceConflict[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  const openConflicts = useMemo(
    () => conflicts.filter((c) => c.status === 'open'),
    [conflicts]
  );

  const load = async () => {
    try {
      setLoading(true);
      const list = await getWorkspaceConflicts(workspaceId);
      setConflicts(list);
      setError(null);
    } catch (e) {
      setError(`Failed to load conflicts: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  const resolve = async (conflictId: string, resolution: 'keep_desktop' | 'keep_incoming') => {
    try {
      setResolving(conflictId);
      await resolveWorkspaceConflict(workspaceId, conflictId, resolution);
      await load();
    } catch (e) {
      setError(`Failed to resolve conflict: ${e}`);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Conflict Center</h3>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && openConflicts.length === 0 && (
          <div className="empty-state">
            <p>No open conflicts</p>
            <p className="hint">Conflicts appear when two browsers change the same item concurrently.</p>
          </div>
        )}

        {!loading && openConflicts.length > 0 && (
          <div className="conflicts-list">
            {openConflicts.map((c) => (
              <div key={c.id} className="conflict-card">
                <div className="conflict-meta">
                  <div>
                    <strong>{c.itemType}</strong> — <span className="mono">{c.syncId}</span>
                  </div>
                  <div className="muted">Detected: {new Date(c.detectedAt).toLocaleString()}</div>
                </div>

                <div className="conflict-compare">
                  <div className="conflict-side">
                    <div className="conflict-side-title">Desktop</div>
                    <pre className="code-block">{JSON.stringify(c.desktopSnapshot, null, 2)}</pre>
                    <button
                      className="btn-primary"
                      disabled={resolving === c.id}
                      onClick={() => resolve(c.id, 'keep_desktop')}
                    >
                      Keep Desktop
                    </button>
                  </div>
                  <div className="conflict-side">
                    <div className="conflict-side-title">Incoming</div>
                    <pre className="code-block">{JSON.stringify(c.incomingSnapshot, null, 2)}</pre>
                    <button
                      className="btn-primary"
                      disabled={resolving === c.id}
                      onClick={() => resolve(c.id, 'keep_incoming')}
                    >
                      Keep Incoming
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

