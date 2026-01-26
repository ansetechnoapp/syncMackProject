# Plan d'Implémentation Détaillé - Système Portfolio Zodback
**Date:** 2026-01-16
**Statut:** ✅ FAISABILITÉ CONFIRMÉE

---

## 🎯 Objectif Global

Créer un système complet de gestion de portfolio permettant :
1. **Dashboard** (`frontend/app/(dashboard)/portfolio`) : Gérer les données et templates du portfolio
2. **Preview Interne** (`frontend/app/portfolio`) : Afficher le portfolio avec le template choisi
3. **Portfolio Externe** (`portefolio/`) : Portfolio standalone en HTML/CSS/JS déployable sur un serveur externe
4. **API Management** : Système de clés API pour alimenter le portfolio externe

---

## ✅ Ce Qui Est Déjà Fonctionnel

### Backend (NestJS)
- ✅ Module portfolio complet avec CRUD pour :
  - Projects, Skills, Experiences, Testimonials
- ✅ API publique : `GET /portfolio/v1/public/all` (retourne toutes les données)
- ✅ Système de clés API avec permissions granulaires
- ✅ Relation confirmée : `api_tokens.projectId` → `projects.id`
- ✅ Isolation multi-tenant (par projet et utilisateur)
- ✅ Statuts (draft/published/archived)

### Frontend (Next.js)
- ✅ Pages dashboard basiques :
  - `/portfolio/projects` - Gestion des projets
  - `/portfolio/skills` - Gestion des compétences
  - `/portfolio/experiences` - Gestion des expériences
  - `/portfolio/testimonials` - Gestion des témoignages
- ✅ Page API tokens : `/api-tokens` (création et gestion)
- ✅ API client avec React Query

---

## 🔧 Ce Qui Doit Être Implémenté

### Phase 1 : Backend - Système de Templates
**Priorité : HAUTE** | **Durée estimée : Implémentation directe**

#### T1.1 - Créer le schéma de templates
**Fichier :** `backend/src/database/portfolio-templates.schema.ts`

```typescript
// Structure de table portfolio_templates
{
  id: serial primary key,
  code: varchar unique, // 'modern', 'minimalist', 'creative'
  name: varchar,
  description: text,
  thumbnail: varchar, // URL de l'aperçu
  category: varchar, // 'business', 'creative', 'developer'
  htmlTemplate: text, // Code HTML du template
  cssTemplate: text, // Code CSS
  jsTemplate: text, // Code JavaScript
  configSchema: jsonb, // Configuration disponible (colors, fonts, etc.)
  defaultConfig: jsonb, // Configuration par défaut
  isActive: boolean,
  isPremium: boolean,
  createdAt, updatedAt
}

// Table user_portfolio_templates
{
  id: serial primary key,
  userId: integer,
  projectId: integer,
  templateId: integer,
  customConfig: jsonb, // Configuration personnalisée
  isActive: boolean,
  createdAt, updatedAt
}
```

**Tests :**
- Migration s'exécute sans erreur
- Tables créées avec indexes appropriés

---

#### T1.2 - Créer le module NestJS pour templates
**Dossier :** `backend/src/portfolio-templates/`

**Fichiers à créer :**
```
portfolio-templates/
├── portfolio-templates.controller.ts
├── portfolio-templates.service.ts
├── portfolio-templates.module.ts
├── dto/
│   ├── create-template.dto.ts
│   ├── update-template.dto.ts
│   └── select-template.dto.ts
└── seeds/
    └── default-templates.seed.ts
```

**Endpoints à créer :**
```typescript
// Public (liste des templates disponibles)
GET /portfolio/v1/templates
GET /portfolio/v1/templates/:code

// Authentifié (gestion utilisateur)
POST /portfolio/v1/templates/select - Sélectionner un template
PATCH /portfolio/v1/templates/config - Mettre à jour la config
GET /portfolio/v1/templates/my-template - Récupérer le template actif de l'utilisateur

// Admin (gestion des templates)
POST /portfolio/v1/admin/templates
PATCH /portfolio/v1/admin/templates/:id
DELETE /portfolio/v1/admin/templates/:id
```

**Tests :**
- Tous les endpoints répondent correctement
- Permissions API token validées
- Isolation par projet respectée

---

#### T1.3 - Seed templates par défaut
**Fichier :** `backend/scripts/seed-portfolio-templates.ts`

**Templates à créer :**
1. **Modern Developer** (template par défaut)
2. **Minimalist Designer**
3. **Creative Agency**

**Exécution :** `bun run seed:portfolio-templates`

**Tests :**
- Script s'exécute sans erreur
- Templates insérés en base de données

---

### Phase 2 : Frontend Dashboard - Amélioration
**Priorité : HAUTE** | **Durée estimée : Implémentation directe**

#### T2.1 - Page principale du portfolio
**Fichier :** `frontend/app/(dashboard)/portfolio/page.tsx`

**Fonctionnalités :**
- 📊 Statistiques (nombre de projects, skills, experiences, testimonials)
- 🔑 Carte "API Key" avec bouton rapide pour créer un token PORTFOLIO
- 📋 Navigation vers les sous-sections
- 🎨 Lien vers la page de gestion des templates
- 👁️ Bouton "Preview Portfolio" → `/portfolio`

**Tests :**
- Page s'affiche correctement
- Statistiques chargent les bonnes données
- Navigation fonctionne

---

#### T2.2 - Page de gestion des templates
**Fichier :** `frontend/app/(dashboard)/portfolio/templates/page.tsx`

**Fonctionnalités :**
- Grille de templates disponibles (cards avec thumbnail)
- Bouton "Select Template" pour chaque template
- Affichage du template actuellement actif
- Configuration basique (couleurs, polices) si le template le supporte
- Preview du template en modal

**API Client :**
```typescript
// frontend/src/lib/api/portfolio-templates.api.ts
export const useTemplates = () => {
  return useQuery(['portfolio-templates'], () =>
    apiClient.get('/portfolio/v1/templates')
  );
};

export const useSelectTemplate = () => {
  return useMutation((data) =>
    apiClient.post('/portfolio/v1/templates/select', data)
  );
};
```

**Tests :**
- Templates s'affichent en grille
- Sélection persiste en base
- Preview fonctionne

---

#### T2.3 - Améliorer les pages existantes
**Fichiers :**
- `frontend/app/(dashboard)/portfolio/projects/page.tsx`
- `frontend/app/(dashboard)/portfolio/skills/page.tsx`
- `frontend/app/(dashboard)/portfolio/experiences/page.tsx`
- `frontend/app/(dashboard)/portfolio/testimonials/page.tsx`

**Améliorations communes :**
- ✨ UI moderne avec Tailwind CSS
- 📤 Upload d'images (featured image, logos)
- 🔍 Filtres et recherche
- 📊 Tri par colonne
- ✏️ Modals pour CRUD (au lieu de pages séparées)
- 🎯 Toggle status (draft/published)
- ⭐ Toggle featured
- 🔢 Drag-and-drop pour sortOrder

**Tests :**
- Toutes les opérations CRUD fonctionnent
- Upload d'images fonctionne
- Filtres et tri fonctionnent

---

#### T2.4 - Lien rapide vers API Key
**Fichier :** `frontend/app/(dashboard)/portfolio/page.tsx`

**Fonctionnalité :**
- Card "Get Your API Key"
- Bouton qui ouvre le modal de création de token
- Pré-rempli avec :
  - Entity: `PORTFOLIO`
  - Permissions: `READ` (pour portfolio public)
  - Scope: Project actuel
- Affiche les tokens existants pour PORTFOLIO

**Tests :**
- Modal s'ouvre avec les bonnes valeurs
- Token créé avec succès
- Token affiché (une seule fois)

---

### Phase 3 : Frontend - Portfolio Preview Interne
**Priorité : MOYENNE** | **Durée estimée : Implémentation directe**

#### T3.1 - Page de preview du portfolio
**Fichier :** `frontend/app/portfolio/page.tsx`

**Fonctionnalité :**
- Charge le template actif de l'utilisateur connecté
- Récupère les données via API (`/portfolio/v1/public/all`)
- Rend le HTML du template avec les données
- Injecte le CSS et JS du template
- Mode "Preview" avec barre d'outils en haut :
  - Bouton "Retour au Dashboard"
  - Toggle "Desktop / Tablet / Mobile"
  - Bouton "Publier" (si des changements non publiés)

**Tests :**
- Template s'affiche correctement
- Données chargent depuis l'API
- Responsive preview fonctionne

---

#### T3.2 - Route dynamique par slug
**Fichier :** `frontend/app/portfolio/[slug]/page.tsx`

**Fonctionnalité :**
- Permet d'accéder au portfolio d'un utilisateur via son slug
- Exemple : `/portfolio/john-doe`
- Public (pas besoin d'authentification)
- Utilise l'API publique

**Tests :**
- URL avec slug fonctionne
- Données du bon utilisateur affichées
- 404 si slug n'existe pas

---

### Phase 4 : Portfolio Externe (HTML/CSS/JS)
**Priorité : HAUTE** | **Durée estimée : Implémentation directe**

#### T4.1 - Structure du projet externe
**Dossier :** `portefolio/`

**Structure de fichiers :**
```
portefolio/
├── index.html
├── css/
│   ├── style.css
│   ├── responsive.css
│   └── animations.css
├── js/
│   ├── config.js          // Configuration API
│   ├── app.js             // Logique principale
│   ├── api.js             // Appels API
│   └── components.js      // Rendu des composants
├── assets/
│   ├── images/
│   └── icons/
├── .env.example           // Exemple de configuration
└── README.md              // Instructions de déploiement
```

**config.js :**
```javascript
const PORTFOLIO_CONFIG = {
    API_URL: 'https://api.zodback.com', // URL de l'API zodback
    API_TOKEN: 'zod_xxxxxxxxxxxx',      // Token API de l'utilisateur
    PROJECT_ID: 'proj_xxxx',            // ID du projet

    // Optionnel : Configuration visuelle
    colors: {
        primary: '#3B82F6',
        secondary: '#1E293B',
        accent: '#F59E0B'
    },
    fonts: {
        heading: 'Inter',
        body: 'Inter'
    }
};
```

**Tests :**
- Structure de fichiers créée
- README contient instructions claires

---

#### T4.2 - Implémentation de l'API client JavaScript
**Fichier :** `portefolio/js/api.js`

```javascript
class PortfolioAPI {
    constructor(config) {
        this.apiUrl = config.API_URL;
        this.apiToken = config.API_TOKEN;
        this.projectId = config.PROJECT_ID;
    }

    async fetchAllData() {
        const response = await fetch(`${this.apiUrl}/portfolio/v1/public/all`, {
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'X-Project-Id': this.projectId,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return response.json();
    }

    async fetchProjects() { /* ... */ }
    async fetchSkills() { /* ... */ }
    async fetchExperiences() { /* ... */ }
    async fetchTestimonials() { /* ... */ }
}
```

**Tests :**
- Fetch fonctionne avec vraies données
- Gestion d'erreurs correcte
- Headers envoyés correctement

---

#### T4.3 - Template HTML/CSS
**Fichier :** `portefolio/index.html`

**Sections :**
1. **Hero Section** - Nom, titre, photo, CTA
2. **About Section** - Présentation personnelle
3. **Skills Section** - Compétences avec barres de progression
4. **Experience Section** - Timeline des expériences
5. **Projects Section** - Grille de projets (avec filtres)
6. **Testimonials Section** - Carrousel de témoignages
7. **Contact Section** - Formulaire de contact

**Design :**
- Modern, clean, professionnel
- Responsive (mobile-first)
- Animations au scroll (fade-in, slide-in)
- Smooth scrolling entre sections

**Tests :**
- Affichage correct sur tous devices
- Animations fluides
- Performance optimale (Lighthouse score > 90)

---

#### T4.4 - JavaScript pour le rendu dynamique
**Fichier :** `portefolio/js/app.js`

```javascript
class PortfolioApp {
    constructor(config) {
        this.api = new PortfolioAPI(config);
        this.data = null;
    }

    async init() {
        try {
            // Afficher loader
            this.showLoader();

            // Fetch data
            const response = await this.api.fetchAllData();
            this.data = response.data;

            // Render sections
            this.renderHero();
            this.renderSkills();
            this.renderExperiences();
            this.renderProjects();
            this.renderTestimonials();

            // Hide loader
            this.hideLoader();

            // Init interactions
            this.initScrollAnimations();
            this.initNavigation();

        } catch (error) {
            console.error('Failed to load portfolio:', error);
            this.showError(error);
        }
    }

    renderProjects() {
        const container = document.getElementById('projects-grid');
        const projects = this.data.projects.filter(p => p.status === 'published');

        container.innerHTML = projects.map(project => `
            <div class="project-card" data-categories="${project.categories.join(',')}">
                <img src="${project.featuredImage}" alt="${project.title}">
                <h3>${project.title}</h3>
                <p>${project.shortDescription}</p>
                <div class="tech-tags">
                    ${project.technologies.map(tech => `<span>${tech}</span>`).join('')}
                </div>
                <a href="${project.projectUrl}" target="_blank">View Project</a>
            </div>
        `).join('');
    }

    // ... autres méthodes de rendu
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const app = new PortfolioApp(PORTFOLIO_CONFIG);
    app.init();
});
```

**Tests :**
- Données s'affichent correctement
- Filtres fonctionnent
- Gestion d'erreurs affiche message

---

### Phase 5 : Backend - Améliorations API
**Priorité : MOYENNE** | **Durée estimée : Implémentation directe**

#### T5.1 - Endpoint pour configuration CORS dynamique
**Fichier :** `backend/src/main.ts`

**Amélioration :**
```typescript
app.enableCors({
  origin: (origin, callback) => {
    // Autoriser les domaines enregistrés par l'utilisateur
    const allowedOrigins = [
      'http://localhost:3000',
      'https://zodback.com',
      // + domaines custom des utilisateurs (stockés en BDD)
    ];
    callback(null, true); // Pour l'instant, autoriser tous
  },
  credentials: true
});
```

**Tests :**
- Requêtes cross-origin fonctionnent
- Portfolio externe peut appeler l'API

---

#### T5.2 - Endpoint pour métadonnées utilisateur
**Fichier :** `backend/src/portfolio/portfolio-public.controller.ts`

**Nouvel endpoint :**
```typescript
@Get('v1/public/metadata')
async getPortfolioMetadata(@Req() req) {
  // Retourne les métadonnées pour SEO
  return {
    name: 'John Doe',
    title: 'Full Stack Developer',
    bio: 'Passionate about...',
    avatar: 'https://...',
    socials: {
      github: 'https://github.com/johndoe',
      linkedin: 'https://linkedin.com/in/johndoe',
      twitter: 'https://twitter.com/johndoe'
    },
    seo: {
      title: 'John Doe - Portfolio',
      description: 'Full Stack Developer...',
      keywords: ['developer', 'react', 'nodejs']
    }
  };
}
```

**Tests :**
- Endpoint retourne les bonnes données
- Utilisé pour <head> du portfolio externe

---

### Phase 6 : Tests E2E et Documentation
**Priorité : MOYENNE** | **Durée estimée : Après implémentation**

#### T6.1 - Tests E2E pour le flow complet
**Fichiers :**
- `backend/test/e2e/portfolio-flow.e2e-spec.ts`
- `frontend/cypress/e2e/portfolio.cy.ts`

**Scénarios à tester :**
1. Utilisateur crée un compte
2. Active le module PORTFOLIO pour son projet
3. Ajoute des projets, skills, experiences, testimonials
4. Génère une clé API
5. Sélectionne un template
6. Preview le portfolio
7. Portfolio externe charge les données via API

---

#### T6.2 - Documentation utilisateur
**Fichier :** `docs/portfolio-setup-guide.md`

**Contenu :**
1. Introduction au système portfolio
2. Configuration du projet et activation du module
3. Gestion des données (projets, skills, etc.)
4. Génération de clé API
5. Sélection et personnalisation de template
6. Déploiement du portfolio externe :
   - Sur Vercel
   - Sur Netlify
   - Sur GitHub Pages
7. Troubleshooting

---

## 🗂️ Ordre d'Implémentation Recommandé

```
Semaine 1 : Backend Foundation
├─ T1.1 : Schéma templates ✅
├─ T1.2 : Module templates ✅
├─ T1.3 : Seed templates ✅
└─ T5.1 : CORS ✅

Semaine 2 : Frontend Dashboard
├─ T2.1 : Page principale portfolio ✅
├─ T2.2 : Page gestion templates ✅
├─ T2.3 : Amélioration pages existantes ✅
└─ T2.4 : Lien API Key ✅

Semaine 3 : Portfolio Preview & Externe
├─ T3.1 : Page preview interne ✅
├─ T3.2 : Route dynamique par slug ✅
├─ T4.1 : Structure portfolio externe ✅
├─ T4.2 : API client JS ✅
├─ T4.3 : Template HTML/CSS ✅
└─ T4.4 : JavaScript rendu ✅

Semaine 4 : Polish & Tests
├─ T5.2 : Métadonnées endpoint ✅
├─ T6.1 : Tests E2E ✅
└─ T6.2 : Documentation ✅
```

---

## 🎨 Templates à Créer (3 templates initiaux)

### Template 1 : "Modern Developer" (Default)
- **Style :** Moderne, épuré, tech-focused
- **Couleurs :** Bleu (#3B82F6), Gris foncé (#1E293B)
- **Polices :** Inter
- **Sections :** Hero, About, Skills (grid), Experience (timeline), Projects (grid avec hover effects), Testimonials (carousel), Contact
- **Animations :** Fade-in au scroll, hover effects sur cards

### Template 2 : "Minimalist Designer"
- **Style :** Minimaliste, élégant, beaucoup d'espace blanc
- **Couleurs :** Noir (#000), Blanc (#FFF), Accent Or (#F59E0B)
- **Polices :** Playfair Display (headings), Inter (body)
- **Sections :** Hero fullscreen, About (2 colonnes), Projects (masonry grid), Testimonials (simple quotes), Contact minimal

### Template 3 : "Creative Agency"
- **Style :** Audacieux, coloré, dynamique
- **Couleurs :** Multi-couleurs (gradient), Foncé (#0F172A)
- **Polices :** Poppins
- **Sections :** Hero avec vidéo background, Skills (icon grid), Projects (full-width showcase), Team/About, Testimonials (video), Contact avec map

---

## 🔑 Informations Techniques Importantes

### API Authentication Flow
```
1. User logs into dashboard → JWT token
2. User generates API token → Stored in api_tokens table
3. API token properties:
   - projectId: Link to specific project
   - entities: ['portfolio'] or ['portfolio:projects']
   - permissions: ['read', 'write', 'delete']
   - scope: 'project' (not global)
4. External portfolio uses API token in headers:
   - Authorization: Bearer <token>
   - X-Project-Id: <projectId>
```

### Database Relationships
```
users
  └── projects (1:N)
       └── api_tokens (1:N)
       └── portfolio_projects (1:N)
       └── portfolio_skills (1:N)
       └── portfolio_experiences (1:N)
       └── portfolio_testimonials (1:N)
       └── user_portfolio_templates (1:1)

portfolio_templates (master list)
  └── user_portfolio_templates (user selections)
```

### Public API Response Format
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "title": "E-commerce Platform",
        "slug": "ecommerce-platform",
        "shortDescription": "Full-stack...",
        "description": "Detailed...",
        "featuredImage": "https://...",
        "images": ["https://...", "https://..."],
        "technologies": ["React", "Node.js", "PostgreSQL"],
        "projectUrl": "https://example.com",
        "repositoryUrl": "https://github.com/...",
        "client": "Acme Corp",
        "role": "Lead Developer",
        "startDate": "2023-01-01",
        "endDate": "2023-06-30",
        "status": "published",
        "featured": true,
        "categories": ["Web Development", "E-commerce"]
      }
    ],
    "skills": [...],
    "experiences": [...],
    "testimonials": [...]
  },
  "metadata": {
    "projectId": 1,
    "fetchedAt": "2026-01-16T10:30:00Z",
    "counts": {
      "projects": 12,
      "skills": 24,
      "experiences": 5,
      "testimonials": 8
    }
  }
}
```

---

## 📝 Checklist Finale

Avant de marquer le projet comme terminé, vérifier :

- [ ] ✅ Backend : Tables templates créées
- [ ] ✅ Backend : Endpoints templates fonctionnels
- [ ] ✅ Backend : Seed templates exécuté
- [ ] ✅ Backend : CORS configuré
- [ ] ✅ Frontend : Page principale portfolio
- [ ] ✅ Frontend : Page gestion templates
- [ ] ✅ Frontend : Pages CRUD améliorées
- [ ] ✅ Frontend : Lien rapide API Key
- [ ] ✅ Frontend : Preview portfolio interne
- [ ] ✅ Frontend : Route dynamique par slug
- [ ] ✅ Portfolio externe : Structure créée
- [ ] ✅ Portfolio externe : API client fonctionnel
- [ ] ✅ Portfolio externe : 3 templates HTML/CSS/JS
- [ ] ✅ Portfolio externe : README avec instructions
- [ ] ✅ Tests : Flow complet E2E passant
- [ ] ✅ Documentation : Guide utilisateur complet
- [ ] ✅ Déploiement : Instructions pour Vercel/Netlify/GitHub Pages

---

## 🚀 Commandes pour Démarrer

```bash
# Backend
cd backend
bun install
bun run migration:run
bun run seed:portfolio-templates
bun run dev

# Frontend
cd frontend
bun install
bun run dev

# Portfolio externe (test local)
cd portefolio
python -m http.server 8000
# Ou
npx serve .
```

---

**Auteur :** Kevin (AI Architect Agent)
**Version :** 1.0
**Dernière mise à jour :** 2026-01-16
