import type { ConnectedClient } from "../hooks/useTauriCommands";

interface ConnectionIndicatorProps {
  clients: ConnectedClient[];
}

function ConnectionIndicator({ clients }: ConnectionIndicatorProps) {
  if (clients.length === 0) {
    return (
      <div className="connection-indicator empty">
        <div className="no-clients">
          <span className="icon">🔌</span>
          <p>Aucune extension connectée</p>
          <span className="hint">
            Installez l'extension SyncMark dans votre navigateur et assurez-vous
            que cette application est en cours d'exécution.
          </span>
        </div>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return "à l'instant";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `il y a ${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    return `il y a ${diffHours}h`;
  };

  const getBrowserIcon = (browser: string) => {
    const browserLower = browser.toLowerCase();
    if (browserLower.includes("chrome")) return "🌐";
    if (browserLower.includes("firefox")) return "🦊";
    if (browserLower.includes("edge")) return "🔵";
    if (browserLower.includes("safari")) return "🧭";
    if (browserLower.includes("opera")) return "🔴";
    if (browserLower.includes("brave")) return "🦁";
    return "🌐";
  };

  return (
    <div className="connection-indicator">
      <ul className="clients-list">
        {clients.map((client) => (
          <li key={client.id} className="client-item">
            <div className="client-icon">{getBrowserIcon(client.browser)}</div>
            <div className="client-info">
              <span className="client-browser">{client.browser}</span>
              <span className="client-meta">
                Connecté à {formatTime(client.connected_at)} • Actif{" "}
                {getTimeSince(client.last_activity)}
              </span>
            </div>
            <div className="client-status">
              <span className="status-dot connected"></span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ConnectionIndicator;
