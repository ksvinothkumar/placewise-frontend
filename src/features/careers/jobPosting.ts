import type { CareerJob } from '@/api/endpoints/careers';
import { company } from './company';

export const CHANNELS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'twitter', label: 'X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'email', label: 'Email' },
] as const;
export type Channel = (typeof CHANNELS)[number]['id'];

/** The job's own address with ?source= so applications can be traced back to where they were shared. */
export const jobLink = (id: string, source?: string, base = company.siteUrl()) =>
  `${base}/careers/${id}${source ? `?source=${encodeURIComponent(source)}` : ''}`;

/** The address that opens each network's share screen for this job. */
export function shareHref(channel: Channel, job: Pick<CareerJob, 'id' | 'title' | 'city'>, base?: string): string {
  const url = encodeURIComponent(jobLink(job.id, channel, base));
  const text = encodeURIComponent(`${job.title} at ${company.name}${job.city ? ` (${job.city})` : ''}`);
  switch (channel) {
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case 'whatsapp':
      return `https://wa.me/?text=${text}%20${url}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    case 'email':
      return `mailto:?subject=${text}&body=${url}`;
  }
}

const KNOWN = new Set<string>([...CHANNELS.map((c) => c.id), 'copy']);
/** The share channel recorded in ?source=, or '' for anything unrecognised. */
export const sourceOf = (search: string): string => {
  const s = (new URLSearchParams(search).get('source') ?? '').toLowerCase();
  return KNOWN.has(s) ? s : '';
};

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** schema.org JobPosting, the format Google for Jobs reads. Salary is left out because the public card never carries it. */
export function jobPostingJsonLd(job: CareerJob, base = company.siteUrl()) {
  const posted = job.postedAt ?? new Date(Date.now() - job.postedDays * 864e5).toISOString();
  const valid = new Date(new Date(posted).getTime() + 90 * 864e5).toISOString();
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: `<p>${escapeHtml(job.description || `${job.title} at ${company.name}.`).replace(/\n+/g, '</p><p>')}</p>${
      job.skills.length ? `<p>Skills: ${escapeHtml(job.skills.join(', '))}</p>` : ''
    }`,
    datePosted: posted,
    validThrough: valid,
    employmentType: 'FULL_TIME',
    directApply: true,
    url: jobLink(job.id, undefined, base),
    identifier: { '@type': 'PropertyValue', name: company.name, value: job.id },
    hiringOrganization: { '@type': 'Organization', name: company.name, ...(company.url ? { sameAs: company.url } : {}), ...(company.logo ? { logo: company.logo } : {}) },
    experienceRequirements: { '@type': 'OccupationalExperienceRequirements', monthsOfExperience: Math.round(job.expMin * 12) },
    skills: job.skills.join(', '),
    totalJobOpenings: job.openings ?? 1,
  };
  if (job.industry) ld.industry = job.industry;
  if (job.city) ld.jobLocation = { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.city, addressCountry: 'IN' } };
  if (job.remote) {
    ld.jobLocationType = 'TELECOMMUTE';
    ld.applicantLocationRequirements = { '@type': 'Country', name: 'IN' };
  }
  return ld;
}
