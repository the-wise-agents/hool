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

Onboarding an existing project. The Product Lead will:
1. Scan the project and generate a project profile
2. Extract architecture, contracts, schema from existing code
3. Infer a spec from observed behavior (needs human review)
4. Run gap analysis and surface issues
5. Seed agent memory with findings
6. Present a summary for human review

After onboarding completes and human reviews, phase transitions to **standby**.
`,

    'task-board.md': `# Task Board

## Active Tasks
- [ ] ONBOARD-001: Project discovery — scan codebase, identify stack
- [ ] ONBOARD-002: Architecture extraction — reverse-engineer architecture docs
- [ ] ONBOARD-003: Spec inference — infer product spec from code behavior
- [ ] ONBOARD-004: Gap analysis — surface issues, tech debt, inconsistencies
- [ ] ONBOARD-005: Seed agent memory — route findings to agent memory files
- [ ] ONBOARD-006: Human review gate — present summary for review

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

Onboarding an existing project. The Product Lead will:
1. Scan the project and generate a project profile
2. Extract architecture, contracts, schema from existing code
3. Infer a spec from observed behavior (needs human review)
4. Run gap analysis and surface issues
5. Seed agent memory with findings
6. Present a summary for human review

After onboarding completes and human reviews, phase transitions to **standby**.
`;
}

export function getOnboardTasksPrepend(): string {
  return `## Re-onboard Tasks
- [ ] ONBOARD-001: Project discovery — scan codebase, identify stack
- [ ] ONBOARD-002: Architecture extraction — reverse-engineer architecture docs
- [ ] ONBOARD-003: Spec inference — infer product spec from code behavior
- [ ] ONBOARD-004: Gap analysis — surface issues, tech debt, inconsistencies
- [ ] ONBOARD-005: Seed agent memory — route findings to agent memory files
- [ ] ONBOARD-006: Human review gate — present summary for review

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
