# Module Social Media

> **ZodBack Module** | Event-driven | API-governed | Multi-project

## Objectif

Gestion réseaux sociaux centralisée : connexion comptes, création contenu, planification, publication auto, analytics. Style Hootsuite/Buffer.

---

## Architecture

| Layer | Location | Tech |
|-------|----------|------|
| Dashboard | `frontend/app/(dashboard)/social-media/` | Next.js, React Query |
| Backend | `backend/src/social-media/` | NestJS, Drizzle ORM |
| Publisher | `spring-services/.../social/` | Spring Boot, Quartz |

**Distribution services:**
- **NestJS:** CRUD comptes, posts, calendrier, OAuth
- **Spring Boot:** Publication planifiée, retry logic, API platforms
- **Python:** Analytics, IA contenu, sentiment analysis

---

## Plateformes Supportées

LinkedIn, Facebook, X (Twitter), Instagram, TikTok, YouTube, Pinterest

---

## Pages Dashboard (10)

overview, accounts, compose, calendar, scheduled, published, inbox, analytics, settings, templates

---

## Endpoints API

**Interne:** `/api/social/v1` (JwtGuard)

| Ressource | Endpoints |
|-----------|-----------|
| Accounts | GET/POST/DELETE `/accounts`, POST `/accounts/:id/refresh` |
| Posts | CRUD `/posts`, POST `/posts/:id/publish` |
| Schedule | POST `/posts/:id/schedule`, GET `/scheduled` |
| Calendar | GET `/calendar?start=...&end=...` |
| Analytics | GET `/analytics/:accountId`, GET `/posts/:id/metrics` |
| Inbox | GET `/inbox`, PATCH `/messages/:id/read` |

---

## Tables (15)

**Accounts:** `social_accounts`, `social_account_tokens`

**Content:** `social_posts`, `social_post_media`, `social_post_platforms`, `social_drafts`

**Scheduling:** `social_scheduled_posts`, `social_publishing_queue`, `social_publish_logs`

**Engagement:** `social_inbox`, `social_comments`, `social_mentions`

**Analytics:** `social_post_metrics`, `social_account_metrics`, `social_analytics_daily`

---

## Events Émis

| Event | Consommateurs |
|-------|---------------|
| `social.post.scheduled` | Spring Boot (queue) |
| `social.post.published` | Analytics, Notifications |
| `social.post.failed` | Notifications, Retry queue |
| `social.mention.received` | Inbox, Notifications |
| `social.metrics.updated` | Analytics dashboard |

---

## Intégrations Inter-Modules

| Source | Event | Cible | Action |
|--------|-------|-------|--------|
| Blog | `post.published` | Social Media | Auto-partage |
| E-Learning | `course.published` | Social Media | Promotion auto |
| Portfolio | `project.published` | Social Media | Showcase |
| Social Media | `post.published` | Analytics | Track engagement |

---

## Workflow Publication

```
1. Compose post (NestJS) → Save draft
2. Schedule/Publish → Event emitted
3. Spring Boot polls event
4. Quartz job at scheduled time
5. API call to platform (LinkedIn, X, etc.)
6. Success → Update status, fetch metrics
7. Failure → Retry queue (3 attempts)
```

---

## OAuth Flows

| Platform | Auth | Scopes principaux |
|----------|------|-------------------|
| LinkedIn | OAuth 2.0 | w_member_social, r_liteprofile |
| Facebook | OAuth 2.0 | pages_manage_posts, pages_read_engagement |
| X/Twitter | OAuth 2.0 | tweet.read, tweet.write |
| Instagram | OAuth 2.0 (FB) | instagram_basic, instagram_content_publish |
| TikTok | OAuth 2.0 | video.upload, video.list |

---

## Sécurité

- **Entity:** `'social-media'`
- **Permissions:** `['read', 'write', 'publish', 'analytics']`
- **OAuth tokens:** Encrypted at rest (AES-256)
- **Refresh:** Auto-refresh avant expiration

---

## Critères de Succès

- [ ] Connexion OAuth 7 plateformes
- [ ] Compose multi-plateforme
- [ ] Calendrier éditorial visuel
- [ ] Publication planifiée fiable
- [ ] Retry automatique (3 tentatives)
- [ ] Analytics par post et compte
- [ ] Inbox centralisé
- [ ] Events vers Blog/E-Learning

---

## Résumé d'Action (immédiat)

- Connexion comptes (OAuth) + stockage chiffré
- Compose/schedule/publish multi‑plateforme
- Queue de publication (Spring) + retry backoff
- Analytics engagement (Python) + inbox mentions/réponses
- Multi‑tenant: `projectId` obligatoire, RLS activée

## Communication Inter‑Services

- Frontend → NestJS (JWT + `x-project-id`)
- Spring ← NestJS: poll événements pour scheduling et publication
- Python analytics via NestJS (headers internes); jamais direct Spring → Python
- Événements transverses pour auto‑partage depuis Blog/Portfolio/E‑Learning

## Roadmap MVP

- P0: Accounts + Compose + Schedule + Publish + Events
- P1: Calendrier éditorial, inbox centralisée, analytics dashboards
- P2: Intégrations CRM et règles avancées d'orchestration
