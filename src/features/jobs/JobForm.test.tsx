import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { JobForm, jobProblem } from '@/components/forms';
import { server } from '@/test/msw/server';
import { API, fail, ok, renderWithProviders } from '@/test/recruitment-utils';

// first render of a file pays the cold module-import cost; keep CI on slow runners green
vi.setConfig({ testTimeout: 30_000 });

const base = { title: 'Dev', expMin: 3, expMax: 8, salMin: 15, salMax: 30, openings: 1 };

describe('jobProblem', () => {
  it('requires a title', () => expect(jobProblem({ ...base, title: '  ' })).toMatch(/title/i));
  it('rejects max below min for experience and salary', () => {
    expect(jobProblem({ ...base, expMax: 1 })).toMatch(/experience/i);
    expect(jobProblem({ ...base, salMax: 5 })).toMatch(/salary/i);
  });
  it('needs at least one opening', () => expect(jobProblem({ ...base, openings: 0 })).toMatch(/opening/i));
  it('passes a valid job', () => expect(jobProblem(base)).toBe(''));
});

describe('JobForm', () => {
  const setup = () => {
    server.use(
      msw.get(`${API}/clients`, () => ok([{ id: 'cl1', name: 'Acme', industry: 'IT' }])),
      msw.get(`${API}/branches`, () => ok([])),
    );
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderWithProviders(<JobForm onClose={onClose} onSaved={onSaved} />);
    return { onClose, onSaved };
  };

  it('keeps Create disabled until a title is entered and closes on Escape', async () => {
    const { onClose } = setup();
    await screen.findByRole('option', { name: 'Acme' });
    expect(screen.getByRole('button', { name: 'Create job' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'Java Dev' } });
    expect(screen.getByRole('button', { name: 'Create job' })).toBeEnabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('blocks a save with an inverted salary range and shows why', async () => {
    let posted = false;
    server.use(msw.post(`${API}/jobs`, () => ((posted = true), ok({ id: 'j1' }))));
    setup();
    await screen.findByRole('option', { name: 'Acme' });
    fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'Java Dev' } });
    fireEvent.change(screen.getByLabelText('Salary max (₹ LPA)'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create job' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/salary/i);
    expect(posted).toBe(false);
  });

  it('posts numbers (not strings) with the default client, then reports the new job', async () => {
    let body: Record<string, unknown> = {};
    server.use(msw.post(`${API}/jobs`, async ({ request }) => ((body = (await request.json()) as Record<string, unknown>), ok({ id: 'j1', title: 'Java Dev' }))));
    const { onSaved, onClose } = setup();
    await screen.findByRole('option', { name: 'Acme' });
    fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'Java Dev' } });
    fireEvent.change(screen.getByLabelText('Required skills (comma separated)'), { target: { value: 'java, spring' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create job' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(body).toMatchObject({ title: 'Java Dev', client: 'cl1', expMin: 3, expMax: 8, salMin: 15, salMax: 30, openings: 1, skills: 'java, spring' });
  });

  it('keeps the modal open when the API rejects the job', async () => {
    server.use(msw.post(`${API}/jobs`, () => fail(400, 'VALIDATION', 'bad job')));
    const { onSaved } = setup();
    await screen.findByRole('option', { name: 'Acme' });
    fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'Java Dev' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create job' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create job' })).toBeEnabled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
