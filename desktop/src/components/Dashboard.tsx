import { useCallback, useEffect, useState } from "react";
import {
  getSyncStatus,
  getConnectedClients,
  requestSyncFromExtensions,
  type SyncStatus,
  type ConnectedClient,
} from "../hooks/useTauriCommands";
import { useSyncStatusUpdated, useClientsUpdated } from "../hooks/useRealtimeEvents";
import {
  Activity,
  Bookmark,
  Clock,
  Globe,
  RefreshCw,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Zap
} from "lucide-react";

function Dashboard() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Charger les données initiales
  useEffect(() => {
    const fetchInitialData = async () => {
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
      }
    };

    fetchInitialData();
  }, []);

  // Écouter les mises à jour du statut en temps réel
  const handleSyncStatusUpdate = useCallback((newStatus: SyncStatus) => {
    setStatus(newStatus);
    if (!newStatus.sync_in_progress) {
      setIsSyncing(false);
    }
  }, []);

  useSyncStatusUpdated(handleSyncStatusUpdate);

  // Écouter les mises à jour des clients en temps réel
  const handleClientsUpdate = useCallback((newClients: ConnectedClient[]) => {
    setClients(newClients);
  }, []);

  useClientsUpdated(handleClientsUpdate);

  const handleRequestSync = async () => {
    try {
      setIsSyncing(true);
      // Optimistic update
      if (status) {
        setStatus({ ...status, sync_in_progress: true });
      }
      await requestSyncFromExtensions();
    } catch (error) {
      console.error("Failed to request sync:", error);
      setIsSyncing(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBrowserIcon = (browser: string) => {
    const b = browser.toLowerCase();
    if (b.includes("chrome")) return <Globe color="#60A5FA" size={20} />;
    if (b.includes("edge")) return <Globe color="#3B82F6" size={20} />;
    if (b.includes("firefox")) return <Globe color="#F97316" size={20} />;
    if (b.includes("safari")) return <Globe color="#93C5FD" size={20} />;
    return <Globe color="#94A3B8" size={20} />;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <RefreshCw className="spinner" size={32} />
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-premium">
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="header-content">
          <h2>Vue d'ensemble</h2>
          <p>
            Gérez la synchronisation de vos favoris sur tous vos appareils.
          </p>
        </div>
        <button
          onClick={handleRequestSync}
          disabled={status?.sync_in_progress || isSyncing}
          className={`btn-sync ${status?.sync_in_progress || isSyncing ? "syncing" : ""}`}
        >
          <RefreshCw size={18} className={status?.sync_in_progress || isSyncing ? "spinner" : ""} />
          <span>{status?.sync_in_progress || isSyncing ? "Synchronisation..." : "Synchroniser"}</span>
        </button>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid-premium">
        {/* Total Bookmarks Card */}
        <div className="stat-card-premium card-bookmarks">
          <div className="card-bg-icon">
            <Bookmark size={64} />
          </div>
          <div className="card-header">
            <div className="icon-wrapper">
              <Bookmark size={24} />
            </div>
            <span className="card-label">Total Favoris</span>
          </div>
          <div className="card-value-container">
            <span className="card-value">
              {status?.total_bookmarks?.toLocaleString() || 0}
            </span>
            <span className="status-badge badge-indigo">
              Actifs
            </span>
          </div>
        </div>

        {/* Connected Clients Card */}
        <div className="stat-card-premium card-clients">
          <div className="card-bg-icon">
            <Monitor size={64} />
          </div>
          <div className="card-header">
            <div className="icon-wrapper">
              <Zap size={24} />
            </div>
            <span className="card-label">Appareils Connectés</span>
          </div>
          <div className="card-value-container">
            <span className="card-value">
              {status?.connected_clients || 0}
            </span>
            <span className="status-badge badge-emerald">
              En ligne
            </span>
          </div>
        </div>

        {/* Last Sync Card */}
        <div className="stat-card-premium card-sync">
          <div className="card-bg-icon">
            <Clock size={64} />
          </div>
          <div className="card-header">
            <div className="icon-wrapper">
              <Activity size={24} />
            </div>
            <span className="card-label">Dernière Synchro</span>
          </div>
          <div className="card-value-container vertical">
            <span className="card-value-sm">
              {status?.last_sync ? formatTime(status.last_sync) : "--:--"}
            </span>
            <span className="card-subtext">
              {status?.last_sync
                ? new Date(status.last_sync).toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long' })
                : "Aucune donnée"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="content-grid">

        {/* Sync Status Section */}
        <section className="dashboard-section status-section">
          <div className="section-header">
            <Activity className="section-icon" size={20} />
            <h3>État du système</h3>
          </div>

          <div className="status-content">
            <div className={`status-circle ${status?.last_error
              ? "status-error"
              : "status-success"
              }`}>
              {status?.last_error ? (
                <AlertCircle size={48} />
              ) : (
                <CheckCircle2 size={48} />
              )}
              {status?.sync_in_progress && (
                <div className="spinner-ring" />
              )}
            </div>

            <h4>
              {status?.sync_in_progress
                ? "Synchronisation en cours..."
                : status?.last_error
                  ? "Erreur de synchronisation"
                  : "Système opérationnel"}
            </h4>

            <p className="status-message">
              {status?.last_error
                ? status.last_error
                : status?.sync_in_progress
                  ? "Vos favoris sont en train d'être mis à jour sur tous vos appareils."
                  : "Tous les services fonctionnent normalement. Vos favoris sont à jour."}
            </p>
          </div>
        </section>

        {/* Connected Browsers List */}
        <section className="dashboard-section clients-section">
          <div className="section-header">
            <div className="header-left">
              <Monitor className="section-icon" size={20} />
              <h3>Extensions actives</h3>
            </div>
            <span className="badge-counter">
              {clients.length} connectés
            </span>
          </div>

          <div className="clients-list-container">
            {clients.length === 0 ? (
              <div className="clients-empty">
                <Monitor size={32} className="empty-icon" />
                <p>Aucune extension connectée</p>
              </div>
            ) : (
              <div className="clients-list">
                {clients.map((client) => (
                  <div key={client.id} className="client-row">
                    <div className="client-info-group">
                      <div className="client-icon-wrapper">
                        {getBrowserIcon(client.browser)}
                      </div>
                      <div className="client-details">
                        <h4>{client.browser}</h4>
                        <div className="client-status-line">
                          <span className="status-dot-active" />
                          <span>Actif {new Date(client.last_activity).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
