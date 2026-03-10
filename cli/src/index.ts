#!/usr/bin/env node

import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { scaffoldProject, scaffoldOnboard, reonboard, copyPrompts, writeMcpManifest, writeAgentManifest, copyPlatformFiles } from './core/scaffold.js';
import type { ExecutionMode } from './adapters/types.js';
import { createAdapter } from './adapters/index.js';
import { checkAndInstallMcps } from './mcps/installer.js';
import { getRequiredMcpNames } from './mcps/registry.js';
import type { ProjectType, AgentPlatform, AdapterConfig } from './adapters/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read version from package.json
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../package.json');

// Template root: check monorepo dev paths first (hool-mini has agents/hooks/settings),
// then bundled (npm install where prepublishOnly copies them alongside dist/).
// Returns the directory that contains prompts/, agents/, hooks/, settings/
async function getTemplateRootDir(): Promise<string> {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'hool-mini'),  // dev: cli/src/ -> hool/hool-mini/
    path.resolve(__dirname, '..', '..', '..', 'hool-mini'),  // dev: cli/dist/ -> hool/hool-mini/
    path.resolve(__dirname, '..'),  // npm: cli/dist/ -> cli/ (bundled prompts/agents/hooks/settings alongside dist/)
  ];
  for (const dir of candidates) {
    try {
      // Check for prompts/ AND agents/ to ensure it's a complete template root
      await fs.access(path.join(dir, 'prompts'));
      await fs.access(path.join(dir, 'agents'));
      return dir;
    } catch { /* not found, try next */ }
  }
  // Fallback: just check prompts/ (handles incomplete bundles)
  for (const dir of candidates) {
    try {
      await fs.access(path.join(dir, 'prompts'));
      return dir;
    } catch { /* not found, try next */ }
  }
  return candidates[0]; // last resort
}


const program = new Command();

program
  .name('hool')
  .description('Agent-Driven SDLC — scaffold and configure HOOL for any project')
  .version(PKG_VERSION);

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
    const templateRootDir = await getTemplateRootDir();
    const promptsDir = path.join(templateRootDir, 'prompts');
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

    // 5. Copy platform-specific files (agents, hooks, settings)
    console.log(chalk.dim('  Copying platform files (agents, hooks, settings)...'));
    try {
      await copyPlatformFiles(projectDir, templateRootDir, platform);
      console.log(chalk.green(`  ✓ Platform files copied for ${platform}`));
    } catch {
      console.log(chalk.yellow(`  ⚠ Could not copy platform files (source not found).`));
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
        const profile = await fs.readFile(path.join(projectDir, '.hool/phases/00-init/project-profile.md'), 'utf-8');
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
      const templateRootDir = await getTemplateRootDir();
      const promptsDir = path.join(templateRootDir, 'prompts');
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

      // 6. Copy platform-specific files (agents, hooks, settings)
      console.log(chalk.dim('  Copying platform files (agents, hooks, settings)...'));
      try {
        await copyPlatformFiles(projectDir, templateRootDir, platform);
        console.log(chalk.green(`  ✓ Platform files copied for ${platform}`));
      } catch {
        console.log(chalk.yellow(`  ⚠ Could not copy platform files (source not found).`));
      }

      // 7. Inject platform instructions
      console.log(chalk.dim(`  Configuring for ${platform}...`));
      await adapter.injectInstructions(config);
      console.log(chalk.green(`  ✓ ${platform} instructions injected`));

      // 8. Check & install MCPs
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
      const phase = await fs.readFile(path.join(projectDir, '.hool/operations/current-phase.md'), 'utf-8');
      const taskBoard = await fs.readFile(path.join(projectDir, '.hool/operations/task-board.md'), 'utf-8');
      const bugs = await fs.readFile(path.join(projectDir, '.hool/operations/bugs.md'), 'utf-8');
      const review = await fs.readFile(path.join(projectDir, '.hool/operations/needs-human-review.md'), 'utf-8');

      console.log(chalk.bold('\n  HOOL Status\n'));

      // Phase info
      console.log(chalk.dim('  ── Phase ──'));
      console.log('  ' + phase.split('\n').slice(0, 5).join('\n  '));

      // Task summary with progress bar
      const pendingTasks = (taskBoard.match(/- \[ \]/g) || []).length;
      const completedTasks = (taskBoard.match(/- \[x\]/g) || []).length;
      const totalTasks = pendingTasks + completedTasks;
      const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const barLen = 20;
      const filled = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * barLen) : 0;
      const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(barLen - filled));

      console.log(chalk.dim('\n  ── Tasks ──'));
      console.log(`  ${bar} ${pct}% (${completedTasks}/${totalTasks})`);
      console.log(`  Pending: ${pendingTasks}  Completed: ${completedTasks}`);

      // Parse tasks by agent for parallel visualization
      const taskLines = taskBoard.split('\n').filter(l => /^- \[[ x]\]/.test(l));
      const agentTasks: Record<string, { pending: number; done: number }> = {};
      for (const line of taskLines) {
        const agentMatch = line.match(/assigned:\s*(\S+)/);
        if (agentMatch) {
          const agent = agentMatch[1];
          if (!agentTasks[agent]) agentTasks[agent] = { pending: 0, done: 0 };
          if (line.startsWith('- [x]')) {
            agentTasks[agent].done++;
          } else {
            agentTasks[agent].pending++;
          }
        }
      }

      if (Object.keys(agentTasks).length > 0) {
        console.log(chalk.dim('\n  ── Agent Progress ──'));
        const maxNameLen = Math.max(...Object.keys(agentTasks).map(n => n.length));
        for (const [agent, counts] of Object.entries(agentTasks)) {
          const aTotal = counts.pending + counts.done;
          const aPct = aTotal > 0 ? Math.round((counts.done / aTotal) * 100) : 0;
          const aFilled = aTotal > 0 ? Math.round((counts.done / aTotal) * 10) : 0;
          const aBar = chalk.green('█'.repeat(aFilled)) + chalk.dim('░'.repeat(10 - aFilled));
          const status = counts.pending === 0 && counts.done > 0
            ? chalk.green('✓')
            : counts.pending > 0
              ? chalk.yellow('…')
              : ' ';
          console.log(`  ${status} ${agent.padEnd(maxNameLen)}  ${aBar} ${String(aPct).padStart(3)}% (${counts.done}/${aTotal})`);
        }
      }

      // Bugs
      const openBugs = (bugs.match(/Status: open/g) || []).length;
      const totalBugs = (bugs.match(/## BUG-/g) || []).length;
      console.log(chalk.dim('\n  ── Bugs ──'));
      if (totalBugs === 0) {
        console.log(`  ${chalk.green('✓')} No bugs`);
      } else {
        console.log(`  Open: ${openBugs > 0 ? chalk.red(openBugs) : chalk.green(0)}  Total: ${totalBugs}`);
      }

      // Inconsistencies
      let inconsistencies = 0;
      try {
        const incFile = await fs.readFile(path.join(projectDir, '.hool/operations/inconsistencies.md'), 'utf-8');
        inconsistencies = (incFile.match(/^- /gm) || []).length;
      } catch { /* file might not exist */ }
      if (inconsistencies > 0) {
        console.log(chalk.dim('\n  ── Inconsistencies ──'));
        console.log(`  ${chalk.yellow(inconsistencies)} unresolved`);
      }

      // Governor
      let dispatchCount = 0;
      try {
        const dc = await fs.readFile(path.join(projectDir, '.hool/metrics/dispatch-count.txt'), 'utf-8');
        dispatchCount = parseInt(dc.trim()) || 0;
      } catch { /* file might not exist */ }
      if (dispatchCount > 0) {
        const sinceLastAudit = dispatchCount % 3;
        console.log(chalk.dim('\n  ── Governor ──'));
        console.log(`  Dispatches: ${dispatchCount}  Since last audit: ${sinceLastAudit}/3${sinceLastAudit >= 2 ? chalk.yellow(' (audit due)') : ''}`);
      }

      // Human review
      const needsReview = !review.includes('Nothing pending');
      console.log(chalk.dim('\n  ── Human Review ──'));
      console.log(`  ${needsReview ? chalk.yellow('⚠ Items pending review') : chalk.green('✓ Nothing pending')}`);
      console.log('');
    } catch {
      console.log(chalk.red('\n  Not a HOOL project (.hool/ not found). Run `hool init` first.\n'));
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
      await fs.writeFile(path.join(projectDir, '.hool/operations', filename), content, 'utf-8');
    }

    const agents = ['product-lead', 'fe-tech-lead', 'be-tech-lead', 'fe-dev', 'be-dev', 'qa', 'forensic', 'governor'];
    const memoryHeaders = getMemoryHeaders();
    for (const agent of agents) {
      const agentDir = path.join(projectDir, '.hool/memory', agent);
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

    const profilePath = path.join(projectDir, '.hool/phases/00-init/project-profile.md');
    const phasePath = path.join(projectDir, '.hool/operations/current-phase.md');

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
