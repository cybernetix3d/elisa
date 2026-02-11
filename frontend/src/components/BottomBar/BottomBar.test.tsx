import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BottomBar from './BottomBar';
import type { Commit } from '../../types';

const defaultProps = {
  commits: [] as Commit[],
  testResults: [],
  coveragePct: null,
  teachingMoments: [],
};

describe('BottomBar', () => {
  it('renders all tab buttons', () => {
    render(<BottomBar {...defaultProps} />);
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Tests')).toBeInTheDocument();
    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
  });

  it('renders GitTimeline empty state by default', () => {
    render(<BottomBar {...defaultProps} />);
    expect(screen.getByText('Commits will appear here as agents work')).toBeInTheDocument();
  });

  it('disables only Board tab', () => {
    render(<BottomBar {...defaultProps} />);
    expect(screen.getByText('Timeline')).not.toBeDisabled();
    expect(screen.getByText('Tests')).not.toBeDisabled();
    expect(screen.getByText('Board')).toBeDisabled();
    expect(screen.getByText('Learn')).not.toBeDisabled();
  });

  it('renders commits in timeline', () => {
    const commits: Commit[] = [{
      sha: 'abc',
      message: 'Sparky: Build login',
      agent_name: 'Sparky',
      task_id: 't1',
      timestamp: '2026-02-10T12:00:00Z',
      files_changed: [],
    }];
    render(<BottomBar {...defaultProps} commits={commits} />);
    expect(screen.getByText('Sparky:')).toBeInTheDocument();
  });

  it('clicking Tests tab renders TestResults', () => {
    render(<BottomBar {...defaultProps} />);
    fireEvent.click(screen.getByText('Tests'));
    expect(screen.getByText('No test results yet')).toBeInTheDocument();
  });

  it('clicking Learn tab renders TeachingSidebar', () => {
    render(<BottomBar {...defaultProps} />);
    fireEvent.click(screen.getByText('Learn'));
    expect(screen.getByText('Teaching moments will appear as you build')).toBeInTheDocument();
  });

  it('Tests tab shows test results', () => {
    const props = {
      ...defaultProps,
      testResults: [
        { test_name: 'test_add', passed: true, details: 'PASSED' },
        { test_name: 'test_sub', passed: false, details: 'FAILED' },
      ],
    };
    render(<BottomBar {...props} />);
    fireEvent.click(screen.getByText('Tests'));
    expect(screen.getByText('1/2 tests passing')).toBeInTheDocument();
  });

  it('Learn tab shows teaching moments', () => {
    const props = {
      ...defaultProps,
      teachingMoments: [
        { concept: 'testing', headline: 'Tests are passing!', explanation: 'Great news.' },
      ],
    };
    render(<BottomBar {...props} />);
    fireEvent.click(screen.getByText('Learn'));
    expect(screen.getByText('Tests are passing!')).toBeInTheDocument();
  });
});
