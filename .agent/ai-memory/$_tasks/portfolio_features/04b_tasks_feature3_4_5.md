# Tasks Breakdown - Feature 3, 4 & 5

## FEATURE 3: Customisation de Templates

### T3.0 [Customization] - Create Google Fonts Utility
- **Dependency**: None
- **Description**: Utility to fetch/apply Google Fonts, generate font URLs
- **Test to be performed**: Utility generates correct Google Fonts URL
- **Test script**: `frontend/src/lib/utils/google-fonts.spec.ts`
- **Success criteria**: URL generation works for 10+ fonts, loads correctly
- **Files**:
  - `frontend/src/lib/utils/google-fonts.ts` (≤60 lines)
- **Effort**: S

### T3.1 [Customization] - Create Color Utilities
- **Dependency**: None
- **Description**: Utilities for color validation, contrast checking, hex/rgb conversion
- **Test to be performed**: Color validation rejects invalid colors, conversions work
- **Test script**: `frontend/src/lib/utils/color-utils.spec.ts`
- **Success criteria**: All color formats supported (hex, rgb, hsl)
- **Files**:
  - `frontend/src/lib/utils/color-utils.ts` (≤50 lines)
- **Effort**: S

### T3.2 [Customization] - Create ColorPicker Component
- **Dependency**: T3.1 ✅
- **Description**: Color picker input with preset colors and custom input
- **Test to be performed**: Color selection updates parent state, validation works
- **Test script**: `frontend/src/components/portfolio/templates/components/ColorPicker.spec.tsx`
- **Success criteria**: Picker accessible, real-time preview updates
- **Files**:
  - `frontend/src/components/portfolio/templates/components/ColorPicker.tsx` (≤75 lines)
- **Effort**: M

### T3.3 [Customization] - Create FontSelector Component
- **Dependency**: T3.0 ✅
- **Description**: Dropdown selector for Google Fonts with preview
- **Test to be performed**: Font selection loads font, preview shows correctly
- **Test script**: `frontend/src/components/portfolio/templates/components/FontSelector.spec.tsx`
- **Success criteria**: Font loads <1s, preview accurate, 10+ fonts available
- **Files**:
  - `frontend/src/components/portfolio/templates/components/FontSelector.tsx` (≤80 lines)
- **Effort**: M

### T3.4 [Customization] - Create LayoutControls Component
- **Dependency**: None
- **Description**: Controls for spacing and container width selection
- **Test to be performed**: Layout changes apply to preview immediately
- **Test script**: `frontend/src/components/portfolio/templates/components/LayoutControls.spec.tsx`
- **Success criteria**: Controls update state, preview reflects changes <100ms
- **Files**:
  - `frontend/src/components/portfolio/templates/components/LayoutControls.tsx` (≤70 lines)
- **Effort**: S

### T3.5 [Customization] - Create ImageUploader Component
- **Dependency**: None
- **Description**: Logo/avatar upload with validation (size, format), preview
- **Test to be performed**: Upload validates file, shows preview, handles errors
- **Test script**: `frontend/src/components/portfolio/templates/components/ImageUploader.spec.tsx`
- **Success criteria**: Rejects files >2MB, accepts JPG/PNG/WebP only
- **Files**:
  - `frontend/src/components/portfolio/templates/components/ImageUploader.tsx` (≤85 lines)
- **Effort**: M

### T3.6 [Customization] - Create Image Upload Backend Endpoint
- **Dependency**: T3.5 ✅
- **Description**: POST endpoint to upload logo with Multer, save to uploads/
- **Test to be performed**: Upload saves file, returns URL, validates size/type
- **Test script**: `backend/src/portfolio-templates/upload-logo.integration.spec.ts`
- **Success criteria**: Upload success rate >95%, file saved correctly
- **Files**:
  - `backend/src/portfolio-templates/portfolio-templates.controller.ts` (add endpoint)
- **Effort**: M

### T3.7 [Customization] - Create CustomizationPreview Component
- **Dependency**: T1.0 ✅
- **Description**: Live preview applying customization config to template
- **Test to be performed**: Preview updates in real-time (<100ms latency)
- **Test script**: `frontend/src/components/portfolio/templates/components/CustomizationPreview.spec.tsx`
- **Success criteria**: All customizations render correctly, responsive
- **Files**:
  - `frontend/src/components/portfolio/templates/components/CustomizationPreview.tsx` (≤90 lines)
- **Effort**: M

### T3.8 [Customization] - Create useTemplateCustomization Hook
- **Dependency**: None
- **Description**: Hook managing customization state, debounced save
- **Test to be performed**: State updates trigger save after 500ms debounce
- **Test script**: `frontend/src/hooks/useTemplateCustomization.spec.ts`
- **Success criteria**: Debounce works, API called only after changes stop
- **Files**:
  - `frontend/src/hooks/useTemplateCustomization.ts` (≤95 lines)
- **Effort**: M

### T3.9 [Customization] - Create TemplateCustomizer Component
- **Dependency**: T3.2 ✅, T3.3 ✅, T3.4 ✅, T3.5 ✅, T3.7 ✅, T3.8 ✅
- **Description**: Main customization panel composing all controls
- **Test to be performed**: Panel shows all controls, save/reset buttons work
- **Test script**: `frontend/src/components/portfolio/templates/TemplateCustomizer.spec.tsx`
- **Success criteria**: Full customization flow works, reset restores defaults
- **Files**:
  - `frontend/src/components/portfolio/templates/TemplateCustomizer.tsx` (≤100 lines)
- **Effort**: M

### T3.10 [Customization] - Integrate Customizer in Templates Page
- **Dependency**: T3.9 ✅
- **Description**: Add "Customize" button, show customizer after template selection
- **Test to be performed**: Customizer opens, changes persist, back button works
- **Test script**: `frontend/app/(dashboard)/portfolio/templates/customization.spec.tsx`
- **Success criteria**: Navigation flows correctly, state persists
- **Files**:
  - `frontend/app/(dashboard)/portfolio/templates/page.tsx` (modify)
- **Effort**: S

---

## FEATURE 4: Versioning des Templates

### T4.0 [Versioning] - Add Version Methods to Service
- **Dependency**: None
- **Description**: Add createVersion, listVersions, rollbackVersion methods
- **Test to be performed**: Version snapshot captures full template state
- **Test script**: `backend/src/portfolio-templates/versioning.service.spec.ts`
- **Success criteria**: Version created, rollback restores exact state
- **Files**:
  - `backend/src/portfolio-templates/portfolio-templates.service.ts` (modify)
- **Effort**: M

### T4.1 [Versioning] - Create VersionCard Component
- **Dependency**: None
- **Description**: Display version info (number, changelog, date, actions)
- **Test to be performed**: Card shows version details, rollback button triggers callback
- **Test script**: `frontend/src/components/admin/templates/components/VersionCard.spec.tsx`
- **Success criteria**: Card renders correctly, accessible
- **Files**:
  - `frontend/src/components/admin/templates/components/VersionCard.tsx` (≤65 lines)
- **Effort**: S

### T4.2 [Versioning] - Create VersionCreateDialog Component
- **Dependency**: None
- **Description**: Dialog to create version with changelog input
- **Test to be performed**: Dialog validates changelog required, creates version
- **Test script**: `frontend/src/components/admin/templates/VersionCreateDialog.spec.tsx`
- **Success criteria**: Validation works, version created successfully
- **Files**:
  - `frontend/src/components/admin/templates/VersionCreateDialog.tsx` (≤75 lines)
- **Effort**: S

### T4.3 [Versioning] - Create VersionRollbackDialog Component
- **Dependency**: None
- **Description**: Confirmation dialog for rollback with warning
- **Test to be performed**: Dialog shows warning, rollback only on confirm
- **Test script**: `frontend/src/components/admin/templates/VersionRollbackDialog.spec.tsx`
- **Success criteria**: Rollback prevented on cancel, succeeds on confirm
- **Files**:
  - `frontend/src/components/admin/templates/VersionRollbackDialog.tsx` (≤70 lines)
- **Effort**: S

### T4.4 [Versioning] - Create VersionList Component
- **Dependency**: T4.1 ✅, T4.3 ✅
- **Description**: List all versions with VersionCard composition
- **Test to be performed**: List shows versions descending, rollback works
- **Test script**: `frontend/src/components/admin/templates/VersionList.spec.tsx`
- **Success criteria**: List renders, sorting correct, actions work
- **Files**:
  - `frontend/src/components/admin/templates/VersionList.tsx` (≤85 lines)
- **Effort**: M

### T4.5 [Versioning] - Create Template Versions Admin Page
- **Dependency**: T4.2 ✅, T4.4 ✅
- **Description**: Admin page for version management
- **Test to be performed**: Page accessible to admins only, full CRUD works
- **Test script**: `frontend/app/(dashboard)/admin/templates/[id]/versions/page.spec.tsx`
- **Success criteria**: Auth guard works, UI functional
- **Files**:
  - `frontend/app/(dashboard)/admin/templates/[id]/versions/page.tsx` (≤95 lines)
- **Effort**: M

---

## FEATURE 5: Analytics du Portfolio

### T5.0 [Analytics] - Create Database Schema
- **Dependency**: None
- **Description**: Create portfolioAnalytics table schema file
- **Test to be performed**: Schema compiles, migration runs successfully
- **Test script**: `backend/scripts/verify-analytics-schema.ts`
- **Success criteria**: Table created, indexes applied, foreign keys correct
- **Files**:
  - `backend/src/database/portfolio-analytics.schema.ts` (≤60 lines)
- **Effort**: S

### T5.1 [Analytics] - Run Analytics Migration
- **Dependency**: T5.0 ✅
- **Description**: Generate and run migration for analytics table
- **Test to be performed**: Migration applies, rollback works
- **Test script**: Manual verification with `bun run db:migrate`
- **Success criteria**: Table exists in database
- **Files**:
  - `backend/drizzle/migrations/XXXX_create_portfolio_analytics.sql`
- **Effort**: S

### T5.2 [Analytics] - Create Analytics Tracking Middleware
- **Dependency**: T5.1 ✅
- **Description**: Middleware to log portfolio view events on public routes
- **Test to be performed**: Middleware logs events, overhead <10ms
- **Test script**: `backend/src/portfolio-analytics/middleware/analytics-tracker.spec.ts`
- **Success criteria**: Events logged, performance acceptable
- **Files**:
  - `backend/src/portfolio-analytics/middleware/analytics-tracker.middleware.ts` (≤85 lines)
- **Effort**: M

### T5.3 [Analytics] - Create Analytics DTOs
- **Dependency**: None
- **Description**: Create AnalyticsQueryDto for date range, filters
- **Test to be performed**: DTO validation works for date ranges
- **Test script**: `backend/src/portfolio-analytics/dto/analytics.dto.spec.ts`
- **Success criteria**: Validation rejects invalid dates, defaults to 30 days
- **Files**:
  - `backend/src/portfolio-analytics/dto/analytics-query.dto.ts` (≤50 lines)
- **Effort**: S

### T5.4 [Analytics] - Create Analytics Service
- **Dependency**: T5.3 ✅
- **Description**: Service with methods: getSummary, getViews, getTopProjects, getSources
- **Test to be performed**: All query methods return correct aggregated data
- **Test script**: `backend/src/portfolio-analytics/portfolio-analytics.service.spec.ts`
- **Success criteria**: Queries performant (<500ms), data accurate
- **Files**:
  - `backend/src/portfolio-analytics/portfolio-analytics.service.ts` (≤100 lines)
- **Effort**: L

### T5.5 [Analytics] - Create Analytics Controller
- **Dependency**: T5.4 ✅
- **Description**: REST endpoints for analytics data and CSV export
- **Test to be performed**: All endpoints return correct status and data
- **Test script**: `backend/src/portfolio-analytics/portfolio-analytics.controller.spec.ts`
- **Success criteria**: Routes work, auth applied, CSV export functional
- **Files**:
  - `backend/src/portfolio-analytics/portfolio-analytics.controller.ts` (≤95 lines)
- **Effort**: M

### T5.6 [Analytics] - Create Analytics Module
- **Dependency**: T5.2 ✅, T5.5 ✅
- **Description**: Wire up module with middleware registration
- **Test to be performed**: Module loads, middleware applies to public routes
- **Test script**: `backend/src/portfolio-analytics/portfolio-analytics.module.spec.ts`
- **Success criteria**: Module integrates, tracking works on public endpoints
- **Files**:
  - `backend/src/portfolio-analytics/portfolio-analytics.module.ts` (≤75 lines)
- **Effort**: S

### T5.7 [Analytics] - Create ViewsChart Component
- **Dependency**: None
- **Description**: Line chart showing views over time using Recharts
- **Test to be performed**: Chart renders with mock data, responsive
- **Test script**: `frontend/src/components/portfolio/analytics/components/ViewsChart.spec.tsx`
- **Success criteria**: Chart displays correctly, handles empty data
- **Files**:
  - `frontend/src/components/portfolio/analytics/components/ViewsChart.tsx` (≤85 lines)
- **Effort**: M

### T5.8 [Analytics] - Create TopProjectsTable Component
- **Dependency**: None
- **Description**: Table showing top 5 projects by view count
- **Test to be performed**: Table sorts by views, shows correct data
- **Test script**: `frontend/src/components/portfolio/analytics/components/TopProjectsTable.spec.tsx`
- **Success criteria**: Sorting works, links to projects functional
- **Files**:
  - `frontend/src/components/portfolio/analytics/components/TopProjectsTable.tsx` (≤75 lines)
- **Effort**: S

### T5.9 [Analytics] - Create TrafficSourcesPie Component
- **Dependency**: None
- **Description**: Pie chart showing traffic source distribution
- **Test to be performed**: Chart renders with percentages, legend correct
- **Test script**: `frontend/src/components/portfolio/analytics/components/TrafficSourcesPie.spec.tsx`
- **Success criteria**: Chart shows sources, percentages sum to 100%
- **Files**:
  - `frontend/src/components/portfolio/analytics/components/TrafficSourcesPie.tsx` (≤80 lines)
- **Effort**: M

### T5.10 [Analytics] - Create ExportButton Component
- **Dependency**: None
- **Description**: Button to export analytics as CSV
- **Test to be performed**: Export downloads CSV file with correct data
- **Test script**: `frontend/src/components/portfolio/analytics/components/ExportButton.spec.tsx`
- **Success criteria**: CSV file downloads, contains all data
- **Files**:
  - `frontend/src/components/portfolio/analytics/components/ExportButton.tsx` (≤60 lines)
- **Effort**: S

### T5.11 [Analytics] - Create usePortfolioAnalytics Hook
- **Dependency**: None
- **Description**: React Query hook for fetching analytics data
- **Test to be performed**: Hook fetches data, caching works, refetch on date change
- **Test script**: `frontend/src/hooks/queries/usePortfolioAnalytics.spec.ts`
- **Success criteria**: Hook works, cache invalidation correct
- **Files**:
  - `frontend/src/hooks/queries/usePortfolioAnalytics.ts` (≤90 lines)
- **Effort**: M

### T5.12 [Analytics] - Create AnalyticsDashboard Component
- **Dependency**: T5.7 ✅, T5.8 ✅, T5.9 ✅, T5.10 ✅
- **Description**: Dashboard composing all analytics components
- **Test to be performed**: Dashboard renders all charts, date filter works
- **Test script**: `frontend/src/components/portfolio/analytics/AnalyticsDashboard.spec.tsx`
- **Success criteria**: All components render, date range filtering functional
- **Files**:
  - `frontend/src/components/portfolio/analytics/AnalyticsDashboard.tsx` (≤90 lines)
- **Effort**: M

### T5.13 [Analytics] - Create Analytics Page
- **Dependency**: T5.11 ✅, T5.12 ✅
- **Description**: Main analytics page with breadcrumbs and dashboard
- **Test to be performed**: Page loads, data fetches, dashboard interactive
- **Test script**: `frontend/app/(dashboard)/portfolio/analytics/page.spec.tsx`
- **Success criteria**: Page loads <2s, all features work
- **Files**:
  - `frontend/app/(dashboard)/portfolio/analytics/page.tsx` (≤95 lines)
- **Effort**: M
