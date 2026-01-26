# Task 004 - Social Media Management Module - Plan d'Architecture Détaillé

**Date de création:** 2026-01-18
**Architecte:** Kevin
**Version:** 1.0
**Statut:** Planning Complete
**Priorité:** P4 (Modules Produits Prioritaires)
**Estimation:** 35-45 heures

---

## EXECUTIVE SUMMARY

Le module **Social Media Management** est un module Produit permettant la gestion multi-plateforme de réseaux sociaux (LinkedIn, Facebook, X/Twitter, Instagram). Il respecte strictement l'architecture event-driven de ZodBack avec :

- **NestJS** : OAuth, gestion des comptes, création/scheduling de posts, analytics
- **Spring Boot UNWE** : Publication asynchrone (Quartz jobs), retry logic, notifications
- **Python** (optionnel P2)** : AI content generation, social listening, analytics avancés

**Conformité garantie :**
- Multi-tenancy strict (`project_id` obligatoire)
- Event-driven pur (aucun appel direct inter-modules)
- API versionnée `/api/social-media/v1`
- RLS PostgreSQL systématique
- Aucune duplication du Core dans Spring Boot

---

## 1. ANALYSE & POSITIONNEMENT

### 1.1 Classification du module

**Type : Module Produit**

**Justification selon les règles ZodBack :**

Conformément à la charte technique, ce module est classé **Produit** car :

1. **Il apporte de la valeur métier visible** : Publication automatisée sur les réseaux sociaux
2. **Il est optionnel** : Un projet peut fonctionner sans ce module
3. **Il ne contient aucune logique plateforme** : Pas d'authentification, pas de gestion de projets, pas de paiements
4. **Il peut être activé/désactivé par projet** : Via `project_modules` ou templates
5. **Il émet des événements consommables** : Autres modules peuvent réagir aux publications

**Position dans la hiérarchie :**
- **P4 - Modules produits prioritaires** (Roadmap officielle)
- Comparable à : `ecommerce`, `elearning`, `blog`, `portfolio`
- Dépend de : `projects`, `auth`, `tokens`, `events`, `payments` (Core)

### 1.2 Dépendances autorisées

**Modules Core autorisés :**
- `projects` : Isolation multi-tenant obligatoire
- `auth` : Validation des utilisateurs (qui connecte ses comptes sociaux)
- `tokens` : Clés API pour accès aux endpoints
- `events` : Publication d'événements pour orchestration
- `payments` : Écoute de `payment.subscription.activated` pour débloquer fonctionnalités premium

**Modules Transverses autorisés :**
- `notifications` (via UNWE Spring Boot) : Alertes succès/échec de publication
- `analytics` (Python) : Métriques avancées (optionnel P2)

**Contraintes strictes :**
- ❌ AUCUN appel direct à d'autres modules produits (ecommerce, blog, etc.)
- ❌ AUCUNE logique de paiement dans le module (délégation à `payments`)
- ❌ AUCUNE modification du Core NestJS pour ce module
- ✅ Consommation d'événements uniquement
- ✅ Exposition d'API via `/api/social-media/v1`

### 1.3 Décomposition fonctionnelle

**Sous-domaines identifiés :**

| Sous-domaine | Responsable | Justification |
|--------------|-------------|---------------|
| **OAuth & Connexion comptes** | NestJS | Gestion des tokens sensibles, flux OAuth |
| **Création de posts** | NestJS | CRUD, validation, stockage BDD |
| **Scheduling** | NestJS → Spring Boot | NestJS planifie, Spring exécute via Quartz |
| **Publication multi-plateforme** | Spring Boot | Appels APIs externes lourds (LinkedIn, Facebook, X) |
| **Retry Logic** | Spring Boot | Exponential backoff, gestion erreurs rate-limit |
| **Analytics basiques** | NestJS | Récupération métriques via APIs sociales |
| **Notifications** | Spring Boot UNWE | Email/Push pour succès/échec de publication |
| **Bibliothèque média** | NestJS | Upload S3/MinIO, gestion fichiers |
| **AI Content Generation (P2)** | Python | GPT-4 intégration, prompts optimisés |
| **Social Listening (P2)** | Python | Monitoring mentions, sentiment analysis |
| **Workflow d'approbation (P2)** | Spring Boot | Validation multi-niveaux, state machine |

**Répartition NestJS vs Spring Boot vs Python :**

**NestJS (Cerveau - Autorité finale) :**
- Gestion des comptes sociaux (`social_accounts`)
- CRUD des posts (`social_posts`)
- OAuth flows (LinkedIn, Facebook, X, Instagram)
- Validation des permissions (qui peut publier quoi)
- Émission d'événements (`social.post.scheduled`, `social.post.published`)
- API publique exposée aux clients

**Spring Boot UNWE (Muscles - Exécution) :**
- Polling des événements NestJS (`GET /api/events/v1/poll?service=spring-unwe`)
- Jobs Quartz pour publication programmée
- Publishers concrets (appels APIs LinkedIn, Facebook, X, Instagram)
- Retry queue avec exponential backoff
- Notifications multi-canaux (email, push, SMS)
- Logs de publication détaillés

**Python (Analyste - Intelligence) - P2 uniquement :**
- AI content generation (GPT-4)
- Social listening (monitoring hashtags, mentions)
- Sentiment analysis des commentaires
- Analytics avancés (ROI, engagement patterns, best times to post)

**Justification de chaque choix :**

1. **NestJS pour OAuth** : Tokens sensibles, sécurité critique, autorité finale
2. **Spring Boot pour Quartz** : Scheduling robuste, retry natif, intégrations Java
3. **Spring Boot pour Publishers** : Librairies Java matures (LinkedIn SDK, Meta Graph API), gestion connexions HTTP
4. **Spring Boot pour Notifications** : UNWE déjà existant (Thymeleaf, SMTP, Firebase)
5. **Python pour AI** : Écosystème ML/NLP, OpenAI SDK, Hugging Face

---

## 2. ARCHITECTURE BASE DE DONNÉES

### 2.1 Schéma NestJS (zodback_core)

**Principe fondamental :** Toutes les tables doivent inclure `project_id` avec RLS activé.

#### Table : `social_accounts`

Stockage des comptes sociaux connectés par projet.

```typescript
export const socialAccounts = pgTable(
  'social_accounts',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    platform: text('platform').notNull(), // linkedin, facebook, twitter, instagram
    platformAccountId: text('platform_account_id').notNull(), // ID externe de l'utilisateur sur la plateforme
    platformAccountName: text('platform_account_name'), // @username ou nom d'affichage

    // OAuth tokens (ENCRYPTED at application level before storage)
    accessToken: text('access_token').notNull(), // Encrypted via AES-256
    refreshToken: text('refresh_token'), // Encrypted (si disponible)
    tokenExpiresAt: timestamp('token_expires_at'),

    scopes: jsonb('scopes').default([]), // ['r_basicprofile', 'w_member_social']
    metadata: jsonb('metadata').default({}), // { profilePicture, followerCount, etc. }

    status: text('status').notNull().default('active'), // active, expired, revoked, error
    lastSyncedAt: timestamp('last_synced_at'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    unique('social_accounts_project_platform_account').on(
      table.projectId,
      table.platform,
      table.platformAccountId
    ),
    index('social_accounts_project_id_idx').on(table.projectId),
    index('social_accounts_user_id_idx').on(table.userId),
    index('social_accounts_status_idx').on(table.status),
  ]
);
```

**Indexes obligatoires :**
- `project_id` : Isolation multi-tenant
- `user_id` : Recherche par utilisateur
- `status` : Filtrage comptes actifs/expirés
- Unique constraint : Un compte plateforme = un seul lien par projet

**RLS PostgreSQL :**
```sql
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_accounts_isolation ON social_accounts
  USING (project_id = current_setting('app.current_project_id')::int);
```

**Sécurité tokens :**
- Chiffrement AES-256 dans le service avant insertion
- Déchiffrement uniquement au moment de l'utilisation (publication)
- Rotation automatique via refresh tokens
- Révocation possible par user

---

#### Table : `social_posts`

Posts programmés ou publiés sur les réseaux sociaux.

```typescript
export const socialPosts = pgTable(
  'social_posts',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    title: text('title'), // Titre interne (non publié)
    content: text('content').notNull(), // Contenu du post (limite 3000 caractères)

    // Multi-plateforme
    platforms: jsonb('platforms').notNull().default([]), // ['linkedin', 'twitter', 'facebook']
    accountIds: jsonb('account_ids').notNull().default([]), // [42, 43] - Références vers social_accounts.id

    // Médias
    mediaIds: jsonb('media_ids').default([]), // [123, 124] - Références vers social_media_library.id
    mediaUrls: jsonb('media_urls').default([]), // URLs publiques après upload

    // Hashtags & Mentions
    hashtags: jsonb('hashtags').default([]), // ['#nodejs', '#ai']
    mentions: jsonb('mentions').default([]), // ['@user123']

    // Scheduling
    scheduledAt: timestamp('scheduled_at'), // null = brouillon ou immédiat
    publishedAt: timestamp('published_at'), // Timestamp réel de publication

    // Status
    status: text('status').notNull().default('draft'),
    // draft, scheduled, publishing, published, failed, cancelled

    // Results par plateforme
    platformResults: jsonb('platform_results').default({}),
    // {
    //   linkedin: { status: 'published', externalId: 'urn:li:share:123', publishedAt: '...' },
    //   twitter: { status: 'failed', error: 'Rate limit exceeded' }
    // }

    // Analytics (mise à jour périodique)
    viewsCount: integer('views_count').default(0),
    likesCount: integer('likes_count').default(0),
    commentsCount: integer('comments_count').default(0),
    sharesCount: integer('shares_count').default(0),
    lastAnalyticsSync: timestamp('last_analytics_sync'),

    metadata: jsonb('metadata').default({}), // { template_id, campaign_id, etc. }

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('social_posts_project_id_idx').on(table.projectId),
    index('social_posts_user_id_idx').on(table.userId),
    index('social_posts_status_idx').on(table.status),
    index('social_posts_scheduled_at_idx').on(table.scheduledAt),
  ]
);
```

**Indexes obligatoires :**
- `project_id` : Isolation multi-tenant
- `user_id` : Posts par utilisateur
- `status` : Filtrage par statut
- `scheduled_at` : Recherche des posts à publier prochainement

**RLS PostgreSQL :**
```sql
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_posts_isolation ON social_posts
  USING (project_id = current_setting('app.current_project_id')::int);
```

---

#### Table : `social_media_library`

Bibliothèque de médias (images, vidéos) uploadés pour publication.

```typescript
export const socialMediaLibrary = pgTable(
  'social_media_library',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    filename: text('filename').notNull(),
    originalFilename: text('original_filename').notNull(),
    mimeType: text('mime_type').notNull(), // image/jpeg, video/mp4
    fileSize: integer('file_size').notNull(), // bytes

    // Storage
    storageProvider: text('storage_provider').notNull().default('s3'), // s3, minio, local
    storagePath: text('storage_path').notNull(), // social-media/{projectId}/{userId}/{uuid}.jpg
    publicUrl: text('public_url'), // URL CDN si disponible

    // Metadata
    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'), // Pour vidéos (en secondes)
    altText: text('alt_text'), // Accessibilité

    tags: jsonb('tags').default([]), // ['product', 'announcement']

    usageCount: integer('usage_count').default(0), // Nombre de posts utilisant ce média

    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('social_media_library_project_id_idx').on(table.projectId),
    index('social_media_library_user_id_idx').on(table.userId),
  ]
);
```

**Indexes obligatoires :**
- `project_id` : Isolation multi-tenant
- `user_id` : Médias par utilisateur

**RLS PostgreSQL :**
```sql
ALTER TABLE social_media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_media_library_isolation ON social_media_library
  USING (project_id = current_setting('app.current_project_id')::int);
```

---

#### Table : `social_analytics`

Métriques détaillées par post et par plateforme.

```typescript
export const socialAnalytics = pgTable(
  'social_analytics',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    postId: integer('post_id')
      .notNull()
      .references(() => socialPosts.id, { onDelete: 'cascade' }),

    platform: text('platform').notNull(), // linkedin, twitter, facebook, instagram
    externalPostId: text('external_post_id').notNull(), // ID du post sur la plateforme

    // Métriques
    impressions: integer('impressions').default(0),
    reach: integer('reach').default(0),
    views: integer('views').default(0),
    likes: integer('likes').default(0),
    comments: integer('comments').default(0),
    shares: integer('shares').default(0),
    clicks: integer('clicks').default(0),

    // Engagement
    engagementRate: decimal('engagement_rate', { precision: 5, scale: 2 }), // %

    // Demographics (P2 - AI Analytics)
    topCountries: jsonb('top_countries').default([]),
    topAgeRanges: jsonb('top_age_ranges').default([]),
    genderSplit: jsonb('gender_split').default({}),

    // Timestamps
    snapshotAt: timestamp('snapshot_at').notNull(), // Quand les métriques ont été récupérées
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('social_analytics_project_id_idx').on(table.projectId),
    index('social_analytics_post_id_idx').on(table.postId),
    index('social_analytics_platform_idx').on(table.platform),
  ]
);
```

**Indexes obligatoires :**
- `project_id` : Isolation multi-tenant
- `post_id` : Analytics par post
- `platform` : Filtrage par plateforme

**RLS PostgreSQL :**
```sql
ALTER TABLE social_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_analytics_isolation ON social_analytics
  USING (project_id = current_setting('app.current_project_id')::int);
```

---

#### Table : `social_templates` (P1)

Templates de posts réutilisables.

```typescript
export const socialTemplates = pgTable(
  'social_templates',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),

    name: text('name').notNull(),
    description: text('description'),

    contentTemplate: text('content_template').notNull(), // "New blog post: {{title}} - {{url}} {{hashtags}}"
    platforms: jsonb('platforms').default([]), // ['linkedin', 'twitter']
    hashtags: jsonb('hashtags').default([]),

    usageCount: integer('usage_count').default(0),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('social_templates_project_id_idx').on(table.projectId),
  ]
);
```

---

#### Table : `social_hashtag_suggestions` (P1)

Suggestions de hashtags intelligentes basées sur le contenu.

```typescript
export const socialHashtagSuggestions = pgTable(
  'social_hashtag_suggestions',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    keyword: text('keyword').notNull(), // "ai", "nodejs", "marketing"
    platform: text('platform').notNull(), // linkedin, twitter

    suggestedHashtags: jsonb('suggested_hashtags').notNull().default([]),
    // [{ tag: '#AI', score: 0.95, avgReach: 50000 }]

    popularityScore: integer('popularity_score'), // 0-100

    lastUpdatedAt: timestamp('last_updated_at').defaultNow(),
  },
  (table) => [
    unique('social_hashtag_suggestions_project_keyword_platform').on(
      table.projectId,
      table.keyword,
      table.platform
    ),
    index('social_hashtag_suggestions_project_id_idx').on(table.projectId),
  ]
);
```

---

### 2.2 Schéma Spring Boot (zodback_spring)

**Base de données séparée :** `zodback_spring` (recommandé)

**Règles strictes :**
- ❌ Aucune table `users`, `projects`, `payments`
- ✅ Tables spécialisées pour workflows et scheduling uniquement
- ✅ `project_id` obligatoire dans toutes les tables
- ✅ RLS activé (PostgreSQL ou vérification applicative)

---

#### Table : `social_publish_jobs`

Jobs Quartz pour publication programmée.

```sql
CREATE TABLE social_publish_jobs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,

    job_name VARCHAR(255) NOT NULL UNIQUE,
    job_group VARCHAR(255) NOT NULL DEFAULT 'social-publishing',

    scheduled_at TIMESTAMP NOT NULL,
    trigger_state VARCHAR(50) NOT NULL, -- WAITING, ACQUIRED, EXECUTING, COMPLETE, ERROR

    platforms JSONB NOT NULL DEFAULT '[]', -- ['linkedin', 'twitter']
    account_ids JSONB NOT NULL DEFAULT '[]', -- [42, 43]

    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_social_publish_jobs_project_id CHECK (project_id > 0)
);

CREATE INDEX social_publish_jobs_project_id_idx ON social_publish_jobs(project_id);
CREATE INDEX social_publish_jobs_scheduled_at_idx ON social_publish_jobs(scheduled_at);
CREATE INDEX social_publish_jobs_trigger_state_idx ON social_publish_jobs(trigger_state);
```

**RLS (via application) :**
Validation du `project_id` dans chaque handler avant traitement.

---

#### Table : `social_retry_queue`

Queue de retry pour les publications échouées.

```sql
CREATE TABLE social_retry_queue (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,

    platform VARCHAR(50) NOT NULL, -- linkedin, twitter, facebook, instagram
    account_id INTEGER NOT NULL,

    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]',

    error_message TEXT,
    error_code VARCHAR(100),

    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,

    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, retrying, success, failed

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_social_retry_queue_project_id CHECK (project_id > 0)
);

CREATE INDEX social_retry_queue_project_id_idx ON social_retry_queue(project_id);
CREATE INDEX social_retry_queue_next_retry_at_idx ON social_retry_queue(next_retry_at);
CREATE INDEX social_retry_queue_status_idx ON social_retry_queue(status);
```

**Retry Strategy :**
- 1ère tentative : Immédiate
- 2ème tentative : +5 minutes
- 3ème tentative : +15 minutes
- 4ème tentative : +1 heure
- Max 3 retries → Mark as `failed` → Emit event `social.post.failed`

---

#### Table : `social_publish_logs`

Logs détaillés de chaque tentative de publication.

```sql
CREATE TABLE social_publish_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,

    platform VARCHAR(50) NOT NULL,
    account_id INTEGER,

    event_id VARCHAR(255), -- Corrélation avec event_store NestJS

    action VARCHAR(100) NOT NULL, -- PUBLISH_ATTEMPT, PUBLISH_SUCCESS, PUBLISH_FAILED, RETRY_SCHEDULED
    status VARCHAR(50) NOT NULL, -- success, failed

    request_payload JSONB,
    response_payload JSONB,

    error_message TEXT,
    error_code VARCHAR(100),

    duration_ms INTEGER, -- Durée de l'appel API

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_social_publish_logs_project_id CHECK (project_id > 0)
);

CREATE INDEX social_publish_logs_project_id_idx ON social_publish_logs(project_id);
CREATE INDEX social_publish_logs_post_id_idx ON social_publish_logs(post_id);
CREATE INDEX social_publish_logs_event_id_idx ON social_publish_logs(event_id);
CREATE INDEX social_publish_logs_created_at_idx ON social_publish_logs(created_at);
```

**Observabilité :**
- Corrélation avec `event_store` via `event_id`
- Audit complet de chaque tentative
- Métriques de performance (latence APIs externes)

---

## 3. ÉVÉNEMENTS & INTÉGRATIONS

### 3.1 Événements publiés par le module

Format standard ZodBack :
```typescript
interface DomainEvent<T = unknown> {
  name: string;
  eventId: string;
  source: string;
  occurredAt: string;
  projectId: string;
  payload: T;
}
```

---

#### Event : `social.account.connected`

**Déclenché par :** NestJS après OAuth callback réussi

**Payload :**
```typescript
{
  accountId: number,           // social_accounts.id
  platform: string,            // 'linkedin' | 'facebook' | 'twitter' | 'instagram'
  platformAccountId: string,   // ID externe utilisateur
  platformAccountName: string, // @username
  userId: number,
  projectId: number
}
```

**Consommateurs :**
- **Spring Boot UNWE** : Envoi notification email de confirmation
- **Analytics (Python)** : Tracking des comptes connectés par projet

---

#### Event : `social.account.disconnected`

**Déclenché par :** User révoque l'accès ou token expiré

**Payload :**
```typescript
{
  accountId: number,
  platform: string,
  reason: string, // 'user_revoked' | 'token_expired' | 'error'
  userId: number,
  projectId: number
}
```

**Consommateurs :**
- **Spring Boot UNWE** : Notification utilisateur
- **NestJS** : Annulation des posts programmés pour ce compte

---

#### Event : `social.post.scheduled`

**Déclenché par :** NestJS après sauvegarde d'un post avec `scheduledAt` défini

**Payload :**
```typescript
{
  postId: number,
  scheduledAt: string,      // ISO 8601
  platforms: string[],      // ['linkedin', 'twitter']
  accountIds: number[],     // [42, 43]
  content: string,
  mediaUrls: string[],
  userId: number,
  projectId: number
}
```

**Consommateurs :**
- **Spring Boot UNWE** : Création d'un Quartz job programmé
- **Analytics** : Tracking des posts programmés

---

#### Event : `social.post.publishing`

**Déclenché par :** Spring Boot au début de la publication

**Payload :**
```typescript
{
  postId: number,
  platforms: string[],
  accountIds: number[],
  publishingStartedAt: string,
  projectId: number
}
```

**Consommateurs :**
- **NestJS** : Update `social_posts.status = 'publishing'`
- **Frontend** : Real-time feedback (via WebSocket si implémenté)

---

#### Event : `social.post.published`

**Déclenché par :** Spring Boot après publication réussie sur TOUTES les plateformes

**Payload :**
```typescript
{
  postId: number,
  publishedAt: string,
  platforms: string[],
  results: {
    [platform: string]: {
      status: 'published',
      externalId: string,   // ID du post sur la plateforme
      externalUrl: string,  // URL publique du post
      publishedAt: string
    }
  },
  projectId: number
}
```

**Consommateurs :**
- **NestJS** : Update `social_posts.status = 'published'`, `social_posts.platformResults`
- **Spring Boot UNWE** : Notification email de succès
- **Analytics** : Tracking performance posts

---

#### Event : `social.post.failed`

**Déclenché par :** Spring Boot après échec de publication (max retries atteint)

**Payload :**
```typescript
{
  postId: number,
  platforms: string[],
  errors: {
    [platform: string]: {
      status: 'failed',
      errorCode: string,    // 'RATE_LIMIT_EXCEEDED', 'INVALID_TOKEN', etc.
      errorMessage: string,
      retryCount: number
    }
  },
  failedAt: string,
  projectId: number
}
```

**Consommateurs :**
- **NestJS** : Update `social_posts.status = 'failed'`
- **Spring Boot UNWE** : Notification email d'échec avec recommandations
- **Monitoring** : Alertes pour les admins

---

#### Event : `social.post.cancelled`

**Déclenché par :** User annule un post programmé

**Payload :**
```typescript
{
  postId: number,
  cancelledAt: string,
  cancelledBy: number, // userId
  projectId: number
}
```

**Consommateurs :**
- **Spring Boot UNWE** : Annulation du Quartz job
- **Analytics** : Tracking des annulations

---

#### Event : `social.analytics.synced`

**Déclenché par :** NestJS après récupération des métriques depuis les APIs sociales

**Payload :**
```typescript
{
  postId: number,
  platform: string,
  metrics: {
    views: number,
    likes: number,
    comments: number,
    shares: number,
    engagementRate: number
  },
  syncedAt: string,
  projectId: number
}
```

**Consommateurs :**
- **Python Analytics** : Calcul de tendances et insights (P2)
- **Reporting** : Génération de rapports automatisés

---

### 3.2 Événements écoutés

#### Event : `payment.subscription.activated`

**Émetteur :** Module `payments` (NestJS)

**Action :** Débloquer fonctionnalités premium

**Handler (NestJS) :**
```typescript
@EventHandler('payment.subscription.activated')
async handleSubscriptionActivated(event: DomainEvent) {
  const { userId, planCode, projectId } = event.payload;

  // Débloquer fonctionnalités selon le plan
  if (planCode === 'social_media_pro') {
    // Augmenter quotas : 100 posts/mois → 500 posts/mois
    // Activer AI content generation
    // Activer analytics avancés
  }
}
```

---

#### Event : `payment.subscription.cancelled`

**Émetteur :** Module `payments` (NestJS)

**Action :** Révoquer accès premium

**Handler (NestJS) :**
```typescript
@EventHandler('payment.subscription.cancelled')
async handleSubscriptionCancelled(event: DomainEvent) {
  const { userId, projectId } = event.payload;

  // Rétrograder vers plan gratuit
  // Annuler les posts programmés au-delà du quota gratuit
  // Désactiver AI features
}
```

---

#### Event : `user.deleted` (si implémenté)

**Émetteur :** Module `auth` (NestJS)

**Action :** Supprimer tous les comptes sociaux et posts de l'utilisateur

**Handler (NestJS) :**
```typescript
@EventHandler('user.deleted')
async handleUserDeleted(event: DomainEvent) {
  const { userId, projectId } = event.payload;

  // Cascade delete handled by database foreign keys
  // Log deletion for audit
}
```

---

### 3.3 Intégration Spring Boot UNWE

**Architecture de consommation :**

Spring Boot consomme les événements NestJS via **modèle Pull (recommandé)** :

```java
@Scheduled(fixedDelay = 5000) // Poll toutes les 5 secondes
public void pollEvents() {
    Long lastEventId = getLastProcessedEventId();

    List<DomainEvent> events = nestJsClient.pollEvents("spring-unwe", lastEventId);

    for (DomainEvent event : events) {
        processEvent(event);
        saveLastProcessedEventId(event.getEventId());
    }
}
```

---

#### Event Handler : `SocialEventHandler.java`

```java
@Component
@Slf4j
public class SocialEventHandler implements DomainEventHandler {

    private final SocialPublishingService publishingService;
    private final EmailService emailService;

    @Override
    public boolean supports(DomainEvent event) {
        return event.name.startsWith("social.");
    }

    @Override
    public void handle(DomainEvent event) {
        validateProjectId(event); // MANDATORY RLS check

        switch (event.name) {
            case "social.post.scheduled":
                handlePostScheduled(event);
                break;
            case "social.post.cancelled":
                handlePostCancelled(event);
                break;
            case "social.account.connected":
                handleAccountConnected(event);
                break;
        }
    }

    private void handlePostScheduled(DomainEvent event) {
        int postId = (int) event.payload.get("postId");
        String scheduledAt = (String) event.payload.get("scheduledAt");

        // Create Quartz job
        JobDetail job = JobBuilder.newJob(SocialPublishingJob.class)
            .withIdentity("post-" + postId, "social-publishing")
            .usingJobData("postId", postId)
            .usingJobData("projectId", event.projectId)
            .build();

        Trigger trigger = TriggerBuilder.newTrigger()
            .startAt(Date.from(Instant.parse(scheduledAt)))
            .build();

        scheduler.scheduleJob(job, trigger);

        log.info("Scheduled post {} for {}", postId, scheduledAt);
    }
}
```

---

#### Quartz Job : `SocialPublishingJob.java`

```java
@Component
@DisallowConcurrentExecution
public class SocialPublishingJob implements Job {

    @Autowired
    private SocialPublishingService publishingService;

    @Override
    public void execute(JobExecutionContext context) {
        int postId = context.getJobDetail().getJobDataMap().getInt("postId");
        int projectId = context.getJobDetail().getJobDataMap().getInt("projectId");

        log.info("Executing publication for post {} (project {})", postId, projectId);

        try {
            publishingService.publishPost(postId, projectId);
        } catch (Exception e) {
            log.error("Failed to publish post {}: {}", postId, e.getMessage(), e);
            // Retry logic handled in publishingService
        }
    }
}
```

---

#### Service : `SocialPublishingService.java`

```java
@Service
@Slf4j
public class SocialPublishingService {

    private final LinkedInPublisher linkedInPublisher;
    private final FacebookPublisher facebookPublisher;
    private final TwitterPublisher twitterPublisher;
    private final NestJsClient nestJsClient;
    private final SocialRetryQueueRepository retryQueueRepository;

    public void publishPost(int postId, int projectId) {
        // 1. Fetch post details from NestJS
        PostDetails post = nestJsClient.getPostDetails(postId, projectId);

        // 2. Emit event: social.post.publishing
        nestJsClient.emitEvent("social.post.publishing", Map.of(
            "postId", postId,
            "projectId", projectId,
            "platforms", post.platforms
        ));

        Map<String, PublishResult> results = new HashMap<>();

        // 3. Publish to each platform
        for (String platform : post.platforms) {
            try {
                PublishResult result = publishToPlatform(platform, post);
                results.put(platform, result);

            } catch (RateLimitException e) {
                log.warn("Rate limit for {}, scheduling retry", platform);
                scheduleRetry(postId, projectId, platform, post, e);

            } catch (Exception e) {
                log.error("Failed to publish to {}: {}", platform, e.getMessage());
                results.put(platform, PublishResult.failed(e.getMessage()));
            }
        }

        // 4. Check if all succeeded
        boolean allSucceeded = results.values().stream()
            .allMatch(r -> r.status.equals("published"));

        if (allSucceeded) {
            nestJsClient.emitEvent("social.post.published", Map.of(
                "postId", postId,
                "projectId", projectId,
                "results", results
            ));
        } else {
            // Some failed, will retry
            log.warn("Some platforms failed for post {}", postId);
        }
    }

    private PublishResult publishToPlatform(String platform, PostDetails post) {
        return switch (platform) {
            case "linkedin" -> linkedInPublisher.publish(post);
            case "facebook" -> facebookPublisher.publish(post);
            case "twitter" -> twitterPublisher.publish(post);
            case "instagram" -> instagramPublisher.publish(post);
            default -> throw new IllegalArgumentException("Unknown platform: " + platform);
        };
    }

    private void scheduleRetry(int postId, int projectId, String platform,
                               PostDetails post, Exception error) {
        retryQueueRepository.save(SocialRetryQueue.builder()
            .projectId(projectId)
            .postId(postId)
            .platform(platform)
            .content(post.content)
            .mediaUrls(post.mediaUrls)
            .errorMessage(error.getMessage())
            .errorCode(getErrorCode(error))
            .nextRetryAt(calculateNextRetry(0)) // Exponential backoff
            .build());
    }
}
```

---

#### Publishers : `LinkedInPublisher.java`

```java
@Service
@Slf4j
public class LinkedInPublisher {

    private final RestTemplate restTemplate;
    private final NestJsClient nestJsClient;

    public PublishResult publish(PostDetails post) {
        // 1. Get LinkedIn access token from NestJS (decrypted)
        String accessToken = nestJsClient.getAccountToken(
            post.accountIds.get(0), // LinkedIn account ID
            post.projectId
        );

        // 2. Build LinkedIn API request
        LinkedInShareRequest request = LinkedInShareRequest.builder()
            .author("urn:li:person:" + post.platformAccountId)
            .lifecycleState("PUBLISHED")
            .specificContent(Map.of(
                "com.linkedin.ugc.ShareContent", Map.of(
                    "shareCommentary", Map.of("text", post.content),
                    "shareMediaCategory", post.mediaUrls.isEmpty() ? "NONE" : "IMAGE",
                    "media", buildMediaPayload(post.mediaUrls)
                )
            ))
            .visibility(Map.of("com.linkedin.ugc.MemberNetworkVisibility", "PUBLIC"))
            .build();

        // 3. Call LinkedIn API
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<LinkedInShareRequest> entity = new HttpEntity<>(request, headers);

        ResponseEntity<LinkedInShareResponse> response = restTemplate.exchange(
            "https://api.linkedin.com/v2/ugcPosts",
            HttpMethod.POST,
            entity,
            LinkedInShareResponse.class
        );

        // 4. Parse response
        if (response.getStatusCode().is2xxSuccessful()) {
            LinkedInShareResponse body = response.getBody();
            return PublishResult.builder()
                .status("published")
                .externalId(body.id)
                .externalUrl("https://www.linkedin.com/feed/update/" + body.id)
                .publishedAt(Instant.now().toString())
                .build();
        } else {
            throw new PublishException("LinkedIn API returned: " + response.getStatusCode());
        }
    }
}
```

**Idempotence garantie :**
- Spring Boot vérifie `eventId` pour déduplication
- LinkedIn API retourne erreur si post déjà publié (détection via hash du contenu)

---

#### Retry Job : `SocialRetryJob.java`

```java
@Component
@Slf4j
public class SocialRetryJob {

    @Autowired
    private SocialRetryQueueRepository retryQueueRepository;

    @Autowired
    private SocialPublishingService publishingService;

    @Scheduled(fixedDelay = 60000) // Check toutes les minutes
    public void processRetries() {
        List<SocialRetryQueue> retries = retryQueueRepository.findPendingRetries(Instant.now());

        for (SocialRetryQueue retry : retries) {
            if (retry.retryCount >= retry.maxRetries) {
                markAsFailed(retry);
                continue;
            }

            try {
                // Retry publication
                publishingService.retryPublish(retry);
                retry.status = "success";
                retryQueueRepository.save(retry);

            } catch (Exception e) {
                retry.retryCount++;
                retry.nextRetryAt = calculateNextRetry(retry.retryCount);
                retry.errorMessage = e.getMessage();
                retryQueueRepository.save(retry);
            }
        }
    }

    private void markAsFailed(SocialRetryQueue retry) {
        retry.status = "failed";
        retryQueueRepository.save(retry);

        // Emit event: social.post.failed
        nestJsClient.emitEvent("social.post.failed", Map.of(
            "postId", retry.postId,
            "projectId", retry.projectId,
            "platform", retry.platform,
            "errorMessage", retry.errorMessage
        ));
    }

    private Instant calculateNextRetry(int retryCount) {
        // Exponential backoff: 5min, 15min, 1h
        long delayMinutes = (long) Math.pow(3, retryCount) * 5;
        return Instant.now().plus(delayMinutes, ChronoUnit.MINUTES);
    }
}
```

---

## 4. API & ENDPOINTS

### 4.1 Endpoints NestJS

**Base URL :** `/api/social-media/v1`

**Headers obligatoires :**
- `Authorization: Bearer <api_token>`
- `X-Project-Id: <project_id>`

---

#### Comptes Sociaux

**POST /api/social-media/v1/accounts/connect**

Initie le flux OAuth pour connecter un compte social.

**Request:**
```json
{
  "platform": "linkedin" | "facebook" | "twitter" | "instagram"
}
```

**Response:**
```json
{
  "authUrl": "https://www.linkedin.com/oauth/v2/authorization?...",
  "state": "random_state_token"
}
```

---

**GET /api/social-media/v1/accounts/callback?code=...&state=...**

Callback OAuth après autorisation utilisateur.

**Response:**
```json
{
  "accountId": 42,
  "platform": "linkedin",
  "platformAccountName": "@johndoe",
  "status": "active"
}
```

---

**GET /api/social-media/v1/accounts**

Liste les comptes sociaux connectés.

**Response:**
```json
{
  "accounts": [
    {
      "id": 42,
      "platform": "linkedin",
      "platformAccountName": "@johndoe",
      "status": "active",
      "lastSyncedAt": "2026-01-18T10:00:00Z"
    }
  ]
}
```

---

**DELETE /api/social-media/v1/accounts/:id**

Déconnecte un compte social.

**Response:**
```json
{
  "message": "Account disconnected successfully"
}
```

---

#### Posts

**POST /api/social-media/v1/posts**

Crée un nouveau post (brouillon ou programmé).

**Request:**
```json
{
  "title": "My new post",
  "content": "Excited to announce...",
  "platforms": ["linkedin", "twitter"],
  "accountIds": [42, 43],
  "mediaIds": [123],
  "hashtags": ["#AI", "#Tech"],
  "scheduledAt": "2026-01-20T14:00:00Z", // null = draft
  "status": "scheduled" // or "draft"
}
```

**Response:**
```json
{
  "postId": 789,
  "status": "scheduled",
  "scheduledAt": "2026-01-20T14:00:00Z"
}
```

---

**GET /api/social-media/v1/posts**

Liste les posts.

**Query params:**
- `status` : `draft`, `scheduled`, `published`, `failed`
- `platform` : `linkedin`, `twitter`, etc.
- `limit` : 20 (default)
- `offset` : 0 (default)

**Response:**
```json
{
  "posts": [
    {
      "id": 789,
      "title": "My new post",
      "content": "Excited to announce...",
      "platforms": ["linkedin", "twitter"],
      "status": "published",
      "publishedAt": "2026-01-20T14:05:32Z",
      "viewsCount": 1250,
      "likesCount": 45
    }
  ],
  "total": 142
}
```

---

**GET /api/social-media/v1/posts/:id**

Détails d'un post.

**Response:**
```json
{
  "id": 789,
  "title": "My new post",
  "content": "Excited to announce...",
  "platforms": ["linkedin", "twitter"],
  "accountIds": [42, 43],
  "mediaUrls": ["https://cdn.example.com/image.jpg"],
  "hashtags": ["#AI", "#Tech"],
  "status": "published",
  "publishedAt": "2026-01-20T14:05:32Z",
  "platformResults": {
    "linkedin": {
      "status": "published",
      "externalId": "urn:li:share:123456",
      "externalUrl": "https://www.linkedin.com/feed/update/urn:li:share:123456"
    },
    "twitter": {
      "status": "published",
      "externalId": "1234567890",
      "externalUrl": "https://twitter.com/user/status/1234567890"
    }
  },
  "viewsCount": 1250,
  "likesCount": 45,
  "commentsCount": 12,
  "sharesCount": 8
}
```

---

**PUT /api/social-media/v1/posts/:id**

Modifie un post (uniquement si status = `draft` ou `scheduled` et non encore publié).

**Request:**
```json
{
  "content": "Updated content...",
  "scheduledAt": "2026-01-21T10:00:00Z"
}
```

**Response:**
```json
{
  "postId": 789,
  "status": "scheduled",
  "updatedAt": "2026-01-18T11:00:00Z"
}
```

---

**DELETE /api/social-media/v1/posts/:id**

Supprime un post (uniquement si non publié).

**Response:**
```json
{
  "message": "Post deleted successfully"
}
```

---

**POST /api/social-media/v1/posts/:id/publish**

Publie immédiatement un post (bypass scheduling).

**Response:**
```json
{
  "postId": 789,
  "status": "publishing",
  "message": "Publication started"
}
```

---

**POST /api/social-media/v1/posts/:id/cancel**

Annule un post programmé.

**Response:**
```json
{
  "postId": 789,
  "status": "cancelled"
}
```

---

#### Analytics

**GET /api/social-media/v1/analytics/:postId**

Récupère les métriques d'un post.

**Response:**
```json
{
  "postId": 789,
  "totalViews": 1250,
  "totalLikes": 45,
  "totalComments": 12,
  "totalShares": 8,
  "engagementRate": 5.2,
  "platforms": {
    "linkedin": {
      "views": 800,
      "likes": 30,
      "comments": 8,
      "shares": 5
    },
    "twitter": {
      "views": 450,
      "likes": 15,
      "comments": 4,
      "shares": 3
    }
  },
  "lastSyncedAt": "2026-01-18T12:00:00Z"
}
```

---

**GET /api/social-media/v1/analytics/overview**

Vue d'ensemble des performances.

**Query params:**
- `startDate` : `2026-01-01`
- `endDate` : `2026-01-31`

**Response:**
```json
{
  "period": {
    "start": "2026-01-01",
    "end": "2026-01-31"
  },
  "totalPosts": 24,
  "totalViews": 35000,
  "totalEngagements": 1250,
  "avgEngagementRate": 3.5,
  "topPerformingPosts": [
    {
      "postId": 789,
      "title": "My new post",
      "viewsCount": 5000,
      "engagementRate": 8.2
    }
  ],
  "platformBreakdown": {
    "linkedin": { "posts": 12, "views": 20000 },
    "twitter": { "posts": 12, "views": 15000 }
  }
}
```

---

#### Bibliothèque Média (P1)

**POST /api/social-media/v1/media/upload**

Upload d'un média (image ou vidéo).

**Request:** `multipart/form-data`
- `file` : Fichier
- `altText` : Texte alternatif (accessibilité)

**Response:**
```json
{
  "mediaId": 123,
  "filename": "photo-2026-01-18.jpg",
  "publicUrl": "https://cdn.example.com/social-media/42/user-1/uuid.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 245678
}
```

---

**GET /api/social-media/v1/media**

Liste les médias uploadés.

**Response:**
```json
{
  "media": [
    {
      "id": 123,
      "filename": "photo-2026-01-18.jpg",
      "publicUrl": "https://cdn.example.com/...",
      "usageCount": 3,
      "createdAt": "2026-01-18T10:00:00Z"
    }
  ]
}
```

---

**DELETE /api/social-media/v1/media/:id**

Supprime un média (uniquement si `usageCount = 0`).

**Response:**
```json
{
  "message": "Media deleted successfully"
}
```

---

#### Templates (P1)

**POST /api/social-media/v1/templates**

Crée un template de post.

**Request:**
```json
{
  "name": "New Blog Announcement",
  "contentTemplate": "New blog post: {{title}} - {{url}} {{hashtags}}",
  "platforms": ["linkedin", "twitter"],
  "hashtags": ["#Tech", "#Blog"]
}
```

**Response:**
```json
{
  "templateId": 56,
  "name": "New Blog Announcement"
}
```

---

**GET /api/social-media/v1/templates**

Liste les templates.

---

**POST /api/social-media/v1/posts/from-template**

Crée un post à partir d'un template.

**Request:**
```json
{
  "templateId": 56,
  "variables": {
    "title": "Understanding AI",
    "url": "https://example.com/blog/ai"
  }
}
```

**Response:**
```json
{
  "postId": 790,
  "content": "New blog post: Understanding AI - https://example.com/blog/ai #Tech #Blog",
  "status": "draft"
}
```

---

### 4.2 Endpoints Spring Boot (via API Gateway NestJS)

**Base URL (interne uniquement) :** `/api/social-publishing/v1`

**Important :** Ces endpoints ne sont PAS exposés publiquement. Ils sont appelés par :
1. Quartz jobs internes
2. NestJS API Gateway (proxy authentifié)

---

**POST /api/social-publishing/v1/publish**

Publication manuelle d'un post (appelé par Quartz job ou retry).

**Headers:**
- `Authorization: Bearer <internal_token>`
- `X-Project-Id: <project_id>`

**Request:**
```json
{
  "postId": 789,
  "projectId": 42
}
```

**Response:**
```json
{
  "postId": 789,
  "status": "publishing",
  "message": "Publication started"
}
```

---

**GET /api/social-publishing/v1/status/:jobId**

Statut d'un job de publication.

**Response:**
```json
{
  "jobId": "post-789",
  "status": "COMPLETE",
  "lastExecutionTime": "2026-01-18T14:05:32Z",
  "nextExecutionTime": null
}
```

---

**POST /api/social-publishing/v1/retry/:retryId**

Force un retry manuel.

**Response:**
```json
{
  "retryId": 123,
  "status": "retrying",
  "nextRetryAt": "2026-01-18T14:10:00Z"
}
```

---

## 5. ARCHITECTURE TECHNIQUE

### 5.1 Structure NestJS

```
backend/src/social-media/
├── social-media.module.ts
├── controllers/
│   ├── social-accounts.controller.ts
│   ├── social-posts.controller.ts
│   ├── social-analytics.controller.ts
│   ├── social-media.controller.ts (upload)
│   └── social-templates.controller.ts (P1)
├── services/
│   ├── social-media.service.ts (main orchestrator)
│   ├── oauth/
│   │   ├── linkedin-oauth.service.ts
│   │   ├── facebook-oauth.service.ts
│   │   ├── twitter-oauth.service.ts
│   │   └── instagram-oauth.service.ts
│   ├── publishers/
│   │   ├── linkedin-publisher.service.ts (optionnel, peut être délégué à Spring Boot)
│   │   ├── facebook-publisher.service.ts
│   │   ├── twitter-publisher.service.ts
│   │   └── instagram-publisher.service.ts
│   ├── social-scheduler.service.ts
│   ├── social-analytics.service.ts
│   ├── social-encryption.service.ts (chiffrement tokens)
│   └── social-media-storage.service.ts (upload S3/MinIO)
├── dto/
│   ├── create-post.dto.ts
│   ├── update-post.dto.ts
│   ├── schedule-post.dto.ts
│   ├── connect-account.dto.ts
│   └── upload-media.dto.ts
├── guards/
│   └── social-permissions.guard.ts
├── decorators/
│   └── social-context.decorator.ts
└── events/
    └── social-event.handlers.ts
```

---

### 5.2 Structure Spring Boot

```
spring-services/src/main/java/com/zodback/spring/social/
├── SocialPublishingService.java
├── SocialPublishingController.java (interne uniquement)
├── publishers/
│   ├── LinkedInPublisher.java
│   ├── FacebookPublisher.java
│   ├── TwitterPublisher.java
│   ├── InstagramPublisher.java
│   └── PublishResult.java (DTO)
├── jobs/
│   ├── SocialPublishingJob.java (Quartz)
│   └── SocialRetryJob.java (Scheduled)
├── handler/
│   └── SocialEventHandler.java (consomme social.post.scheduled)
├── repository/
│   ├── SocialPublishJobsRepository.java
│   ├── SocialRetryQueueRepository.java
│   └── SocialPublishLogsRepository.java
├── entity/
│   ├── SocialPublishJob.java
│   ├── SocialRetryQueue.java
│   └── SocialPublishLog.java
├── exception/
│   ├── RateLimitException.java
│   ├── InvalidTokenException.java
│   └── PublishException.java
└── config/
    └── QuartzConfig.java
```

---

### 5.3 Dépendances externes

**NestJS (package.json) :**
```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/axios": "^3.0.0",
    "axios": "^1.6.0",

    // OAuth
    "passport": "^0.7.0",
    "passport-linkedin-oauth2": "^2.0.0",
    "passport-facebook": "^3.0.0",
    "passport-twitter": "^1.0.4",

    // Encryption
    "crypto-js": "^4.2.0",

    // Storage
    "@aws-sdk/client-s3": "^3.500.0",
    "multer": "^1.4.5-lts.1",
    "multer-s3": "^3.0.1",

    // Rate limiting
    "@nestjs/throttler": "^5.0.0"
  }
}
```

**Spring Boot (pom.xml) :**
```xml
<dependencies>
    <!-- Quartz Scheduler -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-quartz</artifactId>
    </dependency>

    <!-- LinkedIn SDK (unofficial or HTTP client) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>

    <!-- Meta Graph API -->
    <!-- Twitter API v2 -->
    <!-- Instagram Graph API -->

    <!-- Thymeleaf (pour emails) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-thymeleaf</artifactId>
    </dependency>

    <!-- PostgreSQL -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
    </dependency>
</dependencies>
```

**APIs Externes :**
- **LinkedIn API v2** : `https://api.linkedin.com/v2/ugcPosts`
- **Meta Graph API** : `https://graph.facebook.com/v18.0/me/feed` (Facebook & Instagram)
- **X API v2** : `https://api.twitter.com/2/tweets`
- **Instagram Graph API** : `https://graph.facebook.com/v18.0/{ig-user-id}/media`

**OAuth Providers :**
- LinkedIn : `https://www.linkedin.com/oauth/v2/authorization`
- Facebook : `https://www.facebook.com/v18.0/dialog/oauth`
- X/Twitter : `https://twitter.com/i/oauth2/authorize`
- Instagram : Via Facebook OAuth

---

## 6. FLUX FONCTIONNELS DÉTAILLÉS

### 6.1 Connexion d'un compte social (OAuth LinkedIn)

**Acteurs :** User, Frontend, NestJS, LinkedIn OAuth

**Flux :**

```
1. User → Frontend → Clic "Connect LinkedIn"

2. Frontend → POST /api/social-media/v1/accounts/connect
   Body: { "platform": "linkedin" }

3. NestJS → LinkedInOAuthService.getAuthorizationUrl()
   - Generate random state token
   - Save state in cache (Redis) with TTL 10 minutes
   - Build LinkedIn OAuth URL with scopes: r_basicprofile, w_member_social

4. NestJS → Response:
   {
     "authUrl": "https://www.linkedin.com/oauth/v2/authorization?...",
     "state": "abc123"
   }

5. Frontend → Redirect user to authUrl

6. User → Authorize on LinkedIn

7. LinkedIn → Redirect to callback:
   GET /api/social-media/v1/accounts/callback?code=xyz789&state=abc123

8. NestJS → LinkedInOAuthService.handleCallback()
   - Validate state token (check Redis cache)
   - Exchange code for access_token + refresh_token
   - Call LinkedIn API: GET /v2/me
   - Extract: platformAccountId, platformAccountName

9. NestJS → SocialEncryptionService.encrypt(accessToken)
   - Encrypt token with AES-256 before storage

10. NestJS → Save to social_accounts:
    {
      projectId: 42,
      userId: 1,
      platform: 'linkedin',
      platformAccountId: 'urn:li:person:abc123',
      platformAccountName: '@johndoe',
      accessToken: '[ENCRYPTED]',
      refreshToken: '[ENCRYPTED]',
      tokenExpiresAt: '2026-03-18T10:00:00Z',
      status: 'active'
    }

11. NestJS → EventBusService.emit('social.account.connected', {
      accountId: 42,
      platform: 'linkedin',
      platformAccountId: 'urn:li:person:abc123',
      platformAccountName: '@johndoe',
      userId: 1,
      projectId: 42
    })

12. Spring Boot → Poll event → SocialEventHandler.handle()
    - Send confirmation email (UNWE)

13. NestJS → Response to Frontend:
    {
      "accountId": 42,
      "platform": "linkedin",
      "platformAccountName": "@johndoe",
      "status": "active"
    }

14. Frontend → Display success message + redirect to dashboard
```

---

### 6.2 Publication programmée (Scheduled Post)

**Acteurs :** User, Frontend, NestJS, Spring Boot, LinkedIn API

**Flux :**

```
1. User → Frontend → Create post form:
   - Content: "Excited to share our new AI feature!"
   - Platforms: LinkedIn, Twitter
   - Accounts: @johndoe (LinkedIn), @johndoe (Twitter)
   - Media: Upload image → mediaId = 123
   - Scheduled: 2026-01-20 14:00:00 UTC

2. Frontend → POST /api/social-media/v1/posts
   Body: {
     "content": "Excited to share our new AI feature!",
     "platforms": ["linkedin", "twitter"],
     "accountIds": [42, 43],
     "mediaIds": [123],
     "hashtags": ["#AI", "#Tech"],
     "scheduledAt": "2026-01-20T14:00:00Z",
     "status": "scheduled"
   }

3. NestJS → SocialMediaService.createPost()
   - Validate user has access to accounts 42, 43 (project isolation)
   - Validate content length (LinkedIn: 3000 chars, Twitter: 280 chars)
   - Fetch media URLs from social_media_library

4. NestJS → Save to social_posts:
   {
     projectId: 42,
     userId: 1,
     content: "Excited to share our new AI feature!",
     platforms: ["linkedin", "twitter"],
     accountIds: [42, 43],
     mediaUrls: ["https://cdn.example.com/image.jpg"],
     hashtags: ["#AI", "#Tech"],
     scheduledAt: "2026-01-20T14:00:00Z",
     status: "scheduled"
   }

5. NestJS → EventBusService.emit('social.post.scheduled', {
     postId: 789,
     scheduledAt: "2026-01-20T14:00:00Z",
     platforms: ["linkedin", "twitter"],
     accountIds: [42, 43],
     content: "Excited to share our new AI feature!",
     mediaUrls: ["https://cdn.example.com/image.jpg"],
     userId: 1,
     projectId: 42
   })

6. NestJS → Response to Frontend:
   {
     "postId": 789,
     "status": "scheduled",
     "scheduledAt": "2026-01-20T14:00:00Z"
   }

7. Spring Boot → Poll /api/events/v1/poll?service=spring-unwe&after=123
   - Receive event: social.post.scheduled

8. Spring Boot → SocialEventHandler.handlePostScheduled()
   - Extract: postId=789, scheduledAt="2026-01-20T14:00:00Z"
   - Create Quartz job:
     JobDetail: job name = "post-789", group = "social-publishing"
     Trigger: startAt = 2026-01-20T14:00:00Z

9. Spring Boot → Save to social_publish_jobs:
   {
     projectId: 42,
     postId: 789,
     jobName: "post-789",
     scheduledAt: "2026-01-20T14:00:00Z",
     triggerState: "WAITING",
     platforms: ["linkedin", "twitter"],
     accountIds: [42, 43]
   }

10. Spring Boot → Quartz Scheduler → Schedule job

11. [Wait until 2026-01-20 14:00:00 UTC]

12. Spring Boot → Quartz triggers SocialPublishingJob.execute()
    - jobData: postId=789, projectId=42

13. Spring Boot → SocialPublishingService.publishPost(789, 42)

14. Spring Boot → Call NestJS Internal API:
    GET /api/internal/v1/social/posts/789?projectId=42
    Headers: Authorization: Bearer [internal_token]
    Response: { postId, content, platforms, accountIds, mediaUrls }

15. Spring Boot → Emit event via NestJS:
    POST /api/internal/v1/events
    Body: {
      "name": "social.post.publishing",
      "payload": { postId: 789, projectId: 42, platforms: [...] }
    }

16. NestJS → Update social_posts.status = 'publishing'

17. Spring Boot → Loop through platforms:

    A. LinkedIn:
       - Call NestJS: GET /api/internal/v1/social/accounts/42/token
       - Decrypt accessToken
       - Build LinkedIn API request
       - POST https://api.linkedin.com/v2/ugcPosts
       - Response: { id: "urn:li:share:123456" }
       - Save to social_publish_logs:
         {
           projectId: 42,
           postId: 789,
           platform: 'linkedin',
           action: 'PUBLISH_SUCCESS',
           status: 'success',
           responsePayload: { id: "urn:li:share:123456" }
         }

    B. Twitter:
       - Same flow for Twitter API v2
       - POST https://api.twitter.com/2/tweets
       - Response: { data: { id: "1234567890" } }

18. Spring Boot → All platforms succeeded:
    - Emit event: social.post.published
    Body: {
      postId: 789,
      publishedAt: "2026-01-20T14:05:32Z",
      platforms: ["linkedin", "twitter"],
      results: {
        linkedin: {
          status: "published",
          externalId: "urn:li:share:123456",
          externalUrl: "https://www.linkedin.com/feed/update/urn:li:share:123456",
          publishedAt: "2026-01-20T14:05:32Z"
        },
        twitter: {
          status: "published",
          externalId: "1234567890",
          externalUrl: "https://twitter.com/user/status/1234567890",
          publishedAt: "2026-01-20T14:05:33Z"
        }
      },
      projectId: 42
    }

19. NestJS → Event handler:
    - Update social_posts:
      status = 'published'
      publishedAt = "2026-01-20T14:05:32Z"
      platformResults = { linkedin: {...}, twitter: {...} }

20. Spring Boot UNWE → Send success email:
    Subject: "Your post was published successfully"
    Body: "Your post has been published on LinkedIn and Twitter. View on LinkedIn: ..."

21. Frontend (WebSocket if implemented) → Real-time notification:
    "Your post has been published!"
```

---

### 6.3 Retry en cas d'échec (Rate Limit Twitter)

**Acteurs :** Spring Boot, Twitter API, NestJS

**Flux :**

```
1. Spring Boot → Publishing to Twitter

2. Twitter API → Response: 429 Too Many Requests
   Headers: X-Rate-Limit-Reset: 1737384300 (timestamp)
   Body: { error: "Rate limit exceeded" }

3. Spring Boot → TwitterPublisher.publish()
   - Throw RateLimitException("Rate limit exceeded until 14:45:00")

4. Spring Boot → SocialPublishingService.publishPost()
   - Catch RateLimitException
   - Call scheduleRetry(postId=789, platform='twitter', error)

5. Spring Boot → Save to social_retry_queue:
   {
     projectId: 42,
     postId: 789,
     platform: 'twitter',
     accountId: 43,
     content: "Excited to share our new AI feature!",
     mediaUrls: ["https://cdn.example.com/image.jpg"],
     errorMessage: "Rate limit exceeded until 14:45:00",
     errorCode: "RATE_LIMIT_EXCEEDED",
     retryCount: 0,
     maxRetries: 3,
     nextRetryAt: "2026-01-20T14:50:00Z", // +5 minutes
     status: 'pending'
   }

6. Spring Boot → Save to social_publish_logs:
   {
     projectId: 42,
     postId: 789,
     platform: 'twitter',
     action: 'PUBLISH_FAILED',
     status: 'failed',
     errorMessage: "Rate limit exceeded",
     errorCode: 'RATE_LIMIT_EXCEEDED'
   }

7. [LinkedIn published successfully, Twitter pending retry]

8. Spring Boot → Partial success:
   - Do NOT emit social.post.published yet
   - Wait for retry

9. [Wait until 2026-01-20 14:50:00]

10. Spring Boot → SocialRetryJob.processRetries()
    - Find retries with nextRetryAt <= NOW
    - Fetch retry: id=123, postId=789, platform='twitter'

11. Spring Boot → SocialPublishingService.retryPublish(retry)
    - Call TwitterPublisher.publish()
    - Twitter API → 200 OK
    - Response: { data: { id: "1234567890" } }

12. Spring Boot → Update social_retry_queue:
    status = 'success'

13. Spring Boot → Check if all platforms for postId=789 are published:
    - LinkedIn: ✅
    - Twitter: ✅

14. Spring Boot → Emit event: social.post.published
    (Same payload as 6.2 step 18)

15. NestJS → Update social_posts.status = 'published'

16. Spring Boot UNWE → Send success email

[Alternative: Max retries exceeded]

1. After 3 retries → Twitter still fails

2. Spring Boot → SocialRetryJob.markAsFailed(retry)
   - Update social_retry_queue.status = 'failed'

3. Spring Boot → Emit event: social.post.failed
   Body: {
     postId: 789,
     platforms: ["twitter"],
     errors: {
       twitter: {
         status: "failed",
         errorCode: "RATE_LIMIT_EXCEEDED",
         errorMessage: "Rate limit exceeded after 3 retries",
         retryCount: 3
       }
     },
     failedAt: "2026-01-20T15:30:00Z",
     projectId: 42
   }

4. NestJS → Update social_posts:
   status = 'failed'
   platformResults = {
     linkedin: { status: 'published', ... },
     twitter: { status: 'failed', errorMessage: '...' }
   }

5. Spring Boot UNWE → Send failure email:
   Subject: "Your post failed to publish on Twitter"
   Body: "Unfortunately, your post could not be published on Twitter due to rate limiting. It was successfully published on LinkedIn. You can retry manually from the dashboard."

6. Frontend → Display error notification with retry button
```

---

## 7. SÉCURITÉ & CONFORMITÉ

### 7.1 OAuth & Tokens

**Gestion des tokens OAuth :**

1. **Chiffrement obligatoire (AES-256) :**
   ```typescript
   // social-encryption.service.ts
   import * as crypto from 'crypto';

   export class SocialEncryptionService {
     private readonly algorithm = 'aes-256-cbc';
     private readonly encryptionKey = process.env.SOCIAL_ENCRYPTION_KEY; // 32 bytes

     encrypt(text: string): string {
       const iv = crypto.randomBytes(16);
       const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

       let encrypted = cipher.update(text, 'utf8', 'hex');
       encrypted += cipher.final('hex');

       return iv.toString('hex') + ':' + encrypted; // IV:CipherText
     }

     decrypt(encryptedText: string): string {
       const [ivHex, encryptedHex] = encryptedText.split(':');
       const iv = Buffer.from(ivHex, 'hex');
       const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

       let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
       decrypted += decipher.final('utf8');

       return decrypted;
     }
   }
   ```

2. **Refresh tokens automatique :**
   - Vérification avant chaque utilisation : `tokenExpiresAt < NOW`
   - Si expiré → Appel API refresh token
   - Update `accessToken` et `tokenExpiresAt` en BDD
   - Log dans `social_publish_logs` : action = `TOKEN_REFRESHED`

3. **Révocation par user :**
   - Endpoint : `DELETE /api/social-media/v1/accounts/:id`
   - Appel API plateforme pour révoquer token
   - Soft delete ou `status = 'revoked'`
   - Annulation des posts programmés pour ce compte

4. **Alertes expiration :**
   - Cron job quotidien (NestJS ou Spring Boot)
   - Détection tokens expirant dans < 7 jours
   - Email notification utilisateur
   - Event : `social.account.token.expiring`

---

### 7.2 Multi-tenancy

**RLS PostgreSQL (NestJS) :**

```sql
-- Activer RLS sur toutes les tables social_*
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_templates ENABLE ROW LEVEL SECURITY;

-- Politique d'isolation par projet
CREATE POLICY social_accounts_isolation ON social_accounts
  USING (project_id = current_setting('app.current_project_id')::int);

CREATE POLICY social_posts_isolation ON social_posts
  USING (project_id = current_setting('app.current_project_id')::int);

-- Idem pour toutes les autres tables
```

**Validation applicative (Spring Boot) :**

```java
private void validateProjectId(DomainEvent event) {
    if (event.projectId == null || event.projectId.isBlank()) {
        log.error("❌ Event missing project_id: {}", event);
        throw new IllegalArgumentException("project_id is required");
    }

    int projectId = Integer.parseInt(event.projectId);
    if (projectId <= 0) {
        throw new IllegalArgumentException("Invalid project_id: " + projectId);
    }
}
```

**Isolation stricte des comptes sociaux :**
- Un utilisateur du projet A ne peut JAMAIS publier via un compte connecté au projet B
- Vérification dans `SocialMediaService.createPost()` :
  ```typescript
  const account = await this.db.select()
    .from(socialAccounts)
    .where(and(
      eq(socialAccounts.id, accountId),
      eq(socialAccounts.projectId, currentProjectId)
    ));

  if (!account) {
    throw new ForbiddenException('Account not found or access denied');
  }
  ```

---

### 7.3 Rate Limiting

**Respecter les limites des APIs :**

| Platform | Limite | Stratégie |
|----------|--------|-----------|
| LinkedIn | 100 posts/jour | Queue avec throttling (max 1 post/minute) |
| Twitter/X | 300 tweets/3h | Throttling dynamique (1 post/30s) |
| Facebook | Varie par app | Respect headers `X-App-Usage` |
| Instagram | 25 posts/jour | Queue avec délai 1h entre posts |

**Implémentation (Spring Boot) :**

```java
@Service
public class RateLimiter {
    private final Map<String, Deque<Instant>> requestHistory = new ConcurrentHashMap<>();

    public boolean canPublish(String platform) {
        Deque<Instant> history = requestHistory.computeIfAbsent(platform, k -> new LinkedList<>());

        Instant now = Instant.now();
        Instant windowStart = switch (platform) {
            case "twitter" -> now.minus(3, ChronoUnit.HOURS);
            case "linkedin" -> now.minus(1, ChronoUnit.DAYS);
            default -> now.minus(1, ChronoUnit.HOURS);
        };

        // Remove old entries
        history.removeIf(timestamp -> timestamp.isBefore(windowStart));

        int maxRequests = switch (platform) {
            case "twitter" -> 300;
            case "linkedin" -> 100;
            case "facebook" -> 200;
            case "instagram" -> 25;
            default -> 50;
        };

        if (history.size() >= maxRequests) {
            return false; // Rate limit exceeded
        }

        history.add(now);
        return true;
    }
}
```

**Retry avec exponential backoff :**
- 1ère tentative : Immédiate
- 2ème tentative : +5 minutes
- 3ème tentative : +15 minutes
- 4ème tentative : +1 heure
- Max 3 retries

---

### 7.4 Permissions

**Rôles projet ZodBack :**
- `project_admin` : Full access (connexion comptes, publication, analytics)
- `social_media_manager` : Connexion comptes, création/publication posts
- `social_media_editor` : Création posts (brouillons uniquement, pas de publication)
- `social_media_viewer` : Lecture seule (analytics, posts publiés)

**Permissions granulaires :**
```typescript
enum SocialMediaPermission {
  CONNECT_ACCOUNTS = 'social:connect_accounts',
  DISCONNECT_ACCOUNTS = 'social:disconnect_accounts',
  CREATE_POSTS = 'social:create_posts',
  PUBLISH_POSTS = 'social:publish_posts',
  DELETE_POSTS = 'social:delete_posts',
  VIEW_ANALYTICS = 'social:view_analytics',
  MANAGE_TEMPLATES = 'social:manage_templates',
  UPLOAD_MEDIA = 'social:upload_media',
}
```

**Guard NestJS :**
```typescript
@Injectable()
export class SocialPermissionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requiredPermission = this.reflector.get('permission', context.getHandler());

    return user.permissions.includes(requiredPermission);
  }
}

// Usage:
@Post('posts/:id/publish')
@UseGuards(SocialPermissionsGuard)
@RequirePermission(SocialMediaPermission.PUBLISH_POSTS)
async publishPost(@Param('id') id: number) {
  // ...
}
```

---

## 8. TESTS & VALIDATION

### 8.1 Tests NestJS

**Structure :**
```
backend/src/social-media/
├── __tests__/
│   ├── unit/
│   │   ├── linkedin-oauth.service.spec.ts
│   │   ├── social-encryption.service.spec.ts
│   │   ├── social-scheduler.service.spec.ts
│   │   └── social-analytics.service.spec.ts
│   ├── integration/
│   │   ├── social-accounts.integration.spec.ts
│   │   ├── social-posts.integration.spec.ts
│   │   └── event-publishing.integration.spec.ts
│   └── e2e/
│       ├── oauth-flow.e2e.spec.ts
│       ├── post-lifecycle.e2e.spec.ts
│       └── multi-platform-publishing.e2e.spec.ts
```

**Tests unitaires (exemples) :**

```typescript
// linkedin-oauth.service.spec.ts
describe('LinkedInOAuthService', () => {
  it('should generate valid authorization URL', () => {
    const url = service.getAuthorizationUrl();
    expect(url).toContain('linkedin.com/oauth/v2/authorization');
    expect(url).toContain('scope=r_basicprofile+w_member_social');
  });

  it('should exchange code for tokens', async () => {
    const result = await service.exchangeCodeForTokens('test_code');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
});

// social-encryption.service.spec.ts
describe('SocialEncryptionService', () => {
  it('should encrypt and decrypt token correctly', () => {
    const plainText = 'super_secret_token_123';
    const encrypted = service.encrypt(plainText);
    const decrypted = service.decrypt(encrypted);

    expect(encrypted).not.toEqual(plainText);
    expect(decrypted).toEqual(plainText);
  });

  it('should generate unique IV for each encryption', () => {
    const token = 'same_token';
    const encrypted1 = service.encrypt(token);
    const encrypted2 = service.encrypt(token);

    expect(encrypted1).not.toEqual(encrypted2); // Different IVs
  });
});
```

**Tests intégration (exemples) :**

```typescript
// social-posts.integration.spec.ts
describe('Social Posts Integration', () => {
  let app: INestApplication;
  let eventBus: EventBusService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [SocialMediaModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    eventBus = module.get(EventBusService);
  });

  it('should create post and emit social.post.scheduled event', async () => {
    const eventSpy = jest.spyOn(eventBus, 'emit');

    const response = await request(app.getHttpServer())
      .post('/api/social-media/v1/posts')
      .set('X-Project-Id', '42')
      .set('Authorization', 'Bearer test_token')
      .send({
        content: 'Test post',
        platforms: ['linkedin'],
        accountIds: [1],
        scheduledAt: '2026-01-25T10:00:00Z',
        status: 'scheduled',
      })
      .expect(201);

    expect(response.body.postId).toBeDefined();
    expect(eventSpy).toHaveBeenCalledWith(
      'social.post.scheduled',
      expect.objectContaining({
        postId: response.body.postId,
        platforms: ['linkedin'],
      })
    );
  });
});
```

**Tests E2E (exemples) :**

```typescript
// oauth-flow.e2e.spec.ts
describe('OAuth Flow E2E', () => {
  it('should complete LinkedIn OAuth flow', async () => {
    // 1. Request authorization URL
    const authResponse = await request(app.getHttpServer())
      .post('/api/social-media/v1/accounts/connect')
      .send({ platform: 'linkedin' })
      .expect(200);

    expect(authResponse.body.authUrl).toContain('linkedin.com');
    const state = authResponse.body.state;

    // 2. Simulate LinkedIn callback
    const callbackResponse = await request(app.getHttpServer())
      .get(`/api/social-media/v1/accounts/callback?code=test_code&state=${state}`)
      .expect(200);

    expect(callbackResponse.body.accountId).toBeDefined();
    expect(callbackResponse.body.platform).toBe('linkedin');

    // 3. Verify account saved in database
    const account = await db.select()
      .from(socialAccounts)
      .where(eq(socialAccounts.id, callbackResponse.body.accountId));

    expect(account[0].accessToken).toBeDefined();
    expect(account[0].accessToken).not.toContain('test_token'); // Should be encrypted
  });
});
```

---

### 8.2 Tests Spring Boot

**Structure :**
```
spring-services/src/test/java/com/zodback/spring/social/
├── handler/
│   └── SocialEventHandlerTest.java
├── jobs/
│   ├── SocialPublishingJobTest.java
│   └── SocialRetryJobTest.java
├── publishers/
│   ├── LinkedInPublisherTest.java
│   └── TwitterPublisherTest.java
└── integration/
    ├── EventPollingIntegrationTest.java
    └── PublishingWorkflowIntegrationTest.java
```

**Tests unitaires (exemples) :**

```java
// LinkedInPublisherTest.java
@SpringBootTest
class LinkedInPublisherTest {

    @Autowired
    private LinkedInPublisher linkedInPublisher;

    @MockBean
    private RestTemplate restTemplate;

    @Test
    void shouldPublishPostSuccessfully() {
        // Given
        PostDetails post = PostDetails.builder()
            .content("Test post")
            .platformAccountId("urn:li:person:123")
            .build();

        LinkedInShareResponse mockResponse = new LinkedInShareResponse();
        mockResponse.id = "urn:li:share:456";

        when(restTemplate.exchange(anyString(), any(), any(), eq(LinkedInShareResponse.class)))
            .thenReturn(ResponseEntity.ok(mockResponse));

        // When
        PublishResult result = linkedInPublisher.publish(post);

        // Then
        assertEquals("published", result.status);
        assertEquals("urn:li:share:456", result.externalId);
    }

    @Test
    void shouldThrowRateLimitException() {
        // Given
        when(restTemplate.exchange(anyString(), any(), any(), any()))
            .thenThrow(new HttpClientErrorException(HttpStatus.TOO_MANY_REQUESTS));

        // When/Then
        assertThrows(RateLimitException.class, () -> {
            linkedInPublisher.publish(PostDetails.builder().build());
        });
    }
}
```

**Tests intégration (exemples) :**

```java
// EventPollingIntegrationTest.java
@SpringBootTest
@Sql("/test-data/social-events.sql")
class EventPollingIntegrationTest {

    @Autowired
    private SocialEventHandler eventHandler;

    @MockBean
    private Scheduler scheduler;

    @Test
    void shouldCreateQuartzJobWhenPostScheduled() throws SchedulerException {
        // Given
        DomainEvent event = DomainEvent.builder()
            .name("social.post.scheduled")
            .eventId("evt_123")
            .projectId("42")
            .payload(Map.of(
                "postId", 789,
                "scheduledAt", "2026-01-25T10:00:00Z",
                "platforms", List.of("linkedin")
            ))
            .build();

        // When
        eventHandler.handle(event);

        // Then
        verify(scheduler, times(1)).scheduleJob(
            argThat(job -> job.getKey().getName().equals("post-789")),
            any(Trigger.class)
        );
    }
}
```

---

### 8.3 Tests de conformité

**Checklist obligatoire :**

```typescript
// backend/src/social-media/__tests__/compliance.spec.ts
describe('Social Media Module - Compliance Tests', () => {

  describe('Multi-tenancy', () => {
    it('should isolate accounts between projects', async () => {
      // Create account in project 1
      const account1 = await createAccount(projectId: 1, platform: 'linkedin');

      // Try to access from project 2
      await expect(
        getAccount(accountId: account1.id, projectId: 2)
      ).rejects.toThrow('Account not found');
    });

    it('should enforce RLS on all social_* tables', async () => {
      // Verify RLS is enabled
      const tables = ['social_accounts', 'social_posts', 'social_media_library'];

      for (const table of tables) {
        const result = await db.execute(sql`
          SELECT relname, relrowsecurity
          FROM pg_class
          WHERE relname = ${table}
        `);

        expect(result[0].relrowsecurity).toBe(true);
      }
    });
  });

  describe('Event-driven', () => {
    it('should emit event on post creation', async () => {
      const eventSpy = jest.spyOn(eventBus, 'emit');

      await socialMediaService.createPost({...});

      expect(eventSpy).toHaveBeenCalledWith('social.post.scheduled', expect.any(Object));
    });

    it('should NOT make direct calls to Spring Boot', async () => {
      // Verify no HTTP client configured for Spring Boot in NestJS module
      const httpService = moduleRef.get(HttpService, { strict: false });
      expect(httpService).toBeUndefined();
    });
  });

  describe('Idempotence', () => {
    it('should handle duplicate event gracefully', async () => {
      const event = {
        name: 'social.post.scheduled',
        eventId: 'evt_duplicate',
        // ...
      };

      await eventBus.publish(event);
      await eventBus.publish(event); // Replay

      // Verify only 1 Quartz job created
      const jobs = await getQuartzJobs();
      expect(jobs.length).toBe(1);
    });
  });

  describe('Rate limiting', () => {
    it('should respect LinkedIn rate limits', async () => {
      // Simulate 100 posts in 24h
      for (let i = 0; i < 100; i++) {
        await publishToLinkedIn({...});
      }

      // 101st should be throttled
      await expect(publishToLinkedIn({...}))
        .rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Security', () => {
    it('should encrypt tokens before storage', async () => {
      const account = await createAccount({
        accessToken: 'plain_token_123'
      });

      const dbAccount = await db.select()
        .from(socialAccounts)
        .where(eq(socialAccounts.id, account.id));

      expect(dbAccount[0].accessToken).not.toBe('plain_token_123');
      expect(dbAccount[0].accessToken).toContain(':'); // IV:CipherText format
    });
  });
});
```

---

## 9. PLAN DE ROLLOUT

### Phase 1 : Fondations (P0) - 8-10 heures

**Objectif :** Infrastructure de base fonctionnelle

**Tâches :**
- [ ] Créer schéma DB NestJS (`social_accounts`, `social_posts`)
- [ ] Migration Drizzle + indexes
- [ ] Activer RLS PostgreSQL
- [ ] Créer module NestJS `SocialMediaModule`
- [ ] Implémenter `SocialEncryptionService` (AES-256)
- [ ] OAuth LinkedIn uniquement (MVP)
  - [ ] `LinkedInOAuthService`
  - [ ] Endpoints `/accounts/connect` et `/accounts/callback`
- [ ] Event bus integration
  - [ ] Événement `social.account.connected`
- [ ] Tests unitaires (OAuth, encryption)
- [ ] Tests intégration (connexion compte LinkedIn)

**Critères de validation :**
- User peut connecter son compte LinkedIn
- Token chiffré en BDD
- Événement `social.account.connected` émis
- RLS activé et testé
- Aucun crash si Spring Boot est down

---

### Phase 2 : Publishing (P0) - 10-12 heures

**Objectif :** Publication basique sur LinkedIn

**Tâches :**

**NestJS :**
- [ ] CRUD Posts (`SocialPostsController`, `SocialMediaService`)
  - [ ] `POST /posts` (création brouillon + scheduled)
  - [ ] `GET /posts` (liste)
  - [ ] `GET /posts/:id` (détails)
  - [ ] `PUT /posts/:id` (modification)
  - [ ] `DELETE /posts/:id` (suppression)
- [ ] Événement `social.post.scheduled`
- [ ] Validation contenu (longueur, plateformes supportées)
- [ ] Tests API endpoints

**Spring Boot :**
- [ ] Créer schéma DB (`social_publish_jobs`, `social_publish_logs`)
- [ ] Polling NestJS events (`EventPollingService`)
- [ ] `SocialEventHandler` (consomme `social.post.scheduled`)
- [ ] Configuration Quartz Scheduler
- [ ] `SocialPublishingJob` (execute publication)
- [ ] `LinkedInPublisher` (appel API LinkedIn v2)
- [ ] `SocialPublishingService` (orchestration)
- [ ] Événements retour :
  - [ ] `social.post.publishing`
  - [ ] `social.post.published`
- [ ] Tests unitaires (publishers, handlers)
- [ ] Tests intégration (polling, Quartz jobs)

**Critères de validation :**
- User peut créer un post programmé
- Spring Boot poll l'événement et crée un Quartz job
- Job s'exécute à l'heure prévue
- Post publié sur LinkedIn avec succès
- Événement `social.post.published` émis
- NestJS update status `published` + `platformResults`

---

### Phase 3 : Retry Logic (P0) - 6-8 heures

**Objectif :** Gestion des échecs et retry automatique

**Tâches :**
- [ ] Créer table `social_retry_queue`
- [ ] `SocialRetryJob` (scheduled job, toutes les minutes)
- [ ] Exponential backoff logic
- [ ] Exception handling (RateLimitException, InvalidTokenException)
- [ ] Événement `social.post.failed`
- [ ] NestJS handler pour update status `failed`
- [ ] Tests retry scenarios
  - [ ] Rate limit Twitter
  - [ ] Token expiré
  - [ ] Network error

**Critères de validation :**
- Publication échouée → Enregistrement dans retry queue
- Retry automatique après délai (5min, 15min, 1h)
- Après 3 retries → Mark as failed + événement
- Notification email échec (UNWE)

---

### Phase 4 : Multi-plateforme (P0) - 8-10 heures

**Objectif :** Support LinkedIn + Facebook + X/Twitter

**Tâches :**
- [ ] OAuth Facebook (`FacebookOAuthService`)
- [ ] OAuth X/Twitter (`TwitterOAuthService`)
- [ ] `FacebookPublisher` (Meta Graph API)
- [ ] `TwitterPublisher` (X API v2)
- [ ] Update `SocialPublishingService` pour multi-plateforme
- [ ] Tests publication simultanée (LinkedIn + Twitter)
- [ ] Gestion échecs partiels (LinkedIn OK, Twitter KO)

**Critères de validation :**
- User peut connecter LinkedIn + Facebook + Twitter
- Création post multi-plateforme (1 post → 3 réseaux)
- Publication simultanée avec résultats par plateforme
- Retry isolé par plateforme (si Twitter fail, retry uniquement Twitter)

---

### Phase 5 : Analytics (P0) - 6-8 heures

**Objectif :** Récupération métriques basiques

**Tâches :**
- [ ] Créer table `social_analytics`
- [ ] `SocialAnalyticsService` (récupération métriques via APIs)
  - [ ] LinkedIn Insights API
  - [ ] Facebook Graph API (insights)
  - [ ] Twitter Analytics API
- [ ] Endpoints analytics
  - [ ] `GET /analytics/:postId`
  - [ ] `GET /analytics/overview`
- [ ] Cron job sync quotidien (ou après publication)
- [ ] Événement `social.analytics.synced`
- [ ] Update `social_posts` (viewsCount, likesCount, etc.)

**Critères de validation :**
- Métriques récupérées depuis LinkedIn après publication
- Dashboard affiche views, likes, comments, shares
- Sync automatique quotidien

---

### Phase 6 : Bibliothèque Média (P1) - 5-7 heures

**Objectif :** Upload et gestion d'images/vidéos

**Tâches :**
- [ ] Créer table `social_media_library`
- [ ] Configuration S3/MinIO (`SocialMediaStorageService`)
- [ ] Endpoint `POST /media/upload` (multipart/form-data)
- [ ] Endpoint `GET /media` (liste)
- [ ] Endpoint `DELETE /media/:id`
- [ ] Validation fichiers (taille max, MIME types)
- [ ] Génération thumbnails (optionnel)
- [ ] Tests upload

**Critères de validation :**
- User peut uploader une image
- Image stockée dans S3 avec URL publique
- Image utilisable dans posts
- Suppression impossible si `usageCount > 0`

---

### Phase 7 : Templates & Hashtags (P1) - 4-6 heures

**Objectif :** Templates réutilisables et suggestions hashtags

**Tâches :**
- [ ] Créer table `social_templates`
- [ ] CRUD Templates (`SocialTemplatesController`)
- [ ] Endpoint `POST /posts/from-template`
- [ ] Variable substitution (`{{title}}`, `{{url}}`)
- [ ] Créer table `social_hashtag_suggestions`
- [ ] Service suggestions hashtags (basique : liste prédéfinie)
- [ ] Endpoint `GET /hashtags/suggestions?keyword=ai`

**Critères de validation :**
- User peut créer un template
- Génération post depuis template avec variables
- Suggestions hashtags fonctionnelles

---

### Phase 8 : Notifications UNWE (P1) - 3-5 heures

**Objectif :** Alertes email/push pour succès/échec

**Tâches :**
- [ ] Spring Boot : Handler `social.account.connected` → Email confirmation
- [ ] Spring Boot : Handler `social.post.published` → Email succès
- [ ] Spring Boot : Handler `social.post.failed` → Email échec
- [ ] Templates Thymeleaf (3 templates)
- [ ] Tests emails (MailHog ou mock SMTP)

**Critères de validation :**
- Email envoyé après connexion compte
- Email envoyé après publication réussie
- Email envoyé après échec (avec recommandations)

---

### Phase 9 : Instagram Support (P1) - 4-6 heures

**Objectif :** Ajout Instagram

**Tâches :**
- [ ] OAuth Instagram (via Facebook)
- [ ] `InstagramPublisher` (Instagram Graph API)
- [ ] Contraintes spécifiques (ratio images, légendes)
- [ ] Tests publication Instagram

**Critères de validation :**
- User peut connecter compte Instagram Business
- Publication photos Instagram avec succès

---

### Phase 10 : AI Content Generation (P2) - 8-10 heures

**Objectif :** Génération de posts via GPT-4

**Tâches :**
- [ ] Service Python `ai-content-generator`
- [ ] Endpoint NestJS `POST /posts/generate`
  - [ ] Proxy vers Python
- [ ] Intégration OpenAI API
- [ ] Prompts optimisés par plateforme
  - [ ] LinkedIn : Ton professionnel
  - [ ] Twitter : Concis, engageant
  - [ ] Facebook : Convivial
- [ ] Tests génération contenu

**Critères de validation :**
- User fournit un sujet → AI génère 3 versions du post
- Respect longueurs par plateforme
- Qualité contenu acceptable

---

### Phase 11 : Social Listening (P2) - 10-12 heures

**Objectif :** Monitoring mentions et hashtags

**Tâches :**
- [ ] Service Python `social-listener`
- [ ] Polling APIs sociales (mentions, hashtags)
- [ ] Stockage mentions en BDD
- [ ] Sentiment analysis (Hugging Face)
- [ ] Dashboard mentions
- [ ] Alertes mentions importantes

**Critères de validation :**
- Détection mentions de la marque sur Twitter
- Sentiment analysis (positif/négatif/neutre)
- Alertes temps réel

---

### Phase 12 : Workflow Approbation (P2) - 8-10 heures

**Objectif :** Validation multi-niveaux avant publication

**Tâches :**
- [ ] Table `social_approval_workflows`
- [ ] Statuts posts : `draft → pending_approval → approved → published`
- [ ] Rôles : `editor`, `approver`, `publisher`
- [ ] Notifications approbateurs
- [ ] Endpoint `POST /posts/:id/request-approval`
- [ ] Endpoint `POST /posts/:id/approve`
- [ ] Endpoint `POST /posts/:id/reject`

**Critères de validation :**
- Editor crée post → Demande approbation
- Approver reçoit notification → Approuve
- Post automatiquement publié après approbation

---

### Phase 13 : Analytics Avancés (P2) - 6-8 heures

**Objectif :** ROI, engagement rate, best times to post

**Tâches :**
- [ ] Service Python `advanced-analytics`
- [ ] Calcul engagement rate par plateforme
- [ ] Détection best times to post (ML basique)
- [ ] ROI tracking (si lié à paiements)
- [ ] Dashboard analytics avancés
- [ ] Export rapports PDF

**Critères de validation :**
- Dashboard affiche engagement trends
- Recommandations horaires optimaux
- Export PDF mensuel

---

## 10. MÉTRIQUES & OBSERVABILITÉ

### Logs centralisés

**NestJS (nestjs-pino) :**
```typescript
logger.info('Publishing post', {
  postId: 789,
  projectId: 42,
  platforms: ['linkedin', 'twitter'],
  eventId: 'evt_123',
});
```

**Spring Boot (SLF4J) :**
```java
log.info("Publishing post {} to platform {} (projectId={}, eventId={})",
    postId, platform, projectId, eventId);
```

**Corrélation :** Tous les logs contiennent `eventId` pour traçabilité end-to-end.

---

### Métriques (Prometheus)

**NestJS :**
```typescript
// social-media.service.ts
import { Counter, Histogram } from 'prom-client';

const postsScheduledCounter = new Counter({
  name: 'social_posts_scheduled_total',
  help: 'Total number of posts scheduled',
  labelNames: ['project_id', 'platform'],
});

const publishDurationHistogram = new Histogram({
  name: 'social_publish_duration_seconds',
  help: 'Duration of post publication',
  labelNames: ['platform', 'status'],
});
```

**Spring Boot (Actuator) :**
```java
// SocialPublishingService.java
@Timed(value = "social.publish.duration", description = "Time to publish post")
public void publishPost(int postId, int projectId) {
    // ...
    publishCounter.labels(platform, "success").inc();
}
```

---

### Health Checks

**NestJS :**
```typescript
@Controller('health')
export class HealthController {
  @Get('social')
  async checkSocialMedia() {
    // Verify database connectivity
    const accountsCount = await db.select({ count: count() })
      .from(socialAccounts);

    // Verify S3 connectivity
    const s3Healthy = await this.storageService.healthCheck();

    return {
      status: 'healthy',
      accounts: accountsCount[0].count,
      storage: s3Healthy ? 'ok' : 'degraded',
    };
  }
}
```

**Spring Boot (Actuator) :**
```java
@Component
public class SocialMediaHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        // Check LinkedIn API connectivity
        boolean linkedInOk = testLinkedInApi();

        // Check Quartz scheduler
        boolean quartzOk = scheduler.isStarted();

        if (linkedInOk && quartzOk) {
            return Health.up()
                .withDetail("linkedin", "reachable")
                .withDetail("quartz", "running")
                .build();
        }

        return Health.down()
            .withDetail("linkedin", linkedInOk ? "ok" : "unreachable")
            .withDetail("quartz", quartzOk ? "ok" : "stopped")
            .build();
    }
}
```

---

### Alertes

**Monitoring (Grafana) :**
- `social_posts_failed_total > 10` dans 5min → Slack alert
- `social_token_expired_count > 5` → Email admins
- `social_publish_duration_seconds > 30s` (p95) → Investigation latency
- LinkedIn API unreachable → PagerDuty

---

## 11. DOCUMENTATION À PRODUIRE

### 11.1 Guide de configuration OAuth

**Fichier :** `docs/social-media/oauth-setup.md`

**Contenu :**
1. **LinkedIn :**
   - Créer app sur LinkedIn Developers
   - Configurer Redirect URLs
   - Obtenir Client ID / Client Secret
   - Scopes requis : `r_basicprofile`, `w_member_social`
   - Variables d'environnement `.env`

2. **Facebook :**
   - Meta for Developers
   - Créer app Facebook/Instagram
   - Permissions : `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`
   - Configuration webhooks

3. **X/Twitter :**
   - Twitter Developer Portal
   - OAuth 2.0 configuration
   - Scopes : `tweet.read`, `tweet.write`, `users.read`

4. **Instagram :**
   - Via Facebook app
   - Instagram Business account requis
   - Configuration Graph API

---

### 11.2 Documentation API endpoints

**Fichier :** `docs/social-media/api-reference.md`

**Format OpenAPI/Swagger :**
```yaml
openapi: 3.0.0
info:
  title: ZodBack Social Media API
  version: 1.0.0

paths:
  /api/social-media/v1/accounts/connect:
    post:
      summary: Initiate OAuth flow
      parameters:
        - name: X-Project-Id
          in: header
          required: true
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                platform:
                  type: string
                  enum: [linkedin, facebook, twitter, instagram]
      responses:
        200:
          description: Authorization URL returned
          content:
            application/json:
              schema:
                type: object
                properties:
                  authUrl:
                    type: string
                  state:
                    type: string
```

---

### 11.3 Guide utilisateur

**Fichier :** `docs/social-media/user-guide.md`

**Sections :**
1. **Connexion de comptes sociaux**
   - Capture d'écran OAuth flow
   - Troubleshooting (token expiré, permissions refusées)

2. **Création d'un post**
   - Interface WYSIWYG
   - Preview par plateforme
   - Limites de caractères

3. **Publication programmée**
   - Calendrier visuel
   - Modification avant publication
   - Annulation

4. **Analytics**
   - Tableau de bord
   - Export rapports
   - Interprétation métriques

---

### 11.4 Architecture Decision Records (ADR)

**Fichier :** `.agent/ai-memory/$_research/adr_social_media.md`

**Décisions clés :**
1. **ADR-001 : Chiffrement tokens OAuth avec AES-256**
   - Context : Tokens sensibles stockés en BDD
   - Decision : AES-256-CBC avec IV aléatoire
   - Consequences : Sécurité renforcée, légère latence déchiffrement

2. **ADR-002 : Scheduling via Spring Boot Quartz (pas NestJS Bull)**
   - Context : Besoin de scheduling robuste
   - Decision : Déléguer à Spring Boot UNWE
   - Consequences : Expertise Java scheduling, mais dépendance Spring Boot

3. **ADR-003 : Retry avec exponential backoff (5min, 15min, 1h)**
   - Context : Rate limiting APIs sociales
   - Decision : Max 3 retries avec délais croissants
   - Consequences : Évite spam APIs, mais délai publication max 1h20

4. **ADR-004 : Storage S3/MinIO pour médias (pas PostgreSQL BLOB)**
   - Context : Images/vidéos volumineuses
   - Decision : S3-compatible storage
   - Consequences : Scalabilité, CDN-ready, coût storage séparé

---

## 12. QUESTIONS & RISQUES

### Questions à clarifier

1. **Prioriser quelles plateformes en premier ?**
   - **Recommandation :** LinkedIn > Facebook > X/Twitter > Instagram
   - **Justification :** LinkedIn API la plus stable, Facebook Graph API mature, Twitter API v2 récente, Instagram nécessite Business account

2. **Utiliser S3 ou MinIO pour stockage médias ?**
   - **S3 (AWS)** : Production, CDN CloudFront, coût variable
   - **MinIO** : Développement local, self-hosted, gratuit
   - **Recommandation :** MinIO en dev, S3 en prod

3. **Spring Boot pour scheduling ou NestJS Bull ?**
   - **Spring Boot Quartz** : Robuste, persistance jobs en BDD, clustering
   - **NestJS Bull** : Redis-based, plus léger, mais moins features
   - **Recommandation :** Spring Boot Quartz (déjà utilisé pour UNWE, expertise)

4. **AI content generation dès MVP ou P2 ?**
   - **Recommandation :** P2 (Premium feature)
   - **Justification :** Coût OpenAI API, feature différenciante pour abonnement premium

5. **Comment gérer les quotas par projet ?**
   - **Recommandation :** Table `project_quotas` avec `social_posts_per_month`
   - **Validation :** Avant création post, vérifier quota non atteint
   - **Upgrade :** Via événement `payment.subscription.activated`

---

### Risques identifiés

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| **Rate limiting APIs sociales** | High | High | Queue + throttling + retry exponential backoff |
| **Token expiration non détectée** | Medium | Medium | Auto-refresh tokens + alertes expiration < 7j |
| **Complexité OAuth flows** | Medium | Low | Librairies éprouvées (Passport.js) + tests E2E |
| **Coût stockage médias S3** | Medium | Medium | Compression images + CDN + quotas par projet |
| **APIs sociales deprecation** | High | Low | Versioning APIs + monitoring changelog plateformes |
| **GDPR compliance (données utilisateurs)** | High | Low | Chiffrement tokens + suppression cascade user deleted |
| **Performance Spring Boot (polling)** | Low | Medium | Polling interval optimisé (5s) + cache events |
| **Dépendance critique Spring Boot** | Medium | Low | NestJS fonctionne sans Spring (notifications basiques intégrées) |

---

## 13. CRITÈRES DE SUCCÈS

### MVP (P0) - Validation

**Fonctionnel :**
- [ ] User peut connecter LinkedIn, Facebook, X/Twitter
- [ ] User peut créer un post multi-plateforme
- [ ] User peut programmer publication à date/heure précise
- [ ] Publication automatique via Spring Boot Quartz
- [ ] Retry automatique en cas d'échec (rate limit, network error)
- [ ] Métriques basiques affichées (views, likes, comments, shares)

**Technique :**
- [ ] Multi-tenancy strict : isolation projet testée
- [ ] Event-driven pur : aucun appel direct NestJS ↔ Spring Boot
- [ ] RLS activé sur toutes les tables `social_*`
- [ ] Tokens chiffrés AES-256
- [ ] Idempotence : rejeu événement sans effet
- [ ] Tests E2E couvrent flux complet OAuth → Publication → Analytics

**Performance :**
- [ ] Publication LinkedIn < 5 secondes
- [ ] Polling events < 1 seconde latence
- [ ] Dashboard analytics < 2 secondes chargement

---

### P1 - Validation

**Fonctionnel :**
- [ ] Bibliothèque média fonctionnelle (upload S3)
- [ ] Templates de posts créés et utilisés
- [ ] Suggestions hashtags pertinentes
- [ ] Notifications email succès/échec
- [ ] Instagram support complet

**Technique :**
- [ ] S3 storage configuré avec CDN
- [ ] Quotas par projet enforced
- [ ] Rate limiting respecté (LinkedIn 100/jour, Twitter 300/3h)

---

### P2 - Validation

**Fonctionnel :**
- [ ] AI content generation via GPT-4
- [ ] Social listening actif (mentions, hashtags)
- [ ] Workflow d'approbation opérationnel
- [ ] Analytics avancés (ROI, best times)

**Technique :**
- [ ] Service Python intégré
- [ ] ML models performants (sentiment analysis)
- [ ] Export rapports automatisés

---

## 14. ESTIMATION GLOBALE

| Phase | Heures | Priorité |
|-------|--------|----------|
| Phase 1 : Fondations | 8-10h | P0 |
| Phase 2 : Publishing | 10-12h | P0 |
| Phase 3 : Retry Logic | 6-8h | P0 |
| Phase 4 : Multi-plateforme | 8-10h | P0 |
| Phase 5 : Analytics | 6-8h | P0 |
| **Total P0** | **38-48h** | **Bloquant MVP** |
| Phase 6 : Bibliothèque Média | 5-7h | P1 |
| Phase 7 : Templates & Hashtags | 4-6h | P1 |
| Phase 8 : Notifications UNWE | 3-5h | P1 |
| Phase 9 : Instagram Support | 4-6h | P1 |
| **Total P1** | **16-24h** | **Différenciation** |
| Phase 10 : AI Content Generation | 8-10h | P2 |
| Phase 11 : Social Listening | 10-12h | P2 |
| Phase 12 : Workflow Approbation | 8-10h | P2 |
| Phase 13 : Analytics Avancés | 6-8h | P2 |
| **Total P2** | **32-40h** | **Premium** |
| **TOTAL GLOBAL** | **86-112h** | **11-14 jours (1 dev)** |

---

## 15. CONCLUSION

Le module **Social Media Management** respecte scrupuleusement l'architecture ZodBack :

✅ **Multi-tenancy strict** : `project_id` obligatoire, RLS PostgreSQL
✅ **Event-driven pur** : Aucun appel direct inter-modules
✅ **API versionnée** : `/api/social-media/v1`
✅ **Sécurité** : Tokens chiffrés AES-256, OAuth robuste
✅ **Conformité Spring Boot** : UNWE consomme événements, aucune duplication Core
✅ **Tests obligatoires** : Unitaires, intégration, E2E, conformité
✅ **Scalabilité** : Queue, retry, rate limiting, S3 storage

**Prochaines étapes :**
1. Validation du plan par l'équipe
2. Setup environnement dev (OAuth apps LinkedIn, Facebook, Twitter)
3. Démarrage Phase 1 (Fondations)
4. Itération progressive selon feedback utilisateurs

---

**Auteur :** Kevin (Architect ZodBack)
**Date :** 2026-01-18
**Version :** 1.0
**Statut :** Ready for Implementation
