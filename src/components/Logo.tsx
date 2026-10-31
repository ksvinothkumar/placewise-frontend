// Placewise mark: a "P" whose bowl holds a check, for a successful placement.
export function LogoMark({ size = 34, shadow = true }: { size?: number; shadow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Placewise"
      style={{ flex: 'none', borderRadius: size * 0.27, boxShadow: shadow ? '0 6px 16px rgba(99,102,241,.45)' : 'none' }}
    >
      <defs>
        <linearGradient id="pg" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#pg)" />
      <path
        d="M17 36V13h10a8.5 8.5 0 0 1 0 17H17"
        fill="none"
        stroke="#fff"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21.6 21.6l2.6 2.6 4.8-5.7" fill="none" stroke="#6ee7b7" strokeWidth="2.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export const Wordmark = () => (
  <span className="label wm">
    Place<span>wise</span>
  </span>
);
