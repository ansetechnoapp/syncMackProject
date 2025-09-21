"""
Installateur Native Host pour SyncMark
======================================

Ce module gère l'installation et la désinstallation du Native Host
pour permettre la communication entre l'extension Chrome et l'application.
"""

import os
import sys
import json
import logging
import winreg
import shutil
from pathlib import Path
from .config_manager import CHROME_MANIFEST_PATH, CHROME_REGISTRY_KEY


class NativeHostInstaller:
    """
    Gestionnaire d'installation du Native Host pour Chrome
    
    Gère l'installation, la désinstallation et la vérification
    des composants nécessaires à la communication avec Chrome.
    """
    
    def __init__(self, app_path=None):
        """
        Initialise l'installateur
        
        Args:
            app_path (str, optional): Chemin vers l'exécutable de l'application
        """
        self.app_path = app_path or self._get_current_app_path()
        self.manifest_path = CHROME_MANIFEST_PATH
        self.registry_key = CHROME_REGISTRY_KEY
        
        # Informations du manifest
        self.host_name = "com.syncmark.native_host"
        self.description = "SyncMark Native Host for Chrome Extension"
        self.allowed_origins = [
            "chrome-extension://your-extension-id-here/"
        ]
    
    def _get_current_app_path(self):
        """
        Détermine le chemin de l'application actuelle
        
        Returns:
            str: Chemin vers l'exécutable
        """
        import sys
        
        if getattr(sys, 'frozen', False):
            # Application compilée avec PyInstaller
            return sys.executable
        else:
            # Script Python en développement
            script_dir = os.path.dirname(os.path.abspath(__file__))
            return os.path.join(os.path.dirname(script_dir), "syncmark_unified.py")
    
    def check_prerequisites(self):
        """
        Vérifie les prérequis pour l'installation
        
        Returns:
            tuple: (bool, str) - (succès, message d'erreur si échec)
        """
        try:
            # Vérification des permissions d'écriture dans le registre
            try:
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Software", 0, winreg.KEY_WRITE):
                    pass
            except PermissionError:
                return False, "Permissions insuffisantes pour modifier le registre"
            
            # Vérification de l'existence du répertoire de destination
            manifest_dir = os.path.dirname(self.manifest_path)
            if not os.path.exists(manifest_dir):
                try:
                    os.makedirs(manifest_dir, exist_ok=True)
                except PermissionError:
                    return False, f"Impossible de créer le répertoire : {manifest_dir}"
            
            # Vérification de l'application
            if not os.path.exists(self.app_path):
                return False, f"Application non trouvée : {self.app_path}"
            
            return True, "Prérequis vérifiés avec succès"
            
        except Exception as e:
            logging.error(f"Erreur lors de la vérification des prérequis : {e}")
            return False, f"Erreur lors de la vérification : {e}"
    
    def create_manifest(self):
        """
        Crée le fichier manifest pour le Native Host
        
        Returns:
            bool: True si succès, False sinon
        """
        try:
            manifest_data = {
                "name": self.host_name,
                "description": self.description,
                "path": self.app_path.replace('\\', '/'),
                "type": "stdio",
                "allowed_origins": self.allowed_origins
            }
            
            # Création du répertoire si nécessaire
            manifest_dir = os.path.dirname(self.manifest_path)
            os.makedirs(manifest_dir, exist_ok=True)
            
            # Écriture du manifest
            with open(self.manifest_path, 'w', encoding='utf-8') as f:
                json.dump(manifest_data, f, indent=2, ensure_ascii=False)
            
            logging.info(f"Manifest créé : {self.manifest_path}")
            return True
            
        except Exception as e:
            logging.error(f"Erreur lors de la création du manifest : {e}")
            return False
    
    def register_native_host(self):
        """
        Enregistre le Native Host dans le registre Windows
        
        Returns:
            bool: True si succès, False sinon
        """
        try:
            # Ouverture/création de la clé de registre
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, self.registry_key) as key:
                # Enregistrement du chemin vers le manifest
                winreg.SetValueEx(
                    key,
                    self.host_name,
                    0,
                    winreg.REG_SZ,
                    self.manifest_path
                )
            
            logging.info(f"Native Host enregistré dans le registre : {self.host_name}")
            return True
            
        except Exception as e:
            logging.error(f"Erreur lors de l'enregistrement dans le registre : {e}")
            return False
    
    def install(self):
        """
        Effectue l'installation complète du Native Host
        
        Returns:
            tuple: (bool, str) - (succès, message)
        """
        try:
            # Vérification des prérequis
            prereq_ok, prereq_msg = self.check_prerequisites()
            if not prereq_ok:
                return False, f"Prérequis non satisfaits : {prereq_msg}"
            
            # Création du manifest
            if not self.create_manifest():
                return False, "Échec de la création du manifest"
            
            # Enregistrement dans le registre
            if not self.register_native_host():
                return False, "Échec de l'enregistrement dans le registre"
            
            logging.info("Installation du Native Host terminée avec succès")
            return True, "Installation réussie"
            
        except Exception as e:
            logging.error(f"Erreur lors de l'installation : {e}")
            return False, f"Erreur d'installation : {e}"
    
    def unregister_native_host(self):
        """
        Supprime l'enregistrement du Native Host du registre
        
        Returns:
            bool: True si succès, False sinon
        """
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, self.registry_key, 0, winreg.KEY_WRITE) as key:
                try:
                    winreg.DeleteValue(key, self.host_name)
                    logging.info(f"Native Host supprimé du registre : {self.host_name}")
                    return True
                except FileNotFoundError:
                    logging.warning(f"Clé de registre non trouvée : {self.host_name}")
                    return True  # Considéré comme un succès si déjà absent
                    
        except FileNotFoundError:
            logging.warning(f"Clé de registre parent non trouvée : {self.registry_key}")
            return True  # Considéré comme un succès si déjà absent
        except Exception as e:
            logging.error(f"Erreur lors de la suppression du registre : {e}")
            return False
    
    def remove_manifest(self):
        """
        Supprime le fichier manifest
        
        Returns:
            bool: True si succès, False sinon
        """
        try:
            if os.path.exists(self.manifest_path):
                os.remove(self.manifest_path)
                logging.info(f"Manifest supprimé : {self.manifest_path}")
            
            # Suppression du répertoire s'il est vide
            manifest_dir = os.path.dirname(self.manifest_path)
            try:
                if os.path.exists(manifest_dir) and not os.listdir(manifest_dir):
                    os.rmdir(manifest_dir)
                    logging.info(f"Répertoire supprimé : {manifest_dir}")
            except OSError:
                # Le répertoire n'est pas vide, on le laisse
                pass
            
            return True
            
        except Exception as e:
            logging.error(f"Erreur lors de la suppression du manifest : {e}")
            return False
    
    def uninstall(self):
        """
        Effectue la désinstallation complète du Native Host
        
        Returns:
            tuple: (bool, str) - (succès, message)
        """
        try:
            success = True
            messages = []
            
            # Suppression de l'enregistrement du registre
            if not self.unregister_native_host():
                success = False
                messages.append("Échec de la suppression du registre")
            
            # Suppression du manifest
            if not self.remove_manifest():
                success = False
                messages.append("Échec de la suppression du manifest")
            
            if success:
                logging.info("Désinstallation du Native Host terminée avec succès")
                return True, "Désinstallation réussie"
            else:
                error_msg = "; ".join(messages)
                logging.error(f"Désinstallation partielle : {error_msg}")
                return False, f"Désinstallation partielle : {error_msg}"
                
        except Exception as e:
            logging.error(f"Erreur lors de la désinstallation : {e}")
            return False, f"Erreur de désinstallation : {e}"
    
    def is_installed(self):
        """
        Vérifie si le Native Host est installé
        
        Returns:
            tuple: (bool, dict) - (installé, détails de l'installation)
        """
        details = {
            'manifest_exists': False,
            'registry_exists': False,
            'manifest_path': self.manifest_path,
            'app_path_valid': False
        }
        
        try:
            # Vérification du manifest
            details['manifest_exists'] = os.path.exists(self.manifest_path)
            
            # Vérification du registre
            try:
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, self.registry_key) as key:
                    try:
                        registry_path, _ = winreg.QueryValueEx(key, self.host_name)
                        details['registry_exists'] = True
                        details['registry_path'] = registry_path
                    except FileNotFoundError:
                        details['registry_exists'] = False
            except FileNotFoundError:
                details['registry_exists'] = False
            
            # Vérification de l'application
            details['app_path_valid'] = os.path.exists(self.app_path)
            details['current_app_path'] = self.app_path
            
            # Installation considérée comme complète si manifest et registre existent
            is_installed = details['manifest_exists'] and details['registry_exists']
            
            return is_installed, details
            
        except Exception as e:
            logging.error(f"Erreur lors de la vérification de l'installation : {e}")
            details['error'] = str(e)
            return False, details
    
    def repair_installation(self):
        """
        Répare une installation défectueuse
        
        Returns:
            tuple: (bool, str) - (succès, message)
        """
        try:
            is_installed, details = self.is_installed()
            
            if is_installed:
                return True, "Installation déjà complète"
            
            # Réparation sélective
            if not details['manifest_exists']:
                if not self.create_manifest():
                    return False, "Échec de la réparation du manifest"
            
            if not details['registry_exists']:
                if not self.register_native_host():
                    return False, "Échec de la réparation du registre"
            
            logging.info("Réparation de l'installation terminée")
            return True, "Installation réparée avec succès"
            
        except Exception as e:
            logging.error(f"Erreur lors de la réparation : {e}")
            return False, f"Erreur de réparation : {e}"
    
    def update_app_path(self, new_app_path):
        """
        Met à jour le chemin de l'application dans l'installation
        
        Args:
            new_app_path (str): Nouveau chemin vers l'application
            
        Returns:
            tuple: (bool, str) - (succès, message)
        """
        try:
            if not os.path.exists(new_app_path):
                return False, f"Nouveau chemin d'application invalide : {new_app_path}"
            
            old_app_path = self.app_path
            self.app_path = new_app_path
            
            # Recréation du manifest avec le nouveau chemin
            if not self.create_manifest():
                self.app_path = old_app_path  # Restauration
                return False, "Échec de la mise à jour du manifest"
            
            logging.info(f"Chemin d'application mis à jour : {old_app_path} -> {new_app_path}")
            return True, "Chemin d'application mis à jour avec succès"
            
        except Exception as e:
            logging.error(f"Erreur lors de la mise à jour du chemin : {e}")
            return False, f"Erreur de mise à jour : {e}"
    
    def get_installation_info(self):
        """
        Retourne des informations détaillées sur l'installation
        
        Returns:
            dict: Informations sur l'installation
        """
        is_installed, details = self.is_installed()
        
        info = {
            'installed': is_installed,
            'host_name': self.host_name,
            'description': self.description,
            'app_path': self.app_path,
            'manifest_path': self.manifest_path,
            'registry_key': self.registry_key,
            'details': details
        }
        
        return info