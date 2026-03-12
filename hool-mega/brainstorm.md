# HOOL Mega — Brainstorm

## Vision

A **domain-agnostic multi-agent coordination platform** where agents are independent main sessions (not subagents), communicating through an MCP-based coordination layer with persistent multi-format memory.

HOOL Mini = prompt templates + file-based state for a single orchestrator with subagents.
HOOL Mega = infrastructure platform where any number of independent agents coordinate as a team.

The SDLC workflow (what hool-mini does today) becomes a **preset** — one of many possible team configurations.

---

## Core Problems Solved

1. **Subagent limitations** — MCP access buggy, no hooks, no boot injection, context window pressure, can't truly parallelize
2. **File-based coordination breaks at scale** — race conditions, no locking, memory corruption from parallel writes
3. **Domain lock-in** — current HOOL is hardcoded for software engineering. The coordination patterns are generic.
4. **No inter-agent communication** — everything routes through PL, creating a bottleneck
5. **No persistent memory across sessions** — agents forget between invocations unless they manually read/write files

---

## Architecture Overview

### Two-Layer Design

```
┌─────────────────────────────────────────────────┐
│           DOMAIN PRESETS (swappable)              │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ SDLC     │  │ Research │  │ Content      │   │
│  │ (hool)   │  │ Lab      │  │ Studio       │   │
│  │ PL       │  │ Lead     │  │ Director     │   │
│  │ BE Dev   │  │ Analyst  │  │ Writer       │   │
│  │ FE Dev   │  │ Reviewer │  │ Editor       │   │
│  │ QA       │  │ Fact-    │  │ Designer     │   │
│  │ Governor │  │  checker │  │ Publisher    │   │
│  │ Forensic │  │ Compiler │  │ QA           │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
├─────────────────────────────────────────────────┤
│           HOOL CORE (generic platform)           │
│                                                   │
│  Room Engine ─── Memory System ─── MCP Registry  │
│  Task Board ──── Identity/Perms ── Platform Agent│
│  Conversation Stream ── Auto-Compaction          │
└─────────────────────────────────────────────────┘
```

**Core platform** (domain-agnostic): Room engine, memory system, task coordination, identity/permissions, platform agent, MCP registry.

**Domain presets** (swappable): Agent definitions, workflow phases, domain-specific MCP plugins, governance rules, artifact structure.

---

## The Room Model

The central interaction pattern. A "room" is a shared conversation space.

```
┌─────────────────────────────────────────┐
│              THE ROOM                    │
│                                          │
│  [User] <-> [Product Lead]              │
│                    |                     │
│         [be-dev] (called in)             │
│         [qa] (called in)                 │
│         [governor] (observing)           │
│                                          │
│  -- conversation stream --               │
│  User: "the auth flow is broken"         │
│  PL: "Let me bring in forensic"          │
│  PL->Forensic: "investigate auth flow"   │
│  Forensic->PL: "root cause is X"        │
│  PL->User: "Found it. Fix is Y."        │
└─────────────────────────────────────────┘
```

### Room Semantics

- **Persistent participants**: User + Lead agent (always present)
- **Called-in agents**: Lead invites them, they join with relevant context, do work, can leave or stay
- **Observer mode**: Governor/auditor always "in the room" but silent — observes stream, only speaks on violations
- **Agent visibility**: When an agent is "in the room," the user can see its work (not a black box)
- **Lead as mediator**: Agents never address the user directly. They respond to Lead. Lead translates/filters for user.
- **User override**: User can request any agent be called in, or dismiss agents. Lead treats user's wish as command.

### Room MCP Tools

```
hool-mcp-room/
  join_room          # Agent announces presence
  leave_room         # Agent departs
  listen             # Get recent conversation stream (filtered for relevance)
  speak              # Post message to room (tagged with agent identity)
  get_context        # Get current task context from Lead
  request_attention  # Agent asks Lead for something (raising hand)
```

---

## Memory Architecture

### Per-Agent Memory (6 categories)

Every agent gets the same structure. The platform manages storage and compaction.

```
Agent Memory (per agent)
├── work-log/
│   ├── cold (log + vector DB + graph DB)
│   └── hot (log + vector index)
├── governor-feedback/
│   ├── cold (log + graph: which rules, when, why)
│   └── hot (active directives only)
├── user-feedback/
│   ├── cold (log + vector: preference history)
│   └── hot (active preferences + recent corrections)
├── issues/
│   ├── cold (log + vector + graph: all issues, causes, relationships)
│   └── hot (open/unresolved only)
├── best-practices/
│   ├── relevant (active patterns + gotchas)
│   └── retired (no longer applicable, kept for context)
└── context/
    └── relationships (graph-native: decisions, collaborators, dependencies)
```

### Multi-Format Storage

Same memory, three representations:

| Format | Good for | Compaction |
|--------|----------|------------|
| **Simple log** | Chronological scan, human readability, prompt injection | Summarize oldest entries into paragraphs |
| **Vector DB** | "Have I seen something like this before?" (semantic similarity) | Never compact — keep all embeddings |
| **Graph DB** | "What's connected to this?" (traverse relationships) | Prune disconnected nodes, merge equivalents |

### Hot vs Cold

- **Cold**: Full history, append-only, multi-format. The source of truth.
- **Hot**: Recent/relevant summary, auto-compacted by MCP server. What gets loaded into prompt context.
- **Best practices exception**: Uses relevant/retired instead of hot/cold (practices age by applicability, not chronologically).

### Shared Memory (project-level)

Read by ALL agents, written by Lead + governor:

```
shared/
├── decisions.md     # Architectural/product decisions with rationale
├── glossary.md      # Project-specific terms, naming conventions
├── state.md         # Current phase, active tasks, assignments
└── preferences.md   # Client/user preferences (honoured by all)
```

### Auto-Compaction

The MCP server handles compaction automatically. When an agent calls `log_event`:
1. Append to cold log (all 3 formats)
2. Rebuild hot log (last N entries as summary)
3. Extract patterns/gotchas to best-practices
4. Return confirmation

No more relying on agents to self-compact.

### Context/Relationships (Per-Agent)

Each agent tracks relationships relevant to its role:

```
be-dev's context:
  "be-tech-lead decided middleware pattern"
  "I worked with forensic on auth bug"
  "QA flagged auth.test.ts 3 times"
```

Same project events, different agent perspectives. Stored in graph DB with agent-scoped views — same nodes (decisions, files, bugs), different edges per agent (decided, implemented, tested, flagged).

---

## MCP Architecture (Layered)

```
Layer 1: hool-mcp-core          (every agent gets this)
  ├── room tools (join, listen, speak, leave)
  ├── memory tools (read/write own memory, read shared)
  ├── state tools (read phase, read board)
  └── identity tools (who am I, what are my permissions)

Layer 2: hool-mcp-work          (agents that do tasks)
  ├── task tools (claim, complete, block, handoff)
  ├── file tools (read with permission check, write with audit)
  └── test tools (run suite, get results)

Layer 3: hool-mcp-role-specific (per role, pluggable)
  ├── hool-mcp-dev (lint, type-check, build)
  ├── hool-mcp-qa (playwright, visual diff, coverage)
  ├── hool-mcp-governor (audit, compliance check, feedback)
  └── hool-mcp-platform (health, restart, config)

Layer 4: hool-mcp-project       (project-specific, auto-configured)
  ├── context7 (docs lookup)
  ├── database tools (if project uses DB)
  └── deployment tools (if project has CI/CD)
```

Each agent connects to: Layer 1 + Layer 2 (if task-doing) + their Layer 3 + Layer 4.
Identity tool in Layer 1 tells MCP server WHO is calling -> server-side permission enforcement.

---

## Platform Agent

A meta-agent that manages the infrastructure itself. Does NOT participate in domain work.

```
platform-agent/
├── Monitors MCP server health
├── Restarts crashed services
├── Notifies agents of config changes (port, auth, etc.)
├── Manages agent sessions (start/stop/restart)
├── Handles resource allocation
├── Cost monitoring (token usage across sessions)
├── Health checks (ping agents, restart dead ones)
└── Provides system dashboard
```

If MCP server crashes: platform agent debugs, restarts, and communicates to all agents that it's back up (or if config changed).

NO file-based coordination fallback. If MCP is down, platform agent fixes it. Agents wait.

---

## Domain Presets

A preset is a configuration package:

```typescript
interface DomainPreset {
  name: string;                    // "sdlc", "research-lab", "content-studio"
  agents: AgentDefinition[];       // Roles with prompts, permissions, MCP layers
  phases?: PhaseDefinition[];      // Workflow stages (optional — some domains are freeform)
  mcpPlugins: McpPlugin[];         // Domain-specific tools
  rules: GovernorRule[];           // Domain-specific governance
  templates: {
    memory: MemoryTemplate;        // Initial memory structure
    operations: OperationFiles;    // Task board format, metrics, etc.
    artifacts: ArtifactStructure;  // Where domain outputs go
  };
  routing: RoutingTable;           // How to classify and route requests
}
```

### Example Presets

**SDLC** (port of hool-mini):
- Agents: PL, BE/FE Tech Lead, BE/FE Dev, QA, Forensic, Governor
- Phases: 0-12 (Init -> Retro)
- MCP plugins: Playwright, linters, type checkers, test runners
- Artifacts: src/, tests/

**Research Lab**:
- Agents: Research Lead, Analyst, Literature Reviewer, Fact-Checker, Compiler
- Phases: Question -> Literature Review -> Analysis -> Synthesis -> Peer Review -> Publication
- MCP plugins: Web search, academic DB, citation tools, LaTeX
- Artifacts: papers/, data/, analysis/

**Content Studio**:
- Agents: Content Director, Writer, Editor, Designer, SEO Specialist, Publisher
- Phases: Brief -> Draft -> Edit -> Design -> Review -> Publish
- MCP plugins: CMS API, image generation, SEO tools, analytics
- Artifacts: content/, assets/, published/

**Custom**: Users define their own agents, phases, tools, and rules.

### User Experience

```bash
npm install -g hool

hool init --preset sdlc          # Software project
hool init --preset research-lab  # Research project
hool init --preset custom        # Define your own
hool create-preset my-agency     # Interactive preset builder
```

---

## Agent Lifecycle

### How Agents Launch

**Model A — On-demand dispatch (recommended for v1)**:
```bash
hool dispatch be-dev --task TASK-007
# Spawns a new Claude Code session
# Session connects to hool-mcp-core + hool-mcp-dev
# Agent reads inbox, claims task, does work, completes, exits
```

**Model B — Persistent daemon (future)**:
```bash
hool start --agents be-dev,qa,governor
# Each runs as persistent Claude session
# Poll inbox via MCP
# Like a real team always online
```

Model A is simpler, cheaper (pay per invocation). Model B is more powerful but expensive.

### Agent Definition

```yaml
name: market-analyst
role: Analyzes market data and competitive landscape
personality: Methodical, data-driven, skeptical of assumptions

permissions:
  read: [shared/*, research/*, data/*]
  write: [analysis/*, memory/market-analyst/*]

mcp_layers: [core, work, web-search, spreadsheet]

boot_sequence:
  - read: memory/market-analyst/hot.md
  - read: shared/decisions.md
  - read: inbox

governor_rules:
  - Never make investment recommendations
  - Always cite data sources
  - Flag assumptions explicitly
```

---

## Key Design Decisions

1. **Next-gen, not v2** — Separate project from hool-mini. hool-mini continues for subagent-based workflows. hool-mega is the platform play.

2. **MCP-only coordination** — No file-based fallback. If MCP crashes, platform agent fixes it. This forces robust infrastructure.

3. **Cost model** — Each agent = separate session = separate billing. Acceptable because subagents already compound cost, and independent sessions give full capabilities (MCP, hooks, context window).

4. **Platform agent for resilience** — Dedicated meta-agent manages infra. Other agents don't self-heal.

5. **User + Lead in a room** — Lead mediates all agent interaction. User can call agents into the room. Agents address Lead, not user.

6. **Global MCP install** — MCPs installed to ~/.claude/mcp_servers.json (global) for reliable subagent access. Project-level MCP is buggy for non-main agents.

7. **Presets over frameworks** — Users don't write code to define workflows. They configure presets (YAML/JSON). The platform handles orchestration.

---

## Build Sequence

1. **hool-mcp-core** — The coordination MCP server (room, memory, tasks, identity). Foundation.
2. **Room model** — Lead as main agent, can call agents into room via MCP.
3. **Memory system** — Multi-format storage with auto-compaction.
4. **Platform agent** — Health monitoring, session management.
5. **hool-preset-sdlc** — Port existing HOOL as first preset (validates platform).
6. **Preset builder** — CLI for users to create custom presets.
7. **Role-specific MCP layers** — Dev, QA, Governor tool packages.
8. **Multi-dev scaling** — Safe parallel dispatch via MCP coordination.

---

## Future Vision (v3+)

### Resource Pooling (Multi-User)

```
Developer A (Claude Code) ---\
Developer B (Cursor)     ----+--- hool-cloud-mcp --- Shared Project State
Developer C (VS Code)    ---/
                                  ├── Agent Pool (shared)
                                  ├── Shared Memory
                                  ├── Real-time Coordination
                                  └── Cost Splitting
```

Multiple humans, multiple AI tools, coordinating through one HOOL MCP server.

### Agent Marketplace

Community-contributed presets and agent definitions:
```bash
hool install-preset @community/legal-review
hool install-agent @community/security-auditor
```

---

## Open Questions

1. **Naming** — Is "HOOL" the platform name or just the SDLC preset? Platform could have a broader identity.
2. **Tech stack for MCP server** — TypeScript (match hool-mini), Python (ML ecosystem), Rust (performance)?
3. **Graph DB choice** — Neo4j (powerful, heavy), LevelGraph (lightweight, embeddable), or custom?
4. **Vector DB choice** — ChromaDB, Pinecone, or embedded (sqlite-vss)?
5. **How does OpenClaw compare?** — Need to research and position against.
6. **Pricing model** — Open source core + paid cloud? All OSS? Freemium presets?

---

## References

- hool-mini source: `../hool-mini/` and `../cli/`
- Current HOOL orchestrator: `../CLAUDE.md` (between HOOL markers)
- Agent prompts: `../hool-mini/prompts/agents/` and `../.claude/agents/`
- Known limitations discovered during hool-mini development:
  - Subagent MCP access bugs (global config works, project-level doesn't)
  - Background subagents can't access MCP tools at all
  - No SubagentStart hook for context injection
  - File-based coordination has race conditions
  - Same-agent parallel dispatch causes memory corruption
  - Writable paths are generic, need project-level override
  - Hook enforcement hits subagents too (block-pl-src-write.sh)
