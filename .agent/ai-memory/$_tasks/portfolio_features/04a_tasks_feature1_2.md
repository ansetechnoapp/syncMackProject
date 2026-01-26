# Tasks Breakdown - Feature 1 & 2

## FEATURE 1: Preview des Templates

### T1.0 [Preview] - Create PreviewFrame Component
- **Dependency**: None
- **Description**: Create iframe-based component to render template HTML with portfolio data
- **Test to be performed**: Component renders template HTML correctly with mock data
- **Test script**: `frontend/src/components/portfolio/templates/components/PreviewFrame.spec.tsx`
- **Success criteria**: Test passes with >80% coverage, component renders without errors
- **Files**:
  - `frontend/src/components/portfolio/templates/components/PreviewFrame.tsx` (≤80 lines)
- **Effort**: S

### T1.1 [Preview] - Create TemplateActions Component
- **Dependency**: None
- **Description**: Create action buttons component (Use Template, Close) for modal
- **Test to be performed**: Buttons trigger correct callbacks, disabled states work
- **Test script**: `frontend/src/components/portfolio/templates/components/TemplateActions.spec.tsx`
- **Success criteria**: All button interactions work, accessibility compliant
- **Files**:
  - `frontend/src/components/portfolio/templates/components/TemplateActions.tsx` (≤60 lines)
- **Effort**: S

### T1.2 [Preview] - Create TemplatePreviewModal Component
- **Dependency**: T1.0 ✅, T1.1 ✅
- **Description**: Main modal component composing PreviewFrame and TemplateActions
- **Test to be performed**: Modal opens/closes, ESC key works, backdrop click works
- **Test script**: `frontend/src/components/portfolio/templates/TemplatePreviewModal.spec.tsx`
- **Success criteria**: Modal behavior matches UX requirements, responsive on mobile
- **Files**:
  - `frontend/src/components/portfolio/templates/TemplatePreviewModal.tsx` (≤100 lines)
- **Effort**: M

### T1.3 [Preview] - Integrate Preview Button in Templates Page
- **Dependency**: T1.2 ✅
- **Description**: Add preview button to TemplateCard, wire up modal state management
- **Test to be performed**: Preview button opens modal with correct template data
- **Test script**: `frontend/app/(dashboard)/portfolio/templates/page.spec.tsx`
- **Success criteria**: Button visible, modal opens with <500ms latency
- **Files**:
  - `frontend/app/(dashboard)/portfolio/templates/page.tsx` (modify existing)
- **Effort**: S

### T1.4 [Preview] - Test Template Activation from Modal
- **Dependency**: T1.3 ✅
- **Description**: Implement "Use Template" action from preview modal
- **Test to be performed**: Template activation succeeds, modal closes, toast shows
- **Test script**: `frontend/src/components/portfolio/templates/TemplatePreviewModal.integration.spec.tsx`
- **Success criteria**: Activation success rate >99%, UI updates reflect change
- **Files**:
  - `frontend/src/components/portfolio/templates/TemplatePreviewModal.tsx` (modify)
- **Effort**: S

---

## FEATURE 2: Gestion des Categories

### T2.0 [Categories] - Create Database Migration
- **Dependency**: None
- **Description**: Verify portfolioCategories and portfolioProjectCategories tables exist
- **Test to be performed**: Run migration, verify tables with correct schema
- **Test script**: `backend/scripts/verify-categories-schema.ts`
- **Success criteria**: Tables exist, foreign keys correct, indexes applied
- **Files**:
  - `backend/scripts/verify-categories-schema.ts` (≤50 lines)
- **Effort**: S

### T2.1 [Categories] - Create Backend DTOs
- **Dependency**: None
- **Description**: Create CreateCategoryDto and UpdateCategoryDto with validation
- **Test to be performed**: DTO validation rejects invalid inputs
- **Test script**: `backend/src/portfolio-categories/dto/category.dto.spec.ts`
- **Success criteria**: All validation rules work (required fields, slug format)
- **Files**:
  - `backend/src/portfolio-categories/dto/create-category.dto.ts` (≤40 lines)
  - `backend/src/portfolio-categories/dto/update-category.dto.ts` (≤30 lines)
  - `backend/src/portfolio-categories/dto/index.ts` (≤10 lines)
- **Effort**: S

### T2.2 [Categories] - Create Categories Service
- **Dependency**: T2.1 ✅
- **Description**: Implement CRUD methods with Drizzle ORM, include project count query
- **Test to be performed**: All CRUD operations work, project count is accurate
- **Test script**: `backend/src/portfolio-categories/portfolio-categories.service.spec.ts`
- **Success criteria**: 100% method coverage, handles edge cases (delete with projects)
- **Files**:
  - `backend/src/portfolio-categories/portfolio-categories.service.ts` (≤95 lines)
- **Effort**: M

### T2.3 [Categories] - Create Categories Controller
- **Dependency**: T2.2 ✅
- **Description**: Implement REST endpoints with guards and validation
- **Test to be performed**: All endpoints return correct status codes and data
- **Test script**: `backend/src/portfolio-categories/portfolio-categories.controller.spec.ts`
- **Success criteria**: Routes work, auth guards applied, error handling correct
- **Files**:
  - `backend/src/portfolio-categories/portfolio-categories.controller.ts` (≤100 lines)
- **Effort**: M

### T2.4 [Categories] - Create Categories Module
- **Dependency**: T2.3 ✅
- **Description**: Wire up module with providers, imports, exports
- **Test to be performed**: Module imports successfully in AppModule
- **Test script**: `backend/src/portfolio-categories/portfolio-categories.module.spec.ts`
- **Success criteria**: Module loads, DI works, routes registered
- **Files**:
  - `backend/src/portfolio-categories/portfolio-categories.module.ts` (≤80 lines)
- **Effort**: S

### T2.5 [Categories] - Create Integration Tests
- **Dependency**: T2.4 ✅
- **Description**: Test full API flow with real database (transactions)
- **Test to be performed**: Complete CRUD cycle in single test suite
- **Test script**: `backend/src/portfolio-categories/categories.integration.spec.ts`
- **Success criteria**: All integration tests pass, DB rollback works
- **Files**:
  - `backend/src/portfolio-categories/categories.integration.spec.ts`
- **Effort**: M

### T2.6 [Categories] - Create React Query Hook
- **Dependency**: T2.5 ✅
- **Description**: Create usePortfolioCategories hook with CRUD mutations
- **Test to be performed**: Hook fetches data, mutations update cache optimistically
- **Test script**: `frontend/src/hooks/queries/usePortfolioCategories.spec.ts`
- **Success criteria**: Hook works with React Query, cache invalidation correct
- **Files**:
  - `frontend/src/hooks/queries/usePortfolioCategories.ts` (≤100 lines)
- **Effort**: M

### T2.7 [Categories] - Create CategoryCard Component
- **Dependency**: None
- **Description**: Display single category with name, project count, actions
- **Test to be performed**: Card renders, edit/delete buttons trigger callbacks
- **Test script**: `frontend/src/components/portfolio/categories/components/CategoryCard.spec.tsx`
- **Success criteria**: Component renders correctly, accessible
- **Files**:
  - `frontend/src/components/portfolio/categories/components/CategoryCard.tsx` (≤70 lines)
- **Effort**: S

### T2.8 [Categories] - Create CategoryForm Component
- **Dependency**: None
- **Description**: Form for create/edit with validation (name, slug, description, icon)
- **Test to be performed**: Form validation works, submit calls API
- **Test script**: `frontend/src/components/portfolio/categories/CategoryForm.spec.tsx`
- **Success criteria**: Validation prevents invalid submits, slug auto-generation works
- **Files**:
  - `frontend/src/components/portfolio/categories/CategoryForm.tsx` (≤85 lines)
- **Effort**: M

### T2.9 [Categories] - Create CategoryDeleteDialog Component
- **Dependency**: None
- **Description**: Confirmation dialog showing project count before delete
- **Test to be performed**: Dialog shows warning if projects exist, delete confirms
- **Test script**: `frontend/src/components/portfolio/categories/CategoryDeleteDialog.spec.tsx`
- **Success criteria**: Delete prevented if user cancels, success if confirmed
- **Files**:
  - `frontend/src/components/portfolio/categories/CategoryDeleteDialog.tsx` (≤60 lines)
- **Effort**: S

### T2.10 [Categories] - Create CategoryList Component
- **Dependency**: T2.7 ✅, T2.9 ✅
- **Description**: List all categories with search/filter, compose CategoryCard
- **Test to be performed**: List renders, search filters results, empty state shows
- **Test script**: `frontend/src/components/portfolio/categories/CategoryList.spec.tsx`
- **Success criteria**: List performance <100ms for 50 items, pagination works
- **Files**:
  - `frontend/src/components/portfolio/categories/CategoryList.tsx` (≤80 lines)
- **Effort**: M

### T2.11 [Categories] - Create Categories Page
- **Dependency**: T2.6 ✅, T2.8 ✅, T2.10 ✅
- **Description**: Main page composing all category components
- **Test to be performed**: Page loads, CRUD operations work end-to-end
- **Test script**: `frontend/app/(dashboard)/portfolio/categories/page.spec.tsx`
- **Success criteria**: Full page functionality, breadcrumbs, navigation
- **Files**:
  - `frontend/app/(dashboard)/portfolio/categories/page.tsx` (≤95 lines)
- **Effort**: M

### T2.12 [Categories] - Add Category Filter to Projects Page
- **Dependency**: T2.11 ✅
- **Description**: Add category dropdown filter, fetch projects by category
- **Test to be performed**: Filter updates project list, counts match
- **Test script**: `frontend/app/(dashboard)/portfolio/projects/page.spec.tsx`
- **Success criteria**: Filter works, loading states, reset filter option
- **Files**:
  - `frontend/app/(dashboard)/portfolio/projects/page.tsx` (modify existing)
- **Effort**: S

### T2.13 [Categories] - Add Multi-Select to Project Form
- **Dependency**: T2.12 ✅
- **Description**: Add multi-select dropdown for categories in project create/edit form
- **Test to be performed**: Multi-select saves to junction table, displays selected
- **Test script**: `frontend/src/components/portfolio/projects/ProjectForm.spec.tsx`
- **Success criteria**: Categories persist, UI shows selected categories
- **Files**:
  - `frontend/src/components/portfolio/projects/ProjectForm.tsx` (modify or create)
- **Effort**: M
