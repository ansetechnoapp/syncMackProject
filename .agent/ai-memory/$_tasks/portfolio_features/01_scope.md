# Portfolio Features - Scope Definition

## Overview
Implementation of 5 portfolio enhancement features for Zodback platform.
Each feature enhances user experience and portfolio customization capabilities.

## Feature 1: Preview des Templates
**Priority**: HIGH (Quick Win)

### Requirements
1. Add "Preview" button on each template card in `/portfolio/templates` page
2. Modal component opens with live preview of selected template
3. Fetch user's portfolio data and render with selected template
4. "Use this template" button in modal to activate template
5. Fully responsive preview (desktop/tablet/mobile)

### Acceptance Criteria
- AC1.1: Preview button visible on all template cards
- AC1.2: Modal opens within 500ms of button click
- AC1.3: Template renders with actual user portfolio data
- AC1.4: User can activate template directly from preview modal
- AC1.5: Modal closes on backdrop click or ESC key
- AC1.6: Preview renders correctly on mobile devices (viewport < 768px)

### Success Metrics
- Preview modal load time < 500ms
- Template activation success rate > 99%
- Zero layout shift issues in preview

---

## Feature 2: Gestion des Categories
**Priority**: MEDIUM (Foundation)

### Requirements
1. New page `/portfolio/categories` for category management
2. CRUD operations: create, edit, delete categories
3. List categories with project counts
4. Multi-select categories when creating/editing projects
5. Filter projects by category in `/portfolio/projects` page

### Acceptance Criteria
- AC2.1: Categories page accessible from portfolio navigation
- AC2.2: Create category form validates name uniqueness per project
- AC2.3: Edit category updates associated projects correctly
- AC2.4: Delete category shows confirmation dialog if projects exist
- AC2.5: Project form allows multi-category selection
- AC2.6: Projects page shows category filter with counts
- AC2.7: Category operations reflect in real-time (optimistic updates)

### Success Metrics
- Category CRUD operations complete < 200ms
- Zero data loss during category deletion
- Category filter updates project list immediately

---

## Feature 3: Customisation de Templates
**Priority**: HIGH (UX Enhancement)

### Requirements
1. Customization panel after selecting a template
2. Color pickers for: primary, secondary, accent, background colors
3. Font selector with Google Fonts integration (10+ fonts)
4. Layout options: spacing (compact/normal/spacious), container width
5. Logo/avatar upload with image optimization
6. Real-time preview of all customization changes
7. Save to `userPortfolioTemplates.customConfig` JSON field

### Acceptance Criteria
- AC3.1: Customization UI opens after template selection
- AC3.2: Color changes reflect in preview within 100ms
- AC3.3: Google Fonts load and apply correctly in preview
- AC3.4: Image upload validates size (max 2MB) and format (JPG/PNG/WebP)
- AC3.5: Layout changes apply without page reload
- AC3.6: Save operation persists all customizations to database
- AC3.7: Reset button restores template defaults

### Success Metrics
- Customization save success rate > 99%
- Preview update latency < 100ms
- Image upload success rate > 95%

---

## Feature 4: Versioning des Templates
**Priority**: LOW (Admin Feature)

### Requirements
1. Admin-only feature with role-based access
2. Create version snapshot button on template edit page
3. List template versions with changelog and creation date
4. Rollback to previous version functionality
5. Notify users when template updates are available

### Acceptance Criteria
- AC4.1: Only ADMIN/SUPER_ADMIN can access version management
- AC4.2: Version snapshot captures complete template state
- AC4.3: Version list shows semantic versioning (1.0.0, 1.1.0)
- AC4.4: Rollback restores template to exact version state
- AC4.5: User notification appears when active template has new version
- AC4.6: Changelog is required for version creation

### Success Metrics
- Version snapshot creation < 1s
- Rollback operation < 2s
- Zero data corruption during version operations

---

## Feature 5: Analytics du Portfolio
**Priority**: LOW (Future Enhancement)

### Requirements
1. Track portfolio views via public API calls
2. Track project-specific view counts
3. New page `/portfolio/analytics` with dashboard
4. Charts: views over time, top projects, traffic sources
5. Database table: `portfolioAnalytics`

### Acceptance Criteria
- AC5.1: Public API endpoint logs view events to analytics table
- AC5.2: Analytics page shows last 30 days by default
- AC5.3: Chart displays daily view counts
- AC5.4: Top projects ranked by view count (top 5)
- AC5.5: Traffic source tracking (direct, referral, search)
- AC5.6: Export analytics data as CSV

### Success Metrics
- Analytics tracking overhead < 10ms per API call
- Dashboard loads within 2s
- Data accuracy > 99%

---

## Global Constraints
- All files must be ≤ 100 lines (except test files)
- Use bun for all commands (never npm/yarn)
- Test-driven development: write test before implementation
- One task at a time: complete → test → validate → continue
- Single responsibility per file
- Modular architecture with components/

---

## Dependencies
- Feature 1: No dependencies (can start immediately)
- Feature 2: No dependencies (independent)
- Feature 3: Depends on Feature 1 (uses preview modal)
- Feature 4: No dependencies (admin-only, independent)
- Feature 5: No dependencies (independent)

## Estimated Effort
- Feature 1: 3-4 hours (5 tasks)
- Feature 2: 4-5 hours (7 tasks)
- Feature 3: 5-6 hours (8 tasks)
- Feature 4: 3-4 hours (5 tasks)
- Feature 5: 6-7 hours (9 tasks)

**Total**: 21-26 hours (34 tasks)
