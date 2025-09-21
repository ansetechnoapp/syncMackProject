import shutil
import os
from pathlib import Path

# Définir les chemins
ROOT_DIR = Path(__file__).parent.parent
BUILD_DIR = ROOT_DIR / "build"
EXTENSION_SRC_DIR = ROOT_DIR / "extension" / "src"

def build_extension(browser: str):
    """
    Compile l'extension pour un navigateur spécifique (chrome ou firefox).
    """
    print(f"--- Compilation pour {browser} ---")

    # Nettoyer le dossier de build
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    BUILD_DIR.mkdir()

    # Copier les fichiers source de l'extension
    shutil.copytree(EXTENSION_SRC_DIR, BUILD_DIR, dirs_exist_ok=True)

    # Choisir et copier le bon manifest
    manifest_name = f"manifest-{browser}.json"
    manifest_src = ROOT_DIR / "extension" / manifest_name
    manifest_dest = BUILD_DIR / "manifest.json"
    shutil.copy(manifest_src, manifest_dest)

    print(f"Manifest pour {browser} copié.")

    # Créer une archive ZIP
    archive_name = f"syncmarks-{browser}"
    shutil.make_archive(str(ROOT_DIR / archive_name), 'zip', BUILD_DIR)

    print(f"Archive {archive_name}.zip créée.")
    print(f"Build pour {browser} terminé.")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Script de build pour l'extension SyncMarks.")
    parser.add_argument('browser', choices=['chrome', 'firefox'], help="Le navigateur pour lequel compiler l'extension.")
    
    args = parser.parse_args()
    
    build_extension(args.browser)