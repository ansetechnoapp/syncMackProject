# Module Blog

> **ZodBack Module** | Event-driven | API-governed | Multi-project

## Objectif

Système de blogging complet avec CMS, catégories, tags, SEO, commentaires et analytics. API publique pour frontends externes.

---

## Architecture

| Layer | Location | Tech |
|-------|----------|------|
| Dashboard | `frontend/app/(dashboard)/blog/` | Next.js, React Query |
| Preview | `frontend/app/blog-preview/` | Next.js |
| External | `blog/` (root) | HTML/CSS/Vanilla JS |
| Backend | `backend/src/blog/` | NestJS, Drizzle ORM |

**Distribution services:**
- **NestJS:** CRUD articles, catégories, tags, commentaires, SEO
- **Spring Boot:** Notifications, export PDF, scheduling
- **Python:** Analytics, recommandations IA, traitement images

---

## Pages Dashboard (10)

overview, posts, categories, tags, comments, authors, templates, analytics, seo, media

---

## Endpoints API

**Interne:** `/api/blog/v1` (JwtGuard)
**Public:** `/api/blog/v1/public` (ApiTokenGuard, read-only)

| Ressource | Endpoints |
|-----------|-----------|
| Posts | CRUD `/posts`, GET `/posts/:slug` |
| Categories | CRUD `/categories` |
| Tags | CRUD `/tags` |
| Comments | CRUD `/comments`, GET `/posts/:id/comments` |
| Media | POST `/media/upload`, GET `/media` |
| Public | GET `/public/posts`, `/public/posts/:slug`, `/public/categories` |

---

## Tables (12)

**Core:** `blog_posts`, `blog_categories`, `blog_tags`, `blog_post_tags`, `blog_post_categories`

**Interaction:** `blog_comments`, `blog_comment_reactions`, `blog_views`, `blog_likes`

**Media:** `blog_media`, `blog_featured_images`

**SEO:** `blog_seo_settings`

---

## Events Émis

| Event | Consommateurs |
|-------|---------------|
| `blog.post.published` | Social Media (auto-post), Notifications, Analytics |
| `blog.post.updated` | Search indexing, Cache invalidation |
| `blog.comment.created` | Notifications auteur |
| `blog.view.tracked` | Analytics |
| `blog.milestone.reached` | Notifications (100/500/1K/5K vues) |

---

## Intégrations Inter-Modules

| Source | Event | Cible | Action |
|--------|-------|-------|--------|
| Blog | `post.published` | Social Media | Auto-partage réseaux |
| Blog | `post.published` | Notifications | Email abonnés |
| E-Learning | `lesson.completed` | Blog | Débloquer contenu premium |
| Payments | `payment.completed` | Blog | Accès premium |

---

## Sécurité Tokens

- **Entity:** `'blog'`
- **Permissions public:** `['read']`
- **Permissions admin:** `['read', 'write', 'delete']`
- **Expiration:** Max 365 jours

---

## Critères de Succès

- [ ] CRUD articles avec rich editor (TipTap)
- [ ] Catégories et tags hiérarchiques
- [ ] Commentaires avec modération
- [ ] SEO auto (meta, OG, sitemap, RSS)
- [ ] Analytics (vues, temps lecture)
- [ ] API publique pour frontends externes
- [ ] Events inter-modules fonctionnels
- [ ] Multi-auteur avec rôles

---

## Résumé d'Action (immédiat)

- CRUD posts/categories/tags/commentaires + API publique prête
- SEO de base (meta, sitemap, OG) + events `blog.post.published`
- Analytics vues/lecture via Python
- Notifications (Spring) sur publication/commentaire
- Multi-tenant: `projectId` obligatoire, RLS activée

## Communication Inter‑Services

- Frontend → NestJS (JWT + `x-project-id`)
- NestJS → Spring: dev push, prod pull `/api/events/v1/poll` (token interne)
- NestJS → Python analytics (token interne + `X-Project-Id`, `X-Request-Id`)
- Événements comme source unique; aucune dépendance directe

## Roadmap MVP

- P0: CRUD + SEO + Public + Events
- P1: Modération, templates, analytics dashboard
- P2: Rôles/auteurs, export PDF, auto‑partage multi-plateformes
