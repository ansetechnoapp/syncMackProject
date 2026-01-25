import type { SyncStatus } from "../hooks/useTauriCommands";

interface SyncStatusProps {
  status: SyncStatus | null;
}

function SyncStatusComponent({ status }: SyncStatusProps) {
  if (!status) {
    return <div className="sync-status loading">Chargement...</div>;
  }

  const getStatusClass = () => {
    if (status.sync_in_progress) return "syncing";
    if (status.last_error) return "error";
    if (status.last_sync) return "success";
    return "idle";
  };

  const getStatusText = () => {
    if (status.sync_in_progress) return "Synchronisation en cours...";
    if (status.last_error) return `Erreur: ${status.last_error}`;
    if (status.last_sync) {
      const lastSync = new Date(status.last_sync);
      const now = new Date();
      const diffMs = now.getTime() - lastSync.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Synchronisé à l'instant";
      if (diffMins < 60) return `Synchronisé il y a ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Synchronisé il y a ${diffHours}h`;
      return `Dernière sync: ${lastSync.toLocaleDateString("fr-FR")}`;
    }
    return "En attente de synchronisation";
  };

  return (
    <div className={`sync-status ${getStatusClass()}`}>
      <div className="status-indicator">
        <span className={`status-dot ${getStatusClass()}`}></span>
        <span className="status-text">{getStatusText()}</span>
      </div>
      <div className="status-details">
        <span>{status.total_bookmarks} favoris</span>
        <span>{status.connected_clients} extension(s) connectée(s)</span>
      </div>
    </div>
  );
}

export default SyncStatusComponent;
