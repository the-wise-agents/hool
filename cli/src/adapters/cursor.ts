import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Adapter, AdapterConfig, McpDefinition, AgentPlatform } from './types.js';

const CURSOR_MCP_CONFIG_PATH = path.join(os.homedir(), '.cursor', 'mcp.json');

function generateCursorRules(config: AdapterConfig): string {
  return `# HOOL — Agent-Driven SDLC

This project uses the HOOL framework. You are the Product Lead — the sole user-facing agent.

## On Every Message

1. Read \`operations/current-phase.md\` to know where you are
2. Read \`operations/task-board.md\` to know what's in flight
3. Read your memory: \`memory/product-lead/hot.md\`, \`best-practices.md\`, \`issues.md\`
4. Follow the full process in \`.hool/prompts/orchestrator.md\`

## Agent Dispatch

When you need to dispatch an agent, read the agent's prompt from \`.hool/prompts/agents/\` and follow its instructions directly. In Cursor, agents are not spawned as subprocesses — you switch roles by loading the relevant prompt and executing its process.

After completing the agent's task, switch back to Product Lead role and continue the dispatch loop.

## Execution Mode: ${config.mode}

${config.mode === 'full-hool'
    ? `This project runs in **full-hool mode**. After brainstorming (Phase 1), you are fully autonomous.
Do NOT ask the user for approval at spec, design, or architecture gates.
Log all significant decisions to \`operations/needs-human-review.md\` for post-build review.`
    : `This project runs in **interactive mode**. Phases 0-4 require human review and sign-off.
Phase 4 (Architecture) is the FINAL human gate. After that, you run autonomously.`}

## Key Rules

- You are the **sole user-facing agent** — the user only talks to you
- All state lives in files: \`phases/\`, \`operations/\`, \`memory/\`
- Agents never modify their own prompts — escalate to \`operations/needs-human-review.md\`
`;
}

export class CursorAdapter implements Adapter {
  readonly platform: AgentPlatform = 'cursor';

  async injectInstructions(config: AdapterConfig): Promise<void> {
    const rulesDir = path.join(config.projectDir, '.cursor', 'rules');
    await fs.mkdir(rulesDir, { recursive: true });

    const rulesPath = path.join(rulesDir, 'hool.mdc');
    const content = generateCursorRules(config);
    await fs.writeFile(rulesPath, content, 'utf-8');
  }

  async installMcp(mcp: McpDefinition): Promise<void> {
    const configDir = path.dirname(CURSOR_MCP_CONFIG_PATH);
    await fs.mkdir(configDir, { recursive: true });

    let config: { mcpServers?: Record<string, unknown> } = {};
    try {
      const raw = await fs.readFile(CURSOR_MCP_CONFIG_PATH, 'utf-8');
      config = JSON.parse(raw);
    } catch {
      // Fresh config
    }

    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers[mcp.name] = mcp.configEntry;
    await fs.writeFile(CURSOR_MCP_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  }

  async isMcpInstalled(mcpName: string): Promise<boolean> {
    try {
      const raw = await fs.readFile(CURSOR_MCP_CONFIG_PATH, 'utf-8');
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
      '    1. Open this project in Cursor',
      '    2. The .cursor/rules/hool.mdc will load automatically',
      '    3. Tell the agent: "Read .hool/prompts/orchestrator.md and begin Phase 1: Brainstorm"',
    ].join('\n');
  }
}
