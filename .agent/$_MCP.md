# MCP (Master Control Program) Configurations

Ce fichier documente les outils MCP disponibles pour le développement rapide sur le projet Zodback.

---

## 🗄️ Base de Données - PostgreSQL

### Configuration Zodback (Production/Dev)
- **Nom MCP attendu**: `postgres-pro_zodback`
- **Hôte**: `aws-1-eu-central-1.pooler.supabase.com:6543`
- **Provider**: Supabase
- **Base**: `postgres`

### ⚠️ Note Importante
Si le MCP Postgres affiche `scrappyodds_local`, cela signifie qu'il pointe vers une **base locale différente**, pas vers Zodback.

Pour accéder à la vraie base Zodback, utilisez les scripts TypeScript avec `DATABASE_URL` depuis `.env`:
```bash
cd backend
bun run ts-node scripts/check-portfolio-tables.ts
bun run ts-node scripts/check-templates.ts
```

### Tables Portfolio (vérifiées ✅)
```
portfolio_projects, portfolio_skills, portfolio_experiences,
portfolio_testimonials, portfolio_categories, portfolio_templates,
portfolio_template_versions, user_portfolio_templates
```

---

## 📚 Documentation - Context7

- **Nom MCP**: `context7`
- **Usage**: Recherche de documentation des librairies
- **Outils**:
  - `mcp_context7_resolve-library-id` - Trouver l'ID d'une librairie
  - `mcp_context7_get-library-docs` - Récupérer la documentation

### Exemple d'utilisation
```
1. Résoudre: resolve-library-id("next.js")
2. Obtenir docs: get-library-docs("/vercel/next.js", topic="routing")
```

---

## 🔍 Recherche - Everything Search

- **Nom MCP**: `Everything Search`
- **Usage**: Recherche rapide de fichiers sur le système Windows
- **Note**: Nécessite Everything installé sur Windows

---

## 🛠️ Outils MCP PostgreSQL Disponibles

| Outil | Description |
|-------|-------------|
| `execute_sql` | Exécuter une requête SQL |
| `list_schemas` | Lister les schémas de la BDD |
| `list_objects` | Lister tables/vues/séquences d'un schéma |
| `get_object_details` | Détails d'une table (colonnes, indexes) |
| `explain_query` | Analyser le plan d'exécution d'une requête |
| `analyze_db_health` | Vérifier la santé de la BDD |
| `get_top_queries` | Requêtes les plus lentes/coûteuses |
| `analyze_query_indexes` | Recommander des indexes |

---

## ⚡ Bonnes Pratiques

1. **Toujours vérifier** à quelle base le MCP est connecté avant d'exécuter des requêtes
2. **Utiliser les scripts TypeScript** pour les opérations critiques sur Zodback
3. **Ne jamais exécuter** de requêtes destructives sans confirmation
4. **Documenter** toute nouvelle configuration MCP dans ce fichier

---

*Dernière mise à jour: 2026-01-17*
