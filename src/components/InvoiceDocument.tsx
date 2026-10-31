import type { ReactNode } from 'react';
import type { Invoice } from '@/api/endpoints/invoices';
import { LogoMark } from '@/components/Logo';
import { fmtDate, inr } from '@/lib/format';

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n: number): string => (n < 20 ? ONES[n]! : TENS[Math.floor(n / 10)]! + (n % 10 ? ' ' + ONES[n % 10] : ''));
const three = (n: number): string => (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n));

/** Indian numbering (crore / lakh / thousand). */
export function amountInWords(amount: number): string {
  const n = Math.round(amount);
  if (!n) return 'Zero Rupees Only';
  const parts: string[] = [];
  const cr = Math.floor(n / 1e7);
  const la = Math.floor(n / 1e5) % 100;
  const th = Math.floor(n / 1e3) % 100;
  const rest = n % 1000;
  if (cr) parts.push(three(cr) + ' Crore');
  if (la) parts.push(two(la) + ' Lakh');
  if (th) parts.push(two(th) + ' Thousand');
  if (rest) parts.push(three(rest));
  return 'Rupees ' + parts.join(' ') + ' Only';
}

const Row = ({ k, v, bold, color }: { k: ReactNode; v: ReactNode; bold?: boolean; color?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontWeight: bold ? 700 : 400, color }}>
    <span>{k}</span>
    <span>{v}</span>
  </div>
);
const Label = ({ children }: { children: ReactNode }) => <div style={{ color: '#64748b', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.06em' }}>{children}</div>;

/** The printable invoice. `inv.template` holds the look (accent, layout, bank details, terms); supplier and bill-to are frozen on the invoice. */
export function InvoiceDocument({ inv }: { inv: Invoice }) {
  const t = inv.template ?? {};
  const accent = t.accent || '#4f46e5';
  const sup = inv.supplier ?? {};
  const bt = inv.billTo ?? {};
  const proforma = inv.docType === 'proforma';
  const center = t.headerLayout === 'center';
  const pct = inv.gstPct != null ? inv.gstPct : 18;
  const half = pct / 2;
  const showBank = t.showBank !== false && !!sup.bankName;
  return (
    <div className="invoice-doc" style={{ background: '#fff', color: '#0f172a', padding: 38, borderRadius: 12, border: '1px solid var(--line)', fontSize: 13.5, lineHeight: 1.55, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: center ? 'column' : 'row', alignItems: center ? 'center' : 'flex-start', gap: 14, textAlign: center ? 'center' : 'left' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexDirection: center ? 'column' : 'row' }}>
          {t.showLogo !== false && <LogoMark size={46} shadow={false} />}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em' }}>{sup.name || 'Your company'}</div>
            <div style={{ color: '#64748b', fontSize: 12.5 }}>
              {sup.address}
              {sup.state ? ` · ${sup.state}` : ''}
            </div>
            <div style={{ color: '#64748b', fontSize: 12.5 }}>
              {sup.gstin && (
                <>
                  GSTIN: <b style={{ color: '#0f172a' }}>{sup.gstin}</b>
                </>
              )}
              {sup.pan && <> · PAN: {sup.pan}</>}
            </div>
          </div>
        </div>
        <div style={{ marginLeft: center ? 0 : 'auto', textAlign: center ? 'center' : 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '.06em', color: accent }}>{proforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'}</div>
          <div style={{ color: '#64748b' }}>{inv.number}</div>
          {inv.proformaNumber && <div style={{ color: '#64748b', fontSize: 12 }}>Ref. proforma {inv.proformaNumber}</div>}
        </div>
      </div>
      <div style={{ height: 3, background: accent, borderRadius: 2, margin: '18px 0' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        <div>
          <Label>Billed to</Label>
          <b style={{ fontSize: 15 }}>{bt.name || inv.clientName}</b>
          <div style={{ color: '#475569' }}>
            {bt.address}
            {bt.state ? ` · ${bt.state}` : ''}
          </div>
          {bt.gstin && (
            <div>
              GSTIN: <b>{bt.gstin}</b>
            </div>
          )}
          {bt.contact && <div style={{ color: '#475569' }}>Attn: {bt.contact}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>
            <span style={{ color: '#64748b' }}>Date:</span> <b>{fmtDate(inv.issueDate)}</b>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Due:</span> <b>{fmtDate(inv.dueDate)}</b>
          </div>
          {inv.placeOfSupply && (
            <div>
              <span style={{ color: '#64748b' }}>Place of supply:</span> <b>{inv.placeOfSupply}</b>
            </div>
          )}
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '22px 0 8px' }}>
        <thead>
          <tr style={{ background: accent, color: '#fff' }}>
            <th style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 600 }}>Description</th>
            <th style={{ padding: '9px 12px', fontWeight: 600, width: 90 }}>SAC</th>
            <th style={{ textAlign: 'right', padding: '9px 12px', fontWeight: 600, width: 150 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
              {inv.manualDescription ? (
                <b>{inv.manualDescription}</b>
              ) : (
                <>
                  <b>Recruitment fee: placement of {inv.candidateName}</b>
                  <div style={{ color: '#64748b', fontSize: 12.5 }}>Position: {inv.jobTitle}</div>
                </>
              )}
            </td>
            <td style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>{inv.sacCode}</td>
            <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{inr(inv.subtotal)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 300 }}>
          <Row k="Sub-total" v={inr(inv.subtotal)} />
          {inv.taxType === 'cgst_sgst' && (
            <>
              <Row k={`CGST @ ${half}%`} v={inr(inv.cgst)} color="#475569" />
              <Row k={`SGST @ ${half}%`} v={inr(inv.sgst)} color="#475569" />
            </>
          )}
          {(inv.taxType === 'igst' || inv.taxType === 'sez_igst') && <Row k={`IGST @ ${pct}%`} v={inr(inv.igst)} color="#475569" />}
          {inv.taxType === 'sez_lut' && <Row k="IGST (zero-rated, under LUT)" v={inr(0)} color="#475569" />}
          <div style={{ borderTop: `2px solid ${accent}`, marginTop: 6, paddingTop: 6 }}>
            <Row k="Total payable" v={inr(inv.total)} bold />
          </div>
        </div>
      </div>
      <div style={{ marginTop: 6, color: '#475569', fontSize: 12.5 }}>
        <b>Amount in words:</b> {amountInWords(inv.total)}
      </div>
      {inv.taxNote && <div style={{ marginTop: 10, padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 12.5 }}>{inv.taxNote}</div>}
      {proforma && <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef3c7', borderRadius: 8, fontSize: 12.5, color: '#92400e' }}>This is a proforma invoice for advance information and is not a tax invoice.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: showBank ? '1fr 1fr' : '1fr', gap: 28, marginTop: 24, fontSize: 12.5, color: '#475569' }}>
        {showBank && (
          <div>
            <Label>Bank details</Label>
            <div>{sup.accountName || sup.name}</div>
            <div>
              {sup.bankName} · A/c {sup.accountNumber}
            </div>
            <div>IFSC {sup.ifsc}</div>
          </div>
        )}
        <div>
          <Label>Terms</Label>
          <div>{t.terms}</div>
          {!!inv.guaranteeDays && inv.guaranteeDays > 0 && (
            <div>
              Replacement guarantee: {inv.guaranteeDays} days from joining{inv.guaranteeEnds ? ` (until ${fmtDate(inv.guaranteeEnds)})` : ''}
              {inv.replacement && inv.replacement !== 'none' ? ` · ${inv.replacement}` : ''}.
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 30, fontSize: 12.5, color: '#64748b' }}>
        <span>{t.footer}</span>
        <span style={{ textAlign: 'right', color: '#0f172a' }}>
          For <b>{sup.name}</b>
          <br />
          <span style={{ color: '#64748b' }}>Authorised signatory</span>
        </span>
      </div>
    </div>
  );
}
