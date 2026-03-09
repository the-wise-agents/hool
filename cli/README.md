# hool-cli

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

## Install

```bash
npm install -g hool-cli
```

Update to the latest version:

```bash
npm update -g hool-cli
```

## Commands

### `hool init`

Scaffold HOOL in the current directory. Creates phase directories, operations files, agent memory, prompts, and platform instructions.

```bash
hool init
hool init --dir ./myapp --platform claude-code --type web-app --mode full-hool
```

**Options:**
- `-d, --dir <path>` — Project directory (default: `.`)
- `-p, --platform <platform>` — `claude-code`, `cursor`, or `generic`
- `-t, --type <type>` — `web-app`, `browser-game`, `mobile-android`, `animation`, `cli-tool`, `api-only`, `desktop`, `other`
- `-m, --mode <mode>` — `interactive` (default) or `full-hool`

### `hool onboard`

Onboard an existing codebase into HOOL. Scaffolds the full HOOL structure around your existing code (no files are touched), then sets up onboarding tasks for agents to reverse-engineer project docs.

```bash
hool onboard
hool onboard --dir ./myapp --platform claude-code --type web-app
```

If `.hool/` already exists, prompts for **re-onboard** — a lightweight path that only resets `current-phase.md` and prepends onboarding tasks to the task board, preserving all memory and phase docs.

### `hool status`

Show current phase, task summary, bug count, and human review status.

```bash
hool status
```

### `hool reset`

Reset operations files and agent memory. Phase documents are preserved.

```bash
hool reset
```

### `hool mode [new-mode]`

Show or switch execution mode.

```bash
hool mode              # show current mode
hool mode full-hool    # switch to full-hool
hool mode interactive  # switch to interactive
```

## Modes

- **Interactive** (default) — You review and approve spec, design, and architecture (Phases 0-4) before agents build autonomously.
- **Full-HOOL** — You brainstorm the idea, then agents handle everything. Decisions are logged for post-build review.

## Eight Agents

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

The Product Lead is the only user-facing agent. All others are dispatched internally. The Governor runs continuously to audit agent behavior.

## Supported Platforms

| Platform | Instruction file | MCP support |
|----------|-----------------|-------------|
| Claude Code | `CLAUDE.md` | Full (auto-installs) |
| Cursor | `.cursor/rules/hool.mdc` | Full (auto-installs) |
| Generic | `.hool/prompts/` only | Manual setup |

## Links

- [GitHub](https://github.com/the-wise-agents/hool)
- [Full documentation](https://github.com/the-wise-agents/hool#readme)

## License

MIT
