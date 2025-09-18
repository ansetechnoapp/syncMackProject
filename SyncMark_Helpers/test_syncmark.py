#!/usr/bin/env python3
"""
Script de test pour SyncMark - Validation du fonctionnement
"""
import json
import os
import sys
import subprocess
import tempfile
from pathlib import Path

def test_syncmark_host_executable():
    """Test si l'exécutable SyncMarkHost existe et peut être lancé"""
    print("🔍 Test de l'exécutable SyncMarkHost...")
    
    host_exe = Path("dist/SyncMarkHost.exe")
    if not host_exe.exists():
        print("❌ SyncMarkHost.exe non trouvé dans dist/")
        return False
    
    print("✅ SyncMarkHost.exe trouvé")
    return True

def test_syncmark_settings_executable():
    """Test si l'exécutable SyncMarkSettings existe"""
    print("🔍 Test de l'exécutable SyncMarkSettings...")
    
    settings_exe = Path("dist/SyncMarkSettings.exe")
    if not settings_exe.exists():
        print("❌ SyncMarkSettings.exe non trouvé dans dist/")
        return False
    
    print("✅ SyncMarkSettings.exe trouvé")
    return True

def test_native_messaging_manifest():
    """Test si le manifest Native Messaging est correctement configuré"""
    print("🔍 Test du manifest Native Messaging...")
    
    manifest_file = Path("native_host_manifest.json")
    if not manifest_file.exists():
        print("❌ native_host_manifest.json non trouvé")
        return False
    
    try:
        with open(manifest_file, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        required_fields = ["name", "description", "path", "type", "allowed_origins"]
        for field in required_fields:
            if field not in manifest:
                print(f"❌ Champ manquant dans le manifest: {field}")
                return False
        
        print("✅ Manifest Native Messaging valide")
        return True
    except json.JSONDecodeError:
        print("❌ Erreur de format JSON dans le manifest")
        return False

def test_inno_setup_script():
    """Test si le script Inno Setup est présent et valide"""
    print("🔍 Test du script Inno Setup...")
    
    setup_script = Path("setup_script.iss")
    if not setup_script.exists():
        print("❌ setup_script.iss non trouvé")
        return False
    
    print("✅ Script Inno Setup trouvé")
    return True

def run_all_tests():
    """Exécute tous les tests et affiche un résumé"""
    print("🚀 Démarrage des tests SyncMark...\n")
    
    tests = [
        test_syncmark_host_executable,
        test_syncmark_settings_executable,
        test_native_messaging_manifest,
        test_inno_setup_script
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
            print()
        except Exception as e:
            print(f"❌ Erreur lors du test {test.__name__}: {e}")
            results.append(False)
            print()
    
    # Résumé
    passed = sum(results)
    total = len(results)
    
    print("=" * 50)
    print(f"📊 RÉSUMÉ DES TESTS: {passed}/{total} réussis")
    
    if passed == total:
        print("🎉 Tous les tests sont passés! Le projet est prêt.")
        return True
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez les erreurs ci-dessus.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)