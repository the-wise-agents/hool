import fs from 'fs/promises';
import path from 'path';
import type { ProjectType, ExecutionMode, AgentPlatform } from '../adapters/types.js';
import { getOperationTemplates, getOnboardOperationTemplates, getOnboardCurrentPhase, getOnboardTasksPrepend, getMemoryHeaders } from './templates.js';
import { MCP_REGISTRY } from '../mcps/registry.js';

const AGENTS = [
  'product-lead',
  'fe-tech-lead',
  'be-tech-lead',
  'fe-dev',
  'be-dev',
  'qa',
  'forensic',
  'governor',
] as const;

const SUBAGENTS = [
  'fe-tech-lead',
  'be-tech-lead',
  'fe-dev',
  'be-dev',
  'qa',
  'forensic',
  'governor',
] as const;

const PHASE_DIRS = [
  '.hool/phases/00-init',
  '.hool/phases/01-brainstorm',
  '.hool/phases/02-spec/features',
  '.hool/phases/03-design/cards',
  '.hool/phases/03-design/flows',
  '.hool/phases/04-architecture/contracts',
  '.hool/phases/04-architecture/flows',
  '.hool/phases/04-architecture/fe',
  '.hool/phases/04-architecture/be',
  '.hool/phases/05-fe-scaffold/pages',
  '.hool/phases/06-be-scaffold/services',
  '.hool/phases/07-test-plan/cases',
];

const SKIP_PHASES: Record<ProjectType, string[]> = {
  'web-app': [],
  'browser-game': ['.hool/phases/06-be-scaffold'],
  'mobile-android': [],
  'animation': ['.hool/phases/06-be-scaffold'],
  'cli-tool': ['.hool/phases/03-design', '.hool/phases/05-fe-scaffold'],
  'api-only': ['.hool/phases/03-design', '.hool/phases/05-fe-scaffold'],
  'desktop': [],
  'other': [],
};

export async function scaffoldProject(projectDir: string, projectType: ProjectType, mode: ExecutionMode = 'interactive'): Promise<void> {
  const skip = SKIP_PHASES[projectType] || [];

  // Create phase directories (empty — agents create the docs during their phases)
  for (const dir of PHASE_DIRS) {
    if (skip.some(s => dir.startsWith(s))) continue;
    await fs.mkdir(path.join(projectDir, dir), { recursive: true });
  }

  // Only create project-profile.md — the one doc that init itself produces
  await fs.writeFile(
    path.join(projectDir, '.hool/phases/00-init/project-profile.md'),
    `# Project Profile\n\n- **Type**: ${projectType}\n- **Mode**: ${mode}\n- **Created**: ${new Date().toISOString().split('T')[0]}\n`,
    'utf-8',
  );

  // Create operations directory with templates
  await fs.mkdir(path.join(projectDir, '.hool/operations'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.hool/operations/context'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.hool/operations/dispatch'), { recursive: true });
  const opTemplates = getOperationTemplates(mode);
  for (const [filename, content] of Object.entries(opTemplates)) {
    await fs.writeFile(path.join(projectDir, '.hool/operations', filename), content, 'utf-8');
  }

  // Create memory directories for each agent
  const memoryHeaders = getMemoryHeaders();
  for (const agent of AGENTS) {
    const agentDir = path.join(projectDir, '.hool/memory', agent);
    await fs.mkdir(agentDir, { recursive: true });
    for (const [filename, content] of Object.entries(memoryHeaders)) {
      await fs.writeFile(path.join(agentDir, filename), content, 'utf-8');
    }
  }

  // Create .hool directories
  await fs.mkdir(path.join(projectDir, '.hool/prompts'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.hool/hooks'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.hool/logs'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.hool/metrics'), { recursive: true });

  // NOTE: src/, tests/ are NOT created here.
  // Those are project concerns decided during architecture (Phase 4)
  // and scaffolded by Tech Leads during Phases 5-6 (LLD).
}

export async function scaffoldOnboard(projectDir: string, projectType: ProjectType, mode: ExecutionMode = 'interactive'): Promise<void> {
  const skip = SKIP_PHASES[projectType] || [];

  // Create phase directories (same as init — agents populate during onboarding)
  for (const dir of PHASE_DIRS) {
    if (skip.some(s => dir.startsWith(s))) continue;
    await fs.mkdir(path.join(projectDir, dir), { recursive: true });
  }

  // Project profile marks this as an onboarded project
  await fs.writeFile(
    path.join(projectDir, '.hool/phases/00-init/project-profile.md'),
    `# Project Profile\n\n- **Type**: ${projectType}\n- **Mode**: ${mode}\n- **Origin**: onboarded (existing codebase)\n- **Created**: ${new Date().toISOString().split('T')[0]}\n`,
    'utf-8',
  );

  // Create operations directory with onboard-specific templates
  await fs.mkdir(path.join(projectDir, '.hool/operations'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.hool/operations/context'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.hool/operations/dispatch'), { recursive: true });
  const opTemplates = getOnboardOperationTemplates(mode);
  for (const [filename, content] of Object.entries(opTemplates)) {
    await fs.writeFile(path.join(projectDir, '.hool/operations', filename), content, 'utf-8');
  }

  // Create memory directories for each agent
  const memoryHeaders = getMemoryHeaders();
  for (const agent of AGENTS) {
    const agentDir = path.join(projectDir, '.hool/memory', agent);
    await fs.mkdir(agentDir, { recursive: true });
    for (const [filename, content] of Object.entries(memoryHeaders)) {
      await fs.writeFile(path.join(agentDir, filename), content, 'utf-8');
    }
  }

  // Create .hool directories
  await fs.mkdir(path.join(projectDir, '.hool/prompts'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.hool/hooks'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.hool/logs'), { recursive: true });
  await fs.mkdir(path.join(projectDir, '.hool/metrics'), { recursive: true });
}

export async function reonboard(projectDir: string, mode: ExecutionMode = 'interactive'): Promise<void> {
  // Only overwrite current-phase.md and prepend onboard tasks to task-board.md
  const opsDir = path.join(projectDir, '.hool/operations');

  // Flip phase to onboarding
  await fs.writeFile(path.join(opsDir, 'current-phase.md'), getOnboardCurrentPhase(mode), 'utf-8');

  // Prepend onboard tasks to existing task board
  const taskBoardPath = path.join(opsDir, 'task-board.md');
  let existing = '';
  try {
    existing = await fs.readFile(taskBoardPath, 'utf-8');
  } catch { /* no task board yet */ }

  const prepend = getOnboardTasksPrepend();
  const header = '# Task Board\n\n';
  const body = existing.startsWith('# Task Board') ? existing.replace(/^# Task Board\n*/, '') : existing;
  await fs.writeFile(taskBoardPath, header + prepend + body, 'utf-8');
}

export async function copyPrompts(projectDir: string, promptsSourceDir: string): Promise<void> {
  const hoolPromptsDir = path.join(projectDir, '.hool/prompts');

  async function copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else if (entry.name.endsWith('.md')) {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  await copyDir(promptsSourceDir, hoolPromptsDir);
}

export async function writeMcpManifest(
  projectDir: string,
  projectType: ProjectType,
  requiredMcps: string[],
): Promise<void> {
  const servers: Record<string, { command: string; args: string[] }> = {};
  for (const name of requiredMcps) {
    const def = MCP_REGISTRY[name];
    if (def) {
      servers[name] = def.configEntry as { command: string; args: string[] };
    }
  }

  const manifest = {
    domain: projectType,
    servers,
    optional: ['hool-context-mcp'],
  };
  await fs.writeFile(
    path.join(projectDir, '.hool/mcps.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8',
  );
}

const AGENT_MANIFEST = [
  {
    name: 'product-lead',
    role: 'Vision, contracts, doc consistency, phase gating, agent dispatch',
    prompt: '.hool/prompts/orchestrator.md',
    'agent-definition': { 'claude-code': null, cursor: null },
    memory: '.hool/memory/product-lead/',
    phases: [0, 1, 2, 3, 4, 12],
  },
  {
    name: 'fe-tech-lead',
    role: 'FE scaffold, LLD, code review, code-vs-doc consistency',
    prompt: '.hool/prompts/agents/05-fe-tech-lead.md',
    'agent-definition': { 'claude-code': '.claude/agents/fe-tech-lead.md', cursor: '.cursor/agents/fe-tech-lead.md' },
    'cursor-rule': '.cursor/rules/fe-tech-lead.mdc',
    memory: '.hool/memory/fe-tech-lead/',
    phases: [4, 5, 9],
  },
  {
    name: 'be-tech-lead',
    role: 'BE scaffold, LLD, code review, code-vs-doc consistency',
    prompt: '.hool/prompts/agents/06-be-tech-lead.md',
    'agent-definition': { 'claude-code': '.claude/agents/be-tech-lead.md', cursor: '.cursor/agents/be-tech-lead.md' },
    'cursor-rule': '.cursor/rules/be-tech-lead.mdc',
    memory: '.hool/memory/be-tech-lead/',
    phases: [4, 6, 9],
  },
  {
    name: 'fe-dev',
    role: 'Frontend implementation',
    prompt: '.hool/prompts/agents/08-fe-dev.md',
    'agent-definition': { 'claude-code': '.claude/agents/fe-dev.md', cursor: '.cursor/agents/fe-dev.md' },
    'cursor-rule': '.cursor/rules/fe-dev.mdc',
    memory: '.hool/memory/fe-dev/',
    phases: [8],
  },
  {
    name: 'be-dev',
    role: 'Backend implementation',
    prompt: '.hool/prompts/agents/08-be-dev.md',
    'agent-definition': { 'claude-code': '.claude/agents/be-dev.md', cursor: '.cursor/agents/be-dev.md' },
    'cursor-rule': '.cursor/rules/be-dev.mdc',
    memory: '.hool/memory/be-dev/',
    phases: [8],
  },
  {
    name: 'qa',
    role: 'Test plan, test execution, bug reporting',
    prompt: '.hool/prompts/agents/10-qa.md',
    'agent-definition': { 'claude-code': '.claude/agents/qa.md', cursor: '.cursor/agents/qa.md' },
    'cursor-rule': '.cursor/rules/qa.mdc',
    memory: '.hool/memory/qa/',
    phases: [7, 10],
  },
  {
    name: 'forensic',
    role: 'Root cause analysis, bug triage, fix routing',
    prompt: '.hool/prompts/agents/11-forensic.md',
    'agent-definition': { 'claude-code': '.claude/agents/forensic.md', cursor: '.cursor/agents/forensic.md' },
    'cursor-rule': '.cursor/rules/forensic.mdc',
    memory: '.hool/memory/forensic/',
    phases: [11],
  },
  {
    name: 'governor',
    role: 'Behavioral auditor, rule enforcement, corrective feedback',
    prompt: '.hool/prompts/agents/governor.md',
    'agent-definition': { 'claude-code': '.claude/agents/governor.md', cursor: '.cursor/agents/governor.md' },
    'cursor-rule': '.cursor/rules/governor.mdc',
    memory: '.hool/memory/governor/',
    phases: 'continuous',
  },
];

export async function writeAgentManifest(projectDir: string): Promise<void> {
  await fs.writeFile(
    path.join(projectDir, '.hool/agents.json'),
    JSON.stringify(AGENT_MANIFEST, null, 2) + '\n',
    'utf-8',
  );
}

/**
 * Copy platform-specific agent definitions, hooks, and settings.
 * Source files come from hool-mini templates (bundled with CLI).
 */
export async function copyPlatformFiles(projectDir: string, templateRootDir: string, platform: AgentPlatform): Promise<void> {
  // templateRootDir points to hool-mini/ (or cli/ when bundled) — contains agents/, hooks/, settings/
  const hoolMiniDir = templateRootDir;

  if (platform === 'claude-code') {
    // Copy .claude/agents/*.md
    const claudeAgentsDir = path.join(projectDir, '.claude/agents');
    await fs.mkdir(claudeAgentsDir, { recursive: true });
    const srcAgentsDir = path.join(hoolMiniDir, 'agents/claude');
    await copyDirContents(srcAgentsDir, claudeAgentsDir);

    // Copy .claude/settings.json (merge with existing if present)
    const settingsSrc = path.join(hoolMiniDir, 'settings/claude-settings.json');
    const settingsDest = path.join(projectDir, '.claude/settings.json');
    try {
      const settingsContent = await fs.readFile(settingsSrc, 'utf-8');
      const hoolSettings = JSON.parse(settingsContent);

      // Merge with existing settings if present
      try {
        const existing = JSON.parse(await fs.readFile(settingsDest, 'utf-8'));
        // Merge hooks — HOOL hooks get added to existing
        if (hoolSettings.hooks) {
          if (!existing.hooks) existing.hooks = {};
          for (const [event, hooks] of Object.entries(hoolSettings.hooks)) {
            if (!existing.hooks[event]) {
              existing.hooks[event] = hooks;
            } else {
              // Append HOOL hooks, avoid duplicates by command
              const existingCmds = new Set((existing.hooks[event] as Array<{hooks: Array<{command: string}>}>).flatMap((h: {hooks: Array<{command: string}>}) => h.hooks.map((hh: {command: string}) => hh.command)));
              for (const hookGroup of hooks as Array<{hooks: Array<{command: string}>}>) {
                const newHooks = hookGroup.hooks.filter((hh: {command: string}) => !existingCmds.has(hh.command));
                if (newHooks.length > 0) {
                  existing.hooks[event].push({ ...hookGroup, hooks: newHooks });
                }
              }
            }
          }
        }
        await fs.writeFile(settingsDest, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
      } catch {
        // No existing settings — write fresh
        await fs.writeFile(settingsDest, settingsContent, 'utf-8');
      }
    } catch {
      // Settings template not found — skip
    }

    // Copy hooks to .hool/hooks/
    const hooksSrc = path.join(hoolMiniDir, 'hooks');
    const hooksDest = path.join(projectDir, '.hool/hooks');
    await fs.mkdir(hooksDest, { recursive: true });
    await copyDirContents(hooksSrc, hooksDest);

    // Make hooks executable
    try {
      const hookFiles = await fs.readdir(hooksDest);
      for (const f of hookFiles) {
        if (f.endsWith('.sh')) {
          await fs.chmod(path.join(hooksDest, f), 0o755);
        }
      }
    } catch { /* ok */ }
  }

  if (platform === 'cursor') {
    // Copy .cursor/agents/*.md
    const cursorAgentsDir = path.join(projectDir, '.cursor/agents');
    await fs.mkdir(cursorAgentsDir, { recursive: true });
    const srcAgentsDir = path.join(hoolMiniDir, 'agents/cursor');
    await copyDirContents(srcAgentsDir, cursorAgentsDir);

    // Copy .cursor/rules/*.mdc
    const cursorRulesDir = path.join(projectDir, '.cursor/rules');
    await fs.mkdir(cursorRulesDir, { recursive: true });
    const srcRulesDir = path.join(hoolMiniDir, 'rules/cursor');
    await copyDirContents(srcRulesDir, cursorRulesDir);
  }
}

async function copyDirContents(src: string, dest: string): Promise<void> {
  try {
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        await fs.copyFile(path.join(src, entry.name), path.join(dest, entry.name));
      }
    }
  } catch {
    // Source directory doesn't exist — skip silently
  }
}
