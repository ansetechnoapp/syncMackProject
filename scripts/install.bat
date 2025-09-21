@echo off
title Installation SyncMark Multi-Navigateurs
echo.
echo ================================================
echo     INSTALLATION SYNCMARK MULTI-NAVIGATEURS
echo ================================================
echo.

cd /d "%~dp0"
cd ..

echo 🔧 Configuration de tous les navigateurs...
python scripts/configure_browsers.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Installation terminée !
    echo.
    echo 📋 Prochaines étapes :
    echo 1. Démarrez le service : scripts/start_service.bat
    echo 2. Installez l'extension dans vos navigateurs
    echo 3. Testez : tests/test_all.bat
    echo.
) else (
    echo ❌ Erreur d'installation
)

pause
