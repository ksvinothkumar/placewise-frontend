import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { candidatesApi, type Candidate, type ParsedResume } from '@/api/endpoints/candidates';
import { errorMessage } from '@/api/errors';
import { Modal } from '@/components/ui';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { CandidateFields, candidateBody, candidateInvalidate, type CandidateDraft } from './CandidateForms';

type Phase = { phase: 'idle' } | { phase: 'parsing' } | { phase: 'error'; error: string } | ({ phase: 'done' } & ParsedResume);

export function ImportResume({ onClose, onSaved }: { onClose: () => void; onSaved?: (c: Candidate) => void }) {
  const ai = useSessionStore((s) => s.ai);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const fileObj = useRef<File | null>(null);
  const [over, setOver] = useState(false);
  const [state, setState] = useState<Phase>({ phase: 'idle' });
  const [v, setV] = useState<CandidateDraft | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string, x: unknown) => setV((s) => ({ ...s, [k]: x }));

  const run = async (fd: FormData) => {
    setState({ phase: 'parsing' });
    try {
      const r = await candidatesApi.parse(fd);
      setV({ ...r.parsed, source: 'Resume Import' });
      setState({ phase: 'done', ...r });
      setText(r.text || '');
    } catch (e) {
      setState({ phase: 'error', error: errorMessage(e) });
    }
  };
  const upload = (file?: File | null) => {
    if (!file) return;
    fileObj.current = file;
    const fd = new FormData();
    fd.append('file', file);
    void run(fd);
  };
  const parseText = () => {
    fileObj.current = null;
    const fd = new FormData();
    fd.append('text', text);
    void run(fd);
  };
  const save = async () => {
    if (!v) return;
    setSaving(true);
    try {
      const c = await candidatesApi.create(fileObj.current ? candidateBody(v) : { ...candidateBody(v), resumeText: text }, state.phase === 'done' && !!state.duplicate);
      if (fileObj.current) {
        const fd = new FormData();
        fd.append('file', fileObj.current);
        await candidatesApi.uploadResume(c.id, fd).catch(() => toast('Saved, but the resume file could not be stored', 'error'));
      }
      toast('Candidate saved');
      await Promise.all(candidateInvalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
      onClose();
      onSaved?.(c);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };
  const missing = v ? ['name', 'email', 'phone', 'title', 'city'].filter((k) => !v[k]) : [];
  const done = state.phase === 'done' ? state : null;
  const skillCount = Array.isArray(v?.skills) ? v.skills.length : 0;

  return (
    <Modal
      wide
      title="Import resume"
      sub="Upload any resume and every field is filled in for you. Review, then save."
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!v?.name || saving} onClick={save}>
            {saving && <Loader2 size={15} className="spin" />}Save candidate
          </button>
        </>
      }
    >
      <div
        className={'dropzone ' + (over ? 'over' : '')}
        role="button"
        tabIndex={0}
        aria-label="Choose a resume file"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fileRef.current?.click())}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files[0]);
        }}
      >
        <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt,.rtf,.md,.html" onChange={(e) => upload(e.target.files?.[0])} />
        {state.phase === 'parsing' ? (
          <>
            <Loader2 size={30} className="spin" color="var(--brand)" />
            <b>Reading resume…</b>
            <span>{ai ? 'Extracting with Claude' : 'Extracting fields'}</span>
          </>
        ) : (
          <>
            <UploadCloud size={30} color="var(--brand)" />
            <b>Drop a resume here, or click to browse</b>
            <span>PDF · Word (.docx) · TXT · RTF · HTML · up to 8 MB</span>
          </>
        )}
      </div>
      {state.phase === 'error' && (
        <div className="banner bad" role="alert">
          <AlertTriangle size={16} />
          {state.error}
        </div>
      )}
      {done && v && (
        <div className={'banner ' + (missing.length ? 'warn' : 'good')}>
          {done.engine === 'claude' ? <Sparkles size={16} /> : <CheckCircle2 size={16} />}
          <span>
            {done.engine === 'claude' ? 'Parsed with Claude' : 'Parsed with rules'}
            {done.fileName && ` · ${done.fileName}`} · {skillCount} skills found
            {missing.length > 0 && ` · couldn't find: ${missing.join(', ')}`}
          </span>
        </div>
      )}
      {done?.duplicate && (
        <div className="banner warn">
          <AlertTriangle size={16} />
          This looks like an existing candidate: <b>{done.duplicate.name}</b>. Saving will create another record.
        </div>
      )}
      {v ? (
        <CandidateFields v={v} set={set} />
      ) : (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text2)' }}>Or paste resume text</summary>
          <textarea
            className="textarea"
            style={{ marginTop: 8 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste resume text here…"
            aria-label="Resume text"
          />
          <button className="btn sm" style={{ marginTop: 8 }} onClick={parseText} disabled={text.length < 20}>
            <FileText size={14} />
            Parse text
          </button>
        </details>
      )}
    </Modal>
  );
}
