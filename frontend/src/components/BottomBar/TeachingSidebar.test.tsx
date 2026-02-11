import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeachingSidebar from './TeachingSidebar';
import type { TeachingMoment } from '../../types';

describe('TeachingSidebar', () => {
  it('shows empty state', () => {
    render(<TeachingSidebar moments={[]} />);
    expect(screen.getByText('Teaching moments will appear as you build')).toBeInTheDocument();
  });

  it('renders moment with headline and explanation', () => {
    const moments: TeachingMoment[] = [{
      concept: 'source_control',
      headline: 'Your helpers are saving!',
      explanation: 'Saving work to GitHub.',
    }];
    render(<TeachingSidebar moments={moments} />);
    expect(screen.getByText('Your helpers are saving!')).toBeInTheDocument();
    expect(screen.getByText('Saving work to GitHub.')).toBeInTheDocument();
  });

  it('shows tell me more button when available', () => {
    const moments: TeachingMoment[] = [{
      concept: 'source_control',
      headline: 'Saving!',
      explanation: 'Explanation here.',
      tell_me_more: 'Extended info here.',
    }];
    render(<TeachingSidebar moments={moments} />);
    expect(screen.getByText('Tell me more')).toBeInTheDocument();
  });

  it('toggles tell me more text on click', () => {
    const moments: TeachingMoment[] = [{
      concept: 'source_control',
      headline: 'Saving!',
      explanation: 'Explanation.',
      tell_me_more: 'Extended info here.',
    }];
    render(<TeachingSidebar moments={moments} />);
    expect(screen.queryByText('Extended info here.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Tell me more'));
    expect(screen.getByText('Extended info here.')).toBeInTheDocument();
  });

  it('hides tell me more button when undefined', () => {
    const moments: TeachingMoment[] = [{
      concept: 'testing',
      headline: 'Tests!',
      explanation: 'Testing explanation.',
    }];
    render(<TeachingSidebar moments={moments} />);
    expect(screen.queryByText('Tell me more')).not.toBeInTheDocument();
  });

  it('shows most recent moment first', () => {
    const moments: TeachingMoment[] = [
      { concept: 'a', headline: 'Moment Alpha', explanation: 'Alpha explanation.' },
      { concept: 'b', headline: 'Moment Beta', explanation: 'Beta explanation.' },
    ];
    render(<TeachingSidebar moments={moments} />);
    const headings = screen.getAllByText(/Moment (Alpha|Beta)/);
    expect(headings[0].textContent).toBe('Moment Beta');
    expect(headings[1].textContent).toBe('Moment Alpha');
  });

  it('shows related concepts as badges', () => {
    const moments: TeachingMoment[] = [{
      concept: 'testing',
      headline: 'Tests!',
      explanation: 'Explanation.',
      related_concepts: ['debugging', 'quality'],
    }];
    render(<TeachingSidebar moments={moments} />);
    expect(screen.getByText('debugging')).toBeInTheDocument();
    expect(screen.getByText('quality')).toBeInTheDocument();
  });
});
