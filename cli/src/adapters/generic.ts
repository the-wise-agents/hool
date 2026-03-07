import fs from 'fs/promises';
import path from 'path';
import type { Adapter, AdapterConfig, McpDefinition, AgentPlatform } from './types.js';

function generateInstructions(config: AdapterConfig): string {
  return `# HOOL — Agent-Driven SDLC

This project uses the HOOL framework for agent-driven development.

## Setup

Your AI agent needs to act as the Product Lead. Load the orchestrator prompt:

  .hool/prompts/orchestrator.md

This prompt tells the agent:
- How to manage phases (0-12)
- How to dispatch internal agents (by loading their prompts from .hool/prompts/agents/)
- How to use the memory system (memory/<agent>/)
- How to manage operations files (operations/)

## On Every Session

1. Read \`operations/current-phase.md\` — know where you are
2. Read \`operations/task-board.md\` — know what's in flight
3. Read \`memory/product-lead/hot.md\` — your recent context
4. Follow the process in \`.hool/prompts/orchestrator.md\`

## MCP Servers

This project uses the following MCPs (install them for your platform):
${config.projectType === 'web-app' || config.projectType === 'browser-game' || config.projectType === 'animation'
    ? '- context7: npx -y @context7/mcp\n- playwright: npx @anthropic/mcp-playwright'
    : '- context7: npx -y @context7/mcp'
  }

See .hool/mcps.json for the full manifest.

## Execution Mode: ${config.mode}

${config.mode === 'full-hool'
    ? `This project runs in **full-hool mode**. After brainstorming (Phase 1), the agent is fully autonomous.
Do NOT ask the user for approval at spec, design, or architecture gates.
Log all significant decisions to \`operations/needs-human-review.md\` for post-build review.`
    : `This project runs in **interactive mode**. Phases 0-4 require human review and sign-off.
Phase 4 (Architecture) is the FINAL human gate. After that, the agent runs autonomously.`}
`;
}

export class GenericAdapter implements Adapter {
  readonly platform: AgentPlatform = 'generic';

  async injectInstructions(config: AdapterConfig): Promise<void> {
    const instructionsPath = path.join(config.projectDir, 'HOOL-INSTRUCTIONS.md');
    await fs.writeFile(instructionsPath, generateInstructions(config), 'utf-8');
  }

  async installMcp(_mcp: McpDefinition): Promise<void> {
    // Generic adapter can't install MCPs — the user's platform handles it
    // Just log what needs to be installed
  }

  async isMcpInstalled(_mcpName: string): Promise<boolean> {
    // Can't check — assume not installed, instructions will list them
    return false;
  }

  getCompletionMessage(config: AdapterConfig): string {
    return [
      '',
      '  Start building:',
      '    1. Open this project in your AI coding tool',
      '    2. Load the instructions from HOOL-INSTRUCTIONS.md',
      '    3. Tell the agent: "Read .hool/prompts/orchestrator.md and begin Phase 1: Brainstorm"',
      '',
      '  Note: Install the MCPs listed in .hool/mcps.json for your platform manually.',
    ].join('\n');
  }
}
