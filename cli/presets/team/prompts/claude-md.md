# HOOL — Agent-Driven SDLC

This project uses the HOOL framework with Agent Teams. Your identity and process come from your agent file (`.claude/agents/<role>.md`). This file contains shared project context that all agents need.

## File Structure

```
project-root/
├── .claude/agents/        ← Agent identity files (product-lead.md, be-dev.md, etc.)
├── .hool/
│   ├── phases/            ← Phase deliverables (spec, design, architecture, contracts, etc.)
│   ├── operations/        ← Operational state (task-board, bugs, issues, metrics, etc.)
│   ├── memory/            ← Per-agent memory (cold, hot, best-practices, issues, etc.)
│   ├── skills/            ← Skill/SME prompts loaded by agents per phase
│   ├── settings/          ← Per-role Claude settings with hooks and permissions
│   ├── browser-profiles/  ← Playwright browser profiles per agent (gitignored)
│   └── logs/              ← Agent dispatch logs (gitignored)
├── src/
│   ├── frontend/          ← Separate git repo (FE Dev + FE Lead own this)
│   └── backend/           ← Separate git repo (BE Dev + BE Lead own this)
```

## Core Rules (All Agents)

- **All state lives in files**: `.hool/phases/`, `.hool/operations/`, `.hool/memory/`
- **Never modify your own agent prompt** — escalate to `.hool/operations/needs-human-review.md`
- **Never modify `governor-rules.md`** — only the Governor or human may change this
- **Read your memory files on boot** — your agent file specifies which ones
- **Before submitting work**: verify you haven't violated your `governor-feedback.md` entries

## Git Architecture (Three-Repo Model)

```
project-root/          ← Project-level git (Product Lead owns)
├── src/frontend/      ← Separate git repo (FE team owns)
└── src/backend/       ← Separate git repo (BE team owns)
```

- `src/frontend/` and `src/backend/` are gitignored at the project level
- Each repo has its own commit history, branch strategy, and optionally a GitHub remote
- Product Lead commits `.hool/` state to the project-level repo
- FE Dev/Lead commit to `src/frontend/`; BE Dev/Lead commit to `src/backend/`

## MCP Tools

| MCP Server | Purpose | Agents |
|------------|---------|--------|
| **context7** | Up-to-date library docs (`resolve-library-id` + `query-docs`) | All agents |
| **deepwiki** | Deep open-source project documentation (`get-deepwiki-page`) | PL, both Leads, both Devs |
| **playwright** | Browser automation, E2E testing, screenshots — headless (globally installed via `npm install -g @playwright/mcp`) | QA, Forensic, FE Dev |
| **playwright-headful** | Visible browser for human-assisted login, debugging, live demos | QA, Forensic, FE Dev, PL |

### Playwright Browser Profiles
- Globally installed (`npm install -g @playwright/mcp`) — persistent binary, not ephemeral npx
- **Shared profile**: Both headless and headful modes share the same browser profile at `.hool/browser-profiles/shared/` via `--user-data-dir`
- Cookies, localStorage, and auth state persist across sessions and across modes (headless ↔ headful)
- User logs in via headful mode → agents test via headless mode with the same auth state
- Agents cannot log into OAuth/2FA services — user must manually log in first (see login-nudge hook)

### Playwright Modes (Headless vs Headful)

Two Playwright MCP servers are configured:

| MCP Server | Mode | Use Case |
|------------|------|----------|
| `playwright` | **Headless** (default) | Automated testing, screenshots, E2E flows. No visible browser. |
| `playwright-headful` | **Headful** (visible) | Human-assisted login, interactive debugging, live demos, showing UI to user. |

**When to use headful (`mcp__playwright-headful__*`):**
- User needs to log into OAuth/2FA services for browser profiles
- User asks to "show me" or "pull up" something in the browser
- Forensic agent needs to visually reproduce a bug with user watching
- Debugging complex UI interactions that need visual inspection

**When to use headless (`mcp__playwright__*`):**
- Automated test execution, screenshot capture, design comparison
- All autonomous work where no human interaction is needed

## Logging Architecture

All agents produce structured logs for full visibility and debugging:

```
.hool/logs/
├── be.log          ← Backend runtime logs (structured JSON, written by BE app)
├── fe.log          ← Frontend runtime logs (console capture, written by FE app)
└── test.log        ← Test execution logs (written by QA during test runs)
```

### Backend Logging (`be.log`)
- **Format**: Structured JSON — one JSON object per line (JSONL)
- **Fields**: `timestamp`, `level`, `category`, `message`, `data` (context object), `correlationId`
- **Categories**: `api.request`, `api.response`, `api.error`, `db.query`, `db.error`, `business.decision`, `auth.*`, `middleware.*`
- **Levels**: `debug` (dev only), `info`, `warn`, `error`
- **Setup**: BE Tech Lead configures logging middleware during scaffold (Phase 4). Every request gets a `correlationId` for tracing.

### Frontend Logging (`fe.log`)
- **Format**: Structured JSON (JSONL), same as backend
- **Fields**: `timestamp`, `level`, `category`, `message`, `data`
- **Categories**: `user.action`, `api.call`, `api.response`, `api.error`, `render.error`, `state.change`, `performance.*`
- **Capture mechanism**: FE Tech Lead sets up a logging utility during scaffold that:
  1. Intercepts `console.log/warn/error` and writes to `.hool/logs/fe.log` via a dev-mode log server (small Express/WS endpoint that receives log events and appends to file)
  2. Wraps API client calls to auto-log requests/responses
  3. Captures unhandled errors via `window.onerror` and `unhandledrejection`
  4. During dev: logs are verbose (debug level). In production builds: info+ only.
- **Why file-based**: Agents (Forensic, QA) need to read FE logs programmatically. Browser console is ephemeral and not accessible to other agents. File-based logs give the same visibility as BE logs.

### Log Usage by Agent
| Agent | Reads | Writes |
|-------|-------|--------|
| BE Dev | `be.log` (debugging own code) | Indirectly (via app logging) |
| FE Dev | `fe.log` (debugging own code) | Indirectly (via app logging) |
| Forensic | `be.log` + `fe.log` (root cause analysis) | — |
| QA | `be.log` + `fe.log` + `test.log` (test evidence) | `test.log` |
| BE Lead | `be.log` (code review context) | — |
| FE Lead | `fe.log` (code review context) | — |

### Debugging Protocol (All Agents)
When investigating issues, ALWAYS check logs FIRST before reading code:
1. Read `.hool/logs/be.log` and/or `.hool/logs/fe.log` (last 50-100 lines)
2. Search for error-level entries, then correlate with request flow using `correlationId`
3. Only after understanding WHAT happened from logs, go to code to understand WHY

## Memory System

Every agent has 11 memory files in `.hool/memory/<agent>/`:

| File | Purpose |
|------|---------|
| `identity.md` | Who they are in this project |
| `skill.md` | Skill prompt pointers + project adaptations |
| `cold.md` | Historical work log (append-only, one-liner summaries) |
| `hot.md` | Crisp recent context (rebuilt after every task) |
| `issues.md` | Issues encountered and their resolutions |
| `best-practices.md` | Patterns `[PATTERN]` and gotchas `[GOTCHA]` |
| `governor-feedback.md` | Corrective feedback from Governor (read-only for the agent) |
| `client-preferences.md` | Per-agent distilled client preferences (written by PL) |
| `operational-knowledge.md` | Deployment details, ports, env vars, infra context |
| `picked-tasks.md` | Currently assigned tasks |
| `task-log.md` | Detailed description of what was done per task |

### Memory Tiers
- **Task Log**: Detailed — what was done, files changed, decisions made
- **Cold Log**: Summaries — one-liner per task/event, chronological
- **Hot Log**: Crisp — recent context only. Structure: `## Compact` → `## Summary` (30 max) → `## Recent` (last 20 verbatim)

## Phases Overview

| # | Phase | Owner |
|---|-------|-------|
| 0 | Init | PL + Human |
| 1 | Brainstorm | PL + Human |
| 2 | Spec | PL + Human |
| 3 | Design | FE Lead + FE Dev |
| 4 | Architecture | Both Leads |
| 5 | Contracts | BE Lead (POC) + FE Lead (rebuttal) |
| 6 | Tasks | Leads (breakdown) + PL (assignment) |
| 7 | Implementation | FE Dev + BE Dev (TDD) |
| 8 | Review | Tech Leads |
| 9 | QA | QA Agent |
| 10 | Forensic | Forensic Agent |
| 11 | Ship | PL |
| 12 | Retrospective | PL |

## Execution Modes

- **interactive** (default): Phases 0-4 require human sign-off. Human is OUT after Phase 4.
- **full-hool**: Only Phases 0-1 are interactive. Phases 2-12 are fully autonomous.

Check `.hool/phases/00-init/project-profile.md` for the current mode.

## Shared Operations Files

| File | Purpose |
|------|---------|
| `current-phase.md` | What phase we're in |
| `task-board.md` | All tasks, assignments, status |
| `client-preferences.md` | Global user preferences (tech + product) |
| `needs-human-review.md` | Items requiring human input |
| `governor-rules.md` | Hard rules that must never be violated |
| `bugs.md` | Bug reports from QA |
| `issues.md` | Tech debt and code issues |
| `inconsistencies.md` | Doc-vs-code or doc-vs-doc mismatches |
| `metrics.md` | Tool call and dispatch counters |
| `governor-log.md` | Governor audit trail |
