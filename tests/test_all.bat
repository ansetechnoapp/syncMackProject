@echo off
title Test Multi-Navigateurs - SyncMark
color 0B
echo.
echo ████████████████████████████████████████████████████████████
echo ███                                                      ███
echo ███         TEST CONFIGURATION MULTI-NAVIGATEURS        ███
echo ███                                                      ███  
echo ████████████████████████████████████████████████████████████
echo.

cd /d "%~dp0"

echo 🔍 Verification de la configuration pour tous les navigateurs...
echo.

python test_browsers.py

echo.
if %ERRORLEVEL% EQU 0 (
    echo ████████████████████████████████████████████████████████████
    echo ███                                                      ███
    echo ███                  TESTS REUSSIS !                    ███
    echo ███                                                      ███
    echo ████████████████████████████████████████████████████████████
    echo.
    echo 🎉 Votre configuration multi-navigateurs est prete !
    echo.
    echo 📋 Instructions finales :
    echo    1. Demarrez le service si pas deja fait
    echo    2. Installez l'extension dans vos navigateurs
    echo    3. Testez la synchronisation
    echo.
) else (
    echo ████████████████████████████████████████████████████████████
    echo ███                                                      ███
    echo ███                CONFIGURATION MANQUANTE              ███
    echo ███                                                      ███
    echo ████████████████████████████████████████████████████████████
    echo.
    echo ⚠️  Il faut d'abord configurer les navigateurs
    echo.
    echo 👉 Executez: setup_universal.bat
    echo.
)

npause
