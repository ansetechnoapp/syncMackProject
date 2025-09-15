import pytest
import os
import sys

# Ajouter le répertoire parent au sys.path pour permettre l'import de syncmark_host
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@pytest.fixture
def mock_sync_dir(tmp_path, monkeypatch):
    """Crée un répertoire de synchronisation temporaire et patche les variables globales."""
    sync_dir = tmp_path / "SyncMark"
    sync_dir.mkdir()

    # Importer le module ici, après que le chemin a été ajouté.
    import syncmark_host

    # Utiliser monkeypatch pour remplacer les chemins de fichiers globaux dans le module.
    monkeypatch.setattr(syncmark_host, "SYNC_DIR", str(sync_dir))
    monkeypatch.setattr(syncmark_host, "CONFIG_FILE", os.path.join(str(sync_dir), 'config.json'))
    monkeypatch.setattr(syncmark_host, "BOOKMARKS_FILE_PATH", os.path.join(str(sync_dir), 'syncmark_bookmarks.json'))

    return str(sync_dir)
