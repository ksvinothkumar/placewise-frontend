import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useSessionStore } from '@/stores/session.store';
import { hasPermission, useCan, useCanFn } from './permissions';

const setPerms = (permissions: string[]) => act(() => useSessionStore.setState({ permissions }));
afterEach(() => setPerms([]));

describe('hasPermission', () => {
  it('matches exact permissions only', () => {
    expect(hasPermission(['jobs:view'], 'jobs:view')).toBe(true);
    expect(hasPermission(['jobs:view'], 'jobs:write')).toBe(false);
    expect(hasPermission([], 'jobs:view')).toBe(false);
  });
  it('treats * as everything', () => expect(hasPermission(['*'], 'anything:at-all')).toBe(true));
});

describe('useCan', () => {
  it('reflects the session permissions', () => {
    setPerms(['jobs:view']);
    expect(renderHook(() => useCan('jobs:view')).result.current).toBe(true);
    expect(renderHook(() => useCan('invoices:manage')).result.current).toBe(false);
  });
  it('allows when no permission is required', () => {
    expect(renderHook(() => useCan(undefined)).result.current).toBe(true);
  });
  it('re-renders when permissions change', () => {
    const { result, rerender } = renderHook(() => useCan('crm:view'));
    expect(result.current).toBe(false);
    setPerms(['crm:view']);
    rerender();
    expect(result.current).toBe(true);
  });
  it('useCanFn checks several permissions with one subscription', () => {
    setPerms(['a:b']);
    const { result } = renderHook(() => useCanFn());
    expect([result.current('a:b'), result.current('c:d'), result.current()]).toEqual([true, false, true]);
  });
});
