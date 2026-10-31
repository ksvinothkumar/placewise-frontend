import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, FileCheck2, Loader2, Printer, RotateCcw, Save, Send, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { invoicesApi, type InvoiceUpdate } from '@/api/endpoints/invoices';
import { errorMessage } from '@/api/errors';
import { dashboardKey } from '@/api/endpoints/dashboard';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCan } from '@/lib/permissions';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { InvBadge } from './InvBadge';
import { InvoiceDocument } from './InvoiceDocument';
import { useInvoice } from './useInvoices';

export function InvoiceViewPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const w = useCan('invoices:manage');
  const mail = useSessionStore((s) => s.mail);
  const { data: i, isLoading, isError } = useInvoice(id);
  const [busy, setBusy] = useState('');
  const [ed, setEd] = useState<{ subtotal: string; gstPct: string; docType: 'tax' | 'proforma' } | null>(null);
  if (isLoading) return <div className="card"><Skeleton rows={9} /></div>;
  if (isError || !i) return <EmptyState title="Invoice not found" />;
  const draft = i.rawStatus === 'draft';
  const act = async <T,>(key: string, fn: () => Promise<T>, ok: string | ((r: T) => string)) => {
    setBusy(key);
    try {
      const r = await fn();
      toast(typeof ok === 'function' ? ok(r) : ok);
      void qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      void qc.invalidateQueries({ queryKey: dashboardKey });
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy('');
    }
  };
  const put = (body: InvoiceUpdate) => invoicesApi.patch(id, body);
  const e = ed ?? { subtotal: String(i.subtotal), gstPct: String(i.gstPct), docType: i.docType };
  const dirty = !!ed && (+ed.subtotal !== i.subtotal || +ed.gstPct !== i.gstPct || ed.docType !== i.docType);
  return (
    <>
      <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <Link to="/invoices" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--text2)' }}>
          <ArrowLeft size={15} />
          Invoices
        </Link>
        <InvBadge s={i.status} />
        {i.docType === 'proforma' && <span className="badge warn">Proforma</span>}
        <span style={{ flex: 1 }} />
        {w && i.docType === 'proforma' && i.rawStatus !== 'cancelled' && (
          <button
            className="btn primary"
            disabled={!!busy}
            onClick={() => confirm(`Convert ${i.number} to a tax invoice? It gets a new tax invoice number and today's date.`) && void act('conv', () => invoicesApi.convertToTax(id), (r) => `Converted to ${r.number}`)}
          >
            <FileCheck2 size={15} />
            Convert to tax invoice
          </button>
        )}
        {w && draft && (
          <button className="btn" onClick={() => void act('sent', () => put({ status: 'sent' }), 'Marked as sent')}>
            <Send size={15} />
            Mark as sent
          </button>
        )}
        {w && i.rawStatus !== 'paid' && i.rawStatus !== 'cancelled' && (
          <button
            className="btn"
            disabled={!!busy}
            onClick={() =>
              confirm(`Email ${i.number} to ${i.client?.email || 'the client'}${mail ? '' : ' (email is not configured, so this only records it as sent)'}?`) &&
              void act('email', () => invoicesApi.send(id), (r) => (r.status === 'sent' ? `Invoice emailed to ${r.to}` : r.status === 'simulated' ? 'Marked as sent (email not configured)' : 'Email failed: ' + r.error))
            }
          >
            {busy === 'email' ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
            Email to client
          </button>
        )}
        {w && ['sent', 'draft'].includes(i.rawStatus) && i.docType === 'tax' && (
          <button className="btn primary" onClick={() => void act('paid', () => put({ status: 'paid' }), 'Marked as paid')}>
            <CheckCircle2 size={15} />
            Mark as paid
          </button>
        )}
        {w && i.replacement === 'none' && !draft && i.docType === 'tax' && (
          <button className="btn" onClick={() => confirm('Flag this placement for replacement?') && void act('rep', () => put({ replacement: 'flagged' }), 'Flagged for replacement')}>
            <ShieldAlert size={15} />
            Flag replacement
          </button>
        )}
        {w && i.replacement === 'flagged' && (
          <button className="btn" onClick={() => void act('rep', () => put({ replacement: 'replaced' }), 'Marked as replaced')}>
            <RotateCcw size={15} />
            Mark replaced
          </button>
        )}
        <button className="btn" onClick={() => window.print()}>
          <Printer size={15} />
          Print / PDF
        </button>
      </div>
      {w && draft && (
        <div className="card no-print" style={{ marginBottom: 16 }}>
          <div className="card-b" style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12.5, color: 'var(--text2)' }}>
              Amount before GST (₹)
              <input className="input" type="number" min="1" style={{ display: 'block', width: 160 }} value={e.subtotal} onChange={(x) => setEd({ ...e, subtotal: x.target.value })} />
            </label>
            <label style={{ fontSize: 12.5, color: 'var(--text2)' }}>
              GST %
              <input className="input" type="number" min="0" max="28" style={{ display: 'block', width: 90 }} value={e.gstPct} onChange={(x) => setEd({ ...e, gstPct: x.target.value })} />
            </label>
            <label style={{ fontSize: 12.5, color: 'var(--text2)' }}>
              Document
              <select className="select" style={{ display: 'block', width: 170 }} value={e.docType} onChange={(x) => setEd({ ...e, docType: x.target.value as 'tax' | 'proforma' })}>
                <option value="tax">Tax invoice</option>
                <option value="proforma">Proforma invoice</option>
              </select>
            </label>
            <button
              className="btn primary"
              disabled={!dirty || !!busy}
              onClick={() =>
                void act(
                  'save',
                  async () => {
                    const r = await put({ subtotal: +e.subtotal, gstPct: +e.gstPct, docType: e.docType });
                    setEd(null);
                    return r;
                  },
                  'Draft updated. Tax recalculated',
                )
              }
            >
              <Save size={15} />
              Save &amp; recalculate
            </button>
            <span style={{ color: 'var(--muted)', fontSize: 12.5, flex: 1, minWidth: 220 }}>Drafts can be edited. The GST split (CGST/SGST, IGST or SEZ) follows the client's state set under Clients.</span>
          </div>
        </div>
      )}
      <InvoiceDocument inv={i} />
    </>
  );
}
