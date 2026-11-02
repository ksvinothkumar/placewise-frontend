import { fireEvent, screen } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { InvoicesPage } from './InvoicesPage';

vi.setConfig({ testTimeout: 30_000 });

describe('InvoicesPage', () => {
  it('shows summary KPIs and invoice totals in INR with the proforma and overdue markers', async () => {
    server.use(
      msw.get(`${API}/invoices/summary`, () =>
        ok({
          outstanding: 236000,
          overdue: 118000,
          overdueCount: 1,
          paidThisMonth: 59000,
          draftCount: 2,
          draftValue: 300000,
          aging: { current: 118000, d30: 118000, d60: 0, d60p: 0 },
          guarantee: [],
        }),
      ),
      msw.get(`${API}/invoices`, () =>
        ok([
          {
            id: 'i1',
            number: 'INV-1',
            docType: 'tax',
            status: 'overdue',
            rawStatus: 'sent',
            clientName: 'Acme',
            candidateName: 'Asha',
            jobTitle: 'Dev',
            issueDate: '2026-09-01',
            dueDate: '2026-10-01',
            daysOverdue: 12,
            total: 118000,
            subtotal: 100000,
            gstPct: 18,
            gst: 18000,
            cgst: 9000,
            sgst: 9000,
            igst: 0,
            taxType: 'cgst_sgst',
          },
          {
            id: 'i2',
            number: 'PF-1',
            docType: 'proforma',
            status: 'draft',
            rawStatus: 'draft',
            clientName: 'Globex',
            candidateName: '',
            jobTitle: 'Retainer',
            issueDate: '2026-10-05',
            dueDate: '2026-11-05',
            daysOverdue: 0,
            total: 59000,
            subtotal: 50000,
            gstPct: 18,
            gst: 9000,
            cgst: 4500,
            sgst: 4500,
            igst: 0,
            taxType: 'cgst_sgst',
          },
        ]),
      ),
    );
    renderWithProviders(<InvoicesPage />);
    expect(await screen.findByText('INV-1')).toBeInTheDocument();
    expect(screen.getByText('Outstanding').closest('.kpi')).toHaveTextContent('₹2,36,000');
    expect(screen.getByText('Overdue', { selector: '.l' }).closest('.kpi')).toHaveTextContent('₹1,18,000');
    expect(screen.getByText('1 invoice')).toBeInTheDocument();
    expect(screen.getByText('₹3,00,000 to send')).toBeInTheDocument();
    expect(screen.getByText('₹1,18,000', { selector: 'td b' })).toBeInTheDocument();
    expect(screen.getByText('₹59,000', { selector: 'td b' })).toBeInTheDocument();
    expect(screen.getByText('Proforma')).toBeInTheDocument();
    expect(screen.getByText('12d late')).toBeInTheDocument();
  });

  it('hides "New invoice" without invoices:manage', async () => {
    server.use(
      msw.get(`${API}/invoices/summary`, () =>
        ok({
          outstanding: 0,
          overdue: 0,
          overdueCount: 0,
          paidThisMonth: 0,
          draftCount: 0,
          draftValue: 0,
          aging: { current: 0, d30: 0, d60: 0, d60p: 0 },
          guarantee: [],
        }),
      ),
      msw.get(`${API}/invoices`, () => ok([])),
    );
    renderWithProviders(<InvoicesPage />, { permissions: ['invoices:view'] });
    expect(await screen.findByText('No invoices here')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New invoice/ })).not.toBeInTheDocument();
  });

  it('shows an edit icon on drafts only, opening the editor for line-item drafts', async () => {
    const row = (id: string, number: string, rawStatus: string, lineItems?: unknown[]) => ({
      id,
      number,
      docType: 'tax',
      billingMode: 'hourly',
      status: rawStatus,
      rawStatus,
      clientName: 'Acme',
      candidateName: '',
      jobTitle: '',
      issueDate: '2026-10-05',
      dueDate: '2026-11-05',
      daysOverdue: 0,
      total: 1180,
      subtotal: 1000,
      gstPct: 18,
      gst: 180,
      cgst: 90,
      sgst: 90,
      igst: 0,
      taxType: 'cgst_sgst',
      billTo: { name: 'Acme', state: 'Karnataka' },
      lineItems,
    });
    server.use(
      msw.get(`${API}/invoices/summary`, () => ok(null)),
      msw.get(`${API}/clients`, () => ok([])),
      msw.get(`${API}/settings/states`, () => ok(['Karnataka'])),
      msw.get(`${API}/invoices`, () =>
        ok([row('a', 'D-1', 'draft', [{ description: 'QA', rate: 1000, hours: 1, amount: 1000 }]), row('b', 'S-1', 'sent')]),
      ),
    );
    renderWithProviders(<InvoicesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit D-1' }));
    expect(await screen.findByText('Edit D-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit S-1' })).toBeNull();
  });
});
