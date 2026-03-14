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

describe('hool init --team (e2e)', () => {
  it('scaffolds a web-app team project with all flags', async () => {
    const { stdout } = await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);
    expect(stdout).toContain('HOOL initialized');
    expect(stdout).toContain('team');

    // Verify operations files (team has more: metrics, human-feedback, governor-feedback)
    const ops = await fs.readdir(path.join(tmpDir, '.hool/operations'));
    expect(ops).toContain('current-phase.md');
    expect(ops).toContain('task-board.md');
    expect(ops).toContain('governor-rules.md');
    expect(ops).toContain('metrics.md');
    expect(ops).toContain('governor-feedback.md');
    expect(ops).toContain('human-feedback.md');

    // Team governor rules should mention Agent Teams concepts
    const govRules = await fs.readFile(path.join(tmpDir, '.hool/operations/governor-rules.md'), 'utf-8');
    expect(govRules).toContain('teammate');
    expect(govRules).toContain('logging');
  }, 30000);

  it('creates 11 memory files per agent (team preset)', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const memAgents = await fs.readdir(path.join(tmpDir, '.hool/memory'));
    expect(memAgents).toHaveLength(8);

    // Each agent should have 11 memory files
    for (const agent of memAgents) {
      const files = await fs.readdir(path.join(tmpDir, '.hool/memory', agent));
      expect(files).toHaveLength(11);
      expect(files).toContain('identity.md');
      expect(files).toContain('skill.md');
      expect(files).toContain('cold.md');
      expect(files).toContain('hot.md');
      expect(files).toContain('issues.md');
      expect(files).toContain('best-practices.md');
      expect(files).toContain('governor-feedback.md');
      expect(files).toContain('client-preferences.md');
      expect(files).toContain('operational-knowledge.md');
      expect(files).toContain('picked-tasks.md');
      expect(files).toContain('task-log.md');
    }
  }, 30000);

  it('creates team phase directories (different from solo)', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    // Team has contracts as phase 05 (not fe-scaffold)
    await expect(fs.stat(path.join(tmpDir, '.hool/phases/05-contracts'))).resolves.toBeTruthy();
    // Team has separate QA phase dir
    await expect(fs.stat(path.join(tmpDir, '.hool/phases/09-qa/cases'))).resolves.toBeTruthy();
    // Team has retrospective phase dir
    await expect(fs.stat(path.join(tmpDir, '.hool/phases/12-retrospective'))).resolves.toBeTruthy();
  }, 30000);

  it('copies team phase templates with starter content', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    // Phase templates should have been copied from presets/team/templates/phases/
    const specTemplate = await fs.readFile(path.join(tmpDir, '.hool/phases/02-spec/spec.md'), 'utf-8');
    expect(specTemplate.length).toBeGreaterThan(10);
    expect(specTemplate).toContain('Spec');

    const archTemplate = await fs.readFile(path.join(tmpDir, '.hool/phases/04-architecture/architecture.md'), 'utf-8');
    expect(archTemplate.length).toBeGreaterThan(10);
  }, 30000);

  it('creates shared browser profile directory for FE projects', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    // Shared browser profile for headless + headful Playwright
    await expect(fs.stat(path.join(tmpDir, '.hool/browser-profiles/shared'))).resolves.toBeTruthy();
  }, 30000);

  it('skips browser profiles for CLI tool projects', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'cli-tool', '-m', 'interactive', '--team']);

    await expect(fs.access(path.join(tmpDir, '.hool/browser-profiles/shared'))).rejects.toThrow();
  }, 30000);

  it('creates skills directory and copies skill files', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const skillsDir = path.join(tmpDir, '.hool/skills');
    const skills = await fs.readdir(skillsDir);
    expect(skills.length).toBeGreaterThan(0);
    // Verify key skills exist
    expect(skills).toContain('brainstormer.md');
    expect(skills).toContain('architect.md');
    expect(skills).toContain('tdd-implementer.md');
    expect(skills).toContain('test-engineer.md');
    expect(skills).toContain('code-reviewer.md');
  }, 30000);

  it('creates logs directory', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    await expect(fs.stat(path.join(tmpDir, '.hool/logs'))).resolves.toBeTruthy();
  }, 30000);

  it('copies team agent definitions including product-lead', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const agentsDir = path.join(tmpDir, '.claude/agents');
    const files = await fs.readdir(agentsDir);
    expect(files).toContain('product-lead.md');
    expect(files).toContain('be-dev.md');
    expect(files).toContain('fe-dev.md');
    expect(files).toContain('qa.md');
    expect(files).toContain('forensic.md');
    expect(files).toContain('governor.md');
    expect(files).toContain('be-tech-lead.md');
    expect(files).toContain('fe-tech-lead.md');
  }, 30000);

  it('injects agent-neutral CLAUDE.md for team preset', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    // Team CLAUDE.md should be agent-neutral (from claude-md.md)
    expect(claudeMd).toContain('Agent Teams');
    expect(claudeMd).toContain('HOOL:START');
    expect(claudeMd).toContain('HOOL:END');
    // Should NOT contain solo-specific PL identity
    expect(claudeMd).not.toContain('dispatched by the Product Lead via CLI');
    expect(claudeMd).not.toContain('Orchestrator Prompt');
  }, 30000);

  it('creates .claude/settings.json with Agent Teams env and hooks', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const settings = JSON.parse(await fs.readFile(path.join(tmpDir, '.claude/settings.json'), 'utf-8'));
    expect(settings).toHaveProperty('hooks');
    // Team settings should have Agent Teams env var
    expect(settings).toHaveProperty('env');
    expect(settings.env).toHaveProperty('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS', '1');
  }, 30000);

  it('configures Playwright MCP in both headless and headful modes with shared profile', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const settings = JSON.parse(await fs.readFile(path.join(tmpDir, '.claude/settings.json'), 'utf-8'));
    // Should have both playwright entries
    expect(settings).toHaveProperty('mcpServers');
    expect(settings.mcpServers).toHaveProperty('playwright');
    expect(settings.mcpServers).toHaveProperty('playwright-headful');
    // Headless should have --headless arg and shared user-data-dir
    expect(settings.mcpServers.playwright.args).toContain('--headless');
    expect(settings.mcpServers.playwright.args).toContain('--user-data-dir');
    expect(settings.mcpServers.playwright.args).toContain('.hool/browser-profiles/shared');
    // Headful should NOT have --headless arg but SHOULD share user-data-dir
    expect(settings.mcpServers['playwright-headful'].args).not.toContain('--headless');
    expect(settings.mcpServers['playwright-headful'].args).toContain('--user-data-dir');
    expect(settings.mcpServers['playwright-headful'].args).toContain('.hool/browser-profiles/shared');
  }, 30000);

  it('includes Playwright permissions for both modes', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const settings = JSON.parse(await fs.readFile(path.join(tmpDir, '.claude/settings.json'), 'utf-8'));
    expect(settings.permissions.allow).toContain('mcp__playwright__*');
    expect(settings.permissions.allow).toContain('mcp__playwright-headful__*');
  }, 30000);

  it('team hooks include TeammateIdle and TaskCompleted', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const settings = JSON.parse(await fs.readFile(path.join(tmpDir, '.claude/settings.json'), 'utf-8'));
    expect(settings.hooks).toHaveProperty('TeammateIdle');
    expect(settings.hooks).toHaveProperty('TaskCompleted');
    expect(settings.hooks).toHaveProperty('UserPromptSubmit');
    expect(settings.hooks).toHaveProperty('PostToolUse');
  }, 30000);

  it('project profile includes preset field for team', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const profile = await fs.readFile(path.join(tmpDir, '.hool/phases/00-init/project-profile.md'), 'utf-8');
    expect(profile).toContain('team');
  }, 30000);

  it('team agent prompts include logging requirements', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    // BE Dev prompt should have structured logging
    const beDev = await fs.readFile(path.join(tmpDir, '.claude/agents/be-dev.md'), 'utf-8');
    expect(beDev).toContain('correlationId');
    expect(beDev).toContain('be.log');
    expect(beDev).toContain('Logs FIRST');

    // FE Dev prompt should have console capture
    const feDev = await fs.readFile(path.join(tmpDir, '.claude/agents/fe-dev.md'), 'utf-8');
    expect(feDev).toContain('fe.log');
    expect(feDev).toContain('dev-mode log server');
    expect(feDev).toContain('Console interceptor');

    // Forensic prompt should have log analysis
    const forensic = await fs.readFile(path.join(tmpDir, '.claude/agents/forensic.md'), 'utf-8');
    expect(forensic).toContain('LOGS FIRST');
    expect(forensic).toContain('correlationId');
    expect(forensic).toContain('Log Analysis Techniques');
  }, 30000);

  it('team agent prompts include Playwright headless and headful modes', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    // QA should have both modes
    const qa = await fs.readFile(path.join(tmpDir, '.claude/agents/qa.md'), 'utf-8');
    expect(qa).toContain('mcp__playwright__*');
    expect(qa).toContain('mcp__playwright-headful__*');

    // Forensic should have both modes
    const forensic = await fs.readFile(path.join(tmpDir, '.claude/agents/forensic.md'), 'utf-8');
    expect(forensic).toContain('mcp__playwright__*');
    expect(forensic).toContain('mcp__playwright-headful__*');
    expect(forensic).toContain('headful');

    // FE Dev should have both modes
    const feDev = await fs.readFile(path.join(tmpDir, '.claude/agents/fe-dev.md'), 'utf-8');
    expect(feDev).toContain('mcp__playwright__*');
    expect(feDev).toContain('mcp__playwright-headful__*');
  }, 30000);

  it('CLAUDE.md includes logging architecture section', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toContain('Logging Architecture');
    expect(claudeMd).toContain('be.log');
    expect(claudeMd).toContain('fe.log');
    expect(claudeMd).toContain('Debugging Protocol');
    expect(claudeMd).toContain('correlationId');
  }, 30000);

  it('CLAUDE.md includes Playwright modes section', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toContain('Headless vs Headful');
    expect(claudeMd).toContain('playwright-headful');
    expect(claudeMd).toContain('human-assisted login');
  }, 30000);

  it('BE Tech Lead prompt includes logging scaffold instructions', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const beLead = await fs.readFile(path.join(tmpDir, '.claude/agents/be-tech-lead.md'), 'utf-8');
    expect(beLead).toContain('CRITICAL for debugging visibility');
    expect(beLead).toContain('correlationId');
    expect(beLead).toContain('pino');
    expect(beLead).toContain('JSONL');
    expect(beLead).toContain('be.log');
  }, 30000);

  it('FE Tech Lead prompt includes FE logging scaffold instructions', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const feLead = await fs.readFile(path.join(tmpDir, '.claude/agents/fe-tech-lead.md'), 'utf-8');
    expect(feLead).toContain('CRITICAL for debugging visibility');
    expect(feLead).toContain('dev-mode log server');
    expect(feLead).toContain('Console intercept');
    expect(feLead).toContain('fe.log');
    expect(feLead).toContain('window.onerror');
  }, 30000);

  it('QA prompt includes log verification in test execution', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    const qa = await fs.readFile(path.join(tmpDir, '.claude/agents/qa.md'), 'utf-8');
    expect(qa).toContain('test.log');
    expect(qa).toContain('Log verification');
    expect(qa).toContain('silent errors');
  }, 30000);

  it('does not create solo-specific directories for team preset', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive', '--team']);

    // Team should NOT have solo-specific dispatch/logs dirs in operations
    await expect(fs.access(path.join(tmpDir, '.hool/operations/dispatch'))).rejects.toThrow();
    await expect(fs.access(path.join(tmpDir, '.hool/operations/logs'))).rejects.toThrow();
    // Team SHOULD have skills dir (solo doesn't)
    await expect(fs.stat(path.join(tmpDir, '.hool/skills'))).resolves.toBeTruthy();
  }, 30000);

  it('solo preset still works correctly (regression)', async () => {
    await runHool(['init', '-d', tmpDir, '-p', 'claude-code', '-t', 'web-app', '-m', 'interactive']);

    // Solo should have 5 memory files per agent
    const memFiles = await fs.readdir(path.join(tmpDir, '.hool/memory/be-dev'));
    expect(memFiles).toHaveLength(5);
    expect(memFiles).toContain('hot.md');
    expect(memFiles).toContain('cold.md');
    expect(memFiles).toContain('best-practices.md');
    expect(memFiles).toContain('issues.md');
    expect(memFiles).toContain('governor-feedback.md');
    // Solo should NOT have team-specific memory files
    expect(memFiles).not.toContain('identity.md');
    expect(memFiles).not.toContain('picked-tasks.md');

    // Solo CLAUDE.md should have orchestrator content
    const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toContain('Orchestrator Prompt');
    expect(claudeMd).not.toContain('Agent Teams');
  }, 30000);
});
