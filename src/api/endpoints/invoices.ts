import { http } from '../http';
import { crud } from './crud';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type TaxType = 'cgst_sgst' | 'igst' | 'sez_igst' | 'sez_lut';
export interface Party {
  name?: string;
  address?: string;
  state?: string;
  gstin?: string;
  pan?: string;
  contact?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
}
export interface InvoiceLook {
  accent?: string;
  headerLayout?: 'left' | 'center';
  showLogo?: boolean;
  showBank?: boolean;
  terms?: string;
  footer?: string;
}
export interface Invoice {
  id: string;
  number: string;
  docType: 'tax' | 'proforma';
  /** effective status (a sent invoice past due shows as overdue) */
  status: InvoiceStatus;
  rawStatus: InvoiceStatus;
  proformaNumber?: string;
  clientName: string;
  candidateName: string;
  jobTitle: string;
  manualDescription?: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  subtotal: number;
  gstPct: number;
  gst: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  taxType: TaxType;
  taxNote?: string;
  sacCode?: string;
  placeOfSupply?: string;
  supplier?: Party;
  billTo?: Party;
  template?: InvoiceLook;
  guaranteeDays?: number;
  guaranteeEnds?: string;
  guaranteeDaysLeft?: number | null;
  replacement?: 'none' | 'flagged' | 'replaced';
  client?: { name?: string; contact?: string; email?: string };
}
export interface InvoiceSummary {
  outstanding: number;
  overdue: number;
  overdueCount: number;
  paidThisMonth: number;
  draftCount: number;
  draftValue: number;
  aging: { current: number; d30: number; d60: number; d60p: number };
  guarantee: Invoice[];
}
export interface SendResult {
  status: 'sent' | 'simulated' | 'failed';
  error?: string;
  to?: string;
}
export interface InvoiceUpdate {
  status?: InvoiceStatus;
  replacement?: 'flagged' | 'replaced';
  subtotal?: number;
  gstPct?: number;
  docType?: 'tax' | 'proforma';
}

export const invoicesApi = {
  ...crud<Invoice>('/invoices'),
  list: (status?: string) => http.get<Invoice[]>('/invoices', { status }),
  get: (id: string) => http.get<Invoice>(`/invoices/${id}`),
  summary: () => http.get<InvoiceSummary>('/invoices/summary'),
  create: (body: { client: string; docType: 'tax' | 'proforma'; amount: number; description: string }) => http.post<Invoice>('/invoices', body),
  patch: (id: string, body: InvoiceUpdate) => http.put<Invoice>(`/invoices/${id}`, body),
  send: (id: string) => http.post<SendResult>(`/invoices/${id}/send`, {}),
  convertToTax: (id: string) => http.post<Invoice>(`/invoices/${id}/convert-to-tax`),
};
