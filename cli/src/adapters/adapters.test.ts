import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ClaudeCodeAdapter } from './claude-code.js';
import { CursorAdapter } from './cursor.js';
import { GenericAdapter } from './generic.js';
import { createAdapter } from './index.js';
import type { AdapterConfig, McpDefinition } from './types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hool-adapter-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeConfig(overrides: Partial<AdapterConfig> = {}): AdapterConfig {
  return {
    platform: 'claude-code',
    projectType: 'web-app',
    projectDir: tmpDir,
    promptsDir: path.join(tmpDir, 'prompts'),
    mode: 'interactive',
    ...overrides,
  };
}

describe('createAdapter', () => {
  it('returns ClaudeCodeAdapter for claude-code', () => {
    const adapter = createAdapter('claude-code');
    expect(adapter.platform).toBe('claude-code');
  });

  it('returns CursorAdapter for cursor', () => {
    const adapter = createAdapter('cursor');
    expect(adapter.platform).toBe('cursor');
  });

  it('returns GenericAdapter for generic', () => {
    const adapter = createAdapter('generic');
    expect(adapter.platform).toBe('generic');
  });
});

describe('ClaudeCodeAdapter', () => {
  const adapter = new ClaudeCodeAdapter();

  describe('injectInstructions', () => {
    it('creates CLAUDE.md with HOOL markers', async () => {
      const promptsDir = path.join(tmpDir, 'prompts');
      await fs.mkdir(promptsDir, { recursive: true });
      await fs.writeFile(path.join(promptsDir, 'orchestrator.md'), '# Test Orchestrator');

      await adapter.injectInstructions(makeConfig({ promptsDir }));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('<!-- HOOL:START -->');
      expect(content).toContain('<!-- HOOL:END -->');
      expect(content).toContain('# Test Orchestrator');
    });

    it('includes CLI dispatch instructions', async () => {
      const promptsDir = path.join(tmpDir, 'prompts');
      await fs.mkdir(promptsDir, { recursive: true });
      await fs.writeFile(path.join(promptsDir, 'orchestrator.md'), '# Orchestrator');

      await adapter.injectInstructions(makeConfig({ promptsDir }));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('env -u CLAUDECODE claude -p');
      expect(content).toContain('--agent <role>');
      expect(content).toContain('.hool/settings/<role>.json');
      expect(content).toContain('dispatched by the Product Lead via CLI');
    });

    it('replaces content between existing markers', async () => {
      const promptsDir = path.join(tmpDir, 'prompts');
      await fs.mkdir(promptsDir, { recursive: true });
      await fs.writeFile(path.join(promptsDir, 'orchestrator.md'), '# Updated');

      // Write initial CLAUDE.md with some user content
      await fs.writeFile(
        path.join(tmpDir, 'CLAUDE.md'),
        'User content before\n\n<!-- HOOL:START -->\nOld HOOL content\n<!-- HOOL:END -->\n\nUser content after',
      );

      await adapter.injectInstructions(makeConfig({ promptsDir }));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('User content before');
      expect(content).toContain('User content after');
      expect(content).toContain('# Updated');
      expect(content).not.toContain('Old HOOL content');
    });

    it('appends to CLAUDE.md without markers', async () => {
      const promptsDir = path.join(tmpDir, 'prompts');
      await fs.mkdir(promptsDir, { recursive: true });
      await fs.writeFile(path.join(promptsDir, 'orchestrator.md'), '# Orchestrator');
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'Existing content without markers');

      await adapter.injectInstructions(makeConfig({ promptsDir }));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('Existing content without markers');
      expect(content).toContain('<!-- HOOL:START -->');
    });

    it('replaces from legacy # HOOL header', async () => {
      const promptsDir = path.join(tmpDir, 'prompts');
      await fs.mkdir(promptsDir, { recursive: true });
      await fs.writeFile(path.join(promptsDir, 'orchestrator.md'), '# New');
      await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'User stuff\n\n# HOOL\nOld format content');

      await adapter.injectInstructions(makeConfig({ promptsDir }));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('User stuff');
      expect(content).not.toContain('Old format content');
      expect(content).toContain('<!-- HOOL:START -->');
    });

    it('includes MCP section for web-app with playwright', async () => {
      const promptsDir = path.join(tmpDir, 'prompts');
      await fs.mkdir(promptsDir, { recursive: true });
      await fs.writeFile(path.join(promptsDir, 'orchestrator.md'), '# Orchestrator');

      await adapter.injectInstructions(makeConfig({ promptsDir, projectType: 'web-app' }));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('context7');
      expect(content).toContain('playwright');
    });

    it('excludes playwright for cli-tool', async () => {
      const promptsDir = path.join(tmpDir, 'prompts');
      await fs.mkdir(promptsDir, { recursive: true });
      await fs.writeFile(path.join(promptsDir, 'orchestrator.md'), '# Orchestrator');

      await adapter.injectInstructions(makeConfig({ promptsDir, projectType: 'cli-tool' }));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('context7');
      expect(content).not.toContain('playwright');
    });

    it('shows full-hool mode instructions when set', async () => {
      const promptsDir = path.join(tmpDir, 'prompts');
      await fs.mkdir(promptsDir, { recursive: true });
      await fs.writeFile(path.join(promptsDir, 'orchestrator.md'), '# Orchestrator');

      await adapter.injectInstructions(makeConfig({ promptsDir, mode: 'full-hool' }));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('full-hool mode');
      expect(content).toContain('fully autonomous');
    });

    it('falls back when orchestrator.md not found', async () => {
      await adapter.injectInstructions(makeConfig({ promptsDir: '/nonexistent' }));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('orchestrator.md not found');
    });

    it('uses correct log naming convention with agent and attempt number', async () => {
      const promptsDir = path.join(tmpDir, 'prompts');
      await fs.mkdir(promptsDir, { recursive: true });
      await fs.writeFile(path.join(promptsDir, 'orchestrator.md'), '# Orchestrator');

      await adapter.injectInstructions(makeConfig({ promptsDir }));
      const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('<TASK-ID>-<agent>-<NN>.jsonl');
      expect(content).not.toMatch(/<TASK-ID>\.jsonl/);
    });
  });

  describe('getCompletionMessage', () => {
    it('includes claude start instructions', () => {
      const msg = adapter.getCompletionMessage(makeConfig());
      expect(msg).toContain('$ claude');
      expect(msg).toContain('Phase 1');
    });
  });
});

describe('CursorAdapter', () => {
  const adapter = new CursorAdapter();

  describe('injectInstructions', () => {
    it('creates .cursor/rules/hool.mdc', async () => {
      await adapter.injectInstructions(makeConfig({ platform: 'cursor' }));
      const content = await fs.readFile(path.join(tmpDir, '.cursor/rules/hool.mdc'), 'utf-8');
      expect(content).toContain('HOOL');
      expect(content).toContain('Product Lead');
    });

    it('includes execution mode', async () => {
      await adapter.injectInstructions(makeConfig({ platform: 'cursor', mode: 'full-hool' }));
      const content = await fs.readFile(path.join(tmpDir, '.cursor/rules/hool.mdc'), 'utf-8');
      expect(content).toContain('full-hool');
    });
  });

  describe('getCompletionMessage', () => {
    it('includes cursor-specific instructions', () => {
      const msg = adapter.getCompletionMessage(makeConfig({ platform: 'cursor' }));
      expect(msg).toContain('Cursor');
    });
  });
});

describe('GenericAdapter', () => {
  const adapter = new GenericAdapter();

  describe('injectInstructions', () => {
    it('creates HOOL-INSTRUCTIONS.md', async () => {
      await adapter.injectInstructions(makeConfig({ platform: 'generic' }));
      const content = await fs.readFile(path.join(tmpDir, 'HOOL-INSTRUCTIONS.md'), 'utf-8');
      expect(content).toContain('HOOL');
      expect(content).toContain('orchestrator.md');
    });
  });

  describe('installMcp', () => {
    it('is a no-op', async () => {
      const mcp: McpDefinition = { name: 'test', installCommand: 'test', configEntry: {} };
      await expect(adapter.installMcp(mcp)).resolves.toBeUndefined();
    });
  });

  describe('isMcpInstalled', () => {
    it('always returns false', async () => {
      expect(await adapter.isMcpInstalled('anything')).toBe(false);
    });
  });

  describe('getCompletionMessage', () => {
    it('mentions manual MCP install', () => {
      const msg = adapter.getCompletionMessage(makeConfig({ platform: 'generic' }));
      expect(msg).toContain('manually');
    });
  });
});
