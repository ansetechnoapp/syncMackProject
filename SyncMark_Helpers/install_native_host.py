#!/usr/bin/env python3
"""
Script d'installation du Native Host pour SyncMark
Configure automatiquement le registre Windows pour le Native Messaging
"""
import json
import os
import sys
import winreg
from pathlib import Path

def install_native_host_manifest(extension_id=None):
    """
    Installe le manifest Native Host dans le registre Windows
    
    Args:
        extension_id (str): ID de l'extension Chrome (optionnel)
    """
    print("🔧 Installation du Native Host SyncMark...")
    
    # Chemin du manifest
    manifest_path = Path(__file__).parent / "native_host_manifest.json"
    
    if not manifest_path.exists():
        print("❌ Fichier native_host_manifest.json non trouvé")
        return False
    
    # Lire le manifest
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
    except Exception as e:
        print(f"❌ Erreur lors de la lecture du manifest: {e}")
        return False
    
    # Mettre à jour l'ID de l'extension si fourni
    if extension_id:
        manifest["allowed_origins"] = [f"chrome-extension://{extension_id}/"]
        print(f"✅ ID d'extension configuré: {extension_id}")
    
    # Créer un manifest temporaire avec l'ID mis à jour
    temp_manifest_path = Path(__file__).parent / "temp_manifest.json"
    try:
        with open(temp_manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)
    except Exception as e:
        print(f"❌ Erreur lors de la création du manifest temporaire: {e}")
        return False
    
    # Clé de registre pour Chrome
    registry_key = r"SOFTWARE\Google\Chrome\NativeMessagingHosts\com.syncmark.host"
    
    try:
        # Ouvrir/créer la clé de registre
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, registry_key) as key:
            # Définir la valeur par défaut comme le chemin du manifest
            winreg.SetValue(key, "", winreg.REG_SZ, str(temp_manifest_path.absolute()))
            print(f"✅ Clé de registre créée: HKCU\\{registry_key}")
            print(f"✅ Manifest installé: {temp_manifest_path.absolute()}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de l'installation dans le registre: {e}")
        return False

def uninstall_native_host():
    """Désinstalle le Native Host du registre"""
    print("🗑️  Désinstallation du Native Host SyncMark...")
    
    registry_key = r"SOFTWARE\Google\Chrome\NativeMessagingHosts\com.syncmark.host"
    
    try:
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, registry_key)
        print("✅ Native Host désinstallé du registre")
        return True
    except FileNotFoundError:
        print("ℹ️  Native Host n'était pas installé")
        return True
    except Exception as e:
        print(f"❌ Erreur lors de la désinstallation: {e}")
        return False

def main():
    """Fonction principale"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "uninstall":
            return uninstall_native_host()
        elif sys.argv[1] == "install":
            extension_id = sys.argv[2] if len(sys.argv) > 2 else None
            return install_native_host_manifest(extension_id)
    
    print("Usage:")
    print("  python install_native_host.py install [EXTENSION_ID]")
    print("  python install_native_host.py uninstall")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)