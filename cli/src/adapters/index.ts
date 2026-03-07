import type { Adapter, AgentPlatform } from './types.js';
import { ClaudeCodeAdapter } from './claude-code.js';
import { CursorAdapter } from './cursor.js';
import { GenericAdapter } from './generic.js';

export function createAdapter(platform: AgentPlatform): Adapter {
  switch (platform) {
    case 'claude-code': return new ClaudeCodeAdapter();
    case 'cursor': return new CursorAdapter();
    case 'generic': return new GenericAdapter();
  }
}

export type { Adapter, AdapterConfig, AgentPlatform, ProjectType, McpDefinition } from './types.js';
