# Task 003: Admin Database Management UI - Architectural Plan

**Created:** 2026-01-18
**Agent:** Kevin (Architect)
**Status:** Planning Complete
**Complexity:** Medium-High
**Estimated Effort:** 8-12 hours

---

## 1. Architecture Overview

### 1.1 System Context

The Admin Database Management UI will provide SUPER_ADMIN users with comprehensive database compliance and validation tools through a modern web interface.

**Existing Backend Endpoints:**
- `GET /admin/db/compliance` - Returns compliance report (RLS, indexes, policies, audit)
- `POST /admin/db/validate-external` - Validates external database connections

**Integration Points:**
- Existing admin dashboard at `frontend/app/(dashboard)/admin/page.tsx`
- API client pattern from `frontend/src/lib/api/auth.api.ts`
- React Query hooks pattern from `frontend/src/hooks/queries/useAuth.ts`
- UI components from `frontend/src/components/ui/`

### 1.2 Frontend Component Structure

```
frontend/
├── src/
│   ├── lib/api/
│   │   └── admin-db.api.ts          # API client for database endpoints
│   ├── hooks/queries/
│   │   └── useDatabase.ts           # React Query hooks
│   ├── components/admin/database/
│   │   ├── ComplianceReport.tsx     # Main compliance report display
│   │   ├── RlsStatusTable.tsx       # RLS status for tables
│   │   ├── IndexStatusTable.tsx     # Index presence check
│   │   ├── PoliciesTable.tsx        # Policies count per table
│   │   ├── AuditStatus.tsx          # Audit append-only status
│   │   ├── ExternalDbValidator.tsx  # External DB validation form
│   │   └── DbStatistics.tsx         # Summary statistics cards
│   └── app/(dashboard)/admin/database/
│       └── page.tsx                 # Main database management page
```

### 1.3 State Management Approach

**React Query** will be used for:
- Server state management
- Automatic caching and refetching
- Loading and error states
- Optimistic updates

**Local State** (useState) for:
- Form inputs (external DB connection string)
- UI toggles (tab switching, modal visibility)
- Validation messages

### 1.4 Routing Strategy

**Route:** `/admin/database`
- Protected route requiring SUPER_ADMIN role
- Nested under admin dashboard layout
- Uses Next.js 14+ App Router
- Accessible from admin dashboard navigation

---

## 2. Files to Create

### 2.1 API Client Layer

**File:** `frontend/src/lib/api/admin-db.api.ts`

**Purpose:** Centralized API client functions for database management endpoints

**Exports:**
- `getCompliance()` - Fetch compliance report from GET /admin/db/compliance
- `validateExternalDb(connectionString)` - Validate external DB via POST /admin/db/validate-external

**Pattern:** Follows existing auth.api.ts pattern using axios `api` instance

### 2.2 React Query Hooks

**File:** `frontend/src/hooks/queries/useDatabase.ts`

**Purpose:** Typed React Query hooks for database operations

**Exports:**
- `useComplianceQuery()` - Query hook for fetching compliance data
- `useValidateExternalDbMutation()` - Mutation hook for external DB validation

**Features:**
- TypeScript interfaces for response data
- Error handling
- Retry logic
- Cache invalidation strategies

### 2.3 UI Components

#### 2.3.1 ComplianceReport.tsx
**Purpose:** Main container component orchestrating all compliance sections

**Props:**
```typescript
interface ComplianceReportProps {
  onRefresh?: () => void;
}
```

**Features:**
- Displays overall compliance status
- Coordinates child components (RLS, Indexes, Policies, Audit)
- Handles refresh action
- Shows loading skeleton during fetch
- Error boundary for failed loads

#### 2.3.2 RlsStatusTable.tsx
**Purpose:** Display RLS (Row Level Security) status per table

**Props:**
```typescript
interface RlsStatusTableProps {
  data: Array<{ table: string; enabled: boolean }>;
}
```

**Features:**
- Sortable table by table name or status
- Visual indicators (green check / red X)
- Filter by enabled/disabled status
- Export to CSV functionality

#### 2.3.3 IndexStatusTable.tsx
**Purpose:** Show project_id index presence per table

**Props:**
```typescript
interface IndexStatusTableProps {
  data: Array<{ table: string; hasIndex: boolean }>;
}
```

**Features:**
- Similar table structure to RLS
- Highlight missing indexes in warning color
- Quick filter for tables without indexes

#### 2.3.4 PoliciesTable.tsx
**Purpose:** Display policy count per table

**Props:**
```typescript
interface PoliciesTableProps {
  data: Array<{ table: string; policies: number }>;
}
```

**Features:**
- Sortable by policy count
- Highlight tables with zero policies
- Show policy count distribution chart

#### 2.3.5 AuditStatus.tsx
**Purpose:** Display audit log append-only compliance

**Props:**
```typescript
interface AuditStatusProps {
  data: {
    updatePolicies: number;
    deletePolicies: number;
  };
}
```

**Features:**
- Clear pass/fail indicator
- Explanation of append-only requirement
- Alert if UPDATE or DELETE policies exist

#### 2.3.6 ExternalDbValidator.tsx
**Purpose:** Form to validate external database connections

**Props:**
```typescript
interface ExternalDbValidatorProps {
  onValidationComplete?: (result: ComplianceResult) => void;
}
```

**Features:**
- Secure input for connection string
- Validation button with loading state
- Display validation results in same format as main compliance
- Error handling for connection failures
- Warning about security implications

#### 2.3.7 DbStatistics.tsx
**Purpose:** Summary statistics cards

**Props:**
```typescript
interface DbStatisticsProps {
  complianceData: ComplianceResult;
}
```

**Features:**
- Total tables monitored
- Compliance percentage
- Critical issues count
- Last check timestamp

### 2.4 Main Admin Page

**File:** `frontend/app/(dashboard)/admin/database/page.tsx`

**Purpose:** Database management page container

**Features:**
- Breadcrumb navigation
- Tab switching between "Compliance Report" and "External Validator"
- Refresh button
- Loading states
- Error handling
- SUPER_ADMIN role check on client (UX) and server (backend already enforces)

---

## 3. Implementation Steps

### Phase 1: Foundation (2-3 hours)

**Step 1.1:** Create TypeScript interfaces
- Define `ComplianceResult` interface matching backend response
- Define all component prop interfaces
- Create in `frontend/src/types/database.types.ts`

**Step 1.2:** Create API client
- Implement `frontend/src/lib/api/admin-db.api.ts`
- Add `getCompliance()` function
- Add `validateExternalDb(connectionString)` function
- Test with backend running

**Testing:**
```bash
# Backend must be running
cd backend && bun run dev

# Manual API test with curl
curl -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" http://localhost:3013/admin/db/compliance
```

**Validation Criteria:**
- API functions return typed data
- Error handling works for 401, 403, 500
- Connection timeout handled gracefully

---

### Phase 2: React Query Hooks (1-2 hours)

**Step 2.1:** Create hooks file
- Implement `frontend/src/hooks/queries/useDatabase.ts`
- Add `useComplianceQuery()` with 5-minute cache
- Add `useValidateExternalDbMutation()`

**Step 2.2:** Configure caching strategy
- Compliance data: 5-minute stale time
- Refetch on window focus: disabled (admin data doesn't change frequently)
- Retry: 1 time on failure

**Testing:**
- Test hook in isolated component
- Verify caching behavior
- Test error states

**Validation Criteria:**
- Hooks return correct loading/error/data states
- Cache invalidation works after mutation
- TypeScript types are correct

---

### Phase 3: Core Components (3-4 hours)

**Step 3.1:** Build data display components (parallel)
- `RlsStatusTable.tsx` - 30 min
- `IndexStatusTable.tsx` - 30 min
- `PoliciesTable.tsx` - 45 min
- `AuditStatus.tsx` - 30 min
- `DbStatistics.tsx` - 45 min

**Step 3.2:** Build form component
- `ExternalDbValidator.tsx` - 1 hour
- Input validation
- Submit handling
- Results display

**Step 3.3:** Build container component
- `ComplianceReport.tsx` - 1 hour
- Orchestrate all child components
- Handle loading/error states
- Refresh functionality

**Testing:**
- Storybook stories for each component (optional but recommended)
- Test with mock data
- Test loading states
- Test error states

**Validation Criteria:**
- All components render correctly with mock data
- Loading skeletons display properly
- Error messages are user-friendly
- Tables are sortable and filterable

---

### Phase 4: Page Integration (1-2 hours)

**Step 4.1:** Create database page
- Implement `frontend/app/(dashboard)/admin/database/page.tsx`
- Add breadcrumb navigation
- Implement tab switching
- Wire up components with hooks

**Step 4.2:** Update admin dashboard navigation
- Add "Database Management" link to `frontend/app/(dashboard)/admin/page.tsx`
- Add database icon and description
- Update navigation menu if exists

**Testing:**
- Navigate to `/admin/database`
- Test all tabs
- Test refresh button
- Verify data loads correctly

**Validation Criteria:**
- Page accessible from admin dashboard
- All components integrated correctly
- Navigation works
- Data flows from API to UI

---

### Phase 5: Testing & Polish (2-3 hours)

**Step 5.1:** Integration testing
- Test full user flow
- Test with real backend data
- Test SUPER_ADMIN authorization
- Test error scenarios (backend down, 403, etc.)

**Step 5.2:** Accessibility audit
- Add ARIA labels
- Ensure keyboard navigation
- Test with screen reader
- Verify color contrast

**Step 5.3:** Performance optimization
- Check bundle size
- Optimize re-renders
- Add React.memo where needed
- Verify query caching works

**Step 5.4:** Documentation
- Add JSDoc comments to functions
- Document component props
- Add README for admin/database section

**Testing:**
- Manual testing checklist (see section 6)
- Automated tests (if time permits)
- Cross-browser testing (Chrome, Firefox, Safari)

**Validation Criteria:**
- All tests pass
- No console errors or warnings
- Performance metrics acceptable
- Documentation complete

---

## 4. Technical Specifications

### 4.1 TypeScript Interfaces

```typescript
// frontend/src/types/database.types.ts

export interface RlsStatus {
  table: string;
  enabled: boolean;
}

export interface IndexStatus {
  table: string;
  hasIndex: boolean;
}

export interface PolicyStatus {
  table: string;
  policies: number;
}

export interface AuditAppendOnly {
  updatePolicies: number;
  deletePolicies: number;
}

export interface ComplianceResult {
  rls: RlsStatus[];
  indexes: IndexStatus[];
  policies: PolicyStatus[];
  auditAppendOnly: AuditAppendOnly;
}

export interface ValidationError {
  message: string;
  code?: string;
}
```

### 4.2 Component Props

```typescript
// ComplianceReport
interface ComplianceReportProps {
  onRefresh?: () => void;
}

// RlsStatusTable
interface RlsStatusTableProps {
  data: RlsStatus[];
  isLoading?: boolean;
}

// IndexStatusTable
interface IndexStatusTableProps {
  data: IndexStatus[];
  isLoading?: boolean;
}

// PoliciesTable
interface PoliciesTableProps {
  data: PolicyStatus[];
  isLoading?: boolean;
}

// AuditStatus
interface AuditStatusProps {
  data: AuditAppendOnly;
  isLoading?: boolean;
}

// ExternalDbValidator
interface ExternalDbValidatorProps {
  onValidationComplete?: (result: ComplianceResult) => void;
}

// DbStatistics
interface DbStatisticsProps {
  complianceData: ComplianceResult | null;
  isLoading?: boolean;
}
```

### 4.3 Error Handling Strategy

**Levels:**
1. **Network Errors** - Display friendly "Unable to connect" message with retry button
2. **Authorization Errors (403)** - Show "Access Denied - SUPER_ADMIN required" with link to admin page
3. **Server Errors (500)** - Show "Server error occurred" with error details in expandable section
4. **Validation Errors** - Show inline form validation messages

**Implementation:**
- Use try/catch in API calls
- Map axios errors to user-friendly messages
- Use Alert component from UI library
- Log errors to console for debugging

```typescript
// Error handling example
try {
  const data = await getCompliance();
  return data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) {
      throw new Error('Access Denied: SUPER_ADMIN role required');
    } else if (error.response?.status === 500) {
      throw new Error('Server error occurred. Please try again later.');
    } else if (!error.response) {
      throw new Error('Unable to connect to server. Please check your connection.');
    }
  }
  throw error;
}
```

### 4.4 Loading States

**Strategy:**
- Use Skeleton components for table loading
- Use Spinner for button loading (during external validation)
- Show loading overlay for full page refresh

**Implementation:**
```typescript
// Table loading state
{isLoading ? (
  <Skeleton count={10} height={40} />
) : (
  <table>...</table>
)}

// Button loading state
<Button loading={isValidating}>Validate</Button>
```

### 4.5 Security Considerations

**SUPER_ADMIN Role Enforcement:**
- Backend already enforces via `@Roles(ROLES.SUPER_ADMIN)` decorator
- Frontend should show friendly error if user lacks permission
- Consider client-side role check for UX (hide/disable features)
- Never expose sensitive connection strings in logs or error messages

**External DB Validation:**
- Warn users about security implications
- Never store connection strings client-side
- Clear input after validation
- Rate limit validation requests (backend should implement)

**Data Sanitization:**
- Sanitize table names before display (prevent XSS)
- Use React's built-in XSS protection
- Validate all user inputs

---

## 5. Integration Points

### 5.1 Admin Dashboard Integration

**File:** `frontend/app/(dashboard)/admin/page.tsx`

**Changes Needed:**
Add new Quick Action link in the Overview tab:

```tsx
<a href="/admin/database" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
  <span className="text-2xl">🗄️</span>
  <div>
    <div className="font-medium">Database Management</div>
    <div className="text-sm text-gray-500">Monitor compliance and validate external databases</div>
  </div>
</a>
```

**Add Tab:**
```tsx
{ id: 'database' as TabType, label: 'Database' }
```

### 5.2 Navigation Updates

**If sidebar navigation exists:**
- Add "Database" link under Admin section
- Icon: Database/Server icon
- Badge: Show critical issues count (optional)

**Breadcrumb:**
```tsx
<Breadcrumb
  items={[
    { label: 'Home', href: '/home' },
    { label: 'Admin', href: '/admin' },
    { label: 'Database', href: '/admin/database', current: true },
  ]}
/>
```

### 5.3 Layout Considerations

**Dashboard Layout:**
- Use existing `(dashboard)` layout
- Maintain consistent spacing and styling
- Use same color scheme and typography
- Responsive design (mobile, tablet, desktop)

**Component Layout:**
```
┌─────────────────────────────────────────┐
│ Breadcrumb                              │
├─────────────────────────────────────────┤
│ Header + Refresh Button                 │
├─────────────────────────────────────────┤
│ Statistics Cards (4 columns)            │
├─────────────────────────────────────────┤
│ Tabs: Compliance | External Validator   │
├─────────────────────────────────────────┤
│                                         │
│ Tab Content                             │
│                                         │
│ [Tables / Form]                         │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Files to Test:**
- `admin-db.api.ts` - Mock axios, test API calls
- `useDatabase.ts` - Test React Query hooks with mock data
- Individual components - Test rendering with mock props

**Tools:**
- Jest
- React Testing Library
- MSW (Mock Service Worker) for API mocking

**Example Test:**
```typescript
// admin-db.api.test.ts
describe('getCompliance', () => {
  it('should fetch compliance data successfully', async () => {
    const mockData = { rls: [], indexes: [], policies: [], auditAppendOnly: {} };
    jest.spyOn(api, 'get').mockResolvedValue({ data: mockData });

    const result = await getCompliance();

    expect(result).toEqual(mockData);
    expect(api.get).toHaveBeenCalledWith('/admin/db/compliance');
  });
});
```

### 6.2 Integration Tests

**Scenarios:**
1. Load compliance page and verify all sections render
2. Click refresh and verify data reloads
3. Validate external DB and see results
4. Test error handling (403, 500, network error)
5. Test tab switching

**Tools:**
- Playwright or Cypress (E2E)
- React Testing Library (Component integration)

### 6.3 Manual Testing Checklist

**Pre-requisites:**
- [ ] Backend running on port 3013
- [ ] User logged in as SUPER_ADMIN
- [ ] Test database with known compliance state

**Compliance Report Tab:**
- [ ] Page loads without errors
- [ ] Statistics cards show correct data
- [ ] RLS table displays all tables with correct status
- [ ] Index table displays all tables with correct status
- [ ] Policies table displays all tables with correct counts
- [ ] Audit status shows correct policy counts
- [ ] Refresh button reloads data
- [ ] Loading states display correctly
- [ ] Sorting tables works
- [ ] Filtering works

**External Validator Tab:**
- [ ] Connection string input accepts valid format
- [ ] Validation button disabled when input empty
- [ ] Validation request sends correct payload
- [ ] Results display in same format as compliance report
- [ ] Error handling works for invalid connection string
- [ ] Warning message displays about security

**Authorization:**
- [ ] Non-SUPER_ADMIN users see 403 error
- [ ] Logged out users redirected to login

**Responsive Design:**
- [ ] Mobile view works (320px width)
- [ ] Tablet view works (768px width)
- [ ] Desktop view works (1920px width)

**Accessibility:**
- [ ] Tab navigation works
- [ ] Screen reader announces content correctly
- [ ] Color contrast passes WCAG AA
- [ ] Focus indicators visible

**Performance:**
- [ ] Page loads in < 2 seconds
- [ ] No console errors
- [ ] No memory leaks
- [ ] Bundle size acceptable

---

## 7. Dependencies

### 7.1 Existing Dependencies (Already in Project)
- `@tanstack/react-query` - State management
- `axios` - HTTP client
- `react` - UI framework
- `next` - Framework
- `typescript` - Type safety

### 7.2 UI Components (Already in Project)
- `Button` - `@/components/ui/Button`
- `Input` - `@/components/ui/Input`
- `Alert` - `@/components/ui/Alert`
- `Card` - `@/components/ui/Card`
- `Spinner` - `@/components/ui/Spinner`
- `Skeleton` - `@/components/ui/Skeleton`
- `Badge` - `@/components/ui/Badge`

### 7.3 New Dependencies (If Needed)
- None required - all features can be built with existing stack

---

## 8. Rollout Plan

### 8.1 Development Environment
1. Create feature branch: `feature/admin-db-ui`
2. Implement according to phases 1-5
3. Test locally with backend
4. Code review

### 8.2 Staging Environment
1. Deploy to staging
2. Manual QA testing
3. Performance testing
4. Security review

### 8.3 Production Deployment
1. Merge to main branch
2. Deploy with feature flag (optional)
3. Monitor for errors
4. Gradual rollout to SUPER_ADMIN users

---

## 9. Risk Assessment

### 9.1 High Risk
- **Authorization bypass** - Mitigation: Backend already enforces SUPER_ADMIN, frontend is just UX
- **Exposure of sensitive data** - Mitigation: Never log connection strings, clear inputs

### 9.2 Medium Risk
- **Performance issues with large datasets** - Mitigation: Pagination, virtual scrolling if needed
- **Backend endpoint changes** - Mitigation: Version API, use TypeScript for contract enforcement

### 9.3 Low Risk
- **UI bugs** - Mitigation: Comprehensive testing, error boundaries
- **Browser compatibility** - Mitigation: Test on modern browsers, use polyfills

---

## 10. Success Metrics

### 10.1 Functional Metrics
- [ ] All 7 components implemented and tested
- [ ] Page loads successfully for SUPER_ADMIN users
- [ ] Both tabs (Compliance, External Validator) functional
- [ ] Error handling works for all scenarios
- [ ] Zero console errors in production

### 10.2 Quality Metrics
- [ ] TypeScript strict mode with zero errors
- [ ] Code coverage > 70% (if tests written)
- [ ] Lighthouse score > 90
- [ ] Zero accessibility violations (WCAG AA)

### 10.3 User Experience Metrics
- [ ] Page load time < 2 seconds
- [ ] Compliance data updates within 1 second on refresh
- [ ] External validation returns results within 5 seconds
- [ ] Clear error messages for all failure scenarios

---

## 11. Future Enhancements

### 11.1 Phase 2 Features (Not in Scope)
- Real-time compliance monitoring (WebSocket)
- Automated compliance tests scheduler
- Email alerts for compliance failures
- Historical compliance trends (charts)
- Bulk table operations (enable RLS, create policies)

### 11.2 Technical Improvements
- GraphQL API instead of REST (if desired)
- Server-side rendering for faster initial load
- Progressive Web App features (offline support)
- Advanced filtering and search

---

## 12. Estimated Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1: Foundation | 2-3 hours | API client + types ready |
| Phase 2: Hooks | 1-2 hours | React Query hooks tested |
| Phase 3: Components | 3-4 hours | All 7 components built |
| Phase 4: Integration | 1-2 hours | Page live on /admin/database |
| Phase 5: Testing | 2-3 hours | All tests pass, ready for review |
| **Total** | **9-14 hours** | **Feature complete** |

**Best Case:** 9 hours
**Expected:** 11 hours
**Worst Case:** 14 hours

---

## 13. Next Steps

### Immediate Actions (Day 1)
1. Create feature branch: `feature/admin-db-ui`
2. Create types file: `frontend/src/types/database.types.ts`
3. Implement API client: `frontend/src/lib/api/admin-db.api.ts`
4. Test API client with running backend

### Week 1 Goals
- Complete Phases 1-3 (Foundation, Hooks, Components)
- Have all components rendering with mock data
- Begin integration testing

### Week 2 Goals
- Complete Phases 4-5 (Integration, Testing)
- Code review and feedback incorporation
- Staging deployment

### Production Ready
- All testing complete
- Documentation written
- Approved by stakeholders
- Deployed to production

---

## 14. Conclusion

This architectural plan provides a comprehensive roadmap for implementing the Admin Database Management UI. The design follows ZodBack project conventions:

- **Single Responsibility:** Each component has one clear purpose
- **Test-Driven:** Testing integrated at every phase
- **Modular:** Reusable components with clear interfaces
- **Type-Safe:** Full TypeScript coverage
- **Secure:** SUPER_ADMIN authorization enforced

**Complexity Assessment:** Medium-High
- Not trivial due to multiple components and integration points
- Well-defined scope prevents feature creep
- Existing patterns make implementation straightforward

**Recommendation:** Proceed with implementation following the phased approach. Start with Phase 1 (Foundation) and validate before moving to subsequent phases.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-18
**Author:** Kevin (Architect Agent)
