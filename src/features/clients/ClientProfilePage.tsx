import { Paginated } from '@/components/ui/Paginated';
import { ArrowLeft, Building2, FileText, Globe, Mail, MapPin, Pencil, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useClient } from '@/api/queries/jobs';
import { ClientForm } from '@/components/forms';
import { ClientLogo, Empty, Skeleton } from '@/components/ui';
import { money } from '@/lib/format';
import { useCan } from '@/lib/permissions';

const row = { display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text2)', fontSize: 13.5 } as const;

/** One company: logo, contact, fee agreement, GST details and its jobs. */
export function ClientProfilePage() {
  const { id = '' } = useParams();
  const { data: c, isLoading, error } = useClient(id);
  const canWrite = useCan('clients:write');
  const [editing, setEditing] = useState(false);

  if (isLoading && !c)
    return (
      <div className="card">
        <Skeleton rows={9} />
      </div>
    );
  if (error || !c) return <Empty title="Client not found" />;
  const site = c.website ? c.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  return (
    <>
      <Link to="/clients" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--text2)', marginBottom: 14 }}>
        <ArrowLeft size={15} />
        All clients
      </Link>
      <div className="card">
        <div className="card-b" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <ClientLogo name={c.name} logo={c.logo} size={88} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 24, letterSpacing: '-.02em' }}>{c.name}</h1>
              {c.tier && <span className={'badge ' + (c.tier === 'Gold' ? 'warn' : 'brand')}>{c.tier}</span>}
              {c.sez && <span className="badge warn">SEZ</span>}
            </div>
            <div style={{ ...row, gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
              {c.industry && (
                <span style={row}>
                  <Building2 size={14} />
                  {c.industry}
                </span>
              )}
              {c.city && (
                <span style={row}>
                  <MapPin size={14} />
                  {c.city}
                  {c.state && `, ${c.state}`}
                </span>
              )}
              {site && (
                <a style={row} href={c.website} target="_blank" rel="noopener noreferrer">
                  <Globe size={14} />
                  {site}
                </a>
              )}
            </div>
            {c.about && <p style={{ color: 'var(--text2)', marginTop: 10, maxWidth: 640 }}>{c.about}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="btn" to={'/clients/' + c.id + '/report'}>
              <FileText size={15} />
              Weekly report
            </Link>
            {canWrite && (
              <button className="btn primary" onClick={() => setEditing(true)}>
                <Pencil size={15} />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid kpis" style={{ marginTop: 18 }}>
        <Stat label="Open jobs" value={c.openJobs ?? 0} />
        <Stat label="Placements" value={c.placements ?? 0} />
        {c.billed != null && <Stat label="Billed" value={money(c.billed)} />}
        {c.forecast != null && <Stat label="Forecast" value={money(c.forecast)} />}
      </div>

      <div className="grid cols-3" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-h">
            <h3>Jobs</h3>
            <small>{c.jobs?.length ?? 0} total</small>
          </div>
          {c.jobs?.length ? (
            <Paginated items={c.jobs} render={(pageRows) => (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link to={'/jobs/' + j.id}>
                        <b>{j.title}</b>
                      </Link>
                    </td>
                    <td>{j.status && <span className={'badge ' + (j.status === 'open' ? 'good' : '')}>{j.status}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )} />
          ) : (
            <Empty title="No jobs for this client yet" />
          )}
        </div>
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div className="card">
            <div className="card-h">
              <h3>Contact</h3>
            </div>
            <div className="card-b" style={{ display: 'grid', gap: 10 }}>
              {c.contact && (
                <span style={row}>
                  <User size={14} />
                  {c.contact}
                </span>
              )}
              {c.email && (
                <a style={row} href={'mailto:' + c.email}>
                  <Mail size={14} />
                  {c.email}
                </a>
              )}
              {!c.contact && !c.email && <span style={{ color: 'var(--muted)' }}>No contact added</span>}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>Commercial terms</h3>
            </div>
            <div className="card-b kv">
              {c.feePct != null && (
                <div>
                  <span>Fee</span>
                  <b>{c.feePct}% of CTC</b>
                </div>
              )}
              <div>
                <span>Guarantee</span>
                <b>{c.guaranteeDays ?? 90} days</b>
              </div>
              <div>
                <span>Payment terms</span>
                <b>{c.paymentTermsDays ?? 30} days</b>
              </div>
              {c.sez && (
                <div>
                  <span>SEZ invoicing</span>
                  <b>{c.sezMode === 'igst' ? 'Charge IGST' : 'Zero-rated (LUT)'}</b>
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>GST &amp; billing</h3>
            </div>
            <div className="card-b" style={{ display: 'grid', gap: 6, fontSize: 13.5 }}>
              {c.gstin ? <span className="badge info" style={{ justifySelf: 'start' }}>GSTIN {c.gstin}</span> : <span style={{ color: 'var(--muted)' }}>No GSTIN added</span>}
              {(c.address || c.pincode) && <span style={{ color: 'var(--text2)' }}>{[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ')}</span>}
            </div>
          </div>
        </div>
      </div>
      {editing && <ClientForm client={c} onClose={() => setEditing(false)} />}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="card-b kv" style={{ gridTemplateColumns: '1fr' }}>
        <div>
          <span>{label}</span>
          <b style={{ fontSize: 22 }}>{value}</b>
        </div>
      </div>
    </div>
  );
}
