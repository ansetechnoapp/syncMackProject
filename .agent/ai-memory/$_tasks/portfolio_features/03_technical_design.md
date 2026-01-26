# Portfolio Features - Technical Design

## Architecture Principles
- File size limit: ≤100 lines (split into components/ if needed)
- Single responsibility per file
- Modular, composable components
- Type-safe APIs (TypeScript strict mode)

---

## Feature 1: Preview des Templates

### Component Structure
```
frontend/src/components/portfolio/templates/
  TemplatePreviewModal.tsx (≤100 lines)
  components/
    PreviewFrame.tsx (≤80 lines)
    TemplateActions.tsx (≤60 lines)
```

### API Endpoints
**Existing**: GET `/portfolio/v1/public/all` (fetches portfolio data)
**No new endpoints needed**

### Data Flow
1. User clicks "Preview" button
2. Modal opens with template code
3. Fetch portfolio data via existing API
4. Render template HTML/CSS with data injection
5. User clicks "Use this template" → calls existing `POST /portfolio/v1/templates/select`

---

## Feature 2: Gestion des Categories

### Backend Structure
```
backend/src/portfolio-categories/
  portfolio-categories.module.ts (≤80 lines)
  portfolio-categories.service.ts (≤95 lines)
  portfolio-categories.controller.ts (≤100 lines)
  dto/
    create-category.dto.ts (≤40 lines)
    update-category.dto.ts (≤30 lines)
  tests/
    categories.service.spec.ts
    categories.integration.spec.ts
```

### Frontend Structure
```
frontend/app/(dashboard)/portfolio/categories/
  page.tsx (≤95 lines)
frontend/src/components/portfolio/categories/
  CategoryList.tsx (≤80 lines)
  CategoryForm.tsx (≤85 lines)
  CategoryDeleteDialog.tsx (≤60 lines)
  components/
    CategoryCard.tsx (≤70 lines)
frontend/src/hooks/queries/
  usePortfolioCategories.ts (≤100 lines)
```

### API Endpoints (NEW)
```typescript
GET    /api/portfolio/v1/categories           // List all categories
POST   /api/portfolio/v1/categories           // Create category
PATCH  /api/portfolio/v1/categories/:id       // Update category
DELETE /api/portfolio/v1/categories/:id       // Delete category
GET    /api/portfolio/v1/categories/:id/count // Get project count
```

### Database
**Existing Tables**: portfolioCategories, portfolioProjectCategories
**No schema changes needed**

---

## Feature 3: Customisation de Templates

### Backend Structure
```
backend/src/portfolio-templates/
  dto/update-template-config.dto.ts (≤60 lines - already exists)
```

### Frontend Structure
```
frontend/src/components/portfolio/templates/
  TemplateCustomizer.tsx (≤100 lines)
  components/
    ColorPicker.tsx (≤75 lines)
    FontSelector.tsx (≤80 lines)
    LayoutControls.tsx (≤70 lines)
    ImageUploader.tsx (≤85 lines)
    CustomizationPreview.tsx (≤90 lines)
frontend/src/hooks/
  useTemplateCustomization.ts (≤95 lines)
frontend/src/lib/utils/
  google-fonts.ts (≤60 lines)
  color-utils.ts (≤50 lines)
```

### API Endpoints
**Existing**: PATCH `/portfolio/v1/templates/config` (updates customConfig)
**New**: POST `/portfolio/v1/templates/upload-logo` (image upload)

### Customization Schema (JSON in customConfig)
```typescript
{
  colors: {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    accent: "#ec4899",
    background: "#ffffff"
  },
  fonts: {
    heading: "Inter",
    body: "Open Sans"
  },
  layout: {
    spacing: "normal", // compact | normal | spacious
    maxWidth: "1200px"
  },
  logo: "/uploads/logos/user_123_logo.png"
}
```

---

## Feature 4: Versioning des Templates

### Backend Structure
```
backend/src/portfolio-templates/
  (extend existing service)
  portfolio-templates.service.ts (add methods)
```

### Frontend Structure
```
frontend/app/(dashboard)/admin/templates/
  [id]/versions/page.tsx (≤95 lines)
frontend/src/components/admin/templates/
  VersionList.tsx (≤85 lines)
  VersionCreateDialog.tsx (≤75 lines)
  VersionRollbackDialog.tsx (≤70 lines)
  components/
    VersionCard.tsx (≤65 lines)
```

### API Endpoints
**Existing**:
- GET `/portfolio/v1/templates/admin/:id/versions`
- POST `/portfolio/v1/templates/admin/:id/versions`
**No new endpoints needed**

### Notification System
```typescript
// Create notification when template version updates
backend/src/notifications/
  notifications.service.ts (add method)
```

---

## Feature 5: Analytics du Portfolio

### Backend Structure
```
backend/src/portfolio-analytics/
  portfolio-analytics.module.ts (≤75 lines)
  portfolio-analytics.service.ts (≤100 lines)
  portfolio-analytics.controller.ts (≤95 lines)
  middleware/
    analytics-tracker.middleware.ts (≤85 lines)
  dto/
    analytics-query.dto.ts (≤50 lines)
  tests/
    analytics.service.spec.ts
```

### Frontend Structure
```
frontend/app/(dashboard)/portfolio/analytics/
  page.tsx (≤95 lines)
frontend/src/components/portfolio/analytics/
  AnalyticsDashboard.tsx (≤90 lines)
  components/
    ViewsChart.tsx (≤85 lines)
    TopProjectsTable.tsx (≤75 lines)
    TrafficSourcesPie.tsx (≤80 lines)
    ExportButton.tsx (≤60 lines)
frontend/src/hooks/queries/
  usePortfolioAnalytics.ts (≤90 lines)
```

### Database Schema (NEW)
```typescript
// backend/src/database/portfolio-analytics.schema.ts
export const portfolioAnalytics = pgTable('portfolio_analytics', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  portfolioProjectId: integer('portfolio_project_id')
    .references(() => portfolioProjects.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(), // 'view', 'project_click'
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### API Endpoints (NEW)
```typescript
GET    /api/portfolio/v1/analytics          // Get analytics summary
GET    /api/portfolio/v1/analytics/views    // Views over time
GET    /api/portfolio/v1/analytics/projects // Top projects
GET    /api/portfolio/v1/analytics/sources  // Traffic sources
POST   /api/portfolio/v1/analytics/export   // Export CSV
// Tracking (middleware on public routes)
```

---

## File Size Compliance

### Enforcement Strategy
1. Pre-commit hook: `find . -name "*.ts" -o -name "*.tsx" | xargs wc -l`
2. CI check: fails if any source file >100 lines
3. Exception: test files (*.spec.ts, *.spec.tsx)

### Splitting Guidelines
- If component >100 lines → split into sub-components in components/
- If service >100 lines → extract utilities/helpers
- Use composition over monolithic files

---

## Dependencies Matrix

| Feature | Backend Deps | Frontend Deps | External Deps |
|---------|--------------|---------------|---------------|
| F1      | None         | React Query   | None          |
| F2      | Drizzle ORM  | React Query   | None          |
| F3      | Multer       | React Query   | Google Fonts  |
| F4      | None         | React Query   | None          |
| F5      | Drizzle ORM  | React Query, Recharts | None |

---

## Critical Paths

### Highest Priority
1. Feature 1 (Preview) → enables user testing of templates
2. Feature 3 (Customization) → depends on preview modal

### Can be Parallel
- Feature 2 (Categories) - independent
- Feature 4 (Versioning) - admin only, independent
- Feature 5 (Analytics) - independent, low priority
