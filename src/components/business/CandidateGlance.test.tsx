import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CandidateGlance } from './CandidateGlance';

describe('CandidateGlance', () => {
  it('shows the headline, summary and the first skills with a +N for the rest', () => {
    render(
      <CandidateGlance
        maxSkills={2}
        candidate={{ title: 'Java Developer', exp: 5, city: 'Chennai', summary: 'Builds payment APIs.', skills: ['Java', 'Spring', 'Kafka'] }}
      />,
    );
    expect(screen.getByText('Java Developer · 5y · Chennai')).toBeInTheDocument();
    expect(screen.getByText('Builds payment APIs.')).toBeInTheDocument();
    expect(screen.getByText('Java')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.queryByText('Kafka')).not.toBeInTheDocument();
  });

  it('renders nothing for a candidate with no profile detail', () => {
    const { container } = render(<CandidateGlance candidate={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
