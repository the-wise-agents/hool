export function getOperationTemplates(mode: string = 'interactive'): Record<string, string> {
  return {
    'current-phase.md': `# Current Phase\n\n- **Mode**: ${mode}\n- **Phase**: 0 (Project Init)\n\nAwaiting start.\n`,

    'task-board.md': `# Task Board\n\n## Active Tasks\n_No tasks yet._\n\n## Completed Tasks\n_None._\n`,

    'bugs.md': `# Bug Tracker\n\n_No bugs reported yet._\n`,

    'issues.md': `# Issues\n\n_No issues logged yet._\n`,

    'inconsistencies.md': `# Inconsistencies\n\n_No inconsistencies found yet._\n`,

    'needs-human-review.md': `# Needs Human Review\n\n_Nothing pending human review._\n`,

    'client-preferences.md': `# Client Preferences\n\nUser tech and product preferences captured during the project. Every agent honours these.\n\n## Tech Preferences\n_None yet._\n\n## Product Constraints\n_None yet._\n\n## Integrations\n_None yet._\n`,

    'governor-rules.md': `# Governor Rules\n\nHard rules enforced by the Governor agent. Agents self-enforce; Governor audits.\n\n## Critical (must never happen even once)\n- [CRITICAL] No agent may modify its own prompt files (.hool/prompts/)\n- [CRITICAL] Product Lead must NEVER edit application code (src/, tests/) directly — always dispatch\n- [CRITICAL] No agent may remove or overwrite entries in governor-rules.md\n\n## High\n- [HIGH] All agents must load operations/client-preferences.md and honour user preferences\n- [HIGH] Product Lead must write a dispatch brief to operations/context/ before dispatching any agent\n- [HIGH] No task is too small for agent dispatch — even one-line changes go through the assigned agent\n\n## Medium\n- [MEDIUM] Agents must review best-practices.md and governor-feedback.md before submitting work\n- [MEDIUM] All file edits must be within the agent's declared writable paths\n`,

    'governor-log.md': `# Governor Log\n\n_No audits yet._\n`,
  };
}

export function getOnboardOperationTemplates(mode: string = 'interactive'): Record<string, string> {
  return {
    'current-phase.md': `# Current Phase

- **Mode**: ${mode}
- **Phase**: onboarding
- **Status**: awaiting-analysis

Onboarding an existing project. See the "Onboarding Process" section in the orchestrator prompt for the full scan checklist and phase doc requirements. The Product Lead will:
1. Full project scan — read ALL docs, configs, code structure, git history
2. Reverse-engineer EVERY applicable phase doc (brainstorm, spec, design, architecture, LLDs, test plan)
3. Populate operations files (bugs from TODOs, tech debt, inconsistencies, client preferences)
4. Seed agent memory with findings
5. Present comprehensive summary for human review

After onboarding completes and human reviews, phase transitions to **standby**.
`,

    'task-board.md': `# Task Board

## Active Tasks
- [ ] ONBOARD-001: Full project scan — read ALL docs (README, CLAUDE.md, CONTRIBUTING, CHANGELOG, docs/, AI instruction files), ALL configs (package.json/pyproject.toml/etc, tsconfig, eslint, docker, CI/CD, .env.example), ALL existing memory (memory/*/best-practices.md, issues.md, cold.md, governor-feedback.md — PRESERVE these), any MEMORY.md/LEARNINGS.md/docs/.agent-memory/, existing HOOL state (operations/, phases/, .hool/*.json), map directory tree, identify entry points, git log -50, git shortlog -sn | assigned: product-lead
- [ ] ONBOARD-002: Brainstorm extraction — reverse-engineer phases/01-brainstorm/brainstorm.md from README, docs, git history. Capture: vision, goals, target users, key decisions, constraints. Tag all items [INFERRED] | assigned: product-lead | depends: ONBOARD-001
- [ ] ONBOARD-003: Spec inference — reverse-engineer phases/02-spec/spec.md from code behavior, existing tests (test names ARE spec), API endpoints, UI screens, docs. Write user stories with acceptance criteria. Tag each: [FROM-CODE], [FROM-TESTS], [FROM-DOCS], [INFERRED]. Flag anything that looks like a bug | assigned: product-lead | depends: ONBOARD-001
- [ ] ONBOARD-004: Architecture extraction — reverse-engineer phases/04-architecture/architecture.md, contracts/, schema.md, flows/ from code structure, configs, dependency graph, API routes, DB schemas/migrations/models | assigned: product-lead | depends: ONBOARD-001
- [ ] ONBOARD-005: Design extraction (if FE exists) — reverse-engineer phases/03-design/design.md from frontend components, CSS/design tokens, layouts. Skip if no frontend | assigned: product-lead | depends: ONBOARD-001
- [ ] ONBOARD-006: FE LLD extraction (if FE exists) — reverse-engineer phases/05-fe-scaffold/fe-lld.md from frontend code patterns, component hierarchy, routing, state management. Skip if no frontend | assigned: product-lead | depends: ONBOARD-004
- [ ] ONBOARD-007: BE LLD extraction (if BE exists) — reverse-engineer phases/06-be-scaffold/be-lld.md from backend code patterns, service layer, middleware, data access. Skip if no backend | assigned: product-lead | depends: ONBOARD-004
- [ ] ONBOARD-008: Test plan extraction — reverse-engineer phases/07-test-plan/test-plan.md from existing test files, test configs, CI test commands. Map existing tests to spec stories. Capture coverage gaps | assigned: product-lead | depends: ONBOARD-003
- [ ] ONBOARD-009: Operations population — scan for TODOs/FIXMEs/HACK (→ bugs.md), tech debt/code smells (→ issues.md), doc-vs-code gaps (→ inconsistencies.md), infer client preferences from configs/lint rules (→ client-preferences.md) | assigned: product-lead | depends: ONBOARD-001
- [ ] ONBOARD-010: Seed agent memory — route findings to agent memory files (see orchestrator "Memory Seeding" section for per-agent routing). Write each finding from the receiving agent's perspective. A finding CAN go to multiple agents if actionable from each role. Skip agents the project doesn't use. Append to existing memory, don't overwrite | assigned: product-lead | depends: ONBOARD-002 ONBOARD-003 ONBOARD-004 ONBOARD-009
- [ ] ONBOARD-011: Human review gate — write summary to needs-human-review.md listing every phase doc produced with confidence level, all inconsistencies, all issues. Present to user for review | assigned: product-lead | depends: ONBOARD-010

## Completed Tasks
_None._
`,

    'bugs.md': `# Bug Tracker

_No bugs reported yet._
`,

    'issues.md': `# Issues

_No issues logged yet. Onboarding will populate this._
`,

    'inconsistencies.md': `# Inconsistencies

_No inconsistencies found yet. Onboarding will populate this._
`,

    'needs-human-review.md': `# Needs Human Review

_Onboarding will add the inferred spec here for review._
`,

    'client-preferences.md': `# Client Preferences\n\nUser tech and product preferences captured during the project. Every agent honours these.\n\n## Tech Preferences\n_None yet._\n\n## Product Constraints\n_None yet._\n\n## Integrations\n_None yet._\n`,

    'governor-rules.md': `# Governor Rules\n\nHard rules enforced by the Governor agent. Agents self-enforce; Governor audits.\n\n## Critical (must never happen even once)\n- [CRITICAL] No agent may modify its own prompt files (.hool/prompts/)\n- [CRITICAL] Product Lead must NEVER edit application code (src/, tests/) directly — always dispatch\n- [CRITICAL] No agent may remove or overwrite entries in governor-rules.md\n\n## High\n- [HIGH] All agents must load operations/client-preferences.md and honour user preferences\n- [HIGH] Product Lead must write a dispatch brief to operations/context/ before dispatching any agent\n- [HIGH] No task is too small for agent dispatch — even one-line changes go through the assigned agent\n\n## Medium\n- [MEDIUM] Agents must review best-practices.md and governor-feedback.md before submitting work\n- [MEDIUM] All file edits must be within the agent's declared writable paths\n`,

    'governor-log.md': `# Governor Log\n\n_No audits yet._\n`,
  };
}

export function getOnboardCurrentPhase(mode: string = 'interactive'): string {
  return `# Current Phase

- **Mode**: ${mode}
- **Phase**: onboarding
- **Status**: awaiting-analysis

Onboarding an existing project. See the "Onboarding Process" section in the orchestrator prompt for the full scan checklist and phase doc requirements. The Product Lead will:
1. Full project scan — read ALL docs, configs, code structure, git history
2. Reverse-engineer EVERY applicable phase doc (brainstorm, spec, design, architecture, LLDs, test plan)
3. Populate operations files (bugs from TODOs, tech debt, inconsistencies, client preferences)
4. Seed agent memory with findings
5. Present comprehensive summary for human review

After onboarding completes and human reviews, phase transitions to **standby**.
`;
}

export function getOnboardTasksPrepend(): string {
  return `## Re-onboard Tasks
- [ ] ONBOARD-001: Full project scan — read ALL docs (README, CLAUDE.md, CONTRIBUTING, CHANGELOG, docs/, AI instruction files), ALL configs (package.json/pyproject.toml/etc, tsconfig, eslint, docker, CI/CD, .env.example), ALL existing memory (memory/*/best-practices.md, issues.md, cold.md, governor-feedback.md — PRESERVE these), any MEMORY.md/LEARNINGS.md/docs/.agent-memory/, existing HOOL state (operations/, phases/, .hool/*.json), map directory tree, identify entry points, git log -50, git shortlog -sn. Compare against existing phase docs for drift | assigned: product-lead
- [ ] ONBOARD-002: Update brainstorm — compare phases/01-brainstorm/brainstorm.md against current README/docs/git history. Update or create if missing. Tag changes [RE-ONBOARD] | assigned: product-lead | depends: ONBOARD-001
- [ ] ONBOARD-003: Update spec — compare phases/02-spec/spec.md against current code behavior, tests, API endpoints. Add new stories, mark removed features. Tag: [FROM-CODE], [FROM-TESTS], [FROM-DOCS], [INFERRED] | assigned: product-lead | depends: ONBOARD-001
- [ ] ONBOARD-004: Update architecture — compare phases/04-architecture/ against current code structure, configs, deps. Update architecture.md, contracts/, schema.md, flows/ | assigned: product-lead | depends: ONBOARD-001
- [ ] ONBOARD-005: Update design (if FE exists) — compare phases/03-design/ against current frontend. Skip if no frontend | assigned: product-lead | depends: ONBOARD-001
- [ ] ONBOARD-006: Update FE LLD (if FE exists) — compare phases/05-fe-scaffold/fe-lld.md against current frontend code. Skip if no frontend | assigned: product-lead | depends: ONBOARD-004
- [ ] ONBOARD-007: Update BE LLD (if BE exists) — compare phases/06-be-scaffold/be-lld.md against current backend code. Skip if no backend | assigned: product-lead | depends: ONBOARD-004
- [ ] ONBOARD-008: Update test plan — compare phases/07-test-plan/ against current test files. Map new tests to stories. Flag coverage gaps | assigned: product-lead | depends: ONBOARD-003
- [ ] ONBOARD-009: Update operations — rescan for TODOs/FIXMEs (→ bugs.md), tech debt (→ issues.md), doc-vs-code gaps (→ inconsistencies.md), preferences from configs (→ client-preferences.md) | assigned: product-lead | depends: ONBOARD-001
- [ ] ONBOARD-010: Seed agent memory — route findings to agent memory files (see orchestrator "Memory Seeding" section for per-agent routing). Write each finding from the receiving agent's perspective. A finding CAN go to multiple agents if actionable from each role. Skip agents the project doesn't use. Append to existing memory, don't overwrite | assigned: product-lead | depends: ONBOARD-002 ONBOARD-003 ONBOARD-004 ONBOARD-009
- [ ] ONBOARD-011: Human review gate — write summary to needs-human-review.md listing changes since last onboard, new inconsistencies, updated phase docs with confidence levels | assigned: product-lead | depends: ONBOARD-010

`;
}

export function getMemoryHeaders(): Record<string, string> {
  return {
    'hot.md': `## Compact\n_No history yet._\n\n## Summary\n_No history yet._\n\n## Recent\n_No history yet._\n`,

    'cold.md': `# Cold Log\n\n`,

    'best-practices.md': `# Best Practices\n\n_No patterns or gotchas logged yet._\n`,

    'issues.md': `# Personal Issues Log\n\n_No issues logged yet._\n`,

    'governor-feedback.md': `# Governor Feedback\n\n_No feedback yet._\n`,
  };
}
