import { ArrowLeft, BadgeCheck, Building2, CalendarClock, Factory, Globe, Loader2, Mail, MapPin, Pencil, Phone, Plus, Trash2, X as XIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { crmApi, type Contact } from '@/api/endpoints/crm';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { ActivityFeed } from '@/components/business/ActivityFeed';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { fromLocalInput, toLocalInput } from '@/lib/dates';
import { useCan } from '@/lib/permissions';
import { toast } from '@/stores/ui.store';
import { CompanyForm, ContactForm } from './CrmForms';
import { crmKeys, useCompany, useCrmStages, useSetCompanyStage } from './useCrm';

export function CompanyDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const w = useCan('crm:write');
  const canClient = useCan('clients:write');
  const { data: c, isLoading, isError } = useCompany(id);
  const stages = useCrmStages();
  const [edit, setEdit] = useState(false);
  const [ct, setCt] = useState<{ contact?: Contact } | null>(null);
  const setStage = useSetCompanyStage();
  const refresh = [crmKeys.all];
  const convert = useApiMutation(() => crmApi.convert(id), {
    invalidate: refresh,
    onSuccess: () => {
      toast('Client created');
      nav('/clients');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const del = useApiMutation(() => crmApi.deleteCompany(id), {
    invalidate: refresh,
    onSuccess: () => {
      toast('Company deleted');
      nav('/crm');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const follow = useApiMutation((v: string) => crmApi.updateCompany(id, { nextFollowUp: fromLocalInput(v) }), { invalidate: refresh, onError: (e) => toast(errorMessage(e), 'error') });

  if (isLoading) return <div className="card"><Skeleton rows={9} /></div>;
  if (isError || !c) return <EmptyState title="Company not found" />;
  const cur = stages.company.find((s) => s.name === c.stage);
  const won = cur?.kind === 'won';
  const followValue = toLocalInput(c.nextFollowUp);
  return (
    <>
      <Link to="/crm" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--text2)', marginBottom: 14 }}>
        <ArrowLeft size={15} />
        Leads & CRM
      </Link>
      <div className="card">
        <div className="card-b" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar name={c.name} size={56} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ fontSize: 22, letterSpacing: '-.02em' }}>{c.name}</h1>
            <div style={{ color: 'var(--text2)', display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4, fontSize: 13.5 }}>
              {c.industry && (
                <span>
                  <Factory size={14} style={{ verticalAlign: -2 }} /> {c.industry}
                </span>
              )}
              {c.city && (
                <span>
                  <MapPin size={14} style={{ verticalAlign: -2 }} /> {c.city}
                </span>
              )}
              {c.website && (
                <a href={c.website.startsWith('http') ? c.website : 'https://' + c.website} target="_blank" rel="noreferrer">
                  <Globe size={14} style={{ verticalAlign: -2 }} /> {c.website}
                </a>
              )}
              {c.dealValue ? <b>₹{c.dealValue}L expected</b> : null}
              <span>Owner: {c.owner?.name}</span>
            </div>
          </div>
          <select className="select" aria-label="Stage" style={{ width: 170, fontWeight: 600, color: cur?.color }} value={c.stage} disabled={!w} onChange={(e) => setStage.mutate({ id, stage: e.target.value })}>
            {stages.company.map((s) => (
              <option key={s.key ?? s.name}>{s.name}</option>
            ))}
          </select>
          {c.convertedClient ? (
            <Link className="btn" to="/clients">
              <BadgeCheck size={15} color="var(--good)" />
              Client: {c.convertedClient.name}
            </Link>
          ) : (
            w &&
            canClient && (
              <button
                className={'btn ' + (won ? 'primary' : '')}
                disabled={convert.isPending}
                onClick={() => {
                  if (confirm(`Create a client record for ${c.name}? You can then add jobs and invoices for them.`)) convert.mutate();
                }}
              >
                {convert.isPending ? <Loader2 size={15} className="spin" /> : <Building2 size={15} />}
                Convert to client
              </button>
            )
          )}
          {w && (
            <>
              <button className="btn" onClick={() => setEdit(true)}>
                <Pencil size={15} />
                Edit
              </button>
              <button
                className="btn danger"
                aria-label="Delete company"
                onClick={() => {
                  if (confirm(`Delete ${c.name}, its contacts and all notes? This cannot be undone.`)) del.mutate();
                }}
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="grid cols-3" style={{ marginTop: 18, alignItems: 'start' }}>
        <ActivityFeed entityType="company" entityId={id} title="Activity & comments" canLog={w} />
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="card">
            <div className="card-h">
              <CalendarClock size={17} color="var(--warn)" />
              <h3>Next follow-up</h3>
            </div>
            <div className="card-b">
              <input
                className="input"
                type="datetime-local"
                aria-label="Next follow-up"
                disabled={!w}
                defaultValue={followValue}
                key={c.nextFollowUp ?? 'none'}
                onBlur={(e) => {
                  if (e.target.value !== followValue) follow.mutate(e.target.value);
                }}
              />
              <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 8 }}>
                {c.followUpNote ? `"${c.followUpNote}" · ` : ''}You'll get a notification and an email when it's due.
                {c.nextFollowUp && new Date(c.nextFollowUp) < new Date() && <b style={{ color: 'var(--bad)' }}> Overdue.</b>}
              </div>
              {c.nextFollowUp && w && (
                <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={() => follow.mutate('')}>
                  <XIcon size={13} />
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>Contacts</h3>
              <small>{c.contactList.length}</small>
              {w && (
                <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => setCt({})}>
                  <Plus size={13} />
                  Add
                </button>
              )}
            </div>
            <div className="card-b">
              {c.contactList.length ? (
                c.contactList.map((x) => (
                  <div key={x.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line2)', alignItems: 'center' }}>
                    <Avatar name={x.name} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{x.name}</b>
                      {x.isPrimary && (
                        <span className="badge brand" style={{ marginLeft: 6 }}>
                          Primary
                        </span>
                      )}
                      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{x.title}</div>
                      <div style={{ fontSize: 12.5, display: 'flex', gap: 10 }}>
                        {x.email && (
                          <a href={'mailto:' + x.email}>
                            <Mail size={12} /> {x.email}
                          </a>
                        )}
                        {x.phone && (
                          <a href={'tel:' + x.phone.replace(/\s/g, '')}>
                            <Phone size={12} /> {x.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <span className="badge" style={{ color: stages.contact.find((s) => s.name === x.stage)?.color }}>
                      {x.stage}
                    </span>
                    {w && (
                      <button className="btn sm ghost" aria-label={`Edit ${x.name}`} onClick={() => setCt({ contact: x })}>
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>No contacts yet. Add the person you speak to.</div>
              )}
            </div>
          </div>
          {c.notes && (
            <div className="card">
              <div className="card-h">
                <h3>Notes</h3>
              </div>
              <div className="card-b" style={{ whiteSpace: 'pre-wrap', color: 'var(--text2)' }}>
                {c.notes}
              </div>
            </div>
          )}
        </div>
      </div>
      {edit && <CompanyForm company={c} stages={stages.company} onClose={() => setEdit(false)} />}
      {ct && <ContactForm contact={ct.contact} companyId={id} stages={stages.contact} onClose={() => setCt(null)} />}
    </>
  );
}
