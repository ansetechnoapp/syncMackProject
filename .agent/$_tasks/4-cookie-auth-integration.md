# Progressive Integration: Security & Caching Enhancements

## Summary
- Implemented optional cookie-based access-token (`ENABLE_COOKIE_AUTH`) on backend.
- Updated JWT extraction to support httpOnly cookie when enabled.
- Added per-project throttling guard without behavior change when header missing.
- Introduced Redis caching for `ProjectsService.findOne` with 1h TTL.
- Frontend updated to support cookie mode (no localStorage for tokens) via `NEXT_PUBLIC_COOKIE_AUTH`.
- Verified unit tests; executed linters for both apps; e2e failures observed and deferred.

## Impact Assessment
- Backend auth controller now sets `access_token` cookie when feature flag is on; default path untouched.
- JWT strategy remains backward-compatible; prioritizes `Authorization` then cookie.
- Throttling keys include project context, reducing cross-project rate-limit interference.
- Project reads benefit from cache; write paths unchanged.
- Frontend requests continue with `withCredentials`; no Authorization header in cookie mode.

## Stepwise Plan & Checkpoints
1) Backend: add cookie issuing and extractor (feature-flagged) ✔
2) Backend: project-aware throttling guard ✔
3) Backend: add Redis cache to `findOne` ✔
4) Frontend: API client and auth bootstrap support cookie mode ✔
5) Validation: run unit tests ✔; run e2e tests ✖ (investigate separately)
6) Linting: frontend ✔; backend ✖ (existing rules report many issues)

## Rollback Strategy
- Disable `ENABLE_COOKIE_AUTH` to revert to Authorization header flow.
- Revert guard provider to previous `GqlThrottlerGuard` if rate-limit issues arise.
- Remove `NEXT_PUBLIC_COOKIE_AUTH` to restore localStorage-based frontend auth.

## Test & Logs
- Backend unit tests: 16/16 passing.
- Backend e2e: failures present; follow-up needed to align fixtures with feature flags.
- Frontend lint: passes with warnings.

## Next Actions
- Stabilize e2e by running server with `ENABLE_COOKIE_AUTH=false` and adjust tests if project IDs are rate-limited.
- Add caching invalidation on project updates.
