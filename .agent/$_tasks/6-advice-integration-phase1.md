Title: Advice.md Integration – Phase 1 (Foundation)

Objective
- Integrate testing infrastructure and core UI feedback components to prepare for T3.3/T3.4 in a safe, incremental manner.

Agent & Rule Compliance
- Followed `.ai-memory/$_agents/AgentMeta/prompt.md` for agent selection.
- Consulted `kita` via `.ai-memory/$_agents/Rephrasing/prompt.md` for structured understanding.
- Verified project rules at `.ai-memory/$_rules/rule.md` (NestJS+Next.js stack, pnpm, tests first).

Scope (Phase 1)
- Testing setup (Jest + RTL + jsdom + jest-axe).
- Error handling basics (ErrorBoundary component).
- Loading feedback primitives (Spinner, Skeleton, LoadingState).

Changes Implemented
- `frontend/package.json`: add test scripts and devDependencies for Jest/RTL/axe.
- `frontend/jest.config.js`: jsdom env, ts-jest transform, coverage, moduleNameMapper `^@/(.*)$`.
- `frontend/jest.setup.ts`: RTL configuration.
- `frontend/src/__tests__/smoke.test.tsx`: baseline test.
- `frontend/src/__tests__/a11y/home.a11y.test.tsx`: a11y smoke with `jest-axe`.
- `frontend/app/error.tsx`: Next.js root error boundary.
- `frontend/src/components/errors/ErrorBoundary.tsx`: reusable error boundary.
- `frontend/src/components/feedback/LoadingState.tsx`: accessible spinner with role="status".
- `frontend/src/components/ui/Spinner.tsx` and `Skeleton.tsx`: UI primitives.
- `frontend/src/__tests__/errors/ErrorBoundary.test.tsx`: fallback rendering test.

Verification
- Branch isolation: `feature/advice-integration-phase1` created.
- Tests: `pnpm --dir frontend test` → pass (21 tests, 5 suites).
- Lint: `pnpm --dir frontend lint` → existing errors in legacy files; Phase 1 changes comply.

Impact Assessment
- Frontend-only additions; backend unaffected.
- Adds 4 new UI/testing files and updates 2 configs; minimal risk.
- Improves reliability by establishing CI-ready tests; prepares ground for T3.3 flows.

Rollback
- Use Git branch for isolation; revert by switching back to main.
- Atomic commits per step recommended; tag stable points after passing tests.

Next Phases (Planned)
- Phase 2: Toast system (`useToast`, `ToastProvider`, `Toast.tsx`) with unit tests.
- Phase 3: Auth flow refactors (login/register split), forgot-password wizard.
- Phase 4: Wizard framework (`useWizard`, components) and blog create flow.
- Phase 5: Error pages (404/403/500) and network banners.
- Phase 6: T3.4 validation: a11y, responsive, Lighthouse, stakeholder/user sessions.

Notes
- Keep all components under ~80 lines by composition.
- Use pnpm exclusively; avoid mixing package managers.

---

Python Integration — Phase A (Foundation)

Objective
- Create isolated Python subsystem skeleton aligned with `advice.md` and `advice2.md` without impacting backend.

Agent & Rule Compliance
- Followed `.ai-memory/$_agents/AgentMeta/prompt.md` and consulted `kita` for structured plan.
- Verified `.ai-memory/$_rules/rule.md` and `.trae/rules/*` for event-driven constraints and security.

Scope (Phase A)
- Structure `python-services/` with `apps/api`, `apps/analytics`, `shared/*`, `celery_app.py`, `pyproject.toml`.
- Security dependency enforcing internal token and headers (`Authorization`, `X-Project-Id`, `X-Request-Id`).
- Structlog JSON logger and analytics DB connector stub.

Changes Implemented
- Added `python-services/pyproject.toml` with Poetry dependencies (FastAPI, Celery, Pydantic v2, SQLAlchemy, structlog, pytest, ruff, mypy).
- Added `python-services/shared/security/auth.py` enforcing internal headers and token.
- Added `python-services/shared/logging/logger.py` returning a JSON logger.
- Added `python-services/shared/db/connection.py` providing `analytics_engine()`.

Verification
- Static contract checks via `python-services/tests/test_api_contracts.py` using FastAPI TestClient.
- No backend changes; NestJS unaffected.

Impact Assessment
- Pure addition; satisfies isolation and internal-only requirement. No DB writes from Python.

Rollback
- Remove `python-services/` directory if needed; no changes to backend.
