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

export function getMemoryHeaders(): Record<string, string> {
  return {
    'hot.md': `## Compact\n_No history yet._\n\n## Summary\n_No history yet._\n\n## Recent\n_No history yet._\n`,

    'cold.md': `# Cold Log\n\n`,

    'best-practices.md': `# Best Practices\n\n_No patterns or gotchas logged yet._\n`,

    'issues.md': `# Personal Issues Log\n\n_No issues logged yet._\n`,
  };
}
