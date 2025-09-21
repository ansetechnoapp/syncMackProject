"""
Configuration Manager pour SyncMark
===================================

Ce module gère la configuration centralisée de SyncMark, incluant :
- Les constantes de chemins et fichiers
- La classe SyncMarkConfig pour la gestion des paramètres
- La validation des configurations
- La configuration du logging
"""

import os
import json
import logging
from pathlib import Path

# --- Constantes de chemins ---
HOME_DIR = os.path.expanduser("~")
SYNC_DIR = os.path.join(HOME_DIR, 'Documents', 'SyncMark')
CONFIG_FILE = os.path.join(SYNC_DIR, 'config.json')
LOG_FILE = os.path.join(SYNC_DIR, 'syncmark_unified.log')
BOOKMARKS_FILE_PATH = os.path.join(SYNC_DIR, 'syncmark_bookmarks.json')

# --- Constantes Chrome ---
CHROME_MANIFEST_PATH = os.path.join(HOME_DIR, 'Documents', 'SyncMark', 'native_host_manifest.json')
CHROME_REGISTRY_KEY = r"SOFTWARE\Google\Chrome\NativeMessagingHosts\com.syncmark.host"
CHROME_EXTENSION_ID = "com.syncmark.extension"

# Création du répertoire de synchronisation
os.makedirs(SYNC_DIR, exist_ok=True)


def setup_logging():
    """Configure le système de logging pour SyncMark"""
    logging.basicConfig(
        filename=LOG_FILE,
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        filemode='a'
    )
    
    # Ajout d'un handler pour la console en mode debug
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)
    formatter = logging.Formatter('%(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    
    logger = logging.getLogger()
    if not any(isinstance(h, logging.StreamHandler) for h in logger.handlers):
        logger.addHandler(console_handler)


class SyncMarkConfig:
    """
    Gestionnaire de configuration centralisé pour SyncMark
    
    Gère la lecture, l'écriture et la validation des paramètres
    de configuration de l'application.
    """
    
    DEFAULT_CONFIG = {
        'enabled': True,
        'auto_sync': True,
        'sync_interval': 300,  # 5 minutes
        'max_bookmarks': 10000,
        'backup_enabled': True
    }
    
    @staticmethod
    def _ensure_config_exists():
        """Assure que le fichier de configuration existe avec les valeurs par défaut"""
        if not os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                    json.dump(SyncMarkConfig.DEFAULT_CONFIG, f, indent=4)
                logging.info("Fichier de configuration créé avec les valeurs par défaut")
            except Exception as e:
                logging.error(f"Erreur lors de la création du fichier de configuration : {e}")
                raise
    
    @staticmethod
    def load_config():
        """
        Charge la configuration complète depuis le fichier
        
        Returns:
            dict: Configuration complète avec valeurs par défaut si nécessaire
        """
        try:
            SyncMarkConfig._ensure_config_exists()
            
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Fusion avec les valeurs par défaut pour les clés manquantes
            merged_config = SyncMarkConfig.DEFAULT_CONFIG.copy()
            merged_config.update(config)
            
            return merged_config
            
        except Exception as e:
            logging.error(f"Erreur lors de la lecture de la configuration : {e}")
            return SyncMarkConfig.DEFAULT_CONFIG.copy()
    
    @staticmethod
    def save_config(config):
        """
        Sauvegarde la configuration dans le fichier
        
        Args:
            config (dict): Configuration à sauvegarder
            
        Returns:
            bool: True si la sauvegarde a réussi, False sinon
        """
        try:
            # Validation de base
            if not isinstance(config, dict):
                raise ValueError("La configuration doit être un dictionnaire")
            
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=4, ensure_ascii=False)
            
            logging.info("Configuration sauvegardée avec succès")
            return True
            
        except Exception as e:
            logging.error(f"Erreur lors de la sauvegarde de la configuration : {e}")
            return False
    
    @staticmethod
    def is_sync_enabled():
        """
        Vérifie si la synchronisation est activée
        
        Returns:
            bool: True si la synchronisation est activée, False sinon
        """
        try:
            config = SyncMarkConfig.load_config()
            return config.get('enabled', False)
        except Exception as e:
            logging.error(f"Erreur lors de la vérification de l'état de synchronisation : {e}")
            return False
    
    @staticmethod
    def set_sync_enabled(enabled):
        """
        Active ou désactive la synchronisation
        
        Args:
            enabled (bool): True pour activer, False pour désactiver
            
        Returns:
            bool: True si la modification a réussi, False sinon
        """
        try:
            config = SyncMarkConfig.load_config()
            config['enabled'] = bool(enabled)
            return SyncMarkConfig.save_config(config)
        except Exception as e:
            logging.error(f"Erreur lors de la modification de l'état de synchronisation : {e}")
            return False
    
    @staticmethod
    def get_sync_interval():
        """
        Récupère l'intervalle de synchronisation en secondes
        
        Returns:
            int: Intervalle en secondes
        """
        config = SyncMarkConfig.load_config()
        return config.get('sync_interval', 300)
    
    @staticmethod
    def set_sync_interval(interval):
        """
        Définit l'intervalle de synchronisation
        
        Args:
            interval (int): Intervalle en secondes (minimum 60)
            
        Returns:
            bool: True si la modification a réussi, False sinon
        """
        try:
            if not isinstance(interval, int) or interval < 60:
                raise ValueError("L'intervalle doit être un entier >= 60 secondes")
            
            config = SyncMarkConfig.load_config()
            config['sync_interval'] = interval
            return SyncMarkConfig.save_config(config)
        except Exception as e:
            logging.error(f"Erreur lors de la modification de l'intervalle : {e}")
            return False
    
    @staticmethod
    def validate_config(config):
        """
        Valide une configuration
        
        Args:
            config (dict): Configuration à valider
            
        Returns:
            tuple: (is_valid, error_message)
        """
        try:
            if not isinstance(config, dict):
                return False, "La configuration doit être un dictionnaire"
            
            # Validation des types
            if 'enabled' in config and not isinstance(config['enabled'], bool):
                return False, "'enabled' doit être un booléen"
            
            if 'sync_interval' in config:
                if not isinstance(config['sync_interval'], int) or config['sync_interval'] < 60:
                    return False, "'sync_interval' doit être un entier >= 60"
            
            if 'max_bookmarks' in config:
                if not isinstance(config['max_bookmarks'], int) or config['max_bookmarks'] < 1:
                    return False, "'max_bookmarks' doit être un entier > 0"
            
            return True, "Configuration valide"
            
        except Exception as e:
            return False, f"Erreur de validation : {e}"


# Initialisation du logging au chargement du module
setup_logging()