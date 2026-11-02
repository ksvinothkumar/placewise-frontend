import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http as msw } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { InvoiceDocument } from '@/components/InvoiceDocument';
import type { Invoice } from '@/api/endpoints/invoices';
import { server } from '@/test/msw/server';
import { API, ok, renderWithProviders } from '@/test/recruitment-utils';
import { lineAmount, NewInvoice } from './NewInvoice';

vi.setConfig({ testTimeout: 30_000 });

function boot(onPost?: (b: Record<string, unknown>) => void) {
  server.use(
    msw.get(`${API}/clients`, () =>
      ok([{ id: 'c1', name: 'Acme Ltd', gstin: '29AAAAA0000A1Z5', address: 'MG Road', city: 'Bengaluru', state: 'Karnataka' }]),
    ),
    msw.get(`${API}/settings/states`, () => ok(['Karnataka', 'Maharashtra'])),
    msw.post(`${API}/invoices`, async ({ request }) => {
      onPost?.((await request.json()) as Record<string, unknown>);
      return ok({ id: 'i9', number: 'SEZ/2026-27/0001' });
    }),
  );
  return renderWithProviders(<NewInvoice onClose={() => undefined} />);
}

describe('lineAmount', () => {
  const l = {
    description: '',
    candidateName: '',
    designation: '',
    joiningDate: '',
    annualCtc: '1200000',
    feePct: '8.33',
    charges: null,
    rate: '1500',
    hours: '160',
  };
  it('works out CTC fees, lets a typed charge win, and multiplies hourly lines', () => {
    expect(lineAmount('ctc', l)).toBe(99960);
    expect(lineAmount('ctc', { ...l, charges: '90000' })).toBe(90000);
    expect(lineAmount('hourly', l)).toBe(240000);
  });
});

describe('NewInvoice', () => {
  it('switches fields with the billing type and shows the LUT text only for SEZ', async () => {
    boot();
    expect(await screen.findByLabelText('Annual CTC 1')).toBeInTheDocument();
    expect(screen.queryByText('LUT Declaration Text')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'SEZ Invoice' }));
    expect(screen.getByDisplayValue(/LETTER OF UNDERTAKING/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hourly Billing' }));
    expect(screen.queryByLabelText('Annual CTC 1')).toBeNull();
    fireEvent.change(screen.getByLabelText('Rate per hour 1'), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText('Hours worked 1'), { target: { value: '10' } });
    expect(screen.getByLabelText('Amount 1')).toHaveValue('15000');
  });

  it('autofills the buyer from a client, and posts the typed invoice', async () => {
    let posted: Record<string, unknown> | undefined;
    boot((b) => (posted = b));
    await screen.findByRole('option', { name: 'Acme Ltd' });
    const create = screen.getByRole('button', { name: 'Create draft' });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Existing client'), { target: { value: 'c1' } });
    expect(screen.getByLabelText('Buyer company name')).toHaveValue('Acme Ltd');
    expect(screen.getByLabelText('Buyer GSTIN')).toHaveValue('29AAAAA0000A1Z5');
    await screen.findByRole('option', { name: 'Maharashtra' });
    expect(screen.getByLabelText('Buyer state')).toHaveValue('Karnataka');
    fireEvent.click(screen.getByRole('button', { name: 'SEZ Invoice' }));
    fireEvent.change(screen.getByLabelText('Candidate name 1'), { target: { value: 'Asha' } });
    fireEvent.change(screen.getByLabelText('Annual CTC 1'), { target: { value: '1000000' } });
    fireEvent.change(screen.getByLabelText('Fee % 1'), { target: { value: '10' } });
    expect(screen.getByLabelText('Charges 1')).toHaveValue(100000);
    expect(create).toBeEnabled();
    fireEvent.click(create);
    await waitFor(() => expect(posted).toBeTruthy());
    expect(posted).toMatchObject({
      docType: 'sez',
      billingMode: 'ctc',
      client: 'c1',
      buyerName: 'Acme Ltd',
      buyerState: 'Karnataka',
      lineItems: [{ candidateName: 'Asha', annualCtc: 1000000, feePct: 10, amount: 100000 }],
    });
  });
});

describe('InvoiceDocument types', () => {
  const base = {
    number: 'SEZ/2026-27/0001',
    status: 'draft',
    rawStatus: 'draft',
    clientName: 'Globex',
    candidateName: '',
    jobTitle: '',
    issueDate: '2026-11-02',
    dueDate: '2026-12-02',
    daysOverdue: 0,
    subtotal: 260000,
    gstPct: 18,
    gst: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    total: 260000,
    taxType: 'sez_lut',
    sacCode: '998512',
  };
  it('prints an SEZ invoice with hourly lines, the LUT text and the registered name', () => {
    const inv = {
      ...base,
      docType: 'sez',
      billingMode: 'hourly',
      lutText: 'UNDER LETTER OF UNDERTAKING',
      lineItems: [{ candidateName: 'Asha', designation: 'Dev', rate: 1500, hours: 160, amount: 240000 }],
      billTo: { name: 'Globex', registeredName: 'Globex Technologies Pvt Ltd' },
    } as unknown as Invoice;
    render(<InvoiceDocument inv={inv} />);
    expect(screen.getByText('SEZ INVOICE')).toBeInTheDocument();
    expect(screen.getByText('Rate/hr')).toBeInTheDocument();
    expect(screen.getByText('UNDER LETTER OF UNDERTAKING')).toBeInTheDocument();
    expect(screen.getByText('Registered name: Globex Technologies Pvt Ltd')).toBeInTheDocument();
    expect(screen.getByText('₹2,40,000')).toBeInTheDocument();
  });
  it('keeps the old one-line layout for placement invoices', () => {
    const inv = { ...base, docType: 'tax', candidateName: 'Ravi', jobTitle: 'QA', taxType: 'cgst_sgst' } as unknown as Invoice;
    render(<InvoiceDocument inv={inv} />);
    expect(screen.getByText('TAX INVOICE')).toBeInTheDocument();
    expect(screen.getByText('Recruitment fee: placement of Ravi')).toBeInTheDocument();
  });
});

describe('NewInvoice editing a draft', () => {
  it('prefills from the draft, locks the billing type and sends the changes with PUT', async () => {
    let sent: Record<string, unknown> | undefined;
    server.use(
      msw.get(`${API}/clients`, () => ok([])),
      msw.get(`${API}/settings/states`, () => ok(['Karnataka', 'Delhi'])),
      msw.put(`${API}/invoices/i1`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return ok({ id: 'i1', number: 'INV/2026-27/0003' });
      }),
    );
    const inv = {
      id: 'i1',
      number: 'INV/2026-27/0003',
      docType: 'tax',
      billingMode: 'hourly',
      issueDate: '2026-11-02T00:00:00Z',
      dueDate: '2026-12-02T00:00:00Z',
      billTo: { name: 'Initech', state: 'Karnataka' },
      lineItems: [{ description: 'QA', rate: 1000, hours: 10, amount: 10000 }],
    } as unknown as Invoice;
    renderWithProviders(<NewInvoice edit={inv} onClose={() => undefined} />);
    expect(await screen.findByDisplayValue('Initech')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CTC % Billing' })).toBeDisabled();
    expect(screen.queryByText(/Invoice Number/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Hours worked 1'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(sent).toBeDefined());
    expect(sent).toMatchObject({ buyerName: 'Initech', lineItems: [{ rate: 1000, hours: 20 }] });
  });
});
