import { Chips } from '@/components/ui/Badges';

export interface GlanceCandidate {
  title?: string;
  exp?: number;
  city?: string;
  summary?: string;
  skills?: string[];
}

/** A recruiter's quick read of an applicant: headline, a two-line profile summary and the top skills, so the full profile needn't be opened. */
export function CandidateGlance({ candidate: c, maxSkills = 5 }: { candidate: GlanceCandidate; maxSkills?: number }) {
  const headline = [c.title, c.exp != null ? `${c.exp}y` : '', c.city].filter(Boolean).join(' · ');
  const summary = c.summary?.trim();
  const skills = c.skills ?? [];
  if (!headline && !summary && !skills.length) return null;
  return (
    <div className="glance">
      {headline && <div className="glance-h">{headline}</div>}
      {summary && (
        <p className="glance-s" title={summary}>
          {summary}
        </p>
      )}
      {skills.length > 0 && (
        <div className="glance-k">
          <Chips items={skills} max={maxSkills} />
        </div>
      )}
    </div>
  );
}
