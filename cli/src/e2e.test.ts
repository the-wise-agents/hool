import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execFile);

let tmpDir: string;
const cliPath = path.resolve(import.meta.dirname, '..', '..', 'cli');

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hool-e2e-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function runHool(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return exec('npx', ['tsx', path.join(cliPath, 'src/index.ts'), ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
  });
}

describe('hool init (e2e)', () => {
  it('scaffolds a web-app project with all flags', async () => {
    const { stdout } = await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);
    expect(stdout).toContain('HOOL initialized');

    // Verify structure
    const ops = await fs.readdir(path.join(tmpDir, '.hool/operations'));
    expect(ops).toContain('current-phase.md');
    expect(ops).toContain('task-board.md');
    expect(ops).toContain('governor-rules.md');

    // Verify phase dirs
    await expect(fs.stat(path.join(tmpDir, '.hool/phases/03-design/cards'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(tmpDir, '.hool/phases/05-fe-scaffold/pages'))).resolves.toBeTruthy();

    // Verify memory dirs
    const memAgents = await fs.readdir(path.join(tmpDir, '.hool/memory'));
    expect(memAgents).toHaveLength(8);

    // Verify CLAUDE.md
    const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toMatch(/<!-- HOOL:START v\d+\.\d+\.\d+ -->/);
    expect(claudeMd).toContain('<!-- HOOL:END -->');

    // Verify agents.json
    const agents = JSON.parse(await fs.readFile(path.join(tmpDir, '.hool/agents.json'), 'utf-8'));
    expect(agents).toHaveLength(8);

    // Verify mcps.json
    const mcps = JSON.parse(await fs.readFile(path.join(tmpDir, '.hool/mcps.json'), 'utf-8'));
    expect(mcps.domain).toBe('web-app');
    expect(mcps.servers).toHaveProperty('context7');
  }, 30000);

  it('scaffolds a cli-tool project skipping FE phases', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'cli-tool', '-m', 'interactive']);

    await expect(fs.access(path.join(tmpDir, '.hool/phases/03-design'))).rejects.toThrow();
    await expect(fs.access(path.join(tmpDir, '.hool/phases/05-fe-scaffold'))).rejects.toThrow();
    await expect(fs.stat(path.join(tmpDir, '.hool/phases/06-be-scaffold/services'))).resolves.toBeTruthy();
  }, 30000);

  it('scaffolds full-hool mode', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'full-hool']);

    const phase = await fs.readFile(path.join(tmpDir, '.hool/operations/current-phase.md'), 'utf-8');
    expect(phase).toContain('full-hool');

    const profile = await fs.readFile(path.join(tmpDir, '.hool/phases/00-init/project-profile.md'), 'utf-8');
    expect(profile).toContain('full-hool');
  }, 30000);

  it('copies per-role settings to .hool/settings/', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);

    const settingsDir = path.join(tmpDir, '.hool/settings');
    const files = await fs.readdir(settingsDir);
    // Should have role settings but NOT claude-settings.json
    expect(files.some(f => f.endsWith('.json'))).toBe(true);
    expect(files).not.toContain('claude-settings.json');

    // Each settings file should be valid JSON
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const content = await fs.readFile(path.join(settingsDir, f), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    }
  }, 30000);

  it('copies agent definitions to .claude/agents/', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);

    const agentsDir = path.join(tmpDir, '.claude/agents');
    const files = await fs.readdir(agentsDir);
    expect(files.length).toBeGreaterThan(0);
    // All should be .md files
    expect(files.every(f => f.endsWith('.md'))).toBe(true);
  }, 30000);

  it('creates .claude/settings.json with hooks', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);

    const settings = JSON.parse(await fs.readFile(path.join(tmpDir, '.claude/settings.json'), 'utf-8'));
    expect(settings).toHaveProperty('hooks');
  }, 30000);

  it('creates executable hooks', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);

    const hooksDir = path.join(tmpDir, '.hool/hooks');
    const hooks = await fs.readdir(hooksDir);
    for (const hook of hooks) {
      if (!hook.endsWith('.sh')) continue;
      const stat = await fs.stat(path.join(hooksDir, hook));
      expect(stat.mode & 0o111).toBeGreaterThan(0);
    }
  }, 30000);

  it('scaffolds for cursor platform', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'cursor', '-t', 'web-app', '-m', 'interactive']);

    const rules = await fs.readFile(path.join(tmpDir, '.cursor/rules/hool.mdc'), 'utf-8');
    expect(rules).toContain('HOOL');
    expect(rules).toContain('Product Lead');
  }, 30000);

  it('scaffolds for generic platform', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'generic', '-t', 'web-app', '-m', 'interactive']);

    const instructions = await fs.readFile(path.join(tmpDir, 'HOOL-INSTRUCTIONS.md'), 'utf-8');
    expect(instructions).toContain('HOOL');
  }, 30000);
});

describe('hool onboard (e2e)', () => {
  it('scaffolds onboarding structure', async () => {
    await runHool(['onboard', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);

    const phase = await fs.readFile(path.join(tmpDir, '.hool/operations/current-phase.md'), 'utf-8');
    expect(phase).toContain('onboarding');

    const board = await fs.readFile(path.join(tmpDir, '.hool/operations/task-board.md'), 'utf-8');
    expect(board).toContain('ONBOARD-001');

    const profile = await fs.readFile(path.join(tmpDir, '.hool/phases/00-init/project-profile.md'), 'utf-8');
    expect(profile).toContain('onboarded');
  }, 30000);
});

describe('hool status (e2e)', () => {
  it('shows status for an initialized project', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);
    const { stdout } = await runHool(['status', '-d', tmpDir]);
    expect(stdout).toContain('Phase');
    expect(stdout).toContain('Tasks');
    expect(stdout).toContain('Bugs');
  }, 30000);

  it('shows error for non-HOOL directory', async () => {
    const { stdout } = await runHool(['status', '-d', tmpDir]);
    expect(stdout).toContain('Not a HOOL project');
  }, 30000);
});

describe('hool mode (e2e)', () => {
  it('shows current mode', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);
    const { stdout } = await runHool(['mode', '-d', tmpDir]);
    expect(stdout).toContain('interactive');
  }, 30000);

  it('switches mode from interactive to full-hool', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);
    const { stdout } = await runHool(['mode', 'full-hool', '-d', tmpDir]);
    expect(stdout).toContain('interactive -> full-hool');

    const profile = await fs.readFile(path.join(tmpDir, '.hool/phases/00-init/project-profile.md'), 'utf-8');
    expect(profile).toContain('full-hool');
  }, 30000);

  it('reports when already in requested mode', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);
    const { stdout } = await runHool(['mode', 'interactive', '-d', tmpDir]);
    expect(stdout).toContain('Already in');
  }, 30000);

  it('rejects invalid mode', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);
    const { stdout } = await runHool(['mode', 'invalid', '-d', tmpDir]);
    expect(stdout).toContain('Invalid mode');
  }, 30000);
});
