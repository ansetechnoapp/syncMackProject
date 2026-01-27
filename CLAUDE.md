# SyncMark - Instructions pour Claude

## Vue d'ensemble du projet

SyncMark est une application de synchronisation de favoris entre navigateurs via une application desktop locale. Le projet comprend deux produits finaux :

1. **Application Desktop** (`desktop/`) - Tauri + React
2. **Extension Chrome** (`extension/src/`) - Manifest V3

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 APPLICATION DESKTOP (Tauri)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Backend Rust                                          │ │
│  │  - WebSocket Server (port 9876)                        │ │
│  │  - Gestion des favoris (bookmarks.rs)                  │ │
│  │  - Gestion des Workspaces (workspace.rs)               │ │
│  │  - Configuration (config.rs)                           │ │
│  │  - Surveillance fichiers (file_watcher.rs)             │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  Frontend React                                        │ │
│  │  - Dashboard, Settings, BookmarksList                  │ │
│  │  - WorkspacesPanel (Gestion des environnements)        │ │
│  │  - Communication via Tauri Commands                    │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────────┘
                        │ WebSocket ws://localhost:9876
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTENSION CHROME                          │
│  - Client WebSocket (temps réel)                            │
│  - Fallback Native Messaging (si desktop fermé)             │
│  - Listeners: onCreated, onRemoved, onChanged, onMoved      │
│  - Gestionnaire de changement de workspace                  │
└─────────────────────────────────────────────────────────────┘
```

## Structure des fichiers

```
syncMackProject/
├── desktop/                    # Application Tauri
│   ├── src/                    # Frontend React
│   │   ├── components/         # Composants UI
│   │   │   ├── WorkspacesPanel.tsx # Gestion des workspaces
│   │   │   └── ...
│   │   ├── hooks/              # useTauriCommands.ts
│   │   └── styles/             # CSS
│   └── src-tauri/              # Backend Rust
│       └── src/
│           ├── main.rs         # Point d'entrée
│           ├── lib.rs          # Configuration Tauri
│           ├── commands.rs     # Commandes IPC
│           ├── websocket.rs    # Serveur WebSocket
│           ├── bookmarks.rs    # Gestion favoris (legacy/shared)
│           ├── workspace.rs    # Gestion des Workspaces (NOUVEAU)
│           ├── config.rs       # Configuration
│           ├── state.rs        # État partagé
│           └── file_watcher.rs # Surveillance fichiers
├── extension/src/              # Extension Chrome
│   ├── manifest.json           # Manifest V3
│   ├── background.js           # Service Worker
│   ├── popup.html/js/css       # Interface popup
│   └── icons/                  # Icônes SVG
├── backend_rust/               # Backend Native Messaging (fallback)
└── com.syncmark.host.json      # Manifest Native Host
```

## Règles de développement

### Général

- **Langue** : Interface et commentaires en français
- **Pas de scripts** : Éviter les scripts d'automatisation, préférer les commandes directes
- **Minimalisme** : Ne pas créer de fichiers inutiles (docs séparées, configs multiples)

### Application Desktop (Tauri)

- **Framework** : Tauri 2.x + React 18 + TypeScript
- **Gestionnaire de paquets** : `bun` (pas npm/yarn/pnpm)
- **État** : `parking_lot::RwLock` pour le state partagé (thread-safe)
- **Async** : Ne jamais tenir un lock `parking_lot` à travers un `.await`
- **WebSocket** : Port 9876 par défaut (configurable)
- **Stockage** : `~/Documents/SyncMark/` (config.json, syncmark_bookmarks.json)

### Extension Chrome

- **Manifest** : Version 3 obligatoire
- **Service Worker** : Pas de DOM, pas de `window`
- **WebSocket** : Connexion automatique avec reconnexion (5s)
- **Fallback** : Native Messaging si WebSocket indisponible
- **ID Extension** : `ibjigboohcdglhcjncjpeoiojebkkbce` (fixé par la clé dans manifest.json)

### Protocole WebSocket

**Extension → Desktop :**
```json
{ "type": "sync_bookmarks", "payload": { "bookmarks": [...] } }
{ "type": "bookmark_created", "payload": { "id": "...", "title": "...", "url": "..." } }
{ "type": "bookmark_removed", "payload": { "id": "..." } }
{ "type": "bookmark_changed", "payload": { "id": "...", "title": "...", "url": "..." } }
{ "type": "ping" }
{ "type": "identify", "payload": { "browser": "Chrome" } }
```

**Desktop → Extension :**
```json
{ "type": "connected", "payload": { "client_id": "...", "server_version": "1.0.0" } }
{ "type": "bookmarks_updated", "payload": { "bookmarks": [...] } }
{ "type": "sync_complete", "payload": { "success": true, "bookmarks": [...] } }
{ "type": "sync_request" }
{ "type": "pong" }
```

## Commandes de développement

```bash
# Desktop - Développement
cd desktop
bun install
bun run tauri dev

# Desktop - Build production
bun run tauri build

# Extension - Chargement
# 1. Ouvrir chrome://extensions/
# 2. Activer "Mode développeur"
# 3. "Charger l'extension non empaquetée" → extension/src/
```

## Dépendances clés

### Desktop (Cargo.toml)
- `tauri` 2.x - Framework desktop
- `tokio` - Runtime async
- `tokio-tungstenite` - WebSocket
- `serde` / `serde_json` - Sérialisation
- `parking_lot` - Locks thread-safe
- `notify` - File watcher
- `chrono` - Timestamps

### Frontend (package.json)
- `react` 18.x
- `@tauri-apps/api` 2.x
- `vite` - Bundler
- `typescript`

## Points d'attention

1. **Locks et Async** : Toujours libérer les locks `parking_lot` avant tout `.await`
2. **Icons Tauri** : Format PNG RGBA obligatoire
3. **WebSocket reconnexion** : L'extension tente de se reconnecter toutes les 5 secondes
4. **Native Messaging** : Nécessite l'installation du manifest dans `~/.config/google-chrome/NativeMessagingHosts/`
5. **CSP Extension** : Pas de `eval()`, pas de scripts inline

## Builds produits

| Produit | Emplacement |
|---------|-------------|
| Binary Desktop | `desktop/src-tauri/target/release/syncmark-desktop` |
| Package DEB | `desktop/src-tauri/target/release/bundle/deb/*.deb` |
| Extension | `extension/src/` (à charger directement dans Chrome) |
