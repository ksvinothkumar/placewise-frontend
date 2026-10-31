import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, fail, ok, renderWithProviders } from '@/test/recruitment-utils';
import { applyProblem, CareerJobPage, type ApplyForm } from './CareerJobPage';
import { CareersPage } from './CareersPage';

// first render of a file pays the cold module-import cost; keep CI on slow runners green
vi.setConfig({ testTimeout: 30_000 });

const JOB = { id: 'j1', title: 'Backend Engineer', city: 'Pune', remote: true, industry: 'Fintech', expMin: 3, expMax: 6, skills: ['node', 'sql'], postedDays: 2, description: 'Build APIs.' };
const form: ApplyForm = { name: 'Asha Rao', email: 'asha@x.io', phone: '', city: '', exp: '', message: '', consent: true, website: '' };

const setup = () => {
  server.use(msw.get(`${API}/public/jobs/j1`, () => ok(JOB)));
  renderWithProviders(<CareerJobPage />, { url: '/careers/j1', path: '/careers/:id', permissions: [] });
};
const fill = async () => {
  await screen.findByRole('heading', { name: 'Backend Engineer' });
  fireEvent.change(screen.getByLabelText('Full name *'), { target: { value: 'Asha Rao' } });
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'asha@x.io' } });
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

describe('applyProblem', () => {
  it('requires name, valid email and consent', () => {
    expect(applyProblem({ ...form, name: 'A' }, null)).toMatch(/name/i);
    expect(applyProblem({ ...form, email: 'nope' }, null)).toMatch(/email/i);
    expect(applyProblem({ ...form, consent: false }, null)).toMatch(/consent/i);
    expect(applyProblem(form, null)).toBe('');
  });
  it('checks experience range and resume type/size', () => {
    expect(applyProblem({ ...form, exp: '80' }, null)).toMatch(/experience/i);
    expect(applyProblem(form, new File(['x'], 'cv.exe'))).toMatch(/PDF/);
    const big = new File(['x'], 'cv.pdf');
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    expect(applyProblem(form, big)).toMatch(/5 MB/);
    expect(applyProblem(form, new File(['x'], 'cv.pdf'))).toBe('');
  });
});

describe('CareerJobPage apply form', () => {
  it('renders the public job without client or salary details', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Backend Engineer' })).toBeInTheDocument();
    expect(screen.getByText('Build APIs.')).toBeInTheDocument();
    expect(screen.getByText('Posted 2 days ago')).toBeInTheDocument();
  });

  it('does not submit without consent and tells the applicant why', async () => {
    let posted = false;
    server.use(msw.post(`${API}/public/jobs/j1/apply`, () => ((posted = true), ok({ ok: true }))));
    setup();
    await fill();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/consent/i);
    expect(posted).toBe(false);
  });

  it('rejects an invalid email before calling the API', async () => {
    setup();
    await fill();
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i);
  });

  it('keeps the honeypot hidden from people and assistive tech', async () => {
    setup();
    await fill();
    const hp = screen.getByTestId('hp-website');
    expect(hp).toHaveAttribute('aria-hidden', 'true');
    expect(hp).toHaveAttribute('tabindex', '-1');
    expect(hp).toHaveStyle({ opacity: '0' });
    expect(screen.queryByLabelText(/website/i)).not.toBeInTheDocument();
  });

  it('submits multipart data with consent and an empty honeypot, then shows the thank-you', async () => {
    let fd: FormData | undefined;
    server.use(
      msw.post(`${API}/public/jobs/j1/apply`, async ({ request }) => {
        fd = await request.formData();
        return ok({ ok: true });
      }),
    );
    setup();
    await fill();
    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    expect(await screen.findByText('Application received')).toBeInTheDocument();
    expect(screen.getByText(/Thank you, Asha/)).toBeInTheDocument();
    expect(fd?.get('name')).toBe('Asha Rao');
    expect(fd?.get('email')).toBe('asha@x.io');
    expect(fd?.get('consent')).toBe('true');
    expect(fd?.get('website')).toBe('');
  });

  it('still posts the honeypot value when a bot fills it (the API drops those silently)', async () => {
    let fd: FormData | undefined;
    server.use(msw.post(`${API}/public/jobs/j1/apply`, async ({ request }) => ((fd = await request.formData()), ok({ ok: true }))));
    setup();
    await fill();
    fireEvent.change(screen.getByTestId('hp-website'), { target: { value: 'http://spam.example' } });
    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    await waitFor(() => expect(fd?.get('website')).toBe('http://spam.example'));
  });

  it('shows the server message when the apply call fails (rate limit)', async () => {
    server.use(msw.post(`${API}/public/jobs/j1/apply`, () => fail(429, 'RATE_LIMITED', 'Too many applications from this connection.')));
    setup();
    await fill();
    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many applications');
    expect(screen.queryByText('Application received')).not.toBeInTheDocument();
  });

  it('shows a closed-role message when the job is gone', async () => {
    server.use(msw.get(`${API}/public/jobs/j1`, () => fail(404, 'JOB_CLOSED', 'This job is no longer open')));
    renderWithProviders(<CareerJobPage />, { url: '/careers/j1', path: '/careers/:id', permissions: [] });
    expect(await screen.findByText('This job is no longer open')).toBeInTheDocument();
  });
});

describe('CareersPage', () => {
  it('lists open roles and filters by search text and location', async () => {
    server.use(msw.get(`${API}/public/jobs`, () => ok([JOB, { ...JOB, id: 'j2', title: 'Accountant', city: 'Chennai', skills: ['tally'] }])));
    renderWithProviders(<CareersPage />, { url: '/careers', permissions: [] });
    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Accountant')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Chennai' } });
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Search roles'), { target: { value: 'tally' } });
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument();
    expect(screen.getByText('Accountant')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search roles'), { target: { value: 'zzz' } });
    expect(screen.getByText('No open roles right now')).toBeInTheDocument();
  });
});
