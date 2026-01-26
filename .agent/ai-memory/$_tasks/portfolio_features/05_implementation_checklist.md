# Portfolio Features - Implementation Checklist

## Pre-Implementation Setup
- [ ] Read all plan documents (01-04)
- [ ] Verify development environment ready (bun installed, DB running)
- [ ] Create feature branch: `git checkout -b feature/portfolio-enhancements`
- [ ] Verify existing tests pass: `cd backend && bun test && cd ../frontend && bun test`

---

## FEATURE 1: Preview des Templates (5 tasks)

### T1.0 - PreviewFrame Component
- [ ] Create `frontend/src/components/portfolio/templates/components/PreviewFrame.tsx`
- [ ] Write test: `PreviewFrame.spec.tsx`
- [ ] Run test: `bun test PreviewFrame.spec.tsx`
- [ ] Verify file size: `wc -l PreviewFrame.tsx` (must be ≤80 lines)
- [ ] Test passes with >80% coverage

### T1.1 - TemplateActions Component
- [ ] Create `frontend/src/components/portfolio/templates/components/TemplateActions.tsx`
- [ ] Write test: `TemplateActions.spec.tsx`
- [ ] Run test: `bun test TemplateActions.spec.tsx`
- [ ] Verify file size: ≤60 lines
- [ ] Test passes, accessibility verified

### T1.2 - TemplatePreviewModal Component
- [ ] Create `frontend/src/components/portfolio/templates/TemplatePreviewModal.tsx`
- [ ] Write test: `TemplatePreviewModal.spec.tsx`
- [ ] Run test: `bun test TemplatePreviewModal.spec.tsx`
- [ ] Verify file size: ≤100 lines
- [ ] Modal behavior correct (ESC, backdrop click)

### T1.3 - Integrate Preview Button
- [ ] Modify `frontend/app/(dashboard)/portfolio/templates/page.tsx`
- [ ] Write test: `page.spec.tsx` (add preview button test)
- [ ] Run test: `bun test page.spec.tsx`
- [ ] Verify modal opens <500ms
- [ ] Preview button visible on all cards

### T1.4 - Template Activation from Modal
- [ ] Modify `TemplatePreviewModal.tsx` (add activation)
- [ ] Write integration test: `TemplatePreviewModal.integration.spec.tsx`
- [ ] Run test: `bun test TemplatePreviewModal.integration.spec.tsx`
- [ ] Verify activation success rate >99%
- [ ] Toast notification shows

**Feature 1 Complete**: Run full test suite: `cd frontend && bun test --coverage`

---

## FEATURE 2: Gestion des Categories (14 tasks)

### T2.0 - Database Verification
- [ ] Create `backend/scripts/verify-categories-schema.ts`
- [ ] Run: `bun backend/scripts/verify-categories-schema.ts`
- [ ] Verify tables exist: portfolioCategories, portfolioProjectCategories
- [ ] Verify foreign keys and indexes

### T2.1 - Backend DTOs
- [ ] Create `backend/src/portfolio-categories/dto/create-category.dto.ts` (≤40 lines)
- [ ] Create `backend/src/portfolio-categories/dto/update-category.dto.ts` (≤30 lines)
- [ ] Create `backend/src/portfolio-categories/dto/index.ts` (≤10 lines)
- [ ] Write test: `category.dto.spec.ts`
- [ ] Run test: `bun test category.dto.spec.ts`
- [ ] All validation rules work

### T2.2 - Categories Service
- [ ] Create `backend/src/portfolio-categories/portfolio-categories.service.ts` (≤95 lines)
- [ ] Write test: `portfolio-categories.service.spec.ts`
- [ ] Run test: `bun test portfolio-categories.service.spec.ts`
- [ ] 100% method coverage
- [ ] Edge cases handled

### T2.3 - Categories Controller
- [ ] Create `backend/src/portfolio-categories/portfolio-categories.controller.ts` (≤100 lines)
- [ ] Write test: `portfolio-categories.controller.spec.ts`
- [ ] Run test: `bun test portfolio-categories.controller.spec.ts`
- [ ] All endpoints return correct status codes
- [ ] Auth guards applied

### T2.4 - Categories Module
- [ ] Create `backend/src/portfolio-categories/portfolio-categories.module.ts` (≤80 lines)
- [ ] Write test: `portfolio-categories.module.spec.ts`
- [ ] Import module in AppModule
- [ ] Run test: `bun test portfolio-categories.module.spec.ts`
- [ ] Module loads, routes registered

### T2.5 - Integration Tests
- [ ] Create `backend/src/portfolio-categories/categories.integration.spec.ts`
- [ ] Run test: `bun test categories.integration.spec.ts`
- [ ] Full CRUD cycle passes
- [ ] DB rollback works (no pollution)

### T2.6 - React Query Hook
- [ ] Create `frontend/src/hooks/queries/usePortfolioCategories.ts` (≤100 lines)
- [ ] Write test: `usePortfolioCategories.spec.ts`
- [ ] Run test: `bun test usePortfolioCategories.spec.ts`
- [ ] Cache invalidation works
- [ ] Optimistic updates correct

### T2.7 - CategoryCard Component
- [ ] Create `frontend/src/components/portfolio/categories/components/CategoryCard.tsx` (≤70 lines)
- [ ] Write test: `CategoryCard.spec.tsx`
- [ ] Run test: `bun test CategoryCard.spec.tsx`
- [ ] Component accessible
- [ ] Actions trigger callbacks

### T2.8 - CategoryForm Component
- [ ] Create `frontend/src/components/portfolio/categories/CategoryForm.tsx` (≤85 lines)
- [ ] Write test: `CategoryForm.spec.tsx`
- [ ] Run test: `bun test CategoryForm.spec.tsx`
- [ ] Validation works
- [ ] Slug auto-generation functional

### T2.9 - CategoryDeleteDialog Component
- [ ] Create `frontend/src/components/portfolio/categories/CategoryDeleteDialog.tsx` (≤60 lines)
- [ ] Write test: `CategoryDeleteDialog.spec.tsx`
- [ ] Run test: `bun test CategoryDeleteDialog.spec.tsx`
- [ ] Warning shows if projects exist
- [ ] Delete confirms/cancels correctly

### T2.10 - CategoryList Component
- [ ] Create `frontend/src/components/portfolio/categories/CategoryList.tsx` (≤80 lines)
- [ ] Write test: `CategoryList.spec.tsx`
- [ ] Run test: `bun test CategoryList.spec.tsx`
- [ ] Search/filter works
- [ ] Performance <100ms for 50 items

### T2.11 - Categories Page
- [ ] Create `frontend/app/(dashboard)/portfolio/categories/page.tsx` (≤95 lines)
- [ ] Write test: `page.spec.tsx`
- [ ] Run test: `bun test page.spec.tsx`
- [ ] Full CRUD functionality
- [ ] Breadcrumbs and navigation work

### T2.12 - Add Filter to Projects Page
- [ ] Modify `frontend/app/(dashboard)/portfolio/projects/page.tsx`
- [ ] Add category filter dropdown
- [ ] Write test: `page.spec.tsx` (add filter test)
- [ ] Run test: `bun test page.spec.tsx`
- [ ] Filter updates project list

### T2.13 - Multi-Select in Project Form
- [ ] Create/modify `frontend/src/components/portfolio/projects/ProjectForm.tsx`
- [ ] Add multi-select for categories
- [ ] Write test: `ProjectForm.spec.tsx`
- [ ] Run test: `bun test ProjectForm.spec.tsx`
- [ ] Categories persist to junction table

**Feature 2 Complete**: Run full test suite: `bun test --coverage`

---

## FEATURE 3: Customisation de Templates (11 tasks)

### T3.0-T3.1 - Utilities
- [ ] Create `frontend/src/lib/utils/google-fonts.ts` (≤60 lines)
- [ ] Create `frontend/src/lib/utils/color-utils.ts` (≤50 lines)
- [ ] Write tests for both
- [ ] Run tests: `bun test google-fonts.spec.ts color-utils.spec.ts`
- [ ] Verify file sizes

### T3.2-T3.5 - Control Components
- [ ] Create ColorPicker.tsx (≤75 lines)
- [ ] Create FontSelector.tsx (≤80 lines)
- [ ] Create LayoutControls.tsx (≤70 lines)
- [ ] Create ImageUploader.tsx (≤85 lines)
- [ ] Write tests for each
- [ ] Run tests: `bun test`
- [ ] Verify all file sizes

### T3.6 - Image Upload Backend
- [ ] Modify `portfolio-templates.controller.ts` (add upload endpoint)
- [ ] Write integration test: `upload-logo.integration.spec.ts`
- [ ] Run test: `bun test upload-logo.integration.spec.ts`
- [ ] Upload success rate >95%

### T3.7 - CustomizationPreview Component
- [ ] Create `CustomizationPreview.tsx` (≤90 lines)
- [ ] Write test: `CustomizationPreview.spec.tsx`
- [ ] Run test: `bun test CustomizationPreview.spec.tsx`
- [ ] Preview updates <100ms latency

### T3.8 - useTemplateCustomization Hook
- [ ] Create `useTemplateCustomization.ts` (≤95 lines)
- [ ] Write test: `useTemplateCustomization.spec.ts`
- [ ] Run test: `bun test useTemplateCustomization.spec.ts`
- [ ] Debounce works (500ms)

### T3.9 - TemplateCustomizer Component
- [ ] Create `TemplateCustomizer.tsx` (≤100 lines)
- [ ] Write test: `TemplateCustomizer.spec.tsx`
- [ ] Run test: `bun test TemplateCustomizer.spec.tsx`
- [ ] Full customization flow works
- [ ] Reset button functional

### T3.10 - Integrate Customizer
- [ ] Modify templates page.tsx (add customize button)
- [ ] Write test: `customization.spec.tsx`
- [ ] Run test: `bun test customization.spec.tsx`
- [ ] Navigation flows correctly

**Feature 3 Complete**: Run full test suite: `bun test --coverage`

---

## FEATURE 4: Versioning des Templates (6 tasks)

### T4.0 - Version Methods
- [ ] Modify `portfolio-templates.service.ts` (add version methods)
- [ ] Write test: `versioning.service.spec.ts`
- [ ] Run test: `bun test versioning.service.spec.ts`
- [ ] Version snapshot captures full state
- [ ] Rollback restores exactly

### T4.1-T4.3 - Version Components
- [ ] Create VersionCard.tsx (≤65 lines)
- [ ] Create VersionCreateDialog.tsx (≤75 lines)
- [ ] Create VersionRollbackDialog.tsx (≤70 lines)
- [ ] Write tests for each
- [ ] Run tests: `bun test`

### T4.4 - VersionList Component
- [ ] Create `VersionList.tsx` (≤85 lines)
- [ ] Write test: `VersionList.spec.tsx`
- [ ] Run test: `bun test VersionList.spec.tsx`
- [ ] Sorting correct (descending)

### T4.5 - Template Versions Admin Page
- [ ] Create `frontend/app/(dashboard)/admin/templates/[id]/versions/page.tsx` (≤95 lines)
- [ ] Write test: `page.spec.tsx`
- [ ] Run test: `bun test page.spec.tsx`
- [ ] Auth guard works (admin only)

**Feature 4 Complete**: Run full test suite: `bun test --coverage`

---

## FEATURE 5: Analytics du Portfolio (14 tasks)

### T5.0-T5.1 - Database Setup
- [ ] Create `backend/src/database/portfolio-analytics.schema.ts` (≤60 lines)
- [ ] Create verification script: `verify-analytics-schema.ts`
- [ ] Run migration: `bun run db:migrate`
- [ ] Verify table created

### T5.2 - Analytics Middleware
- [ ] Create `analytics-tracker.middleware.ts` (≤85 lines)
- [ ] Write test: `analytics-tracker.spec.ts`
- [ ] Run test: `bun test analytics-tracker.spec.ts`
- [ ] Overhead <10ms verified

### T5.3-T5.6 - Backend Implementation
- [ ] Create analytics DTOs (≤50 lines)
- [ ] Create analytics service (≤100 lines)
- [ ] Create analytics controller (≤95 lines)
- [ ] Create analytics module (≤75 lines)
- [ ] Write tests for each
- [ ] Run tests: `bun test`
- [ ] All queries <500ms

### T5.7-T5.10 - Chart Components
- [ ] Create ViewsChart.tsx (≤85 lines)
- [ ] Create TopProjectsTable.tsx (≤75 lines)
- [ ] Create TrafficSourcesPie.tsx (≤80 lines)
- [ ] Create ExportButton.tsx (≤60 lines)
- [ ] Write tests for each
- [ ] Run tests: `bun test`

### T5.11 - usePortfolioAnalytics Hook
- [ ] Create `usePortfolioAnalytics.ts` (≤90 lines)
- [ ] Write test: `usePortfolioAnalytics.spec.ts`
- [ ] Run test: `bun test usePortfolioAnalytics.spec.ts`
- [ ] Cache invalidation works

### T5.12 - AnalyticsDashboard Component
- [ ] Create `AnalyticsDashboard.tsx` (≤90 lines)
- [ ] Write test: `AnalyticsDashboard.spec.tsx`
- [ ] Run test: `bun test AnalyticsDashboard.spec.tsx`
- [ ] All components render
- [ ] Date filter functional

### T5.13 - Analytics Page
- [ ] Create `frontend/app/(dashboard)/portfolio/analytics/page.tsx` (≤95 lines)
- [ ] Write test: `page.spec.tsx`
- [ ] Run test: `bun test page.spec.tsx`
- [ ] Page loads <2s
- [ ] All features work

**Feature 5 Complete**: Run full test suite: `bun test --coverage`

---

## Post-Implementation

### Final Verification
- [ ] Run all backend tests: `cd backend && bun test --coverage`
- [ ] Run all frontend tests: `cd frontend && bun test --coverage`
- [ ] Coverage >80% for new code
- [ ] All file sizes verified (≤100 lines, except tests)
- [ ] Run file size check: `find . -name "*.ts" -o -name "*.tsx" | grep -v spec | xargs wc -l`
- [ ] Lint pass: `bun run lint`
- [ ] Type check pass: `bun run type-check`

### Manual Testing
- [ ] Test Feature 1: Preview templates from templates page
- [ ] Test Feature 2: Create/edit/delete categories, filter projects
- [ ] Test Feature 3: Customize template colors/fonts/layout
- [ ] Test Feature 4: Create version, rollback (admin only)
- [ ] Test Feature 5: View analytics dashboard, export CSV

### Deployment Preparation
- [ ] Update API documentation (if applicable)
- [ ] Update task counter: increment `tasks` in `.agent/ai-memory/task_counters.json`
- [ ] Create summary report in `.agent/ai-memory/$_tasks/portfolio_features/completion_report.md`
- [ ] Commit changes: `git add . && git commit -m "feat: implement 5 portfolio features"`
- [ ] Create pull request against main branch

---

## Verification Commands

### File Size Check
```bash
find frontend/src/components/portfolio -name "*.tsx" ! -name "*.spec.tsx" -exec wc -l {} \;
find backend/src/portfolio-* -name "*.ts" ! -name "*.spec.ts" -exec wc -l {} \;
```

### Test Coverage
```bash
# Backend
cd backend && bun test --coverage --testPathPattern="portfolio"

# Frontend
cd frontend && bun test --coverage --testPathPattern="portfolio"
```

### Lint and Type Check
```bash
# Backend
cd backend && bun run lint && bun run type-check

# Frontend
cd frontend && bun run lint && bun run type-check
```
