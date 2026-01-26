# 🎯 Plan Final d'Implémentation Portfolio Zodback

**Créé le :** 2026-01-17
**Objectif :** Mettre en place un système de portfolio complet avec gestion via dashboard et déploiement externe

---

## 📋 Vue d'ensemble du système

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ZODBACK ECOSYSTEM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  FRONTEND ZODBACK (Dashboard)                                 │  │
│   │  /(dashboard)/portfolio/                                      │  │
│   │    ├── page.tsx         → Overview + Stats                   │  │
│   │    ├── projects/        → Gérer les projets                  │  │
│   │    ├── skills/          → Gérer les compétences              │  │
│   │    ├── experiences/     → Gérer les expériences              │  │
│   │    ├── testimonials/    → Gérer les témoignages              │  │
│   │    └── templates/       → Choisir un template                │  │
│   │                                                               │  │
│   │  /(dashboard)/api-tokens/ → Créer API Token pour PORTFOLIO   │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  BACKEND ZODBACK API (NestJS)                                 │  │
│   │  /api/portfolio/v1/                                           │  │
│   │    ├── projects (CRUD) - Auth JWT                            │  │
│   │    ├── skills (CRUD)   - Auth JWT                            │  │
│   │    ├── experiences (CRUD) - Auth JWT                         │  │
│   │    └── testimonials (CRUD) - Auth JWT                        │  │
│   │                                                               │  │
│   │  /api/portfolio/v1/public/  (API Token Auth)                 │  │
│   │    ├── all → Toutes les données (READ)                       │  │
│   │    ├── projects → Projets publiés                            │  │
│   │    ├── skills → Compétences                                  │  │
│   │    ├── experiences → Expériences                             │  │
│   │    └── testimonials → Témoignages publiés                    │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼ API Token + X-Project-Id              │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PORTFOLIO EXTERNE (HTML/CSS/JS)                                     │
│  Déployé sur : Netlify / Vercel / GitHub Pages / Serveur externe    │
│                                                                      │
│  portefolio/                                                        │
│    ├── index.html    → Structure HTML                               │
│    ├── css/                                                         │
│    │   ├── style.css       → Styles principaux                     │
│    │   └── animations.css  → Animations                             │
│    └── js/                                                          │
│        ├── config.js  → API_TOKEN, PROJECT_ID, API_URL              │
│        ├── api.js     → Client API                                  │
│        └── app.js     → Logique de rendu                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Phases d'Implémentation

### Phase 1 : Vérification Base de Données
**Priorité : CRITICAL | Estimation : 1h**

#### T1.1 : Vérifier les tables portfolio
- [ ] Vérifier si les tables `portfolio_projects`, `portfolio_skills`, `portfolio_experiences`, `portfolio_testimonials` existent
- [ ] Lancer la migration si nécessaire : `bun run db:push` ou `bun run db:migrate`
- **Test :** `SELECT * FROM portfolio_projects LIMIT 1;`
- **Critère de succès :** Tables accessibles et requêtables

#### T1.2 : Vérifier les tables templates
- [ ] Vérifier si `portfolio_templates` et `user_selected_templates` existent
- [ ] Exécuter `scripts/seed-portfolio-templates.ts` si vide
- **Test :** `SELECT * FROM portfolio_templates;`

---

### Phase 2 : Compléter les pages Dashboard manquantes
**Priorité : HIGH | Estimation : 2h**

#### T2.1 : Vérifier/Compléter Experiences Page
- Fichier : `frontend/app/(dashboard)/portfolio/experiences/page.tsx`
- Fonctionnalités : Liste, Création, Édition, Suppression
- **Test :** CRUD complet fonctionnel

#### T2.2 : Vérifier/Compléter Testimonials Page
- Fichier : `frontend/app/(dashboard)/portfolio/testimonials/page.tsx`
- Fonctionnalités : Liste, Création, Édition, Suppression, Gestion statut
- **Test :** CRUD complet fonctionnel

---

### Phase 3 : Page Preview Portfolio (/portfolio)
**Priorité : HIGH | Dépendance : T2.x ✅ | Estimation : 3h**

#### T3.1 : Créer la page de preview
- Fichier à créer : `frontend/app/portfolio/page.tsx`
- Fonctionnalités :
  - Afficher le template sélectionné par l'utilisateur
  - Charger les données depuis l'API backend
  - Permettre preview sans déploiement
- **Test :** Page accessible, données affichées

#### T3.2 : Créer le layout portfolio
- Fichier : `frontend/app/portfolio/layout.tsx`
- Styles spécifiques au mode preview
- Navigation simplifiée

---

### Phase 4 : Portfolio Externe HTML/CSS/JS
**Priorité : HIGH | Dépendance : T1.x ✅ | Estimation : 4h**

#### T4.1 : Améliorer le design du portfolio externe
- Fichier : `portefolio/index.html`
- Améliorer les animations
- Ajouter micro-interactions
- Optimiser responsive

#### T4.2 : Ajouter support multi-templates
- Créer structure : `portefolio/templates/{template-name}/`
- Permettre de charger différents styles via config
- **Test :** Changer de template via config.js

#### T4.3 : Améliorer le client API
- Fichier : `portefolio/js/api.js`
- Ajouter meilleure gestion d'erreurs
- Ajouter mode démo avec données fictives
- **Test :** Portfolio fonctionnel sans connexion API

---

### Phase 5 : Intégration & Tests E2E
**Priorité : MEDIUM | Dépendance : T4.x ✅ | Estimation : 2h**

#### T5.1 : Test flow complet
1. Créer compte utilisateur
2. Créer données portfolio (projets, skills, etc.)
3. Générer API Token avec permission PORTFOLIO
4. Configurer portfolio externe
5. Vérifier affichage des données

#### T5.2 : Documentation utilisateur
- Mettre à jour le guide dans dashboard
- Ajouter instructions déploiement
- Inclure exemples de configuration

---

## 📁 Structure Finale du Projet

```
zodback/
├── frontend/app/
│   ├── (dashboard)/
│   │   ├── portfolio/
│   │   │   ├── page.tsx              ✅ Existant
│   │   │   ├── projects/page.tsx     ✅ Existant
│   │   │   ├── skills/page.tsx       ✅ Existant
│   │   │   ├── experiences/page.tsx  ⚠️ À vérifier
│   │   │   ├── testimonials/page.tsx ⚠️ À vérifier
│   │   │   └── templates/page.tsx    ✅ Existant
│   │   └── api-tokens/               ✅ Existant
│   │       └── page.tsx
│   └── portfolio/                    ❌ À CRÉER (Phase 3)
│       ├── page.tsx                  → Preview du template
│       └── layout.tsx                → Layout dédié
│
├── backend/src/
│   ├── portfolio/                    ✅ Existant
│   │   ├── portfolio.controller.ts   ✅ CRUD endpoints
│   │   ├── portfolio-public.controller.ts ✅ Public API
│   │   └── portfolio.service.ts      ✅ Business logic
│   ├── portfolio-templates/          ✅ Existant
│   │   └── *                         → Template management
│   └── database/
│       ├── portfolio.schema.ts       ✅ Schema défini
│       └── portfolio-templates.schema.ts ✅ Templates schema
│
└── portefolio/                       ✅ Existant (à améliorer)
    ├── index.html                    ✅ Template principal
    ├── css/
    │   ├── style.css                 ✅ Styles
    │   └── animations.css            ✅ Animations
    ├── js/
    │   ├── config.js                 ✅ Configuration
    │   ├── api.js                    ✅ Client API
    │   └── app.js                    ✅ App logic
    └── templates/                    📦 À enrichir
        └── default/
```

---

## 🔑 Points clés API Token → Project → Module

### Hiérarchie des permissions
```
User
  └── Project (projectId)
        └── Enabled Modules: [PORTFOLIO, ...]
              └── API Token
                    └── Entity Permissions: [PORTFOLIO: READ]
```

### Headers requis pour l'API publique
```javascript
// Dans portefolio/js/api.js
const headers = {
    'Authorization': `Bearer ${API_TOKEN}`,     // Token avec permission PORTFOLIO:READ
    'X-Project-Id': PROJECT_ID,                 // ID du projet
    'Content-Type': 'application/json'
};
```

---

## ⏭️ Prochaines Actions Immédiates

1. **[Action 1]** Vérifier les migrations DB et lancer si nécessaire
2. **[Action 2]** Confirmer que experiences/ et testimonials/ sont complets
3. **[Action 3]** Créer `frontend/app/portfolio/page.tsx` pour le preview
4. **[Action 4]** Tester le flow complet API Token → Portfolio externe

---

**Status :** EN ATTENTE DE VALIDATION
**Estimé total :** ~12 heures de développement
