import { Pager } from '@/components/ui/Paginated';
import { useQueryClient } from '@tanstack/react-query';
import { Bookmark, Copy, Download, FileText, FileUp, Plus, Search, X as XIcon } from 'lucide-react';
import { useEffect, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { candidatesApi, savedSearchesApi, type Candidate, type CandidateFilters } from '@/api/endpoints/candidates';
import { errorMessage } from '@/api/errors';
import { useCandidateSkills, useCandidateTags, useCandidatePage, useSavedSearches } from '@/api/queries/candidates';
import { queryKeys } from '@/api/queryKeys';
import { BulkImport } from '@/components/business/BulkImport';
import { DuplicatesModal } from '@/components/business/Duplicates';
import { CandidateDrawer, CandidateForm, ImportResume } from '@/components/forms';
import { ResumeModal } from '@/components/ResumeViewer';
import { CandidatePhoto, Chips, Empty, Field, Modal, PageHead, Skeleton } from '@/components/ui';
import { CITIES, money } from '@/lib/format';
import { useCan } from '@/lib/permissions';
import { toast } from '@/stores/ui.store';

const EMPTY: Required<CandidateFilters> = { q: '', skill: '', city: '', sort: 'recent', tag: '' };

/** CSV text for the export button (RFC 4180 quoting). Exported for tests. */
export function candidatesCsv(list: Candidate[]): string {
  const rows = [
    ['Name', 'Title', 'Company', 'Email', 'Phone', 'City', 'Experience', 'Expected CTC (L)', 'Notice', 'Skills'],
    ...list.map((c) => [c.name, c.title, c.company, c.email, c.phone, c.city, c.exp, c.expected, c.notice, (c.skills ?? []).join('; ')]),
  ];
  return rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function CandidatesPage() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const canWrite = useCan('candidates:write');
  const [f, setF] = useState<Required<CandidateFilters>>(EMPTY);
  const [dq, setDq] = useState('');
  const [dups, setDups] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [saveAs, setSaveAs] = useState<string | null>(null);
  const [applied, setApplied] = useState('');
  const [resume, setResume] = useState<Candidate | null>(null);
  const [open, setOpen] = useState<string | null>(params.get('open'));
  const [form, setForm] = useState(false);
  const [imp, setImp] = useState(params.get('import') === '1');

  // debounce the search box; the other filters apply immediately
  useEffect(() => {
    const t = setTimeout(() => setDq(f.q), 250);
    return () => clearTimeout(t);
  }, [f.q]);
  // ?open=<id> / ?import=1 are one-shot deep links (command palette, dashboard)
  useEffect(() => {
    if (params.get('open') || params.get('import')) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filters = { ...f, q: dq };
  const filterKey = JSON.stringify(filters);
  // a page belongs to the filters it was chosen under: changing them falls back to page 1 in the same render
  const [pageAt, setPageAt] = useState({ page: 1, key: filterKey });
  const [size, setSize] = useState(10);
  const page = pageAt.key === filterKey ? pageAt.page : 1;
  const setPage = (n: number) => setPageAt({ page: n, key: filterKey });
  const paged = useCandidatePage(filters, page, size);
  const isLoading = paged.isLoading;
  const data = paged.data?.data;
  const total = paged.data?.meta.total ?? data?.length ?? 0;
  const skills = useCandidateSkills();
  const tagList = useCandidateTags();
  const saved = useSavedSearches();

  const set = (k: keyof CandidateFilters) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const applySaved = (id: string) => {
    const x = (saved.data ?? []).find((v) => v.id === id);
    setApplied(id);
    if (x) setF({ ...EMPTY, ...x.filters });
  };
  const doSave = async () => {
    try {
      const r = await savedSearchesApi.create((saveAs ?? '').trim(), f);
      toast('Search saved');
      await qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
      setApplied(r.id);
      setSaveAs(null);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  const delSaved = async () => {
    try {
      await savedSearchesApi.remove(applied);
      setApplied('');
      toast('Saved search removed');
      await qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  const csv = async () => {
    // the export is the whole filtered list, not just the page on screen
    const all = await candidatesApi.list(filters).catch((e) => {
      toast(errorMessage(e), 'error');
      return null;
    });
    if (!all) return;
    const url = URL.createObjectURL(new Blob([candidatesCsv(all)], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'candidates.csv' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <>
      <PageHead title="Talent pool" sub={`${data ? total : '…'} candidates`}>
        {canWrite && (
          <button className="btn" onClick={() => setBulk(true)}>
            <FileUp size={16} />
            Bulk import
          </button>
        )}
        <button className="btn" onClick={() => setDups(true)}>
          <Copy size={16} />
          Find duplicates
        </button>
        <button className="btn" onClick={csv}>
          <Download size={16} />
          Export
        </button>
        {canWrite && (
          <>
            <button className="btn" onClick={() => setImp(true)}>
              <FileUp size={16} />
              Import resume
            </button>
            <button className="btn primary" onClick={() => setForm(true)}>
              <Plus size={16} />
              Candidate
            </button>
          </>
        )}
      </PageHead>
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input className="input" placeholder="Search name, title, company, skill…" aria-label="Search candidates" value={f.q} onChange={set('q')} />
          </div>
          <select className="select" aria-label="Skill" value={f.skill} onChange={set('skill')}>
            <option value="">All skills</option>
            {(skills.data ?? []).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className="select" aria-label="City" value={f.city} onChange={set('city')}>
            <option value="">All cities</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="select" aria-label="Tag" value={f.tag} onChange={set('tag')}>
            <option value="">All tags</option>
            {(tagList.data ?? []).map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <select className="select" aria-label="Sort" value={f.sort} onChange={set('sort')}>
            <option value="recent">Newest</option>
            <option value="exp">Experience</option>
            <option value="salary">Expected CTC</option>
            <option value="name">Name</option>
          </select>
          <span style={{ flex: 1 }} />
          <select className="select" aria-label="Saved searches" value={applied} onChange={(e) => applySaved(e.target.value)} style={{ minWidth: 170 }}>
            <option value="">★ Saved searches</option>
            {(saved.data ?? []).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          {applied ? (
            <button className="btn sm" onClick={delSaved} title="Delete this saved search">
              <XIcon size={13} />
              Remove
            </button>
          ) : (
            <button className="btn sm" onClick={() => setSaveAs('')} title="Save the current filters">
              <Bookmark size={13} />
              Save search
            </button>
          )}
        </div>
        {isLoading && !data ? (
          <Skeleton rows={8} />
        ) : data?.length ? (
          <>
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>City</th>
                <th>Experience</th>
                <th>Expected CTC</th>
                <th>Skills</th>
                <th>Resume</th>
                <th>Pipelines</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="click" onClick={() => setOpen(c.id)}>
                  <td>
                    <div className="who">
                      <CandidatePhoto c={c} size={36} />
                      <div>
                        <b>{c.name}</b>
                        <span>
                          {c.title}
                          {c.company && ` · ${c.company}`}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{c.city}</td>
                  <td>{c.exp} yrs</td>
                  <td>
                    {money(c.expected)}
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.notice}d notice</div>
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    <Chips items={c.skills} max={4} />
                  </td>
                  <td
                    onClick={(e) => {
                      e.stopPropagation();
                      setResume(c);
                    }}
                  >
                    <button
                      type="button"
                      className={'resume-chip ' + (c.resumeFile?.ext ? 'has' : '')}
                      title={c.resumeFile?.name || 'No resume yet. Click to upload'}
                      aria-label={`Resume of ${c.name}`}
                      style={{ border: 0, font: 'inherit' }}
                    >
                      <FileText size={14} />
                      {c.resumeFile?.ext ? c.resumeFile.ext.slice(1).toUpperCase() : 'Add'}
                    </button>
                  </td>
                  <td>
                    {c.pipelines ? (
                      <span className="badge brand">
                        {c.pipelines} job{c.pipelines > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager total={total} page={page} size={size} onPage={setPage} onSize={(n) => { setSize(n); setPage(1); }} />
          </>
        ) : (
          <Empty title="No candidates match" sub="Adjust the filters or import a resume." />
        )}
      </div>
      {resume && <ResumeModal c={resume} onClose={() => setResume(null)} />}
      {bulk && <BulkImport onClose={() => setBulk(false)} />}
      {dups && <DuplicatesModal onClose={() => setDups(false)} />}
      {saveAs !== null && (
        <Modal
          title="Save this search"
          sub="Keep these filters one click away"
          onClose={() => setSaveAs(null)}
          footer={
            <>
              <button className="btn" onClick={() => setSaveAs(null)}>
                Cancel
              </button>
              <button className="btn primary" disabled={!saveAs.trim()} onClick={doSave}>
                Save
              </button>
            </>
          }
        >
          <Field label="Name">
            <input
              className="input"
              autoFocus
              placeholder="e.g. Node developers in Pune"
              value={saveAs}
              onChange={(e) => setSaveAs(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveAs.trim() && doSave()}
            />
          </Field>
        </Modal>
      )}
      {open && <CandidateDrawer id={open} onClose={() => setOpen(null)} />}
      {form && <CandidateForm onClose={() => setForm(false)} onSaved={(c) => setOpen(c.id)} />}
      {imp && <ImportResume onClose={() => setImp(false)} onSaved={(c) => setOpen(c.id)} />}
    </>
  );
}
