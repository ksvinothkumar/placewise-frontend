import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http as msw } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '@/stores/ui.store';
import { server } from '@/test/msw/server';
import { API, fail, ok, renderWithProviders } from '@/test/recruitment-utils';
import { PipelinePage } from './PipelinePage';

vi.setConfig({ testTimeout: 30_000 });

const APP = {
  id: 'a1',
  stage: 'Sourced',
  stageChangedAt: '2026-10-01T00:00:00Z',
  daysInStage: 2,
  score: 80,
  candidate: { id: 'c1', name: 'Asha Rao' },
  job: { id: 'j1', title: 'Backend Engineer', client: { id: 'cl1', name: 'Acme' } },
};

const lane = (name: string) => screen.getByRole('group', { name });
const dragTo = (card: HTMLElement, target: HTMLElement) => {
  const dataTransfer = { setData: vi.fn(), getData: () => 'a1', effectAllowed: '' };
  fireEvent.dragStart(card, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
};

beforeEach(() => {
  useUiStore.setState({ toasts: [] });
  server.use(msw.get(`${API}/jobs`, () => ok([{ id: 'j1', title: 'Backend Engineer', client: { name: 'Acme' } }])));
});

describe('PipelinePage stage moves', () => {
  it('sends PATCH /applications/:id/stage with the destination stage and moves the card', async () => {
    let list = [APP];
    const bodies: unknown[] = [];
    server.use(
      msw.get(`${API}/applications`, () => ok(list)),
      msw.patch(`${API}/applications/a1/stage`, async ({ request }) => {
        const body = (await request.json()) as { stage: string };
        bodies.push(body);
        list = [{ ...APP, stage: body.stage }];
        return ok(list[0]);
      }),
    );
    renderWithProviders(<PipelinePage />);
    const card = await screen.findByRole('button', { name: /Asha Rao/ });
    expect(within(lane('Sourced')).getByText('Asha Rao')).toBeInTheDocument();
    dragTo(card, lane('Screening'));
    await waitFor(() => expect(bodies).toEqual([{ stage: 'Screening' }]));
    await waitFor(() => expect(within(lane('Screening')).getByText('Asha Rao')).toBeInTheDocument());
    expect(useUiStore.getState().toasts.map((t) => t.msg)).toContain('Moved to Screening');
  });

  it('moves optimistically, then rolls the card back and shows the server error on failure', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      msw.get(`${API}/applications`, () => ok([APP])),
      msw.patch(`${API}/applications/a1/stage`, async () => {
        await gate;
        return fail(409, 'CONFLICT', 'Stage change not allowed');
      }),
    );
    renderWithProviders(<PipelinePage />);
    const card = await screen.findByRole('button', { name: /Asha Rao/ });
    dragTo(card, lane('Interview'));
    // optimistic: already in the new lane while the request is still pending
    await waitFor(() => expect(within(lane('Interview')).getByText('Asha Rao')).toBeInTheDocument());
    expect(within(lane('Sourced')).queryByText('Asha Rao')).not.toBeInTheDocument();
    release();
    await waitFor(() => expect(within(lane('Sourced')).getByText('Asha Rao')).toBeInTheDocument());
    expect(within(lane('Interview')).queryByText('Asha Rao')).not.toBeInTheDocument();
    expect(useUiStore.getState().toasts.some((t) => t.type === 'error' && t.msg === 'Stage change not allowed')).toBe(true);
  });

  it('moves a focused card with Alt+ArrowRight (keyboard alternative to dragging)', async () => {
    const bodies: unknown[] = [];
    server.use(
      msw.get(`${API}/applications`, () => ok([APP])),
      msw.patch(`${API}/applications/a1/stage`, async ({ request }) => {
        bodies.push(await request.json());
        return ok(APP);
      }),
    );
    renderWithProviders(<PipelinePage />);
    const card = await screen.findByRole('button', { name: /Asha Rao/ });
    fireEvent.keyDown(card, { key: 'ArrowRight', altKey: true });
    await waitFor(() => expect(bodies).toEqual([{ stage: 'Screening' }]));
  });

  it('filters by job through the query string', async () => {
    const seen: (string | null)[] = [];
    server.use(
      msw.get(`${API}/applications`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('job'));
        return ok([APP]);
      }),
    );
    renderWithProviders(<PipelinePage />);
    await screen.findByRole('button', { name: /Asha Rao/ });
    fireEvent.click(screen.getByRole('button', { name: 'Filter by job' }));
    fireEvent.change(screen.getByLabelText('Search Filter by job'), { target: { value: 'backend' } });
    fireEvent.click(await screen.findByRole('option', { name: /Backend Engineer/ }));
    await waitFor(() => expect(seen.at(-1)).toBe('j1'));
  });
});

describe('PipelinePage client filter', () => {
  it("shows only the chosen client's candidates and narrows the job list", async () => {
    const other = {
      ...APP,
      id: 'a2',
      candidate: { id: 'c2', name: 'Ben Roy' },
      job: { id: 'j2', title: 'Designer', client: { id: 'cl2', name: 'Zeta' } },
    };
    server.use(
      msw.get(`${API}/jobs`, () =>
        ok([
          { id: 'j1', title: 'Backend Engineer', client: { id: 'cl1', name: 'Acme' } },
          { id: 'j2', title: 'Designer', client: { id: 'cl2', name: 'Zeta' } },
        ]),
      ),
      msw.get(`${API}/applications`, () => ok([APP, other])),
    );
    renderWithProviders(<PipelinePage />);
    await screen.findByText('Asha Rao');
    expect(screen.getByText('Ben Roy')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Filter by client' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Filter by client' }));
    fireEvent.change(screen.getByLabelText('Search Filter by client'), { target: { value: 'ze' } });
    expect(screen.queryByRole('option', { name: 'Acme' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Zeta' }));
    expect(screen.queryByText('Asha Rao')).toBeNull();
    expect(screen.getByText('Ben Roy')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Filter by job' }));
    const jobs = within(screen.getByRole('listbox', { name: 'Filter by job' }))
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(jobs).toEqual(['All jobs', 'Designer · Zeta']);
  });
});

describe('PipelinePage with several pipelines', () => {
  const stage = (key: string, name: string, kind: string) => ({ key, name, color: '#123456', kind, prob: 0.1 });
  const DEFAULT = [stage('s', 'Sourced', 'start'), stage('p', 'Placed', 'placed'), stage('r', 'Rejected', 'rejected')];
  const CONTRACT = [stage('c_bench', 'Bench', 'start'), stage('c_p', 'Placed', 'placed'), stage('c_r', 'Rejected', 'rejected')];

  it('shows the lanes and candidates of the chosen pipeline only', async () => {
    server.use(
      msw.get(`${API}/settings`, () =>
        ok({
          stages: DEFAULT,
          crmStages: [],
          contactStages: [],
          pipelines: [
            { id: 'default', name: 'Permanent', stages: DEFAULT },
            { id: 'pl_c', name: 'Contract', stages: CONTRACT },
          ],
        }),
      ),
      msw.get(`${API}/jobs`, () =>
        ok([
          { id: 'j1', title: 'Backend Engineer', client: { name: 'Acme' } },
          { id: 'j2', title: 'Support Staff', client: { name: 'Acme' }, pipelineId: 'pl_c' },
        ]),
      ),
      msw.get(`${API}/applications`, () =>
        ok([
          APP,
          {
            ...APP,
            id: 'a2',
            stage: 'Bench',
            candidate: { id: 'c2', name: 'Dev Patel' },
            job: { id: 'j2', title: 'Support Staff', client: { id: 'cl1', name: 'Acme' }, pipelineId: 'pl_c' },
          },
        ]),
      ),
    );
    renderWithProviders(<PipelinePage />);
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.queryByText('Dev Patel')).toBeNull();
    fireEvent.change(await screen.findByLabelText('Pipeline'), { target: { value: 'pl_c' } });
    expect(await screen.findByText('Dev Patel')).toBeInTheDocument();
    expect(screen.queryByText('Asha Rao')).toBeNull();
    expect(within(lane('Bench')).getByText('Dev Patel')).toBeInTheDocument();
  });
});
