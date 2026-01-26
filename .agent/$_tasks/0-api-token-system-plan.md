# 🎯 Entity-Based API Token System - Implementation Plan

## Objective
Implement a professional API Token system allowing users to generate distinct API tokens with:
- **Entity-based permissions**: Each token linked to one or more entities (blog, ecommerce, etc.)
- **Granular permissions**: Per-entity permissions (read, write, delete, manage, admin)
- **Expiration control**: Configurable token expiration
- **Full access option**: Wildcard `*` entity for full access
- **External access**: Tokens usable without classic user authentication
- **Security**: Token hashing, revocation, audit trail

---

## Context Analysis

### Objectives
- Allow users to generate multiple API tokens
- Each token associated with specific entities
- Fine-grained permissions per entity
- Token expiration management
- Full access tokens for trusted integrations
- External service access without user session

### Constraints
- NestJS 11 with GraphQL, PostgreSQL/Drizzle ORM
- Must integrate with existing RBAC system
- Files must be under 80 lines (split into components if needed)
- Test-driven development approach

### Current Status
- Basic `ApiTokensService` exists with simple token generation
- Redis service with in-memory fallback is available
- JWT strategy and roles guard are implemented
- Database uses Drizzle ORM with simple users table

### Testing Requirements
- Unit tests for each service/guard
- Integration tests for API endpoints
- E2E tests for complete token lifecycle

---

## Global Plan

1. **Phase 1**: Database Schema & Models
2. **Phase 2**: Authorization Matrix Configuration  
3. **Phase 3**: Token Service Extension
4. **Phase 4**: API Token Guard & Middleware
5. **Phase 5**: Controller & Endpoints
6. **Phase 6**: Testing & Verification

---

## Critical Development Principles
- ✅ **Test script creation is MANDATORY** for each development task
- ✅ **Validate modifications** through testing before proceeding
- ✅ **Keep files under 80 lines** maximum
- ✅ **One task at a time** - complete fully before moving forward
- ✅ **Write → Test → Validate → Continue** workflow

---

## Detailed Tasks

### T1.0 Understand the Request
- **Dependency**: None
- **Description**: Review the API Token system requirements and existing codebase
- **Test to be performed**: Confirm understanding with user
- **Success criteria**: Clear understanding of entity-permission model

### T1.1 Create Database Schema
- **Dependency**: T1.0 ✅
- **Description**: Create `api-tokens.schema.ts` with Drizzle ORM table definition
- **Test to be performed**: Run migration and verify table creation
- **Test script creation**: Create schema validation test
- **Success criteria**: `api_tokens` table exists in PostgreSQL
- **File size constraint**: Under 80 lines

### T1.2 Generate Database Migration
- **Dependency**: T1.1 ✅
- **Description**: Run `pnpm run drizzle:generate` to create migration file
- **Test to be performed**: Apply migration with `drizzle:migrate`
- **Success criteria**: Migration applied successfully

### T2.1 Create Permission Types
- **Dependency**: T1.2 ✅
- **Description**: Create TypeScript interfaces for entities, permissions, and authorization matrix
- **Test to be performed**: TypeScript compilation check
- **Success criteria**: No type errors
- **File size constraint**: Under 80 lines

### T2.2 Create Authorization Matrix
- **Dependency**: T2.1 ✅
- **Description**: Create centralized route → entity → permission mapping
- **Test to be performed**: Unit test for matrix resolution
- **Test script creation**: `authorization-matrix.spec.ts`
- **Success criteria**: Matrix correctly maps routes to entities
- **File size constraint**: Under 80 lines

### T3.1 Create API Token DTOs
- **Dependency**: T2.2 ✅
- **Description**: Create DTOs for token creation, update, and response
- **Test to be performed**: DTO validation tests
- **Success criteria**: All validation rules work correctly
- **File size constraint**: Under 80 lines

### T3.2 Extend Token Service - Generation
- **Dependency**: T3.1 ✅
- **Description**: Implement token generation with entities, permissions, and hash storage
- **Test to be performed**: Unit test for token generation
- **Test script creation**: Extend `api-tokens.service.spec.ts`
- **Success criteria**: Tokens created with correct structure in database
- **File size constraint**: Under 80 lines per file, split if needed

### T3.3 Extend Token Service - Validation
- **Dependency**: T3.2 ✅
- **Description**: Implement token validation against hash, expiration, and revocation
- **Test to be performed**: Unit test for validation logic
- **Success criteria**: Validation correctly identifies valid/invalid tokens

### T3.4 Extend Token Service - Permission Check
- **Dependency**: T3.3 ✅
- **Description**: Implement entity and permission verification for routes
- **Test to be performed**: Unit test for permission checking
- **Success criteria**: Permission check returns correct boolean

### T4.1 Create API Token Guard
- **Dependency**: T3.4 ✅
- **Description**: Create NestJS guard for API token authentication
- **Test to be performed**: Guard unit test
- **Test script creation**: `api-token.guard.spec.ts`
- **Success criteria**: Guard correctly allows/denies based on token
- **File size constraint**: Under 80 lines

### T4.2 Create API Token Decorator
- **Dependency**: T4.1 ✅
- **Description**: Create decorators for route protection
- **Test to be performed**: Decorator integration test
- **Success criteria**: Decorators work on controllers

### T5.1 Extend Controller - Create Token
- **Dependency**: T4.2 ✅
- **Description**: Update POST endpoint to accept entities and permissions
- **Test to be performed**: Integration test for token creation
- **Success criteria**: API returns new token with metadata

### T5.2 Extend Controller - List & Get Tokens
- **Dependency**: T5.1 ✅
- **Description**: Update GET endpoints for token listing with metadata
- **Test to be performed**: Integration test for listing
- **Success criteria**: API returns token list (without secret)

### T5.3 Extend Controller - Revoke Token
- **Dependency**: T5.2 ✅
- **Description**: Implement token revocation with immediate invalidation
- **Test to be performed**: Integration test for revocation
- **Success criteria**: Revoked token immediately fails validation

### T6.1 Create E2E Tests
- **Dependency**: T5.3 ✅
- **Description**: Create complete E2E test suite for API tokens
- **Test to be performed**: Run full E2E suite
- **Test script creation**: `api-tokens.e2e-spec.ts`
- **Success criteria**: All E2E tests pass

### T6.2 Manual Verification
- **Dependency**: T6.1 ✅
- **Description**: Perform manual testing with curl/Postman
- **Test to be performed**: Complete lifecycle test manually
- **Success criteria**: All manual tests pass

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/database/api-tokens.schema.ts` | CREATE | Drizzle schema for api_tokens table |
| `src/database/schema.ts` | MODIFY | Export new schema |
| `src/auth/types/permission.types.ts` | CREATE | TypeScript interfaces |
| `src/auth/config/authorization-matrix.ts` | CREATE | Route → entity mapping |
| `src/auth/dto/api-tokens.dto.ts` | CREATE | Request/response DTOs |
| `src/auth/api-tokens.service.ts` | MODIFY | Extend with entities/permissions |
| `src/auth/guards/api-token.guard.ts` | CREATE | API token guard |
| `src/auth/decorators/api-token.decorator.ts` | CREATE | Route decorators |
| `src/auth/api-tokens.controller.ts` | MODIFY | Extend endpoints |
| `src/auth/auth.module.ts` | MODIFY | Register new providers |

---

## Estimated Timeline
- **Total**: 12-15 hours
- **Phase 1-2**: 2-3 hours
- **Phase 3**: 4-5 hours
- **Phase 4**: 2-3 hours
- **Phase 5**: 1-2 hours
- **Phase 6**: 2-3 hours
