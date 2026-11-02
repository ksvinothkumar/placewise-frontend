import { describe, expect, it } from 'vitest';
import type { OrgMember } from '@/api/endpoints/users';
import { buildForest, countAll, flatten } from './orgTree';

const m = (id: string, manager: string | null = null): OrgMember => ({ id, name: id.toUpperCase(), email: `${id}@x`, role: 'recruiter', manager });

describe('buildForest', () => {
  it('nests people under their manager and sorts siblings by name', () => {
    const f = buildForest([m('d', 'b'), m('c', 'a'), m('b', 'a'), m('a')]);
    expect(f.map((n) => n.m.id)).toEqual(['a']);
    expect(f[0]!.kids.map((n) => n.m.id)).toEqual(['b', 'c']);
    expect(f[0]!.kids[0]!.kids.map((n) => n.m.id)).toEqual(['d']);
    expect(countAll(f[0]!)).toBe(3);
    expect(flatten(f).map((x) => `${x.node.m.id}${x.depth}`)).toEqual(['a0', 'b1', 'd2', 'c1']);
  });
  it('starts a tree for anyone without a manager, or whose manager has left', () => {
    expect(buildForest([m('a'), m('b'), m('c', 'ghost')]).map((n) => n.m.id)).toEqual(['a', 'b', 'c']);
  });
  it('shows everyone even when bad data contains a loop', () => {
    const f = buildForest([m('a', 'b'), m('b', 'a'), m('c', 'c')]);
    const ids = flatten(f).map((x) => x.node.m.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});
