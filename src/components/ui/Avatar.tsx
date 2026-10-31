import { useEffect, useState } from 'react';
import { http } from '@/api/http';
import { colorFor, initials } from '@/lib/format';

export const Avatar = ({ name, size = 36 }: { name?: string | null; size?: number }) => (
  <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, background: colorFor(name) }}>
    {initials(name)}
  </div>
);

interface PhotoSubject {
  id?: string;
  name?: string;
  photoAt?: string | null;
}

// Authenticated photo fetch with a module cache; falls back to initials. `passport` renders the 7:9 ID-photo frame.
const photoCache = new Map<string, string>();

export function CandidatePhoto({
  c,
  size = 36,
  passport = false,
  path,
}: {
  c?: PhotoSubject | null;
  size?: number;
  passport?: boolean;
  path?: string;
}) {
  const key = `${path ?? ''}${c?.id}|${c?.photoAt}`;
  const [src, setSrc] = useState<string | null>(() => photoCache.get(key) ?? null);
  useEffect(() => {
    if (!c?.photoAt) {
      setSrc(null);
      return;
    }
    const cached = photoCache.get(key);
    if (cached) {
      setSrc(cached);
      return;
    }
    let live = true;
    http
      .blobUrl(path ?? `/candidates/${c.id}/photo`)
      .then((u) => {
        photoCache.set(key, u);
        if (live) setSrc(u);
      })
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (passport) {
    const w = size;
    const h = Math.round((size * 9) / 7);
    const frame = {
      width: w,
      height: h,
      borderRadius: 8,
      border: '3px solid var(--surface)',
      boxShadow: '0 0 0 1px var(--line), var(--sh2)',
    } as const;
    return src ? (
      <img src={src} alt={c?.name ?? ''} style={{ ...frame, objectFit: 'cover', display: 'block' }} />
    ) : (
      <div
        style={{
          ...frame,
          background: colorFor(c?.name),
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontSize: w * 0.3,
          fontWeight: 700,
        }}
      >
        {initials(c?.name)}
      </div>
    );
  }
  return src ? (
    <img src={src} alt={c?.name ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />
  ) : (
    <Avatar name={c?.name} size={size} />
  );
}
