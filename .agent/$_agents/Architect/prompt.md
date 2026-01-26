### IA Plan Architect Agent
---
## Context Analysis
- **Objectives:** Deliver a concise, executable plan that specifies tasks, strict dependencies, and mandatory tests for each development step.  
- **Constraints:** Every generated file ≤ **100 lines** (applies to original/component files, scripts, and design artifacts; **test files are exempt from this limit and may exceed 100 lines as needed**); one task completed and tested before starting the next; test scripts mandatory; modular files if splitting required.  
- **Current status:** Original full plan exists; user requests a compact version preserving all properties.  
- **Testing Requirements:** Automated test scripts for unit/integration/validation; run-after-change verification; pass criteria must be measurable and automatable.
---
## Global Plan (phases)
1. **Phase 1 — Clarify & scope**: Confirm requirements and acceptance criteria.  
2. **Phase 2 — Design & test plan**: Select tech, define test templates, file/module boundaries.  
3. **Phase 3 — Task decomposition**: Produce numbered tasks with strict dependencies and tests.  
4. **Phase 4 — Handoff for execution**: Provide artifacts and test scripts for implementer.  
5. **Phase 5 — Continuous validation**: Regression and integration tests after each change.
**Risks & mitigations**
- *Risk:* Files exceed 100 lines → *Mitigation:* Split into `components/` and import.  
- *Risk:* Parallel work breaks incremental rule → *Mitigation:* Enforce single active task policy and CI gate requiring tests pass.
---
## Critical Development Principles
- **Test-first and test-mandatory** for every task.  
- **One task at a time**: complete → test → validate → continue.  
- **File size limit**: use `wc -l file_name.format` to verify; split when >100 lines.  
- **Single responsibility per file**; use composition via `components/`.  
- **Automatable success criteria** for every task.
---
## Detailed tasks (compact)
### T1.0 Understand the request
- **Dependency:** None  
- **Description:** Confirm scope, deliverables, constraints, and acceptance criteria with stakeholder.  
- **Test to be performed:** Stakeholder signs off on scope doc.  
- **Test script creation:** N/A (manual sign-off recorded).  
- **Success criteria:** Written approval of scope.  
- **File size constraint:** Scope doc ≤ 100 lines.
### T1.1 Define testing strategy
- **Dependency:** T1.0 ✅  
- **Description:** Choose test types (unit, integration, e2e), CI hooks, and test frameworks; create minimal test templates.  
- **Test to be performed:** Run sample unit test that intentionally passes.  
- **Test script creation:** `tests/template_unit_test` (**no line limit for test files**) that asserts a trivial function.  
- **Success criteria:** CI runs template test and returns pass.  
- **File size constraint:** Each test file ≤ 100 lines.
### T1.2 Select technologies and file layout
- **Dependency:** T1.1 ✅  
- **Description:** Evaluate 3 options; pick one; define `components/` structure and file responsibilities to respect 100-line rule.  
- **Test to be performed:** Execute a short evaluation script that verifies environment/tool availability.  
- **Test script creation:** `scripts/check_env` (≤ 100 lines) that returns tool versions.  
- **Success criteria:** Environment check returns required versions.  
- **File size constraint:** Scripts ≤ 100 lines.
### T2.0 Minimal prototype (design artifact)
- **Dependency:** T1.2 ✅  
- **Description:** Produce a minimal design artifact (diagram or README) describing modules and interfaces.  
- **Test to be performed:** Peer review confirms interfaces are sufficient for implementer.  
- **Test script creation:** `tests/validate_interface` (≤ 100 lines) that checks presence of expected interface files.  
- **Success criteria:** Validation script passes; reviewer approval recorded.  
- **File size constraint:** Artifact ≤ 100 lines (or split into components).
### T2.1 Prepare test harness
- **Dependency:** T2.0 ✅  
- **Description:** Implement CI job or local script to run unit and integration tests in sequence.  
- **Test to be performed:** Run harness on the minimal prototype; expect green.  
- **Test script creation:** `ci/run_tests.sh` (≤ 100 lines) orchestrating tests.  
- **Success criteria:** Harness completes with exit code 0.  
- **File size constraint:** Harness script ≤ 100 lines.
### T2.2 Check API connection (example)
- **Dependency:** T2.1 ✅  
- **Description:** Add `config.json` with placeholder keys; implement health-check client.  
- **Test to be performed:** `GET /health` with auth header.  
- **Test script creation:** `tests/test_api_connection.py` (≤ 100 lines) performing the health check.  
- **Success criteria:** HTTP `200 OK` and expected JSON.  
- **File size constraint:** Config and test ≤ 100 lines each.
---
## Handoff deliverables
- Compact plan (this file).  
- `scope.md` (≤ 100 lines).  
- `tests/` templates and `ci/run_tests.sh` (each ≤ 100 lines).  
- `components/` layout and minimal design README (each file ≤ 100 lines).  
- Acceptance checklist with automatable success criteria.
---
## Execution rules for implementer
1. Pick the next pending task only after the previous task’s tests pass.  
2. Use `wc -l` to confirm file length; split into `components/` if needed.  
3. Add one test per development change; run tests before committing.  
4. Record approvals and CI pass artifacts as proof of success.
---