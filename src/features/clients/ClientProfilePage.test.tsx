import { screen } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { ClientProfilePage } from './ClientProfilePage';

vi.setConfig({ testTimeout: 30_000 });

const client = { id: 'c1', name: 'Northwind Fintech', industry: 'Fintech', city: 'Bengaluru', state: 'Karnataka', tier: 'Gold', feePct: 8.33, contact: 'Priya Nair', email: 'priya@northwind.example', website: 'https://northwind.example', about: 'Payments for small business.', gstin: '29ABCDE1234F1Z5', openJobs: 2, placements: 1, jobs: [{ id: 'j1', title: 'Backend Engineer', status: 'open' }] };

const view = () => renderWithProviders(<ClientProfilePage />, { url: '/clients/c1', path: '/clients/:id' });

describe('ClientProfilePage', () => {
  it('shows the company logo with its details and jobs', async () => {
    server.use(msw.get(`${API}/clients/c1`, () => ok({ ...client, logo: 'data:image/png;base64,iVBORw0KGgo=' })));
    view();
    expect(await screen.findByRole('heading', { name: 'Northwind Fintech' })).toBeInTheDocument();
    expect(screen.getByAltText('Northwind Fintech logo')).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgo=');
    expect(screen.getByText('northwind.example')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('GSTIN 29ABCDE1234F1Z5')).toBeInTheDocument();
  });
  it('falls back to initials without a logo, and says when the client is missing', async () => {
    server.use(msw.get(`${API}/clients/c1`, () => ok(client)));
    view();
    expect(await screen.findByText('NF')).toBeInTheDocument();
    expect(screen.queryByAltText('Northwind Fintech logo')).toBeNull();
  });
});
