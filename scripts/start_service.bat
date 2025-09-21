@echo off
title Service Native Host - SyncMark
echo.
echo ========================================================
echo         DEMARRAGE DU SERVICE NATIVE HOST
echo ========================================================
echo.

cd /d "%~dp0"
echo Demarrage du service native host...
echo.
echo IMPORTANT: Laissez cette fenetre ouverte !
echo Le service doit rester actif pour que l'extension fonctionne.
echo.
echo Appuyez sur Ctrl+C pour arreter le service.
echo.

python ..\backend\service.py

pause
