# Guide Final : Création de l'Installateur SyncMark

Vous avez les exécutables, et maintenant le script de l'installateur. Voici comment tout assembler pour créer votre `SyncMark_Setup.exe` final.

---

## Étape 1 : Télécharger et Installer Inno Setup 

1. Téléchargez Inno Setup depuis son site officiel :  
   [https://jrsoftware.org/isinfo.php](https://jrsoftware.org/isinfo.php)
2. Installez-le comme n'importe quel autre programme.

---

## Étape 2 : Organiser vos Fichiers

Pour que le script fonctionne sans modification, votre structure de dossiers doit être la suivante : 
d
```
Votre_Dossier_Projet/
│
├── dist/
│   ├── SyncMarkDaemon.exe
│   └── SyncMarkSettings.exe
│
└── setup_script.iss
```

- Le script `setup_script.iss` doit être placé juste à côté du dossier `dist` qui contient vos deux programmes.

---

## Étape 3 : Configurer l'ID de votre Extension

1. Ouvrez le fichier `setup_script.iss` avec un éditeur de texte (Bloc-notes, VS Code, etc.).
2. À la toute fin du fichier, trouvez cette ligne :

   ```
   ManifestLines[5] := '  "allowed_origins": ["chrome-extension://ID_DE_VOTRE_EXTENSION/"]';
   ```

3. Remplacez `ID_DE_VOTRE_EXTENSION` par l'ID réel de votre extension de navigateur.  
   **C'est crucial pour que la communication fonctionne !**

---

## Étape 4 : Compiler le Script

1. Faites un clic droit sur votre fichier `setup_script.iss` et choisissez **Compile**.
2. Si cette option n'apparaît pas :
   - Ouvrez Inno Setup.
   - Allez dans **File → Open**, sélectionnez votre script.
   - Cliquez sur le bouton **Build → Compile** dans le menu.

- Inno Setup va travailler pendant quelques secondes.
- S'il n'y a pas d'erreur, il créera un nouveau dossier nommé `installer`.
- À l'intérieur de ce dossier, vous trouverez votre fichier final : `SyncMark_Setup.exe`.

---

## Étape 5 : C'est Prêt !

Félicitations ! Vous avez maintenant un installateur complet et professionnel.  
Vous pouvez l'envoyer à n'importe qui. Lorsqu'ils l'exécuteront, il installera l'application, la configurera pour démarrer avec Windows et la rendra disponible pour votre extension de navigateur.