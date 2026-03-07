import type { Adapter, McpDefinition, AdapterConfig } from '../adapters/types.js';
import { getRequiredMcps } from './registry.js';

export interface InstallResult {
  name: string;
  status: 'already-installed' | 'installed' | 'failed';
  error?: string;
}

export async function checkAndInstallMcps(
  adapter: Adapter,
  config: AdapterConfig,
): Promise<InstallResult[]> {
  const required = getRequiredMcps(config.projectType);
  const results: InstallResult[] = [];

  for (const mcp of required) {
    const installed = await adapter.isMcpInstalled(mcp.name);
    if (installed) {
      results.push({ name: mcp.name, status: 'already-installed' });
      continue;
    }

    try {
      await adapter.installMcp(mcp);
      results.push({ name: mcp.name, status: 'installed' });
    } catch (err) {
      results.push({
        name: mcp.name,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
