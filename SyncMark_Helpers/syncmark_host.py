import sys
import json
import os
import struct
import logging
import time

# --- Configuration ---
# Chemins unifiés pour la configuration, les logs et les favoris.
HOME_DIR = os.path.expanduser("~")
SYNC_DIR = os.path.join(HOME_DIR, 'Documents', 'SyncMark')
os.makedirs(SYNC_DIR, exist_ok=True)
CONFIG_FILE = os.path.join(SYNC_DIR, 'config.json')
LOG_FILE = os.path.join(SYNC_DIR, 'syncmark_host.log')
BOOKMARKS_FILE_PATH = os.path.join(SYNC_DIR, 'syncmark_bookmarks.json')

# --- Mise en place du logging ---
# Ce logger aidera à déboguer le programme une fois installé.
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def is_sync_enabled():
    """Vérifie le fichier de configuration pour voir si la synchronisation est activée."""
    try:
        if not os.path.exists(CONFIG_FILE):
            # Si le fichier n'existe pas, on l'active par défaut.
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump({'enabled': True}, f)
            return True
        
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
            return config.get('enabled', False)
    except Exception as e:
        logging.error(f"Erreur lors de la lecture du fichier de configuration : {e}")
        return False

def get_message():
    """Lit un message depuis stdin, envoyé par l'extension du navigateur."""
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        # Si le canal est fermé par le navigateur, on quitte proprement.
        return None
    
    message_length = struct.unpack('@I', raw_length)[0]
    message_json = sys.stdin.buffer.read(message_length).decode('utf-8')
    logging.info(f"Message reçu de longueur {message_length}.")
    return json.loads(message_json)

def send_message(message_content):
    """Encode un message en JSON et l'envoie à stdout pour que l'extension le reçoive."""
    encoded_content = json.dumps(message_content).encode('utf-8')
    message_length = struct.pack('@I', len(encoded_content))
    
    sys.stdout.buffer.write(message_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()
    logging.info("Message envoyé à l'extension.")

def process_bookmarks(message):
    """
    Contient la logique de fusion et de sauvegarde des favoris.
    """
    extension_bookmarks = message.get('bookmarks', [])
    
    local_bookmarks = []
    if os.path.exists(BOOKMARKS_FILE_PATH):
        try:
            with open(BOOKMARKS_FILE_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
                if content:
                    local_bookmarks = json.loads(content)
        except (IOError, json.JSONDecodeError) as e:
            logging.error(f"Impossible de lire ou d'analyser le fichier de favoris local : {e}")
            # Envoyer un message d'erreur et arrêter le traitement pour éviter la perte de données.
            send_message({
                'status': 'error',
                'message': 'Could not read or parse local bookmarks file. Sync aborted.'
            })
            return  # Arrêter la fonction ici

    # Logique de fusion : un dictionnaire avec les URLs comme clés pour dédupliquer.
    merged_bookmarks_map = {bm['url']: bm for bm in local_bookmarks if 'url' in bm}
    merged_bookmarks_map.update({bm['url']: bm for bm in extension_bookmarks if 'url' in bm})
    
    synced_bookmarks = list(merged_bookmarks_map.values())
    logging.info(f"{len(local_bookmarks)} favoris locaux et {len(extension_bookmarks)} de l'extension fusionnés en {len(synced_bookmarks)} favoris uniques.")

    # Sauvegarder la liste synchronisée dans le fichier local.
    try:
        with open(BOOKMARKS_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(synced_bookmarks, f, indent=4, ensure_ascii=False)
        logging.info("Favoris fusionnés enregistrés dans le fichier local.")
    except IOError as e:
        logging.error(f"Impossible d'écrire dans le fichier de favoris local : {e}")
        send_message({
            'status': 'error',
            'message': 'Could not write to local bookmarks file. Sync aborted.'
        })
        return # Arrêter la fonction ici

    # Envoyer la liste complète et synchronisée à l'extension.
    send_message({'status': 'success', 'bookmarks': synced_bookmarks})

def main():
    """
    Fonction principale. Boucle infinie pour écouter les messages du navigateur.
    """
    logging.info("L'hôte natif SyncMark a démarré.")
    while True:
        try:
            message = get_message()
            
            if message is None:
                logging.info("Le canal de communication a été fermé par le navigateur. Sortie.")
                break

            if is_sync_enabled():
                logging.info("La synchronisation est activée. Traitement du message.")
                process_bookmarks(message)
            else:
                logging.info("La synchronisation est désactivée. Message ignoré.")
                # On peut répondre pour que l'extension sache que l'hôte est en vie mais inactif.
                send_message({'status': 'disabled', 'message': 'Sync is disabled by the user.'})
                
        except Exception as e:
            logging.error(f"Une erreur inattendue est survenue dans la boucle principale : {e}", exc_info=True)
            try:
                send_message({'status': 'error', 'message': str(e)})
            except Exception as send_e:
                logging.error(f"Impossible d'envoyer le message d'erreur à l'extension : {send_e}")
            break # Sortir de la boucle en cas d'erreur grave.

if __name__ == '__main__':
    main()
