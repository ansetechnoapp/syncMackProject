# Guide pour packager et installer SyncMark

Ce guide vous explique comment transformer les scripts Python (`syncmark_daemon.py` et `syncmark_ui.py`) en une véritable application de bureau pour Windows, facile à installer et qui se lance au démarrage.

---

## Étape 1 : Prérequis

- Assurez-vous d'avoir **Python** installé sur votre machine.
- Installez **PyInstaller** pour convertir vos scripts `.py` en exécutables `.exe` :

  ```
  pip install pyinstaller
  ```

---

## Étape 2 : Créer les exécutables

PyInstaller va analyser vos scripts et les empaqueter avec toutes les dépendances nécessaires dans un seul fichier exécutable.

### a) Créer l'exécutable pour le démon (`syncmark_daemon.py`)

Ce sera un programme sans fenêtre qui s'exécute en arrière-plan.

```
pyinstaller --name SyncMarkDaemon --noconsole --onefile syncmark_daemon.py
```

- `--name SyncMarkDaemon` : Nomme l'exécutable `SyncMarkDaemon.exe`.
- `--noconsole` : Empêche l'ouverture d'une console noire lorsque le programme s'exécute.
- `--onefile` : Regroupe tout en un seul fichier `.exe`.

### b) Créer l'exécutable pour l'interface (`syncmark_ui.py`)

Ce sera un programme avec une fenêtre visible.

```
pyinstaller --name SyncMarkSettings --windowed --onefile syncmark_ui.py
```

- `--name SyncMarkSettings` : Nomme l'exécutable `SyncMarkSettings.exe`.
- `--windowed` : Indique que c'est une application avec une interface graphique.
- `--onefile` : Regroupe tout en un seul fichier `.exe`.

Après ces commandes, vous trouverez les fichiers `SyncMarkDaemon.exe` et `SyncMarkSettings.exe` dans un dossier nommé `dist`.

---

## Étape 3 : Lancement automatique au démarrage (Windows)

Pour que la synchronisation fonctionne tout le temps, `SyncMarkDaemon.exe` doit se lancer au démarrage de Windows.  
La méthode la plus simple est d'ajouter une clé dans le Registre Windows.

1. Créez un fichier texte et nommez-le `autorun.reg`.
2. Copiez-y le contenu suivant, en remplaçant `CHEMIN\\VERS\\SyncMarkDaemon.exe` par le chemin complet où vous prévoyez d'installer l'application (par exemple `C:\\Program Files\\SyncMark\\SyncMarkDaemon.exe`).  
   **Attention aux doubles backslashs `\\`.**

   ```
   Windows Registry Editor Version 5.00

   [HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run]
   "SyncMark"="\"CHEMIN\\VERS\\SyncMarkDaemon.exe\""
   ```

- L'exécution de ce fichier `.reg` ajoutera automatiquement votre programme au démarrage de l'ordinateur pour l'utilisateur actuel.

---

## Étape 4 : Créer un installateur

La dernière étape consiste à créer un programme d'installation (`setup.exe`) qui fera tout cela pour l'utilisateur :

- Copier `SyncMarkDaemon.exe` et `SyncMarkSettings.exe` dans `C:\Program Files\SyncMark`.
- Exécuter le fichier `autorun.reg` pour configurer le lancement au démarrage.
- Créer un raccourci sur le bureau pour `SyncMarkSettings.exe`.

Des outils comme **Inno Setup** (gratuit) sont parfaits pour cela.  
Ils vous permettent de créer un script qui définit toutes les étapes de l'installation.

---

## Étape 5 : Mise à jour du Manifest de l'hôte natif

N'oubliez pas de mettre à jour votre fichier `manifest.json` pour qu'il pointe vers le nouvel emplacement de votre programme après installation.

```json
{
  "name": "com.syncmark.host",
  "description": "Programme compagnon pour SyncMark",
  "path": "C:\\Program Files\\SyncMark\\SyncMarkDaemon.exe",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://ID_DE_VOTRE_EXTENSION/"
  ]
}
```

---

Avec ces étapes, vous passerez d'un simple script à une application professionnelle et facile à distribuer !