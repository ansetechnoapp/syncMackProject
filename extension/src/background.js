const NATIVE_HOST_NAME = "com.syncmark.host";
const WEBSOCKET_URL = "ws://localhost:9876";
const RECONNECT_INTERVAL = 5000;

let websocket = null;
let isWebSocketConnected = false;
let reconnectTimeout = null;
let pendingResponses = new Map();
let messageId = 0;
let isUpdatingFromDesktop = false; // Flag pour éviter les boucles infinies

// ==================== WebSocket Communication ====================

function connectWebSocket() {
  if (websocket && (websocket.readyState === WebSocket.CONNECTING || websocket.readyState === WebSocket.OPEN)) {
    return;
  }

  console.log("Tentative de connexion WebSocket...");

  try {
    websocket = new WebSocket(WEBSOCKET_URL);

    websocket.onopen = () => {
      console.log("WebSocket connecté");
      isWebSocketConnected = true;
      clearTimeout(reconnectTimeout);

      // Identify ourselves to the desktop app
      sendWebSocketMessage({
        type: "identify",
        payload: {
          browser: getBrowserName(),
          extensionId: chrome.runtime.id
        }
      });

      // Broadcast connection status to popup
      chrome.runtime.sendMessage({ type: "connection_status", connected: true }).catch(() => {});
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
      performSync().then(result => {
        console.log("Sync demandé par desktop:", result ? "succès" : "échec");
      });
      break;

    case "sync_complete":
      // Sync operation completed
      if (message.payload && message.payload.bookmarks) {
        updateBookmarksFromNative(message.payload.bookmarks).catch(e => {
          console.error("Erreur mise à jour favoris:", e);
        });
      }
      break;

    case "bookmarks_updated":
      // Bookmarks were updated from desktop app
      console.log("Favoris mis à jour depuis le desktop");
      if (message.payload && message.payload.bookmarks) {
        updateBookmarksFromNative(message.payload.bookmarks).catch(e => {
          console.error("Erreur mise à jour favoris depuis desktop:", e);
        });
      }
      break;

    case "config_updated":
      console.log("Configuration mise à jour:", message.payload);
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

function getBrowserName() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("OPR/") || userAgent.includes("Opera")) return "Opera";
  if (userAgent.includes("Brave")) return "Brave";
  if (userAgent.includes("Vivaldi")) return "Vivaldi";
  if (userAgent.includes("Chrome")) return "Google Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  return "Unknown Browser";
}

// ==================== Native Messaging (Fallback) ====================

function sendMessageToNativeHost(message) {
  return new Promise((resolve, reject) => {
    console.log("Connexion au programme compagnon (Native Messaging)...");
    const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    let responseReceived = false;

    port.onMessage.addListener((response) => {
      responseReceived = true;
      console.log("Message reçu du programme compagnon:", response);
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
  "status"
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
  const roots = await chrome.bookmarks.getTree();
  const root = roots[0];
  const topFolders = root.children || [];

  // Parcourir les dossiers racines (Bookmarks Bar, Other Bookmarks, Mobile Bookmarks)
  for (const folder of topFolders) {
    if (!folder.id || !folder.children) continue;

    // Supprimer tous les enfants de chaque dossier racine
    for (const child of folder.children) {
      try {
        await chrome.bookmarks.removeTree(child.id);
      } catch (e) {
        console.error("Erreur suppression favori:", child.id, e);
      }
    }
  }
}

async function performSync() {
  try {
    const bookmarkTree = await chrome.bookmarks.getTree();

    // Try WebSocket first
    if (isWebSocketConnected) {
      sendWebSocketMessage({
        type: "sync_bookmarks",
        payload: { bookmarks: bookmarkTree }
      });
      return true;
    }

    // Fallback to Native Messaging
    console.log("WebSocket non disponible, utilisation de Native Messaging...");
    const response = await sendMessageToNativeHost({
      type: "sync_bookmarks",
      bookmarks: bookmarkTree
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

  // Distinguer dossier vs favori (un dossier n'a pas d'URL)
  const isFolder = !bookmark.url;
  console.log(isFolder ? "Dossier créé:" : "Favori créé:", bookmark.title);

  if (isWebSocketConnected) {
    sendWebSocketMessage({
      type: isFolder ? "folder_created" : "bookmark_created",
      payload: {
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        parentId: bookmark.parentId,
        dateAdded: bookmark.dateAdded
      }
    });
  }
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  if (isUpdatingFromDesktop) return; // Ignorer si mise à jour depuis desktop

  // removeInfo.node contient les infos du nœud supprimé
  const isFolder = removeInfo.node && !removeInfo.node.url;
  console.log(isFolder ? "Dossier supprimé:" : "Favori supprimé:", id);

  if (isWebSocketConnected) {
    sendWebSocketMessage({
      type: isFolder ? "folder_removed" : "bookmark_removed",
      payload: { id }
    });
  }
});

chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
  if (isUpdatingFromDesktop) return; // Ignorer si mise à jour depuis desktop

  if (isWebSocketConnected) {
    // Récupérer les données complètes du favori/dossier
    try {
      const [bookmark] = await chrome.bookmarks.get(id);
      const isFolder = !bookmark.url;
      console.log(isFolder ? "Dossier modifié:" : "Favori modifié:", id, changeInfo);

      sendWebSocketMessage({
        type: isFolder ? "folder_changed" : "bookmark_changed",
        payload: {
          id,
          title: bookmark.title,
          url: bookmark.url,
          parentId: bookmark.parentId
        }
      });
    } catch (e) {
      console.error("Erreur récupération favori/dossier:", e);
    }
  }
});

chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
  if (isUpdatingFromDesktop) return; // Ignorer si mise à jour depuis desktop
  console.log("Favori/Dossier déplacé:", id, moveInfo);

  // Envoyer uniquement les informations de déplacement (sync incrémentale)
  if (isWebSocketConnected) {
    try {
      const [bookmark] = await chrome.bookmarks.get(id);
      const isFolder = !bookmark.url;

      sendWebSocketMessage({
        type: isFolder ? "folder_changed" : "bookmark_changed",
        payload: {
          id,
          title: bookmark.title,
          url: bookmark.url,
          parentId: moveInfo.parentId,
          oldParentId: moveInfo.oldParentId,
          index: moveInfo.index,
          oldIndex: moveInfo.oldIndex
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
    sendResponse({
      connected: isWebSocketConnected,
      browser: getBrowserName()
    });
    return false;
  }

  if (request.action === "ping") {
    if (isWebSocketConnected) {
      sendWebSocketMessage({ type: "ping" });
    }
    sendResponse({ connected: isWebSocketConnected });
    return false;
  }
});

// ==================== Initialization ====================

// Start WebSocket connection when extension loads
connectWebSocket();

// Periodic heartbeat to keep connection alive
setInterval(() => {
  if (isWebSocketConnected) {
    sendWebSocketMessage({ type: "ping" });
  }
}, 30000);

console.log("SyncMark Extension chargée - WebSocket + Native Messaging");
