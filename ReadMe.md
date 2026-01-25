# SyncMark

Application de synchronisation de favoris entre navigateurs via une application desktop locale.

## Produits

### 1. Application Desktop

Application Tauri + React pour gérer et synchroniser les favoris.

**Fonctionnalités :**
- Dashboard avec statistiques
- Liste des favoris synchronisés
- Configuration (intervalle, backup, etc.)
- Serveur WebSocket pour communication temps réel
- Surveillance des fichiers pour changements externes

**Lancer en développement :**
```bash
cd desktop
bun install
bun run tauri dev
```

**Build production :**
```bash
cd desktop
bun run tauri build
```

### 2. Extension Chrome

Extension Manifest V3 pour synchroniser les favoris du navigateur.

**Fonctionnalités :**
- Synchronisation manuelle via bouton
- Synchronisation automatique en temps réel
- Indicateur de connexion au desktop
- Fallback Native Messaging si desktop fermé

**Installation :**
1. Ouvrir `chrome://extensions/`
2. Activer "Mode développeur"
3. "Charger l'extension non empaquetée"
4. Sélectionner le dossier `extension/src/`

## Architecture

```
Desktop App (Tauri)          Extension Chrome
      │                            │
      │◄──── WebSocket ────────────┤
      │      (port 9876)           │
      │                            │
      ▼                            │
~/Documents/SyncMark/              │
├── config.json                    │
└── syncmark_bookmarks.json        │
```

## Structure

```
syncMackProject/
├── desktop/           # Application Tauri + React
│   ├── src/           # Frontend React
│   └── src-tauri/     # Backend Rust
├── extension/src/     # Extension Chrome
├── backend_rust/      # Native Messaging (fallback)
├── CLAUDE.md          # Instructions développement
└── ReadMe.md
```

## Configuration Native Messaging (optionnel)

Pour utiliser le fallback Native Messaging quand l'application desktop est fermée :

```bash
# Compiler le backend
cd backend_rust
cargo build --release

# Copier le manifest (Linux/Chrome)
mkdir -p ~/.config/google-chrome/NativeMessagingHosts
cp com.syncmark.host.json ~/.config/google-chrome/NativeMessagingHosts/
```

---

**Version :** 4.0 (Tauri Edition)
**Licence :** MIT
