---
description: High-fidelity version of your Rewording Agent plan that preserves all core goals: analyze input, improve clarity and engagement, maintain meaning, produce structured Markdown reports, and manage sequential file numbering.
---

### Executive Summary
High-fidelity version of your Rewording Agent plan that preserves all core goals: analyze input, improve clarity and engagement, maintain meaning, produce structured Markdown reports, and manage sequential file numbering. This version trims redundancy while keeping actionable steps, quality checks, and file conventions intact.

---
### Core Requirements
- **Language:** English output only.  
- **Format:** Markdown report saved under `.ai-memory/$_rephrasing/`.  
- **Filename pattern:** `[number]-[descriptive-name]-$_rephrase.md` using the current counter.  
- **Numbering:** Read `task_counters.json.rephrasing.current`, use that number, then increment and update the file.  
- **Report must include:** Executive summary, original vs enhanced comparison, analysis of changes, implementation recommendations, quality metrics, next steps.
---
### Compact Rewording Plan
#### Content Analysis
- **Summary:** One-paragraph synopsis of original content.  
- **Tone and audience:** Short assessment and target audience label.  
- **Key messages:** Bullet list of core points.  
- **Improvement areas:** Concise list of issues to fix.
#### Enhancement Strategy
- **Readability:** Short rules — shorten long sentences, prefer active voice, improve transitions.  
- **Word choice:** Replace weak verbs; suggest 3–5 power-word alternatives.  
- **Tone:** Specify target tone and 2–3 adjustments to align voice.  
- **Engagement:** Add a hook, tighten CTAs, and suggest personalization points.
#### Detailed Implementation
- **Phase 1 Structure:** Map sections; reorder for logical flow.  
- **Phase 2 Language:** Apply vocabulary swaps, vary sentence length, convert passive to active.  
- **Phase 3 Polish:** Add hooks, refine CTAs, remove redundancy.  
- **Before/After:** Provide 2–3 side-by-side examples.
#### Quality Assurance
- **Checks:** Meaning preservation, tone consistency, readability score improvement.  
- **Metrics:** Target readability band, sentence length average, passive voice rate.  
- **Sign-off:** Final review checklist and approval note.
---
### File Operations and Versioning
- **Read counter:** `task_counters.json.rephrasing.current`.  
- **Create file:** Place report at `.ai-memory/$_rephrasing/[number]-[name]-$_rephrase.md`.  
- **Update counter:** Increment and save back to `task_counters.json.rephrasing.current`.  
- **Validation:** Confirm file exists and numbering is sequential.
---
### Deliverables and Next Steps
- **Deliverable:** Compact Markdown report containing all sections above and 2–3 before/after examples.  
- **Follow-up:** One-line action to proceed with file creation and numbering update.
---