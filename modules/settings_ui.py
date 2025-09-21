"""
Interface Utilisateur pour SyncMark
===================================

Ce module fournit l'interface graphique de configuration pour SyncMark :
- Interface Tkinter pour les paramètres utilisateur
- Gestion des événements et interactions
- Validation des saisies utilisateur
- Sauvegarde automatique des configurations
"""

import tkinter as tk
from tkinter import messagebox, ttk
import logging
from .config_manager import SyncMarkConfig


class SettingsUI:
    """
    Interface graphique de configuration pour SyncMark
    
    Fournit une interface utilisateur intuitive pour configurer
    les paramètres de synchronisation et les préférences.
    """
    
    def __init__(self, root=None):
        """
        Initialise l'interface utilisateur
        
        Args:
            root (tk.Tk, optional): Fenêtre racine existante. Si None, crée une nouvelle fenêtre.
        """
        if root is None:
            self.root = tk.Tk()
            self.own_root = True
        else:
            self.root = root
            self.own_root = False
            
        self.setup_window()
        self.init_variables()
        self.load_config()
        self.create_widgets()
        
        # Gestionnaires d'événements
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
    
    def setup_window(self):
        """Configure les propriétés de la fenêtre principale"""
        self.root.title("SyncMark - Paramètres de Synchronisation")
        
        # Dimensions et centrage
        window_width = 500
        window_height = 400
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        center_x = int(screen_width/2 - window_width/2)
        center_y = int(screen_height/2 - window_height/2)
        
        self.root.geometry(f'{window_width}x{window_height}+{center_x}+{center_y}')
        self.root.resizable(True, False)
        self.root.minsize(450, 400)
        
        # Style et icône
        try:
            # Tentative de définir une icône (optionnel)
            pass
        except:
            pass
    
    def init_variables(self):
        """Initialise les variables Tkinter pour les contrôles"""
        self.sync_enabled = tk.BooleanVar()
        self.auto_sync = tk.BooleanVar()
        self.sync_interval = tk.IntVar()
        self.max_bookmarks = tk.IntVar()
        self.backup_enabled = tk.BooleanVar()
        
        # Variables pour les statistiques
        self.stats_bookmarks_count = tk.StringVar(value="0")
        self.stats_last_sync = tk.StringVar(value="Jamais")
    
    def load_config(self):
        """Charge la configuration actuelle dans l'interface"""
        try:
            config = SyncMarkConfig.load_config()
            
            self.sync_enabled.set(config.get('enabled', True))
            self.auto_sync.set(config.get('auto_sync', True))
            self.sync_interval.set(config.get('sync_interval', 300))
            self.max_bookmarks.set(config.get('max_bookmarks', 10000))
            self.backup_enabled.set(config.get('backup_enabled', True))
            
            self.update_statistics()
            
        except Exception as e:
            logging.error(f"Erreur lors du chargement de la configuration : {e}")
            messagebox.showerror("Erreur", f"Impossible de charger la configuration :\n{e}")
            # Valeurs par défaut en cas d'erreur
            self.sync_enabled.set(True)
            self.auto_sync.set(True)
            self.sync_interval.set(300)
            self.max_bookmarks.set(10000)
            self.backup_enabled.set(True)
    
    def save_config(self):
        """Sauvegarde la configuration actuelle"""
        try:
            config = {
                'enabled': self.sync_enabled.get(),
                'auto_sync': self.auto_sync.get(),
                'sync_interval': self.sync_interval.get(),
                'max_bookmarks': self.max_bookmarks.get(),
                'backup_enabled': self.backup_enabled.get()
            }
            
            # Validation
            is_valid, error_msg = SyncMarkConfig.validate_config(config)
            if not is_valid:
                messagebox.showerror("Configuration invalide", error_msg)
                return False
            
            # Sauvegarde
            if SyncMarkConfig.save_config(config):
                logging.info("Configuration sauvegardée depuis l'interface utilisateur")
                self.show_status("Configuration sauvegardée avec succès", "success")
                return True
            else:
                messagebox.showerror("Erreur", "Impossible de sauvegarder la configuration")
                return False
                
        except Exception as e:
            logging.error(f"Erreur lors de la sauvegarde : {e}")
            messagebox.showerror("Erreur", f"Erreur lors de la sauvegarde :\n{e}")
            return False
    
    def on_sync_enabled_changed(self):
        """Gestionnaire pour le changement d'état de la synchronisation"""
        enabled = self.sync_enabled.get()
        
        # Activation/désactivation des contrôles dépendants
        state = tk.NORMAL if enabled else tk.DISABLED
        
        try:
            self.auto_sync_check.config(state=state)
            self.interval_scale.config(state=state)
            self.max_bookmarks_entry.config(state=state)
            self.backup_check.config(state=state)
        except AttributeError:
            # Les widgets ne sont pas encore créés
            pass
        
        # Sauvegarde automatique
        self.save_config()
    
    def on_interval_changed(self, value):
        """
        Gestionnaire pour le changement d'intervalle de synchronisation
        
        Args:
            value (str): Nouvelle valeur de l'intervalle
        """
        try:
            interval = int(float(value))
            if interval < 60:
                self.sync_interval.set(60)
            self.interval_label.config(text=f"Intervalle de synchronisation : {self.sync_interval.get()}s")
        except ValueError:
            pass
    
    def update_statistics(self):
        """Met à jour les statistiques affichées"""
        try:
            from .config_manager import BOOKMARKS_FILE_PATH
            import os
            import json
            
            # Nombre de favoris
            if os.path.exists(BOOKMARKS_FILE_PATH):
                try:
                    with open(BOOKMARKS_FILE_PATH, 'r', encoding='utf-8') as f:
                        bookmarks = json.load(f)
                        self.stats_bookmarks_count.set(str(len(bookmarks)))
                except:
                    self.stats_bookmarks_count.set("Erreur")
                
                # Dernière synchronisation
                try:
                    import time
                    last_sync = os.path.getmtime(BOOKMARKS_FILE_PATH)
                    last_sync_str = time.strftime("%d/%m/%Y %H:%M", time.localtime(last_sync))
                    self.stats_last_sync.set(last_sync_str)
                except:
                    self.stats_last_sync.set("Inconnue")
            else:
                self.stats_bookmarks_count.set("0")
                self.stats_last_sync.set("Jamais")
                
        except Exception as e:
            logging.error(f"Erreur lors de la mise à jour des statistiques : {e}")
    
    def show_status(self, message, status_type="info"):
        """
        Affiche un message de statut temporaire
        
        Args:
            message (str): Message à afficher
            status_type (str): Type de message ('info', 'success', 'error')
        """
        try:
            color = {
                'info': 'blue',
                'success': 'green',
                'error': 'red'
            }.get(status_type, 'black')
            
            self.status_label.config(text=message, fg=color)
            
            # Effacer le message après 3 secondes
            self.root.after(3000, lambda: self.status_label.config(text=""))
            
        except AttributeError:
            # Le label de statut n'existe pas encore
            pass
    
    def create_widgets(self):
        """Crée tous les widgets de l'interface"""
        # Frame principal avec padding
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configuration du grid
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Titre
        title_label = ttk.Label(
            main_frame,
            text="SyncMark - Configuration",
            font=('Helvetica', 16, 'bold')
        )
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))
        
        # Section Synchronisation
        sync_frame = ttk.LabelFrame(main_frame, text="Paramètres de Synchronisation", padding="10")
        sync_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 15))
        sync_frame.columnconfigure(1, weight=1)
        
        # Activation de la synchronisation
        self.sync_check = ttk.Checkbutton(
            sync_frame,
            text="Activer la synchronisation des favoris",
            variable=self.sync_enabled,
            command=self.on_sync_enabled_changed
        )
        self.sync_check.grid(row=0, column=0, columnspan=2, sticky=tk.W, pady=(0, 10))
        
        # Synchronisation automatique
        self.auto_sync_check = ttk.Checkbutton(
            sync_frame,
            text="Synchronisation automatique",
            variable=self.auto_sync,
            command=self.save_config
        )
        self.auto_sync_check.grid(row=1, column=0, columnspan=2, sticky=tk.W, pady=(0, 10))
        
        # Intervalle de synchronisation
        self.interval_label = ttk.Label(
            sync_frame,
            text=f"Intervalle de synchronisation : {self.sync_interval.get()}s"
        )
        self.interval_label.grid(row=2, column=0, columnspan=2, sticky=tk.W, pady=(0, 5))
        
        self.interval_scale = ttk.Scale(
            sync_frame,
            from_=60,
            to=3600,
            variable=self.sync_interval,
            orient=tk.HORIZONTAL,
            command=self.on_interval_changed
        )
        self.interval_scale.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Section Avancée
        advanced_frame = ttk.LabelFrame(main_frame, text="Paramètres Avancés", padding="10")
        advanced_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 15))
        advanced_frame.columnconfigure(1, weight=1)
        
        # Nombre maximum de favoris
        ttk.Label(advanced_frame, text="Nombre maximum de favoris :").grid(row=0, column=0, sticky=tk.W, pady=(0, 5))
        self.max_bookmarks_entry = ttk.Entry(
            advanced_frame,
            textvariable=self.max_bookmarks,
            width=10
        )
        self.max_bookmarks_entry.grid(row=0, column=1, sticky=tk.W, padx=(10, 0), pady=(0, 5))
        self.max_bookmarks_entry.bind('<FocusOut>', lambda e: self.save_config())
        
        # Sauvegarde automatique
        self.backup_check = ttk.Checkbutton(
            advanced_frame,
            text="Activer les sauvegardes automatiques",
            variable=self.backup_enabled,
            command=self.save_config
        )
        self.backup_check.grid(row=1, column=0, columnspan=2, sticky=tk.W, pady=(10, 0))
        
        # Section Statistiques
        stats_frame = ttk.LabelFrame(main_frame, text="Statistiques", padding="10")
        stats_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 15))
        stats_frame.columnconfigure(1, weight=1)
        
        ttk.Label(stats_frame, text="Favoris synchronisés :").grid(row=0, column=0, sticky=tk.W)
        ttk.Label(stats_frame, textvariable=self.stats_bookmarks_count).grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(stats_frame, text="Dernière synchronisation :").grid(row=1, column=0, sticky=tk.W, pady=(5, 0))
        ttk.Label(stats_frame, textvariable=self.stats_last_sync).grid(row=1, column=1, sticky=tk.W, padx=(10, 0), pady=(5, 0))
        
        # Boutons d'action
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=4, column=0, columnspan=2, pady=(15, 0))
        
        ttk.Button(
            button_frame,
            text="Actualiser les statistiques",
            command=self.update_statistics
        ).pack(side=tk.LEFT, padx=(0, 10))
        
        if self.own_root:
            ttk.Button(
                button_frame,
                text="Fermer",
                command=self.on_closing
            ).pack(side=tk.RIGHT)
        
        # Label de statut
        self.status_label = tk.Label(main_frame, text="", font=('Helvetica', 9))
        self.status_label.grid(row=5, column=0, columnspan=2, pady=(10, 0))
        
        # Mise à jour initiale de l'état des contrôles
        self.on_sync_enabled_changed()
    
    def on_closing(self):
        """Gestionnaire pour la fermeture de la fenêtre"""
        if self.save_config():
            if self.own_root:
                self.root.quit()
                self.root.destroy()
            else:
                self.root.withdraw()
    
    def run(self):
        """Lance l'interface graphique"""
        if self.own_root:
            try:
                self.root.mainloop()
            except KeyboardInterrupt:
                logging.info("Interface fermée par l'utilisateur")
            finally:
                try:
                    self.root.destroy()
                except:
                    pass