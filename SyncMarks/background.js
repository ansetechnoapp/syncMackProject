const NATIVE_HOST_NAME = "com.syncmark.host";

/**
 * Gère une session de communication complète avec le programme compagnon.
 * @param {object} message - L'objet à envoyer au programme compagnon.
 * @returns {Promise<object>} Une promesse qui se résout avec la réponse du programme compagnon.
 */
function sendMessageToNativeHost(message) {
  return new Promise((resolve, reject) => {
    console.log("Connexion au programme compagnon...");
    const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    let responseReceived = false;

    port.onMessage.addListener((response) => {
      responseReceived = true;
      console.log("Message reçu du programme compagnon :", response);
      if (response.status === "success") {
        resolve(response);
      } else {
        reject(new Error(response.error || "Une erreur inconnue est survenue dans le programme compagnon."));
      }
      port.disconnect();
    });

    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) {
        const errorMessage = `Déconnecté avec une erreur: ${chrome.runtime.lastError.message}. Assurez-vous que le programme compagnon est correctement installé.`;
        console.error(errorMessage);
        reject(new Error(errorMessage));
      } else if (!responseReceived) {
        const errorMessage = "Déconnecté du programme compagnon sans recevoir de réponse.";
        console.log(errorMessage);
        reject(new Error(errorMessage));
      }
    });

    console.log("Envoi du message au programme compagnon...");
    port.postMessage(message);
  });
}

// Gère les messages reçus de popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sync") {
    // Le 'return true' est crucial pour indiquer que la réponse sera envoyée de manière asynchrone
    (async () => {
      try {
        // 1. Récupérer les favoris actuels du navigateur
        const bookmarkTree = await chrome.bookmarks.getTree();
        
        // 2. Envoyer les favoris au programme compagnon et attendre sa réponse
        const response = await sendMessageToNativeHost({ bookmarks: bookmarkTree });

        // 3. Mettre à jour les favoris du navigateur avec la version synchronisée
        // AVERTISSEMENT : Cette méthode est destructive. Une amélioration future
        // serait de faire une synchronisation différentielle.
        await updateBookmarksFromNative(response.bookmarks);
        
        sendResponse({ success: true });

      } catch (error) {
        console.error("Erreur durant la synchronisation:", error.message);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Indique que la réponse sera asynchrone
  }
});

/**
 * Efface tous les favoris et les recrée à partir de l'arbre fourni.
 * @param {object[]} bookmarksTree - L'arbre de favoris reçu du programme compagnon.
 */
async function updateBookmarksFromNative(bookmarksTree) {
  console.log("Mise à jour des favoris du navigateur...");
  await clearAllBookmarks();
  
  // L'arbre de chrome est dans un tableau, on prend le premier élément
  const rootNode = bookmarksTree[0]; 
  if (rootNode && rootNode.children) {
      const bookmarksBar = rootNode.children.find(n => n.id === '1');
      const otherBookmarks = rootNode.children.find(n => n.id === '2');

      if (bookmarksBar && bookmarksBar.children) {
        await createBookmarksRecursive(bookmarksBar.children, '1');
      }
      if (otherBookmarks && otherBookmarks.children) {
        await createBookmarksRecursive(otherBookmarks.children, '2');
      }
  }
  console.log("Mise à jour des favoris terminée.");
}

/**
 * Supprime tous les favoris de la barre de favoris et des "Autres favoris".
 */
async function clearAllBookmarks() {
    const tree = await chrome.bookmarks.getTree();
    const promises = [];
    const rootChildren = tree[0].children;
    if (rootChildren) {
      const bar = rootChildren.find(c => c.id === '1');
      if (bar && bar.children) bar.children.forEach(node => promises.push(chrome.bookmarks.removeTree(node.id)));
      
      const other = rootChildren.find(c => c.id === '2');
      if (other && other.children) other.children.forEach(node => promises.push(chrome.bookmarks.removeTree(node.id)));
    }
    await Promise.all(promises);
}

/**
 * Crée récursivement les favoris dans le navigateur.
 * @param {object[]} nodes - Le tableau de noeuds de favoris à créer.
 * @param {string} parentId - L'ID du dossier parent.
 */
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
