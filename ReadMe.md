# SyncMark - Extension Multi-Navigateurs (Rust Backend)

Synchronisez vos favoris entre tous vos navigateurs (Chrome, Edge, Firefox, Opera, Brave, Vivaldi) avec un backend performant en **Rust**.

## 🚀 Installation Rapide

### macOS / Linux
```bash
./scripts/install.sh
```

### Windows
```cmd
cd scripts/
install.bat
```

> **Note :** Le backend a été migré de Python vers Rust pour de meilleures performances et une consommation mémoire réduite.

## 📁 Structure du Projet

- **`backend_rust/`** - Nouveau backend haute performance en Rust
- **`extension/`** - Code source de l'extension Web (Manifest V3)
- **`scripts/`** - Scripts d'installation et de maintenance
- **`docs/`** - Documentation complète

## 🌐 Navigateurs Supportés

- ✅ Google Chrome
- ✅ Microsoft Edge
- ✅ Mozilla Firefox
- ✅ Opera
- ✅ Brave Browser  
- ✅ Vivaldi
- ✅ Autres navigateurs Chromium

## � Développement

### Prérequis
- **Rust** (installé via [rustup](https://rustup.rs/))
- **Python 3** (uniquement pour les scripts d'installation)

### Compiler le Backend (Rust)
```bash
cd backend_rust/
cargo build --release
```

### Installer l'extension
1. Ouvrez `chrome://extensions` (ou équivalent)
2. Activez le "Mode développeur"
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier `extension/src`

---

**Version :** 3.0 (Rust Edition)
**Licence :** MIT  
**Auteur :** Équipe SyncMark
