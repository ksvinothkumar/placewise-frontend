import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http as msw, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { CandidatesPage, candidatesCsv } from './CandidatesPage';

// first render of a file pays the cold module-import cost; keep CI on slow runners green
vi.setConfig({ testTimeout: 30_000 });

const ASHA = { id: 'c1', name: 'Asha Rao', title: 'Backend Engineer', company: 'Acme', city: 'Pune', exp: 5, expected: 22, notice: 30, skills: ['node', 'sql', 'aws', 'k8s', 'go'], pipelines: 2 };
const RAVI = { id: 'c2', name: 'Ravi K', title: 'Accountant', city: 'Chennai', exp: 3, expected: 8, notice: 15, skills: ['tally'], pipelines: 0 };

function mockApi(seen: URLSearchParams[]) {
  server.use(
    msw.get(`${API}/candidates`, ({ request }) => {
      const p = new URL(request.url).searchParams;
      seen.push(p);
      const q = (p.get('q') ?? '').toLowerCase();
      return ok([ASHA, RAVI].filter((c) => !q || c.name.toLowerCase().includes(q)));
    }),
    msw.get(`${API}/candidates/skills`, () => ok(['node', 'tally'])),
    msw.get(`${API}/candidates/tags`, () => ok(['hot'])),
    msw.get(`${API}/saved-searches`, () => ok([])),
  );
}

describe('CandidatesPage', () => {
  it('lists candidates with experience, CTC and a +N skills overflow chip', async () => {
    mockApi([]);
    renderWithProviders(<CandidatesPage />);
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Ravi K')).toBeInTheDocument();
    expect(screen.getByText('5 yrs')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument(); // 5 skills, 4 shown
    expect(screen.getByText('2 jobs')).toBeInTheDocument();
    expect(screen.getByText('2 candidates')).toBeInTheDocument();
  });

  it('debounces the search box and sends q to the API', async () => {
    const seen: URLSearchParams[] = [];
    mockApi(seen);
    renderWithProviders(<CandidatesPage />);
    await screen.findByText('Asha Rao');
    fireEvent.change(screen.getByLabelText('Search candidates'), { target: { value: 'ravi' } });
    await waitFor(() => expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument());
    expect(screen.getByText('Ravi K')).toBeInTheDocument();
    expect(seen.at(-1)?.get('q')).toBe('ravi');
    // the keystroke itself never produced a request with a partial value: only none then 'ravi'
    expect(seen.map((p) => p.get('q'))).toEqual([null, 'ravi']);
  });

  it('applies the city, skill and sort filters immediately', async () => {
    const seen: URLSearchParams[] = [];
    mockApi(seen);
    renderWithProviders(<CandidatesPage />);
    await screen.findByText('Asha Rao');
    await screen.findByRole('option', { name: 'node' });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Pune' } });
    fireEvent.change(screen.getByLabelText('Skill'), { target: { value: 'node' } });
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'exp' } });
    await waitFor(() => expect(seen.at(-1)?.get('sort')).toBe('exp'));
    expect(seen.at(-1)?.get('city')).toBe('Pune');
    expect(seen.at(-1)?.get('skill')).toBe('node');
  });

  it('shows the empty state when nothing matches', async () => {
    mockApi([]);
    renderWithProviders(<CandidatesPage />);
    await screen.findByText('Asha Rao');
    fireEvent.change(screen.getByLabelText('Search candidates'), { target: { value: 'zzz' } });
    expect(await screen.findByText('No candidates match')).toBeInTheDocument();
  });

  it('hides write actions without candidates:write', async () => {
    mockApi([]);
    renderWithProviders(<CandidatesPage />, { permissions: ['candidates:view'] });
    await screen.findByText('Asha Rao');
    expect(screen.queryByRole('button', { name: /bulk import/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^candidate$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });
});

describe('candidatesCsv', () => {
  it('quotes cells and joins skills', () => {
    const csv = candidatesCsv([{ ...ASHA, name: 'Asha "AR" Rao' }]);
    expect(csv.split('\n')[1]).toContain('"Asha ""AR"" Rao"');
    expect(csv).toContain('"node; sql; aws; k8s; go"');
  });
});

describe('CandidatesPage server paging', () => {
  it('asks the server for the page, shows the total from meta, and resets to page 1 when searching', async () => {
    const seen: URLSearchParams[] = [];
    server.use(
      msw.get(`${API}/candidates`, ({ request }) => {
        const p = new URL(request.url).searchParams;
        seen.push(p);
        const page = Number(p.get('page'));
        const rows = Array.from({ length: 10 }, (_, i) => ({ ...RAVI, id: `c${page}-${i}`, name: `Person ${page}-${i}` }));
        return HttpResponse.json({ data: rows, meta: { page, limit: 10, total: 34, totalPages: 4, requestId: 'r' } });
      }),
      msw.get(`${API}/candidates/skills`, () => ok([])),
      msw.get(`${API}/candidates/tags`, () => ok([])),
      msw.get(`${API}/saved-searches`, () => ok([])),
    );
    renderWithProviders(<CandidatesPage />);
    expect(await screen.findByText('Person 1-0')).toBeInTheDocument();
    expect(screen.getByText('34 candidates')).toBeInTheDocument();
    expect(screen.getByText('1–10 of 34')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Person 2-0')).toBeInTheDocument();
    expect(seen.at(-1)?.get('page')).toBe('2');
    expect(seen.at(-1)?.get('limit')).toBe('10');
    fireEvent.change(screen.getByLabelText('Search candidates'), { target: { value: 'person' } });
    await waitFor(() => expect(seen.at(-1)?.get('q')).toBe('person'));
    expect(seen.at(-1)?.get('page')).toBe('1');
  });
});
