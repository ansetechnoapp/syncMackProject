# SyncMarks - Extension Chrome

## Description

SyncMarks est une extension Chrome qui permet la synchronisation avancée des signets avec un programme compagnon Windows via Native Messaging.

## Fonctionnalités

- 🔖 Synchronisation bidirectionnelle des signets
- 🔄 Mise à jour en temps réel
- 🎨 Interface utilisateur moderne
- 🔒 Communication sécurisée avec le programme compagnon
- ⚙️ Configuration flexible

## Structure des Fichiers

```
SyncMarks/
├── manifest.json          # Configuration de l'extension
├── popup.html            # Interface utilisateur principale
├── popup.css             # Styles de l'interface
├── popup.js              # Logique de l'interface
├── background.js         # Service worker (arrière-plan)
├── icons/               # Icônes de l'extension
│   ├── icon16.svg       # Icône 16x16 (barre d'outils)
│   ├── icon48.svg       # Icône 48x48 (gestion des extensions)
│   └── icon128.svg      # Icône 128x128 (Chrome Web Store)
└── README.md           # Cette documentation
```

## Installation

### Méthode 1 : Mode Développeur (Recommandée pour les tests)

1. Ouvrir Chrome et naviguer vers `chrome://extensions/`
2. Activer le "Mode développeur" (coin supérieur droit)
3. Cliquer sur "Charger l'extension non empaquetée"
4. Sélectionner le dossier `SyncMarks/`
5. L'extension apparaît dans la liste avec un ID unique

### Méthode 2 : Package CRX (Production)

```bash
# Créer un package CRX (nécessite une clé privée)
chrome --pack-extension=./SyncMarks --pack-extension-key=./syncmarks.pem
```

## Configuration

### 1. Récupérer l'ID de l'Extension

Après installation, noter l'ID affiché dans `chrome://extensions/`
Format : `abcdefghijklmnopqrstuvwxyzabcdef`

### 2. Configurer le Native Messaging

L'ID doit être configuré dans le programme compagnon :

```bash
# Dans le dossier SyncMark_Helpers
python install_native_host.py install VOTRE_EXTENSION_ID
```

### 3. Vérifier la Communication

1. Cliquer sur l'icône de l'extension
2. L'interface doit s'ouvrir sans erreur
3. Tester les fonctionnalités de synchronisation

## Développement

### Permissions Requises

L'extension utilise les permissions suivantes (définies dans `manifest.json`) :

- `bookmarks` : Accès aux signets Chrome
- `storage` : Stockage local des paramètres
- `nativeMessaging` : Communication avec le programme compagnon
- `activeTab` : Accès à l'onglet actif

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   popup.js      │    │   background.js  │    │ SyncMarkHost.exe│
│   (Interface)   │◄──►│ (Service Worker) │◄──►│ (Programme      │
│                 │    │                  │    │  Compagnon)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Messages Native Messaging

Format des messages échangés :

```javascript
// Vers le programme compagnon
{
  "action": "sync_bookmarks",
  "data": {
    "bookmarks": [...],
    "timestamp": 1234567890
  }
}

// Depuis le programme compagnon
{
  "status": "success",
  "data": {
    "bookmarks": [...],
    "changes": [...]
  }
}
```

### Debugging

1. **Console de l'Extension**
   - Clic droit sur l'icône → "Inspecter la popup"
   - Onglet Console pour les logs

2. **Service Worker**
   - `chrome://extensions/` → Détails → "Inspecter les vues"
   - Sélectionner "service worker"

3. **Native Messaging**
   - Vérifier les logs dans les outils développeur
   - Tester la communication manuellement

## Tests

### Tests Automatiques

```javascript
// Dans la console de l'extension
chrome.runtime.sendNativeMessage('com.syncmark.host', 
  {action: 'test'}, 
  response => console.log(response)
);
```

### Tests Manuels

1. **Interface Utilisateur**
   - Ouvrir la popup
   - Vérifier l'affichage des éléments
   - Tester les interactions

2. **Synchronisation**
   - Ajouter/modifier des signets
   - Vérifier la synchronisation
   - Contrôler les conflits

3. **Gestion d'Erreurs**
   - Tester sans programme compagnon
   - Vérifier les messages d'erreur
   - Contrôler la récupération

## Déploiement

### Chrome Web Store

1. Créer un compte développeur Chrome
2. Préparer les assets (icônes, captures d'écran)
3. Créer un package ZIP de l'extension
4. Soumettre pour révision

### Distribution Interne

1. Créer un fichier CRX signé
2. Distribuer via politique d'entreprise
3. Ou installation manuelle en mode développeur

## Dépannage

### Problèmes Courants

**Extension ne se charge pas**
- Vérifier la syntaxe du `manifest.json`
- Contrôler les permissions
- Vérifier les chemins des fichiers

**Pas de communication avec le programme compagnon**
- Vérifier l'installation du Native Host
- Contrôler l'ID de l'extension dans le manifest
- Tester le programme compagnon indépendamment

**Interface ne s'affiche pas correctement**
- Vérifier les fichiers CSS/JS
- Contrôler la console pour les erreurs
- Tester dans différentes versions de Chrome

### Logs et Diagnostic

```javascript
// Activer les logs détaillés
localStorage.setItem('syncmarks_debug', 'true');

// Vérifier l'état de l'extension
chrome.management.getSelf(info => console.log(info));

// Tester Native Messaging
chrome.runtime.connectNative('com.syncmark.host');
```

## Mise à Jour

### Version de l'Extension

1. Modifier le numéro de version dans `manifest.json`
2. Tester les nouvelles fonctionnalités
3. Mettre à jour la documentation
4. Republier sur le Chrome Web Store

### Compatibilité

- **Chrome** : Version 88+ (Manifest V3)
- **Edge** : Version 88+ (Chromium)
- **Opera** : Version 74+

## Support

Pour obtenir de l'aide :
1. Consulter cette documentation
2. Vérifier les logs de la console
3. Tester la communication Native Messaging
4. Contacter l'équipe de développement

---

**Version** : 2.0  
**Manifest Version** : 3  
**Dernière mise à jour** : Décembre 2024