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

Then open your AI coding tool and tell it:

```
Read .hool/prompts/orchestrator.md and begin Phase 1: Brainstorm
```

That's it. The Product Lead agent takes over from here.

## How It Works

HOOL structures software development into 13 phases, each driven by specialized agents:

```
Phase 0  Project Init ........... Product Lead    (you're here)
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

The Product Lead is the only user-facing agent. All others are dispatched internally. The Governor runs continuously (via loop/cron) to audit agent behavior.

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
      02-spec/
      03-design/
      04-architecture/
      05-fe-scaffold/
      06-be-scaffold/
      07-test-plan/
    operations/                # Live project state
      current-phase.md
      task-board.md
      bugs.md
      issues.md
      inconsistencies.md
      needs-human-review.md
      client-preferences.md     # User tech/product preferences (living doc)
      governor-rules.md          # Hard rules enforced by Governor
      governor-log.md            # Governor audit log
      context/                   # Dispatch briefs for cross-agent context
      dispatch/                  # Dispatch records
    memory/                    # Per-agent memory (hot log, cold log, patterns)
      product-lead/
      fe-tech-lead/
      be-tech-lead/
      fe-dev/
      be-dev/
      qa/
      forensic/
      governor/
    prompts/                   # Agent prompt templates
    hooks/                     # Platform hooks (PL context, governor trigger, etc.)
    metrics/                   # Dispatch counts, session tracking
    logs/                      # Agent execution logs
    mcps.json                  # MCP manifest
    agents.json                # Agent manifest
  CLAUDE.md                    # (claude-code) or .cursor/rules/hool.mdc (cursor)
```

Source code directories (`src/`, `tests/`, etc.) are NOT created by init — they're decided during the Architecture phase and scaffolded by Tech Leads.

## Supported Platforms

| Platform | Instruction file | MCP support |
|----------|-----------------|-------------|
| Claude Code | `CLAUDE.md` | Full (auto-installs to `~/.claude.json`) |
| Cursor | `.cursor/rules/hool.mdc` | Full (auto-installs to `~/.cursor/mcp.json`) |
| Generic | `.hool/prompts/` only | Manual setup |

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
| [deepwiki](https://github.com/asyncfncom/deepwiki-mcp) | Research, architectural patterns | All project types |
| [playwright](https://github.com/playwright-community/mcp) | E2E testing, screenshots | Web, game, animation |

## Commands

```bash
npx hool-cli init              # Scaffold HOOL in current directory
npx hool-cli init --dir ./myapp --platform claude-code --type web-app --mode full-hool
npx hool-cli onboard           # Onboard an existing codebase into HOOL
npx hool-cli onboard --reonboard  # Re-onboard (preserve memory/phases, refresh analysis)
npx hool-cli status            # Show current phase and task summary
npx hool-cli reset             # Reset operations and memory (keeps phase docs)
npx hool-cli mode              # Switch between interactive and full-hool modes
```

Or install globally:

```bash
npm install -g hool-cli
hool init
hool status
```

Update to the latest version:

```bash
npm update -g hool-cli
```

## Repository Structure

```
hool/
  cli/                # The CLI tool (published as hool-cli on npm)
  hool-mini/          # Mini engine: prompts, templates, docs
  hool-mega/          # (future) Full multi-agent engine
```

## Core Principles

- **Measurable = autonomous.** Tests pass or fail. Contracts match or don't. Agents handle these.
- **Subjective = escalate.** Design taste, naming, UX feel — logged to `needs-human-review.md`.
- **File-based state.** All project state lives in markdown files. No databases, no servers.
- **Resumable.** Close your terminal, come back tomorrow. Agents read state files and continue.
- **Boring technology.** Agents choose proven, well-documented stacks. Easy over clever.

## License

MIT
