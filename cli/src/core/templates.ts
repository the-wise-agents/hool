export function getOperationTemplates(mode: string = 'interactive'): Record<string, string> {
  return {
    'current-phase.md': `# Current Phase\n\n- **Mode**: ${mode}\n- **Phase**: 0 (Project Init)\n\nAwaiting start.\n`,

    'task-board.md': `# Task Board\n\n## Active Tasks\n_No tasks yet._\n\n## Completed Tasks\n_None._\n`,

    'bugs.md': `# Bug Tracker\n\n_No bugs reported yet._\n`,

    'issues.md': `# Issues\n\n_No issues logged yet._\n`,

    'inconsistencies.md': `# Inconsistencies\n\n_No inconsistencies found yet._\n`,

    'needs-human-review.md': `# Needs Human Review\n\n_Nothing pending human review._\n`,
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
  };
}

export function getMemoryHeaders(): Record<string, string> {
  return {
    'hot.md': `## Compact\n_No history yet._\n\n## Summary\n_No history yet._\n\n## Recent\n_No history yet._\n`,

    'cold.md': `# Cold Log\n\n`,

    'best-practices.md': `# Best Practices\n\n_No patterns or gotchas logged yet._\n`,

    'issues.md': `# Personal Issues Log\n\n_No issues logged yet._\n`,
  };
}
