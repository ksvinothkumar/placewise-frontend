import { Paginated } from '@/components/ui/Paginated';
import { AlertTriangle, CheckCircle2, FileText, Plus, ShieldCheck, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kpi, PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtDate, inr } from '@/lib/format';
import { useCan } from '@/lib/permissions';
import { InvBadge } from './InvBadge';
import { NewInvoice } from './NewInvoice';
import { useInvoiceList, useInvoiceSummary } from './useInvoices';

const FILTERS: [string, string][] = [
  ['', 'All'],
  ['draft', 'Draft'],
  ['sent', 'Sent'],
  ['overdue', 'Overdue'],
  ['paid', 'Paid'],
];

export function InvoicesPage() {
  const nav = useNavigate();
  const canManage = useCan('invoices:manage');
  const [mk, setMk] = useState(false);
  const [f, setF] = useState('');
  const { data: s } = useInvoiceSummary();
  const { data, isLoading } = useInvoiceList(f);
  const aging: [string, number, string][] | null = s
    ? [
        ['Not yet due', s.aging.current, 'var(--good)'],
        ['1–30 days late', s.aging.d30, 'var(--warn)'],
        ['31–60 days', s.aging.d60, '#ea580c'],
        ['60+ days', s.aging.d60p, 'var(--bad)'],
      ]
    : null;
  const maxA = aging ? Math.max(1, ...aging.map((a) => a[1])) : 1;
  return (
    <>
      <PageHead title="Invoices" sub="Proforma, tax and SEZ invoices, payments and replacement guarantees">
        {canManage && (
          <button className="btn primary" onClick={() => setMk(true)}>
            <Plus size={16} />
            New invoice
          </button>
        )}
      </PageHead>
      {mk && <NewInvoice onClose={() => setMk(false)} />}
      {s && aging && (
        <>
          <div className="grid kpis">
            <Kpi icon={Wallet} label="Outstanding" value={inr(s.outstanding)} sub="Sent, not yet paid" />
            <Kpi icon={AlertTriangle} label="Overdue" value={inr(s.overdue)} sub={`${s.overdueCount} invoice${s.overdueCount === 1 ? '' : 's'}`} tone="warn" />
            <Kpi icon={CheckCircle2} label="Paid this month" value={inr(s.paidThisMonth)} sub="Collected" tone="good" />
            <Kpi icon={FileText} label="Drafts to review" value={s.draftCount} sub={inr(s.draftValue) + ' to send'} tone="info" />
          </div>
          <div className="grid cols-2" style={{ marginTop: 18 }}>
            <div className="card">
              <div className="card-h">
                <h3>Receivables ageing</h3>
              </div>
              <div className="card-b" style={{ display: 'grid', gap: 12 }}>
                {aging.map(([l, v, c]) => (
                  <div key={l}>
                    <div style={{ display: 'flex', fontSize: 13 }}>
                      <span style={{ flex: 1 }}>{l}</span>
                      <b>{inr(v)}</b>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--line2)', marginTop: 4 }}>
                      <div style={{ height: 8, borderRadius: 4, width: (v / maxA) * 100 + '%', background: c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-h">
                <ShieldCheck size={17} color="var(--brand)" />
                <h3>Guarantee watch</h3>
                <small>placements still inside the replacement window</small>
              </div>
              <div className="card-b">
                {s.guarantee.length ? (
                  <ul className="list">
                    {s.guarantee.slice(0, 6).map((g) => (
                      <li key={g.id} style={{ cursor: 'pointer', alignItems: 'center' }} onClick={() => nav('/invoices/' + g.id)}>
                        <div style={{ flex: 1 }}>
                          <b>{g.candidateName}</b>
                          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                            {g.clientName} · {g.jobTitle}
                          </div>
                        </div>
                        <span className={'badge ' + ((g.guaranteeDaysLeft ?? 0) <= 14 ? 'warn' : 'good')}>{g.guaranteeDaysLeft}d left</span>
                        {g.replacement && g.replacement !== 'none' && <span className="badge bad">{g.replacement}</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="Nothing inside a guarantee window" />
                )}
              </div>
            </div>
          </div>
        </>
      )}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="toolbar">
          <div className="seg">
            {FILTERS.map(([k, l]) => (
              <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <Skeleton />
        ) : data?.length ? (
          <Paginated items={data} render={(pageRows) => (
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Placement</th>
                <th>Issued</th>
                <th>Due</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((i) => (
                <tr key={i.id} className="click" onClick={() => nav('/invoices/' + i.id)}>
                  <td>
                    <b>{i.number}</b>
                    {i.docType === 'proforma' && (
                      <span className="badge warn" style={{ marginLeft: 6 }}>
                        Proforma
                      </span>
                    )}
                    {i.docType === 'sez' && (
                      <span className="badge" style={{ marginLeft: 6 }}>
                        SEZ
                      </span>
                    )}
                  </td>
                  <td>{i.clientName}</td>
                  <td>
                    {i.candidateName}
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{i.jobTitle}</div>
                  </td>
                  <td>{fmtDate(i.issueDate)}</td>
                  <td>
                    {fmtDate(i.dueDate)}
                    {i.daysOverdue > 0 && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{i.daysOverdue}d late</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <b>{inr(i.total)}</b>
                  </td>
                  <td>
                    <InvBadge s={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )} />
        ) : (
          <EmptyState icon={FileText} title="No invoices here" sub="A draft invoice is created automatically when a candidate is placed." />
        )}
      </div>
    </>
  );
}
