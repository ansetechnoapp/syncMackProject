# 🧠 Code Quality Standards – Next.js + Supabase Project
> **Goal:** Maintain a clean, stable, and scalable codebase.
---
## ✅ 1. Syntax Error Prevention
- **Review code before every commit** (`pre-commit`)
- Use **linters** (`eslint`) and **formatters** (`prettier`)
- **Test incrementally**, step-by-step
- Double-check **JavaScript/TypeScript syntax** and variable naming
---
## 🧪 2. Testing Setup First
- Set up and configure a **testing library** before development begins
  - Recommended: `vitest`, `jest`, or `@testing-library/react`
- Include unit tests, component tests, and integration tests in the base setup
---
## 🚀 3. Feature Development Workflow
### Follow these steps:
a) Work on **one feature at a time**  
b) Break the feature down into **simple sub-tasks**  
c) For each task:
- 🔹 Write a **test first**
- 🔹 Implement **only what's needed** to pass the test
- 🔹 Run the test ✅
- 🔹 If it passes ➝ move to next task
- 🔹 If it fails ➝ **debug, fix, retest**
d) Only move to the next feature after **all tests pass**
---
## 🧭 4. Core Principles
- **Single Responsibility**: one task = one purpose
- **Test Early, Test Often**
- **Iterate Until Success**
- **Keep the Codebase Stable**
---
## 🧩 5. Problem Solving Strategy
> Always break down the problem into **clearly defined tasks**.
---
## 🧱 6. Task Breakdown
- **Analyze**: Understand goals and constraints  
- **Decompose**: Break into sequenced tasks, identify dependencies  
- **Plan**: Estimate effort, define milestones  
- **Execute & Review**: Track progress, validate outcomes, adjust as needed  
---
## 🧬 7. Supabase & Database Best Practices
- Follow clear **SQL naming conventions**
- For **any schema modification**:
  - Analyze the impact
  - Ensure backward compatibility
  - Backup the database
- Always test changes before pushing to production
- Document every change or migration inside `docs/database/`
---
## 🗑 8. Deletion Protocol
- **Never delete files or folders directly**
- Move obsolete files to the `useless/` directory
---
## 🧪 9. Testing Guidelines
- **Organization**: Place tests inside `__tests__/`, `tests/`, or next to components (e.g. `Component.test.tsx`)
- **Execution**:
  - Isolate the test environment
  - Reset Supabase test data between test runs
  - Use `vitest`, `jest`, or `@testing-library`
- **Maintenance**: Update tests whenever the code changes
- **Documentation**:
  - Add setup instructions
  - Define expected test results
---
## 📚 10. Don't forget to read ‘.ai-memory\$_rules\MCP.md’: you'll find a list of the essential MCP tools you'll need to develop quickly on this project.
- Don't forget to consult the ‘.ai-memory\$_rules\MCP.md’ file: it lists all the practical MCP tools frequently used to code quickly on this project.
---
## 📦 11. Package Manager

- Use **pnpm** as the primary package manager
- Do not mix with `npm` or `yarn` in the same project
---
## 📝 12. Logging Guidelines
- **Systematically consult logs** during backend/API development for immediate debugging and rapid error identification.
- **Check for the existence of a logging system** before any intervention.
- **Evaluate its clarity**: If a system exists, analyze whether it can be intuitively understood by any developer without explanatory documentation.
- **Implement a structured pattern if necessary**:
  - Adopt a standardized logging model (e.g., structured ELK/JSON pattern).
  - Guarantee consistent log localization (dedicated folders, centralization).
  - Prioritize self-description (contextual messages, severity levels).
- **Aim for developer autonomy**: The final system must enable anyone to find logs instantly, understand their management flow, and debug efficiently without recourse to documentation.
- This approach guarantees:
  - Immediate traceability of errors.
  - A maintainable basis for the team.
  - Reduced dependence on documentation.
---
## 📚 13. Documentation Guidelines
- **Organize** docs inside the `docs/` directory  
- **Consistency**: Use a uniform structure and tone  
- **Keep it updated**: Update docs with each new feature or change  
---