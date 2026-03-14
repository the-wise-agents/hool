import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MCP_REGISTRY, getRequiredMcps, getRequiredMcpNames } from './registry.js';
import { checkAndInstallMcps } from './installer.js';
import type { Adapter, AdapterConfig, McpDefinition } from '../adapters/types.js';

describe('MCP_REGISTRY', () => {
  it('contains context7, playwright, deepwiki', () => {
    expect(MCP_REGISTRY).toHaveProperty('context7');
    expect(MCP_REGISTRY).toHaveProperty('playwright');
    expect(MCP_REGISTRY).toHaveProperty('deepwiki');
  });

  it('each entry has name, installCommand, configEntry', () => {
    for (const [key, mcp] of Object.entries(MCP_REGISTRY)) {
      expect(mcp.name).toBe(key);
      expect(mcp.installCommand).toBeTruthy();
      expect(mcp.configEntry).toHaveProperty('command');
      expect(mcp.configEntry).toHaveProperty('args');
    }
  });
});

describe('getRequiredMcps', () => {
  it('returns context7 + deepwiki + playwright for web-app', () => {
    const mcps = getRequiredMcps('web-app');
    const names = mcps.map(m => m.name);
    expect(names).toContain('context7');
    expect(names).toContain('deepwiki');
    expect(names).toContain('playwright');
  });

  it('returns context7 + deepwiki for cli-tool (no playwright)', () => {
    const mcps = getRequiredMcps('cli-tool');
    const names = mcps.map(m => m.name);
    expect(names).toContain('context7');
    expect(names).toContain('deepwiki');
    expect(names).not.toContain('playwright');
  });

  it('returns context7 + deepwiki + playwright for browser-game', () => {
    const mcps = getRequiredMcps('browser-game');
    const names = mcps.map(m => m.name);
    expect(names).toContain('playwright');
  });

  it('returns context7 + deepwiki for api-only', () => {
    const mcps = getRequiredMcps('api-only');
    const names = mcps.map(m => m.name);
    expect(names).toEqual(['context7', 'deepwiki']);
  });

  it('returns McpDefinition objects with full config', () => {
    const mcps = getRequiredMcps('web-app');
    for (const mcp of mcps) {
      expect(mcp).toHaveProperty('name');
      expect(mcp).toHaveProperty('installCommand');
      expect(mcp).toHaveProperty('configEntry');
    }
  });
});

describe('getRequiredMcpNames', () => {
  it('returns string array of MCP names', () => {
    const names = getRequiredMcpNames('web-app');
    expect(names).toEqual(['context7', 'deepwiki', 'playwright']);
  });

  it('returns context7 + deepwiki for desktop', () => {
    expect(getRequiredMcpNames('desktop')).toEqual(['context7', 'deepwiki']);
  });
});

describe('checkAndInstallMcps', () => {
  function createMockAdapter(installed: Set<string> = new Set()): Adapter {
    return {
      platform: 'claude-code',
      injectInstructions: vi.fn(),
      installMcp: vi.fn(),
      isMcpInstalled: vi.fn(async (name: string) => installed.has(name)),
      getCompletionMessage: vi.fn(() => ''),
    };
  }

  const config: AdapterConfig = {
    platform: 'claude-code',
    projectType: 'cli-tool',
    projectDir: '/tmp/test',
    promptsDir: '/tmp/test/prompts',
    mode: 'interactive',
    preset: 'solo',
  };

  it('returns already-installed for pre-installed MCPs', async () => {
    const adapter = createMockAdapter(new Set(['context7', 'deepwiki']));
    const results = await checkAndInstallMcps(adapter, config);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === 'already-installed')).toBe(true);
    expect(adapter.installMcp).not.toHaveBeenCalled();
  });

  it('installs missing MCPs', async () => {
    const adapter = createMockAdapter(new Set(['context7'])); // deepwiki missing
    const results = await checkAndInstallMcps(adapter, config);
    const deepwikiResult = results.find(r => r.name === 'deepwiki');
    expect(deepwikiResult?.status).toBe('installed');
    expect(adapter.installMcp).toHaveBeenCalledOnce();
  });

  it('handles install failure gracefully', async () => {
    const adapter = createMockAdapter();
    (adapter.installMcp as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    const results = await checkAndInstallMcps(adapter, config);
    expect(results.every(r => r.status === 'failed')).toBe(true);
    expect(results[0].error).toBe('Network error');
  });

  it('processes all required MCPs for project type', async () => {
    const webConfig = { ...config, projectType: 'web-app' as const };
    const adapter = createMockAdapter();
    const results = await checkAndInstallMcps(adapter, webConfig);
    const names = results.map(r => r.name);
    expect(names).toContain('context7');
    expect(names).toContain('deepwiki');
    expect(names).toContain('playwright');
  });
});
