import { useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Printer, X as XIcon } from 'lucide-react';
import { useState } from 'react';
import { applicationsApi, type Application, type CandidateRef, type JobRef, type Offer, type OfferStatus } from '@/api/endpoints/applications';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { fmtDate, money } from '@/lib/format';
import { toast } from '@/stores/ui.store';

const OFFER_TONE: Record<string, string> = { offered: 'brand', accepted: 'good', declined: 'bad', withdrawn: '' };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Opens a printable offer letter in a new window (same document as the legacy client; every interpolated value is escaped). */
export function printOffer(o: Offer, c: Pick<CandidateRef, 'name'>, j: { title: string; city?: string }, client?: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  const org = esc(client || 'Offer of employment');
  w.document.write(`<!doctype html><title>Offer letter · ${esc(c.name)}</title><style>body{font:15px/1.7 Georgia,serif;max-width:720px;margin:60px auto;padding:0 28px;color:#111}h2{font-family:Inter,system-ui,sans-serif;margin:0}table{border-collapse:collapse;width:100%;margin:18px 0}td{border-bottom:1px solid #ddd;padding:8px 4px}td:first-child{color:#666;width:200px}@media print{body{margin:20px}}</style>
  <h2>${org}</h2><p style="color:#666">${fmtDate(o.offeredAt)}</p><p>Dear ${esc(c.name)},</p><p>We are pleased to offer you the position of <b>${esc(j.title)}</b>${j.city ? ' based in ' + esc(j.city) : ''}, subject to the terms below.</p>
  <table><tr><td>Position</td><td>${esc(j.title)}</td></tr><tr><td>Annual compensation (CTC)</td><td><b>${money(o.ctc)} per annum</b></td></tr><tr><td>Proposed joining date</td><td>${o.joiningDate ? fmtDate(o.joiningDate) : 'To be confirmed'}</td></tr></table>
  <p>${o.notes ? esc(o.notes) : 'This offer is subject to satisfactory reference and background verification.'}</p><p>Please confirm your acceptance by replying to this letter.</p><p>Sincerely,<br><br><b>${esc(client || 'Hiring team')}</b></p><script>setTimeout(()=>print(),300)</script>`);
  w.document.close();
}

/** Offer status / creation strip shown under an application row. */
export function OfferBox({ application, offer, candidate, job }: { application: Pick<Application, 'id'>; offer?: Offer | null; candidate: CandidateRef; job: JobRef }) {
  const qc = useQueryClient();
  const [mk, setMk] = useState(false);
  const [v, setV] = useState({ ctc: String(candidate.expected ?? ''), joiningDate: '' });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.applications.all });
    void qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
  };
  const setStatus = useApiMutation((status: OfferStatus) => applicationsApi.setOfferStatus(offer!.id, status), {
    onSuccess: (_d, status) => {
      toast('Offer ' + status);
      refresh();
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const create = useApiMutation(() => applicationsApi.createOffer(application.id, { ctc: +v.ctc, joiningDate: v.joiningDate || undefined }), {
    onSuccess: () => {
      toast('Offer created');
      refresh();
      setMk(false);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  if (offer)
    return (
      <div style={{ marginTop: 8, marginLeft: 52, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface2)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
        <span className={'badge ' + (OFFER_TONE[offer.status] ?? '')}>Offer {offer.status}</span>
        <span>
          <b>{money(offer.ctc)}</b>
          {offer.joiningDate && <> · joins {fmtDate(offer.joiningDate)}</>}
        </span>
        <span style={{ flex: 1 }} />
        {offer.status === 'offered' && (
          <>
            <button className="btn sm" onClick={() => setStatus.mutate('accepted')}>
              <Check size={13} />
              Accepted
            </button>
            <button className="btn sm" onClick={() => setStatus.mutate('declined')}>
              <XIcon size={13} />
              Declined
            </button>
          </>
        )}
        <button className="btn sm" onClick={() => printOffer(offer, candidate, job.title ? job : { title: '' }, job.client?.name)}>
          <Printer size={13} />
          Letter
        </button>
      </div>
    );
  return (
    <div style={{ marginTop: 8, marginLeft: 52 }}>
      {!mk ? (
        <button className="btn sm" onClick={() => setMk(true)}>
          <Plus size={13} />
          Create offer
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12 }}>
            Offered CTC (₹ LPA)
            <input className="input" type="number" style={{ width: 130, display: 'block' }} value={v.ctc} onChange={(e) => setV((s) => ({ ...s, ctc: e.target.value }))} />
          </label>
          <label style={{ fontSize: 12 }}>
            Joining date
            <input className="input" type="date" style={{ display: 'block' }} value={v.joiningDate} onChange={(e) => setV((s) => ({ ...s, joiningDate: e.target.value }))} />
          </label>
          <button className="btn sm primary" disabled={create.isPending || !(+v.ctc > 0)} onClick={() => create.mutate()}>
            Save offer
          </button>
          <button className="btn sm ghost" onClick={() => setMk(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
