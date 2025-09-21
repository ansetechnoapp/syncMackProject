import os
import json
import winreg
import sys
from pathlib import Path

def get_extension_id():
    """Demande à l'utilisateur de fournir l'ID de l'extension."""
    while True:
        extension_id = input("Veuillez entrer l'ID de l'extension (ex: lmfgopgommbiberhkhhgjbaleglempgm): ").strip()
        if extension_id:
            return extension_id
        print("L'ID de l'extension ne peut pas être vide.")

def create_manifest(extension_id, host_path):
    """Crée le fichier manifeste pour l'hôte de messagerie natif."""
    manifest = {
        "name": "com.syncmark.host",
        "description": "Native messaging host for SyncMark",
        "path": str(host_path),
        "type": "stdio",
        "allowed_origins": [
            f"chrome-extension://{extension_id}/"
        ]
    }
    manifest_path = Path(__file__).parent.parent / "backend" / "com.syncmark.host.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=4)
    return manifest_path

def register_host_in_registry(browser_name, registry_path, manifest_path):
    """Enregistre l'hôte de messagerie natif dans le registre Windows."""
    try:
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, registry_path) as key:
            winreg.SetValueEx(key, "", 0, winreg.REG_SZ, str(manifest_path))
        print(f"✅ {browser_name}: Hôte de messagerie natif enregistré avec succès.")
        return True
    except Exception as e:
        print(f"❌ {browser_name}: Erreur lors de l'enregistrement de l'hôte: {e}")
        return False

def setup_browsers():
    """Configure tous les navigateurs pris en charge."""
    extension_id = get_extension_id()
    host_path = Path(__file__).parent.parent / "backend" / "service.py"
    manifest_path = create_manifest(extension_id, host_path)
    print(f"\n📄 Manifeste créé: {manifest_path}")

    browsers = {
        "Chrome": r"SOFTWARE\Google\Chrome\NativeMessagingHosts\com.syncmark.host",
        "Edge": r"SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.syncmark.host",
        "Firefox": r"SOFTWARE\Mozilla\NativeMessagingHosts\com.syncmark.host",
        "Opera": r"SOFTWARE\Opera Software\Opera\NativeMessagingHosts\com.syncmark.host",
        "Brave": r"SOFTWARE\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.syncmark.host",
        "Vivaldi": r"SOFTWARE\Vivaldi\NativeMessagingHosts\com.syncmark.host"
    }

    print("\n🔧 Configuration des navigateurs...")
    for browser, registry_path in browsers.items():
        register_host_in_registry(browser, registry_path, manifest_path)

if __name__ == "__main__":
    setup_browsers()