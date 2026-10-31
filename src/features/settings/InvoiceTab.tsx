import { Building2, FileText, Loader2, Save } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { settingsApi, type CompanyInfo, type InvoiceTemplate } from '@/api/endpoints/settings';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { Field } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/stores/ui.store';
import { settingsKeys, useSettingsView, useStates } from './hooks';

export function InvoiceTab() {
  const { data } = useSettingsView();
  const { data: states } = useStates();
  const [coDraft, setCo] = useState<CompanyInfo | null>(null);
  const [tpDraft, setTp] = useState<InvoiceTemplate | null>(null);
  const co = coDraft ?? data?.company ?? null;
  const tp = tpDraft ?? data?.invoice ?? null;

  const saveCo = useApiMutation((c: CompanyInfo) => settingsApi.saveCompany(c), {
    invalidate: [settingsKeys.view],
    onSuccess: () => {
      toast('Company details saved');
      setCo(null);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const saveTp = useApiMutation((t: InvoiceTemplate) => settingsApi.saveInvoice({ ...t, gstPct: +t.gstPct }), {
    invalidate: [settingsKeys.view],
    onSuccess: () => {
      toast('Invoice template saved');
      setTp(null);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (!co || !tp) return <div className="card"><Skeleton rows={8} /></div>;
  const c = (k: keyof CompanyInfo) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setCo({ ...co, [k]: e.target.value });
  const upper = (k: keyof CompanyInfo) => (e: ChangeEvent<HTMLInputElement>) => setCo({ ...co, [k]: e.target.value.toUpperCase() });
  const t = (k: keyof InvoiceTemplate) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setTp({ ...tp, [k]: e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-h"><Building2 size={17} color="var(--brand)" /><h3>Your company (on every invoice)</h3></div>
          <div className="card-b">
            <div className="f2">
              <Field label="Display name"><input className="input" value={co.name} onChange={c('name')} /></Field>
              <Field label="Legal name"><input className="input" value={co.legalName} onChange={c('legalName')} /></Field>
            </div>
            <Field label="Address"><input className="input" value={co.address} onChange={c('address')} /></Field>
            <div className="f2">
              <Field label="City"><input className="input" value={co.city} onChange={c('city')} /></Field>
              <Field label="State (decides CGST/SGST vs IGST)">
                <select className="select" value={co.state} onChange={c('state')}>
                  <option value="">Select…</option>
                  {(states ?? []).map((x) => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="GSTIN"><input className="input" maxLength={15} placeholder="29ABCDE1234F1Z5" value={co.gstin} onChange={upper('gstin')} /></Field>
              <Field label="PAN"><input className="input" maxLength={10} value={co.pan} onChange={upper('pan')} /></Field>
              <Field label="Email"><input className="input" value={co.email} onChange={c('email')} /></Field>
              <Field label="Phone"><input className="input" value={co.phone} onChange={c('phone')} /></Field>
            </div>
            <div style={{ marginTop: 14, fontWeight: 600 }}>Bank details</div>
            <div className="f2">
              <Field label="Bank"><input className="input" value={co.bankName} onChange={c('bankName')} /></Field>
              <Field label="Account name"><input className="input" value={co.accountName} onChange={c('accountName')} /></Field>
              <Field label="Account number"><input className="input" value={co.accountNumber} onChange={c('accountNumber')} /></Field>
              <Field label="IFSC"><input className="input" value={co.ifsc} onChange={upper('ifsc')} /></Field>
            </div>
            <button type="button" className="btn primary" style={{ marginTop: 16 }} disabled={saveCo.isPending} onClick={() => saveCo.mutate(co)}>
              {saveCo.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save company details
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><FileText size={17} color="var(--brand)" /><h3>Invoice template</h3></div>
          <div className="card-b">
            <div className="f2">
              <Field label="Accent colour"><input type="color" value={tp.accent} onChange={t('accent')} style={{ width: 70, height: 38, border: '1px solid var(--line)', borderRadius: 8, background: 'none' }} /></Field>
              <Field label="Header layout">
                <select className="select" value={tp.headerLayout} onChange={t('headerLayout')}>
                  <option value="left">Logo left</option>
                  <option value="center">Centred</option>
                </select>
              </Field>
              <Field label="GST %"><input className="input" type="number" min="0" max="28" value={tp.gstPct} onChange={t('gstPct')} /></Field>
              <Field label="SAC code"><input className="input" value={tp.sacCode} onChange={t('sacCode')} /></Field>
              <Field label="Tax invoice prefix"><input className="input" maxLength={6} value={tp.taxPrefix} onChange={t('taxPrefix')} /></Field>
              <Field label="Proforma prefix"><input className="input" maxLength={6} value={tp.proformaPrefix} onChange={t('proformaPrefix')} /></Field>
            </div>
            <Field label="When someone is placed, create a">
              <select className="select" value={tp.autoType || 'tax'} onChange={t('autoType')}>
                <option value="tax">Tax invoice (draft)</option>
                <option value="proforma">Proforma invoice (draft)</option>
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 22, margin: '14px 0' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!tp.showLogo} onChange={t('showLogo')} />Show logo</label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={!!tp.showBank} onChange={t('showBank')} />Show bank details</label>
            </div>
            <Field label="Terms"><textarea className="textarea" style={{ minHeight: 64 }} value={tp.terms} onChange={t('terms')} /></Field>
            <Field label="Footer line"><input className="input" value={tp.footer} onChange={t('footer')} /></Field>
            <button type="button" className="btn primary" style={{ marginTop: 16 }} disabled={saveTp.isPending} onClick={() => saveTp.mutate(tp)}>
              {saveTp.isPending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
