import { describe, expect, it } from 'vitest';
import { visibleGroups } from './nav';

describe('visibleGroups', () => {
  it('hides items without permission and drops empty groups', () => {
    const groups = visibleGroups((p) => !p || p === 'jobs:view');
    const labels = groups.flatMap(([, items]) => items.map((i) => i.label));
    expect(labels).toEqual(['Dashboard', 'Jobs', 'Tasks', 'Chat']);
    expect(groups.map(([g]) => g)).toEqual(['Recruit', 'Workspace']);
  });
  it('shows everything to a user with every permission', () => {
    expect(visibleGroups(() => true).flatMap(([, i]) => i)).toHaveLength(19);
  });
});
