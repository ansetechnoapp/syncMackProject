import pytest
import json
import os
from unittest.mock import patch, mock_open

# On importe le module et les fonctions, mais pas les variables globales
# qui seront patchées par la fixture.
import syncmark_host
from syncmark_host import process_bookmarks, is_sync_enabled

# --- Tests pour process_bookmarks ---

def test_process_bookmarks_no_local_file(mock_sync_dir):
    """
    Vérifie que si aucun fichier de favoris local n'existe, les favoris de
    l'extension sont sauvegardés directement.
    """
    extension_bookmarks = [{'url': 'https://example.com', 'title': 'Example'}]
    message = {'bookmarks': extension_bookmarks}

    with patch('syncmark_host.send_message') as mock_send:
        process_bookmarks(message)

        # On utilise la variable patchée via le module
        with open(syncmark_host.BOOKMARKS_FILE_PATH, 'r', encoding='utf-8') as f:
            saved_bookmarks = json.load(f)
        assert saved_bookmarks == extension_bookmarks

        mock_send.assert_called_once_with({
            'status': 'success',
            'bookmarks': extension_bookmarks
        })

def test_process_bookmarks_empty_local_file(mock_sync_dir):
    """
    Vérifie le comportement lorsque le fichier de favoris local est valide mais vide.
    """
    # Créer un fichier JSON valide mais vide
    with open(syncmark_host.BOOKMARKS_FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump([], f)

    extension_bookmarks = [{'url': 'https://anotherexample.com', 'title': 'Another'}]
    message = {'bookmarks': extension_bookmarks}

    with patch('syncmark_host.send_message') as mock_send:
        process_bookmarks(message)

        with open(syncmark_host.BOOKMARKS_FILE_PATH, 'r', encoding='utf-8') as f:
            saved_bookmarks = json.load(f)
        assert saved_bookmarks == extension_bookmarks
        mock_send.assert_called_once_with({
            'status': 'success',
            'bookmarks': extension_bookmarks
        })

def test_process_bookmarks_merges_new(mock_sync_dir):
    """
    Teste que les nouveaux favoris de l'extension sont bien fusionnés
    avec les favoris locaux existants.
    """
    local_bookmarks = [{'url': 'https://local.com', 'title': 'Local'}]
    with open(syncmark_host.BOOKMARKS_FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(local_bookmarks, f)

    extension_bookmarks = [{'url': 'https://extension.com', 'title': 'Extension'}]
    message = {'bookmarks': extension_bookmarks}

    with patch('syncmark_host.send_message') as mock_send:
        process_bookmarks(message)

        with open(syncmark_host.BOOKMARKS_FILE_PATH, 'r', encoding='utf-8') as f:
            saved_bookmarks = json.load(f)

        assert len(saved_bookmarks) == 2
        # Vérifier que les deux URLs sont présentes
        urls = {bm['url'] for bm in saved_bookmarks}
        assert 'https://local.com' in urls
        assert 'https://extension.com' in urls

def test_process_bookmarks_deduplicates(mock_sync_dir):
    """
    Vérifie que les favoris en double sont dédupliqués, en gardant la version de l'extension.
    """
    local_bookmarks = [{'url': 'https://common.com', 'title': 'Old Title'}]
    with open(syncmark_host.BOOKMARKS_FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(local_bookmarks, f)

    extension_bookmarks = [{'url': 'https://common.com', 'title': 'New Title'}]
    message = {'bookmarks': extension_bookmarks}

    with patch('syncmark_host.send_message') as mock_send:
        process_bookmarks(message)

        with open(syncmark_host.BOOKMARKS_FILE_PATH, 'r', encoding='utf-8') as f:
            saved_bookmarks = json.load(f)

        assert len(saved_bookmarks) == 1
        assert saved_bookmarks[0]['title'] == 'New Title'

def test_process_bookmarks_handles_read_error(mock_sync_dir):
    """
    Vérifie la gestion d'une erreur de lecture du fichier de favoris.
    """
    message = {'bookmarks': []}

    # Simuler une erreur de lecture en utilisant mock_open
    with patch('builtins.open', mock_open()) as mock_file:
        # On attache l'effet de bord à l'objet 'open' lui-même
        mock_file.side_effect = IOError("Permission denied")

        with patch('syncmark_host.send_message') as mock_send:
            # On doit patcher le chemin utilisé DANS LA FONCTION, pas le open global
            with patch('syncmark_host.os.path.exists', return_value=True):
                 process_bookmarks(message)

            mock_send.assert_called_once_with({
                'status': 'error',
                'message': 'Could not read or parse local bookmarks file. Sync aborted.'
            })

# --- Tests pour is_sync_enabled ---

def test_is_sync_enabled_no_file(mock_sync_dir):
    """
    Vérifie que la synchro est activée par défaut si le fichier de config n'existe pas.
    """
    assert is_sync_enabled() is True
    assert os.path.exists(syncmark_host.CONFIG_FILE)
    with open(syncmark_host.CONFIG_FILE, 'r') as f:
        config = json.load(f)
        assert config['enabled'] is True

def test_is_sync_enabled_is_true(mock_sync_dir):
    """Vérifie la lecture quand la synchro est activée."""
    with open(syncmark_host.CONFIG_FILE, 'w') as f:
        json.dump({'enabled': True}, f)
    assert is_sync_enabled() is True

def test_is_sync_enabled_is_false(mock_sync_dir):
    """Vérifie la lecture quand la synchro est désactivée."""
    with open(syncmark_host.CONFIG_FILE, 'w') as f:
        json.dump({'enabled': False}, f)
    assert is_sync_enabled() is False
