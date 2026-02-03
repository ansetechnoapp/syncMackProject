const NATIVE_HOST_NAME = "com.syncmark.host";
const WEBSOCKET_URL = "ws://localhost:9876";
const RECONNECT_INTERVAL = 5000;

let websocket = null;
let isWebSocketConnected = false;
let reconnectTimeout = null;
let pendingResponses = new Map();
let messageId = 0;
let isUpdatingFromDesktop = false; // Flag pour éviter les boucles infinies
let isReadOnlyMode = false; // Mode lecture seule pour le workspace

const ROOT_BAR_SYNC_ID = "root_bar";
const UNASSIGNED_WORKSPACE_ID = "__unassigned__";
const STORAGE_KEYS = {
  browserInstanceId: "syncmark.browserInstanceId",
  currentWorkspace: "syncmark.currentWorkspace",
  workspaceStatePrefix: "syncmark.workspaceState.",
};

let browserInstanceId = null;
let workspaceState = {
  chromeToSync: new Map(),
  syncToChrome: new Map(),
  lamportBySync: new Map(),
};

// ==================== État des Workspaces ====================
let currentWorkspace = null;  // { id, name, version }
let availableWorkspaces = [];
let isWorkspaceSwitching = false;

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, () => resolve());
  });
}

async function getOrCreateBrowserInstanceId() {
  const existing = await storageGet([STORAGE_KEYS.browserInstanceId]);
  const current = existing[STORAGE_KEYS.browserInstanceId];
  if (typeof current === "string" && current.length > 0) {
    return current;
  }
  const id = crypto.randomUUID();
  await storageSet({ [STORAGE_KEYS.browserInstanceId]: id });
  return id;
}

function workspaceStateKey(workspaceId) {
  return `${STORAGE_KEYS.workspaceStatePrefix}${workspaceId}`;
}

async function loadWorkspaceState(workspaceId) {
  if (!workspaceId) {
    workspaceState = { chromeToSync: new Map(), syncToChrome: new Map(), lamportBySync: new Map() };
    return;
  }

  const data = await storageGet([workspaceStateKey(workspaceId)]);
  const raw = data[workspaceStateKey(workspaceId)] || {};
  const chromeToSync = new Map(Object.entries(raw.chromeToSync || {}));
  const syncToChrome = new Map(Object.entries(raw.syncToChrome || {}));
  const lamportBySync = new Map(Object.entries(raw.lamportBySync || {}).map(([k, v]) => [k, Number(v) || 0]));

  chromeToSync.set("1", ROOT_BAR_SYNC_ID);
  syncToChrome.set(ROOT_BAR_SYNC_ID, "1");

  workspaceState = { chromeToSync, syncToChrome, lamportBySync };
}

async function persistWorkspaceState(workspaceId) {
  if (!workspaceId) return;
  const chromeToSync = Object.fromEntries(workspaceState.chromeToSync.entries());
  const syncToChrome = Object.fromEntries(workspaceState.syncToChrome.entries());
  const lamportBySync = Object.fromEntries(workspaceState.lamportBySync.entries());
  await storageSet({
    [workspaceStateKey(workspaceId)]: { chromeToSync, syncToChrome, lamportBySync },
  });
}

function getOrCreateSyncIdForChromeId(workspaceId, chromeId) {
  if (chromeId === "1") return ROOT_BAR_SYNC_ID;
  const existing = workspaceState.chromeToSync.get(chromeId);
  if (existing) return existing;
  const sid = crypto.randomUUID();
  workspaceState.chromeToSync.set(chromeId, sid);
  workspaceState.syncToChrome.set(sid, chromeId);
  if (!workspaceState.lamportBySync.has(sid)) workspaceState.lamportBySync.set(sid, 0);
  persistWorkspaceState(workspaceId).catch(() => {});
  return sid;
}

function getChromeIdForSyncId(workspaceId, syncId) {
  if (syncId === ROOT_BAR_SYNC_ID) return "1";
  const existing = workspaceState.syncToChrome.get(syncId);
  return existing || null;
}

// ==================== WebSocket Communication ====================

function connectWebSocket() {
  if (websocket && (websocket.readyState === WebSocket.CONNECTING || websocket.readyState === WebSocket.OPEN)) {
    return;
  }

  console.log("Tentative de connexion WebSocket...");

  try {
    websocket = new WebSocket(WEBSOCKET_URL);

    websocket.onopen = async () => {
      console.log("WebSocket connecté");
      isWebSocketConnected = true;
      clearTimeout(reconnectTimeout);

      // Assurer que l'ID d'instance est chargé
      if (!browserInstanceId) {
        browserInstanceId = await getOrCreateBrowserInstanceId();
      }

      // Identify ourselves to the desktop app avec l'ID du workspace actuel
      const detectedBrowser = await getBrowserName();
      console.log("Navigateur détecté:", detectedBrowser);
      sendWebSocketMessage({
        type: "identify",
        payload: {
          browser: detectedBrowser,
          extensionId: chrome.runtime.id,
          browserInstanceId: browserInstanceId,
          currentWorkspaceId: currentWorkspace?.id || null
        }
      });

      // Broadcast connection status to popup
      chrome.runtime.sendMessage({
        type: "connection_status",
        connected: true,
        workspace: currentWorkspace
      }).catch(() => {});
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (e) {
        console.error("Erreur parsing message WebSocket:", e);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket déconnecté");
      isWebSocketConnected = false;
      websocket = null;

      // Broadcast disconnection status
      chrome.runtime.sendMessage({ type: "connection_status", connected: false }).catch(() => {});

      // Schedule reconnection
      scheduleReconnect();
    };

    websocket.onerror = (error) => {
      console.error("Erreur WebSocket:", error);
      isWebSocketConnected = false;
    };

  } catch (e) {
    console.error("Erreur création WebSocket:", e);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  reconnectTimeout = setTimeout(() => {
    connectWebSocket();
  }, RECONNECT_INTERVAL);
}

function sendWebSocketMessage(message) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    try {
      websocket.send(JSON.stringify(message));
      return true;
    } catch (e) {
      console.error("Erreur envoi message WebSocket:", e, "Message:", message.type);
      return false;
    }
  }
  console.warn("WebSocket non disponible pour message:", message.type);
  return false;
}

function handleWebSocketMessage(message) {
  // Valider le message avant de le traiter
  if (!isValidWebSocketMessage(message)) {
    console.warn("Message WebSocket invalide ou non autorisé:", message);
    return;
  }

  console.log("Message reçu du desktop:", message.type);

  switch (message.type) {
    case "connected":
      console.log("Identifié auprès du serveur:", message.payload);
      break;

    case "pong":
      // Heartbeat response
      break;

    case "sync_request":
      // Desktop app is requesting a sync
      console.log("Sync demandé, raison:", message.payload?.reason);
      performSync().then(result => {
        console.log("Sync demandé par desktop:", result ? "succès" : "échec");
      });
      break;

    case "sync_complete":
      // Sync operation completed
      if (message.payload) {
        // Mettre à jour le workspace si présent
        if (message.payload.workspaceId) {
          currentWorkspace = {
            id: message.payload.workspaceId,
            name: currentWorkspace?.name || "Workspace",
            version: message.payload.version || 1
          };
          storageSet({ [STORAGE_KEYS.currentWorkspace]: currentWorkspace }).catch(() => {});
          loadWorkspaceState(currentWorkspace.id).catch(() => {});
        }
        if (message.payload.bookmarks && currentWorkspace && message.payload.workspaceId === currentWorkspace.id) {
          switchToWorkspaceSnapshot(currentWorkspace.id, message.payload.bookmarks, message.payload.folders || [], message.payload.version || 1)
            .catch(e => console.error("Erreur mise à jour favoris:", e));
        }
      }
      break;

    case "bookmarks_updated":
      // Bookmarks were updated from desktop app
      console.log("Favoris mis à jour depuis le desktop");
      if (message.payload) {
        // Vérifier si c'est pour notre workspace
        if (message.payload.workspaceId && currentWorkspace) {
          if (message.payload.workspaceId !== currentWorkspace.id) {
            console.log("Ignoré: mise à jour pour un autre workspace");
            break;
          }
          // Mettre à jour la version
          if (message.payload.version) {
            currentWorkspace.version = message.payload.version;
          }
        }
        if (message.payload.bookmarks && currentWorkspace) {
          switchToWorkspaceSnapshot(currentWorkspace.id, message.payload.bookmarks, message.payload.folders || [], message.payload.version || currentWorkspace.version || 1)
            .catch(e => console.error("Erreur mise à jour favoris depuis desktop:", e));
        }
      }
      break;

    case "config_updated":
      console.log("Configuration mise à jour");
      break;

    case "folders_updated":
      // Folders were updated from desktop app
      console.log("Dossiers mis à jour depuis le desktop");
      if (message.payload && message.payload.folders) {
        updateFoldersFromNative(message.payload.folders).catch(e => {
          console.error("Erreur mise à jour dossiers depuis desktop:", e);
        });
      }
      break;

    case "create_folder":
      // Desktop requests the browser to create a folder and return the real Chrome ID.
      if (message.payload) {
        createFolderFromDesktop(message.payload).catch((e) => {
          console.error("Erreur création dossier depuis desktop:", e);
        });
      }
      break;

    case "workspace_switched":
      // Desktop nous demande de charger un nouveau workspace
      if (message.payload) {
        if (message.payload.targetBrowserInstanceId && message.payload.targetBrowserInstanceId !== browserInstanceId) {
          break;
        }
        console.log("Switch vers workspace:", message.payload.workspaceName);
        // Vérifier le mode (ReadOnly ou ReadWrite)
        isReadOnlyMode = message.payload.mode === "ReadOnly";
        console.log("Mode:", isReadOnlyMode ? "Lecture seule" : "Lecture/Écriture");
        const previous = currentWorkspace;

        if (previous && previous.id && previous.id !== message.payload.workspaceId) {
          performSyncForWorkspaceId(previous.id).catch(() => {});
        }

        currentWorkspace = {
          id: message.payload.workspaceId,
          name: message.payload.workspaceName,
          version: message.payload.version || 1
        };

        storageSet({ [STORAGE_KEYS.currentWorkspace]: currentWorkspace }).catch(() => {});

        isWorkspaceSwitching = true;

        (message.payload.created ? migrateUnassignedStateToWorkspace(currentWorkspace.id) : Promise.resolve())
          .then(() => switchToWorkspaceSnapshot(currentWorkspace.id, message.payload.bookmarks || [], message.payload.folders || [], currentWorkspace.version))
          .then(async () => {
            await loadWorkspaceState(currentWorkspace.id);
            console.log("Switch workspace terminé");
            isWorkspaceSwitching = false;
            chrome.runtime.sendMessage({
              type: "workspace_changed",
              workspace: currentWorkspace,
              created: message.payload.created || false
            }).catch(() => {});
          })
          .catch(e => {
            console.error("Erreur switch workspace:", e);
            isWorkspaceSwitching = false;
          });
      }
      break;

    case "workspaces_list":
      // Liste des workspaces disponibles
      if (message.payload && message.payload.workspaces) {
        availableWorkspaces = message.payload.workspaces;
        console.log("Workspaces disponibles:", availableWorkspaces.length);
        // Notifier le popup
        chrome.runtime.sendMessage({
          type: "workspaces_updated",
          workspaces: availableWorkspaces
        }).catch(() => {});
      }
      break;

    case "sync_rejected":
      console.warn("Sync rejeté:", message.payload?.reason);
      break;

    case "error":
      console.error("Erreur du serveur:", message.payload?.message);
      break;

    case "status":
      // Status response
      break;

    default:
      console.log("Message inconnu:", message.type);
  }
}

async function createFolderFromDesktop(payload) {
  const title = payload.title || "Nouveau dossier";
  const parentId = payload.parentId || "1";
  const tempId = payload.tempId;

  isUpdatingFromDesktop = true;
  try {
    const created = await chrome.bookmarks.create({
      parentId,
      title,
    });

    if (isWebSocketConnected) {
      sendWebSocketMessage({
        type: "folder_created",
        payload: {
          id: created.id,
          title: created.title,
          parentId: created.parentId,
          dateAdded: created.dateAdded,
          tempId,
        },
      });
    }
  } finally {
    isUpdatingFromDesktop = false;
  }
}

async function getBrowserName() {
  // Méthode 1: Utiliser getHighEntropyValues (plus fiable dans les Service Workers)
  if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
    try {
      const hints = await navigator.userAgentData.getHighEntropyValues(['fullVersionList', 'platform']);
      const brands = hints.fullVersionList || navigator.userAgentData.brands || [];

      // Ordre de priorité pour la détection (du plus spécifique au plus générique)
      for (const brand of brands) {
        const name = brand.brand || '';
        if (name === 'Brave') return 'Brave';
        if (name === 'Microsoft Edge') return 'Microsoft Edge';
        if (name === 'Opera') return 'Opera';
        if (name === 'Vivaldi') return 'Vivaldi';
      }
      // Vérifier Chrome en dernier (car il apparaît souvent avec d'autres navigateurs Chromium)
      for (const brand of brands) {
        const name = brand.brand || '';
        if (name === 'Google Chrome') return 'Google Chrome';
        if (name === 'Chromium') return 'Chromium';
      }
    } catch (e) {
      console.warn('getHighEntropyValues failed:', e);
    }
  }

  // Méthode 2: Fallback sur brands synchrone
  if (navigator.userAgentData && navigator.userAgentData.brands) {
    const brands = navigator.userAgentData.brands;
    if (brands.some(b => b.brand === 'Brave')) return 'Brave';
    if (brands.some(b => b.brand === 'Microsoft Edge')) return 'Microsoft Edge';
    if (brands.some(b => b.brand === 'Opera')) return 'Opera';
    if (brands.some(b => b.brand === 'Vivaldi')) return 'Vivaldi';
    if (brands.some(b => b.brand === 'Google Chrome')) return 'Google Chrome';
    if (brands.some(b => b.brand === 'Chromium')) return 'Chromium';
  }

  // Méthode 3: Fallback sur userAgent (moins fiable mais toujours utile)
  const userAgent = navigator.userAgent || '';
  if (userAgent.includes('Edg/')) return 'Microsoft Edge';
  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) return 'Opera';
  if (userAgent.includes('Brave')) return 'Brave';
  if (userAgent.includes('Vivaldi')) return 'Vivaldi';
  if (userAgent.includes('Chrome')) return 'Google Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';

  return 'Unknown Browser';
}

// ==================== Native Messaging (Fallback) ====================

function sendMessageToNativeHost(message) {
  return new Promise((resolve, reject) => {
    console.log("Connexion au programme compagnon (Native Messaging)...");
    const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    let responseReceived = false;

    port.onMessage.addListener((response) => {
      responseReceived = true;
      // console.log("Message reçu du programme compagnon:", response);
      if (response.status === "success") {
        resolve(response);
      } else {
        reject(new Error(response.error || "Une erreur inconnue est survenue."));
      }
      port.disconnect();
    });

    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) {
        const errorMessage = `Déconnecté avec erreur: ${chrome.runtime.lastError.message}`;
        console.error(errorMessage);
        reject(new Error(errorMessage));
      } else if (!responseReceived) {
        reject(new Error("Déconnecté sans réponse."));
      }
    });

    port.postMessage(message);
  });
}

// ==================== Bookmark Sync Logic ====================

// Types de messages WebSocket autorisés (pour validation)
const ALLOWED_WS_TYPES = new Set([
  "connected",
  "pong",
  "sync_request",
  "sync_complete",
  "bookmarks_updated",
  "config_updated",
  "folders_updated",
  "create_folder",
  "status",
  // Nouveaux messages pour les workspaces
  "workspace_switched",
  "workspaces_list",
  "sync_rejected",
  "error"
]);

/**
 * Valide un message WebSocket entrant
 */
function isValidWebSocketMessage(msg) {
  if (!msg || typeof msg !== "object") return false;
  if (typeof msg.type !== "string") return false;
  if (!ALLOWED_WS_TYPES.has(msg.type)) return false;

  // Valider la structure du payload selon le type
  if (msg.payload != null && typeof msg.payload !== "object") return false;

  // Validations spécifiques par type
  if (msg.type === "bookmarks_updated" || msg.type === "sync_complete") {
    if (msg.payload && !Array.isArray(msg.payload.bookmarks)) return false;
  }
  if (msg.type === "folders_updated") {
    if (msg.payload && !Array.isArray(msg.payload.folders)) return false;
  }
  if (msg.type === "create_folder") {
    if (!msg.payload || typeof msg.payload.title !== "string") return false;
  }

  return true;
}

/**
 * Supprime tous les favoris du navigateur (sauf les dossiers racines)
 * Utilisé pour la synchronisation en "format arbre Chrome"
 */
async function clearAllBookmarks() {
  const [bar] = await chrome.bookmarks.getSubTree("1");
  const children = (bar && bar.children) ? bar.children : [];
  for (const child of children) {
    try {
      await chrome.bookmarks.removeTree(child.id);
    } catch (e) {
      console.error("Erreur suppression favori:", child.id, e);
    }
  }
}

/**
 * Remplace tous les favoris du navigateur par ceux d'un workspace
 * Utilisé lors du switch de workspace
 */
async function replaceAllBookmarks(workspaceId, bookmarks, folders) {
  isUpdatingFromDesktop = true;

  try {
    workspaceState.chromeToSync = new Map([ ["1", ROOT_BAR_SYNC_ID] ]);
    workspaceState.syncToChrome = new Map([ [ROOT_BAR_SYNC_ID, "1"] ]);

    // 1. Supprimer tous les favoris actuels
    await clearAllBookmarks();

    // 2. Créer d'abord les dossiers (pour avoir les bons parentIds)
    const folderIdMap = new Map(); // ancienId -> nouveauId

    // Trier les dossiers par niveau de profondeur (parents d'abord)
    const sortedFolders = (folders || []).filter(f => {
      if (f.deleted) return false;
      const syncId = f.syncId || f.sync_id || f.id;
      return syncId !== ROOT_BAR_SYNC_ID;
    }).sort((a, b) => {
      const depthA = getParentDepth(a.parentId, folders);
      const depthB = getParentDepth(b.parentId, folders);
      return depthA - depthB;
    });

    for (const folder of sortedFolders) {
      // Déterminer le parent (root "1" par défaut si parentId Chrome root)
      const parentSyncId = folder.parentId || ROOT_BAR_SYNC_ID;
      const parentChromeId = getChromeIdForSyncId(workspaceId, parentSyncId) || "1";

      try {
        const created = await chrome.bookmarks.create({
          parentId: parentChromeId,
          title: folder.title
        });
        const syncId = folder.syncId || folder.sync_id || folder.id;
        workspaceState.chromeToSync.set(created.id, syncId);
        workspaceState.syncToChrome.set(syncId, created.id);
        folderIdMap.set(syncId, created.id);
        const lamport = Number(folder.updatedAtLamport || folder.updated_at_lamport || 0);
        workspaceState.lamportBySync.set(syncId, lamport);
      } catch (e) {
        console.error("Erreur création dossier:", folder.title, e);
      }
    }

    // 3. Créer les favoris
    for (const bookmark of (bookmarks || []).filter(b => !b.deleted)) {
      if (!bookmark.url) continue;

      // Déterminer le parent
      const parentSyncId = bookmark.parentId || ROOT_BAR_SYNC_ID;
      const parentChromeId = folderIdMap.get(parentSyncId) || getChromeIdForSyncId(workspaceId, parentSyncId) || "1";

      try {
        const created = await chrome.bookmarks.create({
          parentId: parentChromeId,
          title: bookmark.title || bookmark.url,
          url: bookmark.url
        });
        const syncId = bookmark.syncId || bookmark.sync_id || bookmark.id;
        workspaceState.chromeToSync.set(created.id, syncId);
        workspaceState.syncToChrome.set(syncId, created.id);
        const lamport = Number(bookmark.updatedAtLamport || bookmark.updated_at_lamport || 0);
        workspaceState.lamportBySync.set(syncId, lamport);
      } catch (e) {
        console.error("Erreur création favori:", bookmark.title, e);
      }
    }

    await persistWorkspaceState(workspaceId);

    console.log(`Workspace chargé: ${bookmarks?.length || 0} favoris, ${folders?.length || 0} dossiers`);
  } finally {
    isUpdatingFromDesktop = false;
  }
}

/**
 * Calcule la profondeur d'un dossier dans la hiérarchie
 */
function getParentDepth(parentId, folders) {
  if (!parentId || parentId === "root" || parentId === ROOT_BAR_SYNC_ID || ["0", "1", "2"].includes(parentId)) return 0;
  const parent = folders.find(f => f.id === parentId);
  if (!parent) return 0;
  return 1 + getParentDepth(parent.parentId, folders);
}

async function performSync() {
  try {
    const wsId = currentWorkspace?.id || UNASSIGNED_WORKSPACE_ID;
    await loadWorkspaceState(wsId);
    const [bar] = await chrome.bookmarks.getSubTree("1");
    const treeWithSync = await injectSyncIdsIntoTree(wsId, bar, ROOT_BAR_SYNC_ID);

    // Try WebSocket first
    if (isWebSocketConnected) {
      sendWebSocketMessage({
        type: "sync_bookmarks",
        payload: currentWorkspace ? { workspaceId: currentWorkspace.id, bookmarks: [treeWithSync] } : { bookmarks: [treeWithSync] }
      });
      return true;
    }

    // Fallback to Native Messaging
    console.log("WebSocket non disponible, utilisation de Native Messaging...");
    const response = await sendMessageToNativeHost({
      type: "sync_bookmarks",
      bookmarks: [treeWithSync]
    });

    if (response.status === "success" && response.bookmarks) {
      await updateBookmarksFromNative(response.bookmarks);
    }

    return true;
  } catch (error) {
    console.error("Erreur sync:", error);
    throw error;
  }
}

async function injectSyncIdsIntoTree(workspaceId, node, forcedSyncId) {
  const syncId = forcedSyncId || getOrCreateSyncIdForChromeId(workspaceId, node.id);
  const lamport = workspaceState.lamportBySync.get(syncId) || 0;
  const parentSync = forcedSyncId ? "root" : (node.parentId ? getOrCreateSyncIdForChromeId(workspaceId, node.parentId) : "root");
  const out = {
    id: syncId,
    syncId,
    title: node.title,
    url: node.url,
    parentId: parentSync,
    dateAdded: node.dateAdded,
    updatedAtLamport: lamport,
    updatedBy: browserInstanceId || "",
  };
  if (node.children && node.children.length > 0) {
    out.children = [];
    for (const child of node.children) {
      const childParentSyncId = syncId;
      const childObj = await injectSyncIdsIntoTree(workspaceId, child, null);
      childObj.parentId = childParentSyncId;
      out.children.push(childObj);
    }
  }
  return out;
}

async function performSyncForWorkspaceId(workspaceId) {
  if (!workspaceId) return false;
  await loadWorkspaceState(workspaceId);
  const [bar] = await chrome.bookmarks.getSubTree("1");
  const treeWithSync = await injectSyncIdsIntoTree(workspaceId, bar, ROOT_BAR_SYNC_ID);
  if (isWebSocketConnected) {
    sendWebSocketMessage({
      type: "sync_bookmarks",
      payload: { workspaceId, bookmarks: [treeWithSync] }
    });
    return true;
  }
  return false;
}

async function migrateUnassignedStateToWorkspace(workspaceId) {
  const raw = await storageGet([workspaceStateKey(UNASSIGNED_WORKSPACE_ID)]);
  const stateObj = raw[workspaceStateKey(UNASSIGNED_WORKSPACE_ID)];
  if (!stateObj || typeof stateObj !== "object") return;
  await storageSet({ [workspaceStateKey(workspaceId)]: stateObj });
  await new Promise((resolve) => chrome.storage.local.remove([workspaceStateKey(UNASSIGNED_WORKSPACE_ID)], () => resolve()));
}

async function switchToWorkspaceSnapshot(workspaceId, bookmarks, folders, version) {
  await loadWorkspaceState(workspaceId);

  for (const f of folders || []) {
    const syncId = f.syncId || f.sync_id || f.id;
    if (syncId) {
      workspaceState.lamportBySync.set(syncId, Number(f.updatedAtLamport || f.updated_at_lamport || 0));
    }
  }
  for (const b of bookmarks || []) {
    const syncId = b.syncId || b.sync_id || b.id;
    if (syncId) {
      workspaceState.lamportBySync.set(syncId, Number(b.updatedAtLamport || b.updated_at_lamport || 0));
    }
  }

  // Mise à jour incrémentale si on a déjà des mappings (pas un premier chargement/switch)
  const hasExistingMappings = workspaceState.syncToChrome.size > 1 && !isWorkspaceSwitching;
  if (hasExistingMappings) {
    await applyIncrementalUpdate(workspaceId, bookmarks, folders);
  } else {
    await replaceAllBookmarks(workspaceId, bookmarks, folders);
  }

  if (currentWorkspace) {
    currentWorkspace.version = version;
  }
}

/**
 * Mise à jour incrémentale : met à jour/crée/supprime les items un par un
 * au lieu de tout supprimer et recréer (évite le flicker)
 */
async function applyIncrementalUpdate(workspaceId, bookmarks, folders) {
  isUpdatingFromDesktop = true;

  try {
    // Construire les maps des items entrants par syncId
    const incomingFoldersBySyncId = new Map();
    for (const f of (folders || [])) {
      const syncId = f.syncId || f.sync_id || f.id;
      if (syncId && syncId !== ROOT_BAR_SYNC_ID) {
        incomingFoldersBySyncId.set(syncId, f);
      }
    }

    const incomingBookmarksBySyncId = new Map();
    for (const b of (bookmarks || [])) {
      const syncId = b.syncId || b.sync_id || b.id;
      if (syncId) {
        incomingBookmarksBySyncId.set(syncId, b);
      }
    }

    // 1. Supprimer les items locaux absents de incoming
    const syncToChromeCopy = new Map(workspaceState.syncToChrome);
    for (const [syncId, chromeId] of syncToChromeCopy) {
      if (syncId === ROOT_BAR_SYNC_ID) continue;

      const inFolder = incomingFoldersBySyncId.has(syncId);
      const inBookmark = incomingBookmarksBySyncId.has(syncId);
      const isDeletedFolder = inFolder && incomingFoldersBySyncId.get(syncId).deleted;
      const isDeletedBookmark = inBookmark && incomingBookmarksBySyncId.get(syncId).deleted;

      if ((!inFolder && !inBookmark) || isDeletedFolder || isDeletedBookmark) {
        try {
          await chrome.bookmarks.removeTree(chromeId);
        } catch (e) {
          // Déjà supprimé ou n'existe pas
        }
        workspaceState.syncToChrome.delete(syncId);
        workspaceState.chromeToSync.delete(chromeId);
        workspaceState.lamportBySync.delete(syncId);
      }
    }

    // 2. Créer/mettre à jour les dossiers (triés par profondeur, parents d'abord)
    const sortedFolders = (folders || []).filter(f => {
      if (f.deleted) return false;
      const syncId = f.syncId || f.sync_id || f.id;
      return syncId !== ROOT_BAR_SYNC_ID;
    }).sort((a, b) => {
      const depthA = getParentDepth(a.parentId, folders);
      const depthB = getParentDepth(b.parentId, folders);
      return depthA - depthB;
    });

    for (const folder of sortedFolders) {
      const syncId = folder.syncId || folder.sync_id || folder.id;
      const existingChromeId = workspaceState.syncToChrome.get(syncId);
      const parentSyncId = folder.parentId || ROOT_BAR_SYNC_ID;
      const parentChromeId = getChromeIdForSyncId(workspaceId, parentSyncId) || "1";

      if (existingChromeId) {
        // Mettre à jour le dossier existant
        try {
          const [existing] = await chrome.bookmarks.get(existingChromeId);
          if (existing.title !== folder.title) {
            await chrome.bookmarks.update(existingChromeId, { title: folder.title });
          }
          if (existing.parentId !== parentChromeId) {
            await chrome.bookmarks.move(existingChromeId, { parentId: parentChromeId });
          }
        } catch (e) {
          // Le dossier n'existe plus, le recréer
          try {
            const created = await chrome.bookmarks.create({
              parentId: parentChromeId,
              title: folder.title
            });
            workspaceState.chromeToSync.delete(existingChromeId);
            workspaceState.chromeToSync.set(created.id, syncId);
            workspaceState.syncToChrome.set(syncId, created.id);
          } catch (e2) {
            console.error("Erreur re-création dossier:", folder.title, e2);
          }
        }
      } else {
        // Créer un nouveau dossier
        try {
          const created = await chrome.bookmarks.create({
            parentId: parentChromeId,
            title: folder.title
          });
          workspaceState.chromeToSync.set(created.id, syncId);
          workspaceState.syncToChrome.set(syncId, created.id);
        } catch (e) {
          console.error("Erreur création dossier:", folder.title, e);
        }
      }

      const lamport = Number(folder.updatedAtLamport || folder.updated_at_lamport || 0);
      workspaceState.lamportBySync.set(syncId, lamport);
    }

    // 3. Créer/mettre à jour les bookmarks
    for (const bookmark of (bookmarks || []).filter(b => !b.deleted)) {
      if (!bookmark.url) continue;

      const syncId = bookmark.syncId || bookmark.sync_id || bookmark.id;
      const existingChromeId = workspaceState.syncToChrome.get(syncId);
      const parentSyncId = bookmark.parentId || ROOT_BAR_SYNC_ID;
      const parentChromeId = getChromeIdForSyncId(workspaceId, parentSyncId) || "1";

      if (existingChromeId) {
        // Mettre à jour le bookmark existant
        try {
          const [existing] = await chrome.bookmarks.get(existingChromeId);
          if (existing.title !== bookmark.title || existing.url !== bookmark.url) {
            await chrome.bookmarks.update(existingChromeId, {
              title: bookmark.title || bookmark.url,
              url: bookmark.url
            });
          }
          if (existing.parentId !== parentChromeId) {
            await chrome.bookmarks.move(existingChromeId, { parentId: parentChromeId });
          }
        } catch (e) {
          // Le bookmark n'existe plus, le recréer
          try {
            const created = await chrome.bookmarks.create({
              parentId: parentChromeId,
              title: bookmark.title || bookmark.url,
              url: bookmark.url
            });
            workspaceState.chromeToSync.delete(existingChromeId);
            workspaceState.chromeToSync.set(created.id, syncId);
            workspaceState.syncToChrome.set(syncId, created.id);
          } catch (e2) {
            console.error("Erreur re-création favori:", bookmark.title, e2);
          }
        }
      } else {
        // Créer un nouveau bookmark
        try {
          const created = await chrome.bookmarks.create({
            parentId: parentChromeId,
            title: bookmark.title || bookmark.url,
            url: bookmark.url
          });
          workspaceState.chromeToSync.set(created.id, syncId);
          workspaceState.syncToChrome.set(syncId, created.id);
        } catch (e) {
          console.error("Erreur création favori:", bookmark.title, e);
        }
      }

      const lamport = Number(bookmark.updatedAtLamport || bookmark.updated_at_lamport || 0);
      workspaceState.lamportBySync.set(syncId, lamport);
    }

    await persistWorkspaceState(workspaceId);
    console.log(`Mise à jour incrémentale: ${bookmarks?.length || 0} favoris, ${folders?.length || 0} dossiers`);
  } finally {
    isUpdatingFromDesktop = false;
  }
}

async function updateBookmarksFromNative(bookmarksData) {
  console.log("Mise à jour des favoris du navigateur...", bookmarksData);
  isUpdatingFromDesktop = true; // Éviter les boucles

  try {
    // Vérifier si c'est un arbre Chrome (avec children) ou une liste plate
    const firstItem = bookmarksData[0];

    if (firstItem && firstItem.children) {
      // Format arbre Chrome : [{id: "0", children: [{id: "1", ...}, {id: "2", ...}]}]
      console.log("Format détecté: arbre Chrome");
      await clearAllBookmarks();
      const rootNode = firstItem;
      const bookmarksBar = rootNode.children.find(n => n.id === "1");
      const otherBookmarks = rootNode.children.find(n => n.id === "2");

      if (bookmarksBar && bookmarksBar.children) {
        await createBookmarksRecursive(bookmarksBar.children, "1");
      }
      if (otherBookmarks && otherBookmarks.children) {
        await createBookmarksRecursive(otherBookmarks.children, "2");
      }
    } else {
      // Format liste plate : [{id, title, url}, ...]
      // Faire une synchronisation intelligente au lieu de tout supprimer/recréer
      console.log("Format détecté: liste plate, " + bookmarksData.length + " favoris");
      await syncBookmarksIncrementally(bookmarksData);
    }
    console.log("Mise à jour des favoris terminée.");
  } finally {
    isUpdatingFromDesktop = false;
  }
}

// Synchronisation incrémentale : met à jour, ajoute ou supprime selon les différences
// Utilise l'ID comme clé principale pour permettre les doublons d'URL
async function syncBookmarksIncrementally(desktopBookmarks) {
  // Récupérer tous les favoris du navigateur (barre de favoris + autres favoris + mobile)
  const tree = await chrome.bookmarks.getTree();
  // tree[0] est la racine qui contient "Bookmarks Bar", "Other Bookmarks", etc.
  const currentBookmarks = flattenBookmarks(tree[0].children || []);

  // Normalisation d'URL pour éviter les doublons dus aux slashs finaux
  const normalizeUrl = (url) => {
    try {
      if (!url) return "";
      // Enlever le slash final sauf si c'est juste "http://domain.com/" (racine)
      return url.replace(/\/$/, "");
    } catch {
      return url;
    }
  };

  // Créer des maps par ID pour identification stable
  const currentById = new Map(currentBookmarks.map(b => [b.id, b]));
  
  // Pour les favoris desktop, on essaie d'abord l'ID, sinon l'URL
  const desktopBookmarksMap = new Map();
  for (const b of desktopBookmarks) {
    if (b.url) {
        desktopBookmarksMap.set(b.id, b);
    }
  }

  // 1. Mise à jour des existants (par ID)
  for (const [id, existing] of currentById) {
    if (desktopBookmarksMap.has(id)) {
      const desktopBookmark = desktopBookmarksMap.get(id);
      
      // Update title/url
      if (existing.title !== desktopBookmark.title || normalizeUrl(existing.url) !== normalizeUrl(desktopBookmark.url)) {
        console.log("Mise à jour:", desktopBookmark.title);
        await chrome.bookmarks.update(existing.id, {
          title: desktopBookmark.title,
          url: desktopBookmark.url
        });
      }

      // Move parent
      const desiredParentId = desktopBookmark.parentId || "1";
      if (existing.parentId !== desiredParentId) {
        let targetParentId = desiredParentId;
        try {
          await chrome.bookmarks.get(targetParentId);
        } catch {
          targetParentId = "1";
        }
        if (existing.parentId !== targetParentId) {
            console.log("Déplacement:", desktopBookmark.title, "->", targetParentId);
            await chrome.bookmarks.move(existing.id, { parentId: targetParentId });
        }
      }
      
      // Marquer comme traité
      desktopBookmarksMap.delete(id);
    } else {
        // L'élément existe dans le navigateur mais plus dans le desktop -> suppression ?
        // ATTENTION : Si on supprime par ID, on risque de supprimer des favoris créés localement
        // qui n'ont pas encore été sync.
        // Mais si on ne supprime pas, on perd la synchro de suppression.
        // On va vérifier si l'URL existe ailleurs dans le desktop (cas d'un changement d'ID)
        const urlExists = Array.from(desktopBookmarksMap.values()).some(b => normalizeUrl(b.url) === normalizeUrl(existing.url));
        if (!urlExists) {
             console.log("Suppression (non trouvé dans desktop):", existing.title);
             await chrome.bookmarks.remove(existing.id);
        }
    }
  }

  // 2. Création des nouveaux (restant dans la map)
  for (const desktopBookmark of desktopBookmarksMap.values()) {
      console.log("Création:", desktopBookmark.title);
      let targetParentId = desktopBookmark.parentId || "1";
      try {
        await chrome.bookmarks.get(targetParentId);
      } catch {
        targetParentId = "1";
      }
      
      // Si on a un ID temporaire ou nouveau du desktop, on crée
      // Le nouvel ID sera généré par Chrome.
      // Idéalement on devrait renvoyer le nouvel ID au desktop, mais
      // le desktop écoute "bookmark_created" donc ça devrait se faire via l'event listener.
      await chrome.bookmarks.create({
        parentId: targetParentId,
        title: desktopBookmark.title || desktopBookmark.url,
        url: desktopBookmark.url
      });
  }
}

// Aplatir l'arbre de favoris en liste
function flattenBookmarks(nodes) {
  const result = [];
  for (const node of nodes) {
    if (node.url) {
      result.push(node);
    }
    if (node.children) {
      result.push(...flattenBookmarks(node.children));
    }
  }
  return result;
}

async function updateFoldersFromNative(desktopFolders) {
  isUpdatingFromDesktop = true;
  try {
    const tree = await chrome.bookmarks.getTree();
    const rootNodes = flattenFolders(tree[0].children || []);
    const currentByTitleParent = new Map();

    // Map existing folders by parentId + title (heuristic)
    for (const folder of rootNodes) {
      const key = `${folder.parentId}:${folder.title}`;
      currentByTitleParent.set(key, folder);
    }

    const currentById = new Map(rootNodes.map(f => [f.id, f]));
    const desktopById = new Map(desktopFolders.map(f => [f.id, f]));

    // 1. Update or Create folders
    for (const folder of desktopFolders) {
      // Try to find by ID first (if synced previously)
      let existing = currentById.get(folder.id);
      
      // If not found by ID, try finding by Title+Parent (legacy/unmapped)
      if (!existing) {
        const key = `${folder.parentId || "1"}:${folder.title}`;
        existing = currentByTitleParent.get(key);
      }

      if (existing) {
        // Update if title changed
        if (existing.title !== folder.title) {
          console.log("Renaming folder:", existing.title, "->", folder.title);
          await chrome.bookmarks.update(existing.id, { title: folder.title });
        }
        // Move if parent changed
        const desiredParent = folder.parentId || "1";
        if (existing.parentId !== desiredParent && desiredParent !== "root") {
           // Verify parent exists
           try {
             await chrome.bookmarks.get(desiredParent);
             console.log("Moving folder:", existing.title, "->", desiredParent);
             await chrome.bookmarks.move(existing.id, { parentId: desiredParent });
           } catch {
             // Parent not found, fallback to root or ignore
           }
        }
      } else {
        // Create new folder
        // Note: For ID mapping to work, we rely on the `create_folder` flow for new folders.
        // But for initial sync or missed events, we might create duplicates if we don't match.
        // The desktop `create_folder` flow handles the creation-with-id-mapping.
        // This loop handles updates/renames primarily.
        // If we really need to create here, we can, but we won't get the ID back to desktop easily
        // without a full sync.
      }
    }
    
    // 2. Remove folders that are gone from desktop?
    // Dangerous if desktop state is partial. Better to rely on explicit `folder_removed`.
    // We skip removal in this incremental folder sync for safety.
    
  } finally {
    isUpdatingFromDesktop = false;
  }
}

function flattenFolders(nodes) {
  const result = [];
  for (const node of nodes) {
    if (!node.url && node.children) { // It's a folder
      if (node.id !== "0") { // Skip root
        result.push(node);
      }
      result.push(...flattenFolders(node.children));
    }
  }
  return result;
}

async function createBookmarksRecursive(nodes, parentId) {
  for (const node of nodes) {
    const newBookmark = { parentId, title: node.title };
    if (node.url) {
      newBookmark.url = node.url;
    }

    const createdNode = await chrome.bookmarks.create(newBookmark);

    if (node.children && node.children.length > 0) {
      await createBookmarksRecursive(node.children, createdNode.id);
    }
  }
}

// ==================== Real-time Bookmark Listeners ====================

// Debounce to avoid sending too many messages
let bookmarkChangeTimeout = null;
function debounceBookmarkChange(callback, delay = 1000) {
  if (bookmarkChangeTimeout) {
    clearTimeout(bookmarkChangeTimeout);
  }
  bookmarkChangeTimeout = setTimeout(callback, delay);
}

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  if (isUpdatingFromDesktop) return; // Ignorer si mise à jour depuis desktop
  if (!currentWorkspace || isWorkspaceSwitching) return;
  if (isReadOnlyMode) return; // Mode lecture seule

  // Distinguer dossier vs favori (un dossier n'a pas d'URL)
  const isFolder = !bookmark.url;
  console.log(isFolder ? "Dossier créé:" : "Favori créé:", bookmark.title);

  if (isWebSocketConnected) {
    const syncId = getOrCreateSyncIdForChromeId(currentWorkspace.id, bookmark.id);
    const parentSyncId = bookmark.parentId ? getOrCreateSyncIdForChromeId(currentWorkspace.id, bookmark.parentId) : ROOT_BAR_SYNC_ID;
    sendWebSocketMessage({
      type: isFolder ? "folder_created" : "bookmark_created",
      payload: {
        id: syncId,
        syncId,
        title: bookmark.title,
        url: bookmark.url,
        parentId: parentSyncId,
        dateAdded: bookmark.dateAdded,
        workspaceId: currentWorkspace.id,
        baseUpdatedAtLamport: workspaceState.lamportBySync.get(syncId) || 0
      }
    });
  }
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  if (isUpdatingFromDesktop) return; // Ignorer si mise à jour depuis desktop
  if (!currentWorkspace || isWorkspaceSwitching) return;
  if (isReadOnlyMode) return; // Mode lecture seule

  // removeInfo.node contient les infos du nœud supprimé
  const isFolder = removeInfo.node && !removeInfo.node.url;
  console.log(isFolder ? "Dossier supprimé:" : "Favori supprimé:", id);

  if (isWebSocketConnected) {
    const syncId = workspaceState.chromeToSync.get(id);
    if (!syncId) return;
    sendWebSocketMessage({
      type: isFolder ? "folder_removed" : "bookmark_removed",
      payload: { id: syncId, syncId, workspaceId: currentWorkspace.id, baseUpdatedAtLamport: workspaceState.lamportBySync.get(syncId) || 0 }
    });
  }
});

chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
  if (isUpdatingFromDesktop) return; // Ignorer si mise à jour depuis desktop
  if (!currentWorkspace || isWorkspaceSwitching) return;
  if (isReadOnlyMode) return; // Mode lecture seule

  if (isWebSocketConnected) {
    // Récupérer les données complètes du favori/dossier
    try {
      const [bookmark] = await chrome.bookmarks.get(id);
      const isFolder = !bookmark.url;
      console.log(isFolder ? "Dossier modifié:" : "Favori modifié:", id);

      const syncId = getOrCreateSyncIdForChromeId(currentWorkspace.id, id);
      const parentSyncId = bookmark.parentId ? getOrCreateSyncIdForChromeId(currentWorkspace.id, bookmark.parentId) : ROOT_BAR_SYNC_ID;

      sendWebSocketMessage({
        type: isFolder ? "folder_changed" : "bookmark_changed",
        payload: {
          id: syncId,
          syncId,
          title: bookmark.title,
          url: bookmark.url,
          parentId: parentSyncId,
          workspaceId: currentWorkspace.id,
          baseUpdatedAtLamport: workspaceState.lamportBySync.get(syncId) || 0
        }
      });
    } catch (e) {
      console.error("Erreur récupération favori/dossier:", e);
    }
  }
});

chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
  if (isUpdatingFromDesktop) return; // Ignorer si mise à jour depuis desktop
  if (!currentWorkspace || isWorkspaceSwitching) return;
  if (isReadOnlyMode) return; // Mode lecture seule
  console.log("Favori/Dossier déplacé:", id, moveInfo);

  // Envoyer uniquement les informations de déplacement (sync incrémentale)
  if (isWebSocketConnected) {
    try {
      const [bookmark] = await chrome.bookmarks.get(id);
      const isFolder = !bookmark.url;

      const syncId = getOrCreateSyncIdForChromeId(currentWorkspace.id, id);
      const parentSyncId = moveInfo.parentId ? getOrCreateSyncIdForChromeId(currentWorkspace.id, moveInfo.parentId) : ROOT_BAR_SYNC_ID;

      sendWebSocketMessage({
        type: isFolder ? "folder_changed" : "bookmark_changed",
        payload: {
          id: syncId,
          syncId,
          title: bookmark.title,
          url: bookmark.url,
          parentId: parentSyncId,
          oldParentId: moveInfo.oldParentId,
          index: moveInfo.index,
          oldIndex: moveInfo.oldIndex,
          workspaceId: currentWorkspace.id,
          baseUpdatedAtLamport: workspaceState.lamportBySync.get(syncId) || 0
        }
      });
    } catch (e) {
      console.error("Erreur récupération favori déplacé:", e);
      // Fallback: sync complète si erreur
      debounceBookmarkChange(() => {
        performSync().catch(err => console.error("Sync après déplacement échoué:", err));
      });
    }
  }
});

// ==================== Message Handlers ====================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sync") {
    performSync()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "get_status") {
    getBrowserName().then(browser => {
      sendResponse({
        connected: isWebSocketConnected,
        browser: browser,
        workspace: currentWorkspace
      });
    });
    return true; // Réponse asynchrone
  }

  if (request.action === "ping") {
    if (isWebSocketConnected) {
      sendWebSocketMessage({ type: "ping" });
    }
    sendResponse({ connected: isWebSocketConnected });
    return false;
  }

  // ==================== Actions Workspaces ====================

  if (request.action === "get_workspaces") {
    // Demander la liste des workspaces au desktop
    if (isWebSocketConnected) {
      sendWebSocketMessage({ type: "get_workspaces" });
      // La réponse arrivera via workspaces_list
      sendResponse({
        success: true,
        workspaces: availableWorkspaces,
        current: currentWorkspace
      });
    } else {
      sendResponse({
        success: false,
        error: "Non connecté au desktop"
      });
    }
    return false;
  }

  if (request.action === "get_current_workspace") {
    sendResponse({
      workspace: currentWorkspace,
      workspaces: availableWorkspaces
    });
    return false;
  }

  if (request.action === "switch_workspace") {
    if (!isWebSocketConnected) {
      sendResponse({ success: false, error: "Non connecté au desktop" });
      return false;
    }

    if (isWorkspaceSwitching) {
      sendResponse({ success: false, error: "Switch en cours" });
      return false;
    }

    const workspaceId = request.workspaceId;
    if (!workspaceId) {
      sendResponse({ success: false, error: "ID workspace requis" });
      return false;
    }

    // Envoyer la demande de switch au desktop
    sendWebSocketMessage({
      type: "switch_workspace",
      payload: { workspaceId }
    });

    // Le switch sera confirmé par workspace_switched
    sendResponse({ success: true, message: "Switch en cours..." });
    return false;
  }
});

// ==================== Initialization ====================

// Start WebSocket connection when extension loads
;(async () => {
  browserInstanceId = await getOrCreateBrowserInstanceId();
  const saved = await storageGet([STORAGE_KEYS.currentWorkspace]);
  const cw = saved[STORAGE_KEYS.currentWorkspace];
  if (cw && cw.id) {
    currentWorkspace = cw;
    await loadWorkspaceState(currentWorkspace.id);
  }
  connectWebSocket();
})();

// Periodic heartbeat to keep connection alive
setInterval(() => {
  if (isWebSocketConnected) {
    sendWebSocketMessage({ type: "ping" });
  }
}, 30000);

console.log("SyncMark Extension chargée - WebSocket + Native Messaging");
