#!/usr/bin/env python3
"""
SyncMark - Application Refactorisée
===================================

Point d'entrée principal de l'application SyncMark refactorisée.
Utilise exclusivement les modules syncmark_uni pour éliminer
toute duplication de code.

Architecture modulaire optimisée :
- syncmark_uni.config_manager : Gestion de la configuration
- syncmark_uni.native_host : Communication avec Chrome
- syncmark_uni.settings_ui : Interface utilisateur
- syncmark_uni.installer : Installation du Native Host
- syncmark_uni.utils : Fonctions utilitaires
"""

import sys
import os
import argparse
import logging

# Ajout du répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Imports des modules SyncMark
try:
    from syncmark_uni.config_manager import SyncMarkConfig
    from syncmark_uni.native_host import NativeHostManager
    from syncmark_uni.settings_ui import SettingsUI
    from syncmark_uni.installer import NativeHostInstaller
    from syncmark_uni.utils import get_system_info, setup_logging
except ImportError as e:
    print(f"Erreur d'import des modules SyncMark : {e}")
    print("Assurez-vous que le package syncmark_uni est correctement installé.")
    sys.exit(1)

# Configuration du logging centralisée
setup_logging()


def main():
    """Point d'entrée principal de l'application"""
    parser = argparse.ArgumentParser(description='SyncMark - Synchronisation de favoris Chrome')
    parser.add_argument('--host', action='store_true', 
                       help='Démarre le Native Host pour communication avec Chrome')
    parser.add_argument('--gui', action='store_true', 
                       help='Lance l\'interface graphique de configuration')
    parser.add_argument('--install', action='store_true', 
                       help='Installe le Native Host dans Chrome')
    parser.add_argument('--uninstall', action='store_true', 
                       help='Désinstalle le Native Host de Chrome')
    parser.add_argument('--status', action='store_true', 
                       help='Affiche le statut de la synchronisation')
    parser.add_argument('--enable', action='store_true', 
                       help='Active la synchronisation')
    parser.add_argument('--disable', action='store_true', 
                       help='Désactive la synchronisation')
    
    args = parser.parse_args()
    
    # Si aucun argument, lance l'interface graphique par défaut
    if not any(vars(args).values()):
        args.gui = True
    
    try:
        # Gestion des commandes
        if args.install:
            print("Installation du Native Host...")
            installer = NativeHostInstaller()
            success, message = installer.install()
            if success:
                print(f"[OK] Installation réussie: {message}")
            else:
                print(f"[ERREUR] Échec de l'installation: {message}")
                return 1
        
        elif args.uninstall:
            print("Désinstallation du Native Host...")
            installer = NativeHostInstaller()
            success, message = installer.uninstall()
            if success:
                print(f"[OK] Désinstallation réussie: {message}")
            else:
                print(f"[ERREUR] Échec de la désinstallation: {message}")
                return 1
        
        elif args.status:
            enabled = SyncMarkConfig.is_sync_enabled()
            status = "activée" if enabled else "désactivée"
            print(f"Synchronisation : {status}")
            print(f"Informations système : {get_system_info()}")
        
        elif args.enable:
            if SyncMarkConfig.set_sync_enabled(True):
                print("[OK] Synchronisation activée")
            else:
                print("[ERREUR] Erreur lors de l'activation")
                return 1
        
        elif args.disable:
            if SyncMarkConfig.set_sync_enabled(False):
                print("[OK] Synchronisation désactivée")
            else:
                print("[ERREUR] Erreur lors de la désactivation")
                return 1
        
        elif args.host:
            print("Démarrage du Native Host...")
            host_manager = NativeHostManager()
            host_manager.run_host()
        
        elif args.gui:
            print("Lancement de l'interface graphique...")
            app = SettingsUI()
            app.run()
        
        return 0
        
    except KeyboardInterrupt:
        print("\n[ATTENTION] Interruption par l'utilisateur")
        return 0
    except Exception as e:
        logging.error(f"Erreur inattendue : {e}")
        print(f"[ERREUR] Erreur : {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
