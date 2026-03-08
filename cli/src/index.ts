#!/usr/bin/env node

import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { scaffoldProject, scaffoldOnboard, reonboard, copyPrompts, writeMcpManifest, writeAgentManifest } from './core/scaffold.js';
import type { ExecutionMode } from './adapters/types.js';
import { createAdapter } from './adapters/index.js';
import { checkAndInstallMcps } from './mcps/installer.js';
import { getRequiredMcpNames } from './mcps/registry.js';
import type { ProjectType, AgentPlatform, AdapterConfig } from './adapters/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prompts source: check bundled (npm install), then monorepo dev paths
async function getPromptsSourceDir(): Promise<string> {
  const candidates = [
    path.resolve(__dirname, '..', 'prompts'),  // npm: cli/dist/ -> cli/prompts/ (bundled)
    path.resolve(__dirname, '..', '..', 'hool-mini', 'prompts'),  // dev: cli/src/ -> hool/hool-mini/prompts/
    path.resolve(__dirname, '..', '..', '..', 'hool-mini', 'prompts'),  // dev: cli/dist/ -> hool/hool-mini/prompts/
  ];
  for (const dir of candidates) {
    try {
      await fs.access(dir);
      return dir;
    } catch { /* not found, try next */ }
  }
  return candidates[0]; // fallback — will fail with a clear error
}

const program = new Command();

program
  .name('hool')
  .description('Agent-Driven SDLC — scaffold and configure HOOL for any project')
  .version('0.1.3');

// ── hool init ──────────────────────────────────────────────

program
  .command('init')
  .description('Initialize HOOL in the current directory')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-p, --platform <platform>', 'Platform (claude-code, cursor, generic)')
  .option('-t, --type <type>', 'Project type (web-app, browser-game, mobile-android, animation, cli-tool, api-only, desktop, other)')
  .option('-m, --mode <mode>', 'Execution mode (interactive, full-hool)')
  .action(async (opts) => {
    const projectDir = path.resolve(opts.dir);

    console.log(chalk.bold('\n  HOOL — Agent-Driven SDLC\n'));

    // 1. Ask platform (or use flag)
    const platform: AgentPlatform = opts.platform || await select<AgentPlatform>({
      message: 'Which AI coding tool are you using?',
      choices: [
        { name: 'Claude Code', value: 'claude-code' },
        { name: 'Cursor', value: 'cursor' },
        { name: 'Other / generic', value: 'generic' },
      ],
    });

    // 2. Ask project type (or use flag)
    const projectType: ProjectType = opts.type || await select<ProjectType>({
      message: 'What are you building?',
      choices: [
        { name: 'Web application', value: 'web-app' },
        { name: 'Browser game', value: 'browser-game' },
        { name: 'Mobile app (Android)', value: 'mobile-android' },
        { name: 'Animation / motion', value: 'animation' },
        { name: 'CLI tool', value: 'cli-tool' },
        { name: 'API / backend only', value: 'api-only' },
        { name: 'Desktop application', value: 'desktop' },
        { name: 'Other', value: 'other' },
      ],
    });

    // 3. Ask execution mode (or use flag)
    const mode: ExecutionMode = opts.mode || await select<ExecutionMode>({
      message: 'How much control do you want?',
      choices: [
        { name: 'Interactive — review spec, design, architecture before building', value: 'interactive' },
        { name: 'Full-HOOL — describe the idea, we handle everything', value: 'full-hool' },
      ],
    });

    const adapter = createAdapter(platform);
    const promptsDir = await getPromptsSourceDir();
    const config: AdapterConfig = {
      platform,
      projectType,
      projectDir,
      promptsDir,
      mode,
    };

    // 4. Scaffold project structure
    console.log(chalk.dim('\n  Scaffolding project structure...'));
    await scaffoldProject(projectDir, projectType, mode);
    console.log(chalk.green('  ✓ Project structure created'));

    // 4. Copy prompt templates
    console.log(chalk.dim('  Copying agent prompts...'));
    try {
      await copyPrompts(projectDir, promptsDir);
      console.log(chalk.green('  ✓ Agent prompts copied to .hool/prompts/'));
    } catch {
      console.log(chalk.yellow('  ⚠ Could not copy prompts (source not found). Copy them manually to .hool/prompts/'));
    }

    // 5. Inject platform instructions
    console.log(chalk.dim(`  Configuring for ${platform}...`));
    await adapter.injectInstructions(config);
    console.log(chalk.green(`  ✓ ${platform} instructions injected`));

    // 6. Check & install MCPs
    if (platform !== 'generic') {
      console.log(chalk.dim('  Checking MCPs...'));
      const results = await checkAndInstallMcps(adapter, config);

      for (const r of results) {
        if (r.status === 'already-installed') {
          console.log(chalk.green(`  ✓ ${r.name} — already installed`));
        } else if (r.status === 'installed') {
          console.log(chalk.green(`  ✓ ${r.name} — installed`));
        } else {
          console.log(chalk.red(`  ✗ ${r.name} — failed: ${r.error}`));
        }
      }
    }

    // 7. Write MCP manifest + agent manifest
    const requiredMcps = getRequiredMcpNames(projectType);
    await writeMcpManifest(projectDir, projectType, requiredMcps);
    console.log(chalk.green('  ✓ MCP manifest written to .hool/mcps.json'));

    await writeAgentManifest(projectDir);
    console.log(chalk.green('  ✓ Agent manifest written to .hool/agents.json'));

    // 8. Done
    console.log(chalk.bold.green(`\n  HOOL initialized for: ${projectType}`));
    console.log(chalk.dim(`  Platform: ${platform}`));
    console.log(chalk.dim(`  Mode: ${mode}`));
    console.log(chalk.dim(`  MCPs: ${requiredMcps.join(', ')}`));
    console.log(adapter.getCompletionMessage(config));
    console.log('');
  });

// ── hool onboard ──────────────────────────────────────────

program
  .command('onboard')
  .description('Onboard an existing codebase into HOOL (reverse-engineer phase docs)')
  .option('-d, --dir <path>', 'Project directory', '.')
  .option('-p, --platform <platform>', 'Platform (claude-code, cursor, generic)')
  .option('-t, --type <type>', 'Project type (web-app, browser-game, mobile-android, animation, cli-tool, api-only, desktop, other)')
  .option('-m, --mode <mode>', 'Execution mode (interactive, full-hool)')
  .action(async (opts) => {
    const projectDir = path.resolve(opts.dir);

    console.log(chalk.bold('\n  HOOL — Onboard Existing Project\n'));

    // Check if already a HOOL project — re-onboard is a lightweight path
    let isReonboard = false;
    try {
      await fs.access(path.join(projectDir, '.hool'));
      isReonboard = true;
      console.log(chalk.yellow('  Existing HOOL project detected.'));
      const proceed = await confirm({
        message: 'Re-onboard? (only current-phase and task-board will be updated, everything else preserved)',
        default: true,
      });
      if (!proceed) {
        console.log(chalk.dim('  Cancelled.\n'));
        return;
      }
    } catch { /* not initialized — good */ }

    if (isReonboard) {
      // Re-onboard: read existing mode from project profile, flip phase + prepend tasks
      let mode: ExecutionMode = 'interactive';
      try {
        const profile = await fs.readFile(path.join(projectDir, 'phases/00-init/project-profile.md'), 'utf-8');
        const match = profile.match(/\*\*Mode\*\*:\s*(\S+)/);
        if (match && (match[1] === 'interactive' || match[1] === 'full-hool')) {
          mode = match[1] as ExecutionMode;
        }
      } catch { /* use default */ }

      console.log(chalk.dim('\n  Re-onboarding...'));
      await reonboard(projectDir, mode);
      console.log(chalk.green('  ✓ Phase set to onboarding, tasks prepended'));
      console.log(chalk.bold.green('\n  Re-onboard ready'));
      console.log(chalk.dim(`  Mode: ${mode} (from project profile)`));
      console.log('\n  Start the agent and it will pick up from operations/current-phase.md\n');
    } else {
      // Fresh onboard: full scaffold

      // 1. Ask platform (or use flag)
      const platform: AgentPlatform = opts.platform || await select<AgentPlatform>({
        message: 'Which AI coding tool are you using?',
        choices: [
          { name: 'Claude Code', value: 'claude-code' },
          { name: 'Cursor', value: 'cursor' },
          { name: 'Other / generic', value: 'generic' },
        ],
      });

      // 2. Ask project type (or use flag)
      const projectType: ProjectType = opts.type || await select<ProjectType>({
        message: 'What type of project is this?',
        choices: [
          { name: 'Web application', value: 'web-app' },
          { name: 'Browser game', value: 'browser-game' },
          { name: 'Mobile app (Android)', value: 'mobile-android' },
          { name: 'Animation / motion', value: 'animation' },
          { name: 'CLI tool', value: 'cli-tool' },
          { name: 'API / backend only', value: 'api-only' },
          { name: 'Desktop application', value: 'desktop' },
          { name: 'Other', value: 'other' },
        ],
      });

      // 3. Ask execution mode (or use flag)
      const mode: ExecutionMode = opts.mode || await select<ExecutionMode>({
        message: 'How much control do you want?',
        choices: [
          { name: 'Interactive — review extracted docs before agents start working', value: 'interactive' },
          { name: 'Full-HOOL — extract and go, review later', value: 'full-hool' },
        ],
      });

      const adapter = createAdapter(platform);
      const promptsDir = await getPromptsSourceDir();
      const config: AdapterConfig = {
        platform,
        projectType,
        projectDir,
        promptsDir,
        mode,
      };

      // 4. Scaffold HOOL structure around existing code
      console.log(chalk.dim('\n  Scaffolding HOOL around existing project...'));
      await scaffoldOnboard(projectDir, projectType, mode);
      console.log(chalk.green('  ✓ HOOL structure created (existing code untouched)'));

      // 5. Copy prompt templates
      console.log(chalk.dim('  Copying agent prompts...'));
      try {
        await copyPrompts(projectDir, promptsDir);
        console.log(chalk.green('  ✓ Agent prompts copied to .hool/prompts/'));
      } catch {
        console.log(chalk.yellow('  ⚠ Could not copy prompts (source not found). Copy them manually to .hool/prompts/'));
      }

      // 6. Inject platform instructions
      console.log(chalk.dim(`  Configuring for ${platform}...`));
      await adapter.injectInstructions(config);
      console.log(chalk.green(`  ✓ ${platform} instructions injected`));

      // 7. Check & install MCPs
      if (platform !== 'generic') {
        console.log(chalk.dim('  Checking MCPs...'));
        const results = await checkAndInstallMcps(adapter, config);

        for (const r of results) {
          if (r.status === 'already-installed') {
            console.log(chalk.green(`  ✓ ${r.name} — already installed`));
          } else if (r.status === 'installed') {
            console.log(chalk.green(`  ✓ ${r.name} — installed`));
          } else {
            console.log(chalk.red(`  ✗ ${r.name} — failed: ${r.error}`));
          }
        }
      }

      // 8. Write MCP manifest + agent manifest
      const requiredMcps = getRequiredMcpNames(projectType);
      await writeMcpManifest(projectDir, projectType, requiredMcps);
      console.log(chalk.green('  ✓ MCP manifest written to .hool/mcps.json'));

      await writeAgentManifest(projectDir);
      console.log(chalk.green('  ✓ Agent manifest written to .hool/agents.json'));

      // 9. Done
      console.log(chalk.bold.green(`\n  HOOL onboarding ready for: ${projectType}`));
      console.log(chalk.dim(`  Platform: ${platform}`));
      console.log(chalk.dim(`  Mode: ${mode}`));
      console.log(chalk.dim(`  MCPs: ${requiredMcps.join(', ')}`));

      const onboardMessage = platform === 'claude-code'
        ? [
            '',
            '  Next — start the onboarding analysis:',
            '    $ claude',
            '    > Read operations/current-phase.md and begin onboarding',
            '',
            '  The Product Lead will scan your codebase, extract architecture,',
            '  infer a spec, and surface issues. You\'ll review before agents start.',
          ].join('\n')
        : platform === 'cursor'
          ? [
              '',
              '  Next — start the onboarding analysis:',
              '    1. Open this project in Cursor',
              '    2. Tell the agent: "Read operations/current-phase.md and begin onboarding"',
              '',
              '  The agent will scan your codebase, extract docs, and present findings for review.',
            ].join('\n')
          : [
              '',
              '  Next — start the onboarding analysis:',
              '    1. Open this project in your AI coding tool',
              '    2. Load HOOL-INSTRUCTIONS.md',
              '    3. Tell the agent: "Read operations/current-phase.md and begin onboarding"',
            ].join('\n');

      console.log(onboardMessage);
      console.log('');
    }
  });

// ── hool status ────────────────────────────────────────────

program
  .command('status')
  .description('Show current phase and task board summary')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(async (opts) => {
    const projectDir = path.resolve(opts.dir);

    try {
      const phase = await fs.readFile(path.join(projectDir, 'operations/current-phase.md'), 'utf-8');
      const taskBoard = await fs.readFile(path.join(projectDir, 'operations/task-board.md'), 'utf-8');
      const bugs = await fs.readFile(path.join(projectDir, 'operations/bugs.md'), 'utf-8');
      const review = await fs.readFile(path.join(projectDir, 'operations/needs-human-review.md'), 'utf-8');

      console.log(chalk.bold('\n  HOOL Status\n'));
      console.log(chalk.dim('  ── Phase ──'));
      console.log('  ' + phase.split('\n').slice(0, 5).join('\n  '));

      const pendingTasks = (taskBoard.match(/- \[ \]/g) || []).length;
      const completedTasks = (taskBoard.match(/- \[x\]/g) || []).length;
      console.log(chalk.dim('\n  ── Tasks ──'));
      console.log(`  Pending: ${pendingTasks}  Completed: ${completedTasks}`);

      const bugCount = (bugs.match(/## BUG-/g) || []).length;
      console.log(chalk.dim('\n  ── Bugs ──'));
      console.log(`  Open: ${bugCount}`);

      const needsReview = !review.includes('Nothing pending');
      console.log(chalk.dim('\n  ── Human Review ──'));
      console.log(`  ${needsReview ? chalk.yellow('⚠ Items pending review') : chalk.green('✓ Nothing pending')}`);
      console.log('');
    } catch {
      console.log(chalk.red('\n  Not a HOOL project (operations/ not found). Run `hool init` first.\n'));
    }
  });

// ── hool reset ─────────────────────────────────────────────

program
  .command('reset')
  .description('Reset operations and memory files (keeps phases/)')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(async (opts) => {
    const projectDir = path.resolve(opts.dir);

    const confirmed = await confirm({
      message: 'This will reset all operations files and agent memory. Phase docs will be kept. Continue?',
      default: false,
    });

    if (!confirmed) {
      console.log(chalk.dim('  Cancelled.'));
      return;
    }

    // Re-scaffold operations and memory only
    const { getOperationTemplates, getMemoryHeaders } = await import('./core/templates.js');
    const opTemplates = getOperationTemplates();
    for (const [filename, content] of Object.entries(opTemplates)) {
      await fs.writeFile(path.join(projectDir, 'operations', filename), content, 'utf-8');
    }

    const agents = ['product-lead', 'fe-tech-lead', 'be-tech-lead', 'fe-dev', 'be-dev', 'qa', 'forensic'];
    const memoryHeaders = getMemoryHeaders();
    for (const agent of agents) {
      const agentDir = path.join(projectDir, 'memory', agent);
      await fs.mkdir(agentDir, { recursive: true });
      for (const [filename, content] of Object.entries(memoryHeaders)) {
        await fs.writeFile(path.join(agentDir, filename), content, 'utf-8');
      }
    }

    console.log(chalk.green('\n  ✓ Operations and memory reset. Phase docs preserved.\n'));
  });

// ── hool mode ─────────────────────────────────────────────

program
  .command('mode')
  .description('Show or switch execution mode (interactive / full-hool)')
  .argument('[new-mode]', 'New mode to switch to (interactive or full-hool)')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(async (newMode: string | undefined, opts: { dir: string }) => {
    const projectDir = path.resolve(opts.dir);

    const profilePath = path.join(projectDir, 'phases/00-init/project-profile.md');
    const phasePath = path.join(projectDir, 'operations/current-phase.md');

    try {
      let profile = await fs.readFile(profilePath, 'utf-8');
      const currentMode = profile.match(/\*\*Mode\*\*:\s*(\S+)/)?.[1] || 'unknown';

      if (!newMode) {
        console.log(chalk.bold(`\n  Current mode: ${currentMode}\n`));
        return;
      }

      if (newMode !== 'interactive' && newMode !== 'full-hool') {
        console.log(chalk.red(`\n  Invalid mode: ${newMode}. Use "interactive" or "full-hool".\n`));
        return;
      }

      if (newMode === currentMode) {
        console.log(chalk.dim(`\n  Already in ${currentMode} mode.\n`));
        return;
      }

      // Update project-profile.md
      profile = profile.replace(/(\*\*Mode\*\*:\s*)\S+/, `$1${newMode}`);
      await fs.writeFile(profilePath, profile, 'utf-8');

      // Update current-phase.md
      try {
        let phase = await fs.readFile(phasePath, 'utf-8');
        phase = phase.replace(/(\*\*Mode\*\*:\s*)\S+/, `$1${newMode}`);
        await fs.writeFile(phasePath, phase, 'utf-8');
      } catch { /* current-phase.md might not have mode yet */ }

      console.log(chalk.green(`\n  Mode switched: ${currentMode} -> ${newMode}`));
      console.log(chalk.dim(`  Updated: project-profile.md, current-phase.md\n`));
    } catch {
      console.log(chalk.red('\n  Not a HOOL project. Run `hool init` first.\n'));
    }
  });

program.parse();
