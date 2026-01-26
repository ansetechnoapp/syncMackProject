# 🏗️ Multi-Tenancy Architecture Plan - zodback

## Objective
Implement a comprehensive multi-tenant SaaS architecture with:
- **3 internal JWT roles**: SUPER_ADMIN, ADMIN, USER
- **Project-based organization** with entity/module management
- **Enhanced API tokens** scoped to projects and entities
- **Clear migration path** to multi-schema PostgreSQL

---

## Context Analysis

### Current Status
- ✅ NestJS + GraphQL + Drizzle ORM + PostgreSQL stack
- ✅ Basic users table (id, email, password, createdAt) - **NO roles field**
- ✅ API tokens system with entity-based permissions
- ✅ JWT authentication with Redis for refresh tokens
- ⚠️ Roles hardcoded as `['ROLE_USER']` in auth.service.ts
- ❌ No SUPER_ADMIN/ADMIN differentiation
- ❌ No projects/multi-tenancy support
- ❌ No entity management table

### Objectives
1. Implement 3-tier role hierarchy (SUPER_ADMIN > ADMIN > USER)
2. Create project system with entity activation
3. Link users to projects
4. Scope API tokens to projects
5. Prepare for future multi-schema migration

### Constraints
- Must be backwards compatible with existing users
- Keep existing API token structure working
- Maximum 80 lines per file
- Test-driven development required

### Testing Requirements
- Unit tests for all services
- Integration tests for guards
- E2E tests for complete flows

---

## Global Plan

### Phase 1: Role System Foundation ⚡ PRIORITY HIGH
- Add role field to users
- Create role guards
- Update JWT payloads

### Phase 2: Project System 🔧 PRIORITY HIGH
- Create entities table
- Create projects table
- Create project relationships

### Phase 3: User-Project Integration 🔗 PRIORITY MEDIUM
- Link users to projects
- Create project-scoped operations

### Phase 4: API Token Enhancement 🔐 PRIORITY MEDIUM
- Add project scope to tokens
- Update token validation

### Phase 5: Multi-Schema Preparation 🚀 PRIORITY LOW (Future)
- Schema management service
- Migration tooling

---

## Critical Development Principles

- ✅ **Test script creation is MANDATORY** for each development task
- ✅ **Validate modifications** through testing before proceeding
- ✅ **Keep files under 80 lines** maximum
- ✅ **One task at a time** - complete fully before moving forward
- ✅ **Write → Test → Validate → Continue** workflow

---

## Database Schema Design

### Enhanced users table
```sql
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
```

### New tables
```sql
-- Entities registry
CREATE TABLE entities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- 'BLOG', 'ECOMMERCE', etc.
  display_name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'active',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  schema_name TEXT, -- For future multi-schema
  enabled_entities JSONB DEFAULT '[]', -- ['BLOG', 'ECOMMERCE']
  status TEXT NOT NULL DEFAULT 'active',
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project-User relationship
CREATE TABLE project_users (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_project TEXT NOT NULL DEFAULT 'member', -- 'member', 'moderator', 'admin'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Project-Admin relationship (for multi-admin support)
CREATE TABLE project_admins (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '{"full_control": true}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, admin_id)
);
```

### API Tokens enhancement
```sql
ALTER TABLE api_tokens ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE api_tokens ADD COLUMN scope TEXT NOT NULL DEFAULT 'global'; -- 'global' | 'project'
```

---

## Detailed Tasks

---

## PHASE 1: Role System Foundation

### T1.0 Understand and Confirm Requirements
- **Dependency**: None
- **Description**: Review this plan with the user to confirm architecture decisions
- **Test to be performed**: User verbal/written confirmation
- **Success criteria**: Agreement on hybrid approach (single schema first)

### T1.1 Create Role Type Definitions
- **Dependency**: T1.0 ✅
- **Description**: Create `src/auth/types/roles.types.ts` with role enums and guards
- **Test to be performed**: TypeScript compilation check
- **Test script creation**: `src/auth/types/roles.types.spec.ts`
- **Success criteria**: All role types exported correctly
- **File size constraint**: Under 50 lines

**File: `src/auth/types/roles.types.ts`**
```typescript
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<RoleType, number> = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.ADMIN]: 50,
  [ROLES.USER]: 10,
};

export const isRoleHigherOrEqual = (userRole: RoleType, requiredRole: RoleType): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};
```

### T1.2 Update Users Schema with Role Field
- **Dependency**: T1.1 ✅
- **Description**: Modify `src/database/schema.ts` to add role, phone, first_name, last_name, status, updated_at fields
- **Test to be performed**: Generate migration and verify SQL
- **Test script creation**: Migration test script
- **Success criteria**: Migration runs without errors, existing data preserved
- **File size constraint**: Under 40 lines

### T1.3 Create Database Migration
- **Dependency**: T1.2 ✅
- **Description**: Run `pnpm drizzle-kit generate` to create migration
- **Test to be performed**: `pnpm drizzle-kit push` on test database
- **Success criteria**: Migration applies successfully, no data loss

### T1.4 Update JWT Payload Type
- **Dependency**: T1.1 ✅
- **Description**: Update `src/auth/types/jwt-payload.types.ts` to include role
- **Test to be performed**: TypeScript compilation
- **Success criteria**: JWT payload includes role field

**Example:**
```typescript
export interface JwtPayload {
  sub: number;
  email: string;
  role: RoleType;
  roles: string[]; // Keep for backwards compatibility
  jti: string;
  iat?: number;
  exp?: number;
}
```

### T1.5 Update Auth Service for Roles
- **Dependency**: T1.2 ✅, T1.4 ✅
- **Description**: Modify `auth.service.ts` to:
  1. Include role in JWT on login
  2. Support role assignment on registration (default: USER)
  3. Allow SUPER_ADMIN to register ADMIN users
- **Test to be performed**: Integration test with different roles
- **Test script creation**: `src/auth/auth.service.spec.ts` update
- **Success criteria**: JWT contains correct role, role persisted to DB

### T1.6 Create Role Guard
- **Dependency**: T1.4 ✅
- **Description**: Create `src/auth/guards/roles.guard.ts` using @Roles() decorator
- **Test to be performed**: Unit test with mocked ExecutionContext
- **Test script creation**: `src/auth/guards/roles.guard.spec.ts`
- **Success criteria**: Guard correctly validates role hierarchy

**File: `src/auth/guards/roles.guard.ts`**
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [...]);
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => isRoleHigherOrEqual(user.role, role));
  }
}
```

### T1.7 Create @Roles() Decorator
- **Dependency**: T1.6 ✅
- **Description**: Create `src/auth/decorators/roles.decorator.ts`
- **Test to be performed**: Unit test decorator metadata
- **Test script creation**: `src/auth/decorators/roles.decorator.spec.ts`
- **Success criteria**: Decorator sets correct metadata

### T1.8 Create SuperAdmin Guard
- **Dependency**: T1.6 ✅
- **Description**: Create `src/auth/guards/super-admin.guard.ts` for SUPER_ADMIN only routes
- **Test to be performed**: Unit test
- **Test script creation**: `src/auth/guards/super-admin.guard.spec.ts`
- **Success criteria**: Only SUPER_ADMIN passes guard

### T1.9 Integration Tests for Role System
- **Dependency**: T1.1-T1.8 ✅
- **Description**: Create E2E tests for complete role flow
- **Test script creation**: `test/roles.e2e-spec.ts`
- **Success criteria**: All role scenarios pass

---

## PHASE 2: Project System

### T2.1 Create Entities Schema
- **Dependency**: T1.9 ✅
- **Description**: Create `src/database/entities.schema.ts`
- **Test to be performed**: Migration generation
- **Test script creation**: Schema validation test
- **Success criteria**: Entities table created

### T2.2 Create Projects Schema
- **Dependency**: T2.1 ✅
- **Description**: Create `src/database/projects.schema.ts` with relationships
- **Test to be performed**: Migration generation
- **Success criteria**: Projects table with FK to users

### T2.3 Create Project-Users Schema
- **Dependency**: T2.2 ✅
- **Description**: Create `src/database/project-users.schema.ts`
- **Test to be performed**: Migration generation
- **Success criteria**: Junction table with cascading deletes

### T2.4 Create Project-Admins Schema
- **Dependency**: T2.2 ✅
- **Description**: Create `src/database/project-admins.schema.ts`
- **Test to be performed**: Migration generation
- **Success criteria**: Admin-project ownership table

### T2.5 Run All Migrations
- **Dependency**: T2.1-T2.4 ✅
- **Description**: Generate and apply all migrations
- **Test to be performed**: `pnpm drizzle-kit push`
- **Success criteria**: All tables exist in database

### T2.6 Seed Default Entities
- **Dependency**: T2.5 ✅
- **Description**: Create seed script for default entities (BLOG, ECOMMERCE, COURSE, etc.)
- **Test to be performed**: Run seed script
- **Test script creation**: `scripts/seed-entities.ts`
- **Success criteria**: All 6 entities seeded

### T2.7 Create Entities Module
- **Dependency**: T2.6 ✅
- **Description**: Create `src/entities/entities.module.ts` with CRUD operations
- **Test to be performed**: Unit tests
- **Test script creation**: `src/entities/entities.service.spec.ts`
- **Success criteria**: CRUD operations work

### T2.8 Create Projects Module
- **Dependency**: T2.7 ✅
- **Description**: Create `src/projects/projects.module.ts` with full CRUD
- **Test to be performed**: Unit and integration tests
- **Test script creation**: `src/projects/projects.service.spec.ts`
- **Success criteria**: Project CRUD with entity activation

### T2.9 Integration Tests for Projects
- **Dependency**: T2.8 ✅
- **Description**: E2E tests for project operations
- **Test script creation**: `test/projects.e2e-spec.ts`
- **Success criteria**: Project creation, entity activation, user assignment

---

## PHASE 3: User-Project Integration

### T3.1 Create Project Context Middleware
- **Dependency**: T2.9 ✅
- **Description**: Middleware to inject current project into request
- **Test to be performed**: Unit test
- **Success criteria**: `req.project` available in handlers

### T3.2 Create @CurrentProject() Decorator
- **Dependency**: T3.1 ✅
- **Description**: Decorator to extract project from request
- **Test to be performed**: Unit test
- **Success criteria**: Decorator returns project object

### T3.3 Create Project Guard
- **Dependency**: T3.2 ✅
- **Description**: Guard to validate user has access to project
- **Test to be performed**: Unit test
- **Success criteria**: Only project members can access

### T3.4 Update User Service for Project Registration
- **Dependency**: T3.3 ✅
- **Description**: Modify user registration to optionally link to project
- **Test to be performed**: Integration test
- **Success criteria**: User created and linked to project

### T3.5 Integration Tests
- **Dependency**: T3.4 ✅
- **Description**: E2E tests for user-project flows
- **Test script creation**: `test/project-users.e2e-spec.ts`
- **Success criteria**: All scenarios pass

---

## PHASE 4: API Token Enhancement

### T4.1 Update API Tokens Schema
- **Dependency**: T3.5 ✅
- **Description**: Add project_id and scope to api_tokens
- **Test to be performed**: Migration
- **Success criteria**: Columns added, existing tokens get scope='global'

### T4.2 Update Token Creation DTO
- **Dependency**: T4.1 ✅
- **Description**: Modify `CreateApiTokenDto` to accept projectId
- **Test to be performed**: Validation test
- **Success criteria**: DTO accepts optional projectId

### T4.3 Update Token Creation Service
- **Dependency**: T4.2 ✅
- **Description**: Modify `api-tokens.service.ts` for project scope
- **Test to be performed**: Unit test
- **Test script creation**: Update `api-tokens.service.spec.ts`
- **Success criteria**: Tokens created with project scope

### T4.4 Update Token Validation Guard
- **Dependency**: T4.3 ✅
- **Description**: Modify `api-token.guard.ts` to validate project access
- **Test to be performed**: Unit test
- **Success criteria**: Project-scoped tokens only work in their project

### T4.5 Integration Tests
- **Dependency**: T4.4 ✅
- **Description**: E2E tests for project-scoped tokens
- **Test script creation**: Update `test/api-token-flow.e2e-spec.ts`
- **Success criteria**: All token scenarios pass

---

## PHASE 5: Multi-Schema Preparation (Future)

### T5.1 Design Schema Management Service
- **Dependency**: T4.5 ✅
- **Description**: Design service to create/manage project schemas
- **Deliverable**: Technical design document

### T5.2 Create Schema Provisioning
- **Dependency**: T5.1 ✅
- **Description**: Implement dynamic schema creation on project setup
- **Test to be performed**: Schema creation test
- **Success criteria**: New schema created with base tables

### T5.3 Migration Strategy Documentation
- **Dependency**: T5.2 ✅
- **Description**: Document migration from single to multi-schema
- **Deliverable**: Migration playbook

---

## Role-Permission Matrix

| Role | System Access | Project Access | API Token Required | Can Create Projects | Can Create Users |
|------|---------------|----------------|-------------------|---------------------|------------------|
| SUPER_ADMIN | Full | All projects | No (JWT only) | Yes (any) | Yes (any role) |
| ADMIN | Limited | Own projects only | Yes (for entities) | Yes (own) | Yes (USER only) |
| USER | None | Assigned projects | Depends on module | No | No |

---

## Questions for User Confirmation

Before proceeding with implementation, please confirm:

1. **Role Storage**: ✅ Same `users` table with role field (recommended)
   - OR separate tables for each role type?

2. **Implementation Scope**: 
   - Start with Phase 1 only (roles)?
   - OR implement Phases 1-4 fully?

3. **Multi-Schema Timing**:
   - Accept hybrid approach (single schema now, multi-schema later)?

4. **Existing Users Migration**:
   - Default role for existing users: USER or ADMIN?

---

## Next Steps

1. ✅ Confirm architecture with user
2. Begin T1.1 - Create Role Type Definitions
3. Proceed sequentially through Phase 1
4. Validate each step with tests before continuing

---

*Plan created: 2025-12-08*
*Author: Kevin (Architect Agent)*
*Counter: 3*
