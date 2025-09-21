"""
SyncMark Unified Package
========================

Package modulaire pour SyncMark contenant tous les composants nécessaires
à la synchronisation des favoris entre Chrome et le système local.

Modules:
- config_manager: Gestion de la configuration et des constantes
- native_host: Communication avec l'extension Chrome via Native Host
- settings_ui: Interface utilisateur pour la configuration
- installer: Installation/désinstallation du Native Host
- utils: Fonctions utilitaires communes
"""

__version__ = "1.0.0"
__author__ = "SyncMark Team"

# Imports principaux pour faciliter l'utilisation du package
from .config_manager import SyncMarkConfig
from .native_host import NativeHostManager
from .settings_ui import SettingsUI
from .installer import NativeHostInstaller

__all__ = [
    'SyncMarkConfig',
    'NativeHostManager', 
    'SettingsUI',
    'NativeHostInstaller'
]