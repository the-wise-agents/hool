import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  scaffoldProject,
  scaffoldOnboard,
  reonboard,
  writeMcpManifest,
  writeAgentManifest,
  copyPlatformFiles,
  copySkills,
  copyChecklists,
} from './scaffold.js';
import * as scaffoldExports from './scaffold.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hool-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('scaffoldProject', () => {
  it('creates .hool/operations/ with all template files', async () => {
    await scaffoldProject(tmpDir, 'web-app');
    const files = await fs.readdir(path.join(tmpDir, '.hool/operations'));
    expect(files).toContain('current-phase.md');
    expect(files).toContain('task-board.md');
    expect(files).toContain('bugs.md');
    expect(files).toContain('issues.md');
    expect(files).toContain('inconsistencies.md');
    expect(files).toContain('needs-human-review.md');
    expect(files).toContain('client-preferences.md');
    expect(files).toContain('governor-rules.md');
    expect(files).toContain('governor-log.md');
  });

  it('creates context and dispatch subdirs', async () => {
    await scaffoldProject(tmpDir, 'web-app');
    const stat1 = await fs.stat(path.join(tmpDir, '.hool/operations/context'));
    const stat2 = await fs.stat(path.join(tmpDir, '.hool/operations/dispatch'));
    expect(stat1.isDirectory()).toBe(true);
    expect(stat2.isDirectory()).toBe(true);
  });

  it('creates memory dirs for all 8 agents', async () => {
    await scaffoldProject(tmpDir, 'web-app');
    const agents = ['product-lead', 'fe-tech-lead', 'be-tech-lead', 'fe-dev', 'be-dev', 'qa', 'forensic', 'governor'];
    for (const agent of agents) {
      const agentDir = path.join(tmpDir, '.hool/memory', agent);
      const files = await fs.readdir(agentDir);
      expect(files).toContain('hot.md');
      expect(files).toContain('cold.md');
      expect(files).toContain('best-practices.md');
      expect(files).toContain('issues.md');
      expect(files).toContain('governor-feedback.md');
    }
  });

  it('creates project-profile.md with correct type and mode', async () => {
    await scaffoldProject(tmpDir, 'cli-tool', 'full-hool');
    const profile = await fs.readFile(path.join(tmpDir, '.hool/phases/00-init/project-profile.md'), 'utf-8');
    expect(profile).toContain('cli-tool');
    expect(profile).toContain('full-hool');
  });

  it('creates all phase directories for web-app', async () => {
    await scaffoldProject(tmpDir, 'web-app');
    const expectedDirs = [
      '.hool/phases/00-init',
      '.hool/phases/01-brainstorm',
      '.hool/phases/02-spec/features',
      '.hool/phases/03-design/cards',
      '.hool/phases/03-design/flows',
      '.hool/phases/04-architecture/contracts',
      '.hool/phases/04-architecture/flows',
      '.hool/phases/05-fe-scaffold/pages',
      '.hool/phases/06-be-scaffold/services',
      '.hool/phases/07-test-plan/cases',
    ];
    for (const dir of expectedDirs) {
      const stat = await fs.stat(path.join(tmpDir, dir));
      expect(stat.isDirectory()).toBe(true);
    }
  });

  it('skips design and fe-scaffold for cli-tool', async () => {
    await scaffoldProject(tmpDir, 'cli-tool');
    // These should NOT exist
    await expect(fs.access(path.join(tmpDir, '.hool/phases/03-design'))).rejects.toThrow();
    await expect(fs.access(path.join(tmpDir, '.hool/phases/05-fe-scaffold'))).rejects.toThrow();
    // These SHOULD exist
    const stat = await fs.stat(path.join(tmpDir, '.hool/phases/06-be-scaffold/services'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('skips be-scaffold for animation', async () => {
    await scaffoldProject(tmpDir, 'animation');
    await expect(fs.access(path.join(tmpDir, '.hool/phases/06-be-scaffold'))).rejects.toThrow();
    const stat = await fs.stat(path.join(tmpDir, '.hool/phases/05-fe-scaffold/pages'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('creates .hool utility directories', async () => {
    await scaffoldProject(tmpDir, 'web-app');
    for (const dir of ['checklists', 'hooks', 'logs', 'metrics', 'settings']) {
      const stat = await fs.stat(path.join(tmpDir, '.hool', dir));
      expect(stat.isDirectory()).toBe(true);
    }
  });

  it('defaults to interactive mode', async () => {
    await scaffoldProject(tmpDir, 'web-app');
    const phase = await fs.readFile(path.join(tmpDir, '.hool/operations/current-phase.md'), 'utf-8');
    expect(phase).toContain('interactive');
  });
});

describe('scaffoldOnboard', () => {
  it('creates .hool structure with onboarding phase', async () => {
    await scaffoldOnboard(tmpDir, 'web-app');
    const phase = await fs.readFile(path.join(tmpDir, '.hool/operations/current-phase.md'), 'utf-8');
    expect(phase).toContain('onboarding');
  });

  it('creates task-board with ONBOARD tasks', async () => {
    await scaffoldOnboard(tmpDir, 'web-app');
    const board = await fs.readFile(path.join(tmpDir, '.hool/operations/task-board.md'), 'utf-8');
    expect(board).toContain('ONBOARD-001');
    expect(board).toContain('ONBOARD-011');
  });

  it('marks project-profile as onboarded', async () => {
    await scaffoldOnboard(tmpDir, 'cli-tool', 'full-hool');
    const profile = await fs.readFile(path.join(tmpDir, '.hool/phases/00-init/project-profile.md'), 'utf-8');
    expect(profile).toContain('onboarded');
    expect(profile).toContain('cli-tool');
    expect(profile).toContain('full-hool');
  });

  it('respects skip phases same as init', async () => {
    await scaffoldOnboard(tmpDir, 'api-only');
    await expect(fs.access(path.join(tmpDir, '.hool/phases/03-design'))).rejects.toThrow();
    await expect(fs.access(path.join(tmpDir, '.hool/phases/05-fe-scaffold'))).rejects.toThrow();
  });
});

describe('reonboard', () => {
  it('overwrites current-phase to onboarding', async () => {
    await scaffoldProject(tmpDir, 'web-app');
    // Verify it starts at phase 0
    let phase = await fs.readFile(path.join(tmpDir, '.hool/operations/current-phase.md'), 'utf-8');
    expect(phase).toContain('Phase**: 0');

    await reonboard(tmpDir);
    phase = await fs.readFile(path.join(tmpDir, '.hool/operations/current-phase.md'), 'utf-8');
    expect(phase).toContain('onboarding');
  });

  it('prepends re-onboard tasks to existing task-board', async () => {
    await scaffoldProject(tmpDir, 'web-app');
    // Add a custom task
    const taskBoardPath = path.join(tmpDir, '.hool/operations/task-board.md');
    await fs.writeFile(taskBoardPath, '# Task Board\n\n## Active Tasks\n- [ ] TASK-099: Custom task | assigned: be-dev\n', 'utf-8');

    await reonboard(tmpDir);
    const board = await fs.readFile(taskBoardPath, 'utf-8');
    expect(board).toContain('## Re-onboard Tasks');
    expect(board).toContain('ONBOARD-001');
    expect(board).toContain('TASK-099'); // preserved
  });

  it('works when no existing task-board', async () => {
    await fs.mkdir(path.join(tmpDir, '.hool/operations'), { recursive: true });
    await reonboard(tmpDir);
    const board = await fs.readFile(path.join(tmpDir, '.hool/operations/task-board.md'), 'utf-8');
    expect(board).toContain('# Task Board');
    expect(board).toContain('ONBOARD-001');
  });
});

describe('writeMcpManifest', () => {
  it('writes valid JSON manifest', async () => {
    await fs.mkdir(path.join(tmpDir, '.hool'), { recursive: true });
    await writeMcpManifest(tmpDir, 'web-app', ['context7', 'playwright']);
    const content = await fs.readFile(path.join(tmpDir, '.hool/mcps.json'), 'utf-8');
    const manifest = JSON.parse(content);
    expect(manifest.domain).toBe('web-app');
    expect(manifest.servers).toHaveProperty('context7');
    expect(manifest.servers).toHaveProperty('playwright');
    expect(manifest.servers.context7).toHaveProperty('command');
    expect(manifest.servers.context7).toHaveProperty('args');
  });

  it('includes optional field', async () => {
    await fs.mkdir(path.join(tmpDir, '.hool'), { recursive: true });
    await writeMcpManifest(tmpDir, 'cli-tool', ['context7']);
    const manifest = JSON.parse(await fs.readFile(path.join(tmpDir, '.hool/mcps.json'), 'utf-8'));
    expect(manifest.optional).toContain('hool-context-mcp');
  });

  it('skips unknown MCP names gracefully', async () => {
    await fs.mkdir(path.join(tmpDir, '.hool'), { recursive: true });
    await writeMcpManifest(tmpDir, 'web-app', ['context7', 'nonexistent-mcp']);
    const manifest = JSON.parse(await fs.readFile(path.join(tmpDir, '.hool/mcps.json'), 'utf-8'));
    expect(manifest.servers).toHaveProperty('context7');
    expect(manifest.servers).not.toHaveProperty('nonexistent-mcp');
  });
});

describe('writeAgentManifest', () => {
  it('writes valid JSON with all 8 agents', async () => {
    await fs.mkdir(path.join(tmpDir, '.hool'), { recursive: true });
    await writeAgentManifest(tmpDir);
    const content = await fs.readFile(path.join(tmpDir, '.hool/agents.json'), 'utf-8');
    const agents = JSON.parse(content);
    expect(agents).toHaveLength(8);
    const names = agents.map((a: { name: string }) => a.name);
    expect(names).toContain('product-lead');
    expect(names).toContain('be-dev');
    expect(names).toContain('fe-dev');
    expect(names).toContain('qa');
    expect(names).toContain('governor');
  });

  it('each agent has required fields', async () => {
    await fs.mkdir(path.join(tmpDir, '.hool'), { recursive: true });
    await writeAgentManifest(tmpDir);
    const agents = JSON.parse(await fs.readFile(path.join(tmpDir, '.hool/agents.json'), 'utf-8'));
    for (const agent of agents) {
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('role');
      expect(agent).toHaveProperty('prompt');
      expect(agent).toHaveProperty('memory');
    }
  });

  it('agent memory paths use .hool/memory/ prefix', async () => {
    await fs.mkdir(path.join(tmpDir, '.hool'), { recursive: true });
    await writeAgentManifest(tmpDir);
    const agents = JSON.parse(await fs.readFile(path.join(tmpDir, '.hool/agents.json'), 'utf-8'));
    for (const agent of agents) {
      expect(agent.memory).toMatch(/^\.hool\/memory\//);
    }
  });
});

describe('copyPlatformFiles', () => {
  let templateDir: string;

  beforeEach(async () => {
    templateDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hool-templates-'));

    // Create minimal template structure
    await fs.mkdir(path.join(templateDir, 'agents/claude'), { recursive: true });
    await fs.writeFile(path.join(templateDir, 'agents/claude/be-dev.md'), '---\nname: BE Dev\n---\nBE Dev agent');
    await fs.writeFile(path.join(templateDir, 'agents/claude/qa.md'), '---\nname: QA\n---\nQA agent');

    await fs.mkdir(path.join(templateDir, 'hooks'), { recursive: true });
    await fs.writeFile(path.join(templateDir, 'hooks/block-pl-src-write.sh'), '#!/bin/bash\necho test');
    await fs.writeFile(path.join(templateDir, 'hooks/track-prompt-count.sh'), '#!/bin/bash\necho test');

    await fs.mkdir(path.join(templateDir, 'settings'), { recursive: true });
    await fs.writeFile(path.join(templateDir, 'settings/claude-settings.json'), JSON.stringify({
      hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: '.hool/hooks/block-pl-src-write.sh' }] }] }
    }));
    await fs.writeFile(path.join(templateDir, 'settings/be-dev.json'), JSON.stringify({
      hooks: { Stop: [{ matcher: '', hooks: [{ type: 'command', command: '.hool/hooks/agent-checklist.sh' }] }] }
    }));
    await fs.writeFile(path.join(templateDir, 'settings/qa.json'), JSON.stringify({
      hooks: { Stop: [{ matcher: '', hooks: [{ type: 'command', command: '.hool/hooks/agent-checklist.sh' }] }] }
    }));

    await fs.mkdir(path.join(templateDir, 'prompts/skills'), { recursive: true });
    await fs.writeFile(path.join(templateDir, 'prompts/skills/01-brainstorm.md'), '# Brainstorm skill');

    await fs.mkdir(path.join(templateDir, 'prompts/checklists'), { recursive: true });
    await fs.writeFile(path.join(templateDir, 'prompts/checklists/code-review.md'), '# Code review checklist');
  });

  afterEach(async () => {
    await fs.rm(templateDir, { recursive: true, force: true });
  });

  it('copies agent definitions to .claude/agents/ for claude-code', async () => {
    await copyPlatformFiles(tmpDir, templateDir, 'claude-code');
    const agents = await fs.readdir(path.join(tmpDir, '.claude/agents'));
    expect(agents).toContain('be-dev.md');
    expect(agents).toContain('qa.md');
  });

  it('copies hooks to .hool/hooks/ and makes them executable', async () => {
    await copyPlatformFiles(tmpDir, templateDir, 'claude-code');
    const hookPath = path.join(tmpDir, '.hool/hooks/block-pl-src-write.sh');
    const stat = await fs.stat(hookPath);
    expect(stat.mode & 0o111).toBeGreaterThan(0); // executable
  });

  it('copies settings.json to .claude/settings.json', async () => {
    await copyPlatformFiles(tmpDir, templateDir, 'claude-code');
    const settings = JSON.parse(await fs.readFile(path.join(tmpDir, '.claude/settings.json'), 'utf-8'));
    expect(settings.hooks).toHaveProperty('PreToolUse');
  });

  it('merges with existing .claude/settings.json', async () => {
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.claude/settings.json'), JSON.stringify({
      hooks: { PostToolUse: [{ matcher: 'Test', hooks: [{ type: 'command', command: 'test.sh' }] }] }
    }));

    await copyPlatformFiles(tmpDir, templateDir, 'claude-code');
    const settings = JSON.parse(await fs.readFile(path.join(tmpDir, '.claude/settings.json'), 'utf-8'));
    expect(settings.hooks).toHaveProperty('PreToolUse'); // from HOOL
    expect(settings.hooks).toHaveProperty('PostToolUse'); // preserved
  });

  it('copies per-role settings to .hool/settings/ (excluding claude-settings.json)', async () => {
    await fs.mkdir(path.join(tmpDir, '.hool/settings'), { recursive: true });
    await copyPlatformFiles(tmpDir, templateDir, 'claude-code');
    const settingsFiles = await fs.readdir(path.join(tmpDir, '.hool/settings'));
    expect(settingsFiles).toContain('be-dev.json');
    expect(settingsFiles).toContain('qa.json');
    expect(settingsFiles).not.toContain('claude-settings.json');
  });

  it('copies skills to .claude/skills/', async () => {
    await copyPlatformFiles(tmpDir, templateDir, 'claude-code');
    const skillFile = await fs.readFile(path.join(tmpDir, '.claude/skills/brainstorm/SKILL.md'), 'utf-8');
    expect(skillFile).toContain('Brainstorm skill');
  });

  it('copies checklists to .hool/checklists/', async () => {
    await copyPlatformFiles(tmpDir, templateDir, 'claude-code');
    const checklist = await fs.readFile(path.join(tmpDir, '.hool/checklists/code-review.md'), 'utf-8');
    expect(checklist).toContain('Code review checklist');
  });

  it('copies cursor agents for cursor platform', async () => {
    await fs.mkdir(path.join(templateDir, 'agents/cursor'), { recursive: true });
    await fs.writeFile(path.join(templateDir, 'agents/cursor/be-dev.md'), 'cursor be-dev');
    await fs.mkdir(path.join(templateDir, 'rules/cursor'), { recursive: true });
    await fs.writeFile(path.join(templateDir, 'rules/cursor/be-dev.mdc'), 'cursor rule');

    await copyPlatformFiles(tmpDir, templateDir, 'cursor');
    const agentContent = await fs.readFile(path.join(tmpDir, '.cursor/agents/be-dev.md'), 'utf-8');
    expect(agentContent).toBe('cursor be-dev');
    const ruleContent = await fs.readFile(path.join(tmpDir, '.cursor/rules/be-dev.mdc'), 'utf-8');
    expect(ruleContent).toBe('cursor rule');
  });
});

describe('copySkills', () => {
  it('copies skill files with correct naming', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(path.join(skillsDir, '01-brainstorm.md'), '# Brainstorm');
    await fs.writeFile(path.join(skillsDir, '02-spec.md'), '# Spec');

    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hool-proj-'));
    await copySkills(projectDir, tmpDir);

    expect(await fs.readFile(path.join(projectDir, '.claude/skills/brainstorm/SKILL.md'), 'utf-8')).toBe('# Brainstorm');
    expect(await fs.readFile(path.join(projectDir, '.claude/skills/spec/SKILL.md'), 'utf-8')).toBe('# Spec');

    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('handles missing skills directory gracefully', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hool-proj-'));
    await expect(copySkills(projectDir, '/nonexistent')).resolves.toBeUndefined();
    await fs.rm(projectDir, { recursive: true, force: true });
  });
});

describe('copyChecklists', () => {
  it('copies checklist files', async () => {
    const checklistsDir = path.join(tmpDir, 'checklists');
    await fs.mkdir(checklistsDir, { recursive: true });
    await fs.writeFile(path.join(checklistsDir, 'review.md'), '# Review');

    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hool-proj-'));
    await copyChecklists(projectDir, tmpDir);

    expect(await fs.readFile(path.join(projectDir, '.hool/checklists/review.md'), 'utf-8')).toBe('# Review');

    await fs.rm(projectDir, { recursive: true, force: true });
  });
});

describe('copyPrompts removal', () => {
  it('does not export copyPrompts', () => {
    expect(scaffoldExports).not.toHaveProperty('copyPrompts');
  });
});

describe('scaffoldProject .gitignore', () => {
  it('creates .hool/operations/logs/.gitignore with *.jsonl', async () => {
    await scaffoldProject(tmpDir, 'web-app');
    const gitignore = await fs.readFile(path.join(tmpDir, '.hool/operations/logs/.gitignore'), 'utf-8');
    expect(gitignore).toContain('*.jsonl');
  });
});

describe('scaffoldOnboard .gitignore', () => {
  it('creates .hool/operations/logs/.gitignore with *.jsonl', async () => {
    await scaffoldOnboard(tmpDir, 'web-app');
    const gitignore = await fs.readFile(path.join(tmpDir, '.hool/operations/logs/.gitignore'), 'utf-8');
    expect(gitignore).toContain('*.jsonl');
  });
});
