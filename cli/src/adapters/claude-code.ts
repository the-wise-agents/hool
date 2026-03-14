import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';
import type { Adapter, AdapterConfig, McpDefinition, AgentPlatform } from './types.js';

const execAsync = promisify(exec);

const require = createRequire(import.meta.url);
const { version: HOOL_VERSION } = require('../../package.json');

const HOOL_END_MARKER = '<!-- HOOL:END -->';
const HOOL_START_PATTERN = /<!-- HOOL:START(?:\s+v[\d.]+)? -->/;

function getHoolStartMarker(version: string): string {
  return `<!-- HOOL:START v${version} -->`;
}

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
  return `${getHoolStartMarker(HOOL_VERSION)}
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
  --output-format stream-json \\
  --verbose \\
  --dangerously-skip-permissions \\
  --no-session-persistence \\
  "<task prompt>" \\
  > .hool/operations/logs/<TASK-ID>-<agent>-<NN>.jsonl 2>&1
\`\`\`

Each dispatched agent runs as a FULL independent session — full MCP access, full hooks, own context window.
Output streams as real-time JSON to the log file — read it mid-execution to monitor progress.
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

    // Team preset: use claude-md.md (agent-neutral shared context)
    // Solo preset: use orchestrator.md (PL-specific, embedded in CLAUDE.md)
    let content: string;
    if (config.preset === 'team') {
      let claudeMdContent = '';
      try {
        claudeMdContent = await fs.readFile(path.join(config.promptsDir, 'claude-md.md'), 'utf-8');
      } catch {
        claudeMdContent = '<!-- claude-md.md not found — run hool init to generate -->';
      }
      content = `${getHoolStartMarker(HOOL_VERSION)}\n${claudeMdContent}\n${HOOL_END_MARKER}\n`;
    } else {
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
      content = generateClaudeMd(config, orchestratorContent);
    }

    // Replace between markers, prepend, or create new
    try {
      const existing = await fs.readFile(claudeMdPath, 'utf-8');
      const startMatch = existing.match(HOOL_START_PATTERN);
      const endIdx = existing.indexOf(HOOL_END_MARKER);

      if (startMatch && endIdx >= 0) {
        // Marker-based replacement — clean upgrade path (handles both old and versioned markers)
        const before = existing.slice(0, startMatch.index);
        const after = existing.slice(endIdx + HOOL_END_MARKER.length);
        await fs.writeFile(claudeMdPath, before + content + after, 'utf-8');
      } else if (existing.includes('# HOOL')) {
        // Legacy format (pre-markers) — replace from old header onwards
        const legacyIdx = existing.indexOf('# HOOL');
        await fs.writeFile(claudeMdPath, existing.slice(0, legacyIdx) + content, 'utf-8');
      } else {
        // No markers, no HOOL header — prepend HOOL block so it takes priority (LLMs read top-first)
        await fs.writeFile(claudeMdPath, content + '\n\n' + existing, 'utf-8');
      }
    } catch {
      await fs.writeFile(claudeMdPath, content, 'utf-8');
    }
  }

  async installMcp(mcp: McpDefinition): Promise<void> {
    const args = (mcp.configEntry as { args?: string[] }).args || [];
    const command = (mcp.configEntry as { command?: string }).command || 'npx';
    // Use claude mcp add CLI command — writes to the correct config location (~/.claude.json)
    const cmd = `claude mcp add --transport stdio --scope user ${mcp.name} -- ${command} ${args.join(' ')}`;
    await execAsync(cmd);
  }

  async isMcpInstalled(mcpName: string): Promise<boolean> {
    try {
      const raw = await fs.readFile(path.join(os.homedir(), '.claude.json'), 'utf-8');
      const config = JSON.parse(raw);
      return mcpName in (config.mcpServers || {});
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
