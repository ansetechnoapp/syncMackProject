# Module Workspace

> **ZodBack Module** | Event-driven | API-governed | Multi-project
>
> Comparable à: Notion, Coda, Confluence, Slite

## Objectif

Espace de travail collaboratif : éditeur block-based, bases de données avec vues multiples, collaboration temps réel, templates, assistant IA.

---

## Architecture

| Layer | Location | Tech |
|-------|----------|------|
| Dashboard | `frontend/app/(dashboard)/workspace/` | Next.js, TipTap/BlockNote |
| Backend | `backend/src/workspace/` | NestJS, Drizzle ORM |
| Real-time | `spring-services/.../workspace/` | Spring Boot, Y.js |
| AI/Search | `python-services/.../workspace/` | Python, MeiliSearch |

**Distribution services:**
- **NestJS:** CRUD pages, blocks, databases, records, permissions
- **Spring Boot:** WebSocket hub (Y.js sync), export PDF/HTML
- **Python:** AI assistant, search indexing, import Notion/Markdown

---

## Pages Dashboard (15)

home, page-editor, database, all-pages, favorites, shared, trash, templates, search, settings, members, import, export, analytics, public-hub

---

## Endpoints API

**Interne:** `/api/workspace/v1` (JwtGuard)
**Public:** `/api/workspace/v1/public` (ApiTokenGuard)

| Ressource | Endpoints |
|-----------|-----------|
| Pages | CRUD `/pages`, GET `/pages/:id`, POST `/pages/:id/duplicate` |
| Blocks | CRUD `/pages/:id/blocks`, POST `/blocks/batch` |
| Databases | CRUD `/databases`, GET `/databases/:id/schema` |
| Records | CRUD `/databases/:id/records`, filters/sorts |
| Views | CRUD `/databases/:id/views` (table, board, calendar, gallery, list, timeline) |
| Comments | CRUD `/comments`, POST `/comments/:id/resolve` |
| Sharing | GET/POST `/pages/:id/sharing`, POST `/pages/:id/sharing/public` |
| Search | GET `/search?q=...` |

---

## Tables (22)

**Core:** `workspaces`, `workspace_pages`, `workspace_blocks`

**Database:** `workspace_databases`, `workspace_database_properties`, `workspace_database_records`, `workspace_database_views`

**Versioning:** `workspace_page_versions`

**Collaboration:** `workspace_comments`, `workspace_comment_reactions`, `workspace_sharing`, `workspace_members`

**Organization:** `workspace_favorites`, `workspace_recent`, `workspace_templates`, `workspace_synced_blocks`, `workspace_integrations`

**Spring:** `workspace_sync_sessions`, `workspace_export_jobs`

---

## Block Types (40+)

| Catégorie | Types |
|-----------|-------|
| **Text** | paragraph, heading 1/2/3, quote, callout, code, bulleted/numbered/todo/toggle list |
| **Media** | image, video, audio, file, bookmark, embed (YouTube, Figma, Miro) |
| **Database** | inline_database, linked_database, database_view |
| **Advanced** | table, columns, divider, table_of_contents, synced_block |
| **Embed** | math (LaTeX), mermaid, code_block (50+ langs), tweet, gist |
| **AI** | ai_writer, ai_summary, ai_translate |

---

## Database Views (6)

| View | Usage |
|------|-------|
| Table | Spreadsheet, data management |
| Board | Kanban, project tasks |
| Calendar | Scheduling, content calendar |
| Gallery | Portfolio, product catalog |
| List | Simple tasks, notes |
| Timeline | Gantt, project planning |

---

## Events Émis

| Event | Consommateurs |
|-------|---------------|
| `workspace.page.created` | Analytics, Search index |
| `workspace.page.updated` | Version history, Cache |
| `workspace.page.shared` | Notifications |
| `workspace.comment.created` | Notifications |
| `workspace.presence.joined` | Real-time UI |

---

## Real-Time (Y.js/CRDT)

```
Browser A ──WebSocket──┐
Browser B ──WebSocket──┼──► Spring Boot ──► Redis Pub/Sub
Browser C ──WebSocket──┘    Y.js Server
                              │
                              ▼
                           NestJS (persistence)
```

---

## AI Assistant (Python)

- Continue writing
- Improve/shorten/lengthen
- Change tone
- Summarize
- Translate (50+ langues)
- Extract action items
- Brainstorm

---

## Sécurité

- **Entity:** `'workspace'`
- **Permissions page:** view, comment, edit, full
- **Héritage:** Child pages inherit parent permissions
- **Public sharing:** Custom slug, password, expiration

---

## Critères de Succès

- [ ] Block editor 40+ types
- [ ] Pages hiérarchiques (infinite nesting)
- [ ] Databases avec 6 vues
- [ ] Real-time collaboration (cursors)
- [ ] AI writing assistant
- [ ] Full-text search (<100ms)
- [ ] Import/Export (Notion, Markdown, PDF)
- [ ] Version history avec rollback
 
---

## Inter-Service Communication

**Principles**
- NestJS persists and governs; Spring Boot provides real-time sync; Python powers AI and search.
- All flows carry `projectId` and correlate via `eventId`/`X-Request-Id`.

**Contracts**
- WebSocket (Spring Boot):
  - `ws://{NEXT_PUBLIC_SPRING_WS_HOST}/ws/events?projectId={id}` for domain events and presence.
  - Broadcast Y.js updates; periodic persistence via NestJS.
- Internal APIs (Spring → Nest):
  - Headers: `Authorization: Bearer {NESTJS_INTERNAL_TOKEN}`, `X-Project-Id`.
- Python services (via NestJS):
  - Headers: `Authorization: Bearer {PYTHON_INTERNAL_TOKEN}`, `X-Project-Id`, `X-Request-Id`.
- Frontend → NestJS:
  - Axios client using `NEXT_PUBLIC_API_URL`; auto headers `Authorization`, `x-project-id`.

**Security Rules**
- Reject default tokens in production; enforce strong secrets.
- Validate `projectId` for all workspace operations; sanitize public sharing.

---

## MVP Roadmap

**P0 – Foundations**
- NestJS: Pages/Blocks CRUD, databases, records, basic sharing, search index stub.
- Spring Boot: WebSocket hub with Y.js, presence, periodic persistence.
- Python: AI assistant endpoints skeleton, indexing pipeline skeleton.
- Frontend: Block editor scaffold, database table view, presence indicators.

**P1 – Productivity**
- Multiple database views (board/calendar/gallery/list/timeline).
- Templates system, version history, comments & reactions.
- Import (Markdown/Notion basic), export (PDF/HTML/Markdown).
- AI writing tools (continue, improve, summarize, translate).

**P2 – Collaboration & Scale**
- Advanced permissions, public hub with custom domains.
- Offline support and robust CRDT persistence.
- Full-text search with filters; analytics dashboards.

---

## Testing & Observability

- Unit: block operations, formulas, database properties.
- Integration: WebSocket sync across multiple clients; persistence correctness.
- E2E: collaborative edit session; import/export flows.
- Metrics: WS connections, update rate, persistence latency, search index lag.
- Logs: event processing, sync sessions, export jobs; correlate with `eventId`.

---

## Security & Compliance

- RLS by `project_id` on all workspace tables.
- Strict permission checks for sharing and public links; password protection and expiry.
- Sanitize embedded content; never store access tokens unencrypted.
