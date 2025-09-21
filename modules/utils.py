"""
Utilitaires Communs pour SyncMark
=================================

Ce module regroupe les fonctions utilitaires communes utilisées
par les différents composants de SyncMark :
- Validation des données
- Helpers de traitement
- Fonctions de sécurité
- Utilitaires de fichiers et système
"""

import os
import json
import hashlib
import logging
import time
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from logging.handlers import RotatingFileHandler
import sys


def validate_json_data(data: Any) -> tuple[bool, str]:
    """
    Valide que les données peuvent être sérialisées en JSON
    
    Args:
        data: Données à valider
        
    Returns:
        tuple: (bool, str) - (valide, message d'erreur si invalide)
    """
    try:
        json.dumps(data, ensure_ascii=False)
        return True, ""
    except (TypeError, ValueError) as e:
        return False, f"Données non sérialisables en JSON : {e}"


def sanitize_filename(filename: str) -> str:
    """
    Nettoie un nom de fichier en supprimant les caractères interdits
    
    Args:
        filename (str): Nom de fichier à nettoyer
        
    Returns:
        str: Nom de fichier nettoyé
    """
    # Caractères interdits dans les noms de fichiers Windows
    forbidden_chars = '<>:"/\\|?*'
    
    # Remplacement des caractères interdits
    clean_name = filename
    for char in forbidden_chars:
        clean_name = clean_name.replace(char, '_')
    
    # Suppression des espaces en début/fin
    clean_name = clean_name.strip()
    
    # Limitation de la longueur (255 caractères max sur Windows)
    if len(clean_name) > 255:
        name, ext = os.path.splitext(clean_name)
        max_name_length = 255 - len(ext)
        clean_name = name[:max_name_length] + ext
    
    return clean_name


def safe_json_load(file_path: str, default: Any = None) -> Any:
    """
    Charge un fichier JSON de manière sécurisée
    
    Args:
        file_path (str): Chemin vers le fichier JSON
        default: Valeur par défaut en cas d'erreur
        
    Returns:
        Any: Données chargées ou valeur par défaut
    """
    try:
        if not os.path.exists(file_path):
            return default
            
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
            
    except (json.JSONDecodeError, IOError, UnicodeDecodeError) as e:
        logging.error(f"Erreur lors du chargement de {file_path} : {e}")
        return default


def safe_json_save(data: Any, file_path: str, backup: bool = True) -> bool:
    """
    Sauvegarde des données JSON de manière sécurisée
    
    Args:
        data: Données à sauvegarder
        file_path (str): Chemin de destination
        backup (bool): Créer une sauvegarde avant écriture
        
    Returns:
        bool: True si succès, False sinon
    """
    try:
        # Validation des données
        is_valid, error_msg = validate_json_data(data)
        if not is_valid:
            logging.error(f"Données invalides pour {file_path} : {error_msg}")
            return False
        
        # Création du répertoire parent si nécessaire
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Sauvegarde du fichier existant
        if backup and os.path.exists(file_path):
            backup_path = f"{file_path}.backup"
            try:
                shutil.copy2(file_path, backup_path)
            except Exception as e:
                logging.warning(f"Impossible de créer la sauvegarde {backup_path} : {e}")
        
        # Écriture atomique via fichier temporaire
        temp_path = f"{file_path}.tmp"
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        # Remplacement atomique
        if os.path.exists(file_path):
            os.replace(temp_path, file_path)
        else:
            os.rename(temp_path, file_path)
        
        return True
        
    except Exception as e:
        logging.error(f"Erreur lors de la sauvegarde de {file_path} : {e}")
        # Nettoyage du fichier temporaire en cas d'erreur
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except:
            pass
        return False


def calculate_file_hash(file_path: str, algorithm: str = 'sha256') -> Optional[str]:
    """
    Calcule le hash d'un fichier
    
    Args:
        file_path (str): Chemin vers le fichier
        algorithm (str): Algorithme de hash ('md5', 'sha1', 'sha256')
        
    Returns:
        Optional[str]: Hash du fichier ou None en cas d'erreur
    """
    try:
        hash_obj = hashlib.new(algorithm)
        
        with open(file_path, 'rb') as f:
            # Lecture par chunks pour les gros fichiers
            for chunk in iter(lambda: f.read(4096), b""):
                hash_obj.update(chunk)
        
        return hash_obj.hexdigest()
        
    except Exception as e:
        logging.error(f"Erreur lors du calcul du hash de {file_path} : {e}")
        return None


def ensure_directory_exists(directory_path: str) -> bool:
    """
    S'assure qu'un répertoire existe, le crée si nécessaire
    
    Args:
        directory_path (str): Chemin du répertoire
        
    Returns:
        bool: True si le répertoire existe ou a été créé, False sinon
    """
    try:
        os.makedirs(directory_path, exist_ok=True)
        return True
    except Exception as e:
        logging.error(f"Impossible de créer le répertoire {directory_path} : {e}")
        return False


def get_file_size_human(file_path: str) -> str:
    """
    Retourne la taille d'un fichier dans un format lisible
    
    Args:
        file_path (str): Chemin vers le fichier
        
    Returns:
        str: Taille formatée (ex: "1.5 MB")
    """
    try:
        size = os.path.getsize(file_path)
        
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        
        return f"{size:.1f} PB"
        
    except Exception as e:
        logging.error(f"Erreur lors du calcul de la taille de {file_path} : {e}")
        return "Inconnue"


def format_timestamp(timestamp: Optional[float] = None, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Formate un timestamp en chaîne lisible
    
    Args:
        timestamp (Optional[float]): Timestamp Unix (None = maintenant)
        format_str (str): Format de sortie
        
    Returns:
        str: Timestamp formaté
    """
    try:
        if timestamp is None:
            timestamp = time.time()
        
        return datetime.fromtimestamp(timestamp).strftime(format_str)
        
    except Exception as e:
        logging.error(f"Erreur lors du formatage du timestamp {timestamp} : {e}")
        return "Date inconnue"


def cleanup_old_files(directory: str, max_age_days: int = 30, pattern: str = "*.backup") -> int:
    """
    Nettoie les anciens fichiers dans un répertoire
    
    Args:
        directory (str): Répertoire à nettoyer
        max_age_days (int): Âge maximum en jours
        pattern (str): Motif des fichiers à nettoyer
        
    Returns:
        int: Nombre de fichiers supprimés
    """
    try:
        if not os.path.exists(directory):
            return 0
        
        import glob
        current_time = time.time()
        max_age_seconds = max_age_days * 24 * 3600
        deleted_count = 0
        
        # Recherche des fichiers correspondant au motif
        search_pattern = os.path.join(directory, pattern)
        for file_path in glob.glob(search_pattern):
            try:
                file_age = current_time - os.path.getmtime(file_path)
                
                if file_age > max_age_seconds:
                    os.remove(file_path)
                    deleted_count += 1
                    logging.info(f"Fichier ancien supprimé : {file_path}")
                    
            except Exception as e:
                logging.warning(f"Impossible de supprimer {file_path} : {e}")
        
        return deleted_count
        
    except Exception as e:
        logging.error(f"Erreur lors du nettoyage de {directory} : {e}")
        return 0


def is_process_running(process_name: str) -> bool:
    """
    Vérifie si un processus est en cours d'exécution
    
    Args:
        process_name (str): Nom du processus (avec ou sans .exe)
        
    Returns:
        bool: True si le processus est en cours d'exécution
    """
    try:
        import psutil
        
        # Normalisation du nom du processus
        if not process_name.endswith('.exe'):
            process_name += '.exe'
        
        for proc in psutil.process_iter(['name']):
            try:
                if proc.info['name'].lower() == process_name.lower():
                    return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        return False
        
    except ImportError:
        # Fallback sans psutil (utilisation de tasklist sur Windows)
        try:
            import subprocess
            result = subprocess.run(
                ['tasklist', '/FI', f'IMAGENAME eq {process_name}'],
                capture_output=True,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            return process_name.lower() in result.stdout.lower()
        except Exception as e:
            logging.error(f"Erreur lors de la vérification du processus {process_name} : {e}")
            return False


def retry_operation(func, max_attempts: int = 3, delay: float = 1.0, exceptions: tuple = (Exception,)):
    """
    Décorateur pour réessayer une opération en cas d'échec
    
    Args:
        func: Fonction à exécuter
        max_attempts (int): Nombre maximum de tentatives
        delay (float): Délai entre les tentatives (secondes)
        exceptions (tuple): Types d'exceptions à capturer
        
    Returns:
        Résultat de la fonction ou lève la dernière exception
    """
    def wrapper(*args, **kwargs):
        last_exception = None
        
        for attempt in range(max_attempts):
            try:
                return func(*args, **kwargs)
            except exceptions as e:
                last_exception = e
                if attempt < max_attempts - 1:
                    logging.warning(f"Tentative {attempt + 1}/{max_attempts} échouée pour {func.__name__} : {e}")
                    time.sleep(delay)
                else:
                    logging.error(f"Toutes les tentatives échouées pour {func.__name__} : {e}")
        
        raise last_exception
    
    return wrapper


def deep_merge_dicts(dict1: Dict, dict2: Dict) -> Dict:
    """
    Fusionne récursivement deux dictionnaires
    
    Args:
        dict1 (Dict): Premier dictionnaire
        dict2 (Dict): Deuxième dictionnaire (prioritaire)
        
    Returns:
        Dict: Dictionnaire fusionné
    """
    result = dict1.copy()
    
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge_dicts(result[key], value)
        else:
            result[key] = value
    
    return result


def validate_url(url: str) -> bool:
    """
    Valide qu'une chaîne est une URL valide
    
    Args:
        url (str): URL à valider
        
    Returns:
        bool: True si l'URL est valide
    """
    try:
        from urllib.parse import urlparse
        
        parsed = urlparse(url)
        return all([parsed.scheme, parsed.netloc])
        
    except Exception:
        return False


def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    Tronque une chaîne si elle dépasse la longueur maximale
    
    Args:
        text (str): Texte à tronquer
        max_length (int): Longueur maximale
        suffix (str): Suffixe à ajouter si tronqué
        
    Returns:
        str: Texte tronqué si nécessaire
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix


def get_system_info() -> Dict[str, Any]:
    """
    Retourne des informations sur le système
    
    Returns:
        Dict: Informations système
    """
    import platform
    import sys
    
    try:
        info = {
            'platform': platform.platform(),
            'system': platform.system(),
            'release': platform.release(),
            'version': platform.version(),
            'machine': platform.machine(),
            'processor': platform.processor(),
            'python_version': sys.version,
            'python_executable': sys.executable,
            'working_directory': os.getcwd()
        }
        
        # Informations supplémentaires sur Windows
        if platform.system() == 'Windows':
            try:
                import winreg
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                                  r"SOFTWARE\Microsoft\Windows NT\CurrentVersion") as key:
                    info['windows_build'] = winreg.QueryValueEx(key, "CurrentBuild")[0]
                    info['windows_version'] = winreg.QueryValueEx(key, "ProductName")[0]
            except Exception:
                pass
        
        return info
        
    except Exception as e:
        logging.error(f"Erreur lors de la récupération des informations système : {e}")
        return {'error': str(e)}


def setup_logging():
    """
    Configure le logging pour l'application.

    Crée un logger qui écrit dans un fichier rotatif situé dans
    le dossier de données de l'application (%APPDATA%/SyncMark).
    """
    try:
        # Chemin du dossier de logs dans AppData
        app_data_dir = os.getenv('APPDATA')
        if not app_data_dir:
            # Fallback sur le répertoire de l'exécutable si APPDATA n'est pas défini
            app_data_dir = os.path.dirname(sys.executable)
            
        log_dir = os.path.join(app_data_dir, "SyncMark", "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "syncmark.log")

        # Création du handler pour le fichier de log
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=MAX_LOG_SIZE,
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)
        
        # Création du formatter
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(name)s - %(message)s')
        file_handler.setFormatter(formatter)

        # Ajout du handler au logger racine
        # C'est plus robuste que basicConfig si le logging a déjà été initialisé ailleurs
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.DEBUG)
        root_logger.addHandler(file_handler)
        
        # Optionnel: ajouter un handler pour la console si besoin de voir les logs en direct
        # stream_handler = logging.StreamHandler(sys.stderr)
        # stream_handler.setLevel(logging.INFO)
        # stream_handler.setFormatter(formatter)
        # root_logger.addHandler(stream_handler)

        logging.info("="*50)
        logging.info(f"Logging configuré. Fichier de log : {log_file}")
        logging.info("="*50)

    except Exception as e:
        # Si le logging échoue, on print l'erreur directement
        print(f"ERREUR CRITIQUE: Impossible de configurer le logging: {e}", file=sys.stderr)


# Constantes utilitaires
DEFAULT_ENCODING = 'utf-8'
MAX_LOG_SIZE = 10 * 1024 * 1024  # 10 MB
BACKUP_EXTENSIONS = ['.backup', '.bak', '.old']
TEMP_FILE_PREFIX = 'syncmark_temp_'