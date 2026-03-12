import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Adapter, AdapterConfig, McpDefinition, AgentPlatform } from './types.js';

const CLAUDE_MCP_CONFIG_PATH = path.join(os.homedir(), '.claude', 'mcp_servers.json');

const HOOL_START_MARKER = '<!-- HOOL:START -->';
const HOOL_END_MARKER = '<!-- HOOL:END -->';

function getMcpSection(projectType: string): string {
  const mcps = ['- **context7**: Use `mcp__context7__resolve-library-id` and `mcp__context7__query-docs` for up-to-date library documentation'];
  if (['web-app', 'browser-game', 'animation'].includes(projectType)) {
    mcps.push('- **playwright**: Use for E2E testing, screenshots, visual comparison, and browser automation');
  }
  if (projectType === 'mobile-android') {
    mcps.push('- **adb**: Use for Android device/emulator interaction (must be installed on PATH)');
  }
  return mcps.join('\n');
}

function generateClaudeMd(config: AdapterConfig, orchestratorContent: string): string {
  return `${HOOL_START_MARKER}
# HOOL — Agent-Driven SDLC

This project uses the HOOL framework. The Product Lead is the sole user-facing agent.
All other agents are internal — dispatched by the Product Lead via CLI.

## Quick Start

You are the Product Lead. On every invocation — **before answering any question**:
1. Read \`.hool/operations/current-phase.md\` to know where you are
2. Read \`.hool/operations/task-board.md\` to know what's in flight
3. Read your memory files (\`.hool/memory/product-lead/hot.md\`, \`best-practices.md\`, \`issues.md\`)
4. Read the full orchestrator prompt below — your complete process and rules
5. **If there are pending tasks**: Tell the user what's pending and ask if you should proceed, or if they have something else in mind. Do NOT silently wait for explicit instructions — you are the driver, not a passenger.
6. Continue from where you left off (see Autonomous Execution Loop below)

## How to Dispatch Agents

When you need to dispatch an agent (Phases 5-12), use the Bash tool to run an independent CLI session:

\`\`\`bash
env -u CLAUDECODE claude -p \\
  --agent <role> \\
  --settings .hool/settings/<role>.json \\
  --model opus \\
  --dangerously-skip-permissions \\
  --no-session-persistence \\
  "<task prompt>"
\`\`\`

Each dispatched agent runs as a FULL independent session — full MCP access, full hooks, own context window.
See the orchestrator prompt below for full dispatch documentation.

### Agent Registry
All agents are defined in \`.hool/agents.json\` — read it for the full list of agents, their prompts, memory paths, and which phases they participate in.

## MCP Tools Available

MCP server configs are in \`.hool/mcps.json\` and installed to your platform's MCP config.

${getMcpSection(config.projectType)}

## Execution Mode: ${config.mode}

${config.mode === 'full-hool'
    ? `This project runs in **full-hool mode**. After brainstorming (Phase 1), you are fully autonomous.
Do NOT ask the user for approval at spec, design, or architecture gates.
Log all significant decisions to \`operations/needs-human-review.md\` for post-build review.`
    : `This project runs in **interactive mode**. Phases 0-4 require human review and sign-off.
Phase 4 (Architecture) is the FINAL human gate. After that, you run autonomously.`}

## Key Rules

- You are the **sole user-facing agent** — the user only talks to you
- All state lives in files: \`.hool/phases/\`, \`.hool/operations/\`, \`.hool/memory/\`
- Agents never modify their own prompts — escalate to \`.hool/operations/needs-human-review.md\`

---

## Orchestrator Prompt

${orchestratorContent}
${HOOL_END_MARKER}
`;
}

export class ClaudeCodeAdapter implements Adapter {
  readonly platform: AgentPlatform = 'claude-code';

  async injectInstructions(config: AdapterConfig): Promise<void> {
    const claudeMdPath = path.join(config.projectDir, 'CLAUDE.md');
    let orchestratorContent = '';
    try {
      orchestratorContent = await fs.readFile(path.join(config.promptsDir, 'orchestrator.md'), 'utf-8');
    } catch {
      // Fallback: legacy .hool/prompts/ location
      try {
        orchestratorContent = await fs.readFile(path.join(config.projectDir, '.hool', 'prompts', 'orchestrator.md'), 'utf-8');
      } catch {
        orchestratorContent = '<!-- orchestrator.md not found — run hool init to generate -->';
      }
    }

    const content = generateClaudeMd(config, orchestratorContent);

    // Replace between markers, append, or create new
    try {
      const existing = await fs.readFile(claudeMdPath, 'utf-8');
      const startIdx = existing.indexOf(HOOL_START_MARKER);
      const endIdx = existing.indexOf(HOOL_END_MARKER);

      if (startIdx >= 0 && endIdx >= 0) {
        // Marker-based replacement — clean upgrade path
        const before = existing.slice(0, startIdx);
        const after = existing.slice(endIdx + HOOL_END_MARKER.length);
        await fs.writeFile(claudeMdPath, before + content + after, 'utf-8');
      } else if (existing.includes('# HOOL')) {
        // Legacy format (pre-markers) — replace from old header onwards
        const legacyIdx = existing.indexOf('# HOOL');
        await fs.writeFile(claudeMdPath, existing.slice(0, legacyIdx) + content, 'utf-8');
      } else {
        await fs.writeFile(claudeMdPath, existing + '\n\n' + content, 'utf-8');
      }
    } catch {
      await fs.writeFile(claudeMdPath, content, 'utf-8');
    }
  }

  async installMcp(mcp: McpDefinition): Promise<void> {
    const configDir = path.dirname(CLAUDE_MCP_CONFIG_PATH);
    await fs.mkdir(configDir, { recursive: true });

    let config: Record<string, Record<string, unknown>> = {};
    try {
      const raw = await fs.readFile(CLAUDE_MCP_CONFIG_PATH, 'utf-8');
      config = JSON.parse(raw);
    } catch {
      // File doesn't exist or is invalid — start fresh
    }

    config[mcp.name] = mcp.configEntry;
    await fs.writeFile(CLAUDE_MCP_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  }

  async isMcpInstalled(mcpName: string): Promise<boolean> {
    try {
      const raw = await fs.readFile(CLAUDE_MCP_CONFIG_PATH, 'utf-8');
      const config = JSON.parse(raw);
      return mcpName in config;
    } catch {
      return false;
    }
  }

  getCompletionMessage(config: AdapterConfig): string {
    return [
      '',
      '  Start building:',
      '    $ claude',
      '    > Begin Phase 1: Brainstorm',
      '',
      '  Or if you have the /hool skill registered:',
      '    > /hool start',
    ].join('\n');
  }
}
