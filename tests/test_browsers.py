#!/usr/bin/env python3
"""
Test de Communication Multi-Navigateurs
=======================================

Ce script teste la communication avec tous les navigateurs configurés
"""

import os
import sys
import json
import winreg
import subprocess
from pathlib import Path

CURRENT_DIR = Path(__file__).parent.absolute()

def check_browser_registry(browser_name, registry_path):
    """Vérifie si un navigateur est configuré dans le registre"""
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, registry_path) as key:
            manifest_path, _ = winreg.QueryValueEx(key, "")
            if Path(manifest_path).exists():
                return True, manifest_path
            else:
                return False, f"Manifest non trouvé: {manifest_path}"
    except Exception as e:
        return False, str(e)

def test_all_browsers():
    """Teste la configuration pour tous les navigateurs"""
    
    browsers = {
        "Chrome": r"SOFTWARE\Google\Chrome\NativeMessagingHosts\com.syncmark.host",
        "Edge": r"SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.syncmark.host",
        "Firefox": r"SOFTWARE\Mozilla\NativeMessagingHosts\com.syncmark.host",
        "Opera": r"SOFTWARE\Opera Software\Opera\NativeMessagingHosts\com.syncmark.host",
        "Brave": r"SOFTWARE\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.syncmark.host",
        "Vivaldi": r"SOFTWARE\Vivaldi\NativeMessagingHosts\com.syncmark.host"
    }
    
    print("🌐 Test de Configuration Multi-Navigateurs")
    print("=" * 60)
    
    results = {}
    
    for browser, registry_path in browsers.items():
        print(f"\n🔍 Test {browser}...")
        
        success, message = check_browser_registry(browser, registry_path)
        results[browser] = success
        
        if success:
            print(f"✅ {browser}: Configuré")
            print(f"   📁 Manifest: {message}")
        else:
            print(f"❌ {browser}: Non configuré")
            print(f"   ⚠️  {message}")
    
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 60)
    
    configured_count = sum(results.values())
    total_count = len(results)
    
    print(f"✅ Navigateurs configurés: {configured_count}/{total_count}")
    
    for browser, status in results.items():
        status_icon = "✅" if status else "❌"
        print(f"{status_icon} {browser}")
    
    if configured_count > 0:
        print(f"\n🎉 {configured_count} navigateur(s) prêt(s) pour SyncMark !")
        print("\n📋 Prochaines étapes:")
        print("1. Démarrez le service: service_start.bat")
        print("2. Installez l'extension dans chaque navigateur configuré")
        print("3. Testez la synchronisation")
        return True
    else:
        print("\n❌ Aucun navigateur configuré !")
        print("👉 Exécutez d'abord: setup_universal.bat")
        return False

def main():
    """Fonction principale"""
    try:
        return 0 if test_all_browsers() else 1
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())
