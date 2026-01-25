import { useEffect, useState } from "react";
import {
  getConfig,
  saveConfig,
  getDataDirectory,
  type Config,
} from "../hooks/useTauriCommands";

function Settings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [dataDir, setDataDir] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cfg, dir] = await Promise.all([getConfig(), getDataDirectory()]);
        setConfig(cfg);
        setDataDir(dir);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      const success = await saveConfig(config);
      if (success) {
        setMessage({ type: "success", text: "Paramètres enregistrés avec succès" });
      } else {
        setMessage({ type: "error", text: "Échec de l'enregistrement" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement" });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = <K extends keyof Config>(key: K, value: Config[K]) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  if (!config) {
    return <div className="loading">Chargement des paramètres...</div>;
  }

  return (
    <div className="settings">
      <h2>Paramètres</h2>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section">
        <h3>Synchronisation</h3>

        <div className="setting-item">
          <div className="setting-info">
            <label>Synchronisation activée</label>
            <span className="setting-description">
              Activer ou désactiver la synchronisation automatique
            </span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => updateConfig("enabled", e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Synchronisation automatique</label>
            <span className="setting-description">
              Synchroniser automatiquement lors des modifications
            </span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={config.auto_sync}
              onChange={(e) => updateConfig("auto_sync", e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Intervalle de synchronisation</label>
            <span className="setting-description">
              Temps entre les synchronisations automatiques (en secondes)
            </span>
          </div>
          <input
            type="number"
            className="input-number"
            value={config.sync_interval}
            min={60}
            max={3600}
            onChange={(e) => updateConfig("sync_interval", parseInt(e.target.value) || 300)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Nombre maximum de favoris</label>
            <span className="setting-description">
              Limite le nombre de favoris à synchroniser
            </span>
          </div>
          <input
            type="number"
            className="input-number"
            value={config.max_bookmarks}
            min={100}
            max={50000}
            onChange={(e) => updateConfig("max_bookmarks", parseInt(e.target.value) || 10000)}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3>Sauvegarde</h3>

        <div className="setting-item">
          <div className="setting-info">
            <label>Sauvegardes automatiques</label>
            <span className="setting-description">
              Créer des sauvegardes avant chaque synchronisation
            </span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={config.backup_enabled}
              onChange={(e) => updateConfig("backup_enabled", e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Réseau</h3>

        <div className="setting-item">
          <div className="setting-info">
            <label>Port WebSocket</label>
            <span className="setting-description">
              Port pour la communication avec les extensions (redémarrage requis)
            </span>
          </div>
          <input
            type="number"
            className="input-number"
            value={config.websocket_port}
            min={1024}
            max={65535}
            onChange={(e) => updateConfig("websocket_port", parseInt(e.target.value) || 9876)}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3>Stockage</h3>

        <div className="setting-item">
          <div className="setting-info">
            <label>Répertoire de données</label>
            <span className="setting-description data-path">{dataDir}</span>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
        </button>
      </div>
    </div>
  );
}

export default Settings;
