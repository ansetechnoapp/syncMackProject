Title: Advice.md Integration – Phase 2 (Toast System)

Objective
- Implement accessible toast notifications with provider, hook, and component, validated by unit tests and a11y checks.

Agent & Rule Compliance
- Followed `.ai-memory/$_agents/AgentMeta/prompt.md` to consult agents and maintain sequence.
- Consulted `kita` via `.ai-memory/$_agents/Rephrasing/prompt.md` for concise objective and deliverables.
- Verified `.ai-memory/$_rules/rule.md` for pnpm usage, tests-first, and documentation standards.
- Used only `pnpm` commands; avoided npm/yarn.

Scope (Phase 2)
- Provider and hook: `ToastProvider` and `useToast` (create, dismiss, auto-dismiss).
- Component: `Toast` with `success|error|info` variants and ARIA roles.
- Integration: Wrap app in `ToastProvider` at `frontend/app/layout.tsx`.
- Tests: Unit tests for show/dismiss/auto-dismiss and jest-axe accessibility.

Changes Implemented
- `frontend/src/providers/ToastProvider.tsx`: Context store, container, keyboard dismiss, ARIA live region.
- `frontend/src/components/feedback/Toast.tsx`: Presentational component for standalone use.
- `frontend/app/layout.tsx`: Wrap children with `ToastProvider` inside `AuthProvider`.
- `frontend/src/components/feedback/__tests__/Toast.test.tsx`: Unit tests and a11y validation.

Verification
- Targeted tests: `pnpm --dir frontend test -- src/components/feedback/__tests__/Toast.test.tsx` → passed.
- A11y suite: `pnpm --dir frontend test:a11y` → passed.
- Note: Full test run currently reports failures in legacy `src/lib/errors/__tests__/ErrorBoundary.test.tsx`; unrelated to Phase 2 changes and will be handled in T3.3.4.

Impact Assessment
- Frontend-only provider and UI additions; no backend changes.
- Accessible roles: `status` for info/success, `alert` for error; `aria-live` configured.
- Minimal styling via Tailwind classes; no global CSS changes.

Rollback
- Changes are isolated and small; revert by removing provider import in `app/layout.tsx` and the added files.

Next Phases
- Phase 3: Auth flow refactors and forgot-password wizard.
- Phase 4: Wizard framework and blog creation flow.
- Phase 5: Error pages and network error banners.

---

Python Integration — Phase B (Internal API)

Objective
- Implement internal FastAPI endpoints and DTOs mirroring `advice2.md` contracts.

Scope (Phase B)
- Endpoints:
  - `POST /internal/analytics/recompute`
  - `GET /internal/jobs/{job_id}`
  - `GET /internal/analytics/results`
  - `POST /internal/reporting/generate`
- DTOs: `RecomputeRequest`, `JobStatus`, `ReportingRequest`, `ReportingResponse`.

Changes Implemented
- `python-services/apps/api/main.py` with endpoints returning contract-compliant JSON.
- `python-services/apps/analytics/service.py` DTOs for recompute and job status.

Verification
- Tests in `python-services/tests/test_api_contracts.py` cover all four endpoints.

Impact Assessment
- Internal-only API with strict header checks; no public exposure.

Rollback
- Remove added files or disable process starting the FastAPI app.
