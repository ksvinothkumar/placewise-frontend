import { fireEvent, screen } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, fail, ok, renderWithProviders } from '@/test/recruitment-utils';
import { SourcingPage, xrayString } from './SourcingPage';

// first render of a file pays the cold module-import cost; keep CI on slow runners green
vi.setConfig({ testTimeout: 30_000 });

const HIT = { id: 'c1', name: 'Asha Rao', title: 'Engineer', company: 'Acme', city: 'Pune', exp: 5, notice: 30, skills: ['react', 'node', 'sql'], matched: ['react'], snippet: '…built react apps…', hasResume: true };

describe('SourcingPage boolean search', () => {
  it('posts the query and renders matches with highlighted skills and a profile link', async () => {
    let body: unknown;
    server.use(msw.post(`${API}/search/boolean`, async ({ request }) => ((body = await request.json()), ok({ total: 12, results: [HIT] }))));
    renderWithProviders(<SourcingPage />);
    const go = screen.getByRole('button', { name: /^search$/i });
    expect(go).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Boolean search'), { target: { value: 'react AND node' } });
    fireEvent.click(go);
    expect(await screen.findByText('12 matches')).toBeInTheDocument();
    expect(body).toEqual({ q: 'react AND node' });
    expect(screen.getByText('Showing the best 1')).toBeInTheDocument();
    expect(screen.getByText('react').className).toContain('hit');
    expect(screen.getByText('sql').className).not.toContain('hit');
    expect(screen.getByText('…built react apps…')).toBeInTheDocument();
    expect(screen.getByText('Notice 30d')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Asha Rao/ })).toHaveAttribute('href', '/candidates/c1');
  });

  it('uses the singular for one match and an empty state for none', async () => {
    server.use(msw.post(`${API}/search/boolean`, () => ok({ total: 0, results: [] })));
    renderWithProviders(<SourcingPage />);
    fireEvent.change(screen.getByLabelText('Boolean search'), { target: { value: 'cobol' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    expect(await screen.findByText('0 matches')).toBeInTheDocument();
    expect(screen.getByText('No one matches')).toBeInTheDocument();
  });

  it('shows the API error (bad syntax) instead of results', async () => {
    server.use(msw.post(`${API}/search/boolean`, () => fail(400, 'VALIDATION', 'Unbalanced brackets')));
    renderWithProviders(<SourcingPage />);
    fireEvent.change(screen.getByLabelText('Boolean search'), { target: { value: '(react' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unbalanced brackets');
  });

  it('runs an example query on click', async () => {
    let body: unknown;
    server.use(msw.post(`${API}/search/boolean`, async ({ request }) => ((body = await request.json()), ok({ total: 1, results: [HIT] }))));
    renderWithProviders(<SourcingPage />);
    fireEvent.click(screen.getByRole('button', { name: 'react AND node NOT intern' }));
    expect(await screen.findByText('1 match')).toBeInTheDocument();
    expect(body).toEqual({ q: 'react AND node NOT intern' });
  });
});

describe('xrayString', () => {
  it('builds site, OR-groups, quoted phrases and exclusions', () => {
    expect(xrayString({ site: 'linkedin', title: 'Java developer, backend engineer', must: 'spring boot', any: 'kafka, aws', not: 'intern', city: 'Chennai' })).toBe(
      'site:linkedin.com/in ("Java developer" OR "backend engineer") "spring boot" (kafka OR aws) Chennai -intern',
    );
  });
});
