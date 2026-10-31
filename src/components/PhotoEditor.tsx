import { Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/api/errors';
import { http } from '@/api/http';
import { toast } from '@/stores/ui.store';
import { Field, Modal } from './ui';

// Passport photo editor (7:9 crop). Shared by Profile and candidate photos, hence in components/.
const W = 280;
const H = 360;
const OUT_W = 420;
const OUT_H = 540;

export function PhotoEditor({
  c,
  onClose,
  endpoint,
  onSaved,
}: {
  c: { id?: string; photoAt?: string | null };
  onClose: () => void;
  endpoint?: string;
  onSaved?: () => void;
}) {
  const ep = endpoint || `/candidates/${c.id}/photo`;
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const geom = (cw: number, ch: number, k = 1) => {
    const im = img.current as HTMLImageElement;
    const base = Math.max(cw / im.width, ch / im.height) * zoom;
    const w = im.width * base;
    const h = im.height * base;
    const mx = (w - cw) / 2;
    const my = (h - ch) / 2;
    return { w, h, x: (cw - w) / 2 + Math.max(-mx, Math.min(mx, pos.x * k)), y: (ch - h) / 2 + Math.max(-my, Math.min(my, pos.y * k)) };
  };

  useEffect(() => {
    const cv = canvas.current;
    const g = cv?.getContext('2d');
    if (!cv || !g) return; // jsdom has no canvas
    g.fillStyle = '#f1f5f9';
    g.fillRect(0, 0, W, H);
    if (!img.current) return;
    const q = geom(W, H);
    g.drawImage(img.current, q.x, q.y, q.w, q.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, pos, loaded]);

  const pick = (f?: File) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) return toast('Please choose an image file', 'error');
    const im = new Image();
    im.onload = () => {
      img.current = im;
      setZoom(1);
      setPos({ x: 0, y: 0 });
      setLoaded(true);
    };
    im.src = URL.createObjectURL(f);
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loaded) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (d) setPos({ x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy });
  };
  const save = async () => {
    setBusy(true);
    try {
      const out = document.createElement('canvas');
      out.width = OUT_W;
      out.height = OUT_H;
      const q = geom(OUT_W, OUT_H, OUT_W / W);
      const g = out.getContext('2d');
      if (!g || !img.current) throw new Error('Canvas is not available in this browser');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, OUT_W, OUT_H);
      g.imageSmoothingQuality = 'high';
      g.drawImage(img.current, q.x, q.y, q.w, q.h);
      await http.put(ep, { dataUrl: out.toDataURL('image/jpeg', 0.86) });
      toast('Photo updated');
      onSaved?.();
      onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    try {
      await http.delete(ep);
      toast('Photo removed');
      onSaved?.();
      onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <Modal
      title="Profile photo"
      sub="Passport-size (35 × 45 mm). Drag to reposition, use the slider to zoom."
      onClose={onClose}
      footer={
        <>
          {c.photoAt && (
            <button className="btn danger" style={{ marginRight: 'auto' }} onClick={remove}>
              <Trash2 size={15} />
              Remove
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!loaded || busy} onClick={save}>
            {busy && <Loader2 size={15} className="spin" />}Save photo
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div>
          <canvas
            ref={canvas}
            width={W}
            height={H}
            style={{
              width: W,
              height: H,
              borderRadius: 10,
              border: '1px solid var(--line)',
              cursor: loaded ? 'grab' : 'default',
              touchAction: 'none',
              display: 'block',
            }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={() => (drag.current = null)}
          />
          {!loaded && (
            <div style={{ marginTop: -H / 2 - 12, height: 0, textAlign: 'center', color: 'var(--muted)', position: 'relative' }}>
              No image selected
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input ref={fileRef} type="file" hidden accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <UploadCloud size={16} />
            Choose image
          </button>
          <Field label="Zoom">
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              disabled={!loaded}
              onChange={(e) => setZoom(+e.target.value)}
              style={{ width: '100%' }}
            />
          </Field>
          <div className="banner" style={{ marginTop: 18 }}>
            Tip: a plain light background and a front-facing, well-lit face works best.
          </div>
        </div>
      </div>
    </Modal>
  );
}
