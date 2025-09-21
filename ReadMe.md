# SyncMark - Extension Multi-Navigateurs

Synchronisez vos favoris entre tous vos navigateurs (Chrome, Edge, Firefox, Opera, Brave, Vivaldi).

## 🚀 Installation Rapide

```bash
cd scripts/
install.bat
```

## 📁 Structure du Projet

- **`extension/`** - Code source et versions compilées de l'extension
- **`scripts/`** - Scripts d'installation et de maintenance
- **`tests/`** - Tests et diagnostics
- **`docs/`** - Documentation complète

## 🌐 Navigateurs Supportés

- ✅ Google Chrome
- ✅ Microsoft Edge
- ✅ Mozilla Firefox
- ✅ Opera
- ✅ Brave Browser  
- ✅ Vivaldi
- ✅ Autres navigateurs Chromium

## 📖 Documentation

Voir le dossier `docs/` pour la documentation complète.

## 🔧 Développement

1. **Backend :**  
   a. Créez un environnement virtuel Python :  
      ```bash
      cd backend/
      python -m venv .venv
      ```
   b. Activez l'environnement virtuel :  
      - **Windows :**  
        ```bash
        .venv\Scripts\activate
        ```
      - **Linux/macOS :**  
        ```bash
        source .venv/bin/activate
        ```
   c. Installez les dépendances :  
      ```bash
      python -m pip install -r requirements.txt
      ```
2. **Extension :** Charger `extension/source/` en mode développeur
3. **Tests :** `cd tests/ && test_all.bat`

---

**Version :** 2.1 Multi-Browser  
**Licence :** MIT  
**Auteur :** Équipe SyncMark
