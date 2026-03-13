# HOOL — Human Out Of Loop

Agent-Driven SDLC. Describe what you want to build, then step away. Agents handle spec, design, architecture, implementation, testing, and bug fixing.

## Quick Start

```bash
npx hool-cli init
```

You'll be asked three questions:
1. **Platform** — Claude Code, Cursor, or generic
2. **Project type** — web app, browser game, mobile, CLI tool, API, desktop, animation, or other
3. **Mode** — Interactive (you review spec/design/architecture) or Full-HOOL (fully autonomous)

Then open your AI coding tool and say:

```
Begin Phase 1: Brainstorm
```

The Product Lead agent takes over from here.

## How It Works

HOOL structures software development into 13 phases, each driven by specialized agents:

```
Phase 0  Project Init ........... Product Lead    (you're here after init)
Phase 1  Brainstorm ............. Product Lead    (collaborative)
Phase 2  Spec ................... Product Lead    (interactive: review | full-hool: autonomous)
Phase 3  Design ................. Product Lead    (interactive: review | full-hool: autonomous)
Phase 4  Architecture ........... Product Lead    (interactive: FINAL gate | full-hool: autonomous)
Phase 5  FE Scaffold + LLD ...... FE Tech Lead    (autonomous)
Phase 6  BE Scaffold + LLD ...... BE Tech Lead    (autonomous)
Phase 7  Test Plan .............. QA              (autonomous)
Phase 8  Implementation ......... FE Dev + BE Dev (autonomous, parallel)
Phase 9  Code Review ............ Tech Leads      (autonomous)
Phase 10 Testing ................ QA              (autonomous)
Phase 11 Forensics .............. Forensic        (autonomous)
Phase 12 Retrospective .......... Product Lead    (autonomous)
```

### Two Modes

- **Interactive** (default) — You review and approve spec, design, and architecture before agents build. Phase 4 is the last human gate.
- **Full-HOOL** — You brainstorm the idea, then agents handle everything. Decisions are logged to `needs-human-review.md` for post-build review.

### Eight Agents

| Agent | Role |
|-------|------|
| **Product Lead** | Vision, contracts, doc consistency, phase gating, agent dispatch |
| **FE Tech Lead** | FE scaffold, low-level design, code review |
| **BE Tech Lead** | BE scaffold, low-level design, code review |
| **FE Dev** | Frontend implementation |
| **BE Dev** | Backend implementation |
| **QA** | Test plan, test execution, bug reporting |
| **Forensic** | Root cause analysis, bug triage, fix routing |
| **Governor** | Behavioral auditor, rule enforcement, corrective feedback |

The Product Lead is the only user-facing agent. All others are dispatched as independent CLI sessions via `claude -p --agent <role>`. Each dispatched agent gets its own context window, full MCP access, and role-specific hooks.

### Agent Dispatch

From Phase 5 onwards, the Product Lead dispatches agents autonomously:

```bash
env -u CLAUDECODE claude -p \
  --agent be-dev \
  --settings .hool/settings/be-dev.json \
  --model opus \
  --output-format stream-json \
  --verbose \
  --dangerously-skip-permissions \
  --no-session-persistence \
  "<task prompt>" \
  > .hool/operations/logs/TASK-008-be-dev-01.jsonl 2>&1
```

- Dispatch logs stream as real-time JSON — the PL can monitor progress mid-execution
- Post-dispatch health checks detect context overflow, truncated output, errors, and crashes
- Agents output structured completion reports for cross-checking against `git diff`
- The PL commits all agent work — agents never run git commands

## What Gets Created

```bash
npx hool-cli init
```

Creates this structure in your project:

```
your-project/
  .hool/
    phases/                    # Phase documents (agents create these as they work)
      00-init/
      01-brainstorm/
      02-spec/features/
      03-design/cards/flows/
      04-architecture/contracts/flows/
      05-fe-scaffold/
      06-be-scaffold/
      07-test-plan/cases/
    operations/                # Live project state
      current-phase.md
      task-board.md
      bugs.md
      issues.md
      inconsistencies.md
      needs-human-review.md
      client-preferences.md     # User tech/product preferences (living doc)
      governor-rules.md         # Hard rules enforced by Governor
      governor-log.md           # Governor audit trail
      metrics.md                # Dispatch counts, session tracking
      context/                  # Dispatch briefs for cross-agent context
      logs/                     # Agent dispatch logs (*.jsonl, gitignored)
    memory/                    # Per-agent memory (hot log, cold log, patterns)
      product-lead/
      fe-tech-lead/
      be-tech-lead/
      fe-dev/
      be-dev/
      qa/
      forensic/
      governor/
    checklists/                # Code review checklists
    hooks/                     # Platform hooks (PL context, governor trigger, etc.)
    settings/                  # Per-role settings files (hooks, permissions)
    mcps.json                  # MCP manifest
    agents.json                # Agent manifest
  .claude/
    agents/                    # Agent definitions (7 agents)
    skills/                    # Phase skills (/brainstorm, /spec, /design, /architecture)
    settings.json              # Hooks configuration for Product Lead
  CLAUDE.md                    # (claude-code) or .cursor/rules/hool.mdc (cursor)
```

Source code directories (`src/`, `tests/`, etc.) are NOT created by init — they're decided during the Architecture phase and scaffolded by Tech Leads.

## Onboarding Existing Projects

Already have a codebase? HOOL can reverse-engineer your project:

```bash
npx hool-cli onboard
```

This scaffolds the HOOL structure around your existing code (nothing is touched), then creates 11 onboarding tasks for the Product Lead to:
1. Scan all docs, configs, code structure, and git history
2. Reverse-engineer spec, architecture, contracts, and LLDs
3. Surface bugs, tech debt, and inconsistencies
4. Seed agent memories with codebase-specific patterns
5. Present findings for your review

If `.hool/` already exists, it auto-detects and offers **re-onboard** — a lightweight refresh that only updates the task board and phase, preserving all memory and phase docs.

## Supported Platforms

| Platform | Instruction file | MCP support |
|----------|-----------------|-------------|
| Claude Code | `CLAUDE.md` | Full (auto-installs to `~/.claude/mcp_servers.json`) |
| Cursor | `.cursor/rules/hool.mdc` | Full (auto-installs to `~/.cursor/mcp.json`) |
| Generic | `HOOL-INSTRUCTIONS.md` | Manual setup |

## Project Types

| Type | Skipped Phases |
|------|---------------|
| Web app | None |
| Browser game | BE scaffold |
| Mobile (Android) | None |
| Animation | BE scaffold |
| CLI tool | Design, FE scaffold |
| API only | Design, FE scaffold |
| Desktop | None |
| Other | None |

## MCP Tools

HOOL uses these MCP servers (auto-installed during `hool init`):

| MCP | Purpose | Used by |
|-----|---------|---------|
| [context7](https://github.com/upstash/context7) | Library documentation lookup | All project types |
| [playwright](https://github.com/playwright-community/mcp) | E2E testing, screenshots | Web, game, animation |

## Commands

```bash
hool init                    # Scaffold HOOL in current directory
hool init -d ./myapp -p claude-code -t web-app -m full-hool
hool onboard                 # Onboard an existing codebase into HOOL
hool status                  # Show current phase and task summary
hool reset                   # Reset operations and memory (keeps phase docs)
hool mode                    # Show current execution mode
hool mode full-hool          # Switch to full-hool mode
```

Install globally:

```bash
npm install -g hool-cli
```

Update to the latest version:

```bash
npm update -g hool-cli
```

## Repository Structure

```
hool/
  cli/                # The CLI tool (published as hool-cli on npm)
  hool-mini/          # Mini engine: prompts, agents, hooks, settings, templates
  hool-mega/          # (future) Full multi-agent engine with MCP-based coordination
```

## Core Principles

- **Measurable = autonomous.** Tests pass or fail. Contracts match or don't. Agents handle these.
- **Subjective = escalate.** Design taste, naming, UX feel — logged to `needs-human-review.md`.
- **File-based state.** All project state lives in markdown files. No databases, no servers.
- **Resumable.** Close your terminal, come back tomorrow. Agents read state files and continue.
- **Boring technology.** Agents choose proven, well-documented stacks. Easy over clever.
- **No task too small.** Even one-line changes go through the assigned agent — traceability and memory continuity.

## License

MIT
