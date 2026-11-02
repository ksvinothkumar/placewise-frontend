import { fireEvent, screen } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { OrgChartPage } from './OrgChartPage';

vi.setConfig({ testTimeout: 30_000 });

const TEAM = [
  { id: 'u1', name: 'Surya Narayanan', email: 'surya@x.io', role: 'admin', title: 'Leadership', manager: null },
  { id: 'u2', name: 'Aakkash', email: 'aakkash@x.io', role: 'delivery_manager', title: 'Delivery', manager: 'u1' },
  { id: 'u3', name: 'Jayashree V', email: 'jaya@x.io', role: 'team_lead', title: 'Principal Recruiter', manager: 'u2' },
  { id: 'u4', name: 'Mrithyunjai', email: 'mp@x.io', role: 'recruiter', manager: 'u1' },
];
const boot = () => {
  server.use(msw.get(`${API}/users/org`, () => ok(TEAM)));
  return renderWithProviders(<OrgChartPage />);
};

describe('OrgChartPage', () => {
  it('draws the team as a tree under whoever has no manager', async () => {
    boot();
    expect(await screen.findByText('Surya Narayanan')).toBeInTheDocument();
    for (const n of ['Aakkash', 'Jayashree V', 'Mrithyunjai']) expect(screen.getByText(n)).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('Principal Recruiter')).toBeInTheDocument();
  });

  it('folds and unfolds a branch, and shows how many people are below', async () => {
    boot();
    await screen.findByText('Surya Narayanan');
    const fold = screen.getByRole('button', { name: "Hide Aakkash's reports" });
    expect(fold).toHaveTextContent('1');
    fireEvent.click(fold);
    expect(screen.queryByText('Jayashree V')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: "Show Aakkash's reports" }));
    expect(screen.getByText('Jayashree V')).toBeInTheDocument();
  });

  it('highlights matches by name, email or title and dims everyone else', async () => {
    boot();
    await screen.findByText('Surya Narayanan');
    fireEvent.change(screen.getByLabelText('Search the org chart'), { target: { value: 'principal' } });
    expect(screen.getByText('1 match')).toBeInTheDocument();
    expect(screen.getByText('Jayashree V').closest('.org-card')).toHaveClass('hit');
    expect(screen.getByText('Surya Narayanan').closest('.org-card')).toHaveClass('dim');
  });

  it('lists who reports to whom in the workflow view', async () => {
    boot();
    await screen.findByText('Surya Narayanan');
    fireEvent.click(screen.getByRole('button', { name: 'Workflow View' }));
    const row = screen.getByText('Jayashree V').closest('tr')!;
    expect(row).toHaveTextContent('Team Lead');
    expect(row).toHaveTextContent('Aakkash'); // reports to
  });
});
