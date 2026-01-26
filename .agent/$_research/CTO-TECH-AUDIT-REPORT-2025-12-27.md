# CTO Technical Audit Report — ZodBack (2025-12-27)

## Executive Summary
- ZodBack core architecture (NestJS) is modular, event-driven, and multi-tenant, with internal analytics via Python and a Spring Boot adapter layer added to meet investor requirements.
- Key strengths: clear module boundaries, event bus with dedup options, multi-tenancy guards, payments centralization, and strong developer workflows.
- Key issues: environment variable inconsistency for CORS, optional projectId in events outside strict mode, potential duplication risks with Spring Boot, and cross-language governance requiring formalization.
- Strategic recommendation: enforce polyglot governance (core in NestJS, internal Python, Spring Boot as product adapters only), standardize environment and headers, enable strict flags in production, and expand cross-language tests.

## Architecture State
- Languages & roles:
  - NestJS: core modules (projects, auth, tokens, events, payments). [main.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/main.ts#L16-L21), [app.module.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/app.module.ts#L37-L46)
  - Python: internal control API (8012), Celery workers. [main.py](file:///c:/Users/kevin/Allproject/zodback/python-services/python_services/apps/api/main.py#L39-L50), [auth.py](file:///c:/Users/kevin/Allproject/zodback/python-services/python_services/shared/security/auth.py#L5-L19)
  - Spring Boot: adapters and integrations (port 3020). [application.properties](file:///c:/Users/kevin/Allproject/zodback/spring-services/src/main/resources/application.properties#L1-L2), [HealthController.java](file:///c:/Users/kevin/Allproject/zodback/spring-services/src/main/java/com/zodback/spring/HealthController.java#L10-L13)
- Event Bus: RxJS-based, dedup (in-memory + optional DB), strict mode flag for projectId. [event-bus.service.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/event-bus.service.ts#L62-L72)
- Multi-tenancy: X-Project-Id enforced on product modules; project context hydrated via DB. [project-context.middleware.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/projects/middlewares/project-context.middleware.ts#L57-L66)
- Payments: single authoritative module in NestJS with normalized states. [payments.schema.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/database/payments.schema.ts#L14-L33)
- Ports: NestJS=3013, Frontend=3014, Python=8012, Spring=3020 (updated).

## Identified Issues
1. CORS env mismatch:
   - Backend uses `NEXT_PUBLIC_API_URL` to set CORS origin. [main.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/main.ts#L16-L21)
   - ReadMe recommends `FRONTEND_URL` in backend `.env`. [ReadMe.md](file:///c:/Users/kevin/Allproject/zodback/ReadMe.md#L126-L130)
   - Risk: intermittent CORS failures; resolution: standardize on `FRONTEND_URL`.
2. DomainEvent `projectId` optional unless strict:
   - In non-strict mode, events may be processed without project context. [event-bus.service.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/event-bus.service.ts#L62-L67)
   - Risk: cross-project leakage in consumers; resolution: enable `ENABLE_P3_STRICT=true` in staging/production.
3. Spring Boot duplication risk:
   - Investors requested Spring Boot; danger of replicating core modules.
   - Resolution: enforce rules—no `payments` endpoints in Spring Boot; only event consumers. [Module Payments Spec](file:///c:/Users/kevin/Allproject/zodback/.trae/rules/Module Payments — Spécification complète.md)
4. Port defaults inconsistency:
   - Backend defaults to `PORT=3000` if unset; docs expect 3013. [main.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/main.ts#L54-L57)
   - Resolution: set `.env` PORT=3013 consistently and add validation in startup.
5. Header enforcement variability:
   - ProjectContext requires X-Project-Id only on product routes; risk if new routes bypass enforcement.
   - Resolution: expand enforcePaths and add global guards for cross-cutting endpoints.

## Risk Matrix (Top)
- High: Core duplication via Spring Boot → breaks governance and consistency.
- High: Events without projectId in non-strict environments → cross-tenant leakage.
- Medium: Env variable inconsistencies (CORS/ports) → intermittent failures.
- Medium: Cross-language CI drift → untested integration paths.
- Medium: Security headers missing for internal calls → Python API exposure.
- Low: Dedup DB failures degrade idempotence → transient duplicates.

## Solutions & Trade-offs
- Polyglot governance (recommended):
  - Keep Core in NestJS; Python for internal analytics; Spring Boot for adapters only.
  - Pros: clarity, no duplication, faster iteration; Cons: requires discipline and documentation.
- Strict event mode:
  - Enable `ENABLE_P3_STRICT=true` and optional dedup `ENABLE_P3_DEDUP=true` for production.
  - Pros: safety; Cons: stricter publisher requirements.
- Env standardization:
  - Backend to read `FRONTEND_URL` for CORS; align `.env` across services.
  - Pros: fewer CORS bugs; Cons: small refactor.
- CI enhancements:
  - Add workflows for pnpm lint/test, Maven test, Poetry pytest.
  - Pros: early detection; Cons: increased pipeline time.

## Strategic Recommendations
- Adopt Spring Boot strictly for product adapters and integrations; forbid core duplication by policy and code reviews.
- Standardize environment variables and headers; document required headers (`X-Project-Id`, `X-Request-Id`, `Authorization`).
- Enable strict event handling in non-dev environments; audit consumers for `projectId` validation.
- Expand tests: cross-language e2e covering payment.* events → product entitlements.
- Observability: centralize event processing logs and add correlation by `eventId`.

## Prioritized Action Plan
1. Governance update (Week 1): finalize polyglot rules; communicate to all teams.
2. Env refactor (Week 1): replace CORS origin to `FRONTEND_URL` in backend, update docs.
3. Strict flags (Week 2): enable `ENABLE_P3_STRICT` and configure dedup in staging.
4. CI & tests (Week 2–3): add pnpm lint/test, Maven test, Poetry pytest; add e2e cross-language scenarios.
5. Spring Boot adapters (Week 3–4): implement product consumers for `payment.subscription.activated` and `payment.transaction.succeeded`; verify idempotence.

## KPIs & Indicators
- Tests: unit/integration coverage %, e2e pass rate.
- Events: processed/failed, dedup hit rate, average latency.
- Multi-tenancy: % events containing `projectId`, number of rejected events in strict mode.
- CI health: pipeline success rate, mean time to fix.
- Duplication guard: code review violations count, number of Spring Boot endpoints touching core.

## References
- Backend CORS and bootstrap: [main.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/main.ts#L16-L21)
- Event Bus & strict mode: [event-bus.service.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/event-bus.service.ts#L62-L72)
- Multi-tenancy middleware: [project-context.middleware.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/projects/middlewares/project-context.middleware.ts#L57-L66)
- Payments schema: [payments.schema.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/database/payments.schema.ts#L14-L33)
- Python internal API: [main.py](file:///c:/Users/kevin/Allproject/zodback/python-services/python_services/apps/api/main.py#L39-L50), [auth.py](file:///c:/Users/kevin/Allproject/zodback/python-services/python_services/shared/security/auth.py#L5-L19)
- Spring Boot health & port: [HealthController.java](file:///c:/Users/kevin/Allproject/zodback/spring-services/src/main/java/com/zodback/spring/HealthController.java#L10-L13), [application.properties](file:///c:/Users/kevin/Allproject/zodback/spring-services/src/main/resources/application.properties#L1-L2)
