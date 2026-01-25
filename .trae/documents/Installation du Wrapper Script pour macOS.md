J'ai mis en place un **script wrapper** (`backend_wrapper.sh`) pour contourner les restrictions d'environnement de macOS qui empêchaient Chrome de lancer directement le binaire Rust.

### 🛠️ Dernière Action Requise

Pour que ce changement soit pris en compte, vous devez **réinstaller le manifeste** en exécutant cette commande (avec votre ID d'extension) :

```bash
python3 scripts/setup_rust.py --id jcafeienjkpkpmhkdhhahmmhngaiahcc
```

Puis **redémarrez Chrome** et testez. Cette fois, cela devrait fonctionner ! 🚀