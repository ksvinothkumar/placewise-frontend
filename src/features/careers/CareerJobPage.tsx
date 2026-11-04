import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, CheckCircle2, Clock, Loader2, MapPin, UploadCloud } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { careersApi } from '@/api/endpoints/careers';
import { errorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { ago } from './CareersPage';
import { company } from './company';
import { CHANNELS, jobLink, jobPostingJsonLd, shareHref, sourceOf } from './jobPosting';
import { useHead } from './useHead';

const MAX_RESUME = 5 * 1024 * 1024; // the API rejects bigger files
const RESUME_EXT = /\.(pdf|docx|txt|rtf)$/i;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ApplyForm {
  name: string;
  email: string;
  phone: string;
  city: string;
  exp: string;
  message: string;
  consent: boolean;
  /** honeypot: invisible to people, bots fill it in */
  website: string;
}

/** First problem with the application, or '' when it can be sent. Exported for tests. */
export function applyProblem(f: ApplyForm, file: File | null): string {
  if (f.name.trim().length < 2) return 'Please enter your full name';
  if (!EMAIL_RX.test(f.email.trim())) return 'Please enter a valid email address';
  if (f.exp !== '' && (+f.exp < 0 || +f.exp > 50)) return 'Years of experience must be between 0 and 50';
  if (file && !RESUME_EXT.test(file.name)) return 'Resume must be a PDF, DOCX, RTF or TXT file';
  if (file && file.size > MAX_RESUME) return 'Resume must be 5 MB or smaller';
  if (!f.consent) return 'Please tick the consent box to apply';
  return '';
}

export function CareerJobPage() {
  const { id = '' } = useParams();
  const { search } = useLocation();
  const source = sourceOf(search);
  const { data: job, error } = useQuery({ queryKey: queryKeys.careers.job(id), queryFn: () => careersApi.job(id), retry: false });
  const [f, setF] = useState<ApplyForm>({ name: '', email: '', phone: '', city: '', exp: '', message: '', consent: false, website: '' });
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  useHead({
    title: job ? `${job.title} · ${job.city} · ${company.name}` : `Careers at ${company.name}`,
    description: job ? `${job.title} in ${job.city}. ${job.description}`.slice(0, 155) : undefined,
    jsonLd: job ? jobPostingJsonLd(job) : undefined,
  });
  const [copied, setCopied] = useState(false);
  const m = useMutation({ mutationFn: (fd: FormData) => careersApi.apply(id, fd) });

  const set = (k: keyof ApplyForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = applyProblem(f, file);
    if (problem) return setMsg(problem);
    setMsg('');
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, String(v)));
    if (source) fd.append('source', source);
    if (file) fd.append('resume', file);
    try {
      await m.mutateAsync(fd);
      setDone(true);
    } catch (x) {
      setMsg(errorMessage(x));
    }
  };

  if (error)
    return (
      <main className="pub-main">
        <Link to="/careers" className="back">
          <ArrowLeft size={15} />
          All roles
        </Link>
        <div className="empty">
          <b>{errorMessage(error)}</b>This role may have been filled.
        </div>
      </main>
    );
  if (!job)
    return (
      <main className="pub-main">
        <div className="empty">
          <Loader2 className="spin" color="var(--brand)" aria-label="Loading role" />
        </div>
      </main>
    );
  return (
    <main className="pub-main">
      <Link to="/careers" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--text2)', marginBottom: 16 }}>
        <ArrowLeft size={15} />
        All roles
      </Link>
      <div className="pub-job">
        <div>
          <div style={{ display: 'flex', gap: 8 }}>
            {job.industry && <span className="badge info">{job.industry}</span>}
            {job.remote && <span className="badge brand">Remote OK</span>}
          </div>
          <h1 style={{ fontSize: 30, letterSpacing: '-.02em', margin: '8px 0' }}>{job.title}</h1>
          <div className="meta" style={{ display: 'flex', gap: 18, color: 'var(--text2)', flexWrap: 'wrap' }}>
            <span>
              <MapPin size={15} /> {job.city}
            </span>
            <span>
              <Briefcase size={15} /> {job.expMin}–{job.expMax} years
            </span>
            <span>
              <Clock size={15} /> {ago(job.postedDays)}
            </span>
          </div>
          <div className="pub-share" aria-label="Share this role">
            <span>Share</span>
            {CHANNELS.map((c) => (
              <a key={c.id} href={shareHref(c.id, job)} target="_blank" rel="noreferrer" className="btn sm">
                {c.label}
              </a>
            ))}
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                void navigator.clipboard?.writeText(jobLink(job.id, 'copy')).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied ? 'Link copied' : 'Copy link'}
            </button>
          </div>
          <h3 style={{ margin: '26px 0 8px' }}>About the role</h3>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text2)', lineHeight: 1.7 }}>{job.description || 'Our team will share full details when you apply.'}</div>
          <h3 style={{ margin: '24px 0 8px' }}>Skills we're looking for</h3>
          <div>
            {job.skills.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="card pub-apply">
          {done ? (
            <div className="card-b" style={{ textAlign: 'center', padding: 34 }} role="status">
              <CheckCircle2 size={44} color="var(--good)" />
              <h3 style={{ margin: '10px 0 4px', fontSize: 18 }}>Application received</h3>
              <p style={{ color: 'var(--text2)' }}>Thank you, {f.name.split(' ')[0]}. Our team will review your profile and get in touch if it's a match.</p>
              <Link className="btn" to="/careers" style={{ marginTop: 14 }}>
                See other roles
              </Link>
            </div>
          ) : (
            <form className="card-b" onSubmit={submit} noValidate>
              <h3 style={{ fontSize: 17, marginBottom: 4 }}>Apply for this role</h3>
              <label className="field">
                <span>Full name *</span>
                <input className="input" required aria-required="true" autoComplete="name" value={f.name} onChange={set('name')} />
              </label>
              <label className="field">
                <span>Email *</span>
                <input className="input" type="email" required aria-required="true" autoComplete="email" value={f.email} onChange={set('email')} />
              </label>
              <div className="f2">
                <label className="field">
                  <span>Phone</span>
                  <input className="input" autoComplete="tel" value={f.phone} onChange={set('phone')} />
                </label>
                <label className="field">
                  <span>City</span>
                  <input className="input" value={f.city} onChange={set('city')} />
                </label>
              </div>
              <label className="field">
                <span>Years of experience</span>
                <input className="input" type="number" min="0" max="50" value={f.exp} onChange={set('exp')} />
              </label>
              <div className="field">
                <span id="resume-label">Resume (PDF, DOCX or TXT)</span>
                <label className="dropzone" style={{ display: 'block', padding: 16, marginTop: 0 }}>
                  <input type="file" hidden aria-labelledby="resume-label" accept=".pdf,.docx,.txt,.rtf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <UploadCloud size={20} color="var(--brand)" /> {file ? <b>{file.name}</b> : <span>Click to upload</span>}
                </label>
              </div>
              <label className="field">
                <span>Anything we should know? (optional)</span>
                <textarea className="textarea" style={{ minHeight: 70 }} maxLength={1000} value={f.message} onChange={set('message')} />
              </label>
              {/* honeypot: hidden from people and assistive tech; bots that fill it are silently dropped by the API */}
              <input
                name="website"
                data-testid="hp-website"
                tabIndex={-1}
                autoComplete="off"
                value={f.website}
                onChange={set('website')}
                style={{ position: 'absolute', left: -9999, opacity: 0 }}
                aria-hidden="true"
              />
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14, fontSize: 13, color: 'var(--text2)' }}>
                <input type="checkbox" required aria-required="true" checked={f.consent} onChange={set('consent')} style={{ marginTop: 3 }} />I agree that Placewise may
                store my details and share them with the hiring company for this and similar roles.
              </label>
              {msg && (
                <div className="banner bad" role="alert">
                  {msg}
                </div>
              )}
              <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: 11 }} disabled={m.isPending}>
                {m.isPending && <Loader2 size={16} className="spin" />}Submit application
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
