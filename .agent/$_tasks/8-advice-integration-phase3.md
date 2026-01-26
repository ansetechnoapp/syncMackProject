# Advice Integration — Phase 3 (P0 consolidation)

## Scope
- Source: `c:\Users\kevin\Allproject\zodback\advice.md`
- Goal: Integrate P0 backlog items progressively and safely without destabilizing the system.

## Summary of Changes
- Payments module already present (`backend/src/payments/*`). Verified health endpoint, provider abstraction, RLS, and events.
- Made product modules passive financially:
  - Conditional import of `PaymentsModule` in e-commerce (`backend/src/ecommerce/ecommerce.module.ts`).
  - Optional injection of `PaymentsService` in `EcommerceService` with guarded checkout (`backend/src/ecommerce/ecommerce.service.ts`).

## Impact Assessment
- Architecture: Aligns with “provider-agnostic” and “event-driven” principles. Reduces tight coupling between product modules and payments.
- Data: No schema changes; RLS policies for payments are already enforced (`backend/drizzle/0016_rls_payments.sql`).
- Runtime: When `ENABLE_PAYMENTS=false`, orders stay `pending_payment` and can be fulfilled via mocked events in tests.

## Integration Strategy
1. Validate existing payments capabilities against advice:
   - API: `/api/payments/v1/*` present (`backend/src/payments/payments.controller.ts`).
   - Provider abstraction implemented (`payment-provider.ts`, `dummy.provider.ts`).
   - Events emitted (`payment.transaction.succeeded`, `payment.subscription.*`).
   - Webhook verification + idempotence via Redis.
2. Decouple product modules:
   - Conditional module wiring to allow isolated runs without payments.
   - Optional service usage with null-safe guards.
3. Test each change:
   - `pnpm test` — all suites passed (25/25).
4. Gate for safe rollout:
   - Feature flag `ENABLE_PAYMENTS` controls activation.

## Rollback & Safety
- Code rollback: revert the two changes in `ecommerce.module.ts` and `ecommerce.service.ts`.
- Runtime rollback: set `ENABLE_PAYMENTS=true` (default) to re-enable payments everywhere.
- DB safety: payments tables are append-only; RLS prevents cross-project reads. No destructive migration in this phase.

## Verification
- Unit tests green: payments, e-commerce, e-learning, auth, projects.
- Health check: `GET /api/payments/v1/health` returns 200.

## Next Checkpoints
- Add explicit FSM helpers for subscription transitions.
- Expand e-commerce tests to assert behavior when payments disabled.
- Ensure no residual price fields in product tables (already removed in schema).

---

Python Integration — Phase C (Workers & Scheduling)

Scope
- Celery app and tasks for `analytics.recompute` and `reporting.generate`.
- Result stubs and job status endpoint for early integration tests.

Changes Implemented
- `python-services/celery_app.py` with broker autodetection via `REDIS_URL` and JSON serialization.
- Tasks return contract-compliant stubs for safe progressive rollout.

Impact Assessment
- Uses Redis already present in backend; tasks are side-effect free initially.

Verification
- API tests pass; tasks invoked via `.delay()` in endpoints without blocking.

Rollback & Safety
- Disable workers by stopping Celery process; API continues to accept requests and return queued status.
