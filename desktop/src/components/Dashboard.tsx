import { useEffect, useRef, useState } from "react";
import {
  getSyncStatus,
  getConnectedClients,
  requestSyncFromExtensions,
  type SyncStatus,
  type ConnectedClient,
} from "../hooks/useTauriCommands";
import ConnectionIndicator from "./ConnectionIndicator";
import SyncStatusComponent from "./SyncStatus";

function Dashboard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchInProgress = useRef(false);

  const fetchData = async () => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    try {
      const [syncStatus, connectedClients] = await Promise.all([
        getSyncStatus(),
        getConnectedClients(),
      ]);
      setStatus(syncStatus);
      setClients(connectedClients);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestSync = async () => {
    try {
      await requestSyncFromExtensions();
    } catch (error) {
      console.error("Failed to request sync:", error);
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="dashboard">
      <h2>Tableau de bord</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🔖</div>
          <div className="stat-content">
            <span className="stat-value">{status?.total_bookmarks || 0}</span>
            <span className="stat-label">Favoris synchronisés</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🌐</div>
          <div className="stat-content">
            <span className="stat-value">{status?.connected_clients || 0}</span>
            <span className="stat-label">Extensions connectées</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <span className="stat-value">
              {status?.last_sync
                ? new Date(status.last_sync).toLocaleTimeString("fr-FR")
                : "Jamais"}
            </span>
            <span className="stat-label">Dernière synchronisation</span>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="section">
          <h3>État de la synchronisation</h3>
          <SyncStatusComponent status={status} />
          <button
            className="btn btn-primary"
            onClick={handleRequestSync}
            disabled={status?.sync_in_progress}
          >
            {status?.sync_in_progress ? "Synchronisation..." : "Synchroniser maintenant"}
          </button>
        </section>

        <section className="section">
          <h3>Extensions connectées</h3>
          <ConnectionIndicator clients={clients} />
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
