import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { BestFitJobs } from './BestFitJobs';

vi.setConfig({ testTimeout: 30_000 });

const stage = (key: string, name: string, kind: string) => ({ key, name, color: '#123456', kind, prob: 0.1 });
const DEFAULT = [stage('s', 'Sourced', 'start'), stage('p', 'Placed', 'placed'), stage('r', 'Rejected', 'rejected')];
const CONTRACT = [stage('c_b', 'Bench', 'start'), stage('c_p', 'Placed', 'placed'), stage('c_r', 'Rejected', 'rejected')];
const row = (id: string, title: string, over: object = {}) => ({
  job: { id, title, client: { id: 'c', name: 'Acme' }, ...over },
  score: 80,
  notes: [],
  inPipeline: false,
});

const withPipelines = () =>
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
  );

describe('BestFitJobs', () => {
  it("shows each job's pipeline and entry stage, and narrows the list by pipeline", async () => {
    withPipelines();
    renderWithProviders(
      <BestFitJobs jobs={[row('j1', 'Backend Engineer'), row('j2', 'Support Staff', { pipelineId: 'pl_c' })]} onAdd={async () => true} />,
    );
    expect(await screen.findByText('Permanent · starts at Sourced')).toBeInTheDocument();
    expect(screen.getByText('Contract · starts at Bench')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter jobs by pipeline'), { target: { value: 'pl_c' } });
    expect(screen.queryByText('Backend Engineer')).toBeNull();
    expect(screen.getByText('Support Staff')).toBeInTheDocument();
  });

  it('flips Add to a disabled Added once the candidate is on the job, and goes back when the add fails', async () => {
    const onAdd = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderWithProviders(
      <BestFitJobs jobs={[row('j1', 'Backend Engineer'), { ...row('j2', 'Data Analyst'), inPipeline: true }]} onAdd={onAdd} />,
    );
    expect(screen.getByRole('button', { name: 'Added to Data Analyst' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add to Backend Engineer' }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('button', { name: 'Add to Backend Engineer' }));
    expect(await screen.findByRole('button', { name: 'Added to Backend Engineer' })).toBeDisabled();
    expect(onAdd).toHaveBeenCalledWith('j1');
  });
});
