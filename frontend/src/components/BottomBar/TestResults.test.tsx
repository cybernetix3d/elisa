import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TestResults from './TestResults';
import type { TestResult } from '../../types';

describe('TestResults', () => {
  it('shows empty state when no results', () => {
    render(<TestResults results={[]} coveragePct={null} />);
    expect(screen.getByText('No test results yet')).toBeInTheDocument();
  });

  it('shows passing test with green indicator', () => {
    const results: TestResult[] = [
      { test_name: 'test_add', passed: true, details: 'PASSED' },
    ];
    render(<TestResults results={results} coveragePct={null} />);
    expect(screen.getByText('PASS')).toBeInTheDocument();
    expect(screen.getByText('test_add')).toBeInTheDocument();
  });

  it('shows failing test with red indicator', () => {
    const results: TestResult[] = [
      { test_name: 'test_bad', passed: false, details: 'FAILED' },
    ];
    render(<TestResults results={results} coveragePct={null} />);
    expect(screen.getByText('FAIL')).toBeInTheDocument();
    expect(screen.getByText('test_bad')).toBeInTheDocument();
  });

  it('shows summary line', () => {
    const results: TestResult[] = [
      { test_name: 'test_a', passed: true, details: 'PASSED' },
      { test_name: 'test_b', passed: true, details: 'PASSED' },
      { test_name: 'test_c', passed: true, details: 'PASSED' },
      { test_name: 'test_d', passed: false, details: 'FAILED' },
    ];
    render(<TestResults results={results} coveragePct={null} />);
    expect(screen.getByText('3/4 tests passing')).toBeInTheDocument();
  });

  it('shows coverage progress bar when available', () => {
    const results: TestResult[] = [
      { test_name: 'test_a', passed: true, details: 'PASSED' },
    ];
    render(<TestResults results={results} coveragePct={85.5} />);
    expect(screen.getByText('Coverage: 85.5%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('does not show coverage bar when null', () => {
    const results: TestResult[] = [
      { test_name: 'test_a', passed: true, details: 'PASSED' },
    ];
    render(<TestResults results={results} coveragePct={null} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
