# HOOL CLI

One command to install the entire agent-driven SDLC framework into any project.

## Usage

```bash
npx hool init
```

That's it. Everything else is automatic.

## What `hool init` does

### Step 1: Ask project type
```
What are you building?
  1. Web application
  2. Browser game
  3. Mobile app (React Native)
  4. Animation / motion
  5. CLI tool
  6. API / backend only
```

### Step 2: Create project structure
Based on selection, creates:
```
your-project/
  phases/
    00-init/
      project-profile.md
    01-brainstorm/
      brainstorm.md
    02-spec/
      spec.md
    03-design/
      design.md
      cards/
    04-architecture/
      architecture.md
      contracts.md
      schema.md
      flows.md
      fe/
      be/
    05-fe-scaffold/
      fe-lld.md
    06-be-scaffold/
      be-lld.md
    07-test-plan/
      test-plan.md
  operations/
    current-phase.md
    task-board.md
    bugs.md
    issues.md
    inconsistencies.md
    needs-human-review.md
  memory/
    product-lead/
      hot.md, cold.md, best-practices.md, issues.md
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
  logs/
    fe.log
    be.log
  src/
    frontend/
    backend/
  tests/
    unit/
    integration/
    e2e/
  .hool/
    mcps.json
    prompts/          <- agent prompts (copied from hool-mini templates)
  CLAUDE.md           <- injected with HOOL product-lead instructions
```

### Step 3: Check & Install MCPs (global)
MCPs are installed GLOBALLY (once per machine, not per project).

On first run:
```
Checking global MCPs...
  ok context7 -- already installed
  !! playwright -- not found

Install missing MCPs globally? (y/n)
  Installing playwright -> ~/.claude/mcp_servers.json ok
```

Required MCPs by project type:
```
ALL projects:     context7
Web app:          + playwright
Browser game:     + playwright
Mobile app:       + adb MCP (warn if adb CLI not on PATH)
Animation:        + playwright
CLI / API only:   (no additional)
```

Writes to `~/.claude/mcp_servers.json` (global, shared across all projects).

### Step 4: Set up Claude Code integration
Injects HOOL product-lead instructions into project CLAUDE.md so that when you open Claude Code in this project, it knows:
- The phase structure
- Which agent prompts to load
- Where state files live
- Which MCPs are available

### Step 5: Initialize status files
Creates all status files with empty templates:
- `operations/current-phase.md` -> Phase 0, awaiting start
- `operations/task-board.md` -> empty
- `operations/bugs.md`, `operations/issues.md`, `operations/inconsistencies.md`, `operations/needs-human-review.md` -> empty
- All agent memory files (`memory/<agent-name>/hot.md`, `cold.md`, `best-practices.md`, `issues.md`) -> initialized with headers

### Step 6: Write project MCP manifest
Creates `.hool/mcps.json` -- a READ-ONLY manifest declaring which global MCPs this project uses. Not an installer, just a reference.
```json
{
  "required": ["context7", "playwright"],
  "optional": ["hool-context-mcp"],
  "domain": "web-app"
}
```

### Step 7: Done
```
HOOL initialized for: Web Application

  Start building:
    $ claude
    > /hool start

  Or manually:
    > Read .hool/prompts/product-lead.md and begin Phase 1: Brainstorm

  Global MCPs verified: context7, playwright
  Project profile: web-app
  Status: ready for Phase 1 -- Brainstorm
```

## Other commands

```bash
npx hool init              # bootstrap everything
npx hool status            # show current phase + task board summary
npx hool add-mcp <name>    # install an additional MCP
npx hool reset             # reset status files (keep phases/)
npx hool upgrade           # update prompts/agents to latest version
```

## How it ships

```
npm package: hool
  bin: hool
  contains:
    - CLI (Node.js)
    - Prompt templates (markdown)
    - MCP installer logic
    - CLAUDE.md generator
```

Install globally or use npx:
```bash
npm install -g hool    # global
npx hool init          # one-shot
```

## MCP Installation Strategy

MCPs install GLOBALLY -- one install per machine, shared across all projects.

```
npm-based MCPs (context7, playwright):
  -> writes to ~/.claude/mcp_servers.json (global)

Python-based MCPs:
  -> pip/uvx install, writes to ~/.claude/mcp_servers.json (global)

Custom MCPs (hool-context-mcp):
  -> installed globally, reads per-project config from .hool/context-config.json

System tools (adb):
  -> Check if installed on PATH, warn if not, provide install instructions
  -> Don't auto-install system-level tools
```

## Global vs Project-Level

```
GLOBAL (~/.claude/mcp_servers.json):
  - MCP server binaries and configs
  - Installed once, available to all projects
  - `hool init` checks and installs missing ones

PROJECT-LEVEL (.hool/mcps.json):
  - Read-only manifest: which MCPs this project uses
  - NOT an installer -- just a reference
  - Helps `hool init` know what to check globally

PROJECT-LEVEL (.hool/context-config.json):
  - hool-context-mcp reads this for per-project indexing config
  - Which dirs to watch, chunking rules, ignore patterns
```
