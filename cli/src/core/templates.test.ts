import { describe, it, expect } from 'vitest';
import {
  getOperationTemplates,
  getOnboardOperationTemplates,
  getOnboardCurrentPhase,
  getOnboardTasksPrepend,
  getMemoryHeaders,
} from './templates.js';

describe('getOperationTemplates', () => {
  it('returns all expected operation files', () => {
    const templates = getOperationTemplates();
    const expectedFiles = [
      'current-phase.md',
      'task-board.md',
      'bugs.md',
      'issues.md',
      'inconsistencies.md',
      'needs-human-review.md',
      'client-preferences.md',
      'governor-rules.md',
      'governor-log.md',
    ];
    for (const file of expectedFiles) {
      expect(templates).toHaveProperty(file);
      expect(templates[file].length).toBeGreaterThan(0);
    }
  });

  it('defaults to interactive mode', () => {
    const templates = getOperationTemplates();
    expect(templates['current-phase.md']).toContain('interactive');
  });

  it('respects full-hool mode', () => {
    const templates = getOperationTemplates('full-hool');
    expect(templates['current-phase.md']).toContain('full-hool');
  });

  it('sets phase to 0 for init', () => {
    const templates = getOperationTemplates();
    expect(templates['current-phase.md']).toContain('Phase**: 0');
  });

  it('includes all governor rule severity levels', () => {
    const rules = getOperationTemplates()['governor-rules.md'];
    expect(rules).toContain('[CRITICAL]');
    expect(rules).toContain('[HIGH]');
    expect(rules).toContain('[MEDIUM]');
  });

  it('includes single-instance dispatch rule in governor-rules', () => {
    const rules = getOperationTemplates()['governor-rules.md'];
    expect(rules).toContain('Never dispatch multiple instances of the same agent in parallel');
  });

  it('task-board starts empty', () => {
    const templates = getOperationTemplates();
    expect(templates['task-board.md']).toContain('No tasks yet');
  });

  it('client-preferences has all sections', () => {
    const prefs = getOperationTemplates()['client-preferences.md'];
    expect(prefs).toContain('## Tech Preferences');
    expect(prefs).toContain('## Product Constraints');
    expect(prefs).toContain('## Integrations');
  });
});

describe('getOnboardOperationTemplates', () => {
  it('returns all expected operation files', () => {
    const templates = getOnboardOperationTemplates();
    expect(Object.keys(templates)).toHaveLength(9);
  });

  it('sets phase to onboarding', () => {
    const templates = getOnboardOperationTemplates();
    expect(templates['current-phase.md']).toContain('Phase**: onboarding');
  });

  it('task-board has all 11 ONBOARD tasks', () => {
    const board = getOnboardOperationTemplates()['task-board.md'];
    for (let i = 1; i <= 11; i++) {
      const taskId = `ONBOARD-${String(i).padStart(3, '0')}`;
      expect(board).toContain(taskId);
    }
  });

  it('all ONBOARD tasks are assigned to product-lead', () => {
    const board = getOnboardOperationTemplates()['task-board.md'];
    const taskLines = board.split('\n').filter(l => l.includes('ONBOARD-'));
    for (const line of taskLines) {
      expect(line).toContain('assigned: product-lead');
    }
  });

  it('ONBOARD tasks have dependency chains', () => {
    const board = getOnboardOperationTemplates()['task-board.md'];
    expect(board).toContain('depends: ONBOARD-001');
    expect(board).toContain('depends: ONBOARD-010');
  });

  it('includes single-instance dispatch rule in governor-rules', () => {
    const rules = getOnboardOperationTemplates()['governor-rules.md'];
    expect(rules).toContain('Never dispatch multiple instances of the same agent in parallel');
  });
});

describe('getOnboardCurrentPhase', () => {
  it('returns onboarding phase content', () => {
    const content = getOnboardCurrentPhase();
    expect(content).toContain('Phase**: onboarding');
    expect(content).toContain('awaiting-analysis');
  });

  it('respects mode parameter', () => {
    expect(getOnboardCurrentPhase('full-hool')).toContain('full-hool');
    expect(getOnboardCurrentPhase('interactive')).toContain('interactive');
  });

  it('describes 5-step onboarding process', () => {
    const content = getOnboardCurrentPhase();
    expect(content).toContain('1. Full project scan');
    expect(content).toContain('5. Present comprehensive summary');
  });
});

describe('getOnboardTasksPrepend', () => {
  it('contains re-onboard header', () => {
    const content = getOnboardTasksPrepend();
    expect(content).toContain('## Re-onboard Tasks');
  });

  it('has all 11 ONBOARD tasks', () => {
    const content = getOnboardTasksPrepend();
    for (let i = 1; i <= 11; i++) {
      const taskId = `ONBOARD-${String(i).padStart(3, '0')}`;
      expect(content).toContain(taskId);
    }
  });

  it('includes compare/update language for re-onboard', () => {
    const content = getOnboardTasksPrepend();
    expect(content).toContain('Compare');
  });
});

describe('getMemoryHeaders', () => {
  it('returns all 5 memory files', () => {
    const headers = getMemoryHeaders();
    const expectedFiles = [
      'hot.md',
      'cold.md',
      'best-practices.md',
      'issues.md',
      'governor-feedback.md',
    ];
    for (const file of expectedFiles) {
      expect(headers).toHaveProperty(file);
      expect(headers[file].length).toBeGreaterThan(0);
    }
  });

  it('hot.md has three sections', () => {
    const hot = getMemoryHeaders()['hot.md'];
    expect(hot).toContain('## Compact');
    expect(hot).toContain('## Summary');
    expect(hot).toContain('## Recent');
  });

  it('cold.md has Cold Log header', () => {
    expect(getMemoryHeaders()['cold.md']).toContain('# Cold Log');
  });
});
