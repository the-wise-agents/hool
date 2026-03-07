# MCP Manifest -- HOOL Mini

Every MCP this framework depends on, who uses it, and how to set it up.

## Installation Model

MCPs install GLOBALLY -- once per machine, shared across all projects.
`hool init` checks `~/.claude/mcp_servers.json` and installs any missing MCPs.
Per-project `.hool/mcps.json` declares which MCPs the project needs (read-only reference).

## Required MCPs

### 1. Playwright MCP
- **What**: Browser automation, E2E testing, screenshots, visual comparison
- **Used by**: QA, Forensic, Design (for reference screenshots)
- **Domains**: Web apps, browser games, animations
- **Does NOT work for**: Mobile apps, native Android games
- **Install**: `npm install @anthropic/mcp-playwright` (or community equivalent)
- **Config**:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-playwright"]
    }
  }
}
```
- **Key tools**:
  - `navigate(url)` -- go to page
  - `click(selector)` -- click element
  - `fill(selector, value)` -- type into input
  - `screenshot(path?)` -- capture current page
  - `evaluate(script)` -- run JS in page context (critical for game state)
  - `waitForSelector(selector)` -- wait for element

### 2. Context7 MCP
- **What**: Up-to-date library/framework documentation lookup
- **Used by**: ALL agents (Product Lead, Tech Leads, FE/BE Dev, QA)
- **Domains**: All
- **Install**: already available as MCP
- **Config**:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp"]
    }
  }
}
```
- **Key tools**:
  - `resolve-library-id(name)` -- find a library's context7 ID
  - `query-docs(library, query)` -- get relevant docs/examples

### 3. DeepWiki MCP (or Web Search)
- **What**: Research, prior art, best practices, competitive analysis
- **Used by**: Product Lead (brainstorm, spec, architecture)
- **Domains**: All
- **Note**: Can substitute with web search MCP if deepwiki unavailable

## Recommended MCPs

### 4. Web Search MCP
- **What**: General web search for inspiration, solutions, comparisons
- **Used by**: Product Lead (brainstorm, design, architecture)
- **Domains**: All

### 5. Filesystem MCP
- **What**: File watching, directory listing (if not using built-in tools)
- **Used by**: Product Lead (monitoring file changes)
- **Note**: Claude Code has built-in file tools, so this is optional

## Domain-Specific MCPs

### 6. ADB MCP (Android)
- **What**: Android Debug Bridge -- device/emulator interaction
- **Used by**: QA, Forensic (mobile only)
- **Domains**: Mobile Android, Android games
- **Provides**:
  - `adb_screenshot` -- capture emulator screen
  - `adb_tap(x, y)` -- tap coordinates
  - `adb_swipe(x1, y1, x2, y2)` -- swipe gesture
  - `adb_logcat(filter?)` -- read device logs
  - `adb_install(apk)` -- install app on emulator
  - `adb_shell(command)` -- run shell command on device
- **Status**: Community MCPs exist, may need custom wrapper
- **Fallback**: Use Bash tool with `adb` CLI directly

### 7. Maestro MCP (Mobile Testing -- Alternative to Detox)
- **What**: Declarative mobile UI testing
- **Used by**: QA (mobile only)
- **Domains**: Mobile Android, Mobile iOS
- **Why over Detox**: YAML-based tests, simpler setup, more agent-friendly
- **Status**: No MCP exists yet -- candidate for custom build
- **Fallback**: Use Bash tool with `maestro` CLI

## Future MCPs

### 8. hool-context-mcp (v0.1 -- we build this)
- **What**: Agentic vector DB for semantic codebase retrieval
- **Used by**: ALL agents
- **Domains**: All
- **Status**: To be built -- see NEXT-v0.1-context-mcp.md

### 9. Notification MCP
- **What**: Notify human when review needed or phase complete
- **Used by**: Product Lead
- **Provides**: Slack/email/desktop notification when `operations/needs-human-review.md` is updated

## MCP Usage Matrix

| Agent | playwright | context7 | deepwiki | web-search | adb | maestro | hool-context |
|-------|-----------|----------|----------|------------|-----|---------|-------------|
| Product Lead (brainstorm) | -- | YES | YES | YES | -- | -- | v0.2 |
| Product Lead (spec) | -- | YES | YES | -- | -- | -- | v0.2 |
| Product Lead (design) | ref screenshots | -- | -- | YES | -- | -- | v0.2 |
| Product Lead (architecture) | -- | YES | YES | YES | -- | -- | v0.2 |
| FE Tech Lead | -- | YES | -- | -- | -- | -- | v0.2 |
| BE Tech Lead | -- | YES | -- | -- | -- | -- | v0.2 |
| QA (plan) | -- | YES | -- | -- | -- | -- | v0.2 |
| FE Dev | -- | YES | -- | -- | -- | -- | v0.2 |
| BE Dev | -- | YES | -- | -- | -- | -- | v0.2 |
| QA (web) | YES | YES | -- | -- | -- | -- | v0.2 |
| QA (mobile) | -- | YES | -- | -- | YES | YES | v0.2 |
| Forensic (web) | YES | -- | -- | -- | -- | -- | v0.2 |
| Forensic (mobile) | -- | -- | -- | -- | YES | -- | v0.2 |
