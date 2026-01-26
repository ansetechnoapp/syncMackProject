# Portfolio Features - Testing Strategy

## Testing Frameworks
- **Backend**: Jest + ts-jest (existing setup)
- **Frontend**: React Testing Library + Jest
- **E2E**: Playwright (optional for critical flows)
- **Integration**: Supertest for API testing

## Test Types Overview

### 1. Unit Tests
**Target**: Individual functions, components, utilities
**Coverage Goal**: >80%

**What to test**:
- Component rendering with different props
- Service methods with mocked dependencies
- Utility functions (validation, formatting)
- Hook behavior (usePortfolioTemplates, etc.)

**Example**:
```typescript
// TemplatePreviewModal.spec.tsx
describe('TemplatePreviewModal', () => {
  it('should render preview with portfolio data', () => {
    const mockData = { projects: [], skills: [] };
    render(<TemplatePreviewModal data={mockData} />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
```

---

### 2. Integration Tests
**Target**: API endpoints, database operations, service interactions
**Coverage Goal**: All CRUD endpoints

**What to test**:
- API request/response cycles
- Database transactions
- Multi-service interactions
- Authentication/authorization flows

**Example**:
```typescript
// categories.integration.spec.ts
describe('Categories API', () => {
  it('POST /portfolio/v1/categories creates category', async () => {
    const res = await request(app)
      .post('/api/portfolio/v1/categories')
      .send({ name: 'Web Development', slug: 'web-dev' })
      .expect(201);
    expect(res.body.name).toBe('Web Development');
  });
});
```

---

### 3. E2E Tests (Critical Flows Only)
**Target**: Complete user workflows
**Coverage Goal**: 3-5 critical paths

**What to test**:
- Template preview → activation flow
- Category creation → project assignment flow
- Template customization → save flow

**Example**:
```typescript
// template-preview.e2e.spec.ts
test('user can preview and activate template', async ({ page }) => {
  await page.goto('/portfolio/templates');
  await page.click('[data-testid="preview-btn-1"]');
  await page.waitForSelector('[data-testid="preview-modal"]');
  await page.click('[data-testid="activate-template-btn"]');
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

---

## Test File Organization

### Backend
```
backend/src/
  portfolio-templates/
    portfolio-templates.service.spec.ts
    portfolio-templates.controller.spec.ts
  portfolio-categories/
    categories.service.spec.ts
    categories.controller.spec.ts
    categories.integration.spec.ts
  portfolio-analytics/
    analytics.service.spec.ts
```

### Frontend
```
frontend/src/
  components/portfolio/
    TemplatePreviewModal.spec.tsx
    CategoryManager.spec.tsx
    TemplateCustomizer.spec.tsx
  hooks/queries/
    usePortfolioCategories.spec.ts
```

---

## Test Templates

### Component Test Template (≤100 lines)
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly with props', () => {
    render(<ComponentName prop1="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    const mockFn = jest.fn();
    render(<ComponentName onClick={mockFn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
```

### Service Test Template (≤100 lines)
```typescript
import { ServiceName } from './service.name';
import { db } from '../database/drizzle-client';

jest.mock('../database/drizzle-client');

describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName();
    jest.clearAllMocks();
  });

  it('should execute method successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    (db.query as jest.Mock).mockResolvedValue(mockData);
    const result = await service.methodName();
    expect(result).toEqual(mockData);
  });
});
```

### Integration Test Template (≤100 lines)
```typescript
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';

describe('Endpoint Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /endpoint creates resource', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/endpoint')
      .send({ data: 'value' })
      .expect(201);
    expect(res.body.id).toBeDefined();
  });
});
```

---

## CI Integration Approach

### Test Execution Order
1. Lint check (`bun run lint`)
2. Type check (`bun run type-check`)
3. Unit tests (`bun test --coverage`)
4. Integration tests (`bun test:integration`)
5. E2E tests (optional, on main branch only)

### CI Script (ci/test-portfolio-features.sh)
```bash
#!/bin/bash
set -e
echo "Running portfolio features tests..."
cd backend && bun test --coverage --testPathPattern="portfolio" && cd ..
cd frontend && bun test --coverage --testPathPattern="portfolio" && cd ..
echo "All tests passed!"
```

---

## Success Criteria
- All tests must pass before moving to next task
- Coverage must be ≥80% for new code
- No flaky tests (tests must be deterministic)
- Test execution time <5min for full suite
- Integration tests use transaction rollback (no DB pollution)
