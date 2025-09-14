# SyncMark Project Overview

Ce dépôt contient deux projets principaux : **SyncMark** et **SyncMark_Helper**.

---

## SyncMark

**SyncMark** est le projet principal. Il s'agit probablement d'une application ou d'un service, mais les fichiers fournis ne contiennent pas de détails sur son code source ou ses fonctionnalités. Pour plus d'informations, consultez le dossier `SyncMark` (non inclus dans les extraits).

---

## SyncMark_Helper

**SyncMark_Helper** est un projet d'accompagnement qui contient des outils, des scripts et des interfaces pour assister ou compléter SyncMark.

### Structure et composants

- **syncmark_ui.py** : Interface utilisateur, probablement basée sur Tkinter.
- **syncmark_host.py** : Script principal pour l'exécution ou l'hébergement de fonctionnalités.
- **build/** : Dossier de build contenant les artefacts générés par PyInstaller (fichiers `.toc`, `.pkg`, `.exe`, etc.).
- **PyInstaller** : Utilisé pour packager l'application en exécutable Windows, avec gestion des dépendances Python et des fichiers binaires.

### Fonctionnalités

- Prise en charge de nombreux encodages (via le module `encodings`).
- Utilisation de modules standards Python : collections, codecs, email, json, etc.
- Génération d'exécutables Windows avec toutes les dépendances nécessaires (DLLs, .pyd, etc.).
- Gestion des ressources et des fichiers de données pour l'application packagée.

---

## Installation

1. Cloner le dépôt :
   ```sh
   git clone <repo-url>
   ```
2. Installer Python 3.13 et les dépendances requises.
3. Utiliser PyInstaller pour générer les exécutables si besoin.

---

## Exécution

- Pour lancer l'interface utilisateur :
  ```sh
  python SyncMark_Helper/syncmark_ui.py
  ```
- Pour exécuter le host packagé :
  ```sh
  ./SyncMark_Helper/dist/SyncMarkHost.exe
  ```

---

## Notes

- Les fichiers `.toc`, `.pkg`, `.exe` sont générés automatiquement lors du build.
- Les dépendances binaires (DLLs, .pyd) sont incluses pour garantir la portabilité sous Windows.
- Pour toute modification, il est conseillé de travailler sur les scripts sources puis de régénérer les builds.

---

## Auteur

Ce projet est maintenu par l'équipe SyncMark.

