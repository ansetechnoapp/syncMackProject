# SyncMark v2.0 - Architecture et Installation

## Architecture des projets

SyncMark est composé de deux parties complémentaires :

- **SyncMark (Extension navigateur)**  
  C'est l'extension Chrome/Edge qui permet à l'utilisateur de lancer la synchronisation des favoris, d'importer/exporter, et d'interagir avec le programme compagnon.

- **SyncMark_Helper (Programme compagnon)**  
  C'est une application Python (puis packagée en .exe) qui s'exécute sur l'ordinateur. Elle réalise la synchronisation réelle des fichiers de favoris, communique avec l'extension via Native Messaging, et propose une interface de configuration.

**Workflow :**
1. L'utilisateur clique sur "Synchroniser" dans l'extension SyncMark.
2. L'extension envoie une requête au programme SyncMark_Helper via Native Messaging.
3. SyncMark_Helper lit/écrit les fichiers de favoris dans le dossier Documents/SyncMark et retourne le résultat à l'extension.
4. L'extension met à jour l'affichage ou les favoris du navigateur.

## Installation avec Programme Compagnon

Cette version utilise un programme compagnon pour une synchronisation en un clic, sans boîtes de dialogue de fichier. L'installation est plus complexe mais le résultat est bien meilleur.

## Partie 1 : Installer l'Extension

1. Placez les fichiers de l'extension (`manifest.json`, `popup.html`, `popup.css`, `popup.js`, `background.js` et le dossier `icons`) dans un dossier, par exemple `SyncMarkExtension`.
2. Allez sur `chrome://extensions` dans votre navigateur.
3. Activez le Mode développeur.
4. Cliquez sur **Charger l'extension non empaquetée** et sélectionnez le dossier `SyncMarkExtension`.
5. Une fois chargée, copiez l'ID de l'extension. Il ressemble à `abcdefghijklmnoabcdefghijklmnoabcd`. Vous en aurez besoin juste après.

## Partie 2 : Installer le Programme Compagnon

C'est l'étape la plus délicate. Elle nécessite des manipulations de fichiers sur votre ordinateur.

### Prérequis
- Avoir Python installé. Si ce n'est pas le cas, téléchargez-le depuis [python.org](https://python.org).
- Durant l'installation, cochez bien la case "Add Python to PATH".

### Installation
1. Créez un dossier pour le programme compagnon quelque part sur votre ordinateur, par exemple `C:\SyncMarkHelper` ou `/Users/VotreNom/SyncMarkHelper`.
2. Placez le script `syncmark_helper.py` dans ce dossier.
3. Modifiez le fichier `com.syncmark.host.json` :
   - Remplacez `CHEMIN_VERS_VOTRE_SCRIPT_PYTHON` par le chemin complet vers `syncmark_helper.py`.
     - **Attention :** sous Windows, les antislashes `\` doivent être doublés.
     - Exemple Windows :
       ```json
       "path": "C:\\SyncMarkHelper\\syncmark_helper.py"
       ```
     - Exemple macOS/Linux :
       ```json
       "path": "/Users/VotreNom/SyncMarkHelper/syncmark_helper.py"
       ```
   - Remplacez `ID_DE_VOTRE_EXTENSION` par l'ID que vous avez copié à la fin de la Partie 1.
     - Exemple :
       ```json
       "allowed_origins": [ "chrome-extension://abcdefghijklmnoabcdefghijklmnoabcd/" ]
       ```

### Enregistrement du programme compagnon auprès du navigateur

Vous devez placer le fichier `com.syncmark.host.json` dans un dossier spécifique selon votre système d'exploitation :

- **Pour Windows :**
  1. Ouvrez l'éditeur de registre (`regedit`).
  2. Naviguez jusqu'à `HKEY_CURRENT_USER\SOFTWARE\Google\Chrome\NativeMessagingHosts\`.
  3. Créez une nouvelle clé nommée `com.syncmark.host`.
  4. Modifiez la valeur (Par défaut) de cette nouvelle clé et collez-y le chemin complet vers votre fichier `com.syncmark.host.json` (ex: `C:\SyncMarkHelper\com.syncmark.host.json`).

- **Pour macOS :**
  - Placez le fichier `com.syncmark.host.json` dans `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`.

- **Pour Linux :**
  - Placez le fichier `com.syncmark.host.json` dans `~/.config/google-chrome/NativeMessagingHosts/`.

Redémarrez complètement votre navigateur.

## Utilisation

Une fois tout installé :
1. Ouvrez l'extension et cliquez sur **Synchroniser**.
2. Le script Python s'exécutera en arrière-plan, lira/écrira dans le dossier `Documents/SyncMark`, et mettra à jour le navigateur.
3. Répétez l'opération sur vos autres navigateurs (en installant l'extension et le programme compagnon sur chaque machine).