### Compact SYSTEMATIC Debugging Framework
**Executive Summary**  
A condensed, test-first 6-step debugging workflow that preserves the original plan’s rigor: define a tight bug boundary, map only the execution path, generate testable hypotheses, validate them with targeted tests, prove the root cause, and deliver a minimal, verified fix with artifacts and file-management rules.
---
### Step 1 SCOPE Bug Boundary
**Output**
```
### Bug Boundary Established
**In Scope**: [files/functions/modules directly involved]
**Out of Scope**: [explicitly ignored items and why]
**Missing Info**: [needed details]
```
**Checklist**: stack trace; minimal repro steps; expected vs actual; env; recent changes.  
**Key questions**: smallest code change to fix this; what modules are definitely NOT involved.
---
### Step 2 YANK Execution Path Map
**Compact Tree Template**
```
🎯 [Entry: function()]
├─ ✅ [Method A] → Status: SUSPECTED (reason) [file:line]
│  └─ ⚠️ [Submethod A1] → BUG LIKELY HERE [file:line]
├─ ✅ [Method B] → Status: CLEAN [file:line]
└─ ❌ [Method C] → Status: EXCLUDED (reason)
```
**Rules**: include only nodes on the failing execution path; add confidence labels and line numbers.
---
### Step 3 SYNTHESIZE Hypotheses
**Hypothesis Template**
```
### Hypothesis N: short description
**Probability**: High/Medium/Low
**Evidence**: Code lines; behavioral clues
**Test Strategy**: targeted test to validate
**Time to Test**: Quick/Medium/Complex
```
**Categories**: Data flow; Control flow; State management; Integration.
---
### Step 4 TEST Validation Protocol
**Per Hypothesis**
1. **Create Test**
```
Test Name: test_hypothesis_N_description
Purpose: validate hypothesis N
Expected: outcome if hypothesis true
```
2. **Execute & Record**
```
Result: PASS/FAIL/INCONCLUSIVE
Observations: logs, outputs
Conclusion: VALIDATED/REJECTED/NEEDS_MORE_DATA
```
**Stop** when root cause is validated.
---
### Step 5 EXECUTE Root Cause Proof
**Root Cause Format**
```
### ROOT CAUSE IDENTIFIED
**Technical Summary**: one-sentence cause
**Location**: file:line
**Mechanism**: step-by-step manifestation
**Trigger Conditions**: exact inputs/state
**Impact**: system effect

### Proof
**Test**: test name that shows the bug
**Before Fix**: failing result
**Prediction**: expected after fix
```
---
### Step 6 MATERIALIZE Minimal Fix and Verification
**Minimal Solution**
```
File: filename
Line X: Replace `old` with `new`
Justification: why minimal change fixes it
```
**Verification Suite**
- **Bug reproduction test**: fails before → passes after  
- **Fix validation test**: passes  
- **Non-regression tests**: list key tests → pass  
- **Edge cases**: list covered scenarios
---
### File Management and Deliverables
- **Format**: Markdown report saved under `.ai-memory/$_resolver/`  
- **Filename**: `[number]-[name]-Report.md` using `task_counters.json.resolver.current` then increment ++  
- **Report skeleton**
```markdown
# Bug Resolution Report [n]
**Project**: name
**Date**: YYYY-MM-DD
**Bug ID**: id
## Executive Summary
## Full Analysis
## Final Solution
## Lessons Learned
```
- **Testing rule**: always write a failing reproduction test first.
---
### QA Checkpoints
- Pre-analysis: scope, repro, env, tests ready.  
- During: each hypothesis has tests and evidence.  
- Delivery: root cause proven; minimal fix; all tests pass; report saved.
---
### Minimal Example (one-line)
**Problem**: regex returns null for Unicode → **Fix**: update regex to Unicode-aware pattern; add null guard; add failing Unicode test then verify.
---