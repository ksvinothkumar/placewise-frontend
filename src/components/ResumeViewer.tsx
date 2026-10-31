import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, ExternalLink, FileText, FileX, Loader2, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { candidatesApi, type Candidate } from '@/api/endpoints/candidates';
import { errorMessage } from '@/api/errors';
import { useResumeView } from '@/api/queries/candidates';
import { queryKeys } from '@/api/queryKeys';
import { Modal } from '@/components/ui';
import { toast } from '@/stores/ui.store';

const size = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const DOC_CSS = `<style>body{font:14px/1.6 Georgia,'Times New Roman',serif;color:#1f2937;max-width:760px;margin:28px auto;padding:0 28px}h1,h2,h3{font-family:Inter,system-ui,sans-serif;margin:1.2em 0 .4em}table{border-collapse:collapse}td,th{border:1px solid #e5e7eb;padding:4px 8px}img{max-width:100%}</style>`;

const Spinner = () => <Loader2 className="spin" color="var(--brand)" />;

export function ResumePanel({ c, height = 640 }: { c: Pick<Candidate, 'id' | 'resumeFile'>; height?: number | string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: v, isLoading: loading, error } = useResumeView(c.id);
  const [busy, setBusy] = useState(false);
  const hasFile = !!c.resumeFile?.ext || (!!v && (v.kind === 'pdf' || v.kind === 'image'));
  const binary = v && (v.kind === 'pdf' || v.kind === 'image');

  // authenticated binary fetch -> object URL, revoked when the resume changes or the panel closes
  const { data: blob } = useQuery({
    queryKey: [...queryKeys.candidates.detail(c.id), 'resume-blob', v?.at ?? ''],
    queryFn: () => candidatesApi.resumeBlobUrl(c.id),
    enabled: !!binary,
    gcTime: 0,
    staleTime: Infinity,
    retry: false,
  });
  useEffect(() => () => void (blob && URL.revokeObjectURL(blob)), [blob]);

  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      await candidatesApi.uploadResume(c.id, fd);
      toast('Resume uploaded');
      await refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const download = async () => {
    if (!v) return;
    try {
      const u = URL.createObjectURL(await candidatesApi.resumeDownload(c.id));
      Object.assign(document.createElement('a'), { href: u, download: v.name }).click();
      setTimeout(() => URL.revokeObjectURL(u), 2000);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  const remove = async () => {
    if (!confirm('Remove this resume?')) return;
    try {
      await candidatesApi.removeResume(c.id);
      toast('Resume removed');
      await refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const uploadBtn = (label: string) => (
    <>
      <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt,.rtf,.md,.png,.jpg,.jpeg,.webp" aria-label="Resume file" onChange={(e) => void upload(e.target.files?.[0])} />
      <button className="btn sm" disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
        {label}
      </button>
    </>
  );

  if (loading && !v)
    return (
      <div style={{ height, display: 'grid', placeItems: 'center' }}>
        <Spinner />
      </div>
    );
  if (error || !v)
    return (
      <div className="empty" style={{ height, display: 'grid', placeContent: 'center' }}>
        <FileX size={36} strokeWidth={1.5} style={{ margin: '0 auto' }} />
        <b>No resume on file</b>Upload a PDF, Word or text resume to view it here.
        <div style={{ marginTop: 14 }}>{uploadBtn('Upload resume')}</div>
      </div>
    );
  return (
    <div>
      <div className="resume-bar">
        <FileText size={18} color="var(--brand)" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</b>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>
            {v.kind.toUpperCase()}
            {v.size ? ` · ${v.kind === 'text' && !hasFile ? v.size + ' chars' : size(v.size)}` : ''}
            {v.at ? ` · uploaded ${new Date(v.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          </span>
        </div>
        {hasFile && (
          <button className="btn sm" onClick={download}>
            <Download size={14} />
            Download
          </button>
        )}
        {blob && (
          <button className="btn sm" onClick={() => window.open(blob, '_blank')}>
            <ExternalLink size={14} />
            Open
          </button>
        )}
        {uploadBtn(hasFile ? 'Replace' : 'Upload file')}
        <button className="btn sm danger" onClick={remove} title="Remove resume" aria-label="Remove resume">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="resume-body" style={{ height }}>
        {v.kind === 'pdf' &&
          (blob ? (
            <iframe title="Resume" src={blob} />
          ) : (
            <div className="center">
              <Spinner />
            </div>
          ))}
        {v.kind === 'image' &&
          (blob ? (
            <div style={{ height: '100%', overflow: 'auto', textAlign: 'center', padding: 16 }}>
              <img src={blob} alt="Resume" style={{ maxWidth: '100%' }} />
            </div>
          ) : (
            <div className="center">
              <Spinner />
            </div>
          ))}
        {/* sandboxed with no permissions: converted DOCX HTML is untrusted */}
        {v.kind === 'docx' && <iframe title="Resume" sandbox="" srcDoc={DOC_CSS + v.html} style={{ background: '#fff' }} />}
        {v.kind === 'text' && <pre className="resume-text">{v.text}</pre>}
      </div>
    </div>
  );
}

export function ResumeModal({ c, onClose }: { c: Pick<Candidate, 'id' | 'name' | 'title' | 'resumeFile'>; onClose: () => void }) {
  return (
    <Modal wide title="Resume" sub={`${c.name}${c.title ? ' · ' + c.title : ''}`} onClose={onClose}>
      <div style={{ marginTop: 12 }}>
        <ResumePanel c={c} height="68vh" />
      </div>
    </Modal>
  );
}
