import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Invoice } from '@/api/endpoints/invoices';
import { InvoiceDocument, amountInWords } from './InvoiceDocument';

const base: Invoice = {
  id: 'i1',
  number: 'INV-2026-0007',
  docType: 'tax',
  status: 'sent',
  rawStatus: 'sent',
  clientName: 'Acme Corp',
  candidateName: 'Asha Rao',
  jobTitle: 'Backend Engineer',
  issueDate: '2026-10-01T00:00:00Z',
  dueDate: '2026-10-31T00:00:00Z',
  daysOverdue: 0,
  subtotal: 100000,
  gstPct: 18,
  gst: 18000,
  cgst: 9000,
  sgst: 9000,
  igst: 0,
  total: 118000,
  taxType: 'cgst_sgst',
  sacCode: '998512',
  supplier: { name: 'Placewise HR', state: 'Karnataka', gstin: '29ABCDE1234F1Z5', bankName: 'HDFC', accountNumber: '123', ifsc: 'HDFC0001' },
  billTo: { name: 'Acme Corp', state: 'Karnataka' },
  template: { terms: 'Net 30', footer: 'Thank you' },
  guaranteeDays: 90,
};

describe('InvoiceDocument GST display', () => {
  it('splits intra-state GST into CGST + SGST at half the rate and shows the total in rupees and words', () => {
    render(<InvoiceDocument inv={base} />);
    expect(screen.getByText('TAX INVOICE')).toBeInTheDocument();
    expect(screen.getByText('CGST @ 9%')).toBeInTheDocument();
    expect(screen.getByText('SGST @ 9%')).toBeInTheDocument();
    expect(screen.queryByText(/IGST/)).not.toBeInTheDocument();
    expect(screen.getByText('Sub-total').nextSibling).toHaveTextContent('₹1,00,000');
    expect(screen.getAllByText('₹9,000')).toHaveLength(2);
    expect(screen.getByText('Total payable').nextSibling).toHaveTextContent('₹1,18,000');
    expect(screen.getByText(/Rupees One Lakh Eighteen Thousand Only/)).toBeInTheDocument();
  });

  it('shows a single IGST line for inter-state invoices', () => {
    render(<InvoiceDocument inv={{ ...base, taxType: 'igst', cgst: 0, sgst: 0, igst: 18000 }} />);
    expect(screen.getByText('IGST @ 18%').nextSibling).toHaveTextContent('₹18,000');
    expect(screen.queryByText(/CGST/)).not.toBeInTheDocument();
  });

  it('shows zero-rated IGST for SEZ/LUT clients with the tax note', () => {
    render(<InvoiceDocument inv={{ ...base, taxType: 'sez_lut', gst: 0, cgst: 0, sgst: 0, igst: 0, total: 100000, taxNote: 'Supply to SEZ under LUT' }} />);
    expect(screen.getByText('IGST (zero-rated, under LUT)').nextSibling).toHaveTextContent('₹0');
    expect(screen.getByText('Total payable').nextSibling).toHaveTextContent('₹1,00,000');
    expect(screen.getByText('Supply to SEZ under LUT')).toBeInTheDocument();
  });

  it('labels a proforma and uses the manual description for non-placement invoices', () => {
    render(<InvoiceDocument inv={{ ...base, docType: 'proforma', proformaNumber: undefined, manualDescription: 'Monthly retainer', number: 'PF-0001' }} />);
    expect(screen.getByText('PROFORMA INVOICE')).toBeInTheDocument();
    expect(screen.getByText('Monthly retainer')).toBeInTheDocument();
    expect(screen.getByText(/not a tax invoice/)).toBeInTheDocument();
  });
});

describe('amountInWords', () => {
  it.each([
    [0, 'Zero Rupees Only'],
    [118000, 'Rupees One Lakh Eighteen Thousand Only'],
    [12345678, 'Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only'],
    [500, 'Rupees Five Hundred Only'],
  ])('%i', (n, words) => expect(amountInWords(n)).toBe(words));
});
