import { Paginated } from '@/components/ui/Paginated';
import { useQuery } from '@tanstack/react-query';
import { AlarmClock, Building2, CalendarClock, LayoutGrid, List, Plus, Search, TrendingUp, Trophy, Users2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crmApi, type Contact } from '@/api/endpoints/crm';
import type { TeamMember } from '@/api/endpoints/notes';
import { errorMessage } from '@/api/errors';
import { useApiMutation, useApiQuery } from '@/api/hooks';
import { Kanban } from '@/components/Kanban';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kpi, PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtDate } from '@/lib/format';
import { useCan } from '@/lib/permissions';
import { toast } from '@/stores/ui.store';
import { CompanyForm, ContactForm } from './CrmForms';
import { crmKeys, useCompanies, useCrmStages, useSetCompanyStage } from './useCrm';

const when = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const colorOf = (list: { name: string; color: string }[], n: string) => list.find((s) => s.name === n)?.color || '#64748b';
const Dot = ({ c }: { c: string }) => <i className="dot" style={{ color: c }} />;

export function CrmPage() {
  const nav = useNavigate();
  const w = useCan('crm:write');
  const [tab, setTab] = useState<'companies' | 'contacts'>('companies');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState('');
  const [form, setForm] = useState<{ type: 'company' } | { type: 'contact'; contact?: Contact } | null>(null);
  const stages = useCrmStages();
  const sum = useQuery({ queryKey: crmKeys.summary, queryFn: crmApi.summary });
  const filters = { q, owner };
  const comps = useCompanies(filters);
  const contacts = useQuery({ queryKey: crmKeys.contacts(filters), queryFn: () => crmApi.contacts(filters) });
  const team = useApiQuery<TeamMember[]>('/chat/users');
  const setStage = useSetCompanyStage(crmKeys.companies(filters));
  const setContactStage = useApiMutation((v: { id: string; stage: string }) => crmApi.setContactStage(v.id, v.stage), {
    invalidate: [crmKeys.all],
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const s = sum.data;
  const list = comps.data ?? [];

  return (
    <>
      <PageHead title="Leads & CRM" sub="Win new clients: track companies and contacts from first lead to onboarding">
        {w &&
          (tab === 'companies' ? (
            <button className="btn primary" onClick={() => setForm({ type: 'company' })}>
              <Plus size={16} />
              New lead
            </button>
          ) : (
            <button className="btn primary" onClick={() => setForm({ type: 'contact' })}>
              <Plus size={16} />
              New contact
            </button>
          ))}
      </PageHead>
      {s && (
        <div className="grid kpis" style={{ marginBottom: 18 }}>
          <Kpi icon={Building2} label="Open leads" value={s.open} sub="in your pipeline" />
          <Kpi icon={TrendingUp} label="Pipeline value" value={'₹' + s.pipelineValue.toLocaleString('en-IN') + 'L'} sub="expected annual fees" tone="info" />
          <Kpi icon={AlarmClock} label="Follow-ups due" value={s.overdue + s.today} sub={`${s.overdue} overdue · ${s.today} today`} tone="warn" />
          <Kpi icon={Trophy} label="Won this month" value={s.wonThisMonth} sub="new clients" tone="good" />
        </div>
      )}
      <div className="card">
        <div className="toolbar">
          <div className="seg">
            {(
              [
                ['companies', 'Companies', Building2],
                ['contacts', 'Contacts', Users2],
              ] as const
            ).map(([k, l, I]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                <I size={14} />
                {l}
              </button>
            ))}
          </div>
          {tab === 'companies' && (
            <div className="seg">
              {(
                [
                  ['board', 'Board', LayoutGrid],
                  ['list', 'List', List],
                ] as const
              ).map(([k, l, I]) => (
                <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>
                  <I size={14} />
                  {l}
                </button>
              ))}
            </div>
          )}
          <div className="search">
            <Search size={16} />
            <input className="input" aria-label="Search" placeholder={tab === 'companies' ? 'Search companies…' : 'Search contacts…'} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" aria-label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">Everyone</option>
            {(team.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ padding: tab === 'companies' && view === 'board' ? 16 : 0 }}>
          {tab === 'companies' && view === 'board' ? (
            comps.isLoading ? (
              <Skeleton rows={5} />
            ) : (
              <Kanban
                disabled={!w}
                lanes={stages.company.map((st) => {
                  const col = list.filter((c) => c.stage === st.name);
                  const val = col.reduce((t, c) => t + (c.dealValue || 0), 0);
                  return {
                    id: st.name,
                    items: col,
                    header: (
                      <>
                        <Dot c={st.color} />
                        {st.name}
                        <span className="n">{col.length}</span>
                      </>
                    ),
                    sub: val > 0 ? <div style={{ fontSize: 12, color: 'var(--muted)', margin: '-6px 4px 8px' }}>₹{val.toLocaleString('en-IN')}L</div> : undefined,
                  };
                })}
                getId={(c) => c.id}
                getLabel={(c) => `${c.name}, ${c.stage}`}
                onOpen={(c) => nav('/crm/companies/' + c.id)}
                onMove={(id, _f, stage) => setStage.mutate({ id, stage })}
                renderCard={(c) => (
                  <>
                    <div className="t">{c.name}</div>
                    <div className="s">{[c.industry, c.city].filter(Boolean).join(' · ') || 'No details yet'}</div>
                    <div className="f">
                      {c.dealValue ? <b>₹{c.dealValue}L</b> : null}
                      {(c.contacts ?? 0) > 0 && (
                        <span>
                          {c.contacts} contact{(c.contacts ?? 0) > 1 ? 's' : ''}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto' }}>{c.owner?.name?.split(' ')[0]}</span>
                    </div>
                    {c.nextFollowUp && (
                      <div style={{ marginTop: 8 }}>
                        <span className={'badge ' + (c.followUpOverdue ? 'bad' : '')}>
                          <CalendarClock size={11} />
                          {c.followUpOverdue ? 'Overdue ' : ''}
                          {when(c.nextFollowUp)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              />
            )
          ) : tab === 'companies' ? (
            comps.isLoading ? (
              <Skeleton />
            ) : list.length ? (
              <Paginated items={list} render={(pageRows, from) => (
              <table className="table">
                <thead>
                  <tr><th className="sn">#</th>
                    <th>Company</th>
                    <th>Stage</th>
                    <th>Owner</th>
                    <th>Value</th>
                    <th>Contacts</th>
                    <th>Next follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c, n) => (
                    <tr key={c.id} className="click" onClick={() => nav('/crm/companies/' + c.id)}><td className="sn">{from + n + 1}</td>
                      <td>
                        <b>{c.name}</b>
                        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{[c.industry, c.city].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td>
                        <span className="badge" style={{ color: colorOf(stages.company, c.stage), background: colorOf(stages.company, c.stage) + '1a', borderColor: 'transparent' }}>
                          <Dot c={colorOf(stages.company, c.stage)} />
                          {c.stage}
                        </span>
                      </td>
                      <td>{c.owner?.name}</td>
                      <td>{c.dealValue ? '₹' + c.dealValue + 'L' : '—'}</td>
                      <td>{c.contacts}</td>
                      <td>{c.nextFollowUp ? <span className={'badge ' + (c.followUpOverdue ? 'bad' : '')}>{fmtDate(c.nextFollowUp)}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )} />
            ) : (
              <EmptyState icon={Building2} title="No leads yet" sub="Add the first company you want to win." />
            )
          ) : contacts.isLoading ? (
            <Skeleton />
          ) : contacts.data?.length ? (
            <Paginated items={contacts.data} render={(pageRows, from) => (
            <table className="table">
              <thead>
                <tr><th className="sn">#</th>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Next follow-up</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c, n) => (
                  <tr key={c.id}><td className="sn">{from + n + 1}</td>
                    <td>
                      <div className="who">
                        <Avatar name={c.name} size={34} />
                        <div>
                          <b>
                            {c.name}
                            {c.isPrimary && (
                              <span className="badge brand" style={{ marginLeft: 6 }}>
                                Primary
                              </span>
                            )}
                          </b>
                          <span>{[c.title, c.email].filter(Boolean).join(' · ')}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.company ? (
                        <a
                          href={'/crm/companies/' + c.company.id}
                          onClick={(e) => {
                            e.preventDefault();
                            nav('/crm/companies/' + c.company!.id);
                          }}
                        >
                          {c.company.name}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <select className="select" aria-label={`Stage for ${c.name}`} style={{ width: 150, padding: '4px 8px' }} value={c.stage} disabled={!w} onChange={(e) => setContactStage.mutate({ id: c.id, stage: e.target.value })}>
                        {stages.contact.map((x) => (
                          <option key={x.key ?? x.name}>{x.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>{c.owner?.name}</td>
                    <td>{c.nextFollowUp ? <span className={'badge ' + (c.followUpOverdue ? 'bad' : '')}>{fmtDate(c.nextFollowUp)}</span> : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {w && (
                        <button className="btn sm" onClick={() => setForm({ type: 'contact', contact: c })}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )} />
          ) : (
            <EmptyState icon={Users2} title="No contacts yet" sub="Add the people you talk to at each company." />
          )}
        </div>
      </div>
      {form?.type === 'company' && <CompanyForm stages={stages.company} onClose={() => setForm(null)} onSaved={(c) => nav('/crm/companies/' + c.id)} />}
      {form?.type === 'contact' && <ContactForm stages={stages.contact} contact={form.contact} onClose={() => setForm(null)} />}
    </>
  );
}
