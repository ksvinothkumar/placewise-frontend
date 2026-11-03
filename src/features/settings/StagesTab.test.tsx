import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { useUiStore } from '@/stores/ui.store';
import { server } from '@/test/msw/server';
import { API, fail, ok, renderWithProviders } from '@/test/recruitment-utils';
import { StagesTab } from './StagesTab';

vi.setConfig({ testTimeout: 30_000 });

const stage = (key: string, name: string, kind: string, prob: number) => ({ key, name, color: '#123456', kind, prob });
const STAGES = [
  stage('sourced', 'Sourced', 'start', 0.05),
  stage('screening', 'Screening', 'custom', 0.1),
  stage('placed', 'Placed', 'placed', 1),
  stage('rejected', 'Rejected', 'rejected', 0),
];
const SETTINGS = { stages: STAGES, crmStages: [], contactStages: [] };

function boot(onPut?: (b: unknown) => Response | undefined) {
  server.use(
    msw.get(`${API}/settings`, () => ok(SETTINGS)),
    msw.get(`${API}/settings/stage-usage`, () => ok({ Sourced: 4, Screening: 1 })),
    msw.get(`${API}/auth/me`, () => ok({ user: { id: 'u1', name: 'T', email: 't@x.io', role: 'admin' }, permissions: ['*'] })),
    msw.put(`${API}/settings/stages`, async ({ request }) => onPut?.(await request.json()) ?? ok({ ok: true })),
  );
  return renderWithProviders(<StagesTab />);
}
const nameBox = (n: number) => screen.getByLabelText(`Name of stage ${n}`);

describe('StagesTab editor', () => {
  it('shows usage counts and keeps Save disabled until something changes', async () => {
    boot();
    expect(await screen.findByDisplayValue('Screening')).toBeInTheDocument();
    expect(await screen.findByText('4 candidates')).toBeInTheDocument();
    expect(screen.getByText('1 candidate')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save stages/i })).toBeDisabled();
  });

  it('blocks saving a blank or duplicate stage name and explains why', async () => {
    boot();
    await screen.findByDisplayValue('Screening');
    const save = screen.getByRole('button', { name: /save stages/i });

    fireEvent.change(nameBox(2), { target: { value: '   ' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Every stage needs a name.');
    expect(save).toBeDisabled();

    fireEvent.change(nameBox(2), { target: { value: 'sourced' } });
    expect(screen.getByRole('alert')).toHaveTextContent('"sourced" is used twice');
    expect(save).toBeDisabled();

    fireEvent.change(nameBox(2), { target: { value: 'Phone screen' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(save).toBeEnabled();
  });

  it('rejects a win chance outside 0..100', async () => {
    boot();
    await screen.findByDisplayValue('Screening');
    fireEvent.change(screen.getByLabelText('Win chance for Screening'), { target: { value: '150' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('win chance must be a number from 0 to 100');
    expect(screen.getByRole('button', { name: /save stages/i })).toBeDisabled();
  });

  it('saves renamed stages with percent converted back to a fraction and keys preserved', async () => {
    let body: { stages: unknown[]; moves?: unknown } | undefined;
    boot((b) => ((body = b as typeof body), undefined));
    await screen.findByDisplayValue('Screening');
    fireEvent.change(nameBox(2), { target: { value: 'Phone screen' } });
    fireEvent.change(screen.getByLabelText('Win chance for Phone screen'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /save stages/i }));
    await waitFor(() => expect(body).toBeDefined());
    expect(body!.stages[1]).toEqual({ key: 'screening', name: 'Phone screen', color: '#123456', kind: 'custom', prob: 0.15 });
    expect(body!.moves).toBeUndefined();
    await waitFor(() => expect(useUiStore.getState().toasts.some((t) => t.msg === 'Pipeline stages saved')).toBe(true));
  });

  it('adds a custom stage before Placed and lets the user remove it again', async () => {
    boot();
    await screen.findByDisplayValue('Screening');
    fireEvent.click(screen.getByRole('button', { name: /add stage/i }));
    const names = screen.getAllByLabelText(/^Name of stage/).map((i) => (i as HTMLInputElement).value);
    expect(names).toEqual(['Sourced', 'Screening', '', 'Placed', 'Rejected']);
    expect(screen.getByRole('alert')).toHaveTextContent('Every stage needs a name.');
    fireEvent.click(screen.getByRole('button', { name: 'Delete stage' }));
    expect(screen.getAllByLabelText(/^Name of stage/)).toHaveLength(4);
  });

  it('asks where to move candidates when a used stage is deleted, then resends with the move', async () => {
    const bodies: { stages: { key?: string }[]; moves?: Record<string, string> }[] = [];
    boot((b) => {
      bodies.push(b as (typeof bodies)[number]);
      return bodies.length === 1 ? fail(409, 'STAGE_IN_USE', '1 candidate is in "Screening". Choose where to move them.') : undefined;
    });
    await screen.findByDisplayValue('Screening');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Screening' }));
    fireEvent.click(screen.getByRole('button', { name: /save stages/i }));

    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText(/Choose where to move them/)).toBeInTheDocument();
    // the 409 body above carries no details.stage, so the confirm button stays disabled rather than guessing
    expect(within(dlg).getByRole('button', { name: /move and delete/i })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bodies[0]!.stages.map((s) => s.key)).toEqual(['sourced', 'placed', 'rejected']);
  });

  it('with details.stage from the server the move is sent', async () => {
    const bodies: { moves?: Record<string, string> }[] = [];
    server.use(
      msw.get(`${API}/settings`, () => ok(SETTINGS)),
      msw.get(`${API}/settings/stage-usage`, () => ok({})),
      msw.get(`${API}/auth/me`, () => ok({ user: { id: 'u1', name: 'T', email: 't@x.io', role: 'admin' }, permissions: ['*'] })),
      msw.put(`${API}/settings/stages`, async ({ request }) => {
        bodies.push((await request.json()) as (typeof bodies)[number]);
        return bodies.length === 1
          ? Response.json(
              {
                error: {
                  code: 'STAGE_IN_USE',
                  message: '1 candidate is in "Screening". Choose where to move them.',
                  details: { stage: 'screening', count: 1 },
                },
              },
              { status: 409 },
            )
          : ok({ ok: true });
      }),
    );
    renderWithProviders(<StagesTab />);
    await screen.findByDisplayValue('Screening');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Screening' }));
    fireEvent.click(screen.getByRole('button', { name: /save stages/i }));
    const dlg = await screen.findByRole('dialog');
    fireEvent.change(within(dlg).getByRole('combobox'), { target: { value: 'Sourced' } });
    fireEvent.click(within(dlg).getByRole('button', { name: /move and delete/i }));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1]!.moves).toEqual({ screening: 'Sourced' });
  });
});

describe('StagesTab pipelines', () => {
  const CONTRACT = [
    stage('c_new', 'Bench', 'start', 0.1),
    stage('c_placed', 'Placed', 'placed', 1),
    stage('c_rejected', 'Rejected', 'rejected', 0),
  ];
  const WITH = {
    ...SETTINGS,
    pipelines: [
      { id: 'default', name: 'Permanent', stages: STAGES },
      { id: 'pl_c', name: 'Contract', stages: CONTRACT },
    ],
  };

  it('switches to another pipeline, edits its stages and saves them through the pipelines endpoint', async () => {
    let put: { pipelines: Array<{ id: string; name: string; stages: Array<{ name: string }> }> } | undefined;
    server.use(
      msw.get(`${API}/settings`, () => ok(WITH)),
      msw.get(`${API}/settings/stage-usage`, () => ok({})),
      msw.get(`${API}/auth/me`, () => ok({ user: { id: 'u1', name: 'T', email: 't@x.io', role: 'admin' }, permissions: ['*'] })),
      msw.put(`${API}/settings/pipelines`, async ({ request }) => {
        put = (await request.json()) as typeof put;
        return ok({ pipelines: [] });
      }),
    );
    renderWithProviders(<StagesTab />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Contract' }));
    expect(await screen.findByDisplayValue('Bench')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Screening')).toBeNull();
    fireEvent.change(screen.getByLabelText('Name of stage 1'), { target: { value: 'On bench' } });
    fireEvent.click(screen.getByRole('button', { name: /save stages/i }));
    await waitFor(() => expect(put).toBeDefined());
    expect(put!.pipelines).toHaveLength(1);
    expect(put!.pipelines[0]).toMatchObject({ id: 'pl_c', name: 'Contract' });
    expect(put!.pipelines[0]!.stages[0]!.name).toBe('On bench');
  });
});
