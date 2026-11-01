import { Avatar } from './Avatar';

/** A company logo in a rounded white tile, or the initials avatar when no logo is set. */
export function ClientLogo({ name, logo, size = 44 }: { name?: string | null; logo?: string | null; size?: number }) {
  if (!logo) return <Avatar name={name} size={size} />;
  return (
    <img
      src={logo}
      alt={name ? `${name} logo` : 'Company logo'}
      style={{ width: size, height: size, objectFit: 'contain', background: '#fff', border: '1px solid var(--line)', borderRadius: Math.round(size * 0.22), padding: Math.round(size * 0.08), flex: 'none' }}
    />
  );
}
