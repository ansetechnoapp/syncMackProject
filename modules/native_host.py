"""
Native Host Manager pour SyncMark
=================================

Ce module gère la communication avec l'extension Chrome via le protocole Native Host :
- Réception et envoi de messages avec l'extension
- Traitement de la synchronisation des favoris
- Gestion des connexions et des erreurs
- Interface de communication standardisée
"""

import sys
import json
import os
import struct
import logging
from .config_manager import SyncMarkConfig, BOOKMARKS_FILE_PATH


class NativeHostManager:
    """
    Gestionnaire du Native Host pour communication avec Chrome
    
    Implémente le protocole de communication Native Host pour échanger
    des messages avec l'extension Chrome SyncMark.
    """
    
    def __init__(self):
        """Initialise le gestionnaire Native Host"""
        self.running = False
        self.message_handlers = {
            'sync_bookmarks': self.process_bookmarks,
            'get_status': self.get_sync_status,
            'ping': self.handle_ping
        }
    
    def get_message(self):
        """
        Lit un message depuis stdin selon le protocole Native Host
        
        Returns:
            dict|None: Message JSON décodé ou None si canal fermé
        """
        try:
            # Lecture de la longueur du message (4 bytes)
            raw_length = sys.stdin.buffer.read(4)
            if not raw_length:
                logging.info("Canal fermé par le navigateur")
                return None
            
            if len(raw_length) < 4:
                logging.warning("Message incomplet reçu")
                return None
            
            # Décodage de la longueur
            message_length = struct.unpack('@I', raw_length)[0]
            logging.debug(f"Longueur du message attendue : {message_length}")
            
            # Validation de la longueur
            if message_length > 1024 * 1024:  # 1MB max
                logging.error(f"Message trop volumineux : {message_length} bytes")
                return None
            
            # Lecture du contenu du message
            message_data = sys.stdin.buffer.read(message_length)
            if len(message_data) < message_length:
                logging.error("Message tronqué reçu")
                return None
            
            # Décodage JSON
            message_json = message_data.decode('utf-8')
            message = json.loads(message_json)
            
            logging.info(f"Message reçu : type={message.get('type', 'unknown')}, taille={message_length}")
            return message
            
        except json.JSONDecodeError as e:
            logging.error(f"Erreur de décodage JSON : {e}")
            return None
        except Exception as e:
            logging.error(f"Erreur lors de la lecture du message : {e}")
            return None
    
    def send_message(self, message_content):
        """
        Envoie un message à stdout selon le protocole Native Host
        
        Args:
            message_content (dict): Contenu du message à envoyer
        """
        try:
            # Encodage du message
            encoded_content = json.dumps(message_content, ensure_ascii=False).encode('utf-8')
            message_length = len(encoded_content)
            
            # Validation de la taille
            if message_length > 1024 * 1024:  # 1MB max
                logging.error(f"Message trop volumineux à envoyer : {message_length} bytes")
                return False
            
            # Envoi de la longueur puis du contenu
            length_bytes = struct.pack('@I', message_length)
            sys.stdout.buffer.write(length_bytes)
            sys.stdout.buffer.write(encoded_content)
            sys.stdout.buffer.flush()
            
            logging.info(f"Message envoyé : type={message_content.get('type', 'unknown')}, taille={message_length}")
            return True
            
        except Exception as e:
            logging.error(f"Erreur lors de l'envoi du message : {e}")
            return False
    
    def process_bookmarks(self, message):
        """
        Traite la synchronisation des favoris
        
        Args:
            message (dict): Message contenant les favoris de l'extension
        """
        try:
            # Support pour les deux formats : direct et avec type
            if 'bookmarks' in message:
                extension_bookmarks = message.get('bookmarks', [])
            else:
                # Format legacy - traiter le message entier comme bookmarks
                extension_bookmarks = message if isinstance(message, list) else []
            logging.info(f"Traitement de {len(extension_bookmarks)} favoris de l'extension")
            
            # Chargement des favoris locaux
            local_bookmarks = self._load_local_bookmarks()
            
            # Fusion des favoris (éviter les doublons par URL)
            merged_bookmarks_map = {}
            
            # Ajout des favoris locaux
            for bookmark in local_bookmarks:
                if 'url' in bookmark and bookmark['url']:
                    merged_bookmarks_map[bookmark['url']] = bookmark
            
            # Ajout/mise à jour avec les favoris de l'extension
            for bookmark in extension_bookmarks:
                if 'url' in bookmark and bookmark['url']:
                    # Préférer les données de l'extension (plus récentes)
                    merged_bookmarks_map[bookmark['url']] = bookmark
            
            synced_bookmarks = list(merged_bookmarks_map.values())
            
            logging.info(f"Fusion terminée : {len(local_bookmarks)} locaux + "
                        f"{len(extension_bookmarks)} extension = {len(synced_bookmarks)} uniques")
            
            # Sauvegarde des favoris fusionnés
            if self._save_local_bookmarks(synced_bookmarks):
                self.send_message({
                    'type': 'sync_response',
                    'status': 'success',
                    'bookmarks': synced_bookmarks,
                    'message': f'Synchronisation réussie : {len(synced_bookmarks)} favoris'
                })
            else:
                self.send_message({
                    'type': 'sync_response',
                    'status': 'error',
                    'message': 'Erreur lors de la sauvegarde des favoris'
                })
                
        except Exception as e:
            logging.error(f"Erreur lors du traitement des favoris : {e}")
            self.send_message({
                'type': 'sync_response',
                'status': 'error',
                'message': f'Erreur de traitement : {str(e)}'
            })
    
    def get_sync_status(self, message):
        """
        Retourne le statut de synchronisation
        
        Args:
            message (dict): Message de demande de statut
        """
        try:
            config = SyncMarkConfig.load_config()
            local_bookmarks = self._load_local_bookmarks()
            
            status_info = {
                'type': 'status_response',
                'status': 'success',
                'sync_enabled': config.get('enabled', False),
                'auto_sync': config.get('auto_sync', True),
                'sync_interval': config.get('sync_interval', 300),
                'local_bookmarks_count': len(local_bookmarks),
                'last_sync': self._get_last_sync_time()
            }
            
            self.send_message(status_info)
            
        except Exception as e:
            logging.error(f"Erreur lors de la récupération du statut : {e}")
            self.send_message({
                'type': 'status_response',
                'status': 'error',
                'message': str(e)
            })
    
    def handle_ping(self, message):
        """
        Répond à un ping de l'extension
        
        Args:
            message (dict): Message de ping
        """
        self.send_message({
            'type': 'pong',
            'status': 'success',
            'timestamp': message.get('timestamp', 0)
        })
    
    def _load_local_bookmarks(self):
        """
        Charge les favoris locaux depuis le fichier
        
        Returns:
            list: Liste des favoris locaux
        """
        if not os.path.exists(BOOKMARKS_FILE_PATH):
            return []
        
        try:
            with open(BOOKMARKS_FILE_PATH, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except (IOError, json.JSONDecodeError) as e:
            logging.error(f"Erreur lecture favoris locaux : {e}")
            return []
    
    def _save_local_bookmarks(self, bookmarks):
        """
        Sauvegarde les favoris locaux dans le fichier
        
        Args:
            bookmarks (list): Liste des favoris à sauvegarder
            
        Returns:
            bool: True si la sauvegarde a réussi
        """
        try:
            with open(BOOKMARKS_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(bookmarks, f, indent=4, ensure_ascii=False)
            logging.info(f"Favoris sauvegardés : {len(bookmarks)} éléments")
            return True
        except IOError as e:
            logging.error(f"Erreur sauvegarde favoris : {e}")
            return False
    
    def _get_last_sync_time(self):
        """
        Récupère l'horodatage de la dernière synchronisation
        
        Returns:
            int: Timestamp de la dernière sync ou 0
        """
        try:
            if os.path.exists(BOOKMARKS_FILE_PATH):
                return int(os.path.getmtime(BOOKMARKS_FILE_PATH))
            return 0
        except Exception:
            return 0
    
    def run_host(self):
        """
        Boucle principale du Native Host
        
        Écoute les messages de l'extension et les traite selon leur type.
        """
        logging.info("Native Host SyncMark démarré")
        self.running = True
        
        try:
            while self.running:
                message = self.get_message()
                
                if message is None:
                    logging.info("Fin de communication avec l'extension")
                    break
                
                # Vérification si la synchronisation est activée
                if not SyncMarkConfig.is_sync_enabled():
                    logging.info("Synchronisation désactivée par l'utilisateur")
                    self.send_message({
                        'type': 'sync_response',
                        'status': 'disabled',
                        'message': 'Synchronisation désactivée dans les paramètres'
                    })
                    continue
                
                # Traitement du message selon son type
                message_type = message.get('type', 'unknown')
                
                # Support pour les messages legacy sans type mais avec bookmarks
                if message_type == 'unknown' and 'bookmarks' in message:
                    message_type = 'sync_bookmarks'
                    logging.info("Message legacy détecté - conversion en sync_bookmarks")
                
                handler = self.message_handlers.get(message_type)
                
                if handler:
                    logging.info(f"Traitement du message de type : {message_type}")
                    handler(message)
                else:
                    logging.warning(f"Type de message non supporté : {message_type}")
                    self.send_message({
                        'type': 'error',
                        'status': 'error',
                        'message': f'Type de message non supporté : {message_type}'
                    })
                    
        except KeyboardInterrupt:
            logging.info("Arrêt du Native Host par l'utilisateur")
        except Exception as e:
            logging.error(f"Erreur fatale dans la boucle principale : {e}", exc_info=True)
        finally:
            self.stop()
    
    def stop(self):
        """Arrête le Native Host proprement"""
        logging.info("Arrêt du Native Host")
        self.running = False