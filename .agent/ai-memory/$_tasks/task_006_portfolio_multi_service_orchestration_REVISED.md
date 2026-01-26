# Task 006 — Portfolio Multi-Service Advanced Features (REVISED)

**Created:** 2026-01-18
**Status:** Architecture Planning (Based on Existing Implementation)
**Priority:** P1 (Strategic)
**Estimated Effort:** 96-136 hours (révisé)

---

## 🎯 Objective

Extend existing portfolio system with **advanced features** that leverage all three services:
- **NestJS** → Core orchestration (✅ Already has portfolio CRUD, analytics, SEO, templates)
- **Spring Boot** → Integrations & notifications (✅ Already has email, SMS, Slack, event polling)
- **Python** → AI/ML & data processing (✅ Already has analytics service, Celery)

---

## 📊 Existing Implementation Analysis

### ✅ What's Already Built

| Module | Service | Status | Features |
|--------|---------|--------|----------|
| **Portfolio CRUD** | NestJS | ✅ Complete | Projects, skills, experiences, testimonials, categories |
| **Portfolio Analytics** | NestJS | ✅ Basic | Page views, daily views, referrers, unique visitors |
| **Portfolio SEO** | NestJS | ✅ Basic | Settings CRUD, structured data, OG images, sitemap generators |
| **Portfolio Templates** | NestJS | ✅ Advanced | Template versioning, user history, rollback |
| **Email Service** | Spring Boot | ✅ Complete | Idempotent, retryable, audit logging, Thymeleaf templates |
| **Notifications** | Spring Boot | ✅ Partial | Email (✅), SMS (🔧 stub), Slack (🔧 stub), Push (🔧 stub) |
| **Event System** | Spring Boot | ✅ Complete | Event polling, handlers, consumer state tracking |
| **Analytics Engine** | Python | ✅ Basic | MRR calculation, DB connection, Celery workers |

**Legend:** ✅ Complete | 🔧 Stub/Partial | ❌ Missing

---

## 🚀 New Features (Building on Existing)

### Category A: Enhance Existing Analytics (Python Extensions)

#### **A1. Portfolio Insights AI (New)**
**Extends:** `python-services/apps/analytics/service.py`, `backend/src/portfolio-analytics/`

**Description:** ML-powered visitor behavior analysis and recommendations.

**New Components:**
```
python-services/
├── apps/
│   └── ml_insights/                    # 🆕 New module
│       ├── clustering.py               # K-means visitor segmentation
│       ├── forecasting.py              # Prophet time-series predictions
│       ├── recommendations.py          # Content optimization suggestions
│       └── celery_tasks.py             # Async ML processing

backend/src/
├── portfolio-insights/                 # 🆕 New NestJS module
│   ├── portfolio-insights.service.ts   # Orchestrates Python ML calls
│   ├── portfolio-insights.controller.ts
│   └── dto/
│       ├── insights-summary.dto.ts
│       └── recommendations.dto.ts
```

**Integration Points:**
- **Trigger:** NestJS calls Python ML API when user requests insights
- **Data Source:** Reads from `portfolio_analytics` table (existing)
- **Notifications:** Spring Boot sends weekly insight emails (existing email service)

**New Endpoints:**
```typescript
// NestJS
POST /api/insights/v1/refresh        // Trigger ML analysis (async)
GET  /api/insights/v1/summary        // Get AI-generated insights
GET  /api/insights/v1/personas       // Visitor segments
GET  /api/insights/v1/predictions    // Traffic forecasts
```

```python
# Python FastAPI
POST /ml/insights/analyze            # Run ML models
GET  /ml/insights/recommendations    # Content suggestions
```

**Estimated Effort:** 20-26 hours

---

#### **A2. Advanced SEO Analyzer (Extends Existing SEO)**
**Extends:** `backend/src/portfolio-seo/`, adds Python NLP

**Description:** AI-driven SEO analysis with competitor tracking.

**Enhancements to Existing:**
```typescript
// backend/src/portfolio-seo/portfolio-seo.service.ts
// ✅ Already exists: getSeoSettings(), updateSeoSettings()
// 🆕 Add: analyzeSeoScore(), getOptimizationSuggestions()
```

**New Python Module:**
```
python-services/
├── apps/
│   └── seo_analyzer/                   # 🆕 New
│       ├── keyword_analyzer.py         # NLTK keyword density
│       ├── readability_scorer.py       # Flesch-Kincaid scoring
│       ├── competitor_scraper.py       # Analyze competitor sites
│       └── schema_validator.py         # JSON-LD validation
```

**Integration:**
- **Existing:** NestJS manages SEO settings (✅ already done)
- **New:** Python analyzes content quality when project is saved
- **New:** Spring Boot monitors Google Search Console (weekly sync)

**New Endpoints:**
```typescript
// NestJS (extends existing controller)
POST /api/seo/v1/analyze                // Trigger SEO analysis
GET  /api/seo/v1/scores/:projectId      // Get SEO scores
PATCH /api/seo/v1/auto-optimize         // Apply AI suggestions
```

**Estimated Effort:** 14-18 hours

---

### Category B: Complete Notification System (Spring Boot Extensions)

#### **B1. Multi-Channel Notification Hub (Complete Existing Stubs)**
**Extends:** `spring-services/.../service/notification/`

**Current Status:**
- ✅ `EmailService.java` — Fully implemented
- 🔧 `SmsService.java` — Stub only
- 🔧 `SlackService.java` — Stub only
- 🔧 `PushService.java` — Stub only

**Task:** Complete all notification channels and add orchestration.

**Implementation:**
```java
// spring-services/src/main/java/com/zodback/spring/service/notification/

// 🔧 Complete these stubs:
SmsService.java           // Twilio integration
SlackService.java         // Webhook + OAuth
PushService.java          // Firebase Cloud Messaging

// 🆕 Add new:
DiscordService.java       // Discord webhooks
TelegramService.java      // Telegram Bot API
NotificationOrchestrator.java  // Multi-channel routing
```

**New NestJS Integration:**
```typescript
// backend/src/notifications/
notifications.module.ts
notifications.service.ts   // Orchestrates Spring Boot calls
notifications.controller.ts

// Events that trigger notifications:
- portfolio.project.published
- portfolio.view.milestone (1000, 5000, 10000 views)
- portfolio.seo.score.improved
- portfolio.analytics.weekly_report
```

**User Preferences (New Table):**
```sql
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channels JSONB DEFAULT '["email"]',  -- e.g., ["email", "slack", "sms"]
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**New Endpoints:**
```typescript
// NestJS
POST /api/notifications/v1/send        // Trigger notification
GET  /api/notifications/v1/preferences // Get user preferences
PUT  /api/notifications/v1/preferences // Update preferences
GET  /api/notifications/v1/history     // Notification log
```

```java
// Spring Boot (called by NestJS)
POST /api/messaging/v1/sms             // Send SMS (Twilio)
POST /api/messaging/v1/slack           // Send Slack message
POST /api/messaging/v1/discord         // Send Discord message
POST /api/messaging/v1/telegram        // Send Telegram message
POST /api/messaging/v1/push            // Send push notification
```

**Estimated Effort:** 18-24 hours

---

#### **B2. GitHub/GitLab Auto-Sync (New)**
**Service:** Spring Boot (primary) → NestJS (storage)

**Description:** Automatically sync portfolio projects from GitHub/GitLab repos.

**New Spring Boot Module:**
```java
spring-services/src/main/java/com/zodback/spring/integration/github/
├── GitHubOAuthController.java        // OAuth 2.0 flow
├── GitHubSyncService.java            // Fetch repos, parse README
├── GitHubWebhookController.java      // Listen to repo updates
└── dto/
    ├── GitHubRepoDto.java
    └── GitHubSyncConfigDto.java
```

**NestJS Integration:**
```typescript
// backend/src/integrations/
integrations.module.ts
github-sync.service.ts                 // Stores sync config
github-sync.controller.ts              // Trigger manual sync

// Sync flow:
1. User connects GitHub account (Spring Boot OAuth)
2. Spring Boot fetches repos via GraphQL API
3. For each repo → Spring Boot calls NestJS to create/update project
4. Python analyzes code complexity (optional)
```

**New Tables:**
```sql
CREATE TABLE github_sync_config (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  github_token_hash VARCHAR(255),  -- Encrypted
  auto_sync BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP
);

CREATE TABLE github_repo_mapping (
  id SERIAL PRIMARY KEY,
  config_id INT REFERENCES github_sync_config(id),
  github_repo_id BIGINT NOT NULL,
  github_repo_name VARCHAR(255),
  portfolio_project_id INT REFERENCES portfolio_projects(id),
  sync_enabled BOOLEAN DEFAULT true
);
```

**New Endpoints:**
```typescript
// NestJS
POST /api/integrations/v1/github/connect   // Start OAuth
GET  /api/integrations/v1/github/repos     // List repos
POST /api/integrations/v1/github/sync      // Manual sync
```

```java
// Spring Boot
GET  /api/github/v1/oauth/authorize        // OAuth redirect
POST /api/github/v1/oauth/callback         // OAuth callback
GET  /api/github/v1/repos                  // Fetch user repos
POST /api/github/v1/webhook                // Receive repo events
POST /api/github/v1/sync/:repoId           // Sync specific repo
```

**Estimated Effort:** 22-28 hours

---

#### **B3. Professional CV/Resume Generator (New)**
**Service:** Spring Boot (PDF generation) → NestJS (data)

**Description:** Generate PDF/DOCX resumes from portfolio data.

**New Spring Boot Module:**
```java
spring-services/src/main/java/com/zodback/spring/document/
├── CvGeneratorService.java           // Orchestrates generation
├── PdfGenerator.java                 // iText PDF generation
├── DocxGenerator.java                // Apache POI DOCX generation
├── templates/
│   ├── cv-professional.html          // Thymeleaf template
│   ├── cv-creative.html
│   └── cv-minimal.html
└── dto/
    ├── CvDataDto.java                // Portfolio data
    └── CvConfigDto.java              // Template + styling
```

**NestJS Integration:**
```typescript
// backend/src/export/
export.module.ts
cv-generator.service.ts               // Calls Spring Boot
cv-generator.controller.ts

// Export flow:
1. User clicks "Export CV" in dashboard
2. NestJS fetches portfolio data (projects, skills, experiences)
3. NestJS calls Spring Boot PDF/DOCX generator
4. Spring Boot returns signed S3 URL or streams PDF
5. User downloads file
```

**New Endpoints:**
```typescript
// NestJS
POST /api/export/v1/cv                // Generate CV (async)
GET  /api/export/v1/cv/:jobId         // Get generated CV
GET  /api/export/v1/templates         // List CV templates
```

```java
// Spring Boot
POST /api/documents/v1/generate/pdf   // Generate PDF
POST /api/documents/v1/generate/docx  // Generate DOCX
GET  /api/documents/v1/templates      // List templates
```

**Estimated Effort:** 16-22 hours

---

### Category C: Real-Time Features (NestJS Extensions)

#### **C1. Real-Time Analytics Dashboard (WebSocket)**
**Extends:** `backend/src/portfolio-analytics/`

**Description:** Live visitor tracking (who's viewing your portfolio right now).

**New NestJS Module:**
```typescript
// backend/src/realtime-analytics/
realtime-analytics.gateway.ts         // WebSocket gateway
realtime-analytics.service.ts         // Active sessions tracker
dto/
├── active-session.dto.ts
└── realtime-event.dto.ts
```

**Features:**
- Track active visitors (IP, location, current page)
- Live view counter
- Real-time event stream (project viewed, skill clicked)
- Geographic heatmap

**Implementation:**
```typescript
// WebSocket events
@WebSocketGateway()
export class RealtimeAnalyticsGateway {
  // Client connects
  @SubscribeMessage('subscribe:portfolio')
  handleSubscribe(@MessageBody() data: { projectId: number }) {}

  // Server emits
  emitActiveVisitors(projectId: number, count: number) {}
  emitNewView(projectId: number, event: ViewEvent) {}
}
```

**Integration with Existing:**
- Uses existing `portfolio_analytics` table
- Extends `PortfolioAnalyticsService` with real-time methods

**Estimated Effort:** 12-16 hours

---

#### **C2. Multi-Portfolio Management (SaaS Mode)**
**Extends:** Existing portfolio system

**Description:** Allow users to create/manage multiple portfolios (personal, business, agency).

**Database Changes:**
```sql
-- ✅ Already exists: portfolio_projects.project_id
-- 🆕 Add new table:
CREATE TABLE user_portfolios (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,           -- "Personal", "Agency", "Freelance"
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Map existing `project_id` to `user_portfolios.id`
```

**NestJS Module:**
```typescript
// backend/src/multi-portfolio/
multi-portfolio.module.ts
multi-portfolio.service.ts            // CRUD portfolios
multi-portfolio.controller.ts
dto/
├── create-portfolio.dto.ts
└── switch-portfolio.dto.ts
```

**Features:**
- Create unlimited portfolios
- Switch between portfolios in dashboard
- Clone portfolio (template + all projects)
- Cross-portfolio analytics (total views across all)
- Portfolio-specific API tokens

**New Endpoints:**
```typescript
POST /api/portfolios/v1                // Create portfolio
GET  /api/portfolios/v1                // List user portfolios
POST /api/portfolios/v1/:id/clone      // Clone portfolio
GET  /api/portfolios/v1/analytics      // Cross-portfolio stats
```

**Estimated Effort:** 14-18 hours

---

### Category D: Cross-Service AI Features

#### **D1. AI Portfolio Builder Assistant (Conversational)**
**Services:** ALL (NestJS orchestrates, Python NLP, Spring Boot enrichment)

**Description:** ChatGPT-style assistant to build portfolio via conversation.

**Architecture:**
```
User: "Add my experience at Google as Software Engineer from 2020 to 2023"
  ↓
NestJS (assistant.service.ts) → Python NLP → Extracts entities
  ↓
Python returns: { company: "Google", role: "Software Engineer", dates: {...} }
  ↓
NestJS creates experience entry
  ↓
Spring Boot enriches (fetch company logo from Clearbit API)
  ↓
NestJS: "Done! Added Google to your experiences. Want to add projects too?"
```

**New Components:**

**Python NLP Service:**
```python
# python-services/apps/nlp_assistant/
entity_extractor.py                   # spaCy NER
intent_classifier.py                  # Intent recognition
content_generator.py                  # GPT-4 API for descriptions
```

**NestJS Orchestrator:**
```typescript
// backend/src/assistant/
assistant.module.ts
assistant.service.ts                  // Conversation state machine
assistant.controller.ts
dto/
├── chat-message.dto.ts
└── assistant-response.dto.ts
```

**Spring Boot Enrichment:**
```java
// spring-services/src/main/java/com/zodback/spring/enrichment/
CompanyEnrichmentService.java         // Clearbit API
ImageGeneratorService.java            // DALL-E for project images
```

**New Tables:**
```sql
CREATE TABLE assistant_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  context JSONB,                      -- Conversation state
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE assistant_messages (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES assistant_sessions(id),
  role VARCHAR(20) NOT NULL,          -- 'user' | 'assistant'
  content TEXT NOT NULL,
  intent VARCHAR(100),                -- 'create_project', 'add_skill', etc.
  entities JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**New Endpoints:**
```typescript
// NestJS
POST /api/assistant/v1/chat           // Send message
GET  /api/assistant/v1/session/:id    // Get conversation history
DELETE /api/assistant/v1/session/:id  // Clear session
```

```python
# Python
POST /nlp/parse                       // Extract entities + intent
POST /nlp/generate-description        // AI-generated project description
```

```java
// Spring Boot
POST /api/enrichment/v1/company       // Get company data
POST /api/enrichment/v1/generate-image // Generate project image
```

**Estimated Effort:** 26-32 hours

---

#### **D2. Automated Portfolio Optimizer (Continuous)**
**Services:** Python (analysis) → NestJS (applies changes) → Spring Boot (validates)

**Description:** AI that continuously optimizes your portfolio based on analytics.

**Optimization Actions:**
- Reorder projects (most viewed → top)
- Suggest adding missing skills (based on project technologies)
- Recommend featured projects (highest engagement)
- Auto-compress large images
- Fix broken links
- Suggest better project descriptions (readability)

**Python ML Service:**
```python
# python-services/apps/auto_optimizer/
performance_analyzer.py               # Analyze what works
content_optimizer.py                  # Suggest improvements
image_compressor.py                   # Optimize images
link_checker.py                       # Find broken links
```

**NestJS Orchestrator:**
```typescript
// backend/src/optimizer/
optimizer.module.ts
optimizer.service.ts                  // Apply optimizations
optimizer.controller.ts
dto/
├── optimization-suggestion.dto.ts
└── apply-optimization.dto.ts
```

**Spring Boot Validator:**
```java
// spring-services/src/main/java/com/zodback/spring/validation/
LighthouseRunner.java                 // Run Lighthouse audits
PerformanceValidator.java             // Validate after optimization
```

**Workflow:**
```
1. Python analyzes portfolio weekly (Celery scheduled task)
2. Generates optimization suggestions
3. NestJS stores suggestions
4. User reviews + approves in dashboard
5. NestJS applies approved optimizations
6. Spring Boot runs Lighthouse audit to verify improvement
7. Sends optimization report via email (existing EmailService)
```

**New Endpoints:**
```typescript
// NestJS
GET  /api/optimizer/v1/suggestions    // Get AI suggestions
POST /api/optimizer/v1/apply          // Apply optimization
GET  /api/optimizer/v1/history        // Optimization log
```

**Estimated Effort:** 22-28 hours

---

## 📁 Updated File Structure

```
zodback/
├── backend/ (NestJS)
│   ├── src/
│   │   ├── portfolio/                ✅ Existing (CRUD)
│   │   ├── portfolio-analytics/      ✅ Existing (basic analytics)
│   │   ├── portfolio-seo/            ✅ Existing (SEO settings)
│   │   ├── portfolio-templates/      ✅ Existing (templates)
│   │   ├── portfolio-insights/       🆕 NEW (AI insights)
│   │   ├── notifications/            🆕 NEW (orchestrates Spring Boot)
│   │   ├── integrations/             🆕 NEW (GitHub sync)
│   │   ├── export/                   🆕 NEW (CV generation)
│   │   ├── realtime-analytics/       🆕 NEW (WebSocket)
│   │   ├── multi-portfolio/          🆕 NEW (SaaS mode)
│   │   ├── assistant/                🆕 NEW (AI builder)
│   │   └── optimizer/                🆕 NEW (auto-optimizer)
│
├── python-services/ (Python FastAPI + Celery)
│   ├── apps/
│   │   ├── analytics/                ✅ Existing (MRR calc)
│   │   ├── ml_insights/              🆕 NEW (clustering, forecasting)
│   │   ├── seo_analyzer/             🆕 NEW (NLP, competitor analysis)
│   │   ├── nlp_assistant/            🆕 NEW (entity extraction, GPT)
│   │   └── auto_optimizer/           🆕 NEW (performance analysis)
│
└── spring-services/ (Spring Boot)
    ├── src/main/java/com/zodback/spring/
    │   ├── service/notification/     ✅ Existing (Email complete, others stubs)
    │   │   ├── EmailService.java     ✅ Complete
    │   │   ├── SmsService.java       🔧 Complete this
    │   │   ├── SlackService.java     🔧 Complete this
    │   │   ├── PushService.java      🔧 Complete this
    │   │   ├── DiscordService.java   🆕 NEW
    │   │   ├── TelegramService.java  🆕 NEW
    │   │   └── NotificationOrchestrator.java 🆕 NEW
    │   ├── integration/github/       🆕 NEW (GitHub sync)
    │   ├── document/                 🆕 NEW (PDF/DOCX generation)
    │   ├── enrichment/               🆕 NEW (Company data, images)
    │   └── validation/               🆕 NEW (Lighthouse audits)
```

---

## 📊 Priority Matrix (Revised)

### P0 — Quick Wins (High Value, Low Effort)
1. **B1. Complete Notification Channels** (18-24h) → Leverage existing Email service
2. **C1. Real-Time Analytics** (12-16h) → Extends existing analytics
3. **C2. Multi-Portfolio Management** (14-18h) → Minimal changes, big feature

**Total Effort:** 44-58 hours

---

### P1 — Core Differentiators (6-12 Months)
1. **A1. Portfolio Insights AI** (20-26h) → Competitive advantage
2. **A2. Advanced SEO Analyzer** (14-18h) → Improves existing SEO
3. **B2. GitHub/GitLab Sync** (22-28h) → Developer portfolios
4. **B3. CV Generator** (16-22h) → High user value
5. **D1. AI Portfolio Builder** (26-32h) → Innovation

**Total Effort:** 98-126 hours

---

### P2 — Advanced Features (12+ Months)
1. **D2. Automated Optimizer** (22-28h) → Premium feature

**Total Effort:** 22-28 hours

---

## 🔄 Integration Patterns (Revised)

### Pattern 1: NestJS → Python (Async ML)
```typescript
// NestJS triggers Python analysis
async refreshInsights(projectId: number) {
  const job = await this.pythonClient.post('/ml/insights/analyze', {
    projectId,
    analysisType: 'full'
  });

  // Poll for results or use webhook
  return { jobId: job.id, status: 'processing' };
}
```

### Pattern 2: NestJS → Spring Boot → Notifications
```typescript
// NestJS orchestrates multi-channel notifications
async notifyProjectPublished(project: Project) {
  const prefs = await this.getNotificationPreferences(project.userId);

  for (const channel of prefs.channels) {
    await this.springClient.post(`/api/messaging/v1/${channel}`, {
      projectId: project.projectId,
      eventType: 'portfolio.project.published',
      recipient: prefs.email, // or phone, or slack webhook
      template: 'project-published',
      data: { projectTitle: project.title }
    });
  }
}
```

### Pattern 3: Event-Driven (Existing)
```java
// Spring Boot already polls NestJS events
@Scheduled(fixedDelay = 5000)
public void pollEvents() {
  List<DomainEvent> events = nestJsClient.fetchPendingEvents(lastProcessedId);
  events.forEach(eventRouter::route);
}
```

**New Event Types:**
- `portfolio.insights.refreshed`
- `portfolio.seo.analyzed`
- `portfolio.cv.generated`
- `portfolio.github.synced`

---

## ✅ Success Criteria (Updated)

### Technical Metrics
- [x] **Existing Features Maintained:** No regressions
- [ ] **API Response Time:** < 200ms (p95) for new endpoints
- [ ] **ML Processing:** < 10s for insights analysis
- [ ] **CV Generation:** < 5s for PDF/DOCX
- [ ] **Real-Time Latency:** < 100ms for WebSocket events
- [ ] **Test Coverage:** > 80% for new modules

### Business Metrics
- [ ] **User Engagement:** +40% (real-time analytics + AI assistant)
- [ ] **Portfolio Completeness:** +60% (AI builder assists)
- [ ] **SEO Score Improvement:** +35% average (AI optimizer)
- [ ] **CV Exports:** 50%+ of users download CV
- [ ] **GitHub Sync Adoption:** 40%+ of developers connect repos

---

## 🚀 Implementation Roadmap

### Phase 1: Quick Wins (4-6 weeks)
- Week 1-2: Complete notification channels (B1)
- Week 2-3: Real-time analytics WebSocket (C1)
- Week 3-4: Multi-portfolio management (C2)

### Phase 2: AI Core (8-12 weeks)
- Week 5-7: Portfolio Insights AI (A1)
- Week 8-10: Advanced SEO Analyzer (A2)
- Week 11-12: AI Portfolio Builder (D1)

### Phase 3: Integrations (6-8 weeks)
- Week 13-15: GitHub/GitLab Sync (B2)
- Week 16-18: CV/Resume Generator (B3)

### Phase 4: Optimization (4-6 weeks)
- Week 19-22: Automated Portfolio Optimizer (D2)

---

## 🧪 Testing Strategy

### Unit Tests (Each Module)
```bash
# NestJS
bun test backend/src/portfolio-insights/
bun test backend/src/assistant/

# Python
pytest python-services/apps/ml_insights/
pytest python-services/apps/nlp_assistant/

# Spring Boot (Java)
mvn test -Dtest=GitHubSyncServiceTest
mvn test -Dtest=CvGeneratorServiceTest
```

### Integration Tests
```bash
# Test NestJS → Python ML pipeline
bun test backend/test/integration/ml-insights.integration.spec.ts

# Test NestJS → Spring Boot notifications
bun test backend/test/integration/notifications.integration.spec.ts

# Test GitHub sync end-to-end
bun test backend/test/integration/github-sync.e2e.spec.ts
```

### Load Tests (Artillery)
```yaml
# artillery-portfolio.yml
scenarios:
  - name: "Real-time analytics stress test"
    engine: socketio
    flow:
      - emit: subscribe:portfolio
      - think: 30
      - emit: unsubscribe
```

---

## 📝 Next Steps

1. **Review with stakeholders** → Validate priorities
2. **Create detailed specs** for P0 features (use Architect agent)
3. **Set up infrastructure:**
   - Redis (WebSocket session storage)
   - S3/MinIO (CV file storage)
   - Monitoring (Prometheus + Grafana)
4. **Start with B1** (Complete notifications) → Quick win, high impact
5. **Iterate in 2-week sprints**

---

**Document Version:** 2.0 (Revised)
**Last Updated:** 2026-01-18
**Author:** AI Architect Agent (Kevin)
**Reviewed:** Pending
