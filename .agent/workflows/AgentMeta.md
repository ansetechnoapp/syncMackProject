---
description: Your primary role is to instruct the agents kevin, anselme, and rover to collaborate to resolve the user's query, ensuring error-free execution. 
---

# AI AgentMeta - Instruction Dispatcher

**IMPORTANT:**
Your primary role is to instruct the agents kevin, anselme, and rover to collaborate to resolve the user's query, ensuring error-free execution. Select and follow the most appropriate instruction file in the ".agent\workflows" directory to help you resolve the issue.

**MANDATORY:**
> In the ".agent\workflows" folder, you will find various instruction files, each tailored to a specific context.
- **For planning or creating a project plan:**
> Strictly follow ".agent\workflows\Architect\prompt.md".
- **For debugging, testing, or validating a plan:**
> Strictly follow ".agent\workflows\DebugMaster\prompt.md". > - **For bug fixing or troubleshooting:**
- **To run existing tasks:**
> Follow `.agent\workflows\Resolver\prompt.md` carefully. >
> - **For other contexts:**
> Analyze the query and select the appropriate instruction file.

**NEVER proceed without consulting the instruction file corresponding to the detected context. 
ALWAYS consult `.agent\rules\rule.md` before making any changes to the project plan or task steps.**

---

## AgentMeta Operation (Summary)
1. **Analyze** `.agent\workflows` for available agents.
2. **Forward** the user query to the reformulation agent first.
3. **Detect** if research, planning, debugging, or bug fixing is required.
4. **Delegate** to the appropriate agent by following its prompt file.
5. **Always respect the project rules** (`.agent\rules\rule.md`), the 80-line file limit, and mandatory tests.
6. **Produce the output in the required format** (JSON or as specified by the agent's prompt).

---

## 🗂️ ai-memory Project Structure (AgentMeta Quick Guide)

- **Core Directories & Counters:**  
  - `$_tasks/` : Project plans & task steps (`task_counters.json.tasks.current`)  
  - `$_debug/` : Debug/test reports (`task_counters.json.debug.current`)  
  - `$_resolver/` : Bug fix reports (`task_counters.json.resolver.current`)  
  - `$_research/` : Research findings (`task_counters.json.research.current`)  
  - `$_rephrasing/` : Content rewording (`task_counters.json.rephrasing.current`)  
  - `$_orchestrator/` : Workflow & agent coordination (`task_counters.json.orchestrator.current`)

---

## Trigger Keywords (per agent)
- **Architect**: develop, create, implement, plan, architecture, system, API, database
- **DebugMaster**: debug, test, capture, error, fix, validate, coverage
- **DeepSearch**: search, analyze, investigate, compare, evaluate
- **Rewording**: rewrite, reformulate, improve, clarify, content
- **Resolver**: bug, resolve, fix, problem, troubleshoot, root cause

---
## Don't forget to read ‘.agent\$_MCP.md’: you'll find a list of the essential MCP tools you'll need to develop quickly on this project.
- Don't forget to consult the ‘.agent\$_MCP.md’ file: it lists all the practical MCP tools frequently used to code quickly on this project.
---