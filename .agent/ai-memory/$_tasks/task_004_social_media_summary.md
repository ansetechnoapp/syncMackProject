# Social Media Management - Executive Summary

**Date:** 2026-01-18
**Task:** 004
**Status:** Planning Complete
**Effort:** 86-112 hours (11-14 days, 1 developer)

---

## Vision

Module permettant la gestion multi-plateforme de réseaux sociaux (LinkedIn, Facebook, X/Twitter, Instagram) avec :
- Connexion OAuth multi-comptes
- Publication programmée et immédiate
- Retry automatique en cas d'échec
- Analytics basiques et avancés
- AI content generation (premium)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Frontend)                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS (Cerveau - Port 3013)                  │
├─────────────────────────────────────────────────────────────────┤
│ • OAuth Flows (LinkedIn, Facebook, X, Instagram)                │
│ • CRUD Posts (draft, scheduled, published)                      │
│ • Token Encryption (AES-256)                                    │
│ • Event Publishing (social.post.scheduled)                      │
│ • Analytics API (retrieve metrics)                              │
│ • Media Upload (S3/MinIO)                                       │
├─────────────────────────────────────────────────────────────────┤
│ Database: zodback_core                                          │
│ Tables: social_accounts, social_posts, social_media_library,   │
│         social_analytics, social_templates                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ Events (Pull/Push)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Spring Boot UNWE (Muscles - Port 3020)          │
├─────────────────────────────────────────────────────────────────┤
│ • Event Polling (GET /api/events/v1/poll)                       │
│ • Quartz Scheduler (scheduled jobs)                             │
│ • Publishers (LinkedIn, Facebook, Twitter, Instagram)           │
│ • Retry Queue (exponential backoff: 5min, 15min, 1h)            │
│ • Notifications (Email, Push, SMS via UNWE)                     │
├─────────────────────────────────────────────────────────────────┤
│ Database: zodback_spring                                        │
│ Tables: social_publish_jobs, social_retry_queue,                │
│         social_publish_logs                                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ API Calls
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External APIs                               │
├─────────────────────────────────────────────────────────────────┤
│ • LinkedIn API v2 (ugcPosts)                                    │
│ • Meta Graph API (Facebook/Instagram)                           │
│ • X API v2 (tweets)                                             │
│ • Instagram Graph API (media)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Events

| Event | Emitter | Consumers | Payload |
|-------|---------|-----------|---------|
| `social.account.connected` | NestJS | Spring Boot (email), Analytics | `{ accountId, platform, userId, projectId }` |
| `social.post.scheduled` | NestJS | Spring Boot (Quartz job) | `{ postId, scheduledAt, platforms, content }` |
| `social.post.publishing` | Spring Boot | NestJS (update status) | `{ postId, platforms, projectId }` |
| `social.post.published` | Spring Boot | NestJS (update), UNWE (email) | `{ postId, results, publishedAt }` |
| `social.post.failed` | Spring Boot | NestJS (update), UNWE (email) | `{ postId, errors, failedAt }` |
| `payment.subscription.activated` | Payments | Social Media (unlock premium) | `{ userId, planCode, projectId }` |

---

## Database Schema (NestJS)

### social_accounts
```sql
id, project_id, user_id, platform, platform_account_id, platform_account_name,
access_token (ENCRYPTED), refresh_token (ENCRYPTED), token_expires_at,
scopes, metadata, status, created_at, updated_at
```

### social_posts
```sql
id, project_id, user_id, title, content, platforms, account_ids,
media_ids, media_urls, hashtags, mentions,
scheduled_at, published_at, status,
platform_results, views_count, likes_count, comments_count, shares_count,
created_at, updated_at
```

### social_media_library
```sql
id, project_id, user_id, filename, original_filename, mime_type, file_size,
storage_provider, storage_path, public_url,
width, height, duration, alt_text, tags, usage_count, created_at
```

### social_analytics
```sql
id, project_id, post_id, platform, external_post_id,
impressions, reach, views, likes, comments, shares, clicks,
engagement_rate, snapshot_at, created_at
```

---

## API Endpoints (NestJS)

**Base:** `/api/social-media/v1`

### Accounts
- `POST /accounts/connect` - Initiate OAuth flow
- `GET /accounts/callback` - OAuth callback
- `GET /accounts` - List connected accounts
- `DELETE /accounts/:id` - Disconnect account

### Posts
- `POST /posts` - Create post (draft/scheduled)
- `GET /posts` - List posts (filters: status, platform)
- `GET /posts/:id` - Get post details
- `PUT /posts/:id` - Update post (draft only)
- `DELETE /posts/:id` - Delete post
- `POST /posts/:id/publish` - Publish immediately
- `POST /posts/:id/cancel` - Cancel scheduled post

### Analytics
- `GET /analytics/:postId` - Post metrics
- `GET /analytics/overview` - Dashboard overview

### Media (P1)
- `POST /media/upload` - Upload image/video
- `GET /media` - List media library
- `DELETE /media/:id` - Delete media

### Templates (P1)
- `POST /templates` - Create template
- `GET /templates` - List templates
- `POST /posts/from-template` - Generate post from template

---

## Rollout Plan

### Phase 1: Foundations (P0) - 8-10h
- [ ] DB Schema + RLS
- [ ] OAuth LinkedIn
- [ ] Token encryption (AES-256)
- [ ] Event: `social.account.connected`
- [ ] Tests (unit, integration)

### Phase 2: Publishing (P0) - 10-12h
- [ ] CRUD Posts (NestJS)
- [ ] Event: `social.post.scheduled`
- [ ] Quartz Scheduler (Spring Boot)
- [ ] LinkedIn Publisher
- [ ] Event: `social.post.published`
- [ ] Tests (API, publishing)

### Phase 3: Retry Logic (P0) - 6-8h
- [ ] Retry Queue (Spring Boot)
- [ ] Exponential backoff (5min, 15min, 1h)
- [ ] Event: `social.post.failed`
- [ ] Tests (rate limit, network errors)

### Phase 4: Multi-platform (P0) - 8-10h
- [ ] OAuth Facebook, Twitter
- [ ] Publishers (Facebook, Twitter)
- [ ] Multi-platform publishing
- [ ] Tests (simultaneous publishing)

### Phase 5: Analytics (P0) - 6-8h
- [ ] Metrics retrieval (APIs)
- [ ] Analytics endpoints
- [ ] Dashboard sync
- [ ] Tests

**Total P0 (MVP): 38-48 hours**

### Phase 6-9: Advanced Features (P1) - 16-24h
- [ ] Media Library (S3/MinIO)
- [ ] Templates & Hashtag suggestions
- [ ] Notifications UNWE
- [ ] Instagram support

### Phase 10-13: Premium Features (P2) - 32-40h
- [ ] AI Content Generation (GPT-4)
- [ ] Social Listening
- [ ] Workflow Approbation
- [ ] Advanced Analytics

**Total: 86-112 hours**

---

## Compliance Checklist

### Multi-tenancy
- [x] `project_id` obligatoire dans toutes les tables
- [x] RLS PostgreSQL activé
- [x] Validation `project_id` avant traitement Spring Boot
- [x] Isolation stricte comptes sociaux par projet

### Event-driven
- [x] Aucun appel direct NestJS ↔ Spring Boot
- [x] Communication uniquement par événements
- [x] Format standard `DomainEvent<T>`
- [x] Idempotence garantie (déduplication par `eventId`)

### Security
- [x] Tokens OAuth chiffrés AES-256
- [x] Refresh tokens automatique
- [x] Révocation possible par user
- [x] API tokens validés (NestJS)

### Spring Boot UNWE
- [x] Aucune table `users`, `projects`, `payments` en Spring DB
- [x] Polling events (modèle Pull)
- [x] Validation `project_id` avant traitement
- [x] Aucune modification données Core NestJS
- [x] Base de données séparée (`zodback_spring`)

### Rate Limiting
- [x] Respect limites APIs (LinkedIn 100/j, Twitter 300/3h)
- [x] Queue avec throttling
- [x] Retry avec exponential backoff

### Tests
- [x] Unitaires (OAuth, encryption, publishers)
- [x] Intégration (API endpoints, event publishing)
- [x] E2E (OAuth flow, post lifecycle)
- [x] Conformité (multi-tenancy, event-driven, idempotence)

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rate limiting APIs | High | Queue + throttling + retry exponential backoff |
| Token expiration | Medium | Auto-refresh + alerts (7 days before) |
| OAuth complexity | Medium | Proven libraries (Passport.js) + E2E tests |
| S3 storage costs | Medium | Image compression + quotas + CDN |
| APIs deprecation | High | API versioning + monitoring changelogs |
| Spring Boot dependency | Medium | NestJS works standalone (basic notifications) |

---

## Success Criteria

### MVP (P0)
- [ ] User can connect LinkedIn, Facebook, Twitter accounts
- [ ] User can create multi-platform post
- [ ] User can schedule publication
- [ ] Auto-publish via Quartz (Spring Boot)
- [ ] Auto-retry on failure (rate limit, network error)
- [ ] Basic metrics displayed (views, likes, comments, shares)

### Technical
- [ ] Multi-tenancy strict (project isolation)
- [ ] Event-driven pure (no direct calls)
- [ ] RLS enabled on all `social_*` tables
- [ ] Tokens encrypted AES-256
- [ ] Idempotence (event replay safe)
- [ ] E2E tests cover full flow

### Performance
- [ ] LinkedIn publish < 5 seconds
- [ ] Event polling latency < 1 second
- [ ] Analytics dashboard load < 2 seconds

---

## Next Steps

1. **Validate plan** with team
2. **Setup dev environment**:
   - Create LinkedIn Developer app
   - Create Facebook/Meta app
   - Create Twitter Developer account
   - Configure OAuth redirect URLs
3. **Start Phase 1** (Foundations)
4. **Iterate** based on user feedback

---

**Document:** `task_004_social_media_implementation.md`
**Location:** `.agent/ai-memory/$_tasks/`
**Architect:** Kevin
**Status:** Ready for Implementation
