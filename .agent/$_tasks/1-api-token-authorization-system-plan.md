# API Token Authorization System - Implementation Plan
**Agent**: Kevin (Architect)  
**Date**: 2025-12-07  
**Project**: zodback - API Token Authorization System Completion

---

## 🎯 Objective

Complete the API Token authorization system by implementing the **validation and permission enforcement** components. The CRUD operations (create, list, revoke tokens) are already functional, but the system doesn't yet enforce token-based authorization on API routes.

---

## 📋 Context Analysis

### Current Status (✅ Completed - 50%)
- ✅ Database schema (`api_tokens` table) with all required fields
- ✅ CRUD endpoints for token management (create, list, revoke)
- ✅ Token generation with secure hashing (`TokenGenerator`)
- ✅ Redis integration for caching and instant revocation
- ✅ Frontend UI for token management (`/api-tokens` page)
- ✅ Permission validation utilities (`PermissionValidator`)
- ✅ Authorization matrix configuration (`AUTHORIZATION_MATRIX`)
- ✅ API Token Guard skeleton (`api-token.guard.ts`)
- ✅ Entity and Permission type definitions

### Remaining Work (🚧 To Complete - 50%)
- ❌ Middleware/Guard integration on protected routes
- ❌ Route → Entity → Permission mapping for actual API routes
- ❌ Wildcard permission support (`blog:*`, `*`)
- ❌ Complete validation pipeline for incoming API requests
- ❌ GraphQL resolver protection with API tokens
- ❌ Comprehensive test coverage for authorization system
- ❌ Documentation and usage examples

### Technical Constraints
- **Framework**: NestJS 11.0.1 with GraphQL + REST
- **Database**: PostgreSQL with Drizzle ORM
- **Package Manager**: pnpm (no npm/yarn mixing)
- **File Size Limit**: Maximum 80 lines per file
- **Testing**: Jest with ts-jest, mandatory test scripts

### Testing Requirements
- **Unit Tests**: Each validator, utility, service method
- **Integration Tests**: Full authorization flow (token → validation → access)
- **E2E Tests**: Real HTTP requests with valid/invalid tokens
- **Test Coverage**: Minimum 80% for authorization components

---

## 🗺️ Global Plan

### Phase 1: Route Protection Infrastructure (3 tasks)
Complete the middleware and decorator system to protect routes with API tokens.

### Phase 2: Authorization Matrix Expansion (2 tasks)
Map all existing API routes to entities and permissions.

### Phase 3: Wildcard & Hierarchical Permissions (2 tasks)
Implement wildcard support (`*`, `blog:*`) and hierarchical entity matching.

### Phase 4: Testing & Validation (3 tasks)
Comprehensive test suite for the entire authorization system.

---

## 🔴 Critical Development Principles

- ✅ **Test script creation is MANDATORY** for each development task
- ✅ **Validate modifications** through testing before proceeding
- ✅ **Keep files under 80 lines** maximum (split into components if needed)
- ✅ **One task at a time** - complete fully before moving forward
- ✅ **Write → Test → Validate → Continue** workflow
- ✅ Use `wc -l filename` to verify file size constraints

---

## 📝 Detailed Tasks

### 🟦 Phase 1: Route Protection Infrastructure

---

#### T1.0 Create API Token Decorator
- **Dependency**: None
- **Description**: Create a custom decorator `@UseApiToken()` to mark routes/controllers that require API token authentication. This decorator should work alongside existing JWT guards but use the `ApiTokenGuard` instead.
- **Implementation**:
  - Create `src/auth/decorators/use-api-token.decorator.ts`
  - Export a `UseApiToken()` decorator using `@SetMetadata()`
  - Store metadata key `API_TOKEN_REQUIRED = true`
- **Test to perform**: 
  - Unit test: Verify decorator sets correct metadata
  - Integration test: Apply decorator to a test controller and verify guard activation
- **Test script creation**: Create `src/auth/decorators/use-api-token.decorator.spec.ts`
- **Success criteria**: 
  - Decorator compiles without errors
  - Metadata is correctly set when decorator is applied
  - Test coverage ≥ 90%
- **File size constraint**: Decorator file < 30 lines

---

#### T1.1 Integrate ApiTokenGuard with Existing Routes
- **Dependency**: T1.0 ✅
- **Description**: Apply the `@UseApiToken()` decorator to existing REST controllers (users, posts) and GraphQL resolvers. Configure the guard to work in parallel with JWT authentication (allow either JWT or API token).
- **Implementation**:
  - Add `@UseApiToken()` to `posts.controller.ts` (if exists) and `users.controller.ts`
  - Modify `ApiTokenGuard` to support optional JWT fallback
  - Create a combined auth strategy in `auth.module.ts`
- **Test to perform**:
  - E2E test: Request with valid API token → should succeed
  - E2E test: Request with valid JWT → should succeed
  - E2E test: Request with no auth → should fail with 401
  - E2E test: Request with invalid API token → should fail with 401
- **Test script creation**: Create `src/auth/guards/api-token.guard.e2e.spec.ts`
- **Success criteria**:
  - Protected routes accept both JWT and API tokens
  - Invalid tokens are rejected with proper error messages
  - All E2E tests pass
  - Test coverage ≥ 85%
- **File size constraint**: Each modified file < 80 lines

---

#### T1.2 Create Token Extraction Middleware
- **Dependency**: T1.1 ✅
- **Description**: Create a global middleware that extracts API tokens from headers (`X-API-Key` or `Authorization: Bearer`) and attaches token metadata to the request object for downstream use.
- **Implementation**:
  - Create `src/auth/middleware/token-extraction.middleware.ts`
  - Extract token from `X-API-Key` header (priority 1)
  - Extract token from `Authorization: Bearer <token>` header (priority 2)
  - Validate token prefix (`zb_`)
  - Attach parsed token data to `request.apiToken`
  - Register middleware globally in `auth.module.ts`
- **Test to perform**:
  - Unit test: Verify token extraction from `X-API-Key` header
  - Unit test: Verify token extraction from `Authorization` header
  - Unit test: Verify rejection of tokens without `zb_` prefix
  - Integration test: Verify `request.apiToken` is populated correctly
- **Test script creation**: Create `src/auth/middleware/token-extraction.middleware.spec.ts`
- **Success criteria**:
  - Middleware correctly extracts tokens from both header formats
  - Invalid tokens are ignored (not rejected yet, just not extracted)
  - `request.apiToken` is populated for downstream guards
  - All unit tests pass
  - File size < 75 lines
- **File size constraint**: Middleware file < 75 lines

---

### 🟩 Phase 2: Authorization Matrix Expansion

---

#### T2.0 Audit Existing API Routes
- **Dependency**: T1.2 ✅
- **Description**: Generate a complete list of all REST and GraphQL endpoints in the application. Categorize them by entity (blog, ecommerce, users, etc.) and required permissions.
- **Implementation**:
  - Run NestJS route listing command: `pnpm run start:dev` and analyze logs
  - Document all routes in a markdown file: `.ai-memory/$_research/1-api-routes-inventory.md`
  - Include: HTTP method, path, entity, suggested permission level
- **Test to perform**:
  - Manual verification: Compare generated inventory with actual controllers/resolvers
  - Peer review: Have another developer verify completeness
- **Test script creation**: Create automated script `scripts/list-routes.ts` to extract routes programmatically
- **Success criteria**:
  - Complete inventory of all API routes
  - Each route categorized by entity
  - Suggested permission level documented
  - Inventory approved by project architect
- **File size constraint**: Inventory markdown < 200 lines (split if needed)

---

#### T2.1 Expand Authorization Matrix
- **Dependency**: T2.0 ✅
- **Description**: Update `AUTHORIZATION_MATRIX` to include all routes identified in T2.0. Add missing entities (users, auth, documentation, etc.) with proper permission mappings.
- **Implementation**:
  - Update `src/auth/config/authorization-matrix.ts`
  - Add all missing entities from the route inventory
  - Map each route to its required permission (read, write, delete, manage, admin)
  - Ensure hierarchical entities are properly configured (e.g., `ecommerce:orders`)
  - **If file exceeds 80 lines**: Split into separate files per entity (`authorization-matrix/blog.ts`, `authorization-matrix/ecommerce.ts`) and merge in `index.ts`
- **Test to perform**:
  - Unit test: Verify all routes from inventory are in the matrix
  - Unit test: Test route resolution for each entry
  - Integration test: Create test tokens and verify access control for each entity
- **Test script creation**: Create `src/auth/config/authorization-matrix.spec.ts`
- **Success criteria**:
  - All API routes mapped in the authorization matrix
  - No orphan routes (routes without matrix entry)
  - Hierarchical entities work correctly
  - All tests pass
  - File size constraint respected (< 80 lines per file)
- **File size constraint**: Main file < 80 lines OR split into component files

---

### 🟨 Phase 3: Wildcard & Hierarchical Permissions

---

#### T3.0 Implement Wildcard Permission Matching
- **Dependency**: T2.1 ✅
- **Description**: Enhance `PermissionValidator` to support wildcard patterns (`*`, `blog:*`, `ecommerce:*`). Ensure full access (`*`) grants access to all entities, and partial wildcards (`blog:*`) grant access to all blog sub-entities.
- **Implementation**:
  - Update `hasEntityAccess()` in `src/auth/utils/permission-validator.ts`
  - Add wildcard matching logic:
    - `*` → matches all entities
    - `blog:*` → matches `blog`, `blog:posts`, `blog:comments`, etc.
    - `ecommerce:*` → matches all ecommerce sub-entities
  - Ensure existing direct matching still works
  - **File size check**: Run `wc -l permission-validator.ts` after changes
  - **If exceeds 80 lines**: Split into `permission-validator/entity-matcher.ts` and `permission-validator/permission-checker.ts`
- **Test to perform**:
  - Unit test: `hasEntityAccess(['*'], 'blog')` → true
  - Unit test: `hasEntityAccess(['blog:*'], 'blog:posts')` → true
  - Unit test: `hasEntityAccess(['blog:*'], 'ecommerce')` → false
  - Unit test: `hasEntityAccess(['blog'], 'blog:posts')` → true (hierarchical)
  - Unit test: `hasEntityAccess(['ecommerce:orders'], 'ecommerce:products')` → false
- **Test script creation**: Update `src/auth/utils/permission-validator.spec.ts`
- **Success criteria**:
  - All wildcard patterns work correctly
  - Hierarchical matching preserved
  - All unit tests pass (≥ 95% coverage)
  - File size < 80 lines per file
- **File size constraint**: Files < 80 lines (split if needed)

---

#### T3.1 Add Permission Inheritance System
- **Dependency**: T3.0 ✅
- **Description**: Implement permission inheritance where `admin` permission grants all other permissions, and `manage` grants `read` + `write`. Update the `hasPermission()` method to respect this hierarchy.
- **Implementation**:
  - Define permission hierarchy in `src/auth/config/permission-hierarchy.ts`:
    ```typescript
    admin → [read, write, delete, manage]
    manage → [read, write]
    ```
  - Update `hasPermission()` in `PermissionValidator` to check inheritance
  - Cache permission expansions in Redis for performance
- **Test to perform**:
  - Unit test: `hasPermission({blog: ['admin']}, 'blog', 'read')` → true
  - Unit test: `hasPermission({blog: ['admin']}, 'blog', 'delete')` → true
  - Unit test: `hasPermission({blog: ['manage']}, 'blog', 'read')` → true
  - Unit test: `hasPermission({blog: ['manage']}, 'blog', 'delete')` → false
  - Unit test: `hasPermission({blog: ['read']}, 'blog', 'write')` → false
- **Test script creation**: Create `src/auth/config/permission-hierarchy.spec.ts`
- **Success criteria**:
  - Permission hierarchy correctly implemented
  - All inheritance tests pass
  - No performance regression (< 5ms per check)
  - File size < 50 lines
- **File size constraint**: permission-hierarchy.ts < 50 lines

---

### 🟪 Phase 4: Testing & Validation

---

#### T4.0 Create Comprehensive E2E Test Suite
- **Dependency**: T3.1 ✅
- **Description**: Build a complete E2E test suite that validates the entire API token authorization flow, from token creation to route access with various permission scenarios.
- **Implementation**:
  - Create `test/api-token-authorization.e2e.spec.ts`
  - Test scenarios:
    1. Create a token with `blog:read` permission → access `/posts` GET succeeds, POST fails
    2. Create a token with `*` full access → all routes succeed
    3. Create a token with `blog:*` → all blog routes succeed, ecommerce fails
    4. Revoke a token → subsequent requests fail with 401
    5. Expired token → fails with 401
    6. Invalid token format → fails with 401
    7. Token usage counter increments correctly
  - **Split tests if file exceeds 80 lines**: Create separate test files per scenario category
- **Test to perform**:
  - Run: `pnpm run test:e2e`
  - Verify all scenarios pass
  - Check test execution time (< 30 seconds total)
- **Test script creation**: Create E2E test file(s) as described
- **Success criteria**:
  - All E2E scenarios pass
  - Test coverage ≥ 80% for auth module
  - Tests run in < 30 seconds
  - Each test file < 80 lines
- **File size constraint**: Each test file < 80 lines (split by scenario if needed)

---

#### T4.1 Create API Token Usage Documentation
- **Dependency**: T4.0 ✅
- **Description**: Write comprehensive documentation for developers on how to use the API token system, including examples, best practices, and troubleshooting guides.
- **Implementation**:
  - Create `docs/api-tokens/README.md` with:
    - Quick start guide
    - Token creation examples
    - cURL examples for API usage
    - Permission matrix reference
    - Security best practices
    - Troubleshooting common errors
  - Create `docs/api-tokens/EXAMPLES.md` with real-world use cases
  - Add inline code comments to all authorization files
- **Test to perform**:
  - Manual test: Follow documentation to create a token and make API calls
  - Peer review: Have a developer unfamiliar with the system test the documentation
  - Validation: Ensure all examples work correctly
- **Test script creation**: Create `scripts/validate-documentation-examples.ts` to test all code snippets in docs
- **Success criteria**:
  - Documentation is complete and accurate
  - All examples execute successfully
  - Peer review approved
  - Examples validation script passes
- **File size constraint**: Each doc file < 300 lines (split into sections if needed)

---

#### T4.2 Performance Optimization & Caching
- **Dependency**: T4.1 ✅
- **Description**: Optimize the authorization pipeline for high-throughput scenarios. Implement Redis caching for permission checks and authorization matrix lookups.
- **Implementation**:
  - Create `src/auth/utils/permission-cache.ts` to cache permission validation results
  - Cache authorization matrix in Redis with TTL of 1 hour
  - Cache token validation results (already implemented, verify performance)
  - Add performance metrics logging for authorization checks
  - Create performance benchmark script
- **Test to perform**:
  - Benchmark test: Measure authorization check latency (target: < 5ms)
  - Load test: 1000 concurrent requests with valid tokens (target: 0% failures)
  - Cache hit rate test: Verify ≥ 80% cache hit rate after warmup
  - Run: `pnpm run test:performance`
- **Test script creation**: Create `test/performance/authorization-benchmark.spec.ts`
- **Success criteria**:
  - Authorization check latency < 5ms (p95)
  - Cache hit rate ≥ 80% in steady state
  - No memory leaks detected
  - All performance tests pass
  - File size < 70 lines
- **File size constraint**: permission-cache.ts < 70 lines

---

## 📊 Success Metrics

### Functional Metrics
- ✅ All API routes protected with API token or JWT authentication
- ✅ Wildcard permissions (`*`, `entity:*`) work correctly
- ✅ Permission inheritance (`admin`, `manage`) implemented
- ✅ Token revocation takes effect immediately via Redis
- ✅ Usage counters and audit logs updated correctly

### Performance Metrics
- ✅ Authorization check latency < 5ms (p95)
- ✅ Token validation cache hit rate ≥ 80%
- ✅ No significant performance degradation on protected routes

### Quality Metrics
- ✅ Test coverage ≥ 80% for all authorization components
- ✅ All E2E test scenarios pass
- ✅ All files respect 80-line limit
- ✅ Zero linting errors
- ✅ Documentation complete and validated

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance degradation on high-traffic routes | High | Implement aggressive Redis caching, benchmark before deployment |
| Wildcard permissions too permissive | High | Require explicit confirmation for `*` tokens in UI, add admin approval workflow |
| Authorization matrix becomes too large | Medium | Split into modular files by entity, lazy-load in memory |
| Redis cache inconsistency | Medium | Implement cache invalidation on token revocation, add fallback to DB |
| Breaking changes to existing JWT auth | High | Maintain backward compatibility, support both auth methods in parallel |

---

## 📦 Deliverables

1. ✅ Updated `ApiTokenGuard` with full validation pipeline
2. ✅ `@UseApiToken()` decorator for route protection
3. ✅ Expanded `AUTHORIZATION_MATRIX` covering all routes
4. ✅ Enhanced `PermissionValidator` with wildcard support
5. ✅ Complete E2E test suite (≥ 80% coverage)
6. ✅ Developer documentation with examples
7. ✅ Performance benchmark results
8. ✅ All files under 80-line limit

---

## 🎯 Next Steps After Plan Approval

1. **Review this plan** with project stakeholders
2. **Execute tasks sequentially** (one at a time, fully tested before proceeding)
3. **Update `task.md`** checklist as tasks are completed
4. **Create walkthrough.md** after Phase 4 completion with demo screenshots
5. **Deploy to staging** for integration testing with frontend

---

**End of Plan** 🚀
