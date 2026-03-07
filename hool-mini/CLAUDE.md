# HOOL Mini — Agent-Driven SDLC Framework

This is the orchestration framework for agent-driven software development.
When a user starts a new project using HOOL, the Product Lead manages the entire lifecycle.

## How It Works

1. The **Product Lead is the sole user-facing agent**. The user only talks to the Product Lead — all other agents are internal.
2. Product Lead runs Phase 0: Project Init (asks what we're building, determines routing from project type and mode)
3. Product Lead walks through phases sequentially, gating each transition
4. **Interactive mode** (default): Phases 0-4 are interactive, Phase 4 is the FINAL human gate, then human is OUT
5. **Full-HOOL mode**: Only Phases 0-1 are interactive. Phases 2-12 are fully autonomous — agent makes all decisions, logs them to `needs-human-review.md` for post-build review
6. Autonomous phases: Product Lead runs a dispatch loop — dispatches agents, checks output, routes feedback, advances phases
7. All state lives in files under the active project directory
8. On session resume, Product Lead reads state files and continues from where it left off

## Phase Structure

| # | Phase | Agent | Human? (interactive) | Human? (full-hool) |
|---|-------|-------|------|------|
| 0 | Project Init | Product Lead | Yes | Yes |
| 1 | Brainstorm | Product Lead | Yes | Yes |
| 2 | Spec | Product Lead | Yes | No |
| 3 | Design | Product Lead | Yes | No |
| 4 | Architecture | Product Lead + Tech Leads | Yes (FINAL gate) | No |
| 5 | FE Scaffold + LLD | FE Tech Lead | No | No |
| 6 | BE Scaffold + LLD | BE Tech Lead | No | No |
| 7 | Test Plan | QA | No | No |
| 8a | FE Implementation | FE Dev | No | No |
| 8b | BE Implementation | BE Dev | No | No |
| 9 | Code Review | FE/BE Tech Leads | No | No |
| 10 | Testing | QA | No | No |
| 11 | Forensics | Forensic | No | No |
| 12 | Retrospective | Product Lead | No | No |

## Agents (7 total)

- **Product Lead** — owns vision, contracts, doc consistency, phase gating, agent dispatch
- **FE Tech Lead** — FE scaffold, LLD, code review, code-vs-doc consistency
- **BE Tech Lead** — BE scaffold, LLD, code review, code-vs-doc consistency
- **FE Dev** — frontend implementation
- **BE Dev** — backend implementation
- **QA** — test plan, test execution, bug reporting
- **Forensic** — root cause analysis, bug triage, fix routing

## File Layout (per project)

```
project/
  phases/
    00-init/
      project-profile.md
    01-brainstorm/
      brainstorm.md
    02-spec/
      spec.md                   <- index: overview, data model, NFRs
      features/                 <- per-feature user stories (for larger projects)
    03-design/
      design.md                 <- index: design system, screen inventory, components
      cards/                    <- one HTML design card per screen
      flows/                   <- per-feature user flow diagrams (for larger projects)
    04-architecture/
      architecture.md           <- index: tech stack, system overview, env setup
      contracts/                <- API contracts split by domain area
        _index.md              <- base URL, auth, error format, endpoint summary
      schema.md                 <- single file: all tables, indexes, relationships
      flows/                   <- per-feature flow diagrams (mermaid sequences)
      fe/                      <- FE Tech Lead validation notes
      be/                      <- BE Tech Lead validation notes
    05-fe-scaffold/
      fe-lld.md                <- index: domain decisions, routes, components, conventions
      pages/                   <- per-page implementation specs (for larger projects)
    06-be-scaffold/
      be-lld.md                <- index: domain decisions, services, middleware, conventions
      services/                <- per-service implementation specs (for larger projects)
    07-test-plan/
      test-plan.md             <- index: coverage matrix, test infrastructure
      cases/                   <- test cases split by feature (for larger projects)
  operations/
    current-phase.md
    task-board.md
    inconsistencies.md
    bugs.md
    issues.md
    needs-human-review.md
  memory/
    product-lead/
      hot.md                     <- compacted recent context (loaded every invocation)
      cold.md                    <- full journal (append-only, loaded on-demand)
      best-practices.md          <- accumulated [PATTERN], [GOTCHA] entries (loaded every invocation)
      issues.md                  <- personal issues log (loaded every invocation)
    fe-tech-lead/
      hot.md, cold.md, best-practices.md, issues.md
    be-tech-lead/
      hot.md, cold.md, best-practices.md, issues.md
    fe-dev/
      hot.md, cold.md, best-practices.md, issues.md
    be-dev/
      hot.md, cold.md, best-practices.md, issues.md
    qa/
      hot.md, cold.md, best-practices.md, issues.md
    forensic/
      hot.md, cold.md, best-practices.md, issues.md
  # Everything below is created by agents, NOT by hool init:
  # src/, tests/, logs/ — structure decided in architecture (Phase 4),
  # created by Tech Leads during scaffold (Phases 5-6)
  # Phase doc files (spec.md, design.md, etc.) — created by
  # the owning agent during its phase
```

## Context Management — Agent Memory

Agents are stateless. Files ARE the state. Every agent maintains four memory files in `memory/<agent-name>/`:

### Files Loaded Every Invocation
1. **hot.md** — compacted recent context. Pure recent work state. Rebuilt by the agent after each task from the cold log.
2. **best-practices.md** — accumulated [PATTERN] and [GOTCHA] entries. These are extracted from cold.md and kept here permanently. Never compacted, never summarized.
3. **issues.md** — personal issues log. "I faced X in my role, did Y." Crisp one-liners. Agent notes issues THEY faced and what they did about it.

### File Loaded On-Demand
4. **cold.md** — full journal. Append-only. Every significant event gets a one-liner here. Source of truth for agent history. Agent refers to it when they need to dig deeper into past context.

### Hot Log Structure (hot.md)

```markdown
## Compact (summarized oldest)
Batch summary of oldest entries

## Summary (half-line older entries)
Half-line summaries of middle entries (up to 30)

## Recent (last 20 lines verbatim)
Last 20 entries from cold log
```

### Compaction Rules
- **[GOTCHA] and [PATTERN] entries go to best-practices.md** — NOT in hot.md. Hot.md stays pure recent context.
- **Recent**: last 20 entries verbatim from cold log
- **Summary**: up to 30 half-line summaries of older entries
- **Compact**: when Summary exceeds 30 entries, batch-summarize oldest into Compact section

### Work Log Entry Tags
```
[PHASE]     — phase completion
[DISPATCH]  — agent spawned with task
[REVIEW]    — tech lead flagged issue
[BUG]       — QA found issue
[RESOLVED]  — bug/issue fixed
[ESCALATE]  — needs human input
[GOTCHA]    — trap/pitfall discovered (goes to best-practices.md)
[PATTERN]   — reusable pattern identified (goes to best-practices.md)
[ARCH-*]    — architectural decision or constraint (goes to best-practices.md)
[RETRO]     — retrospective completed after cycle
```

### Single Instance Per Agent
Each agent role runs one instance at a time. Per-agent memory directories enforce this — concurrent instances would corrupt shared state. FE Dev and BE Dev can run in parallel (different agents), but you won't have 2 FE Devs simultaneously. Product Lead dispatches one task at a time per agent role.

### General Context Rules
- Every agent, on every invocation, loads: hot.md + best-practices.md + issues.md
- Cold.md is loaded on-demand when the agent needs to dig into history
- Agents can read other agents' memory files
- Tasks scoped small: 3-5 files max per task
- When an agent is invoked with a task/issue, they check all 3 loaded memory files before starting work

## Testing Layers

1. Static Analysis — hooks, fully autonomous
2. Unit Tests — binary pass/fail, fully autonomous
3. Integration Tests — contract verification, fully autonomous
4. E2E Tests — Playwright + multimodal screenshot comparison
5. Visual Regression — baseline screenshot comparison

## Consistency Layers

1. **Product Lead** — doc-vs-doc consistency (spec matches design matches architecture)
2. **Tech Leads** — code-vs-doc consistency (implementation matches contracts, LLD, schema)
3. **QA** — product works (tests pass, behavior matches spec)

## Autonomy Principle

- Measurable -> autonomous
- Subjective -> escalate to `operations/needs-human-review.md`
- Process/rule change suggestion -> escalate to `operations/needs-human-review.md`
  - Agents NEVER modify their own prompts or rules
  - If an agent believes its process should change, it logs the suggestion to `operations/needs-human-review.md` for human review

## MCP Tools Available

- context7: library documentation lookup
- deepwiki: research and prior art
- playwright: E2E testing and screenshot capture
- web search: inspiration, best practices
- (v0.2) hool-context-mcp: agentic vector DB for semantic retrieval
