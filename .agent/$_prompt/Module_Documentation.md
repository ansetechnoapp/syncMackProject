# Module Documentation

> **ZodBack Module** | Event-driven | API-governed | Multi-project

## Objectif

Plateforme de documentation technique : espaces, sections, pages avec versioning, recherche full-text, export multi-format. Style GitBook/Notion.

---

## Architecture

| Layer | Location | Tech |
|-------|----------|------|
| Dashboard | `frontend/app/(dashboard)/docs/` | Next.js, React Query |
| Public Portal | `frontend/app/docs-portal/` | Next.js, SSG |
| External | `docs-standalone/` | HTML/CSS/JS |
| Backend | `backend/src/documentation/` | NestJS, Drizzle ORM |

**Distribution services:**
- **NestJS:** CRUD espaces, pages, versioning, permissions
- **Spring Boot:** Export PDF/HTML, notifications, heavy jobs
- **Python:** Search indexing (MeiliSearch), analytics, IA suggestions

---

## Pages Dashboard (12)

overview, spaces, pages, categories, versions, search, analytics, api-docs, templates, settings, export, team

---

## Endpoints API

**Interne:** `/api/docs/v1` (JwtGuard)
**Public:** `/api/docs/v1/public` (ApiTokenGuard)

| Ressource | Endpoints |
|-----------|-----------|
| Spaces | CRUD `/spaces` |
| Pages | CRUD `/spaces/:id/pages`, GET `/pages/:slug` |
| Versions | GET `/pages/:id/versions`, POST `/pages/:id/versions/:v/restore` |
| Search | GET `/search?q=...` |
| Export | POST `/pages/:id/export/:format` |
| Public | GET `/public/spaces/:slug`, `/public/pages/:slug` |

---

## Tables (12)

**Core:** `doc_spaces`, `doc_pages`, `doc_categories`, `doc_page_categories`

**Versioning:** `doc_page_versions`, `doc_page_history`

**Collaboration:** `doc_collaborators`, `doc_comments`, `doc_suggestions`

**Search/SEO:** `doc_search_index`, `doc_seo_settings`

**Analytics:** `doc_analytics`

---

## Events Émis

| Event | Consommateurs |
|-------|---------------|
| `docs.page.published` | Search index, Notifications |
| `docs.page.updated` | Version history, Cache invalidation |
| `docs.space.created` | Analytics |
| `docs.comment.created` | Notifications auteur |
| `docs.export.completed` | Notifications, Storage |

---

## Intégrations Inter-Modules

| Source | Event | Cible | Action |
|--------|-------|-------|--------|
| Docs | `page.published` | Search | Index MeiliSearch |
| Docs | `page.published` | Notifications | Email subscribers |
| Blog | `post.published` | Docs | Link related |
| E-Learning | `course.published` | Docs | Generate docs |

---

## Fonctionnalités Clés

- **Versioning:** Historique complet, comparaison diff, rollback
- **Search:** Full-text MeiliSearch, filtres, highlighting
- **Export:** PDF, HTML, Markdown, DOCX
- **Collaboration:** Commentaires, suggestions, reviews
- **SEO:** Meta auto, sitemap, structured data
- **API Docs:** Génération OpenAPI/Swagger

---

## Sécurité Tokens

- **Entity:** `'documentation'`
- **Permissions public:** `['read']`
- **Permissions editor:** `['read', 'write']`
- **Permissions admin:** `['read', 'write', 'delete', 'publish']`

---

## Critères de Succès

- [ ] CRUD espaces/pages hiérarchiques
- [ ] Versioning avec historique complet
- [ ] Rich editor Markdown + blocks
- [ ] Search full-text rapide (<100ms)
- [ ] Export multi-format
- [ ] Collaboration (comments, reviews)
- [ ] SEO optimisé
- [ ] API publique pour portails externes

---

## Résumé d'Action (immédiat)

- CRUD espaces/pages + versioning + API publique prête
- Search full‑text (Python) + events `docs.page.published`
- Export PDF/HTML de base (Spring)
- Permissions et partage public avec slug/expiration
- Multi‑tenant: `projectId` obligatoire, RLS activée

## Communication Inter‑Services

- Frontend → NestJS (JWT + `x-project-id`)
- Spring ← NestJS: pull `/api/events/v1/poll` (token interne)
- Python indexation via NestJS (headers internes)
- Aucune invocation directe inter‑modules; tout passe par événements/API

## Roadmap MVP

- P0: CRUD + Versioning + Search + Export
- P1: Collaboration (comments/suggestions), templates, analytics
- P2: API Docs avancée, intégrations transverses (Blog/E‑Learning)
