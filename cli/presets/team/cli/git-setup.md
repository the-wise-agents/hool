# CLI Integration: Git Repo Setup

## Overview

hool-team uses a **three-repo model**. The CLI must handle git initialization during `hool init` based on the project type and user's GitHub remote preferences.

## Init Flow

### Step 1: Project Type (determines which repos are needed)

```
? What are we building?
  > Web application        → needs FE + BE repos
  > API / backend only     → needs BE repo only
  > CLI tool               → needs BE repo only (or just project-level)
  > Browser game           → needs FE repo (+ BE if multiplayer)
  > Animation              → needs FE repo only
  > Mobile app             → needs FE + BE repos
  > Desktop application    → needs FE + BE repos
  > Other                  → ask follow-up
```

### Step 2: Git Remotes (only for applicable repos)

If FE is needed:
```
? GitHub remote for frontend? (leave blank for local-only git)
> https://github.com/user/project-frontend.git
```

If BE is needed:
```
? GitHub remote for backend? (leave blank for local-only git)
> https://github.com/user/project-backend.git
```

### Step 3: Git Initialization

```typescript
async function setupGitRepos(projectType: string, feRemote?: string, beRemote?: string) {
  const projectRoot = process.cwd();

  // 1. Project-level git (always)
  if (!existsSync(join(projectRoot, '.git'))) {
    await exec('git init', { cwd: projectRoot });
  }

  // 2. Create .gitignore at project root
  const gitignoreEntries = ['.hool/logs/', '.hool/browser-profiles/', 'node_modules/'];

  // 3. Frontend repo (if applicable)
  if (needsFE(projectType)) {
    const feDir = join(projectRoot, 'src', 'frontend');
    mkdirSync(feDir, { recursive: true });
    gitignoreEntries.push('src/frontend/');

    await exec('git init', { cwd: feDir });
    if (feRemote) {
      await exec(`git remote add origin ${feRemote}`, { cwd: feDir });
    }
  }

  // 4. Backend repo (if applicable)
  if (needsBE(projectType)) {
    const beDir = join(projectRoot, 'src', 'backend');
    mkdirSync(beDir, { recursive: true });
    gitignoreEntries.push('src/backend/');

    await exec('git init', { cwd: beDir });
    if (beRemote) {
      await exec(`git remote add origin ${beRemote}`, { cwd: beDir });
    }
  }

  // 5. Write .gitignore
  writeFileSync(
    join(projectRoot, '.gitignore'),
    gitignoreEntries.join('\n') + '\n'
  );

  // 6. Install Playwright MCP globally + create browser profile directories
  if (needsFE(projectType)) {
    // Permanent global install — profiles persist auth state across sessions
    await exec('npm install -g @playwright/mcp');

    // Each agent gets its own browser profile for persisted auth state
    mkdirSync(join(projectRoot, '.hool', 'browser-profiles', 'qa'), { recursive: true });
    mkdirSync(join(projectRoot, '.hool', 'browser-profiles', 'fe-dev'), { recursive: true });
    mkdirSync(join(projectRoot, '.hool', 'browser-profiles', 'forensic'), { recursive: true });
  }

  // 7. Store remotes in client preferences
  const prefs = readFileSync(join(projectRoot, '.hool/operations/client-preferences.md'), 'utf-8');
  const remoteSection = `\n## Git Remotes\n- frontend: ${feRemote || 'local only'}\n- backend: ${beRemote || 'local only'}\n`;
  writeFileSync(
    join(projectRoot, '.hool/operations/client-preferences.md'),
    prefs.replace('## Git Remotes\n<!-- Captured during Phase 0 init -->\n<!-- frontend: ... -->\n<!-- backend: ... -->', remoteSection.trim())
  );
}

function needsFE(projectType: string): boolean {
  return ['web-app', 'browser-game', 'animation', 'mobile', 'desktop'].includes(projectType);
}

function needsBE(projectType: string): boolean {
  return ['web-app', 'api-only', 'cli-tool', 'mobile', 'desktop'].includes(projectType);
}
```

## Ship Phase Git Flow

```typescript
async function shipFlow(feRemote?: string, beRemote?: string, version?: string) {
  const tag = version || `v${Date.now()}`;

  // 1. Frontend
  if (existsSync('src/frontend/.git')) {
    if (feRemote) {
      await exec('git push -u origin main', { cwd: 'src/frontend' });
      // Create PR via gh CLI if available
      try {
        await exec(`gh pr create --title "Release ${tag}" --body "HOOL automated release"`, { cwd: 'src/frontend' });
      } catch {
        console.log('gh CLI not available — pushed branch, create PR manually');
      }
    } else {
      await exec(`git tag -a ${tag} -m "Release ${tag}"`, { cwd: 'src/frontend' });
    }
  }

  // 2. Backend
  if (existsSync('src/backend/.git')) {
    if (beRemote) {
      await exec('git push -u origin main', { cwd: 'src/backend' });
      try {
        await exec(`gh pr create --title "Release ${tag}" --body "HOOL automated release"`, { cwd: 'src/backend' });
      } catch {
        console.log('gh CLI not available — pushed branch, create PR manually');
      }
    } else {
      await exec(`git tag -a ${tag} -m "Release ${tag}"`, { cwd: 'src/backend' });
    }
  }

  // 3. Project-level
  await exec(`git tag -a ${tag} -m "Release ${tag}"`);
}
```

## Key Differences from hool-mini

| Aspect | hool-mini | hool-team |
|--------|-----------|-----------|
| Git repos | 1 (project-level) | 3 (project + FE + BE) |
| Who commits | PL only | PL (project), Leads/Devs (domain repos) |
| .gitignore | N/A | src/frontend/ and src/backend/ ignored at project level |
| Remote setup | Not handled | CLI asks during init |
| Ship flow | PL commits + pushes | Domain repos push/tag independently |

## Agent Settings Integration

The `CLAUDE_AGENT` env var tells hooks which agent is running. The CLI should set this when spawning teammates:

```json
{
  "env": {
    "CLAUDE_AGENT": "be-dev"
  }
}
```

This is used by:
- `metrics.sh` — per-agent tool call counting
- `identity-reminder.sh` — inject correct agent context
- `completion-checklist.sh` — check correct domain repo for uncommitted changes
