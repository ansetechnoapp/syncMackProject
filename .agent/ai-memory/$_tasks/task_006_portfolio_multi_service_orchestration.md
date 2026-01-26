# Task 006 — Portfolio Multi-Service Advanced Features

**Created:** 2026-01-18
**Status:** Architecture Planning
**Priority:** P1 (Strategic)
**Estimated Effort:** 156-224 hours

---

## 🎯 Objective

Design and implement **advanced portfolio features** that leverage the complementary strengths of all three services:
- **NestJS** → Core business logic, real-time orchestration, API gateway
- **Spring Boot** → Third-party integrations, notifications, document generation
- **Python** → AI/ML analytics, data processing, advanced algorithms

---

## 🏗️ Architecture Philosophy

### Service Responsibility Matrix

| Capability | NestJS | Spring Boot | Python | Rationale |
|------------|--------|-------------|--------|-----------|
| **Data persistence** | ✅ Primary | ❌ No | ❌ No | Single source of truth |
| **Business rules** | ✅ Primary | ❌ No | ❌ No | Domain logic centralized |
| **Real-time features** | ✅ Primary | ❌ No | 🔶 Consumer | WebSockets, event streaming |
| **Third-party APIs** | 🔶 Lightweight | ✅ Primary | ❌ No | OAuth, social media, webhooks |
| **Notifications** | 🔶 Trigger | ✅ Primary | ❌ No | Email, SMS, push, Slack |
| **Document generation** | ❌ No | ✅ Primary | 🔶 Templates | PDF, DOCX, presentations |
| **AI/ML processing** | ❌ No | ❌ No | ✅ Primary | Predictions, clustering, NLP |
| **Heavy data analysis** | ❌ No | ❌ No | ✅ Primary | Metrics, trends, patterns |
| **Async tasks** | 🔶 Trigger | 🔶 Consumer | ✅ Primary | Celery workers |

**Legend:** ✅ Primary responsibility | 🔶 Secondary/Consumer | ❌ Not responsible

---

## 📦 Feature Catalog (18 Advanced Features)

### Category A: AI-Powered Intelligence (Python-Led)

#### **A1. Portfolio Insights AI**
**Services:** Python (primary) → NestJS (data) → Spring Boot (notifications)

**Description:** ML-powered visitor behavior analysis with actionable recommendations.

**Components:**
- **Python Service:**
  - Scikit-learn clustering (visitor segments)
  - TensorFlow time-series forecasting (traffic prediction)
  - NLP sentiment analysis (testimonials/feedback)
  - Recommendation engine (content optimization)
- **NestJS Service:**
  - Event ingestion endpoint (`/api/analytics/v1/events`)
  - Dashboard API (`/api/insights/v1/summary`)
  - Real-time metrics via WebSocket
- **Spring Boot Service:**
  - Weekly insights email (scheduled task)
  - Slack notifications for anomalies

**Data Flow:**
```
User visits → NestJS logs event → Python batches & analyzes (Celery)
→ NestJS stores insights → Spring Boot sends weekly report
```

**Endpoints:**
- `POST /api/analytics/v1/events` (NestJS) - Log visitor event
- `GET /api/insights/v1/summary` (NestJS) - Get AI insights
- `POST /api/insights/v1/refresh` (NestJS) - Trigger ML recalculation (async)
- `GET /api/notifications/v1/insights/schedule` (Spring Boot) - Configure email schedule

**Deliverables:**
1. Python ML pipeline (`python_services/apps/ml_insights/`)
2. NestJS insights module (`backend/src/portfolio-insights/`)
3. Spring Boot email scheduler (`spring-services/src/.../scheduler/InsightsMailer.java`)
4. Dashboard widget (`frontend/app/(dashboard)/portfolio/insights/page.tsx`)

**Estimated Effort:** 24-32 hours

---

#### **A2. Smart SEO Optimizer**
**Services:** Python (primary) → NestJS (CRUD) → Spring Boot (monitoring)

**Description:** AI-driven SEO analysis with automated optimization suggestions.

**Components:**
- **Python Service:**
  - Web scraping for competitor analysis
  - Keyword density analysis (NLTK)
  - Readability scoring (Flesch-Kincaid)
  - Image optimization recommendations
  - Meta tag quality scoring
- **NestJS Service:**
  - SEO score API
  - Auto-apply suggestions endpoint
  - Historical SEO trends
- **Spring Boot Service:**
  - Google Search Console integration
  - Lighthouse CI monitoring (weekly scans)
  - SEO alerts (ranking drops)

**Data Flow:**
```
User requests analysis → Python scrapes + analyzes → NestJS stores scores
→ Spring Boot monitors GSC → Alerts on ranking changes
```

**Endpoints:**
- `POST /api/seo/v1/analyze` (NestJS) - Trigger SEO analysis
- `GET /api/seo/v1/scores` (NestJS) - Get SEO scores
- `PATCH /api/seo/v1/auto-optimize` (NestJS) - Apply AI suggestions
- `GET /api/integrations/v1/gsc/rankings` (Spring Boot) - Google Search Console data

**Estimated Effort:** 18-24 hours

---

#### **A3. Content Quality Analyzer**
**Services:** Python (primary) → NestJS (storage)

**Description:** NLP-based content quality assessment for projects/testimonials.

**Components:**
- **Python Service:**
  - Grammar/spelling checks (LanguageTool API)
  - Readability analysis
  - Keyword relevance scoring
  - Tone detection (professional/casual)
  - Duplicate content detection
- **NestJS Service:**
  - Quality score storage
  - Improvement suggestions API
  - Bulk analysis endpoint

**Endpoints:**
- `POST /api/content/v1/analyze` (NestJS) - Analyze content quality
- `GET /api/content/v1/suggestions/:projectId` (NestJS) - Get improvements

**Estimated Effort:** 12-16 hours

---

### Category B: Integration & Automation (Spring Boot-Led)

#### **B1. Social Media Auto-Publisher**
**Services:** Spring Boot (primary) → NestJS (triggers) → Python (content generation)

**Description:** Automated social media posting when portfolio content changes.

**Components:**
- **Spring Boot Service:**
  - LinkedIn API integration (OAuth 2.0)
  - Twitter/X API v2 integration
  - Facebook Graph API integration
  - Instagram Graph API integration
  - Post scheduling (Quartz)
  - Media upload handling
  - Retry logic with exponential backoff
- **NestJS Service:**
  - Domain event publisher (`ProjectPublishedEvent`)
  - Social media config CRUD
  - Manual post trigger endpoint
- **Python Service:**
  - AI-generated captions (OpenAI/Anthropic)
  - Image optimization for each platform
  - Hashtag recommendations

**Data Flow:**
```
User publishes project → NestJS emits event → Spring Boot receives event
→ Python generates caption → Spring Boot posts to platforms
```

**Endpoints:**
- `POST /api/social/v1/publish` (NestJS) - Trigger manual post
- `GET /api/social/v1/accounts` (NestJS) - List connected accounts
- `POST /api/integrations/v1/social/oauth/callback` (Spring Boot) - OAuth callback
- `GET /api/integrations/v1/social/posts/:platformId` (Spring Boot) - Post history

**Estimated Effort:** 32-40 hours (already planned in task_004)

---

#### **B2. Professional CV/Resume Generator**
**Services:** Spring Boot (primary) → NestJS (data) → Python (templates)

**Description:** Generate professional PDF/DOCX resumes from portfolio data.

**Components:**
- **Spring Boot Service:**
  - Apache POI (DOCX generation)
  - iText/Flying Saucer (PDF generation)
  - Template engine (Thymeleaf for HTML → PDF)
  - Multiple CV formats (ATS-friendly, creative, minimal)
- **NestJS Service:**
  - Export endpoint with format selection
  - Template customization CRUD
- **Python Service:**
  - LaTeX template rendering (Jinja2)
  - Advanced PDF styling (ReportLab)

**Data Flow:**
```
User clicks "Export CV" → NestJS fetches data → Spring Boot generates PDF
→ Returns download link
```

**Endpoints:**
- `POST /api/export/v1/cv` (NestJS) - Generate CV (triggers Spring Boot)
- `GET /api/export/v1/templates` (NestJS) - List available templates
- `POST /api/documents/v1/generate/pdf` (Spring Boot) - PDF generation service
- `POST /api/documents/v1/generate/docx` (Spring Boot) - DOCX generation service

**Estimated Effort:** 20-28 hours

---

#### **B3. Multi-Channel Notification Hub**
**Services:** Spring Boot (primary) → NestJS (triggers)

**Description:** Unified notification system for all portfolio events.

**Components:**
- **Spring Boot Service:**
  - Email (SendGrid/Mailgun/SES)
  - SMS (Twilio)
  - Slack webhooks
  - Discord webhooks
  - Push notifications (Firebase Cloud Messaging)
  - Telegram bot
  - Notification templates
  - Delivery tracking & retries
- **NestJS Service:**
  - Notification preferences CRUD
  - Event-to-notification mapper
  - Notification history API

**Events to Monitor:**
- New portfolio view
- Project liked/shared
- Contact form submission
- SEO score changes
- Analytics milestones (1000 views, etc.)

**Endpoints:**
- `POST /api/notifications/v1/send` (NestJS) - Send notification (triggers Spring Boot)
- `GET /api/notifications/v1/preferences` (NestJS) - Get user preferences
- `POST /api/messaging/v1/email` (Spring Boot) - Send email
- `POST /api/messaging/v1/sms` (Spring Boot) - Send SMS
- `POST /api/messaging/v1/slack` (Spring Boot) - Send Slack message

**Estimated Effort:** 16-24 hours

---

#### **B4. GitHub/GitLab Project Sync**
**Services:** Spring Boot (primary) → NestJS (storage) → Python (analysis)

**Description:** Auto-sync portfolio projects from GitHub/GitLab repositories.

**Components:**
- **Spring Boot Service:**
  - GitHub GraphQL API integration
  - GitLab REST API integration
  - OAuth app authorization
  - Webhook listener (repo updates)
  - README parser
  - Language detection
  - Star/fork tracking
- **NestJS Service:**
  - Sync configuration CRUD
  - Manual sync trigger
  - Project mapping (repo ↔ portfolio project)
- **Python Service:**
  - Code complexity analysis (Radon)
  - Dependency graph generation
  - Contribution insights

**Data Flow:**
```
User connects GitHub → Spring Boot fetches repos → NestJS creates/updates projects
→ Python analyzes code → NestJS stores metrics
```

**Endpoints:**
- `POST /api/integrations/v1/github/connect` (Spring Boot) - OAuth flow
- `POST /api/integrations/v1/github/sync` (NestJS) - Trigger sync
- `GET /api/integrations/v1/github/repos` (Spring Boot) - List repos
- `POST /api/integrations/v1/github/webhook` (Spring Boot) - Webhook receiver

**Estimated Effort:** 24-32 hours

---

#### **B5. Webhook Management System**
**Services:** Spring Boot (primary) → NestJS (CRUD)

**Description:** Custom webhook system for third-party integrations.

**Components:**
- **Spring Boot Service:**
  - Webhook delivery engine
  - Retry logic (exponential backoff)
  - Signature verification (HMAC-SHA256)
  - Delivery logs & replay
  - Rate limiting per webhook
- **NestJS Service:**
  - Webhook CRUD
  - Event subscription management
  - Test webhook endpoint

**Supported Events:**
- `portfolio.project.created`
- `portfolio.project.published`
- `portfolio.view.milestone` (e.g., 1000 views)
- `portfolio.seo.score.changed`
- `portfolio.analytics.report.ready`

**Endpoints:**
- `POST /api/webhooks/v1` (NestJS) - Create webhook
- `GET /api/webhooks/v1` (NestJS) - List webhooks
- `POST /api/webhooks/v1/:id/test` (NestJS) - Test webhook
- `POST /api/webhooks-engine/v1/deliver` (Spring Boot) - Webhook delivery service
- `GET /api/webhooks-engine/v1/logs/:webhookId` (Spring Boot) - Delivery logs

**Estimated Effort:** 14-18 hours

---

### Category C: Real-Time & Collaboration (NestJS-Led)

#### **C1. Real-Time Collaboration Editor**
**Services:** NestJS (primary) → Python (conflict resolution)

**Description:** Collaborative editing of portfolio content (Google Docs-style).

**Components:**
- **NestJS Service:**
  - WebSocket server (Socket.IO)
  - Operational Transform (OT) or CRDT for conflict-free editing
  - Active users tracking
  - Change history (versioning)
  - Locking mechanism (optional)
- **Python Service:**
  - Advanced merge conflict resolution
  - Change summarization (NLP)

**Data Flow:**
```
User A edits → WebSocket broadcast → User B sees changes in real-time
→ Python resolves conflicts → NestJS persists
```

**Endpoints:**
- `WS /api/collaboration/v1/:projectId` (NestJS) - WebSocket connection
- `GET /api/collaboration/v1/:projectId/users` (NestJS) - Active editors
- `POST /api/collaboration/v1/:projectId/lock` (NestJS) - Lock section
- `GET /api/collaboration/v1/:projectId/history` (NestJS) - Change history

**Estimated Effort:** 28-36 hours

---

#### **C2. Multi-Portfolio Management (SaaS Mode)**
**Services:** NestJS (primary)

**Description:** Manage multiple portfolios for different brands/clients.

**Components:**
- **NestJS Service:**
  - Multi-tenancy support (schema-per-tenant or tenant column)
  - Portfolio switching UI
  - Cross-portfolio analytics
  - Bulk operations
  - Portfolio templates (clone functionality)
  - Role-based access control (RBAC) per portfolio

**Endpoints:**
- `POST /api/portfolios/v1` (NestJS) - Create new portfolio
- `GET /api/portfolios/v1` (NestJS) - List user portfolios
- `POST /api/portfolios/v1/:id/clone` (NestJS) - Clone portfolio
- `GET /api/portfolios/v1/analytics/summary` (NestJS) - Cross-portfolio stats

**Estimated Effort:** 20-28 hours

---

#### **C3. Advanced Template Engine**
**Services:** NestJS (primary) → Python (validation)

**Description:** Dynamic templates with conditional logic and variables.

**Components:**
- **NestJS Service:**
  - Liquid/Handlebars template parser
  - Variable injection system
  - Conditional rendering (`{% if %}`, `{% for %}`)
  - Template inheritance
  - CSS/JS asset bundling
- **Python Service:**
  - Template security scanning (XSS detection)
  - Performance profiling

**Example Template:**
```liquid
{% if user.experience_years > 5 %}
  <h2>Senior {{ user.role }}</h2>
{% else %}
  <h2>{{ user.role }}</h2>
{% endif %}

{% for project in projects | limit: 3 %}
  <div class="project">{{ project.title }}</div>
{% endfor %}
```

**Endpoints:**
- `POST /api/templates/v1/render` (NestJS) - Render template with data
- `POST /api/templates/v1/validate` (NestJS) - Validate template syntax
- `GET /api/templates/v1/:id/variables` (NestJS) - List required variables

**Estimated Effort:** 18-24 hours

---

#### **C4. Portfolio Versioning & Rollback**
**Services:** NestJS (primary) → Python (diff visualization)

**Description:** Full portfolio snapshots with one-click rollback.

**Components:**
- **NestJS Service:**
  - Snapshot creation (all projects, skills, experiences, settings)
  - Snapshot comparison
  - Rollback mechanism
  - Scheduled auto-snapshots (daily/weekly)
  - Snapshot tagging (`v1.0-launch`, `v2.0-redesign`)
- **Python Service:**
  - Visual diff generation (HTML report)
  - Change impact analysis

**Endpoints:**
- `POST /api/versions/v1/snapshot` (NestJS) - Create snapshot
- `GET /api/versions/v1` (NestJS) - List snapshots
- `POST /api/versions/v1/:id/rollback` (NestJS) - Rollback to version
- `GET /api/versions/v1/:id/diff/:compareId` (NestJS) - Compare versions

**Estimated Effort:** 16-22 hours

---

#### **C5. API Rate Limiting & Quotas**
**Services:** NestJS (primary)

**Description:** Advanced API protection with per-user quotas.

**Components:**
- **NestJS Service:**
  - Token bucket algorithm (Redis-based)
  - Tiered rate limits (Free: 100/hour, Pro: 1000/hour, Enterprise: unlimited)
  - Burst allowance
  - Rate limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`)
  - IP-based + token-based limiting
  - Quota dashboards

**Endpoints:**
- `GET /api/rate-limits/v1/status` (NestJS) - Current quota usage
- `GET /api/rate-limits/v1/history` (NestJS) - Request history

**Estimated Effort:** 10-14 hours

---

### Category D: Advanced Analytics (Python-Led)

#### **D1. Visitor Behavior Clustering**
**Services:** Python (primary) → NestJS (visualization)

**Description:** Segment visitors into personas using ML.

**Components:**
- **Python Service:**
  - K-means clustering (demographics, behavior)
  - Persona labeling (e.g., "Recruiters", "Clients", "Peers")
  - Feature engineering (session duration, pages viewed, click patterns)
- **NestJS Service:**
  - Cluster data API
  - Persona-based filtering

**Endpoints:**
- `POST /api/analytics/v1/clustering/refresh` (NestJS) - Trigger clustering
- `GET /api/analytics/v1/personas` (NestJS) - Get visitor personas

**Estimated Effort:** 16-20 hours

---

#### **D2. Predictive Analytics Engine**
**Services:** Python (primary) → NestJS (dashboard)

**Description:** Forecast portfolio metrics (views, conversions).

**Components:**
- **Python Service:**
  - Time-series forecasting (Prophet, ARIMA)
  - Traffic prediction (next 30 days)
  - Conversion rate prediction
  - Anomaly detection
- **NestJS Service:**
  - Prediction results API
  - Confidence intervals

**Endpoints:**
- `GET /api/analytics/v1/predictions/traffic` (NestJS) - Traffic forecast
- `GET /api/analytics/v1/predictions/conversions` (NestJS) - Conversion forecast

**Estimated Effort:** 18-24 hours

---

#### **D3. Heatmap & Session Replay**
**Services:** Python (primary) → NestJS (storage)

**Description:** Visual heatmaps and session recordings.

**Components:**
- **Python Service:**
  - Click/scroll heatmap generation
  - Session replay video compression
  - Privacy filtering (PII redaction)
- **NestJS Service:**
  - Event ingestion
  - Heatmap data API
  - Session storage

**Note:** Consider using third-party solutions (Hotjar, FullStory) instead of building from scratch.

**Estimated Effort:** 24-32 hours (if built in-house)

---

### Category E: Cross-Service Orchestration

#### **E1. AI-Powered Portfolio Builder**
**Services:** ALL (NestJS orchestrates)

**Description:** ChatGPT-style assistant that builds portfolios via conversation.

**Components:**
- **NestJS Service:**
  - Conversational API (stateful sessions)
  - Intent recognition (create project, add skill, etc.)
  - Orchestration layer (coordinates other services)
- **Python Service:**
  - NLP intent parsing (spaCy/transformers)
  - Content generation (OpenAI GPT-4)
  - Entity extraction (names, dates, skills)
- **Spring Boot Service:**
  - External data enrichment (scrape LinkedIn profile)
  - Image generation (DALL-E for project thumbnails)

**Example Conversation:**
```
User: "Add my work at Acme Corp as a Senior Developer from 2020 to 2023"
AI: Extracts → Company: Acme Corp, Role: Senior Developer, Dates: 2020-2023
    Creates experience entry → "Done! Added to your experiences."
```

**Endpoints:**
- `POST /api/assistant/v1/chat` (NestJS) - Send message to AI
- `GET /api/assistant/v1/session/:id` (NestJS) - Get session history

**Estimated Effort:** 32-40 hours

---

#### **E2. Automated Portfolio Optimizer**
**Services:** ALL (Python triggers, NestJS applies)

**Description:** Continuous optimization based on analytics.

**Components:**
- **Python Service:**
  - A/B test analysis (which layout performs better)
  - Content recommendations (add more projects in category X)
  - Performance bottleneck detection
  - Automated image compression
- **NestJS Service:**
  - Apply optimizations API
  - Optimization history
- **Spring Boot Service:**
  - Lighthouse audit runner (scheduled)
  - Performance reports

**Data Flow:**
```
Python analyzes weekly → Suggests optimizations → User approves
→ NestJS applies changes → Spring Boot validates performance
```

**Endpoints:**
- `GET /api/optimizer/v1/suggestions` (NestJS) - Get optimization suggestions
- `POST /api/optimizer/v1/apply` (NestJS) - Apply optimization
- `GET /api/optimizer/v1/history` (NestJS) - Optimization log

**Estimated Effort:** 28-36 hours

---

#### **E3. Smart Contact Management (CRM)**
**Services:** NestJS (primary) → Spring Boot (email) → Python (scoring)

**Description:** Built-in CRM for portfolio visitors who make contact.

**Components:**
- **NestJS Service:**
  - Contact CRUD
  - Lead tracking (source, status, priority)
  - Deal pipeline (Prospect → Qualified → Proposal → Won/Lost)
  - Notes & activity timeline
- **Python Service:**
  - Lead scoring (ML-based)
  - Email engagement analysis
  - Churn prediction
- **Spring Boot Service:**
  - Email thread tracking (Gmail/Outlook integration)
  - Calendar integration (meeting scheduling)
  - Email templates

**Endpoints:**
- `POST /api/crm/v1/contacts` (NestJS) - Create contact
- `GET /api/crm/v1/pipeline` (NestJS) - Get sales pipeline
- `POST /api/crm/v1/contacts/:id/score` (NestJS) - Calculate lead score (triggers Python)
- `POST /api/integrations/v1/gmail/sync` (Spring Boot) - Sync emails

**Estimated Effort:** 26-34 hours

---

#### **E4. Multi-Language Portfolio Generator (i18n)**
**Services:** NestJS (CRUD) → Python (translation) → Spring Boot (CDN)

**Description:** Auto-translate portfolio into multiple languages.

**Components:**
- **NestJS Service:**
  - Language CRUD (add English, French, Spanish, etc.)
  - Translation key management
  - Fallback logic (if French missing → show English)
- **Python Service:**
  - Machine translation (Google Translate API, DeepL)
  - Translation quality scoring
  - Glossary management (technical terms)
- **Spring Boot Service:**
  - CDN configuration (language-specific URLs)
  - `hreflang` tag generation for SEO

**Endpoints:**
- `POST /api/i18n/v1/translate` (NestJS) - Translate content (triggers Python)
- `GET /api/i18n/v1/languages` (NestJS) - List supported languages
- `GET /api/i18n/v1/:lang/portfolio` (NestJS) - Get translated portfolio

**Estimated Effort:** 20-28 hours

---

#### **E5. A/B Testing Engine**
**Services:** NestJS (router) → Python (analysis) → Spring Boot (tracking)

**Description:** Test different portfolio variations.

**Components:**
- **NestJS Service:**
  - Experiment CRUD
  - Traffic splitting (50/50, 70/30, etc.)
  - Variant serving logic
- **Python Service:**
  - Statistical significance testing (chi-square, t-test)
  - Bayesian analysis
  - Winner recommendation
- **Spring Boot Service:**
  - Event tracking (impressions, conversions)
  - Funnel analysis

**Workflow:**
```
Create experiment → Define variants → Split traffic
→ Collect data → Python analyzes → Declare winner
```

**Endpoints:**
- `POST /api/experiments/v1` (NestJS) - Create A/B test
- `GET /api/experiments/v1/:id/results` (NestJS) - Get test results
- `POST /api/experiments/v1/:id/declare-winner` (NestJS) - End test & apply winner

**Estimated Effort:** 22-30 hours

---

#### **E6. Performance Monitoring Dashboard**
**Services:** NestJS (API) → Python (metrics) → Spring Boot (alerts)

**Description:** Real-time performance monitoring (Lighthouse, Core Web Vitals).

**Components:**
- **NestJS Service:**
  - Metrics API (fetch current performance scores)
  - Historical trends
- **Python Service:**
  - Lighthouse CI runner (scheduled scans)
  - Core Web Vitals calculation
  - Performance budgets
- **Spring Boot Service:**
  - Alerts (Slack/email when performance degrades)
  - Weekly performance reports

**Metrics Tracked:**
- Lighthouse scores (Performance, Accessibility, Best Practices, SEO)
- Core Web Vitals (LCP, FID, CLS)
- Page load time
- Time to Interactive (TTI)
- Bundle size

**Endpoints:**
- `GET /api/performance/v1/current` (NestJS) - Current scores
- `GET /api/performance/v1/history` (NestJS) - Historical trends
- `POST /api/performance/v1/scan` (NestJS) - Trigger manual scan (Python)

**Estimated Effort:** 16-22 hours

---

## 📊 Priority Matrix

### P0 — MVP (Must-Have for Launch)
- **E5. A/B Testing Engine** → Differentiation feature
- **B2. CV/Resume Generator** → High user value
- **C2. Multi-Portfolio Management** → SaaS scalability

**Total Effort:** 62-88 hours

---

### P1 — Core Features (6-12 Months)
- **A1. Portfolio Insights AI** → Competitive advantage
- **B1. Social Media Auto-Publisher** → User engagement
- **B4. GitHub/GitLab Sync** → Developer portfolios
- **C1. Real-Time Collaboration** → Team/agency feature
- **E1. AI-Powered Portfolio Builder** → UX innovation
- **E3. Smart Contact Management** → Revenue enabler

**Total Effort:** 158-214 hours

---

### P2 — Advanced Features (12-24 Months)
- **A2. Smart SEO Optimizer** → SEO dominance
- **D2. Predictive Analytics** → Future-proofing
- **E4. Multi-Language Generator** → Global reach
- **E6. Performance Monitoring** → Enterprise reliability

**Total Effort:** 72-98 hours

---

### P3 — Premium/Enterprise (24+ Months)
- **A3. Content Quality Analyzer** → Premium feature
- **B3. Multi-Channel Notifications** → Enterprise
- **B5. Webhook Management** → Developer ecosystem
- **C3. Advanced Template Engine** → Agency/whitelabel
- **C4. Portfolio Versioning** → Compliance/audit
- **C5. API Rate Limiting** → Monetization
- **D1. Visitor Clustering** → Data-driven insights
- **D3. Heatmap & Session Replay** → UX optimization
- **E2. Automated Optimizer** → AI automation

**Total Effort:** 186-260 hours

---

## 🔧 Technical Implementation Guidelines

### Event-Driven Architecture

**Domain Events (Published by NestJS):**
```typescript
// backend/src/events/portfolio-events.ts
export class PortfolioProjectPublishedEvent {
  constructor(
    public readonly projectId: number,
    public readonly userId: number,
    public readonly title: string,
    public readonly url: string,
    public readonly timestamp: Date
  ) {}
}
```

**Event Consumers:**
- **Spring Boot:** `@KafkaListener` or polling endpoint
- **Python:** Celery task triggered by NestJS HTTP call

---

### Service Communication Patterns

#### **Pattern 1: Request-Response (Synchronous)**
```
NestJS → Spring Boot (HTTP REST)
- Used for: CV generation, social media posts, email sending
- Timeout: 30s max
- Fallback: Async queue if timeout
```

#### **Pattern 2: Event-Driven (Asynchronous)**
```
NestJS → Event Bus → Python/Spring Boot
- Used for: Analytics, ML processing, notifications
- Delivery: At-least-once (idempotent consumers)
- Storage: PostgreSQL events table
```

#### **Pattern 3: Polling (Scheduled)**
```
Python/Spring Boot → NestJS Public API
- Used for: Data sync, scheduled reports
- Frequency: Every 5 min to daily
- Auth: Internal API tokens
```

---

### Data Consistency Strategy

**Single Source of Truth:** NestJS PostgreSQL database

**Read Replicas:**
- Python: Read-only access for analytics queries
- Spring Boot: No direct DB access (API calls only)

**Cache Layers:**
- Redis for shared state (rate limits, sessions)
- PostgreSQL materialized views for heavy analytics

---

### Security Headers & Authentication

**Internal Service Communication:**
```http
Authorization: Bearer <INTERNAL_SERVICE_TOKEN>
X-Project-Id: <project_id>
X-Request-Id: <uuid>
X-Service-Name: spring-services | python-services
```

**Token Generation:**
```bash
# .env
INTERNAL_PYTHON_TOKEN=<secret>
INTERNAL_SPRING_TOKEN=<secret>
```

**Guards:**
- NestJS: `InternalServiceGuard` (validates tokens)
- Python: `verify_internal_headers()` decorator
- Spring Boot: `@PreAuthorize("hasRole('INTERNAL_SERVICE')")`

---

## 📁 File Structure

```
zodback/
├── backend/ (NestJS)
│   ├── src/
│   │   ├── portfolio-insights/       # A1
│   │   ├── portfolio-seo-optimizer/  # A2
│   │   ├── content-quality/          # A3
│   │   ├── social-media/             # B1 (orchestration)
│   │   ├── export/                   # B2 (triggers Spring Boot)
│   │   ├── notifications/            # B3 (triggers Spring Boot)
│   │   ├── integrations/             # B4 (coordinates)
│   │   ├── webhooks/                 # B5
│   │   ├── collaboration/            # C1
│   │   ├── multi-portfolio/          # C2
│   │   ├── templates-engine/         # C3
│   │   ├── versioning/               # C4
│   │   ├── rate-limiting/            # C5
│   │   ├── analytics-advanced/       # D1, D2, D3
│   │   ├── assistant/                # E1
│   │   ├── optimizer/                # E2
│   │   ├── crm/                      # E3
│   │   ├── i18n/                     # E4
│   │   ├── experiments/              # E5
│   │   └── performance/              # E6
│
├── python-services/ (Python FastAPI + Celery)
│   ├── apps/
│   │   ├── ml_insights/              # A1
│   │   ├── seo_analyzer/             # A2
│   │   ├── content_quality/          # A3
│   │   ├── social_caption_ai/        # B1 (AI captions)
│   │   ├── clustering/               # D1
│   │   ├── predictions/              # D2
│   │   ├── heatmaps/                 # D3
│   │   ├── nlp_assistant/            # E1
│   │   ├── auto_optimizer/           # E2
│   │   ├── lead_scoring/             # E3
│   │   ├── translation_engine/       # E4
│   │   ├── ab_testing_analysis/      # E5
│   │   └── lighthouse_runner/        # E6
│
└── spring-services/ (Spring Boot)
    ├── src/main/java/com/zodback/spring/
    │   ├── social/                    # B1 (OAuth, posting)
    │   ├── documents/                 # B2 (PDF/DOCX)
    │   ├── messaging/                 # B3 (Email, SMS, Slack)
    │   ├── github/                    # B4 (GitHub sync)
    │   ├── webhooks/                  # B5 (delivery engine)
    │   ├── gmail/                     # E3 (Email sync)
    │   ├── performance/               # E6 (alerts)
    │   └── scheduler/                 # Quartz jobs
```

---

## ✅ Success Criteria

### Technical Metrics
- [ ] **API Response Time:** < 200ms (p95)
- [ ] **Event Processing:** < 5s (p99)
- [ ] **ML Model Latency:** < 2s (predictions)
- [ ] **Document Generation:** < 10s (PDF/DOCX)
- [ ] **Uptime:** 99.9% per service
- [ ] **Test Coverage:** > 80% across all services

### Business Metrics
- [ ] **User Engagement:** +50% time on dashboard
- [ ] **Conversion Rate:** +30% (free → paid)
- [ ] **Support Tickets:** -40% (due to AI assistant)
- [ ] **Portfolio Sharing:** +60% (social media integration)
- [ ] **User Retention:** +25% (collaboration features)

---

## 🚀 Next Steps

1. **Review this plan** with stakeholders (Product, Engineering, DevOps)
2. **Select P0 features** for MVP (E5, B2, C2)
3. **Create detailed task breakdowns** for each feature (use Architect agent)
4. **Set up infrastructure:**
   - Kafka/RabbitMQ (event bus)
   - Redis (caching/rate limiting)
   - S3/MinIO (file storage)
   - Monitoring (Prometheus, Grafana)
5. **Implement in sprints:**
   - Sprint 1-2: P0 features (8-12 weeks)
   - Sprint 3-8: P1 features (24-32 weeks)
   - Sprint 9+: P2/P3 features (ongoing)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-18
**Author:** AI Architect Agent (Kevin)
**Next Review:** After P0 implementation
