#!/usr/bin/env python3
import os
import json
import sys
import argparse
from pathlib import Path

# Constants
HOST_NAME = "com.syncmark.host"
DESCRIPTION = "SyncMark Native Host (Rust)"
ALLOWED_ORIGINS_CHROME = [
    "chrome-extension://nnadinncdcmlgodlpgbjendkeonojfoc/",
    "extension://nnadinncdcmlgodlpgbjendkeonojfoc/" 
]

def get_browsers_paths():
    """Returns a dictionary of browser names and their native messaging host paths for macOS"""
    home = Path.home()
    return {
        "chrome": home / "Library/Application Support/Google/Chrome/NativeMessagingHosts",
        "edge": home / "Library/Application Support/Microsoft Edge/NativeMessagingHosts",
        "brave": home / "Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts",
        "chromium": home / "Library/Application Support/Chromium/NativeMessagingHosts",
        "firefox": home / "Library/Application Support/Mozilla/NativeMessagingHosts",
    }

def install_manifest(extension_id=None):
    # Find project root
    project_root = Path(__file__).resolve().parent.parent
    
    # Path to the wrapper script (Recommended for macOS)
    wrapper_path = project_root / "backend_rust" / "backend_wrapper.sh"
    
    # Path to the direct binary (Fallback)
    binary_path = project_root / "backend_rust" / "target" / "release" / "backend_rust"
    
    final_path = binary_path
    
    # Check if wrapper exists and use it
    if wrapper_path.exists():
        print(f"ℹ️  Using Wrapper Script: {wrapper_path}")
        final_path = wrapper_path
    elif binary_path.exists():
        print(f"ℹ️  Using Direct Binary: {binary_path}")
        final_path = binary_path
    else:
        print(f"❌ Error: Neither wrapper nor Rust binary found.")
        print("   Please run 'cargo build --release' inside backend_rust directory.")
        sys.exit(1)
    
    # Update origins if ID provided
    origins = ALLOWED_ORIGINS_CHROME.copy()
    if extension_id:
        clean_id = extension_id.replace("chrome-extension://", "").replace("/", "")
        origins.append(f"chrome-extension://{clean_id}/")
        print(f"ℹ️  Added Extension ID: {clean_id}")

    # Prepare Manifest Content
    manifest_content = {
        "name": HOST_NAME,
        "description": DESCRIPTION,
        "path": str(final_path),
        "type": "stdio",
        "allowed_origins": origins
    }

    # Install for all detected browsers
    browsers = get_browsers_paths()
    installed_count = 0
    
    print("\nInstalling Native Host Manifests...")
    
    for browser, path in browsers.items():
        try:
            # Create parent dir if it doesn't exist (only if the browser supports it generally)
            # We create it blindly here as it's harmless
            path.mkdir(parents=True, exist_ok=True)
            
            target_file = path / f"{HOST_NAME}.json"
            
            with open(target_file, 'w') as f:
                json.dump(manifest_content, f, indent=2)
            
            print(f"✅ {browser.capitalize()}: Installed to {target_file}")
            installed_count += 1
            
        except PermissionError:
            print(f"⚠️ {browser.capitalize()}: Permission denied for {path}")
        except Exception as e:
            print(f"❌ {browser.capitalize()}: Error {e}")

    # Fallback / Manual instructions
    local_manifest = project_root / f"{HOST_NAME}.json"
    with open(local_manifest, 'w') as f:
        json.dump(manifest_content, f, indent=2)
    
    print("\n" + "="*50)
    print("       IMPORTANT : EXTENSION ID CHECK")
    print("="*50)
    print("Since you are installing in Developer Mode (Unpacked),")
    print("Chrome will assign a UNIQUE ID to your extension.")
    print("\n1. Go to chrome://extensions")
    print("2. Find 'SyncMark'")
    print("3. Copy the ID (e.g., 'abcdefghijklmnop...')")
    print("4. Check if it matches one of these:")
    for origin in origins:
        print(f"   - {origin}")
    print("\n👉 IF IT DOES NOT MATCH:")
    print(f"   Run this script again with your ID:")
    print(f"   python3 scripts/setup_rust.py --id <YOUR_ID>")
    print("="*50)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Install SyncMark Native Host')
    parser.add_argument('--id', help='Your specific Extension ID from chrome://extensions')
    args = parser.parse_args()
    
    install_manifest(args.id)
