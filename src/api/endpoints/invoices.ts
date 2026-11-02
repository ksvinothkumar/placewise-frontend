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
  registeredName?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
}
export type DocType = 'tax' | 'proforma' | 'sez';
export type BillingMode = 'ctc' | 'hourly';
/** One billed line: CTC billing uses annualCtc x feePct (or a typed charge), hourly billing uses rate x hours. `amount` is before GST. */
export interface LineItem {
  description?: string;
  candidateName?: string;
  designation?: string;
  joiningDate?: string;
  annualCtc?: number;
  feePct?: number;
  rate?: number;
  hours?: number;
  amount: number;
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
  docType: DocType;
  billingMode?: BillingMode;
  lineItems?: LineItem[];
  lutText?: string;
  internalRemarks?: string;
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
  docType?: DocType;
  /** drafts only */
  buyerName?: string;
  buyerGstin?: string;
  buyerAddress?: string;
  buyerState?: string;
  registeredName?: string;
  dueDate?: string;
  internalRemarks?: string;
  lutText?: string;
  lineItems?: NewInvoiceBody['lineItems'];
}

/** A hand-made invoice. Leave `number` out to auto-generate; `client` is optional (it autofills the buyer and links the revenue). */
export interface NewInvoiceBody {
  docType: DocType;
  billingMode: BillingMode;
  number?: string;
  client?: string;
  buyerName: string;
  buyerGstin?: string;
  buyerAddress?: string;
  buyerState: string;
  registeredName?: string;
  issueDate?: string;
  dueDate?: string;
  lineItems: Array<Omit<LineItem, 'amount'> & { amount?: number }>;
  internalRemarks?: string;
  lutText?: string;
}

export const invoicesApi = {
  ...crud<Invoice>('/invoices'),
  list: (status?: string) => http.get<Invoice[]>('/invoices', { status }),
  get: (id: string) => http.get<Invoice>(`/invoices/${id}`),
  summary: () => http.get<InvoiceSummary>('/invoices/summary'),
  create: (body: NewInvoiceBody) => http.post<Invoice>('/invoices', body),
  patch: (id: string, body: InvoiceUpdate) => http.put<Invoice>(`/invoices/${id}`, body),
  send: (id: string) => http.post<SendResult>(`/invoices/${id}/send`, {}),
  convertToTax: (id: string) => http.post<Invoice>(`/invoices/${id}/convert-to-tax`),
};
