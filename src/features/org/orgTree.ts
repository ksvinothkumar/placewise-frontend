import type { OrgMember } from '@/api/endpoints/users';

export interface OrgNode {
  m: OrgMember;
  kids: OrgNode[];
}

/**
 * Turns the flat "who reports to whom" list into trees. Anyone without a manager (or whose manager is not on the team
 * any more) starts a tree. A loop in bad data is broken at one person instead of hiding everyone in it.
 */
export function buildForest(members: OrgMember[]): OrgNode[] {
  const ids = new Set(members.map((m) => m.id));
  const nodes = new Map(members.map((m) => [m.id, { m, kids: [] as OrgNode[] }]));
  const roots: OrgNode[] = [];
  for (const m of members) {
    const parent = m.manager && ids.has(m.manager) && m.manager !== m.id ? nodes.get(m.manager) : undefined;
    (parent ? parent.kids : roots).push(nodes.get(m.id)!);
  }
  const seen = new Set<string>();
  const mark = (n: OrgNode) => {
    if (seen.has(n.m.id)) return;
    seen.add(n.m.id);
    n.kids.forEach(mark);
  };
  roots.forEach(mark);
  for (const n of nodes.values()) {
    if (seen.has(n.m.id)) continue; // only a cycle leaves people unreached
    const parent = nodes.get(n.m.manager ?? '');
    if (parent) parent.kids = parent.kids.filter((k) => k !== n); // cut the loop here
    roots.push(n);
    mark(n);
  }
  const byName = (a: OrgNode, b: OrgNode) => a.m.name.localeCompare(b.m.name);
  const sort = (list: OrgNode[]) => (list.sort(byName), list.forEach((n) => sort(n.kids)));
  sort(roots);
  return roots;
}

export const countAll = (n: OrgNode): number => n.kids.reduce((t, k) => t + 1 + countAll(k), 0);

/** Flattened depth-first, for the list view. */
export function flatten(roots: OrgNode[], depth = 0): { node: OrgNode; depth: number }[] {
  return roots.flatMap((n) => [{ node: n, depth }, ...flatten(n.kids, depth + 1)]);
}
