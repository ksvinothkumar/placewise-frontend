import { describe, expect, it } from 'vitest';
import { canMove, insertBeforeClosing, move, toPayload, toRows, validateStageRows, type StageRow } from './stageRules';

const row = (name: string, kind = 'custom', prob: number | string = 10): StageRow => ({ uid: name, key: name.toLowerCase(), name, color: '#000000', kind, prob });
const LIST = [row('Sourced', 'start', 5), row('A'), row('B'), row('Placed', 'placed', 100), row('Rejected', 'rejected', 0)];

describe('validateStageRows', () => {
  it('accepts a good list', () => expect(validateStageRows(LIST)).toBeNull());
  it('rejects empty and whitespace-only names', () => expect(validateStageRows([row('A'), row('  ')])).toMatch(/needs a name/));
  it('rejects duplicate names regardless of case', () => expect(validateStageRows([row('Offer'), row('offer ')])).toMatch(/used twice/));
  it.each(['', '101', '-1', 'abc'])('rejects a win chance of %p', (p) => expect(validateStageRows([row('A', 'custom', p)])).toMatch(/0 to 100/));
});

describe('moving and inserting', () => {
  it('only custom stages move, and never past the entry or closing stages', () => {
    expect(canMove(LIST, 1, -1)).toBe(false); // would displace the entry stage
    expect(canMove(LIST, 1, 1)).toBe(true);
    expect(canMove(LIST, 2, 1)).toBe(false); // next is Placed
    expect(canMove(LIST, 0, 1)).toBe(false); // start is fixed
  });
  it('swaps neighbours when allowed and is a no-op otherwise', () => {
    expect(move(LIST, 1, 1, canMove).map((r) => r.name)).toEqual(['Sourced', 'B', 'A', 'Placed', 'Rejected']);
    expect(move(LIST, 2, 1, canMove).map((r) => r.name)).toEqual(LIST.map((r) => r.name));
  });
  it('inserts new stages before Placed and Rejected', () => {
    expect(insertBeforeClosing(LIST, row('New')).map((r) => r.name)).toEqual(['Sourced', 'A', 'B', 'New', 'Placed', 'Rejected']);
  });
});

describe('payload mapping', () => {
  it('converts percent to a fraction, trims names, drops client-only fields and omits keys of new rows', () => {
    const fresh: StageRow = { uid: 'n1', name: ' New ', color: '#111111', kind: 'custom', prob: '25' };
    expect(toPayload([row('Sourced', 'start', 5), fresh])).toEqual([
      { key: 'sourced', name: 'Sourced', color: '#000000', kind: 'start', prob: 0.05 },
      { name: 'New', color: '#111111', kind: 'custom', prob: 0.25 },
    ]);
  });
  it('round-trips server stages to percent rows', () => {
    expect(toRows([{ key: 'k', name: 'Offer', color: '#fff', kind: 'offer', prob: 0.7 }])[0]).toMatchObject({ key: 'k', prob: 70 });
  });
});
