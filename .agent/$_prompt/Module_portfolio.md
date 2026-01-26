# Module Portfolio

> **ZodBack Module** | Triple-layer architecture | Event-driven

## Objectif

Portfolio professionnel : Dashboard (admin), Preview (interne), External (HTML/JS standalone déployable).

---

## Architecture

| Layer | Location | Tech |
|-------|----------|------|
| Dashboard | `frontend/app/(dashboard)/portfolio/` | Next.js, React Query |
| Preview | `frontend/app/portfolio-preview/` | Next.js, Tailwind |
| External | `portefolio/` (root) | HTML/CSS/Vanilla JS |
| Backend | `backend/src/portfolio/` | NestJS, Drizzle ORM |

---

## Pages Dashboard (9)

overview, projects, skills, experiences, testimonials, categories, templates, analytics, seo

---

## Endpoints API

**Base interne:** `/api/portfolio/v1` (JwtGuard)
**Base publique:** `/api/portfolio/v1/public` (ApiTokenGuard)

| Endpoint Public | Description |
|-----------------|-------------|
| `/all` | Toutes les données (projects, skills, experiences, testimonials) |
| `/projects` | Projets publiés uniquement |
| `/skills` | Compétences |
| `/experiences` | Expériences |
| `/testimonials` | Témoignages publiés |
| `/seo` | Métadonnées SEO |
| `/seo/structured-data` | JSON-LD |
| `/seo/sitemap.xml` | Sitemap XML |

---

## Tables (14)

**Core:** `portfolio_projects`, `portfolio_categories`, `portfolio_project_categories`, `portfolio_skills`, `portfolio_experiences`, `portfolio_testimonials`

**Templates:** `portfolio_templates`, `user_portfolio_templates`, `portfolio_template_versions`

**SEO:** `portfolio_seo_settings`, `portfolio_og_images`

**Analytics:** `portfolio_analytics`

**Notifications:** `notification_preferences`, `notification_credentials`

---

## Events Émis

| Event | Trigger |
|-------|---------|
| `portfolio.project.published` | Publication d'un projet |
| `portfolio.view.milestone.*` | Paliers vues (100, 500, 1K, 5K, 10K) |
| `portfolio.contact.submitted` | Soumission formulaire contact |
| `portfolio.seo.score.improved` | Amélioration SEO |
| `portfolio.analytics.weekly_report` | Rapport hebdomadaire |

**Channels:** Email, Slack, Discord, Telegram, SMS

---

## Sécurité Tokens

- **Entity:** `'portfolio'`
- **Permissions:** `['read']` uniquement
- **Expiration:** Max 365 jours
- **Stockage:** Hash uniquement (jamais plaintext)

---

## Workflow Utilisateur

1. Ajouter contenu dashboard (2 min)
2. Générer token API (30 sec)
3. Configurer `portefolio/js/config.js` (1 min)
4. Tester localement (1 min)
5. Déployer (Netlify/Vercel/GitHub Pages) (2 min)

---

## Critères de Succès

- [ ] 9 pages CRUD fonctionnelles
- [ ] Génération token en 1 clic
- [ ] Preview temps réel
- [ ] Export bundle standalone
- [ ] Notifications multi-canal
- [ ] SEO optimisé (meta, OG, sitemap)
- [ ] Analytics (vues, engagement)
- [ ] < 10 min workflow end-to-end

---

## Résumé d'Action (immédiat)

- CRUD projets/skills/expériences/témoignages + API publique
- Bundle externe prêt (HTML/JS) + config simple
- SEO de base (OG, sitemap, JSON‑LD) + events `portfolio.project.published`
- Analytics vues/engagement (Python) + notifications (Spring)
- Multi‑tenant: `projectId` obligatoire, RLS activée

## Communication Inter‑Services

- Frontend/Standalone → NestJS (API + tokens projet)
- Spring ← NestJS: poll événements pour notifications/export
- Python analytics orchestré via NestJS (headers internes)
- Aucun accès direct aux tables core depuis services externes

## Roadmap MVP

- P0: CRUD + Public + SEO + Bundle externe + Events
- P1: Templates, analytics dashboard, multi‑canal notifications
- P2: Marketplace de templates, intégrations auto (Social/Blog)
