#!/usr/bin/env python3
"""
Service Native Host SyncMark
===========================

Ce script maintient le native host en marche en permanence
pour permettre la communication avec l'extension.
"""

import sys
import json
import time
import logging
import subprocess
from pathlib import Path
import threading
import queue
import os

CURRENT_DIR = Path(__file__).parent.absolute()
PYTHON_SCRIPT = CURRENT_DIR / "syncmark_host.py"
LOG_FILE = CURRENT_DIR / "logs" / "service.log"

# S'assurer que le dossier de logs existe AVANT de configurer le logging
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)

class NativeHostService:
    """Service qui maintient le native host actif"""
    
    def __init__(self):
        self.running = False
        self.process = None
        self.restart_count = 0
        self.max_restarts = 5
        # Statistiques de connexion
        self.connection_stats = {
            'total_connections': 0,
            'browsers': {},
            'last_connection': None
        }
        
    def start_native_host(self):
        """Démarre le native host"""
        try:
            logging.info("Démarrage du native host...")
            
            cmd = [sys.executable, str(PYTHON_SCRIPT), "--host"]
            
            self.process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=str(CURRENT_DIR)
            )
            
            logging.info(f"Native host démarré avec PID: {self.process.pid}")
            return True
            
        except Exception as e:
            logging.error(f"Erreur lors du démarrage: {e}")
            return False
    
    def monitor_process(self):
        """Surveille le processus native host"""
        while self.running:
            if self.process is None or self.process.poll() is not None:
                if self.restart_count < self.max_restarts:
                    logging.warning(f"Native host arrêté, redémarrage... ({self.restart_count + 1}/{self.max_restarts})")
                    
                    if self.start_native_host():
                        self.restart_count += 1
                        time.sleep(2)  # Attendre avant de vérifier à nouveau
                    else:
                        logging.error("Impossible de redémarrer le native host")
                        break
                else:
                    logging.error("Trop de redémarrages, arrêt du service")
                    break
            else:
                time.sleep(5)  # Vérifier toutes les 5 secondes
    
    def start_service(self):
        """Démarre le service"""
        logging.info("🌐 Démarrage du service native host SyncMark MULTI-NAVIGATEURS")
        print("🌐 Service Multi-Navigateurs SyncMark démarré !")
        print("📊 Navigateurs supportés : Chrome, Edge, Firefox, Opera, Brave, Vivaldi")
        print("🔄 Le service accepte les connexions de tous les navigateurs...")
        self.running = True
        
        # Démarrer le native host initial
        if not self.start_native_host():
            logging.error("Impossible de démarrer le service")
            return False
        
        # Démarrer le thread de surveillance
        monitor_thread = threading.Thread(target=self.monitor_process, daemon=True)
        monitor_thread.start()
        
        try:
            # Boucle principale - attendre les interruptions
            while self.running:
                time.sleep(1)
                
        except KeyboardInterrupt:
            logging.info("Arrêt du service par l'utilisateur")
        
        finally:
            self.stop_service()
        
        return True
    
    def stop_service(self):
        """Arrête le service"""
        logging.info("Arrêt du service...")
        self.running = False
        
        if self.process and self.process.poll() is None:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        
        logging.info("Service arrêté")

def main():
    """Fonction principale"""
    print("🚀 Service Native Host SyncMark")
    print("=" * 40)
    
    if not PYTHON_SCRIPT.exists():
        print(f"❌ Script principal non trouvé: {PYTHON_SCRIPT}")
        return 1
    
    service = NativeHostService()
    
    print("🔄 Démarrage du service...")
    print("💡 Le native host sera maintenu actif en permanence")
    print("⚠️  Appuyez sur Ctrl+C pour arrêter le service")
    print("📋 Logs sauvegardés dans:", LOG_FILE)
    print()
    
    try:
        success = service.start_service()
        return 0 if success else 1
    except Exception as e:
        logging.error(f"Erreur fatale: {e}")
        print(f"❌ Erreur fatale: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())
