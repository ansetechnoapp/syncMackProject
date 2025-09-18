# SyncMark - Documentation d'Installation et Configuration

## Vue d'ensemble

SyncMark est un système de synchronisation de signets composé de :
- **Extension Chrome** : Interface utilisateur dans le navigateur
- **Programme Compagnon** : Service Windows pour la synchronisation
- **Native Messaging** : Communication entre l'extension et le programme

## Structure du Projet

```
SyncMark_Helpers/
├── dist/                          # Exécutables compilés
│   ├── SyncMarkHost.exe          # Service principal
│   ├── SyncMarkSettings.exe      # Interface de configuration
│   └── SyncMarkDaemon.exe        # Service d'arrière-plan
├── native_host_manifest.json     # Manifest Native Messaging
├── install_native_host.py        # Script d'installation automatique
├── setup_script.iss             # Script Inno Setup
└── test_syncmark.py             # Tests de validation

SyncMarks/
├── manifest.json                 # Manifest de l'extension Chrome
├── icons/                       # Icônes SVG de l'extension
├── popup.html/css/js           # Interface utilisateur
└── background.js               # Service worker
```

## Installation Automatique

### 1. Créer l'Installateur

```bash
# Dans le dossier SyncMark_Helpers
# Compiler avec Inno Setup
iscc setup_script.iss
```

L'installateur créé dans `installer/SyncMark_Setup_v2.0.exe` :
- Installe les exécutables dans `Program Files\SyncMark`
- Configure le démarrage automatique
- Installe automatiquement le Native Host
- Crée les raccourcis bureau

### 2. Installation de l'Extension Chrome

1. Ouvrir Chrome et aller à `chrome://extensions/`
2. Activer le "Mode développeur"
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner le dossier `SyncMarks/`
5. Noter l'ID de l'extension généré

### 3. Configuration du Native Messaging

Après installation, configurer l'ID de l'extension :

```bash
# Méthode automatique (recommandée)
python install_native_host.py install VOTRE_EXTENSION_ID

# Méthode manuelle
# Éditer native_host_manifest.json et remplacer YOUR_EXTENSION_ID_HERE
```

## Installation Manuelle

### Prérequis

- Python 3.8+
- Windows 10/11
- Chrome/Edge/Opera

### Étapes

1. **Installer les dépendances Python**
   ```bash
   cd SyncMark_Helpers
   pip install -r requirements.txt
   pip install pyinstaller
   ```

2. **Compiler les exécutables**
   ```bash
   pyinstaller SyncMarkHost.spec
   pyinstaller SyncMarkSettings.spec
   ```

3. **Configurer le Native Host**
   ```bash
   python install_native_host.py install
   ```

4. **Tester l'installation**
   ```bash
   python test_syncmark.py
   ```

## Tests et Validation

### Script de Test Automatique

```bash
python test_syncmark.py
```

Vérifie :
- ✅ Présence des exécutables
- ✅ Configuration Native Messaging
- ✅ Script Inno Setup
- ✅ Intégrité des fichiers

### Tests Manuels

1. **Test du Service**
   ```bash
   SyncMarkHost.exe
   # Doit démarrer sans erreur
   ```

2. **Test de l'Extension**
   - Ouvrir l'extension dans Chrome
   - Vérifier la communication avec le service
   - Tester la synchronisation

## Dépannage

### Problèmes Courants

**Extension ne communique pas avec le service**
- Vérifier l'ID de l'extension dans le manifest
- Contrôler les clés de registre
- Redémarrer Chrome

**Service ne démarre pas**
- Vérifier les permissions
- Contrôler les logs Windows
- Tester en mode administrateur

**Erreurs de compilation**
- Mettre à jour PyInstaller
- Vérifier les dépendances Python
- Nettoyer les dossiers build/dist

### Logs et Diagnostic

```bash
# Vérifier le registre
reg query "HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.syncmark.host"

# Tester la communication
echo '{"test": true}' | SyncMarkHost.exe

# Logs de l'extension
# Ouvrir les outils développeur dans Chrome
```

## Désinstallation

### Automatique
Utiliser le désinstalleur Windows dans "Programmes et fonctionnalités"

### Manuelle
```bash
# Supprimer le Native Host
python install_native_host.py uninstall

# Supprimer les fichiers
rmdir /s "C:\Program Files\SyncMark"

# Nettoyer le registre
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "SyncMark" /f
```

## Développement

### Structure du Code

- `syncmark_host.py` : Service principal Native Messaging
- `syncmark_ui.py` : Interface utilisateur de configuration
- `install_native_host.py` : Utilitaire d'installation
- `test_syncmark.py` : Suite de tests

### Compilation

```bash
# Créer les specs PyInstaller
pyi-makespec --onefile --windowed syncmark_host.py
pyi-makespec --onefile --windowed syncmark_ui.py

# Compiler
pyinstaller SyncMarkHost.spec
pyinstaller SyncMarkSettings.spec
```

## Support

Pour obtenir de l'aide :
1. Consulter cette documentation
2. Exécuter les tests automatiques
3. Vérifier les logs système
4. Contacter l'équipe de développement

---

**Version** : 2.0  
**Dernière mise à jour** : Décembre 2024  
**Compatibilité** : Windows 10/11, Chrome 88+