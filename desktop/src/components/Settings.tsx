import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  getConfig,
  saveConfig,
  getDataDirectory,
  getWorkspaces,
  exportWorkspaceToFile,
  importWorkspaceFromFile,
  createBackup,
  restoreBackup,
  checkForUpdates,
  type WorkspaceSummary,
  type Config,
} from "../hooks/useTauriCommands";

function Settings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [dataDir, setDataDir] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [exportWorkspaceId, setExportWorkspaceId] = useState<string>("");
  const [exportResult, setExportResult] = useState<string>("");
  const [importPath, setImportPath] = useState<string>("");
  const [importResult, setImportResult] = useState<string>("");
  const [backupResult, setBackupResult] = useState<string>("");
  const [restorePath, setRestorePath] = useState<string>("");
  const [restoreResult, setRestoreResult] = useState<string>("");
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [cfg, dir, ws] = await Promise.all([getConfig(), getDataDirectory(), getWorkspaces()]);
      setConfig(cfg);
      setDataDir(dir);
      setWorkspaces(ws);
      if (!exportWorkspaceId && ws.length > 0) {
        setExportWorkspaceId(ws[0].id);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      setLoadError("Impossible de charger les paramètres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleExportWorkspace = async () => {
    if (!exportWorkspaceId) return;
    try {
      setExportResult("");
      const path = await exportWorkspaceToFile(exportWorkspaceId);
      setExportResult(path);
      setMessage({ type: "success", text: "Workspace exporté" });
    } catch (e) {
      setMessage({ type: "error", text: `Erreur export: ${e}` });
    }
  };

  const handlePickImportFile = async () => {
    try {
      const selected = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });
      if (selected) {
        setImportPath(selected as string);
      }
    } catch (e) {
      console.error("Erreur sélection fichier:", e);
    }
  };

  const handleImportWorkspace = async () => {
    if (!importPath.trim()) return;
    try {
      setImportResult("");
      const ws = await importWorkspaceFromFile(importPath.trim(), "create");
      setImportResult(ws.id);
      setMessage({ type: "success", text: "Workspace importé" });
      await loadData();
    } catch (e) {
      setMessage({ type: "error", text: `Erreur import: ${e}` });
    }
  };

  const handleBackup = async () => {
    try {
      setBackupResult("");
      const path = await createBackup();
      setBackupResult(path);
      setMessage({ type: "success", text: "Sauvegarde créée" });
    } catch (e) {
      setMessage({ type: "error", text: `Erreur sauvegarde: ${e}` });
    }
  };

  const handlePickRestoreFile = async () => {
    try {
      const selected = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });
      if (selected) {
        setRestorePath(selected as string);
      }
    } catch (e) {
      console.error("Erreur sélection fichier:", e);
    }
  };

  const handleRestore = async () => {
    if (!restorePath.trim()) return;
    try {
      setRestoreResult("");
      const pre = await restoreBackup(restorePath.trim());
      setRestoreResult(pre);
      setMessage({ type: "success", text: "Restauration terminée" });
      await loadData();
    } catch (e) {
      setMessage({ type: "error", text: `Erreur restauration: ${e}` });
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus("");
    try {
      const version = await checkForUpdates();
      if (version) {
        setUpdateStatus(`Nouvelle version disponible : ${version}`);
      } else {
        setUpdateStatus("Aucune mise à jour disponible");
      }
    } catch (e) {
      setUpdateStatus(`Erreur : ${e}`);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const updateConfig = <K extends keyof Config>(key: K, value: Config[K]) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  if (loading) {
    return <div className="loading">Chargement des paramètres...</div>;
  }

  if (loadError) {
    return (
      <div className="loading">
        <div>{loadError}</div>
        <button className="btn btn-primary" onClick={loadData}>
          Réessayer
        </button>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="loading">
        <div>Paramètres indisponibles</div>
        <button className="btn btn-primary" onClick={loadData}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="scrollable-page">
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

        <div className="settings-section">
          <h3>Import / Export</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label>Exporter un workspace</label>
              <span className="setting-description">
                Exporte un workspace en JSON dans le dossier exports
              </span>
            </div>
            <div className="inline-controls">
              <select value={exportWorkspaceId} onChange={(e) => setExportWorkspaceId(e.target.value)}>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleExportWorkspace}>
                Exporter
              </button>
            </div>
          </div>
          {exportResult && <div className="setting-hint">Fichier: {exportResult}</div>}

          <div className="setting-item">
            <div className="setting-info">
              <label>Importer un workspace</label>
              <span className="setting-description">
                Import en mode création (nouvel ID)
              </span>
            </div>
            <div className="inline-controls">
              <button className="btn btn-secondary" onClick={handlePickImportFile}>
                Parcourir...
              </button>
              {importPath && <span className="setting-description" style={{ fontSize: 11 }}>{importPath}</span>}
              <button className="btn btn-primary" onClick={handleImportWorkspace} disabled={!importPath.trim()}>
                Importer
              </button>
            </div>
          </div>
          {importResult && <div className="setting-hint">Workspace créé: {importResult}</div>}
        </div>

        <div className="settings-section">
          <h3>Sauvegarde / Restauration</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label>Sauvegarde complète</label>
              <span className="setting-description">
                Crée un backup complet (index + workspaces)
              </span>
            </div>
            <button className="btn btn-primary" onClick={handleBackup}>
              Créer une sauvegarde
            </button>
          </div>
          {backupResult && <div className="setting-hint">Backup: {backupResult}</div>}

          <div className="setting-item">
            <div className="setting-info">
              <label>Restaurer un backup</label>
              <span className="setting-description">
                Restaure depuis un fichier backup JSON
              </span>
            </div>
            <div className="inline-controls">
              <button className="btn btn-secondary" onClick={handlePickRestoreFile}>
                Parcourir...
              </button>
              {restorePath && <span className="setting-description" style={{ fontSize: 11 }}>{restorePath}</span>}
              <button className="btn btn-primary" onClick={handleRestore} disabled={!restorePath.trim()}>
                Restaurer
              </button>
            </div>
          </div>
          {restoreResult && <div className="setting-hint">Backup pré-restauration: {restoreResult}</div>}
        </div>

        <div className="settings-section">
          <h3>Mises à jour</h3>

          <div className="setting-item">
            <div className="setting-info">
              <label>Vérifier les mises à jour</label>
              <span className="setting-description">
                Recherche de nouvelles versions de SyncMark
              </span>
            </div>
            <button className="btn btn-primary" onClick={handleCheckUpdates} disabled={checkingUpdate}>
              {checkingUpdate ? "Vérification..." : "Vérifier"}
            </button>
          </div>
          {updateStatus && <div className="setting-hint">{updateStatus}</div>}
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
    </div>
  );
}

export default Settings;
