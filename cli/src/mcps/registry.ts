import type { McpDefinition, ProjectType } from '../adapters/types.js';

export const MCP_REGISTRY: Record<string, McpDefinition> = {
  context7: {
    name: 'context7',
    installCommand: 'npx -y @context7/mcp',
    configEntry: {
      command: 'npx',
      args: ['-y', '@context7/mcp'],
    },
  },
  playwright: {
    name: 'playwright',
    installCommand: 'npx -y @playwright/mcp',
    configEntry: {
      command: 'npx',
      args: ['-y', '@playwright/mcp'],
    },
  },
  deepwiki: {
    name: 'deepwiki',
    installCommand: 'npx -y deepwiki-mcp',
    configEntry: {
      command: 'npx',
      args: ['-y', 'deepwiki-mcp'],
    },
  },
};

const MCPS_BY_PROJECT_TYPE: Record<ProjectType, string[]> = {
  'web-app': ['context7', 'deepwiki', 'playwright'],
  'browser-game': ['context7', 'deepwiki', 'playwright'],
  'mobile-android': ['context7', 'deepwiki'],
  'animation': ['context7', 'deepwiki', 'playwright'],
  'cli-tool': ['context7', 'deepwiki'],
  'api-only': ['context7', 'deepwiki'],
  'desktop': ['context7', 'deepwiki'],
  'other': ['context7', 'deepwiki'],
};

export function getRequiredMcps(projectType: ProjectType): McpDefinition[] {
  const names = MCPS_BY_PROJECT_TYPE[projectType] || ['context7'];
  return names.map(name => MCP_REGISTRY[name]).filter(Boolean);
}

export function getRequiredMcpNames(projectType: ProjectType): string[] {
  return MCPS_BY_PROJECT_TYPE[projectType] || ['context7'];
}
