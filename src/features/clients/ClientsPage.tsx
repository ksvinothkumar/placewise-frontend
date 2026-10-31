import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Client } from '@/api/endpoints/clients';
import { useClients } from '@/api/queries/jobs';
import { ClientForm } from '@/components/forms';
import { Avatar, PageHead, Skeleton } from '@/components/ui';
import { money } from '@/lib/format';
import { useCan } from '@/lib/permissions';

export function ClientsPage() {
  const { data, isLoading } = useClients();
  const canWrite = useCan('clients:write');
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  return (
    <>
      <PageHead title="Clients" sub="Accounts, fee agreements and revenue">
        {canWrite && (
          <button className="btn primary" onClick={() => setForm(true)}>
            <Plus size={16} />
            New client
          </button>
        )}
      </PageHead>
      {isLoading && !data ? (
        <div className="card">
          <Skeleton />
        </div>
      ) : (
        <div className="grid cols-2">
          {(data ?? []).map((c) => (
            <div className="card" key={c.id}>
              <div className="card-b">
                <div className="who">
                  <Avatar name={c.name} size={44} />
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 15 }}>{c.name}</b>
                    <span>
                      {c.industry} · {c.city}
                    </span>
                  </div>
                  <span className={'badge ' + (c.tier === 'Gold' ? 'warn' : 'brand')}>{c.tier}</span>
                  {canWrite && (
                    <button className="btn sm" style={{ marginLeft: 8 }} aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
                      Edit
                    </button>
                  )}
                </div>
                {(c.state || c.gstin || c.sez) && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {c.state && <span className="badge">{c.state}</span>}
                    {c.gstin && <span className="badge info">GSTIN {c.gstin}</span>}
                    {c.sez && <span className="badge warn">SEZ</span>}
                  </div>
                )}
                <div style={{ color: 'var(--text2)', fontSize: 13, margin: '12px 0' }}>
                  {c.contact} · {c.email}
                  {c.feePct != null && (
                    <>
                      {' '}
                      · Fee <b>{c.feePct}%</b>
                    </>
                  )}
                </div>
                <div
                  className="kv"
                  style={{
                    gridTemplateColumns: `repeat(${c.billed != null ? 4 : 2},1fr)`,
                    padding: '12px 0',
                    borderTop: '1px solid var(--line2)',
                    borderBottom: '1px solid var(--line2)',
                  }}
                >
                  <div>
                    <span>Open jobs</span>
                    <b>{c.openJobs}</b>
                  </div>
                  <div>
                    <span>Placements</span>
                    <b>{c.placements}</b>
                  </div>
                  {c.billed != null && (
                    <>
                      <div>
                        <span>Billed</span>
                        <b>{money(c.billed)}</b>
                      </div>
                      <div>
                        <span>Forecast</span>
                        <b>{money(c.forecast)}</b>
                      </div>
                    </>
                  )}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link className="btn sm" to={'/clients/' + c.id + '/report'} style={{ marginRight: 6 }}>
                    Weekly report
                  </Link>
                  {(c.jobs ?? []).map((j) => (
                    <Link key={j.id} to={'/jobs/' + j.id} className="chip">
                      {j.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {form && <ClientForm onClose={() => setForm(false)} />}
      {editing && <ClientForm client={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
