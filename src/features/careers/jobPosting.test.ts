import { describe, expect, it } from 'vitest';
import type { CareerJob } from '@/api/endpoints/careers';
import { careerMatches } from './CareersPage';
import { jobLink, jobPostingJsonLd, shareHref, sourceOf } from './jobPosting';

const job: CareerJob = { id: 'j1', title: 'Backend <Engineer>', city: 'Pune', remote: true, industry: 'Fintech', expMin: 3, expMax: 6, skills: ['node', 'sql'], postedDays: 2, postedAt: '2026-11-01T00:00:00.000Z', description: 'Build APIs.\nShip.' };

describe('Google for Jobs data', () => {
  const ld = jobPostingJsonLd(job, 'https://x.io');
  it('is a JobPosting with the fields Google requires', () => {
    expect(ld).toMatchObject({ '@type': 'JobPosting', title: job.title, datePosted: job.postedAt, url: 'https://x.io/careers/j1' });
    expect(ld.hiringOrganization).toMatchObject({ '@type': 'Organization' });
    expect(ld.jobLocation).toBeTruthy();
  });
  it('marks remote roles and escapes the description', () => {
    expect(ld.jobLocationType).toBe('TELECOMMUTE');
    expect(String(ld.description)).toContain('<p>Build APIs.</p><p>Ship.</p>');
  });
  it('never includes salary or the client', () => {
    expect(JSON.stringify(ld)).not.toMatch(/salary|client/i);
  });
});

describe('share links', () => {
  it('tag every link with the channel', () => {
    expect(jobLink('j1', 'linkedin', 'https://x.io')).toBe('https://x.io/careers/j1?source=linkedin');
    expect(decodeURIComponent(shareHref('linkedin', job, 'https://x.io'))).toContain('source=linkedin');
    expect(decodeURIComponent(shareHref('whatsapp', job, 'https://x.io'))).toContain('source=whatsapp');
  });
  it('reads only known sources', () => {
    expect(sourceOf('?source=LinkedIn')).toBe('linkedin');
    expect(sourceOf('?source=evil')).toBe('');
    expect(sourceOf('')).toBe('');
  });
});

describe('careerMatches filters', () => {
  it('filters by experience band overlap', () => {
    expect(careerMatches(job, '', '', '3-5')).toBe(true);
    expect(careerMatches(job, '', '', '0-2')).toBe(false);
    expect(careerMatches(job, '', '', '10+')).toBe(false);
  });
  it('filters by remote', () => {
    expect(careerMatches(job, '', '', '', true)).toBe(true);
    expect(careerMatches({ ...job, remote: false }, '', '', '', true)).toBe(false);
  });
});
