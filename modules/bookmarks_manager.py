"""
Bookmarks Manager pour SyncMark
===============================

Ce module gère la création et la vérification automatique du fichier
syncmark_bookmarks.json avec l'arborescence complète des dossiers.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any

# Import des constantes depuis config_manager
from .config_manager import SYNC_DIR, BOOKMARKS_FILE_PATH


class BookmarksManager:
    """
    Gestionnaire pour les fichiers de favoris SyncMark
    
    Assure la création automatique du fichier et de l'arborescence
    des dossiers si nécessaire.
    """
    
    DEFAULT_BOOKMARKS_STRUCTURE = {
        "version": "1.0",
        "created_at": None,
        "last_updated": None,
        "bookmarks": [],
        "folders": [],
        "metadata": {
            "total_bookmarks": 0,
            "total_folders": 0,
            "sync_enabled": True
        }
    }
    
    @staticmethod
    def ensure_bookmarks_file_exists() -> bool:
        """
        Vérifie l'existence du fichier syncmark_bookmarks.json
        et crée l'arborescence complète si nécessaire.
        
        Returns:
            bool: True si le fichier existe ou a été créé avec succès
        """
        try:
            # Création du répertoire parent si nécessaire
            os.makedirs(SYNC_DIR, exist_ok=True)
            logging.info(f"Répertoire de synchronisation vérifié : {SYNC_DIR}")
            
            # Vérification de l'existence du fichier
            if not os.path.exists(BOOKMARKS_FILE_PATH):
                BookmarksManager._create_default_bookmarks_file()
                logging.info(f"Fichier de favoris créé : {BOOKMARKS_FILE_PATH}")
                return True
            else:
                logging.info(f"Fichier de favoris existant trouvé : {BOOKMARKS_FILE_PATH}")
                return True
                
        except Exception as e:
            logging.error(f"Erreur lors de la vérification du fichier de favoris : {e}")
            return False
    
    @staticmethod
    def _create_default_bookmarks_file() -> None:
        """Crée le fichier de favoris avec la structure par défaut"""
        from datetime import datetime
        
        default_data = BookmarksManager.DEFAULT_BOOKMARKS_STRUCTURE.copy()
        current_time = datetime.now().isoformat()
        default_data["created_at"] = current_time
        default_data["last_updated"] = current_time
        
        try:
            with open(BOOKMARKS_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(default_data, f, indent=4, ensure_ascii=False)
            logging.info("Fichier de favoris créé avec la structure par défaut")
        except Exception as e:
            logging.error(f"Erreur lors de la création du fichier de favoris : {e}")
            raise
    
    @staticmethod
    def load_bookmarks() -> Dict[str, Any]:
        """
        Charge les favoris depuis le fichier
        
        Returns:
            dict: Structure des favoris ou structure par défaut en cas d'erreur
        """
        try:
            # Assurer que le fichier existe
            if not BookmarksManager.ensure_bookmarks_file_exists():
                return BookmarksManager.DEFAULT_BOOKMARKS_STRUCTURE.copy()
            
            with open(BOOKMARKS_FILE_PATH, 'r', encoding='utf-8') as f:
                bookmarks_data = json.load(f)
            
            # Validation de la structure
            if BookmarksManager._validate_bookmarks_structure(bookmarks_data):
                return bookmarks_data
            else:
                logging.warning("Structure de favoris invalide, utilisation de la structure par défaut")
                return BookmarksManager.DEFAULT_BOOKMARKS_STRUCTURE.copy()
                
        except Exception as e:
            logging.error(f"Erreur lors du chargement des favoris : {e}")
            return BookmarksManager.DEFAULT_BOOKMARKS_STRUCTURE.copy()
    
    @staticmethod
    def save_bookmarks(bookmarks_data: Dict[str, Any]) -> bool:
        """
        Sauvegarde les favoris dans le fichier
        
        Args:
            bookmarks_data: Structure des favoris à sauvegarder
            
        Returns:
            bool: True si la sauvegarde a réussi
        """
        try:
            # Assurer que le répertoire existe
            os.makedirs(SYNC_DIR, exist_ok=True)
            
            # Mise à jour du timestamp
            from datetime import datetime
            bookmarks_data["last_updated"] = datetime.now().isoformat()
            
            # Mise à jour des métadonnées
            if "metadata" in bookmarks_data:
                bookmarks_data["metadata"]["total_bookmarks"] = len(bookmarks_data.get("bookmarks", []))
                bookmarks_data["metadata"]["total_folders"] = len(bookmarks_data.get("folders", []))
            
            with open(BOOKMARKS_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(bookmarks_data, f, indent=4, ensure_ascii=False)
            
            logging.info("Favoris sauvegardés avec succès")
            return True
            
        except KeyboardInterrupt:
            logging.warning("Sauvegarde interrompue par l'utilisateur")
            return False
        except Exception as e:
            logging.error(f"Erreur lors de la sauvegarde des favoris : {e}")
            return False
    
    @staticmethod
    def _validate_bookmarks_structure(data: Dict[str, Any]) -> bool:
        """
        Valide la structure du fichier de favoris
        
        Args:
            data: Données à valider
            
        Returns:
            bool: True si la structure est valide
        """
        required_keys = ["version", "bookmarks", "folders", "metadata"]
        
        try:
            # Vérification des clés obligatoires
            for key in required_keys:
                if key not in data:
                    logging.warning(f"Clé manquante dans la structure des favoris : {key}")
                    return False
            
            # Vérification des types
            if not isinstance(data["bookmarks"], list):
                logging.warning("Le champ 'bookmarks' doit être une liste")
                return False
            
            if not isinstance(data["folders"], list):
                logging.warning("Le champ 'folders' doit être une liste")
                return False
            
            if not isinstance(data["metadata"], dict):
                logging.warning("Le champ 'metadata' doit être un dictionnaire")
                return False
            
            return True
            
        except Exception as e:
            logging.error(f"Erreur lors de la validation de la structure : {e}")
            return False
    
    @staticmethod
    def get_file_info() -> Dict[str, Any]:
        """
        Retourne les informations sur le fichier de favoris
        
        Returns:
            dict: Informations sur le fichier (existence, taille, etc.)
        """
        info = {
            "file_path": BOOKMARKS_FILE_PATH,
            "directory_path": SYNC_DIR,
            "exists": False,
            "size": 0,
            "readable": False,
            "writable": False
        }
        
        try:
            # Vérification de l'existence
            info["exists"] = os.path.exists(BOOKMARKS_FILE_PATH)
            
            if info["exists"]:
                # Taille du fichier
                info["size"] = os.path.getsize(BOOKMARKS_FILE_PATH)
                
                # Permissions
                info["readable"] = os.access(BOOKMARKS_FILE_PATH, os.R_OK)
                info["writable"] = os.access(BOOKMARKS_FILE_PATH, os.W_OK)
            
            # Vérification du répertoire parent
            info["directory_exists"] = os.path.exists(SYNC_DIR)
            info["directory_writable"] = os.access(SYNC_DIR, os.W_OK) if info["directory_exists"] else False
            
        except Exception as e:
            logging.error(f"Erreur lors de la récupération des informations du fichier : {e}")
        
        return info