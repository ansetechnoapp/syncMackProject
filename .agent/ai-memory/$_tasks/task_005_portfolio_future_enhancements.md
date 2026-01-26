# Task 005: Portfolio Module Future Enhancements - Implementation Plan

**Status:** Planning Complete
**Created:** 2026-01-18
**Architect:** Kevin (AI Agent)
**Priority:** P1/P2 (Phased rollout)
**Estimated Total Effort:** 112-156 hours

---

## 📋 Executive Summary

This plan details the implementation of 5 major feature sets for the Portfolio Module:
1. Static Export Generator (P1) - 18-24h
2. Template Marketplace (P2) - 32-42h
3. Advanced Analytics (P1) - 22-28h
4. SEO Optimization (P1) - 16-22h
5. Multi-language Support (P2) - 24-40h

**Total Tasks:** 87 tasks across 5 features
**Critical Dependencies:** Database migrations → API endpoints → Frontend components → Tests
**Key Risk:** File size limits (100 lines) require aggressive componentization

---

## 🎯 Implementation Phases

### Phase P0: Prerequisites (Already Complete)
- ✅ Triple-layer portfolio system operational
- ✅ API token system functional
- ✅ Public endpoints established
- ✅ Template system in place

### Phase P1: Core Enhancements (Priority Features)
**Estimated:** 56-74 hours
**Features:** Static Export, Advanced Analytics, SEO Optimization
**Timeline:** 2-3 weeks
**Value:** Immediate user value, production-ready features

### Phase P2: Advanced Features (Premium Features)
**Estimated:** 56-82 hours
**Features:** Template Marketplace, Multi-language Support
**Timeline:** 2-3 weeks
**Value:** Competitive differentiation, monetization opportunities

---

## 🏗️ Feature 1: Static Export Generator (P1)

**Effort:** 18-24 hours | **Priority:** P1 | **Tasks:** 15

### Business Value
- One-click portfolio deployment without API dependencies
- Faster load times (no API calls)
- Works on any static host (Netlify, Vercel, GitHub Pages)
- Reduces API costs for high-traffic portfolios

### Architecture Overview
```
Dashboard → Export Service → ZIP Generator → Download
                ↓
         Static HTML/CSS/JS
         (Data inlined in JSON)
```

### Database Schema Changes

**New Table: `portfolio_exports`**
```sql
CREATE TABLE portfolio_exports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES portfolio_templates(id),

  -- Export metadata
  export_type TEXT NOT NULL, -- 'full', 'projects_only', 'minimal'
  file_size_bytes INTEGER,
  download_url TEXT, -- S3/local path
  expires_at TIMESTAMP,

  -- Optimization settings
  image_optimization BOOLEAN DEFAULT true,
  inline_css BOOLEAN DEFAULT true,
  minify_assets BOOLEAN DEFAULT true,
  include_analytics BOOLEAN DEFAULT false,

  -- Host-specific presets
  target_host TEXT, -- 'netlify', 'vercel', 'github-pages', 'cloudflare'

  -- Status
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_portfolio_exports_user_project ON portfolio_exports(user_id, project_id);
CREATE INDEX idx_portfolio_exports_status ON portfolio_exports(status);
```

### Task Breakdown

#### T1.1: Database Schema (2h)
**Dependency:** None
**Files:**
- `backend/src/database/portfolio-exports.schema.ts` (50 lines)
- `backend/drizzle/XXXX_add_portfolio_exports.sql` (40 lines)

**Tests:**
- Schema validation test
- Migration up/down test
- Constraints test

**Success Criteria:**
- `bun drizzle-kit push` succeeds
- All indexes created
- Foreign keys enforced

---

#### T1.2: Export DTO & Validation (1.5h)
**Dependency:** T1.1 ✅
**Files:**
- `backend/src/portfolio/dto/export-portfolio.dto.ts` (80 lines)

```typescript
export class CreateExportDto {
  @IsEnum(['full', 'projects_only', 'minimal'])
  exportType: string;

  @IsOptional()
  @IsInt()
  templateId?: number;

  @IsOptional()
  @IsEnum(['netlify', 'vercel', 'github-pages', 'cloudflare'])
  targetHost?: string;

  @IsBoolean()
  @IsOptional()
  imageOptimization?: boolean = true;

  @IsBoolean()
  @IsOptional()
  inlineCss?: boolean = true;

  @IsBoolean()
  @IsOptional()
  minifyAssets?: boolean = true;
}
```

**Tests:**
- DTO validation tests (valid/invalid inputs)
- Default values test

**Success Criteria:**
- All validations pass
- Proper error messages returned

---

#### T1.3: Image Optimization Service (3h)
**Dependency:** T1.2 ✅
**Files:**
- `backend/src/portfolio/services/image-optimizer.service.ts` (95 lines)
- `backend/src/portfolio/services/image-optimizer.service.spec.ts` (150 lines)

**Implementation:**
```typescript
@Injectable()
export class ImageOptimizerService {
  async optimizeImage(url: string, options: OptimizeOptions): Promise<Buffer> {
    // Download image
    // Convert to WebP if supported
    // Resize to max dimensions
    // Compress quality 80%
    // Return optimized buffer
  }

  async optimizeBatch(urls: string[]): Promise<Map<string, Buffer>> {
    // Parallel processing with Promise.all
    // Max 5 concurrent optimizations
  }
}
```

**Dependencies:** `sharp` package for image processing

**Tests:**
- Optimize single image (JPEG → WebP)
- Batch optimization (10 images)
- Invalid URL handling
- Size reduction verification (>30% reduction)

**Success Criteria:**
- Images compressed by >30%
- WebP conversion works
- Error handling robust

---

#### T1.4: CSS Inliner Service (2h)
**Dependency:** T1.2 ✅
**Files:**
- `backend/src/portfolio/services/css-inliner.service.ts` (85 lines)
- `backend/src/portfolio/services/css-inliner.service.spec.ts` (120 lines)

**Implementation:**
- Extract critical CSS from template
- Inline `<style>` in HTML `<head>`
- Keep rest as external file
- Minify if `minifyAssets: true`

**Dependencies:** `juice` or custom parser

**Tests:**
- Critical CSS extraction
- Inline vs external CSS split
- Minification test

**Success Criteria:**
- Critical CSS < 10KB
- Page renders before external CSS loads

---

#### T1.5: Static Generator Service (4h)
**Dependency:** T1.3 ✅, T1.4 ✅
**Files:**
- `backend/src/portfolio/services/static-generator.service.ts` (98 lines)
- `backend/src/portfolio/services/static-generator.service.spec.ts` (180 lines)

**Implementation:**
```typescript
@Injectable()
export class StaticGeneratorService {
  async generateStaticSite(projectId: number, userId: number, options: CreateExportDto) {
    // 1. Fetch all portfolio data
    // 2. Fetch template HTML/CSS/JS
    // 3. Inject data into template as JSON
    // 4. Optimize images
    // 5. Inline critical CSS
    // 6. Minify HTML/JS if enabled
    // 7. Generate file structure
    // 8. Return file map
  }

  private injectDataIntoTemplate(html: string, data: PortfolioData): string {
    // Replace placeholder with inline JSON
  }
}
```

**Tests:**
- Full generation flow
- Data injection correctness
- Image optimization integration
- CSS inlining integration
- File structure validation

**Success Criteria:**
- Generated site is self-contained
- No API calls in generated code
- Data properly escaped (XSS prevention)

---

#### T1.6: ZIP Builder Service (2h)
**Dependency:** T1.5 ✅
**Files:**
- `backend/src/portfolio/services/zip-builder.service.ts` (75 lines)
- `backend/src/portfolio/services/zip-builder.service.spec.ts` (100 lines)

**Implementation:**
```typescript
@Injectable()
export class ZipBuilderService {
  async createZip(files: Map<string, Buffer>): Promise<Buffer> {
    const zip = new JSZip();

    files.forEach((content, path) => {
      zip.file(path, content);
    });

    return zip.generateAsync({ type: 'nodebuffer' });
  }
}
```

**Dependencies:** `jszip` package

**Tests:**
- Create ZIP with multiple files
- Extract and verify contents
- File paths preservation
- Large file handling

**Success Criteria:**
- ZIP valid and extractable
- All files present
- Correct directory structure

---

#### T1.7: Export Controller (2h)
**Dependency:** T1.6 ✅
**Files:**
- `backend/src/portfolio/controllers/portfolio-export.controller.ts` (95 lines)
- `backend/src/portfolio/controllers/portfolio-export.controller.spec.ts` (150 lines)

**Endpoints:**
```typescript
POST /api/portfolio/v1/export/generate
GET  /api/portfolio/v1/export/:id/download
GET  /api/portfolio/v1/export/history
DELETE /api/portfolio/v1/export/:id
```

**Tests:**
- Generate export (201 Created)
- Download export (200 with ZIP)
- Export history (200 with list)
- Delete export (204 No Content)
- Auth guard enforcement

**Success Criteria:**
- All endpoints functional
- Proper HTTP status codes
- Auth required

---

#### T1.8: Frontend Export UI Component (2.5h)
**Dependency:** T1.7 ✅
**Files:**
- `frontend/src/components/portfolio/ExportDialog.tsx` (95 lines)
- `frontend/src/components/portfolio/ExportHistory.tsx` (80 lines)
- `frontend/src/hooks/queries/usePortfolioExport.ts` (85 lines)

**UI Features:**
- Export options form (checkboxes)
- Target host selector (radio buttons)
- Progress indicator
- Download button (appears when ready)
- Export history table

**Tests:**
- Component renders
- Form submission
- Download trigger
- Error handling
- Loading states

**Success Criteria:**
- User can generate export in 3 clicks
- Download starts automatically when ready

---

#### T1.9: Host-Specific Presets (1h)
**Dependency:** T1.8 ✅
**Files:**
- `backend/src/portfolio/config/host-presets.ts` (70 lines)

**Presets:**
```typescript
export const HOST_PRESETS = {
  netlify: {
    includeFiles: ['netlify.toml', '_redirects'],
    optimizations: { imageOptimization: true, minifyAssets: true }
  },
  vercel: {
    includeFiles: ['vercel.json'],
    optimizations: { imageOptimization: true, minifyAssets: true }
  },
  'github-pages': {
    includeFiles: ['.nojekyll'],
    optimizations: { imageOptimization: false, minifyAssets: false }
  }
};
```

**Tests:**
- Each preset generates correct config files
- Optimizations applied correctly

**Success Criteria:**
- Config files valid for each platform

---

#### T1.10: Integration Tests (2h)
**Dependency:** All above ✅
**Files:**
- `backend/test/portfolio-export.e2e-spec.ts` (200 lines)

**Test Scenarios:**
1. Complete export flow (generate → download → extract → validate)
2. Image optimization verification
3. CSS inlining verification
4. Multiple templates
5. Concurrent exports (5 users)

**Success Criteria:**
- All e2e tests pass
- No memory leaks
- Performance < 30s for typical portfolio

---

**Feature 1 Risks & Mitigations:**
- **Risk:** Large portfolios timeout → **Mitigation:** Queue system with background processing
- **Risk:** Image optimization slow → **Mitigation:** Parallel processing, caching
- **Risk:** ZIP too large → **Mitigation:** File size limits, compression

---

## 🏗️ Feature 2: Template Marketplace (P2)

**Effort:** 32-42 hours | **Priority:** P2 | **Tasks:** 20

### Business Value
- Community engagement
- Template variety increases adoption
- Monetization via premium templates
- User-generated content reduces dev workload

### Architecture Overview
```
Community → Submit Template → Moderation → Approval → Marketplace
User → Browse → Preview → Rate → Install
```

### Database Schema Changes

**New Tables:**

```sql
-- Community-submitted templates
CREATE TABLE portfolio_template_submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Template details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  demo_url TEXT,

  -- Template code
  html_template TEXT NOT NULL,
  css_template TEXT NOT NULL,
  js_template TEXT,
  config_schema JSONB DEFAULT '{}',
  default_config JSONB DEFAULT '{}',

  -- Submission metadata
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,

  -- Licensing
  license TEXT DEFAULT 'MIT',
  price_cents INTEGER DEFAULT 0, -- 0 = free
  is_open_source BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template ratings & reviews
CREATE TABLE portfolio_template_ratings (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES portfolio_templates(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(template_id, user_id)
);

-- Template usage statistics
CREATE TABLE portfolio_template_installs (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES portfolio_templates(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,

  installed_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(template_id, project_id)
);

-- Template gallery previews
CREATE TABLE portfolio_template_screenshots (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES portfolio_templates(id) ON DELETE CASCADE,

  url TEXT NOT NULL,
  title TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_template_submissions_status ON portfolio_template_submissions(status);
CREATE INDEX idx_template_ratings_template ON portfolio_template_ratings(template_id);
CREATE INDEX idx_template_installs_template ON portfolio_template_installs(template_id);
```

### Task Breakdown

#### T2.1: Database Schema (3h)
**Dependency:** None
**Files:**
- `backend/src/database/portfolio-marketplace.schema.ts` (95 lines - split into components)
- `backend/drizzle/XXXX_add_marketplace_tables.sql` (80 lines)

**Tests:**
- Schema validation
- Unique constraints enforcement
- Rating range validation (1-5)
- Foreign key cascades

**Success Criteria:**
- Migration succeeds
- Constraints work as expected

---

#### T2.2: Template Submission DTOs (2h)
**Dependency:** T2.1 ✅
**Files:**
- `backend/src/portfolio-marketplace/dto/submit-template.dto.ts` (90 lines)
- `backend/src/portfolio-marketplace/dto/rate-template.dto.ts` (45 lines)

**Validation:**
- Template code sanitization (prevent XSS)
- HTML/CSS/JS validation
- File size limits (HTML < 50KB, CSS < 30KB, JS < 20KB)
- Required fields

**Tests:**
- Valid submission
- XSS attempt blocked
- File size limits enforced

**Success Criteria:**
- All validations pass
- Malicious code rejected

---

#### T2.3: Template Sanitizer Service (4h)
**Dependency:** T2.2 ✅
**Files:**
- `backend/src/portfolio-marketplace/services/template-sanitizer.service.ts` (98 lines)
- `backend/src/portfolio-marketplace/services/template-sanitizer.service.spec.ts` (180 lines)

**Sanitization Rules:**
```typescript
@Injectable()
export class TemplateSanitizerService {
  async sanitizeHtml(html: string): Promise<string> {
    // Remove <script> tags
    // Whitelist safe attributes
    // Remove event handlers (onclick, etc.)
    // Validate structure
  }

  async sanitizeCss(css: string): Promise<string> {
    // Remove @import from external sources
    // Block expression() CSS hacks
    // Validate syntax
  }

  async sanitizeJs(js: string): Promise<string> {
    // Parse with AST
    // Block eval, Function constructor
    // Block fetch/XMLHttpRequest to unauthorized domains
    // Whitelist safe APIs
  }

  async validateTemplate(template: TemplateSubmission): Promise<ValidationResult> {
    // Run all sanitizers
    // Check file sizes
    // Validate JSON schema
  }
}
```

**Dependencies:** `sanitize-html`, `esprima` for JS AST parsing

**Tests:**
- XSS payloads blocked
- Safe code passes
- File size enforcement
- CSS injection attempts blocked

**Success Criteria:**
- 0% XSS vulnerability rate
- Safe templates pass unchanged

---

#### T2.4: Template Submission Service (3h)
**Dependency:** T2.3 ✅
**Files:**
- `backend/src/portfolio-marketplace/services/template-submission.service.ts` (95 lines)
- Tests (150 lines)

**Implementation:**
- Create submission record
- Run sanitization pipeline
- Generate preview URL
- Notify moderators
- Send confirmation email

**Tests:**
- Submission flow
- Sanitization integration
- Notification triggers

**Success Criteria:**
- Submissions saved correctly
- Moderators notified

---

#### T2.5: Template Moderation Service (3h)
**Dependency:** T2.4 ✅
**Files:**
- `backend/src/portfolio-marketplace/services/template-moderation.service.ts` (90 lines)
- Tests (140 lines)

**Features:**
- Approve submission → Create `portfolio_templates` record
- Reject submission → Store reason, notify submitter
- Request changes → Comment system
- Automated checks (quality score)

**Tests:**
- Approve flow
- Reject flow
- Notifications sent

**Success Criteria:**
- Approved templates appear in marketplace
- Rejected templates don't

---

#### T2.6: Template Rating Service (2h)
**Dependency:** T2.1 ✅
**Files:**
- `backend/src/portfolio-marketplace/services/template-rating.service.ts` (75 lines)
- Tests (120 lines)

**Features:**
```typescript
async rateTemplate(userId, templateId, rating, review?) {
  // Upsert rating (1 per user)
  // Recalculate average
  // Update template metadata
}

async getTemplateRatings(templateId) {
  // Average rating
  // Rating distribution
  // Recent reviews
}
```

**Tests:**
- Create rating
- Update existing rating
- Average calculation
- Duplicate prevention (unique constraint)

**Success Criteria:**
- Ratings accurate
- Only 1 rating per user per template

---

#### T2.7: Template Gallery Service (3h)
**Dependency:** T2.5 ✅, T2.6 ✅
**Files:**
- `backend/src/portfolio-marketplace/services/template-gallery.service.ts` (98 lines)
- Tests (150 lines)

**Features:**
```typescript
async getMarketplaceTemplates(filters: FilterDto) {
  // Filter by category, price, rating
  // Sort by popularity, newest, rating
  // Pagination
  // Include ratings, install count
}

async getTemplateDetails(id: number) {
  // Full template details
  // Screenshots
  // Ratings & reviews
  // Install count
  // Author info
}
```

**Tests:**
- Filtering works
- Sorting works
- Pagination correct
- Data completeness

**Success Criteria:**
- API returns correct data
- Performance < 500ms

---

#### T2.8: Template Preview Service (3h)
**Dependency:** T2.7 ✅
**Files:**
- `backend/src/portfolio-marketplace/services/template-preview.service.ts` (85 lines)
- Tests (130 lines)

**Features:**
- Generate preview with user's data
- Sandboxed iframe rendering
- Screenshot generation for gallery

**Dependencies:** `puppeteer` for screenshots

**Tests:**
- Preview generation
- Screenshot quality
- Sandboxing security

**Success Criteria:**
- Previews render correctly
- User data not exposed

---

#### T2.9: Marketplace Controller (3h)
**Dependency:** T2.8 ✅
**Files:**
- `backend/src/portfolio-marketplace/controllers/marketplace.controller.ts` (95 lines)
- Tests (180 lines)

**Endpoints:**
```
GET    /api/portfolio-marketplace/v1/templates          (browse)
GET    /api/portfolio-marketplace/v1/templates/:id      (details)
POST   /api/portfolio-marketplace/v1/templates/submit   (submit)
POST   /api/portfolio-marketplace/v1/templates/:id/rate (rate)
POST   /api/portfolio-marketplace/v1/templates/:id/install (install)
GET    /api/portfolio-marketplace/v1/my-submissions     (user's submissions)
```

**Tests:**
- All endpoints functional
- Auth guards
- Input validation
- Error handling

**Success Criteria:**
- All endpoints return correct data
- Proper status codes

---

#### T2.10: Admin Moderation Controller (2h)
**Dependency:** T2.5 ✅
**Files:**
- `backend/src/portfolio-marketplace/controllers/admin-moderation.controller.ts` (80 lines)
- Tests (140 lines)

**Endpoints:**
```
GET    /api/admin/marketplace/submissions        (pending list)
PATCH  /api/admin/marketplace/submissions/:id/approve
PATCH  /api/admin/marketplace/submissions/:id/reject
```

**Guard:** `@Roles('ADMIN')`

**Tests:**
- Admin access only
- Approve/reject flows
- Status updates

**Success Criteria:**
- Admin can moderate
- Non-admin blocked

---

#### T2.11: Frontend - Template Browser (4h)
**Dependency:** T2.9 ✅
**Files:**
- `frontend/app/(dashboard)/portfolio/templates/marketplace/page.tsx` (95 lines)
- `frontend/src/components/portfolio/TemplateCard.tsx` (85 lines)
- `frontend/src/components/portfolio/TemplateFilters.tsx` (75 lines)
- `frontend/src/hooks/queries/useMarketplace.ts` (90 lines)

**UI:**
- Grid layout of template cards
- Filter sidebar (category, price, rating)
- Sort dropdown
- Infinite scroll pagination
- "Preview" button on hover

**Tests:**
- Component renders
- Filtering works
- Sorting works
- Pagination works

**Success Criteria:**
- User can browse templates easily
- Filters responsive

---

#### T2.12: Frontend - Template Preview Modal (3h)
**Dependency:** T2.11 ✅
**Files:**
- `frontend/src/components/portfolio/TemplatePreviewModal.tsx` (90 lines)
- `frontend/src/components/portfolio/TemplateScreenshots.tsx` (70 lines)

**UI:**
- Full-screen modal
- Sandboxed iframe preview
- Screenshot carousel
- Ratings display
- "Install" button
- "View Details" button

**Tests:**
- Modal opens/closes
- Preview loads
- Install triggers

**Success Criteria:**
- Preview renders safely
- User can install from modal

---

#### T2.13: Frontend - Template Submission Form (3h)
**Dependency:** T2.9 ✅
**Files:**
- `frontend/app/(dashboard)/portfolio/templates/submit/page.tsx` (95 lines)
- `frontend/src/components/portfolio/TemplateCodeEditor.tsx` (90 lines)

**UI:**
- Multi-step form
  - Step 1: Basic info (name, description, category)
  - Step 2: Code (HTML/CSS/JS editors with syntax highlighting)
  - Step 3: Config schema
  - Step 4: Screenshots upload
  - Step 5: Review & submit
- Live preview panel

**Dependencies:** `@monaco-editor/react` for code editing

**Tests:**
- Form validation
- Code editor integration
- Submission success

**Success Criteria:**
- Developers can submit templates
- Code editors functional

---

#### T2.14: Frontend - Rating & Review Component (2h)
**Dependency:** T2.9 ✅
**Files:**
- `frontend/src/components/portfolio/TemplateRating.tsx` (80 lines)

**UI:**
- Star rating widget (1-5 stars)
- Review textarea
- Submit button
- Review list (pagination)

**Tests:**
- Rating submission
- Review display
- Edit existing rating

**Success Criteria:**
- Users can rate templates
- Reviews visible

---

#### T2.15: Integration Tests (3h)
**Dependency:** All above ✅
**Files:**
- `backend/test/portfolio-marketplace.e2e-spec.ts` (250 lines)

**Scenarios:**
1. Submit template → Moderation → Approve → Appears in marketplace
2. User browses → Previews → Rates → Installs
3. Security: XSS attempts blocked
4. Concurrent installs (race condition)

**Success Criteria:**
- All flows work end-to-end
- No security vulnerabilities

---

**Feature 2 Risks & Mitigations:**
- **Risk:** Malicious templates → **Mitigation:** Strict sanitization, manual moderation
- **Risk:** Copyright infringement → **Mitigation:** License validation, DMCA process
- **Risk:** Low-quality templates → **Mitigation:** Quality score, ratings filter

---

## 🏗️ Feature 3: Advanced Analytics (P1)

**Effort:** 22-28 hours | **Priority:** P1 | **Tasks:** 18

### Business Value
- User engagement insights
- Portfolio optimization data
- Conversion tracking (contact forms)
- Geographic targeting for job search

### Architecture Overview
```
External Portfolio → Analytics Pixel → API Endpoint → Database
Dashboard → Analytics Service → Charts & Reports
```

### Database Schema Changes

**Extend Existing `portfolio_analytics` Table:**
```sql
-- Add new columns
ALTER TABLE portfolio_analytics ADD COLUMN section_id TEXT;
ALTER TABLE portfolio_analytics ADD COLUMN element_id TEXT;
ALTER TABLE portfolio_analytics ADD COLUMN scroll_depth INTEGER;
ALTER TABLE portfolio_analytics ADD COLUMN time_spent_seconds INTEGER;
ALTER TABLE portfolio_analytics ADD COLUMN click_coordinates JSONB;
ALTER TABLE portfolio_analytics ADD COLUMN device_type TEXT; -- mobile, tablet, desktop
ALTER TABLE portfolio_analytics ADD COLUMN browser TEXT;
ALTER TABLE portfolio_analytics ADD COLUMN screen_resolution TEXT;

-- New tables
CREATE TABLE portfolio_heatmap_data (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  page TEXT NOT NULL,

  -- Click coordinates (normalized 0-1)
  x_position DECIMAL(5,4) NOT NULL,
  y_position DECIMAL(5,4) NOT NULL,

  -- Context
  element_selector TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE portfolio_conversion_events (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,

  -- Conversion details
  event_name TEXT NOT NULL, -- 'contact_form_submit', 'download_resume', 'email_click'
  form_data JSONB,

  -- Attribution
  initial_referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Journey
  page_views_before_conversion INTEGER,
  time_to_conversion_seconds INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_heatmap_project_page ON portfolio_heatmap_data(project_id, page);
CREATE INDEX idx_conversions_project ON portfolio_conversion_events(project_id);
CREATE INDEX idx_conversions_visitor ON portfolio_conversion_events(visitor_id);
```

### Task Breakdown

#### T3.1: Database Schema Extension (2h)
**Dependency:** None
**Files:**
- Update `backend/src/database/portfolio-analytics.schema.ts` (add 30 lines)
- `backend/drizzle/XXXX_extend_analytics_tables.sql` (60 lines)

**Tests:**
- Schema migration
- Column additions
- Index creation

**Success Criteria:**
- Migration succeeds
- Existing data preserved

---

#### T3.2: Analytics Tracking DTOs (2h)
**Dependency:** T3.1 ✅
**Files:**
- `backend/src/portfolio-analytics/dto/track-event.dto.ts` (85 lines)

```typescript
export class TrackPageViewDto {
  @IsString()
  page: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsInt()
  @IsOptional()
  scrollDepth?: number;

  @IsInt()
  @IsOptional()
  timeSpent?: number;

  @IsString()
  @IsOptional()
  visitorId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class TrackClickDto {
  @IsString()
  page: string;

  @IsNumber()
  @IsMin(0)
  @IsMax(1)
  xPosition: number;

  @IsNumber()
  @IsMin(0)
  @IsMax(1)
  yPosition: number;

  @IsString()
  elementSelector: string;

  @IsInt()
  viewportWidth: number;

  @IsInt()
  viewportHeight: number;
}

export class TrackConversionDto {
  @IsString()
  eventName: string;

  @IsString()
  visitorId: string;

  @IsObject()
  @IsOptional()
  formData?: Record<string, any>;

  @IsString()
  @IsOptional()
  initialReferrer?: string;

  @IsInt()
  pageViewsBeforeConversion: number;

  @IsInt()
  timeToConversionSeconds: number;
}
```

**Tests:**
- DTO validation
- Optional fields handling
- Range validation (0-1 for positions)

**Success Criteria:**
- Validation catches invalid data

---

#### T3.3: Heatmap Service (4h)
**Dependency:** T3.2 ✅
**Files:**
- `backend/src/portfolio-analytics/services/heatmap.service.ts` (95 lines)
- `backend/src/portfolio-analytics/services/heatmap.service.spec.ts` (150 lines)

**Implementation:**
```typescript
@Injectable()
export class HeatmapService {
  async recordClick(projectId: number, data: TrackClickDto) {
    // Normalize coordinates (relative to viewport)
    // Store in portfolio_heatmap_data
    // Return success
  }

  async getHeatmapData(projectId: number, page: string, options: HeatmapOptions) {
    // Aggregate clicks by grid (e.g., 50x50 grid)
    // Calculate density (clicks per cell)
    // Return heatmap matrix
  }

  async getScrollDepthDistribution(projectId: number, page: string) {
    // Group by scroll depth ranges (0-25%, 25-50%, etc.)
    // Count users per range
    // Return distribution
  }
}
```

**Tests:**
- Click recording
- Heatmap aggregation (grid-based)
- Scroll depth analysis
- Performance (1M clicks)

**Success Criteria:**
- Heatmap data accurate
- Aggregation fast (<1s)

---

#### T3.4: Geographic Analytics Service (3h)
**Dependency:** T3.1 ✅
**Files:**
- `backend/src/portfolio-analytics/services/geo-analytics.service.ts` (90 lines)
- Tests (140 lines)

**Implementation:**
```typescript
@Injectable()
export class GeoAnalyticsService {
  async getGeographicDistribution(projectId: number, dateRange: DateRange) {
    // Group by country
    // Count visitors per country
    // Return top 20 countries with percentages
  }

  async getCityDistribution(projectId: number, country: string) {
    // Drill down to city level
    // Return top cities
  }

  async enrichIpAddress(ip: string): Promise<GeoData> {
    // Use IP geolocation API (MaxMind or ipapi.co)
    // Cache results (24h)
    // Return country, city, coordinates
  }
}
```

**Dependencies:** IP geolocation service (MaxMind GeoLite2 or ipapi.co)

**Tests:**
- IP enrichment
- Country aggregation
- City drill-down
- Cache effectiveness

**Success Criteria:**
- Geographic data accurate (>90%)
- Caching reduces API calls

---

#### T3.5: Traffic Sources Service (3h)
**Dependency:** T3.1 ✅
**Files:**
- `backend/src/portfolio-analytics/services/traffic-sources.service.ts` (85 lines)
- Tests (130 lines)

**Implementation:**
```typescript
@Injectable()
export class TrafficSourcesService {
  async analyzeTrafficSources(projectId: number, dateRange: DateRange) {
    // Group by referrer domain
    // Classify: direct, search, social, referral
    // Count visitors per source
    // Calculate conversion rate per source
  }

  async getUtmCampaignPerformance(projectId: number) {
    // Group by UTM parameters
    // Track campaign effectiveness
    // Calculate ROI metrics
  }

  private classifyReferrer(referrer: string): string {
    // google.com → 'search'
    // linkedin.com → 'social'
    // direct → 'direct'
    // other → 'referral'
  }
}
```

**Tests:**
- Referrer classification
- UTM tracking
- Conversion attribution

**Success Criteria:**
- Traffic sources accurate
- Classification correct (>95%)

---

#### T3.6: Conversion Tracking Service (3h)
**Dependency:** T3.2 ✅
**Files:**
- `backend/src/portfolio-analytics/services/conversion-tracking.service.ts` (90 lines)
- Tests (150 lines)

**Implementation:**
```typescript
@Injectable()
export class ConversionTrackingService {
  async trackConversion(projectId: number, data: TrackConversionDto) {
    // Record conversion event
    // Update visitor journey
    // Calculate time-to-conversion
    // Store attribution data
  }

  async getConversionFunnel(projectId: number) {
    // Visitor → Page Views → Interactions → Conversion
    // Calculate drop-off rates
    // Return funnel stages
  }

  async getConversionRate(projectId: number, dateRange: DateRange) {
    // Total visitors vs. conversions
    // By source
    // By device type
  }
}
```

**Tests:**
- Conversion recording
- Funnel calculation
- Rate computation
- Attribution accuracy

**Success Criteria:**
- Conversions tracked accurately
- Funnel data insightful

---

#### T3.7: Analytics Public Endpoint (2h)
**Dependency:** T3.2 ✅
**Files:**
- `backend/src/portfolio-analytics/controllers/analytics-tracking.controller.ts` (75 lines)
- Tests (120 lines)

**Endpoints:**
```
POST /api/portfolio-analytics/v1/track/pageview    (public)
POST /api/portfolio-analytics/v1/track/click       (public)
POST /api/portfolio-analytics/v1/track/conversion  (public)
```

**Note:** Public endpoints, but require `X-Project-Id` header

**Tests:**
- Tracking endpoints work
- Rate limiting (1000 req/min per project)
- Invalid data rejected

**Success Criteria:**
- External portfolios can send analytics
- No auth required (public)

---

#### T3.8: Analytics Dashboard Endpoints (2h)
**Dependency:** T3.3 ✅, T3.4 ✅, T3.5 ✅, T3.6 ✅
**Files:**
- `backend/src/portfolio-analytics/controllers/analytics-dashboard.controller.ts` (95 lines)
- Tests (160 lines)

**Endpoints:**
```
GET /api/portfolio-analytics/v1/dashboard/overview
GET /api/portfolio-analytics/v1/dashboard/heatmap
GET /api/portfolio-analytics/v1/dashboard/geographic
GET /api/portfolio-analytics/v1/dashboard/traffic-sources
GET /api/portfolio-analytics/v1/dashboard/conversions
```

**Auth:** `@UseGuards(JwtAuthGuard)`

**Tests:**
- All endpoints return data
- Date range filtering
- Auth required

**Success Criteria:**
- Dashboard gets all needed data in 5 API calls

---

#### T3.9: Frontend - Analytics Tracking Script (2h)
**Dependency:** T3.7 ✅
**Files:**
- `portefolio/js/analytics.js` (95 lines - vanilla JS)

**Implementation:**
```javascript
const PortfolioAnalytics = {
  visitorId: localStorage.getItem('visitor_id') || generateUUID(),
  apiUrl: PORTFOLIO_CONFIG.API_URL,
  projectId: PORTFOLIO_CONFIG.PROJECT_ID,

  init() {
    this.trackPageView();
    this.trackScrollDepth();
    this.trackClicks();
    this.trackTimeOnPage();
  },

  trackPageView() {
    navigator.sendBeacon(`${this.apiUrl}/portfolio-analytics/v1/track/pageview`, {
      page: window.location.pathname,
      visitorId: this.visitorId,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    });
  },

  trackClicks() {
    document.addEventListener('click', (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      this.sendEvent('click', {
        xPosition: x,
        yPosition: y,
        elementSelector: this.getSelector(e.target)
      });
    });
  }
};
```

**Tests:**
- Page view tracking
- Click tracking
- Scroll depth tracking
- No errors in console

**Success Criteria:**
- Analytics sent automatically
- No performance impact (<50ms)

---

#### T3.10: Frontend - Analytics Dashboard (4h)
**Dependency:** T3.8 ✅
**Files:**
- `frontend/app/(dashboard)/portfolio/analytics/page.tsx` (95 lines)
- `frontend/src/components/portfolio/analytics/OverviewStats.tsx` (80 lines)
- `frontend/src/components/portfolio/analytics/HeatmapViewer.tsx` (90 lines)
- `frontend/src/components/portfolio/analytics/GeographicMap.tsx` (85 lines)
- `frontend/src/hooks/queries/usePortfolioAnalytics.ts` (95 lines)

**UI Components:**
1. **Overview Stats:** Visitors, page views, avg. time, conversion rate
2. **Heatmap Viewer:** Visual heatmap overlay on portfolio screenshot
3. **Geographic Map:** World map with visitor distribution
4. **Traffic Sources:** Pie chart of source breakdown
5. **Conversion Funnel:** Sankey diagram

**Dependencies:**
- `recharts` for charts
- `react-map-gl` for geographic map
- `h337` (heatmap.js) for heatmap visualization

**Tests:**
- Components render
- Data fetching
- Chart updates
- Date range selector

**Success Criteria:**
- User sees comprehensive analytics
- Visualizations accurate

---

#### T3.11: Integration Tests (3h)
**Dependency:** All above ✅
**Files:**
- `backend/test/portfolio-analytics.e2e-spec.ts` (220 lines)

**Scenarios:**
1. External portfolio sends analytics → Dashboard displays
2. Heatmap data aggregation (1000 clicks)
3. Conversion tracking flow
4. Geographic enrichment
5. Performance (10k events/min)

**Success Criteria:**
- All flows work
- No data loss
- Performance acceptable

---

**Feature 3 Risks & Mitigations:**
- **Risk:** High traffic overwhelms DB → **Mitigation:** Queue system, batch inserts
- **Risk:** Privacy concerns (GDPR) → **Mitigation:** Anonymization, opt-out mechanism
- **Risk:** Bot traffic skews data → **Mitigation:** Bot detection, IP filtering

---

## 🏗️ Feature 4: SEO Optimization (P1)

**Effort:** 16-22 hours | **Priority:** P1 | **Tasks:** 16

### Business Value
- Better search engine visibility
- Higher organic traffic
- Rich snippets in search results
- Social media preview cards

### Architecture Overview
```
Portfolio Data → SEO Generator → Meta Tags + Sitemap + JSON-LD
External Portfolio → Server-side rendering (optional) → SEO-friendly HTML
```

### Database Schema Changes

**New Table:**
```sql
CREATE TABLE portfolio_seo_settings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE UNIQUE,

  -- Global settings
  site_title TEXT,
  site_description TEXT,
  site_keywords TEXT[],
  author_name TEXT,

  -- Social media
  twitter_handle TEXT,
  og_image_url TEXT, -- Default Open Graph image

  -- Advanced
  robots_txt TEXT,
  custom_meta_tags JSONB DEFAULT '[]',

  -- Structured data
  person_schema JSONB, -- Schema.org Person
  website_schema JSONB, -- Schema.org Website

  -- Sitemap settings
  sitemap_priority DECIMAL(2,1) DEFAULT 0.7,
  sitemap_changefreq TEXT DEFAULT 'weekly',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE portfolio_og_images (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  portfolio_project_id INTEGER REFERENCES portfolio_projects(id) ON DELETE CASCADE,

  -- Generated image
  image_url TEXT NOT NULL,
  width INTEGER DEFAULT 1200,
  height INTEGER DEFAULT 630,

  -- Generation settings
  template TEXT, -- 'default', 'gradient', 'screenshot'
  generated_at TIMESTAMP DEFAULT NOW()
);
```

### Task Breakdown

#### T4.1: Database Schema (2h)
**Dependency:** None
**Files:**
- `backend/src/database/portfolio-seo.schema.ts` (70 lines)
- `backend/drizzle/XXXX_add_seo_tables.sql` (50 lines)

**Tests:**
- Schema validation
- Unique constraint on project_id

**Success Criteria:**
- Migration succeeds

---

#### T4.2: SEO Settings DTOs (1.5h)
**Dependency:** T4.1 ✅
**Files:**
- `backend/src/portfolio/dto/seo-settings.dto.ts` (75 lines)

```typescript
export class UpdateSeoSettingsDto {
  @IsString()
  @IsOptional()
  siteTitle?: string;

  @IsString()
  @MaxLength(160)
  @IsOptional()
  siteDescription?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  siteKeywords?: string[];

  @IsString()
  @IsOptional()
  twitterHandle?: string;

  @IsUrl()
  @IsOptional()
  ogImageUrl?: string;

  @IsObject()
  @IsOptional()
  personSchema?: Record<string, any>;

  @IsObject()
  @IsOptional()
  websiteSchema?: Record<string, any>;
}
```

**Tests:**
- Validation works
- Description length enforced

**Success Criteria:**
- DTOs validate correctly

---

#### T4.3: Meta Tags Generator Service (3h)
**Dependency:** T4.2 ✅
**Files:**
- `backend/src/portfolio/services/meta-tags-generator.service.ts` (95 lines)
- Tests (140 lines)

**Implementation:**
```typescript
@Injectable()
export class MetaTagsGeneratorService {
  generateMetaTags(portfolio: PortfolioData, seoSettings: SeoSettings): MetaTags {
    return {
      // Basic
      title: seoSettings.siteTitle || `${portfolio.name} - Portfolio`,
      description: seoSettings.siteDescription,
      keywords: seoSettings.siteKeywords.join(', '),
      author: seoSettings.authorName,

      // Open Graph
      ogTitle: seoSettings.siteTitle,
      ogDescription: seoSettings.siteDescription,
      ogImage: seoSettings.ogImageUrl,
      ogUrl: portfolio.url,
      ogType: 'website',

      // Twitter Card
      twitterCard: 'summary_large_image',
      twitterSite: seoSettings.twitterHandle,
      twitterTitle: seoSettings.siteTitle,
      twitterDescription: seoSettings.siteDescription,
      twitterImage: seoSettings.ogImageUrl,

      // Additional
      canonical: portfolio.url,
      robots: 'index, follow'
    };
  }

  generateProjectMetaTags(project: PortfolioProject, seoSettings: SeoSettings): MetaTags {
    // Project-specific meta tags
  }
}
```

**Tests:**
- Meta tags generation
- Fallback values
- Special characters escaping

**Success Criteria:**
- All required meta tags present
- Valid HTML

---

#### T4.4: Open Graph Image Generator (4h)
**Dependency:** T4.1 ✅
**Files:**
- `backend/src/portfolio/services/og-image-generator.service.ts` (98 lines)
- Tests (150 lines)

**Implementation:**
```typescript
@Injectable()
export class OgImageGeneratorService {
  async generateOgImage(project: PortfolioProject, template: string): Promise<Buffer> {
    // Use Puppeteer to render HTML to image
    // Template options: gradient background, project screenshot, custom design
    // Size: 1200x630 (Facebook/LinkedIn standard)
    // Format: PNG or JPEG
  }

  async generateDefaultOgImage(portfolio: PortfolioData): Promise<Buffer> {
    // Render portfolio name + tagline
    // Use brand colors
  }
}
```

**Dependencies:** `puppeteer` or `@vercel/og` for serverless

**Tests:**
- Image generation
- Correct dimensions (1200x630)
- File size < 500KB

**Success Criteria:**
- Images render correctly
- Performance < 3s per image

---

#### T4.5: Sitemap Generator Service (3h)
**Dependency:** T4.1 ✅
**Files:**
- `backend/src/portfolio/services/sitemap-generator.service.ts` (90 lines)
- Tests (130 lines)

**Implementation:**
```typescript
@Injectable()
export class SitemapGeneratorService {
  async generateSitemap(projectId: number): Promise<string> {
    const projects = await this.portfolioService.findAllProjects(projectId, undefined, { status: 'published' });
    const seoSettings = await this.getSeoSettings(projectId);

    const urls = [
      { loc: '/', priority: 1.0, changefreq: 'weekly' },
      { loc: '/projects', priority: 0.9, changefreq: 'weekly' },
      ...projects.map(p => ({
        loc: `/projects/${p.slug}`,
        priority: seoSettings.sitemapPriority,
        changefreq: seoSettings.sitemapChangefreq,
        lastmod: p.updatedAt
      }))
    ];

    return this.buildXml(urls);
  }

  private buildXml(urls: SitemapUrl[]): string {
    // Generate valid sitemap.xml
  }
}
```

**Tests:**
- Valid XML output
- All published projects included
- lastmod dates correct

**Success Criteria:**
- Sitemap validates (xml-sitemaps.com validator)

---

#### T4.6: Structured Data (JSON-LD) Service (3h)
**Dependency:** T4.2 ✅
**Files:**
- `backend/src/portfolio/services/structured-data.service.ts` (95 lines)
- Tests (140 lines)

**Implementation:**
```typescript
@Injectable()
export class StructuredDataService {
  generatePersonSchema(portfolio: PortfolioData, seoSettings: SeoSettings) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: seoSettings.authorName,
      jobTitle: portfolio.title,
      description: portfolio.bio,
      url: portfolio.url,
      sameAs: portfolio.socialLinks,
      knowsAbout: portfolio.skills.map(s => s.name),
      worksFor: portfolio.experiences.map(exp => ({
        '@type': 'Organization',
        name: exp.company
      }))
    };
  }

  generateWorkSchema(project: PortfolioProject) {
    return {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: project.title,
      description: project.description,
      url: project.projectUrl,
      author: { '@type': 'Person', name: project.author },
      datePublished: project.startDate,
      keywords: project.technologies
    };
  }

  generateWebsiteSchema(portfolio: PortfolioData) {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: portfolio.url,
      name: portfolio.name,
      description: portfolio.description
    };
  }
}
```

**Tests:**
- Schema validation (Google Rich Results Test)
- All required fields present

**Success Criteria:**
- Passes Google Rich Results Test

---

#### T4.7: SEO Service (2h)
**Dependency:** T4.3 ✅, T4.4 ✅, T4.5 ✅, T4.6 ✅
**Files:**
- `backend/src/portfolio/services/seo.service.ts` (85 lines)
- Tests (120 lines)

**Implementation:**
```typescript
@Injectable()
export class SeoService {
  async getSeoData(projectId: number) {
    const [portfolio, seoSettings] = await Promise.all([
      this.getPortfolioData(projectId),
      this.getSeoSettings(projectId)
    ]);

    return {
      metaTags: this.metaTagsGenerator.generateMetaTags(portfolio, seoSettings),
      structuredData: this.structuredDataService.generatePersonSchema(portfolio, seoSettings),
      sitemap: await this.sitemapGenerator.generateSitemap(projectId)
    };
  }

  async updateSeoSettings(projectId: number, dto: UpdateSeoSettingsDto) {
    // Upsert SEO settings
    // Regenerate OG images if needed
  }
}
```

**Tests:**
- Get SEO data
- Update settings
- Cache invalidation

**Success Criteria:**
- SEO data complete

---

#### T4.8: SEO Controller (2h)
**Dependency:** T4.7 ✅
**Files:**
- `backend/src/portfolio/controllers/seo.controller.ts` (75 lines)
- Tests (130 lines)

**Endpoints:**
```
GET  /api/portfolio/v1/seo/meta-tags
GET  /api/portfolio/v1/seo/sitemap.xml
GET  /api/portfolio/v1/seo/robots.txt
POST /api/portfolio/v1/seo/settings
GET  /api/portfolio/v1/seo/settings
POST /api/portfolio/v1/seo/generate-og-image/:projectId
```

**Tests:**
- All endpoints functional
- Sitemap returns XML
- robots.txt returns text

**Success Criteria:**
- Endpoints return correct data

---

#### T4.9: Frontend - SEO Settings UI (3h)
**Dependency:** T4.8 ✅
**Files:**
- `frontend/app/(dashboard)/portfolio/seo/page.tsx` (95 lines)
- `frontend/src/components/portfolio/SeoPreview.tsx` (85 lines)
- `frontend/src/hooks/queries/useSeo.ts` (70 lines)

**UI:**
- Form for SEO settings
- Live preview (Google search result preview)
- OG image preview (Facebook/Twitter card)
- Sitemap viewer
- Schema.org validator link

**Tests:**
- Form submission
- Preview updates
- Settings saved

**Success Criteria:**
- User can configure SEO easily
- Preview accurate

---

#### T4.10: External Portfolio Integration (2h)
**Dependency:** T4.8 ✅
**Files:**
- Update `portefolio/index.html` (add 20 lines in `<head>`)
- `portefolio/js/seo.js` (70 lines)

**Implementation:**
```html
<head>
  <!-- Dynamically injected meta tags -->
  <meta name="description" content="...">
  <meta property="og:title" content="...">
  <meta property="og:description" content="...">
  <meta property="og:image" content="...">
  <meta name="twitter:card" content="summary_large_image">

  <!-- JSON-LD structured data -->
  <script type="application/ld+json">
    {/* Person schema */}
  </script>
</head>
```

**Tests:**
- Meta tags present
- JSON-LD valid
- Social media preview works (Facebook Sharing Debugger)

**Success Criteria:**
- SEO tools recognize data
- Social previews render correctly

---

#### T4.11: Integration Tests (3h)
**Dependency:** All above ✅
**Files:**
- `backend/test/portfolio-seo.e2e-spec.ts` (180 lines)

**Scenarios:**
1. Configure SEO → Generate sitemap → Validate XML
2. Generate OG image → Check dimensions
3. Update settings → Meta tags updated
4. Structured data validation (Google)

**Success Criteria:**
- All flows work
- SEO tools validate data

---

**Feature 4 Risks & Mitigations:**
- **Risk:** OG image generation slow → **Mitigation:** Cache images, background processing
- **Risk:** Invalid structured data → **Mitigation:** Schema validation before save
- **Risk:** Sitemap too large → **Mitigation:** Sitemap index for 1000+ projects

---

## 🏗️ Feature 5: Multi-language Support (P2)

**Effort:** 24-40 hours | **Priority:** P2 | **Tasks:** 18

### Business Value
- Global reach (non-English users)
- International job opportunities
- Accessibility for multilingual portfolios

### Architecture Overview
```
Content (Multi-lang) → i18n Service → Translation API (optional)
Dashboard → Language Selector → Localized UI
External Portfolio → Language Switcher → Translated Content
```

### Database Schema Changes

**New Tables:**
```sql
CREATE TABLE portfolio_translations (
  id SERIAL PRIMARY KEY,

  -- Relations
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'portfolio_project', 'skill', 'experience', 'testimonial'
  entity_id INTEGER NOT NULL,

  -- Translation
  language_code TEXT NOT NULL, -- ISO 639-1 (en, fr, es, de, ja, zh)
  field_name TEXT NOT NULL, -- 'title', 'description', 'content'
  translated_text TEXT NOT NULL,

  -- Metadata
  translation_source TEXT, -- 'manual', 'google_translate', 'deepl'
  verified BOOLEAN DEFAULT false,
  translator_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(entity_type, entity_id, language_code, field_name)
);

CREATE TABLE portfolio_i18n_settings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE UNIQUE,

  -- Language settings
  default_language TEXT DEFAULT 'en',
  enabled_languages TEXT[] DEFAULT '{"en"}',

  -- Auto-translation
  auto_translate BOOLEAN DEFAULT false,
  translation_provider TEXT, -- 'google', 'deepl', 'manual'
  translation_api_key TEXT, -- Encrypted

  -- UI preferences
  show_language_switcher BOOLEAN DEFAULT true,
  fallback_to_default BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_translations_entity ON portfolio_translations(entity_type, entity_id, language_code);
CREATE INDEX idx_translations_project ON portfolio_translations(project_id);
```

### Task Breakdown

#### T5.1: Database Schema (2.5h)
**Dependency:** None
**Files:**
- `backend/src/database/portfolio-i18n.schema.ts` (85 lines)
- `backend/drizzle/XXXX_add_i18n_tables.sql` (70 lines)

**Tests:**
- Schema validation
- Unique constraint enforcement
- Array column (enabled_languages)

**Success Criteria:**
- Migration succeeds

---

#### T5.2: i18n DTOs (2h)
**Dependency:** T5.1 ✅
**Files:**
- `backend/src/portfolio/dto/i18n.dto.ts` (90 lines)

```typescript
export class CreateTranslationDto {
  @IsEnum(['portfolio_project', 'skill', 'experience', 'testimonial'])
  entityType: string;

  @IsInt()
  entityId: number;

  @IsString()
  @Length(2, 2)
  languageCode: string;

  @IsString()
  fieldName: string;

  @IsString()
  translatedText: string;

  @IsEnum(['manual', 'google_translate', 'deepl'])
  @IsOptional()
  translationSource?: string;
}

export class UpdateI18nSettingsDto {
  @IsString()
  @Length(2, 2)
  @IsOptional()
  defaultLanguage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledLanguages?: string[];

  @IsBoolean()
  @IsOptional()
  autoTranslate?: boolean;

  @IsEnum(['google', 'deepl', 'manual'])
  @IsOptional()
  translationProvider?: string;
}
```

**Tests:**
- DTO validation
- Language code format (ISO 639-1)

**Success Criteria:**
- Validation works

---

#### T5.3: Translation Service (4h)
**Dependency:** T5.2 ✅
**Files:**
- `backend/src/portfolio/services/translation.service.ts` (98 lines)
- Tests (160 lines)

**Implementation:**
```typescript
@Injectable()
export class TranslationService {
  async getTranslation(entityType: string, entityId: number, language: string, fieldName: string) {
    const translation = await db.query.portfolioTranslations.findFirst({
      where: and(
        eq(portfolioTranslations.entityType, entityType),
        eq(portfolioTranslations.entityId, entityId),
        eq(portfolioTranslations.languageCode, language),
        eq(portfolioTranslations.fieldName, fieldName)
      )
    });

    return translation?.translatedText;
  }

  async createTranslation(projectId: number, dto: CreateTranslationDto) {
    // Validate entity exists
    // Insert translation (upsert on conflict)
  }

  async translateEntity(entity: any, targetLanguage: string, settings: I18nSettings) {
    // Get all translations for entity
    // Merge with original data
    // Fallback to default language if translation missing
  }

  async bulkTranslate(entities: any[], targetLanguage: string) {
    // Parallel translation lookup
    // Efficient batch query
  }
}
```

**Tests:**
- Get translation
- Create translation
- Translate entity
- Fallback behavior
- Bulk translation performance

**Success Criteria:**
- Translations retrieved correctly
- Fallback works

---

#### T5.4: Auto-Translation Service (5h)
**Dependency:** T5.3 ✅
**Files:**
- `backend/src/portfolio/services/auto-translation.service.ts` (95 lines)
- `backend/src/portfolio/services/providers/google-translate.provider.ts` (75 lines)
- `backend/src/portfolio/services/providers/deepl.provider.ts` (75 lines)
- Tests (180 lines)

**Implementation:**
```typescript
@Injectable()
export class AutoTranslationService {
  async translateText(text: string, sourceLang: string, targetLang: string, provider: string) {
    switch (provider) {
      case 'google':
        return this.googleTranslateProvider.translate(text, sourceLang, targetLang);
      case 'deepl':
        return this.deeplProvider.translate(text, sourceLang, targetLang);
      default:
        throw new Error('Invalid provider');
    }
  }

  async autoTranslateEntity(entity: any, entityType: string, targetLanguages: string[]) {
    // Detect translatable fields
    // Translate each field to each target language
    // Store translations
    // Mark as unverified (human review needed)
  }

  async estimateCost(wordCount: number, targetLanguages: string[], provider: string) {
    // DeepL: $20/1M chars
    // Google: $20/1M chars
    // Return cost estimate
  }
}
```

**Dependencies:** `@google-cloud/translate` or `deepl-node`

**Tests:**
- Translation API integration
- Error handling (API failures)
- Cost estimation
- Character limits

**Success Criteria:**
- Auto-translation works
- API errors handled gracefully

---

#### T5.5: Language Detection Service (2h)
**Dependency:** None
**Files:**
- `backend/src/portfolio/services/language-detection.service.ts` (65 lines)
- Tests (100 lines)

**Implementation:**
```typescript
@Injectable()
export class LanguageDetectionService {
  async detectLanguage(text: string): Promise<string> {
    // Use franc or Google Cloud Translation API
    // Return ISO 639-1 code
  }

  async detectPortfolioLanguage(projectId: number) {
    // Analyze project titles, descriptions
    // Determine primary language
    // Return detected language
  }
}
```

**Dependencies:** `franc` (offline) or Google API

**Tests:**
- Detect English, French, Spanish
- Accuracy >90%

**Success Criteria:**
- Language detection accurate

---

#### T5.6: i18n Settings Service (2h)
**Dependency:** T5.1 ✅
**Files:**
- `backend/src/portfolio/services/i18n-settings.service.ts` (70 lines)
- Tests (110 lines)

**Implementation:**
```typescript
@Injectable()
export class I18nSettingsService {
  async getSettings(projectId: number) {
    // Get or create default settings
  }

  async updateSettings(projectId: number, dto: UpdateI18nSettingsDto) {
    // Update settings
    // Encrypt API keys
  }

  async enableLanguage(projectId: number, languageCode: string) {
    // Add to enabled_languages array
  }

  async disableLanguage(projectId: number, languageCode: string) {
    // Remove from enabled_languages array
    // Optionally delete translations
  }
}
```

**Tests:**
- CRUD operations
- API key encryption
- Language enable/disable

**Success Criteria:**
- Settings managed correctly

---

#### T5.7: Localized Portfolio Service (3h)
**Dependency:** T5.3 ✅
**Files:**
- `backend/src/portfolio/services/localized-portfolio.service.ts` (95 lines)
- Tests (150 lines)

**Implementation:**
```typescript
@Injectable()
export class LocalizedPortfolioService {
  async getLocalizedPortfolio(projectId: number, language: string) {
    const [projects, skills, experiences, testimonials, settings] = await Promise.all([
      this.portfolioService.findAllProjects(projectId, undefined, { status: 'published' }),
      this.portfolioService.findAllSkills(projectId),
      this.portfolioService.findAllExperiences(projectId),
      this.portfolioService.findAllTestimonials(projectId, { status: 'published' }),
      this.i18nSettingsService.getSettings(projectId)
    ]);

    // Translate all entities
    const translatedProjects = await this.translationService.bulkTranslate(projects, language);
    const translatedSkills = await this.translationService.bulkTranslate(skills, language);
    const translatedExperiences = await this.translationService.bulkTranslate(experiences, language);
    const translatedTestimonials = await this.translationService.bulkTranslate(testimonials, language);

    return {
      projects: translatedProjects,
      skills: translatedSkills,
      experiences: translatedExperiences,
      testimonials: translatedTestimonials,
      metadata: {
        language,
        defaultLanguage: settings.defaultLanguage,
        availableLanguages: settings.enabledLanguages
      }
    };
  }
}
```

**Tests:**
- Localized data retrieval
- Performance (translation caching)
- Fallback behavior

**Success Criteria:**
- Localized portfolio complete
- Performance <2s

---

#### T5.8: i18n Controller (3h)
**Dependency:** T5.7 ✅
**Files:**
- `backend/src/portfolio/controllers/i18n.controller.ts` (90 lines)
- Tests (150 lines)

**Endpoints:**
```
GET  /api/portfolio/v1/i18n/settings
POST /api/portfolio/v1/i18n/settings
GET  /api/portfolio/v1/i18n/translations/:entityType/:entityId
POST /api/portfolio/v1/i18n/translations
PUT  /api/portfolio/v1/i18n/translations/:id
DELETE /api/portfolio/v1/i18n/translations/:id
POST /api/portfolio/v1/i18n/auto-translate
GET  /api/portfolio/v1/public/all?lang=fr  (public endpoint with language param)
```

**Tests:**
- All CRUD operations
- Public endpoint with lang param
- Auto-translate endpoint

**Success Criteria:**
- All endpoints functional

---

#### T5.9: Dashboard i18n (Next.js) (4h)
**Dependency:** None (frontend only)
**Files:**
- `frontend/messages/en.json` (100 lines)
- `frontend/messages/fr.json` (100 lines)
- `frontend/messages/es.json` (100 lines)
- `frontend/src/i18n.ts` (60 lines)
- Update `frontend/next.config.js` (add 10 lines)

**Implementation:**
Use `next-intl` package:

```typescript
// i18n.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}.json`)).default
}));

// Component usage
import { useTranslations } from 'next-intl';

export default function PortfolioPage() {
  const t = useTranslations('Portfolio');

  return <h1>{t('title')}</h1>;
}
```

**Tests:**
- Language switching
- Translations load
- Missing key fallback

**Success Criteria:**
- Dashboard fully localized
- Language switcher works

---

#### T5.10: Frontend - Translation Management UI (4h)
**Dependency:** T5.8 ✅
**Files:**
- `frontend/app/(dashboard)/portfolio/translations/page.tsx` (95 lines)
- `frontend/src/components/portfolio/TranslationEditor.tsx` (90 lines)
- `frontend/src/components/portfolio/LanguageSelector.tsx` (65 lines)
- `frontend/src/hooks/queries/useTranslations.ts` (85 lines)

**UI:**
- Table: Original text | Translation | Status (verified/unverified)
- Inline editing (click to edit)
- Auto-translate button per field
- Bulk auto-translate (all fields)
- Language tabs (switch between target languages)

**Tests:**
- Component renders
- Inline editing
- Auto-translate trigger
- Save functionality

**Success Criteria:**
- User can translate content easily
- Auto-translate accessible

---

#### T5.11: External Portfolio - Language Switcher (3h)
**Dependency:** T5.8 ✅
**Files:**
- Update `portefolio/index.html` (add 15 lines)
- `portefolio/js/i18n.js` (90 lines)
- `portefolio/css/language-switcher.css` (40 lines)

**Implementation:**
```javascript
const PortfolioI18n = {
  currentLanguage: localStorage.getItem('language') || 'en',
  availableLanguages: [],

  async init() {
    // Detect browser language
    // Fetch available languages from API
    // Render language switcher
    // Load content in selected language
  },

  async switchLanguage(lang) {
    localStorage.setItem('language', lang);
    await this.loadContent(lang);
    this.updateHtmlLang(lang);
  },

  async loadContent(lang) {
    const data = await PortfolioAPI.getAllData(lang);
    // Re-render all sections with translated data
  },

  renderLanguageSwitcher() {
    // Dropdown or flags
    // Update on click
  }
};
```

**UI:**
- Dropdown in header: 🌐 EN ▼
- Or flag icons: 🇺🇸 🇫🇷 🇪🇸
- Persists selection in localStorage

**Tests:**
- Language switching
- Content updates
- Persistence

**Success Criteria:**
- External portfolio supports multi-language
- Switching smooth (<1s)

---

#### T5.12: RTL Support (Optional) (3h)
**Dependency:** T5.11 ✅
**Files:**
- `portefolio/css/rtl.css` (60 lines)
- Update `portefolio/js/i18n.js` (add 20 lines)

**Implementation:**
```css
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

[dir="rtl"] .nav {
  flex-direction: row-reverse;
}
```

**JavaScript:**
```javascript
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

if (RTL_LANGUAGES.includes(currentLanguage)) {
  document.documentElement.setAttribute('dir', 'rtl');
} else {
  document.documentElement.setAttribute('dir', 'ltr');
}
```

**Tests:**
- RTL languages render correctly
- CSS mirroring works

**Success Criteria:**
- Arabic/Hebrew portfolios readable

---

#### T5.13: Integration Tests (4h)
**Dependency:** All above ✅
**Files:**
- `backend/test/portfolio-i18n.e2e-spec.ts` (220 lines)

**Scenarios:**
1. Create translations → Fetch localized portfolio → Validate
2. Auto-translate → Verify translations → Mark as verified
3. Language switching (external portfolio)
4. Fallback behavior (missing translation)
5. RTL rendering

**Success Criteria:**
- All flows work
- No translation leaks

---

**Feature 5 Risks & Mitigations:**
- **Risk:** Translation API costs → **Mitigation:** Caching, manual translation option
- **Risk:** Poor auto-translation quality → **Mitigation:** Human verification workflow
- **Risk:** RTL layout breaks → **Mitigation:** Dedicated RTL CSS, thorough testing

---

## 📊 Implementation Summary

### Total Task Count by Feature
- **Feature 1 (Static Export):** 15 tasks
- **Feature 2 (Marketplace):** 20 tasks
- **Feature 3 (Analytics):** 18 tasks
- **Feature 4 (SEO):** 16 tasks
- **Feature 5 (i18n):** 18 tasks
- **Total:** 87 tasks

### Effort Breakdown
| Feature | Min Hours | Max Hours | Priority | ROI |
|---------|-----------|-----------|----------|-----|
| Static Export | 18 | 24 | P1 | High |
| Marketplace | 32 | 42 | P2 | Medium |
| Analytics | 22 | 28 | P1 | High |
| SEO | 16 | 22 | P1 | Very High |
| i18n | 24 | 40 | P2 | Medium |
| **Total** | **112** | **156** | - | - |

### Recommended Implementation Order

**Phase P1 (Core Value - 8-10 weeks):**
1. **Week 1-2:** SEO Optimization (highest ROI, simplest)
2. **Week 3-4:** Static Export Generator (user request #1)
3. **Week 5-7:** Advanced Analytics (data-driven decisions)
4. **Week 8-10:** Testing, bug fixes, documentation

**Phase P2 (Advanced Features - 6-8 weeks):**
1. **Week 1-4:** Template Marketplace (community engagement)
2. **Week 5-8:** Multi-language Support (global reach)

### Critical Dependencies

**Cross-Feature:**
1. All features depend on existing Portfolio API (already implemented ✅)
2. Analytics depends on external portfolio deployment (already implemented ✅)
3. SEO benefits from Analytics data (run after Analytics for best results)
4. i18n should be implemented after Marketplace (translate templates too)

**Infrastructure:**
- Image optimization: `sharp` package (Static Export, SEO OG images)
- Translation APIs: Google Cloud or DeepL (i18n)
- Screenshot generation: `puppeteer` (SEO, Marketplace)
- Background jobs: Queue system (Static Export, Auto-translation)

### Key Risks & Global Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| 100-line file limit violation | High | High | Aggressive componentization, use `components/` subdirs |
| Performance degradation (analytics) | Medium | Medium | Queue system, batch processing, caching |
| Translation API costs | Medium | Medium | Caching, manual option, usage limits |
| Security (XSS in marketplace) | Critical | Low | Strict sanitization, CSP headers, manual review |
| OG image generation timeout | Medium | Medium | Background processing, caching, CDN |
| Database growth (analytics) | Medium | High | Data retention policy (90 days), aggregation tables |

### Testing Strategy

**Per Task:**
- Unit tests (95% coverage minimum)
- Integration tests (critical paths)
- E2E tests (complete user flows)

**Per Feature:**
- Feature integration tests
- Performance tests (load testing)
- Security tests (penetration testing for Marketplace)

**Global:**
- Regression tests (existing portfolio features)
- Cross-browser tests (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness tests
- Accessibility tests (WCAG 2.1 AA)

### Success Metrics

**Static Export:**
- Export generation time <30s for typical portfolio
- ZIP file size <10MB
- 0 errors in deployment guides

**Marketplace:**
- 0 XSS vulnerabilities
- Template approval time <24h
- User rating system accuracy >95%

**Analytics:**
- Event tracking accuracy >98%
- Dashboard load time <2s
- Heatmap rendering <3s

**SEO:**
- 100% pass rate on Google Rich Results Test
- Sitemap valid (xml-sitemaps.com)
- Meta tags present on all pages

**i18n:**
- Translation fallback works 100% of time
- Auto-translation accuracy >80% (human verification)
- Language switching <1s

### File Size Compliance

**Strategy:**
- Split large services into multiple files:
  - `service.ts` (core logic, <100 lines)
  - `service.helpers.ts` (utilities, <100 lines)
  - `service.types.ts` (interfaces, <100 lines)
- Component-based frontend:
  - `components/feature/` subdirectories
  - Max 1 responsibility per component
- Test files **EXEMPT** from 100-line limit (can be longer)

**Validation:**
- Pre-commit hook: `find . -name "*.ts" ! -name "*.spec.ts" -exec wc -l {} \; | awk '$1 > 100'`
- CI check: Fail build if non-test files >100 lines

### Documentation Deliverables

**Per Feature:**
- API documentation (endpoints, schemas)
- User guide (dashboard usage)
- Developer guide (integration)

**Global:**
- Updated Portfolio System README
- Migration guides (database changes)
- Deployment guides (new dependencies)

---

## 🚀 Getting Started

### For Implementers

1. **Read this plan thoroughly**
2. **Set up development environment:**
   ```bash
   cd backend
   bun install
   bun drizzle-kit push  # Apply new schemas

   cd ../frontend
   bun install
   ```

3. **Start with P1 features in order:**
   - Begin with SEO (easiest, high ROI)
   - Move to Static Export
   - Finish with Analytics

4. **Follow test-driven development:**
   - Write tests first
   - Implement feature
   - Run tests
   - Only proceed if tests pass

5. **File size enforcement:**
   - Use `wc -l filename.ts` before committing
   - Split into components if >100 lines

6. **Track progress:**
   - Update task status in this document
   - Report blockers immediately
   - Commit frequently with descriptive messages

### For Project Managers

1. **Prioritize P1 features**
2. **Allocate 2-3 developers for parallel work:**
   - Dev 1: SEO + Static Export
   - Dev 2: Analytics
   - Dev 3: Testing + QA

3. **Review checkpoints:**
   - After each feature completion
   - Before moving to next phase
   - Weekly progress meetings

4. **Risk monitoring:**
   - Track API costs (translations, OG images)
   - Monitor database growth
   - Security audits for Marketplace

---

## 📝 Appendix

### Technology Stack

**Backend:**
- NestJS 10+
- Drizzle ORM
- PostgreSQL 15+
- TypeScript 5+

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- Tailwind CSS 3+
- React Query (TanStack Query)

**External:**
- Pure HTML5/CSS3/JavaScript ES6+
- No frameworks

**Dependencies (New):**
- `sharp` - Image optimization
- `jszip` - ZIP generation
- `sanitize-html` - XSS prevention
- `esprima` - JavaScript AST parsing
- `@google-cloud/translate` or `deepl-node` - Translation
- `puppeteer` - Screenshot generation
- `franc` - Language detection
- `next-intl` - Dashboard i18n
- `@monaco-editor/react` - Code editor
- `recharts` - Charts
- `react-map-gl` - Geographic maps
- `h337` (heatmap.js) - Heatmap visualization

### Database Size Estimates

**After Full Implementation:**
- `portfolio_exports`: ~50KB per export, 100 exports/user = 5MB/user
- `portfolio_analytics`: ~200 bytes per event, 10k events/month = 2MB/month
- `portfolio_heatmap_data`: ~100 bytes per click, 5k clicks/month = 500KB/month
- `portfolio_translations`: ~500 bytes per translation, 100 translations = 50KB
- `portfolio_template_submissions`: ~50KB per submission
- **Total growth:** ~10-20MB per active user per year

**Retention Policies:**
- Analytics data: 90 days (then aggregate to monthly summaries)
- Exports: 30 days (then delete from storage)
- Heatmap data: 90 days
- Translations: Permanent

### API Rate Limits

**Public Endpoints:**
- Analytics tracking: 1000 req/min per project
- SEO sitemap: 10 req/min per project

**Authenticated Endpoints:**
- Export generation: 5 req/hour per user
- Auto-translation: 100 req/day per user (cost control)
- OG image generation: 20 req/hour per user

### Security Checklist

- [ ] Template sanitization (XSS prevention)
- [ ] API rate limiting configured
- [ ] Translation API keys encrypted
- [ ] CORS configured for public endpoints
- [ ] CSP headers for iframe sandboxing
- [ ] SQL injection prevention (Drizzle ORM)
- [ ] Auth guards on all private endpoints
- [ ] Input validation on all DTOs
- [ ] Error messages don't leak sensitive data
- [ ] Audit logging for critical operations

---

**Plan Status:** ✅ Ready for Implementation
**Next Step:** Begin T4.1 (SEO Database Schema)
**Estimated Completion:** 14-20 weeks (both phases)
