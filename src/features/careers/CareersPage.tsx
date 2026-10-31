import { useQuery } from '@tanstack/react-query';
import { Briefcase, Building, Clock, Loader2, MapPin, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { careersApi, type CareerJob } from '@/api/endpoints/careers';
import { errorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';

export const ago = (d: number) => (d < 1 ? 'Posted today' : d === 1 ? 'Posted yesterday' : `Posted ${d} days ago`);

const HOW = [
  ['Apply', 'Send your resume for a role. It takes about two minutes.'],
  ['Review', 'A recruiter reads your profile and gets back to you if it is a fit.'],
  ['Interview', 'Meet the hiring team, often over video, with an email invite and calendar link.'],
  ['Offer', 'We support you through the offer and joining.'],
];
const FAQ = [
  ['Can I apply to more than one role?', 'Yes. Apply to each role that interests you. We keep one profile for you.'],
  ['What happens to my resume?', 'It is used only for recruitment and shared with our client for roles you apply to. You can ask us to erase your data at any time.'],
  ['Which file types can I upload?', 'PDF, Word (DOCX), RTF or plain text.'],
  ['Will I hear back?', 'A recruiter contacts you when your profile matches a role.'],
];

export const careerMatches = (j: CareerJob, q: string, city: string) =>
  (!city || j.city === city) && (!q || `${j.title}${j.skills.join(' ')}${j.city}`.toLowerCase().includes(q.toLowerCase()));

export function CareersPage() {
  const { data: jobs, error } = useQuery({ queryKey: queryKeys.careers.jobs, queryFn: careersApi.jobs });
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), 80);
    return () => clearTimeout(t);
  }, [hash, jobs]);
  const cities = [...new Set((jobs ?? []).map((j) => j.city))];
  const list = (jobs ?? []).filter((j) => careerMatches(j, q, city));
  return (
    <>
      <section className="pub-hero">
        <h1>Find your next role</h1>
        <p>Roles with leading companies, matched to people by a team that actually reads your resume.</p>
        <div className="pub-search">
          <Search size={18} />
          <input placeholder="Search by title or skill…" aria-label="Search roles" value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Location" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All locations</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </section>
      <main className="pub-main" id="roles">
        {error ? (
          <div className="banner bad" role="alert">
            {errorMessage(error)}
          </div>
        ) : !jobs ? (
          <div className="empty">
            <Loader2 className="spin" color="var(--brand)" aria-label="Loading roles" />
          </div>
        ) : !list.length ? (
          <div className="empty">
            <Briefcase size={34} strokeWidth={1.4} />
            <b>No open roles right now</b>
            {jobs.length ? 'Try a different search.' : 'Please check back soon.'}
          </div>
        ) : (
          <div className="pub-grid">
            {list.map((j) => (
              <Link key={j.id} to={'/careers/' + j.id} className="pub-card">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  {j.industry && (
                    <span className="badge info">
                      <Building size={11} />
                      {j.industry}
                    </span>
                  )}
                  {j.remote && <span className="badge brand">Remote OK</span>}
                </div>
                <h3>{j.title}</h3>
                <div className="meta">
                  <span>
                    <MapPin size={14} />
                    {j.city}
                  </span>
                  <span>
                    <Briefcase size={14} />
                    {j.expMin}–{j.expMax} yrs
                  </span>
                  <span>
                    <Clock size={14} />
                    {ago(j.postedDays)}
                  </span>
                </div>
                <div style={{ marginTop: 10 }}>
                  {j.skills.slice(0, 5).map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <section className="pub-sec" id="how">
        <h2>How we hire</h2>
        <div className="pub-steps">
          {HOW.map(([t, d], i) => (
            <div key={t} className="pub-step">
              <span>{i + 1}</span>
              <b>{t}</b>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="pub-sec" id="faq">
        <h2>Frequently asked questions</h2>
        {FAQ.map(([question, a]) => (
          <details key={question} className="pub-faq">
            <summary>{question}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </>
  );
}
