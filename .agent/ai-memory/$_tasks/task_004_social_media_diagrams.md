# Social Media Management - Technical Diagrams

## 1. OAuth Flow (LinkedIn)

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant NestJS
    participant LinkedIn
    participant DB
    participant EventBus
    participant Spring

    User->>Frontend: Click "Connect LinkedIn"
    Frontend->>NestJS: POST /accounts/connect {platform: linkedin}
    NestJS->>NestJS: Generate state token
    NestJS->>DB: Save state (Redis, TTL 10min)
    NestJS-->>Frontend: {authUrl, state}
    Frontend->>User: Redirect to authUrl
    User->>LinkedIn: Authorize app
    LinkedIn->>NestJS: Callback GET /callback?code=xyz&state=abc
    NestJS->>DB: Validate state token
    NestJS->>LinkedIn: Exchange code for tokens
    LinkedIn-->>NestJS: {access_token, refresh_token}
    NestJS->>LinkedIn: GET /v2/me (profile)
    LinkedIn-->>NestJS: {id, name}
    NestJS->>NestJS: Encrypt tokens (AES-256)
    NestJS->>DB: Insert social_accounts
    NestJS->>EventBus: Emit social.account.connected
    EventBus->>Spring: Poll event
    Spring->>Spring: Send confirmation email
    NestJS-->>Frontend: {accountId, platform, status}
    Frontend->>User: "Account connected!"
```

---

## 2. Scheduled Post Publication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant NestJS
    participant DB_Core as DB (zodback_core)
    participant EventBus
    participant Spring
    participant DB_Spring as DB (zodback_spring)
    participant Quartz
    participant LinkedIn

    User->>Frontend: Create post + schedule
    Frontend->>NestJS: POST /posts {content, scheduledAt, platforms}
    NestJS->>NestJS: Validate content, accounts
    NestJS->>DB_Core: Insert social_posts (status: scheduled)
    NestJS->>EventBus: Emit social.post.scheduled
    NestJS-->>Frontend: {postId, status: scheduled}

    Note over Spring: Polling loop (every 5 seconds)
    Spring->>EventBus: GET /events/poll?service=spring-unwe
    EventBus-->>Spring: [event: social.post.scheduled]
    Spring->>Spring: Validate project_id
    Spring->>DB_Spring: Save social_publish_jobs
    Spring->>Quartz: Create job (trigger at scheduledAt)
    Quartz-->>Spring: Job scheduled

    Note over Quartz: Wait until scheduledAt
    Quartz->>Spring: Trigger SocialPublishingJob.execute()
    Spring->>EventBus: Emit social.post.publishing
    EventBus->>NestJS: Event handler
    NestJS->>DB_Core: Update status: publishing

    Spring->>NestJS: GET /internal/v1/social/posts/:id
    NestJS-->>Spring: {content, mediaUrls, accountToken}
    Spring->>Spring: Decrypt accessToken
    Spring->>LinkedIn: POST /v2/ugcPosts {content, media}
    LinkedIn-->>Spring: {id: urn:li:share:123}
    Spring->>DB_Spring: Log publish success
    Spring->>EventBus: Emit social.post.published
    EventBus->>NestJS: Event handler
    NestJS->>DB_Core: Update status: published, platformResults
    EventBus->>Spring: Event handler
    Spring->>Spring: Send success email
    NestJS->>Frontend: WebSocket notification (optional)
    Frontend->>User: "Post published!"
```

---

## 3. Retry Flow (Rate Limit Exceeded)

```mermaid
sequenceDiagram
    participant Spring
    participant Twitter
    participant DB_Spring as DB (zodback_spring)
    participant RetryJob
    participant EventBus
    participant NestJS

    Spring->>Twitter: POST /2/tweets {text}
    Twitter-->>Spring: 429 Too Many Requests
    Spring->>Spring: Catch RateLimitException
    Spring->>DB_Spring: Insert social_retry_queue
    Note over DB_Spring: retryCount: 0<br/>nextRetryAt: +5min<br/>status: pending

    Note over RetryJob: Wait 5 minutes
    RetryJob->>DB_Spring: Find retries (nextRetryAt <= NOW)
    RetryJob->>Twitter: Retry POST /2/tweets
    Twitter-->>RetryJob: 429 Too Many Requests (again)
    RetryJob->>DB_Spring: Update retry_queue
    Note over DB_Spring: retryCount: 1<br/>nextRetryAt: +15min

    Note over RetryJob: Wait 15 minutes
    RetryJob->>DB_Spring: Find retries
    RetryJob->>Twitter: Retry POST /2/tweets
    Twitter-->>RetryJob: 200 OK {id: 1234567890}
    RetryJob->>DB_Spring: Update status: success
    RetryJob->>EventBus: Emit social.post.published
    EventBus->>NestJS: Update social_posts
    EventBus->>Spring: Send success email

    Note over Spring: Alternative: Max retries exceeded
    alt Max retries (3) exceeded
        RetryJob->>DB_Spring: Update status: failed
        RetryJob->>EventBus: Emit social.post.failed
        EventBus->>NestJS: Update status: failed
        EventBus->>Spring: Send failure email
    end
```

---

## 4. Multi-Platform Publishing

```mermaid
flowchart TD
    A[User creates post] --> B[NestJS: Save social_posts]
    B --> C[Emit: social.post.scheduled]
    C --> D[Spring Boot: Poll event]
    D --> E[Create Quartz job]
    E --> F[Wait until scheduledAt]
    F --> G{For each platform}

    G -->|LinkedIn| H1[LinkedInPublisher.publish]
    G -->|Twitter| H2[TwitterPublisher.publish]
    G -->|Facebook| H3[FacebookPublisher.publish]

    H1 --> I1{Success?}
    I1 -->|Yes| J1[Save result: published]
    I1 -->|No| K1[Schedule retry]

    H2 --> I2{Success?}
    I2 -->|Yes| J2[Save result: published]
    I2 -->|No| K2[Schedule retry]

    H3 --> I3{Success?}
    I3 -->|Yes| J3[Save result: published]
    I3 -->|No| K3[Schedule retry]

    J1 --> L{All succeeded?}
    J2 --> L
    J3 --> L

    L -->|Yes| M[Emit: social.post.published]
    L -->|No| N[Wait for retries]

    K1 --> N
    K2 --> N
    K3 --> N

    M --> O[NestJS: Update status]
    M --> P[Spring: Send email]
```

---

## 5. Token Refresh Flow

```mermaid
sequenceDiagram
    participant Spring
    participant NestJS
    participant DB
    participant LinkedIn

    Spring->>NestJS: GET /internal/v1/social/accounts/:id/token
    NestJS->>DB: SELECT social_accounts
    NestJS->>NestJS: Check token_expires_at

    alt Token expired
        NestJS->>NestJS: Decrypt refresh_token
        NestJS->>LinkedIn: POST /oauth/v2/accessToken
        Note over LinkedIn: grant_type=refresh_token
        LinkedIn-->>NestJS: {access_token, expires_in}
        NestJS->>NestJS: Encrypt new access_token
        NestJS->>DB: UPDATE social_accounts
        NestJS-->>Spring: {accessToken}
    else Token valid
        NestJS->>NestJS: Decrypt access_token
        NestJS-->>Spring: {accessToken}
    end

    Spring->>LinkedIn: Use accessToken for publishing
```

---

## 6. Analytics Sync Flow

```mermaid
flowchart TD
    A[Cron Job: Daily analytics sync] --> B{For each published post}
    B --> C[LinkedIn: GET /ugcPosts/:id/insights]
    B --> D[Twitter: GET /2/tweets/:id/metrics]
    B --> E[Facebook: GET /:post_id/insights]

    C --> F[Parse LinkedIn metrics]
    D --> G[Parse Twitter metrics]
    E --> H[Parse Facebook metrics]

    F --> I[Save to social_analytics]
    G --> I
    H --> I

    I --> J[Update social_posts aggregates]
    J --> K[Emit: social.analytics.synced]
    K --> L[Python: Calculate trends]
    K --> M[Update dashboard]
```

---

## 7. Event-Driven Architecture

```mermaid
graph TB
    subgraph NestJS [NestJS - Cerveau]
        A1[OAuth Services]
        A2[Posts CRUD]
        A3[Analytics Service]
        A4[Event Bus]
    end

    subgraph Spring [Spring Boot UNWE - Muscles]
        B1[Event Poller]
        B2[Quartz Scheduler]
        B3[Publishers]
        B4[Retry Queue]
        B5[Email Service]
    end

    subgraph Python [Python - Analyste]
        C1[AI Content Generator]
        C2[Social Listener]
        C3[Advanced Analytics]
    end

    subgraph External [External APIs]
        D1[LinkedIn API]
        D2[Twitter API]
        D3[Facebook API]
        D4[Instagram API]
    end

    A4 -->|social.post.scheduled| B1
    B1 --> B2
    B2 --> B3
    B3 --> D1
    B3 --> D2
    B3 --> D3
    B3 --> D4
    B3 -->|social.post.published| A4
    B3 -->|social.post.failed| A4
    A4 -->|social.account.connected| B5
    A4 -->|social.analytics.synced| C3
    A2 -->|generate content| C1
    C2 -->|mentions detected| A4

    style NestJS fill:#e1f5ff
    style Spring fill:#fff5e1
    style Python fill:#ffe1f5
    style External fill:#f0f0f0
```

---

## 8. Database Relationships

```mermaid
erDiagram
    PROJECTS ||--o{ SOCIAL_ACCOUNTS : has
    USERS ||--o{ SOCIAL_ACCOUNTS : connects
    PROJECTS ||--o{ SOCIAL_POSTS : has
    USERS ||--o{ SOCIAL_POSTS : creates
    SOCIAL_POSTS ||--o{ SOCIAL_ANALYTICS : has
    PROJECTS ||--o{ SOCIAL_MEDIA_LIBRARY : has
    USERS ||--o{ SOCIAL_MEDIA_LIBRARY : uploads
    PROJECTS ||--o{ SOCIAL_TEMPLATES : has

    PROJECTS {
        int id PK
        string name
    }

    USERS {
        int id PK
        string email
    }

    SOCIAL_ACCOUNTS {
        int id PK
        int project_id FK
        int user_id FK
        string platform
        string platform_account_id
        text access_token "ENCRYPTED"
        text refresh_token "ENCRYPTED"
        timestamp token_expires_at
        string status
    }

    SOCIAL_POSTS {
        int id PK
        int project_id FK
        int user_id FK
        text content
        jsonb platforms
        jsonb account_ids
        jsonb media_urls
        timestamp scheduled_at
        timestamp published_at
        string status
        jsonb platform_results
        int views_count
        int likes_count
    }

    SOCIAL_ANALYTICS {
        int id PK
        int project_id FK
        int post_id FK
        string platform
        int impressions
        int likes
        int comments
        int shares
        decimal engagement_rate
    }

    SOCIAL_MEDIA_LIBRARY {
        int id PK
        int project_id FK
        int user_id FK
        string filename
        string storage_path
        string public_url
        int usage_count
    }

    SOCIAL_TEMPLATES {
        int id PK
        int project_id FK
        string name
        text content_template
        jsonb platforms
        int usage_count
    }
```

---

## 9. State Machine (Post Status)

```mermaid
stateDiagram-v2
    [*] --> draft: User creates post
    draft --> scheduled: User sets scheduledAt
    draft --> publishing: User clicks "Publish Now"
    scheduled --> publishing: Quartz job triggers
    scheduled --> cancelled: User cancels
    publishing --> published: All platforms succeed
    publishing --> failed: All retries exhausted
    publishing --> partial: Some platforms fail
    partial --> published: Retries succeed
    partial --> failed: Retries exhausted
    published --> [*]
    failed --> [*]
    cancelled --> [*]

    note right of draft
        Editable
        Can be deleted
    end note

    note right of scheduled
        Cannot edit content
        Can cancel
        Waiting for Quartz
    end note

    note right of publishing
        Spring Boot executing
        Cannot cancel
    end note

    note right of published
        Immutable
        Analytics tracking
    end note

    note right of failed
        Manual retry available
        Email notification sent
    end note
```

---

## 10. Security Architecture

```mermaid
flowchart TD
    A[User] -->|Bearer Token| B[NestJS API Gateway]
    B -->|Validate Token| C{Authorized?}
    C -->|No| D[401 Unauthorized]
    C -->|Yes| E[Extract project_id]
    E --> F[Set RLS context]
    F --> G[Execute query with RLS]
    G --> H{Data belongs to project?}
    H -->|Yes| I[Return data]
    H -->|No| J[403 Forbidden]

    B -->|OAuth Token needed| K[Decrypt from DB]
    K --> L{Token expired?}
    L -->|Yes| M[Refresh token]
    L -->|No| N[Return token]
    M --> N

    B -->|Call Spring Boot| O[Add internal headers]
    O --> P[X-Internal-Token]
    O --> Q[X-Project-Id]
    O --> R[X-User-Id]
    P --> S[Spring Boot validates]
    Q --> S
    R --> S

    style B fill:#e1f5ff
    style K fill:#ffe1e1
    style S fill:#fff5e1
```

---

## Notes

- All diagrams use standard architectural patterns
- Event-driven flows ensure loose coupling
- RLS guarantees multi-tenancy isolation
- Token encryption prevents credential leaks
- Retry logic handles transient failures
- State machine prevents invalid transitions

**Location:** `.agent/ai-memory/$_tasks/task_004_social_media_diagrams.md`
