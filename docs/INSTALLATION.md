# SyncMark - Guide d'Installation Complet

## Vue d'ensemble du Projet

SyncMark est un système complet de synchronisation de signets composé de :

1. **Extension Chrome** (`SyncMarks_chrome/`) - Interface utilisateur dans le navigateur
1. **Extension edge** (`SyncMarks_edge/`) - Interface utilisateur dans le navigateur
1. **Extension firefox** (`SyncMarks_firefox/`) - Interface utilisateur dans le navigateur
2. **Programme Compagnon** (`SyncMark_Helpers/`) - Service Windows pour la synchronisation
3. **Installateur Automatique** - Package d'installation tout-en-un

## 🚀 Installation Rapide (Recommandée)

### Étape 1 : Créer l'Installateur

```bash
# Naviguer vers le dossier du programme compagnon
cd SyncMark_Helpers

# Compiler l'installateur avec Inno Setup
iscc setup_script.iss
```

L'installateur sera créé dans `SyncMark_Helpers/installer/SyncMark_Setup_v2.0.exe`

### Étape 2 : Exécuter l'Installation

1. **Lancer l'installateur** : Double-cliquer sur `SyncMark_Setup_v2.0.exe`
2. **Suivre l'assistant** d'installation
3. **Privilèges administrateur** : Accepter si demandé
4. L'installateur va automatiquement :
   - Installer les exécutables dans `Program Files\SyncMark`
   - Configurer le démarrage automatique
   - Installer le Native Host pour Chrome
   - Créer les raccourcis

### Étape 3 : Installer l'Extension Chrome

1. Ouvrir Chrome et aller à `chrome://extensions/`
2. Activer le **"Mode développeur"** (coin supérieur droit)
3. Cliquer **"Charger l'extension non empaquetée"**
4. Sélectionner le dossier `SyncMarks_chrome/` ou `SyncMarks_edge/` ou `SyncMarks_firefox/`,etc.
5. **Noter l'ID de l'extension** affiché (format : `abcdef...`)

### Étape 4 : Finaliser la Configuration

```bash
# Configurer l'ID de l'extension dans le Native Host
cd "C:\Program Files\SyncMark"
python install_native_host.py install VOTRE_EXTENSION_ID
```

**Remplacer `VOTRE_EXTENSION_ID`** par l'ID copié à l'étape 3.

### Étape 5 : Vérification

1. **Redémarrer Chrome** complètement
2. **Cliquer sur l'icône** de l'extension SyncMarks
3. **Tester la synchronisation** - l'interface doit s'ouvrir sans erreur

---

## 🔧 Installation Manuelle (Développeurs)

### Prérequis

- **Windows 10/11**
- **Python 3.8+** avec pip
- **Chrome/Edge** (version récente)
- **Inno Setup** (pour créer l'installateur)

### Étape 1 : Préparer l'Environnement

```bash
# Cloner ou télécharger le projet
cd syncMackProject

# Installer les dépendances Python
cd SyncMark_Helpers
pip install -r requirements.txt
pip install pyinstaller
```

### Étape 2 : Compiler les Exécutables

```bash
# Compiler le service principal
pyinstaller SyncMarkHost.spec

# Compiler l'interface de configuration
pyinstaller SyncMarkSettings.spec

# Vérifier la création des exécutables
dir dist
# Doit contenir : SyncMarkHost.exe, SyncMarkSettings.exe
```

### Étape 3 : Configurer le Native Host

```bash
# Installer le Native Host (sans ID d'extension pour l'instant)
python install_native_host.py install

# Ou désinstaller si nécessaire
python install_native_host.py uninstall
```

### Étape 4 : Installer l'Extension

1. Aller à `chrome://extensions/`
2. Mode développeur → ON
3. "Charger l'extension non empaquetée" → Sélectionner `SyncMarks/`
4. Copier l'ID de l'extension

### Étape 5 : Lier Extension et Programme

```bash
# Configurer l'ID de l'extension
python install_native_host.py install EXTENSION_ID_ICI
```

### Étape 6 : Tests et Validation

```bash
# Exécuter les tests automatiques
python test_syncmark.py

# Doit afficher : "4/4 réussis - Le projet est prêt"
```

---

## 🛠️ Configuration Avancée

### Démarrage Automatique

Le service SyncMarkHost démarre automatiquement avec Windows. Pour modifier :

```bash
# Vérifier l'entrée de registre
reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "SyncMark"

# Supprimer le démarrage automatique
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "SyncMark" /f
```

### Configuration du Native Host

Le fichier de configuration se trouve dans :
- **Installation automatique** : `C:\Program Files\SyncMark\temp_manifest.json`
- **Installation manuelle** : `SyncMark_Helpers\native_host_manifest.json`

Format du fichier :
```json
{
  "name": "com.syncmark.host",
  "description": "SyncMark Native Host",
  "path": "C:\\Program Files\\SyncMark\\SyncMarkHost.exe",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://VOTRE_EXTENSION_ID/"
  ]
}
```

### Logs et Diagnostic

```bash
# Vérifier les clés de registre Native Messaging
reg query "HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.syncmark.host"

# Tester la communication manuellement
echo '{"action": "test"}' | "C:\Program Files\SyncMark\SyncMarkHost.exe"

# Logs de l'extension Chrome
# Ouvrir les outils développeur sur l'extension
```

---

## 🔍 Dépannage

### Problèmes Courants

#### Extension ne communique pas avec le programme

**Symptômes :** L'extension s'ouvre mais ne répond pas, erreurs dans la console

**Solutions :**
1. Vérifier l'ID de l'extension dans le manifest
2. Redémarrer Chrome complètement
3. Réinstaller le Native Host avec le bon ID
4. Vérifier que SyncMarkHost.exe fonctionne

#### Programme compagnon ne démarre pas

**Symptômes :** Erreurs au lancement, service non disponible

**Solutions :**
1. Exécuter en tant qu'administrateur
2. Vérifier les dépendances Python
3. Recompiler les exécutables
4. Contrôler les permissions de fichiers

#### Erreurs de compilation PyInstaller

**Symptômes :** Échec de la création des .exe

**Solutions :**
```bash
# Nettoyer les dossiers de build
rmdir /s build dist

# Mettre à jour PyInstaller
pip install --upgrade pyinstaller

# Recompiler
pyinstaller --clean SyncMarkHost.spec
```

### Tests de Diagnostic

```bash
# Test complet du système
python test_syncmark.py

# Test individuel du Native Host
python install_native_host.py install TEST_ID

# Test de l'exécutable
SyncMarkHost.exe
# Doit démarrer sans erreur et attendre des entrées
```

---

## 📦 Distribution

### Créer un Package Complet

1. **Compiler l'installateur**
   ```bash
   cd SyncMark_Helpers
   iscc setup_script.iss
   ```

2. **Créer un package ZIP**
   ```
   SyncMark_Distribution/
   ├── SyncMark_Setup_v2.0.exe    # Installateur Windows
   ├── SyncMarks_chrome/                 # Extension Chrome (dossier)
   ├── SyncMarks_edge/                 # Extension Chrome (dossier)
   ├── SyncMarks_firefox/                 # Extension Chrome (dossier)
   ├── INSTALLATION_GUIDE.md      # Ce guide
   └── README.md                  # Documentation
   ```

### Installation sur Plusieurs Machines

1. **Machine 1** : Installation complète
2. **Machines suivantes** : 
   - Installer avec le même installateur
   - Utiliser le même ID d'extension
   - Synchronisation automatique

---

## 🆘 Support

### Informations Système Requises

- **OS** : Windows 10 version 1903+ ou Windows 11
- **Chrome** : Version 88+ (Manifest V3)
- **Python** : 3.8+ (pour compilation manuelle)
- **Espace disque** : ~50 MB

### Obtenir de l'Aide

1. **Consulter cette documentation**
2. **Exécuter les tests automatiques** : `python test_syncmark.py`
3. **Vérifier les logs** dans les outils développeur Chrome
4. **Contacter l'équipe de développement**

### Fichiers de Log

- **Extension** : Console des outils développeur Chrome
- **Programme** : Logs Windows (Observateur d'événements)
- **Installation** : Logs Inno Setup dans `%TEMP%`

---

## 📋 Checklist d'Installation

- [ ] Python 3.8+ installé
- [ ] Dépendances pip installées
- [ ] Exécutables compilés (SyncMarkHost.exe, SyncMarkSettings.exe)
- [ ] Extension Chrome chargée
- [ ] ID d'extension copié
- [ ] Native Host configuré avec l'ID
- [ ] Tests automatiques réussis (4/4)
- [ ] Chrome redémarré
- [ ] Extension testée et fonctionnelle

---

**Version** : 2.0  
**Dernière mise à jour** : Décembre 2024  
**Compatibilité** : Windows 10/11, Chrome 88+