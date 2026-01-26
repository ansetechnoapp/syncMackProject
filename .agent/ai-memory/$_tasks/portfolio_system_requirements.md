# 📋 Système de Gestion de Portfolio Zodback - Spécifications Complètes

## 🎯 Objectif Principal

Créer un système complet de gestion de portfolio permettant aux utilisateurs de Zodback de :
1. Gérer leurs données de portfolio (projets, compétences, expériences, témoignages) via un dashboard
2. Choisir et personnaliser des templates de portfolio
3. Déployer leur portfolio soit en mode intégré (preview) soit en mode externe (HTML/CSS/JS standalone)
4. Alimenter leur portfolio externe via l'API publique de Zodback avec authentification par token

---

## 🏗️ Architecture du Système

### Composants Principaux

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZODBACK PLATFORM                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DASHBOARD (frontend/app/(dashboard))                     │  │
│  │                                                            │  │
│  │  1. Authentification utilisateur                          │  │
│  │  2. Gestion API Tokens (lié à Projet → Module)           │  │
│  │  3. Gestion données Portfolio (/portfolio):               │  │
│  │     - Projects (projets réalisés)                         │  │
│  │     - Skills (compétences techniques)                     │  │
│  │     - Experiences (parcours professionnel)                │  │
│  │     - Testimonials (témoignages clients)                  │  │
│  │     - Templates (choix et customisation)                  │  │
│  │                                                            │  │
│  │  4. Preview Portfolio (/portfolio-preview)                │  │
│  │     - Affichage du portfolio avec template sélectionné   │  │
│  │     - Données en temps réel                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BACKEND API (backend/src)                                │  │
│  │                                                            │  │
│  │  Endpoints Privés (authentifiés):                         │  │
│  │  - /api/auth/tokens (gestion tokens API)                  │  │
│  │  - /portfolio/v1/projects (CRUD projets)                  │  │
│  │  - /portfolio/v1/skills (CRUD compétences)                │  │
│  │  - /portfolio/v1/experiences (CRUD expériences)           │  │
│  │  - /portfolio/v1/testimonials (CRUD témoignages)          │  │
│  │  - /portfolio/v1/templates (gestion templates)            │  │
│  │                                                            │  │
│  │  Endpoints Publics (API token requis):                    │  │
│  │  - /portfolio/v1/public/all (toutes les données)          │  │
│  │  - /portfolio/v1/public/projects                          │  │
│  │  - /portfolio/v1/public/skills                            │  │
│  │  - /portfolio/v1/public/experiences                       │  │
│  │  - /portfolio/v1/public/testimonials                      │  │
│  │  - /portfolio/v1/templates/code/:code/export              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │ API Calls
                            │ Headers:
                            │ - X-API-Key: tok_xxx
                            │ - X-Project-Id: proj_xxx
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                                                                  │
│  PORTFOLIO EXTERNE (portefolio/ - HTML/CSS/JS)                  │
│  Déployé sur serveur externe (Netlify, Vercel, GitHub Pages)    │
│                                                                  │
│  Structure:                                                      │
│  ├── index.html (page principale)                               │
│  ├── css/                                                        │
│  │   ├── style.css (styles du portfolio)                        │
│  │   └── animations.css (animations)                            │
│  ├── js/                                                         │
│  │   ├── config.js (🔑 CONFIG: API_URL, TOKEN, PROJECT_ID)      │
│  │   ├── api.js (client API)                                    │
│  │   └── app.js (logique affichage)                             │
│  └── templates/ (variantes de templates)                        │
│                                                                  │
│  Fonctionnement:                                                 │
│  1. L'utilisateur configure js/config.js avec son token         │
│  2. Le JS fetch les données via /portfolio/v1/public/all        │
│  3. Le portfolio s'affiche avec les vraies données              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ État Actuel de l'Implémentation

### Ce qui FONCTIONNE déjà

#### Backend (backend/src/)
- ✅ API complète CRUD pour :
  - Projects ([portfolio/portfolio.controller.ts:282](backend/src/portfolio/portfolio.controller.ts))
  - Skills
  - Experiences
  - Testimonials
- ✅ API publique read-only ([portfolio/portfolio-public.controller.ts:164](backend/src/portfolio/portfolio-public.controller.ts))
- ✅ Système de templates complet :
  - Master templates (gérés par admin)
  - Sélection utilisateur
  - Versioning
  - Export HTML standalone
- ✅ Gestion API Tokens :
  - Scope projet/global
  - Entités (PORTFOLIO, BLOG, etc.)
  - Permissions granulaires
- ✅ Isolation des données par projet
- ✅ Sanitization et validation des inputs
- ✅ Système de statuts (draft/published/archived)
- ✅ Featured/sortOrder pour ordering

#### Frontend Dashboard (frontend/app/(dashboard)/portfolio/)
- ✅ Page overview du portfolio ([page.tsx:282](frontend/app/(dashboard)/portfolio/page.tsx))
- ✅ Gestion des projets ([projects/page.tsx:528](frontend/app/(dashboard)/portfolio/projects/page.tsx))
- ✅ Gestion des compétences ([skills/page.tsx:463](frontend/app/(dashboard)/portfolio/skills/page.tsx))
- ✅ Gestion des expériences ([experiences/page.tsx:532](frontend/app/(dashboard)/portfolio/experiences/page.tsx))
- ✅ Gestion des témoignages ([testimonials/page.tsx:527](frontend/app/(dashboard)/portfolio/testimonials/page.tsx))
- ✅ Sélection de templates ([templates/page.tsx:359](frontend/app/(dashboard)/portfolio/templates/page.tsx))
- ✅ Preview du portfolio ([portfolio-preview/page.tsx:309](frontend/app/portfolio-preview/page.tsx))

#### Portfolio Externe (portefolio/)
- ✅ Structure HTML/CSS/JS standalone
- ✅ Client API fonctionnel
- ✅ Configuration via js/config.js
- ✅ Intégration API publique
- ✅ Design responsive
- ✅ README de déploiement complet

#### Base de Données
- ✅ Tables portfolioProjects, portfolioSkills, portfolioExperiences, portfolioTestimonials
- ✅ Tables portfolioCategories, portfolioProjectCategories (many-to-many)
- ✅ Tables portfolioTemplates, userPortfolioTemplates, portfolioTemplateVersions
- ✅ Table apiTokens avec scope projet

---

## ⚠️ Points à Améliorer/Compléter

### 🔴 Priorité HAUTE

#### 1. **Finalisation du Portfolio Externe (portefolio/)**

**Objectif** : Créer un portfolio HTML/CSS/JS production-ready

**Tâches** :
- [x] Améliorer le design visuel du portfolio externe ✅ (2026-01-17)
- [x] Créer plusieurs templates HTML/CSS au choix : ✅ (2026-01-17)
  - Template 1 : Modern/Minimal (Default - existant)
  - Template 2 : Creative/Colorful ✅ (`templates/creative/`)
  - Template 3 : Professional/Corporate ✅ (`templates/professional/`)
- [x] Implémenter un système de thèmes (dark/light mode) ✅ (config.js THEME.mode)
- [ ] Optimiser les performances :
  - Lazy loading des images
  - Minification CSS/JS
  - Caching des appels API
- [x] Améliorer le système de fallback si API non disponible ✅ (Demo data)
- [ ] Ajouter des meta tags SEO/Open Graph
- [x] Créer un mode "demo" avec données fictives ✅ (showDemoData())

#### 2. **Gestion des API Keys dans le Dashboard**

**Problème actuel** : Pas d'interface claire pour récupérer/gérer les tokens API

**Tâches** :
- [x] Créer une page dédiée `/dashboard/api-tokens` ✅ (Déjà existante)
- [x] Afficher : ✅
  - Liste des tokens existants (avec scope, entités, date création) ✅
  - Bouton "Créer un token Portfolio" ✅
  - Copier le token (affiché une seule fois) ✅
  - Révoquer un token ✅
- [ ] Guide intégré "Comment utiliser votre token API"
- [x] Instructions pour configurer le portfolio externe ✅ (README.md)

#### 3. **Export de Template Amélioré**

**Objectif** : Permettre un export one-click du portfolio

**Tâches** :
- [x] Bouton "Exporter mon portfolio" dans `/portfolio/templates` ✅ (Dropdown menu)
- [x] Export HTML quick ✅
- [ ] Générer un ZIP contenant HTML/CSS/JS + config pré-remplie
- [ ] Intégration directe avec Vercel/Netlify (deploy en 1 clic)

### 🟡 Priorité MOYENNE

#### 4. **Gestion des Catégories**

**Problème** : La structure DB existe mais pas d'UI

**Tâches** :
- [x] Créer une page `/portfolio/categories` ✅ (Done)
- [x] CRUD pour catégories de projets ✅ (Done)
- [ ] Associer des catégories aux projets
- [ ] Filtrage par catégorie dans la liste des projets

#### 5. **Customisation de Templates**

**Problème** : `customConfig` existe en DB mais pas exploité

**Tâches** :
- [ ] UI pour personnaliser :
  - Couleurs principales (primary, secondary, accent)
  - Typographie (fonts)
  - Espacement/layout
  - Logo/avatar
- [ ] Preview en temps réel des changements
- [ ] Sauvegarder la config dans `userPortfolioTemplates.customConfig`

#### 6. **Preview des Templates**

**Tâches** :
- [ ] Modal de preview avant activation
- [ ] Afficher le template avec les vraies données de l'utilisateur
- [ ] Bouton "Activer ce template"

### 🟢 Priorité BASSE

#### 7. **Versioning de Templates**

**Tâches** :
- [ ] UI pour créer un snapshot de version
- [ ] Afficher l'historique des versions
- [ ] Rollback vers une version précédente
- [ ] Notification de mise à jour de template disponible

#### 8. **Analytics & Métriques**

**Tâches** :
- [ ] Tracking des vues du portfolio
- [ ] Statistiques d'utilisation (projets populaires, etc.)
- [ ] Dashboard analytics

#### 9. **SEO & Metadata**

**Tâches** :
- [ ] Gestion des meta tags par projet
- [ ] Open Graph tags pour partage social
- [ ] Génération automatique de sitemap.xml
- [ ] Schema.org markup

---

## 🎯 Workflow Utilisateur Idéal

### Scénario Complet

1. **Connexion & Configuration Initiale**
   ```
   Utilisateur se connecte → Va dans /dashboard/portfolio
   → Crée son premier projet
   → Voit un message : "Créez un API token pour utiliser votre portfolio en externe"
   ```

2. **Création de l'API Token**
   ```
   Utilisateur va dans /dashboard/api-tokens
   → Clique "Nouveau token Portfolio"
   → Token généré : tok_abc123...
   → Message : "Copiez ce token maintenant, il ne sera plus affiché"
   → Instructions : "Utilisez ce token pour configurer votre portfolio externe"
   ```

3. **Gestion du Contenu**
   ```
   Utilisateur remplit son portfolio :
   → /portfolio/projects : Ajoute 5 projets
   → /portfolio/skills : Ajoute compétences (React, Node.js, etc.)
   → /portfolio/experiences : Ajoute parcours pro
   → /portfolio/testimonials : Ajoute témoignages clients
   ```

4. **Choix du Template**
   ```
   Utilisateur va dans /portfolio/templates
   → Parcourt les templates disponibles (3-5 templates)
   → Clique "Preview" sur un template → Modal avec preview
   → Clique "Utiliser ce template"
   → Template activé ✅
   ```

5. **Personnalisation** (optionnel)
   ```
   Utilisateur clique "Personnaliser"
   → Modifie les couleurs (primary: #3B82F6)
   → Change la font (Inter → Poppins)
   → Preview en temps réel
   → Sauvegarde ✅
   ```

6. **Preview Intégré**
   ```
   Utilisateur va dans /portfolio-preview
   → Voit son portfolio avec le template choisi
   → Tout est parfait ✅
   ```

7. **Export & Déploiement**
   ```
   Option A - Export manuel :
   → Clique "Exporter mon portfolio"
   → Télécharge portfolio.zip
   → Extrait et configure js/config.js avec son token
   → Déploie sur Netlify/Vercel

   Option B - Deploy en 1 clic :
   → Clique "Déployer sur Vercel"
   → Connecte son compte Vercel
   → Portfolio déployé automatiquement ✅
   ```

8. **Utilisation**
   ```
   Portfolio externe en ligne à : https://mon-portfolio.vercel.app
   → Fetch automatiquement les données de Zodback API
   → L'utilisateur met à jour dans /dashboard/portfolio
   → Changes reflétés instantanément sur le portfolio externe
   ```

---

## 🔧 Contraintes Techniques

### Obligatoires
- ✅ Utiliser **Bun** (pas npm/yarn)
- ✅ Portfolio externe en **HTML/CSS/JS pur** (pas de framework)
- ✅ Compatible **Windows**
- ✅ Isolation des données par **projet**
- ✅ Authentification par **API token**
- ✅ Headers requis : `X-API-Key` + `X-Project-Id`

### Recommandations
- 🎨 Design moderne et responsive
- ⚡ Performance optimale (lazy loading, caching)
- 🔒 Sécurité (sanitization, validation, CORS)
- 📱 Mobile-first
- ♿ Accessibilité (WCAG)
- 🌍 SEO-friendly

---

## 📦 Livrables Attendus

### Phase 1 : Finalisation du Portfolio Externe
- [ ] 3 templates HTML/CSS/JS production-ready
- [ ] Système de configuration simplifié
- [ ] Documentation de déploiement complète
- [ ] Mode demo avec données fictives

### Phase 2 : Dashboard API Tokens
- [ ] Page de gestion des tokens
- [ ] Guide d'utilisation intégré
- [ ] Export one-click avec config pré-remplie

### Phase 3 : Améliorations UI
- [ ] Gestion des catégories
- [ ] Customisation de templates
- [ ] Preview des templates

### Phase 4 : Optimisations
- [ ] SEO/Metadata
- [ ] Analytics
- [ ] Versioning avancé

---

## 🚀 Prochaines Étapes

### Immédiat (à faire maintenant)
1. ✅ Valider cette spécification
2. 🔨 Améliorer le portfolio externe (portefolio/)
   - Créer 3 templates visuellement attractifs
   - Optimiser le code HTML/CSS/JS
   - Tester l'intégration API
3. 🔑 Créer l'UI de gestion des API tokens
4. 📤 Implémenter l'export one-click

### Court terme (semaine prochaine)
- Gestion des catégories
- Customisation de templates
- Preview des templates

### Moyen terme (plus tard)
- Analytics
- SEO avancé
- Versioning

---

## 📝 Notes Importantes

### Relation API Token ↔ Projet ↔ Module
```
User (utilisateur)
  └─> Project (projet)
       └─> Module (ex: PORTFOLIO, BLOG, etc.)
            └─> API Token (tok_xxx)
                 ├─ entities: ['PORTFOLIO']
                 ├─ projectId: 'proj_xxx'
                 ├─ permissions: {read, write, delete}
                 └─ scope: 'project'
```

**Clarification** :
- Un token API est lié à un **projet**
- Un projet peut avoir plusieurs **modules** (Portfolio, Blog, etc.)
- Le token spécifie quelles **entités** il peut accéder (ex: PORTFOLIO)
- Donc : `Token` → `Projet` → `Modules autorisés` ✅

### Sécurité
- Les tokens sont **hachés** en DB
- Affichés **une seule fois** à la création
- Peuvent être **révoqués** à tout moment
- Chaque requête API vérifie le token + project ID

---

## ✅ Validation

Ce document décrit-il correctement vos besoins ?

**Points à confirmer** :
1. ✅ L'architecture générale est-elle correcte ?
2. ✅ Les priorités sont-elles alignées avec vos attentes ?
3. ✅ Le workflow utilisateur correspond-il à votre vision ?
4. ✅ Les contraintes techniques sont-elles complètes ?
5. ✅ Faut-il ajouter/modifier quelque chose ?

---

**Version** : 1.0
**Date** : 2026-01-17
**Auteur** : Analyse basée sur l'exploration complète du codebase Zodback
