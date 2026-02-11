import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommsFeed from './CommsFeed';
import type { WSEvent } from '../../types';

describe('CommsFeed', () => {
  it('shows empty state', () => {
    render(<CommsFeed events={[]} />);
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('renders agent_output events with agent name', () => {
    const events: WSEvent[] = [
      { type: 'agent_output', task_id: 't1', agent_name: 'Sparky', content: 'Building login...' },
    ];
    render(<CommsFeed events={events} />);
    expect(screen.getByText('Sparky:')).toBeInTheDocument();
    expect(screen.getByText(/Building login/)).toBeInTheDocument();
  });

  it('renders agent_message events with from field', () => {
    const events: WSEvent[] = [
      { type: 'agent_message', from: 'Checkers', to: 'team', content: 'Review complete' },
    ];
    render(<CommsFeed events={events} />);
    expect(screen.getByText('Checkers:')).toBeInTheDocument();
    expect(screen.getByText(/Review complete/)).toBeInTheDocument();
  });

  it('filters out non-comms events', () => {
    const events: WSEvent[] = [
      { type: 'planning_started' },
      { type: 'agent_output', task_id: 't1', agent_name: 'Sparky', content: 'Working...' },
      { type: 'session_complete', summary: 'Done' },
    ];
    render(<CommsFeed events={events} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
  });

  it('renders empty state when events exist but no comms events', () => {
    const events: WSEvent[] = [
      { type: 'planning_started' },
    ];
    render(<CommsFeed events={events} />);
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });
});
