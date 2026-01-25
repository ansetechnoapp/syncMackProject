#!/bin/bash

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}    INSTALLATION SYNCMARK (Backend Rust)        ${NC}"
echo -e "${GREEN}================================================${NC}"
echo

# Vérification de Cargo (Rust)
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Erreur: Rust/Cargo n'est pas installé.${NC}"
    echo "Veuillez installer Rust via https://rustup.rs/"
    exit 1
fi

# Répertoire du script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "🔨 ${GREEN}Compilation du backend Rust...${NC}"
cd "$PROJECT_ROOT/backend_rust"
if cargo build --release; then
    echo -e "✅ Compilation réussie."
else
    echo -e "${RED}❌ Erreur lors de la compilation.${NC}"
    exit 1
fi

echo
echo -e "🔧 ${GREEN}Installation du manifeste Chrome...${NC}"
cd "$PROJECT_ROOT"
if python3 scripts/setup_rust.py; then
    echo -e "✅ Script de configuration exécuté."
else
    echo -e "${RED}❌ Erreur lors de l'exécution du script de configuration.${NC}"
    echo "Assurez-vous d'avoir Python 3 installé."
fi

echo
echo -e "${GREEN}Installation terminée !${NC}"
echo "Pensez à redémarrer votre navigateur."
