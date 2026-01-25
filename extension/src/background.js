const NATIVE_HOST_NAME = "com.syncmark.host";
const WEBSOCKET_URL = "ws://localhost:9876";
const RECONNECT_INTERVAL = 5000;

let websocket = null;
let isWebSocketConnected = false;
let reconnectTimeout = null;
let pendingResponses = new Map();
let messageId = 0;

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
    websocket.send(JSON.stringify(message));
    return true;
  }
  return false;
}

function handleWebSocketMessage(message) {
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
      // Bookmarks were updated from another source
      console.log("Favoris mis à jour depuis le desktop");
      // Optionally trigger a refresh in the browser
      break;

    case "config_updated":
      console.log("Configuration mise à jour:", message.payload);
      break;

    case "status":
      // Status response
      break;

    default:
      console.log("Message inconnu:", message.type);
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

async function updateBookmarksFromNative(bookmarksTree) {
  console.log("Mise à jour des favoris du navigateur...");
  await clearAllBookmarks();

  const rootNode = bookmarksTree[0];
  if (rootNode && rootNode.children) {
    const bookmarksBar = rootNode.children.find(n => n.id === "1");
    const otherBookmarks = rootNode.children.find(n => n.id === "2");

    if (bookmarksBar && bookmarksBar.children) {
      await createBookmarksRecursive(bookmarksBar.children, "1");
    }
    if (otherBookmarks && otherBookmarks.children) {
      await createBookmarksRecursive(otherBookmarks.children, "2");
    }
  }
  console.log("Mise à jour des favoris terminée.");
}

async function clearAllBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const promises = [];
  const rootChildren = tree[0].children;
  if (rootChildren) {
    const bar = rootChildren.find(c => c.id === "1");
    if (bar && bar.children) {
      bar.children.forEach(node => promises.push(chrome.bookmarks.removeTree(node.id)));
    }
    const other = rootChildren.find(c => c.id === "2");
    if (other && other.children) {
      other.children.forEach(node => promises.push(chrome.bookmarks.removeTree(node.id)));
    }
  }
  await Promise.all(promises);
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
  console.log("Favori créé:", bookmark.title);

  if (isWebSocketConnected) {
    sendWebSocketMessage({
      type: "bookmark_created",
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
  console.log("Favori supprimé:", id);

  if (isWebSocketConnected) {
    sendWebSocketMessage({
      type: "bookmark_removed",
      payload: { id }
    });
  }
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log("Favori modifié:", id, changeInfo);

  if (isWebSocketConnected) {
    sendWebSocketMessage({
      type: "bookmark_changed",
      payload: {
        id,
        title: changeInfo.title,
        url: changeInfo.url
      }
    });
  }
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log("Favori déplacé:", id);

  // For moves, we do a full sync after debounce
  debounceBookmarkChange(() => {
    if (isWebSocketConnected) {
      performSync().catch(e => console.error("Sync après déplacement échoué:", e));
    }
  });
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
