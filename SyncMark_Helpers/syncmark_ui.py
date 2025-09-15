import tkinter as tk
from tkinter import messagebox
import json
import os

# --- Configuration ---
# L'interface utilise les mêmes chemins que le démon pour rester synchronisée.
HOME_DIR = os.path.expanduser("~")
SYNC_DIR = os.path.join(HOME_DIR, 'Documents', 'SyncMark')
CONFIG_FILE = os.path.join(SYNC_DIR, 'config.json')

class App:
    def __init__(self, root):
        self.root = root
        self.root.title("Paramètres SyncMark")
        
        # Centre la fenêtre
        window_width = 350
        window_height = 150
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        center_x = int(screen_width/2 - window_width / 2)
        center_y = int(screen_height/2 - window_height / 2)
        self.root.geometry(f'{window_width}x{window_height}+{center_x}+{center_y}')
        self.root.resizable(False, False)

        # Variable pour la case à cocher
        self.sync_enabled = tk.BooleanVar()

        # Charger l'état actuel
        self.load_config()

        # Création des widgets
        self.create_widgets()

    def load_config(self):
        """Charge l'état de la configuration depuis le fichier JSON."""
        try:
            # S'assurer que le répertoire existe
            os.makedirs(SYNC_DIR, exist_ok=True)
            if not os.path.exists(CONFIG_FILE):
                # Fichier de config par défaut si inexistant
                with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                    json.dump({'enabled': True}, f)
                self.sync_enabled.set(True)
            else:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    self.sync_enabled.set(config.get('enabled', True))
        except Exception as e:
            messagebox.showerror("Erreur", f"Impossible de charger la configuration :\n{e}")
            self.sync_enabled.set(False)

    def save_config(self):
        """Sauvegarde l'état actuel dans le fichier de configuration JSON."""
        try:
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                config = {'enabled': self.sync_enabled.get()}
                json.dump(config, f, indent=4)
            # Pas besoin de message de succès pour ne pas déranger l'utilisateur
        except Exception as e:
            messagebox.showerror("Erreur", f"Impossible de sauvegarder la configuration :\n{e}")
    
    def create_widgets(self):
        """Crée et place les éléments de l'interface."""
        main_frame = tk.Frame(self.root, padx=20, pady=20)
        main_frame.pack(expand=True, fill=tk.BOTH)

        label = tk.Label(
            main_frame, 
            text="Contrôlez la synchronisation de vos favoris.",
            wraplength=300
        )
        label.pack(pady=(0, 10))
        
        checkbox = tk.Checkbutton(
            main_frame, 
            text="Activer la synchronisation en arrière-plan", 
            variable=self.sync_enabled,
            command=self.save_config, # Sauvegarde dès que l'état change
            font=('Helvetica', 10, 'bold')
        )
        checkbox.pack(pady=10)

if __name__ == "__main__":
    root = tk.Tk()
    app = App(root)
    root.mainloop()
