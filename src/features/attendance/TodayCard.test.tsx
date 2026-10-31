import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, fail, ok, renderWithProviders } from '@/test/recruitment-utils';
import { TodayCard } from './TodayCard';
import { leaveDays } from './utils';

vi.setConfig({ testTimeout: 30_000 });

const base = { date: '2026-03-02', leave: null, day: { kind: 'work' } };

/** A tiny in-memory attendance backend so check-in/out change what the next GET /today returns. */
function backend(initial: unknown, opts: { checkInFails?: boolean } = {}) {
  let today: Record<string, unknown> = { ...base, record: initial };
  const calls: string[] = [];
  server.use(
    msw.get(`${API}/attendance/today`, () => ok(today)),
    msw.post(`${API}/attendance/check-in`, () => {
      calls.push('check-in');
      if (opts.checkInFails) return fail(409, 'ALREADY_CHECKED_IN', 'You have already checked in');
      today = { ...today, record: { checkIn: new Date(Date.now() - 65_000).toISOString(), checkOut: null } };
      return ok(today.record);
    }),
    msw.post(`${API}/attendance/check-out`, () => {
      calls.push('check-out');
      today = { ...today, record: { ...(today.record as object), checkOut: new Date().toISOString(), workMinutes: 95 } };
      return ok(today.record);
    }),
  );
  return calls;
}

describe('TodayCard check-in / check-out state', () => {
  it('walks through not-in -> in -> done for the day', async () => {
    const calls = backend(null);
    renderWithProviders(<TodayCard />);
    expect(await screen.findByText('You have not checked in yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /check out/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /check in/i }));
    expect(await screen.findByRole('button', { name: /check out/i })).toBeInTheDocument();
    expect(screen.getByText(/working for/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /check out/i }));
    expect(await screen.findByText('Done for today')).toBeInTheDocument();
    expect(screen.getByText('1h 35m')).toBeInTheDocument();
    expect(calls).toEqual(['check-in', 'check-out']);
  });

  it('renders an already-checked-in day with the running timer and a check-out button', async () => {
    backend({ checkIn: new Date(Date.now() - 3_725_000).toISOString(), checkOut: null });
    renderWithProviders(<TodayCard />);
    expect(await screen.findByRole('button', { name: /check out/i })).toBeInTheDocument();
    expect(screen.getByText(/^01:02:0\d$/)).toBeInTheDocument();
  });

  it('cannot check in on an approved leave day and says why', async () => {
    server.use(msw.get(`${API}/attendance/today`, () => ok({ ...base, record: null, leave: { typeName: 'Casual leave' } })));
    renderWithProviders(<TodayCard />);
    expect(await screen.findByText("You're on approved Casual leave today.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check in/i })).toBeDisabled();
  });

  it('surfaces a server refusal as an error toast and stays checked out', async () => {
    backend(null, { checkInFails: true });
    renderWithProviders(<TodayCard />);
    fireEvent.click(await screen.findByRole('button', { name: /check in/i }));
    const { useUiStore } = await import('@/stores/ui.store');
    await waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.msg === 'You have already checked in' && t.type === 'error')).toBe(true));
    expect(screen.getByText('You have not checked in yet.')).toBeInTheDocument();
  });
});

describe('leaveDays', () => {
  const SAT_SUN = [0, 6];
  it('skips weekly offs and holidays', () => {
    // Mon 2026-03-02 .. Sun 2026-03-08
    expect(leaveDays('2026-03-02', '2026-03-08', SAT_SUN, [], false)).toBe(5);
    expect(leaveDays('2026-03-02', '2026-03-08', SAT_SUN, ['2026-03-04'], false)).toBe(4);
  });
  it('counts a single half day as 0.5 but not on a day off', () => {
    expect(leaveDays('2026-03-02', '2026-03-02', SAT_SUN, [], true)).toBe(0.5);
    expect(leaveDays('2026-03-07', '2026-03-07', SAT_SUN, [], true)).toBe(0);
  });
  it('is zero for a reversed range', () => expect(leaveDays('2026-03-05', '2026-03-02', SAT_SUN, [], false)).toBe(0));
});
