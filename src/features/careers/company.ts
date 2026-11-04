/** The employer shown on the public careers site. Set the VITE_COMPANY_* variables at build time; the defaults suit a demo. */
const env = import.meta.env as Record<string, string | undefined>;
const text = (k: string, d: string) => (env[k] ?? '').trim() || d;

export const company = {
  name: text('VITE_COMPANY_NAME', 'Placewise'),
  /** URL of a square or wide logo; falls back to the built-in mark. */
  logo: text('VITE_COMPANY_LOGO', ''),
  tagline: text('VITE_COMPANY_TAGLINE', 'Roles with leading companies, matched to people by a team that actually reads your resume.'),
  about: text(
    'VITE_COMPANY_ABOUT',
    'We are a recruitment consultancy. We work with growing companies across technology, finance, retail and healthcare to find people who fit the role and the team. Every application is read by a person, and we keep you informed at each step.',
  ),
  /** The company website, used in Google for Jobs data and the About section. */
  url: text('VITE_COMPANY_URL', ''),
  contactEmail: text('VITE_COMPANY_EMAIL', ''),
  /** Public base address of this site, for share links and structured data; defaults to the current origin. */
  siteUrl: () => text('VITE_SITE_URL', '') || window.location.origin,
};
