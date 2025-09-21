#!/usr/bin/env python3
"""
Script de Test pour la Communication SyncMark
==============================================

Ce script teste la communication entre l'extension et le native host
de manière interactive pour identifier les problèmes.
"""

import sys
import json
import struct
import subprocess
from pathlib import Path

CURRENT_DIR = Path(__file__).parent.absolute()
# Utiliser le script principal situé dans SyncMark_Helpers/syncmark_unified.py
PYTHON_SCRIPT = CURRENT_DIR.parent / "SyncMark_Helpers" / "syncmark_unified.py"

def send_test_message():
    """Envoie un message de test au native host"""
    print("🧪 Test de communication avec le native host")
    print("=" * 50)
    
    # Message de test identique à celui envoyé par l'extension
    test_message = {
        "type": "sync_bookmarks",
        "bookmarks": [
            {
                "id": "0",
                "parentId": "",
                "title": "",
                "children": [
                    {
                        "id": "1",
                        "parentId": "0",
                        "title": "Barre de favoris",
                        "children": [
                            {
                                "id": "test1",
                                "parentId": "1",
                                "title": "Test Bookmark 1",
                                "url": "https://example.com"
                            },
                            {
                                "id": "test2", 
                                "parentId": "1",
                                "title": "Test Bookmark 2",
                                "url": "https://google.com"
                            }
                        ]
                    }
                ]
            }
        ]
    }
    
    try:
        # Lancer le native host
        print("🚀 Lancement du native host...")
        process = subprocess.Popen([
            sys.executable, str(PYTHON_SCRIPT), "--host"
        ], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Encoder le message selon le protocole Chrome Native Messaging
        message_json = json.dumps(test_message).encode('utf-8')
        message_length = len(message_json)
        length_bytes = struct.pack('@I', message_length)
        
        print(f"📤 Envoi du message (longueur: {message_length} bytes)")
        print(f"📋 Message: {json.dumps(test_message, indent=2)}")
        
        # Envoyer le message
        process.stdin.write(length_bytes)
        process.stdin.write(message_json)
        process.stdin.close()
        
        # Lire la réponse
        print("\n⏳ Attente de la réponse...")
        
        # Lire la longueur de la réponse
        response_length_bytes = process.stdout.read(4)
        if not response_length_bytes:
            print("❌ Aucune réponse reçue")
            stderr_output = process.stderr.read().decode('utf-8')
            if stderr_output:
                print(f"❌ Erreur: {stderr_output}")
            return False
            
        response_length = struct.unpack('@I', response_length_bytes)[0]
        print(f"📥 Réponse attendue (longueur: {response_length} bytes)")
        
        # Lire la réponse
        response_data = process.stdout.read(response_length)
        if len(response_data) < response_length:
            print("❌ Réponse tronquée")
            return False
            
        response_json = response_data.decode('utf-8')
        response = json.loads(response_json)
        
        print("✅ Réponse reçue:")
        print(json.dumps(response, indent=2, ensure_ascii=False))
        
        # Vérifier le statut de la réponse
        if response.get('status') == 'success':
            print("\n🎉 Test de communication réussi !")
            return True
        else:
            print(f"\n⚠️ Erreur dans la réponse: {response.get('message', 'Erreur inconnue')}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        return False
    finally:
        # S'assurer que le processus est terminé
        if 'process' in locals():
            process.terminate()

def test_ping():
    """Test simple avec un ping"""
    print("🏓 Test de ping...")
    
    ping_message = {
        "type": "ping",
        "timestamp": 1234567890
    }
    
    try:
        process = subprocess.Popen([
            sys.executable, str(PYTHON_SCRIPT), "--host"
        ], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        message_json = json.dumps(ping_message).encode('utf-8')
        message_length = len(message_json)
        length_bytes = struct.pack('@I', message_length)
        
        process.stdin.write(length_bytes)
        process.stdin.write(message_json)
        process.stdin.close()
        
        # Lire la réponse
        response_length_bytes = process.stdout.read(4)
        if response_length_bytes:
            response_length = struct.unpack('@I', response_length_bytes)[0]
            response_data = process.stdout.read(response_length)
            response = json.loads(response_data.decode('utf-8'))
            
            if response.get('type') == 'pong':
                print("✅ Ping réussi !")
                return True
            
        print("❌ Ping échoué")
        return False
        
    except Exception as e:
        print(f"❌ Erreur ping: {e}")
        return False
    finally:
        if 'process' in locals():
            process.terminate()

def main():
    """Fonction principale de test"""
    print("🧪 SyncMark - Test de Communication")
    print("=" * 50)
    
    # Vérifier que le script principal existe
    if not PYTHON_SCRIPT.exists():
        print(f"❌ Script principal non trouvé: {PYTHON_SCRIPT}")
        return 1
    
    # Test 1: Ping simple
    print("\n1️⃣ Test de ping...")
    if test_ping():
        print("✅ Communication de base: OK")
    else:
        print("❌ Communication de base: ÉCHEC")
        return 1
    
    # Test 2: Message complet
    print("\n2️⃣ Test de synchronisation...")
    if send_test_message():
        print("✅ Test de synchronisation: OK")
        print("\n🎉 Tous les tests sont passés avec succès !")
        print("\n📋 L'extension devrait maintenant pouvoir communiquer avec le programme.")
        return 0
    else:
        print("❌ Test de synchronisation: ÉCHEC")
        return 1

if __name__ == '__main__':
    sys.exit(main())
