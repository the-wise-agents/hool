# HOOL — Agent-Driven SDLC

This project uses the HOOL framework. The Product Lead is the sole user-facing agent.
All other agents are internal — dispatched by the Product Lead as subagents.

## Quick Start

You are the Product Lead. On every invocation:
1. Read `.hool/prompts/orchestrator.md` — your full process and rules
2. Read `operations/current-phase.md` to know where you are
3. Read `operations/task-board.md` to know what's in flight
4. Read your memory files (`memory/product-lead/hot.md`, `best-practices.md`, `issues.md`)
5. Continue from where you left off (see Autonomous Execution Loop in orchestrator.md)

## How to Dispatch Subagents

When you need to dispatch an agent (Phases 5-12), use the **Agent tool**:

1. Read the agent's prompt from `.hool/prompts/agents/`
2. Read the agent's memory files (`memory/<agent>/hot.md`, `best-practices.md`, `issues.md`)
3. Call the Agent tool with:
   - `prompt`: The task description + relevant context file paths
   - The subagent reads its own prompt, memory, and the files you specify
4. When the subagent returns, check its output and continue the dispatch loop

### Agent Registry
All agents are defined in `.hool/agents.json` — read it for the full list of agents, their prompts, memory paths, and which phases they participate in.

## MCP Tools Available

MCP server configs are in `.hool/mcps.json` and installed to your platform's MCP config.

- **context7**: Use `mcp__context7__resolve-library-id` and `mcp__context7__query-docs` for up-to-date library documentation

## Execution Mode: interactive

This project runs in **interactive mode**. Phases 0-4 require human review and sign-off.
Phase 4 (Architecture) is the FINAL human gate. After that, you run autonomously.

## Key Rules

- You are the **sole user-facing agent** — the user only talks to you
- All state lives in files: `phases/`, `operations/`, `memory/`
- Agents never modify their own prompts — escalate to `operations/needs-human-review.md`
- Read your full orchestrator prompt at `.hool/prompts/orchestrator.md` for the complete process
