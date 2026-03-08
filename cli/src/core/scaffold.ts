import fs from 'fs/promises';
import path from 'path';
import type { ProjectType, ExecutionMode } from '../adapters/types.js';
import { getOperationTemplates, getOnboardOperationTemplates, getMemoryHeaders } from './templates.js';
import { MCP_REGISTRY } from '../mcps/registry.js';

const AGENTS = [
  'product-lead',
  'fe-tech-lead',
  'be-tech-lead',
  'fe-dev',
  'be-dev',
  'qa',
  'forensic',
] as const;

const PHASE_DIRS = [
  'phases/00-init',
  'phases/01-brainstorm',
  'phases/02-spec/features',
  'phases/03-design/cards',
  'phases/03-design/flows',
  'phases/04-architecture/contracts',
  'phases/04-architecture/flows',
  'phases/04-architecture/fe',
  'phases/04-architecture/be',
  'phases/05-fe-scaffold/pages',
  'phases/06-be-scaffold/services',
  'phases/07-test-plan/cases',
];

const SKIP_PHASES: Record<ProjectType, string[]> = {
  'web-app': [],
  'browser-game': ['phases/06-be-scaffold'],
  'mobile-android': [],
  'animation': ['phases/06-be-scaffold'],
  'cli-tool': ['phases/03-design', 'phases/05-fe-scaffold'],
  'api-only': ['phases/03-design', 'phases/05-fe-scaffold'],
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
    path.join(projectDir, 'phases/00-init/project-profile.md'),
    `# Project Profile\n\n- **Type**: ${projectType}\n- **Mode**: ${mode}\n- **Created**: ${new Date().toISOString().split('T')[0]}\n`,
    'utf-8',
  );

  // Create operations directory with templates
  await fs.mkdir(path.join(projectDir, 'operations'), { recursive: true });
  const opTemplates = getOperationTemplates(mode);
  for (const [filename, content] of Object.entries(opTemplates)) {
    await fs.writeFile(path.join(projectDir, 'operations', filename), content, 'utf-8');
  }

  // Create memory directories for each agent
  const memoryHeaders = getMemoryHeaders();
  for (const agent of AGENTS) {
    const agentDir = path.join(projectDir, 'memory', agent);
    await fs.mkdir(agentDir, { recursive: true });
    for (const [filename, content] of Object.entries(memoryHeaders)) {
      await fs.writeFile(path.join(agentDir, filename), content, 'utf-8');
    }
  }

  // Create .hool directory
  await fs.mkdir(path.join(projectDir, '.hool/prompts'), { recursive: true });

  // NOTE: src/, tests/, logs/ are NOT created here.
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
    path.join(projectDir, 'phases/00-init/project-profile.md'),
    `# Project Profile\n\n- **Type**: ${projectType}\n- **Mode**: ${mode}\n- **Origin**: onboarded (existing codebase)\n- **Created**: ${new Date().toISOString().split('T')[0]}\n`,
    'utf-8',
  );

  // Create operations directory with onboard-specific templates
  await fs.mkdir(path.join(projectDir, 'operations'), { recursive: true });
  const opTemplates = getOnboardOperationTemplates(mode);
  for (const [filename, content] of Object.entries(opTemplates)) {
    await fs.writeFile(path.join(projectDir, 'operations', filename), content, 'utf-8');
  }

  // Create memory directories for each agent
  const memoryHeaders = getMemoryHeaders();
  for (const agent of AGENTS) {
    const agentDir = path.join(projectDir, 'memory', agent);
    await fs.mkdir(agentDir, { recursive: true });
    for (const [filename, content] of Object.entries(memoryHeaders)) {
      await fs.writeFile(path.join(agentDir, filename), content, 'utf-8');
    }
  }

  // Create .hool directory
  await fs.mkdir(path.join(projectDir, '.hool/prompts'), { recursive: true });
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
    memory: 'memory/product-lead/',
    phases: [0, 1, 2, 3, 4, 12],
  },
  {
    name: 'fe-tech-lead',
    role: 'FE scaffold, LLD, code review, code-vs-doc consistency',
    prompt: '.hool/prompts/agents/05-fe-tech-lead.md',
    memory: 'memory/fe-tech-lead/',
    phases: [4, 5, 9],
  },
  {
    name: 'be-tech-lead',
    role: 'BE scaffold, LLD, code review, code-vs-doc consistency',
    prompt: '.hool/prompts/agents/06-be-tech-lead.md',
    memory: 'memory/be-tech-lead/',
    phases: [4, 6, 9],
  },
  {
    name: 'fe-dev',
    role: 'Frontend implementation',
    prompt: '.hool/prompts/agents/08-fe-dev.md',
    memory: 'memory/fe-dev/',
    phases: [8],
  },
  {
    name: 'be-dev',
    role: 'Backend implementation',
    prompt: '.hool/prompts/agents/08-be-dev.md',
    memory: 'memory/be-dev/',
    phases: [8],
  },
  {
    name: 'qa',
    role: 'Test plan, test execution, bug reporting',
    prompt: '.hool/prompts/agents/10-qa.md',
    memory: 'memory/qa/',
    phases: [7, 10],
  },
  {
    name: 'forensic',
    role: 'Root cause analysis, bug triage, fix routing',
    prompt: '.hool/prompts/agents/11-forensic.md',
    memory: 'memory/forensic/',
    phases: [11],
  },
];

export async function writeAgentManifest(projectDir: string): Promise<void> {
  await fs.writeFile(
    path.join(projectDir, '.hool/agents.json'),
    JSON.stringify(AGENT_MANIFEST, null, 2) + '\n',
    'utf-8',
  );
}
