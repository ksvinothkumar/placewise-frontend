import { ExternalLink, FileText, Globe, Info, Loader2, Search, Wand2 } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sourcingApi, type BooleanResult } from '@/api/endpoints/sourcing';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { useJobs } from '@/api/queries/jobs';
import { CandidatePhoto, Chips, Empty, Field, PageHead } from '@/components/ui';
import { toast } from '@/stores/ui.store';

const EXAMPLES = [
  'react AND node NOT intern',
  'skill:python AND (django OR flask) AND exp>=4',
  '"product manager" AND city:Chennai',
  'title:accountant AND notice<=30 -fresher',
];
const SITES: Record<string, [string, string]> = {
  linkedin: ['LinkedIn profiles', 'site:linkedin.com/in'],
  github: ['GitHub', 'site:github.com'],
  naukri: ['Naukri resumes', 'site:naukri.com'],
  resume: ['Public resumes (PDF)', 'filetype:pdf'],
};
const quoted = (s: string) => (/\s/.test(s) ? `"${s}"` : s);
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

interface XRayFields {
  site: string;
  title: string;
  must: string;
  any: string;
  not: string;
  city: string;
}

/** Google X-Ray string for the builder form. Exported for tests. */
export function xrayString(f: XRayFields): string {
  const parts = [
    SITES[f.site]?.[1],
    f.title && `(${list(f.title).map(quoted).join(' OR ')})`,
    ...list(f.must).map(quoted),
    list(f.any).length && `(${list(f.any).map(quoted).join(' OR ')})`,
    f.city && quoted(f.city.trim()),
    ...list(f.not).map((x) => '-' + quoted(x)),
  ].filter(Boolean);
  return parts.join(' ');
}

export function SourcingPage() {
  const [tab, setTab] = useState<'pool' | 'xray'>('pool');
  const tabs = [
    ['pool', 'Search talent pool', Search],
    ['xray', 'X-Ray web search', Globe],
  ] as const;
  return (
    <>
      <PageHead title="Sourcing" sub="Find people in your talent pool with Boolean search, or build search strings for the open web." />
      <div className="tabs" role="tablist" style={{ marginBottom: 16 }}>
        {tabs.map(([k, l, I]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <I size={15} style={{ verticalAlign: -3, marginRight: 6 }} />
            {l}
          </button>
        ))}
      </div>
      {tab === 'pool' ? <Pool /> : <XRay />}
    </>
  );
}

function Pool() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<BooleanResult | null>(null);
  const [err, setErr] = useState('');
  const m = useApiMutation((text: string) => sourcingApi.boolean(text), {
    onSuccess: (r) => {
      setRes(r);
      setErr('');
    },
    onError: (e) => {
      setRes(null);
      setErr(errorMessage(e));
    },
  });
  const run = (text = q) => m.mutate(text);
  const busy = m.isPending;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card">
        <div className="card-b">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (q.trim()) run();
            }}
            style={{ display: 'flex', gap: 10 }}
          >
            <input
              className="input"
              style={{ flex: 1 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. react AND (node OR express) NOT intern AND exp>=3"
              aria-label="Boolean search"
            />
            <button className="btn primary" disabled={busy || !q.trim()}>
              {busy ? <Loader2 size={15} className="spin" /> : <Search size={15} />}Search
            </button>
          </form>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
            <small style={{ color: 'var(--muted)' }}>Try:</small>
            {EXAMPLES.map((x) => (
              <button
                key={x}
                className="chip"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setQ(x);
                  run(x);
                }}
              >
                {x}
              </button>
            ))}
          </div>
          <div className="banner" style={{ marginTop: 14 }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <b>AND</b>, <b>OR</b>, <b>NOT</b> (or a leading <b>-</b>), brackets, "exact phrases". Filters: <code>skill:</code> <code>title:</code> <code>company:</code>{' '}
              <code>city:</code> <code>tag:</code> <code>name:</code> and numbers <code>exp&gt;=5</code> <code>ctc&lt;=30</code> <code>notice&lt;=30</code>. Words without a
              filter are searched across the profile and the resume text.
            </div>
          </div>
        </div>
      </div>
      {err && (
        <div className="banner" role="alert" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>
          {err}
        </div>
      )}
      {res && (
        <div className="card">
          <div className="card-h">
            <h3>
              {res.total} {res.total === 1 ? 'match' : 'matches'}
            </h3>
            {res.total > res.results.length && <small>Showing the best {res.results.length}</small>}
          </div>
          {!res.results.length ? (
            <Empty title="No one matches" sub="Try fewer terms, or use OR to widen the search." />
          ) : (
            <div>
              {res.results.map((c) => (
                <Link
                  key={c.id}
                  to={'/candidates/' + c.id}
                  style={{ display: 'flex', gap: 14, padding: '14px 18px', borderTop: '1px solid var(--line)', color: 'inherit', textDecoration: 'none' }}
                >
                  <CandidatePhoto c={c} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <b>{c.name}</b>
                      <small style={{ color: 'var(--muted)' }}>{[c.title, c.company, c.city].filter(Boolean).join(' · ')}</small>
                      {c.hasResume && <FileText size={13} color="var(--muted)" aria-label="Has resume" />}
                    </div>
                    <div style={{ margin: '6px 0' }}>
                      <Chips items={c.skills} hit={c.matched} max={10} />
                    </div>
                    {c.snippet && <small style={{ color: 'var(--muted)', display: 'block' }}>{c.snippet}</small>}
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div>{c.exp} yrs</div>
                    <small style={{ color: 'var(--muted)' }}>Notice {c.notice}d</small>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function XRay() {
  const jobs = useJobs('open');
  const [f, setF] = useState<XRayFields>({ site: 'linkedin', title: '', must: '', any: '', not: '', city: '' });
  const set = (k: keyof XRayFields) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const str = xrayString(f);
  const url = 'https://www.google.com/search?q=' + encodeURIComponent(str);
  const fromJob = (id: string) => {
    const j = (jobs.data ?? []).find((x) => x.id === id);
    if (j) setF((p) => ({ ...p, title: j.title, must: (j.skills || []).slice(0, 3).join(', '), any: (j.skills || []).slice(3, 8).join(', '), city: j.city || '' }));
  };
  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', alignItems: 'start' }}>
      <div className="card">
        <div className="card-h">
          <h3>Build a search</h3>
        </div>
        <div className="card-b" style={{ display: 'grid', gap: 12 }}>
          <Field label="Start from an open job">
            <select className="input" defaultValue="" onChange={(e) => fromJob(e.target.value)}>
              <option value="">— choose a job to fill the fields —</option>
              {(jobs.data ?? []).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Where to look">
            <select className="input" value={f.site} onChange={set('site')}>
              {Object.entries(SITES).map(([k, [l]]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Job titles (any of, comma separated)">
            <input className="input" value={f.title} onChange={set('title')} placeholder="Java developer, backend engineer" />
          </Field>
          <Field label="Must have (all of)">
            <input className="input" value={f.must} onChange={set('must')} placeholder="spring boot, microservices" />
          </Field>
          <Field label="Nice to have (any of)">
            <input className="input" value={f.any} onChange={set('any')} placeholder="kafka, aws, docker" />
          </Field>
          <Field label="Location">
            <input className="input" value={f.city} onChange={set('city')} placeholder="Chennai" />
          </Field>
          <Field label="Leave out">
            <input className="input" value={f.not} onChange={set('not')} placeholder="intern, trainee" />
          </Field>
        </div>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>
            <Wand2 size={15} style={{ verticalAlign: -2 }} /> Your search string
          </h3>
        </div>
        <div className="card-b" style={{ display: 'grid', gap: 12 }}>
          <textarea className="input" readOnly rows={5} value={str} aria-label="Search string" style={{ fontFamily: 'ui-monospace,monospace' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              onClick={() => {
                void navigator.clipboard?.writeText(str);
                toast('Copied to clipboard');
              }}
            >
              Copy
            </button>
            <a className="btn primary" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              Open in Google
            </a>
          </div>
          <small style={{ color: 'var(--muted)' }}>
            This opens a normal Google search in a new tab. Placewise does not scrape any site. Only use what you find in line with that site's terms and your
            candidates' privacy.
          </small>
        </div>
      </div>
    </div>
  );
}
