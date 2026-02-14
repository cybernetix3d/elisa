import type { TestResult, UIState, Task, Agent } from '../../types';

interface Props {
  results: TestResult[];
  coveragePct: number | null;
  uiState?: UIState;
  tasks?: Task[];
  agents?: Agent[];
}

function StatusDot({ status }: { status: Task['status'] }) {
  switch (status) {
    case 'pending':
      return <span className="inline-block w-2 h-2 rounded-full bg-atelier-text-muted flex-shrink-0" />;
    case 'in_progress':
      return <span className="inline-block w-2 h-2 rounded-full bg-accent-sky animate-pulse flex-shrink-0" />;
    case 'done':
      return (
        <svg className="w-3 h-3 text-accent-mint flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 6l3 3 5-5" />
        </svg>
      );
    case 'failed':
      return (
        <svg className="w-3 h-3 text-accent-coral flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l6 6M9 3l-6 6" />
        </svg>
      );
  }
}

export default function TestResults({ results, coveragePct, uiState, tasks = [], agents = [] }: Props) {
  const testerAgentNames = new Set(
    agents.filter(a => a.role === 'tester').map(a => a.name)
  );
  const testerTasks = tasks.filter(t => testerAgentNames.has(t.agent_name));

  // State B: test results exist
  if (results.length > 0) {
    const passedCount = results.filter(r => r.passed).length;

    return (
      <div className="h-full overflow-y-auto p-4 space-y-3">
        <p className="text-sm font-medium text-atelier-text">
          {passedCount}/{results.length} tests passing
        </p>
        {coveragePct !== null && (
          <div>
            <p className="text-xs text-atelier-text-muted mb-1">Coverage: {coveragePct.toFixed(1)}%</p>
            <div className="w-full h-1.5 bg-atelier-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-sky to-accent-lavender transition-all duration-300 rounded-full"
                role="progressbar"
                style={{ width: `${Math.min(coveragePct, 100)}%` }}
              />
            </div>
          </div>
        )}
        <ul className="text-xs space-y-1">
          {results.map((r, i) => (
            <li key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-atelier-surface/50 rounded-lg border border-border-subtle">
              <span className={`font-semibold ${r.passed ? 'text-accent-mint' : 'text-accent-coral'}`}>
                {r.passed ? 'PASS' : 'FAIL'}
              </span>
              <span className="font-mono text-atelier-text-secondary">{r.test_name}</span>
              {r.details && r.details !== 'PASSED' && r.details !== 'FAILED' && (
                <span className="text-atelier-text-muted ml-auto">{r.details}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // State A: building with tester tasks visible
  if (uiState === 'building' && testerTasks.length > 0) {
    const doneCount = testerTasks.filter(t => t.status === 'done').length;

    return (
      <div className="h-full overflow-y-auto p-4 space-y-3">
        <p className="text-sm font-medium text-atelier-text">
          Test Creation <span className="text-atelier-text-muted font-normal">({doneCount}/{testerTasks.length})</span>
        </p>
        <ul className="text-xs space-y-1">
          {testerTasks.map(t => (
            <li key={t.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-atelier-surface/50 rounded-lg border border-border-subtle">
              <StatusDot status={t.status} />
              <span className="text-atelier-text-secondary">{t.name}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // State A fallback: building but no tester tasks yet
  if (uiState === 'building') {
    return (
      <div className="h-full overflow-y-auto">
        <p className="text-sm text-accent-sky p-4">Tests will run after tasks complete...</p>
      </div>
    );
  }

  // State C: design phase, no results
  return (
    <div className="h-full overflow-y-auto">
      <p className="text-sm text-atelier-text-muted p-4">No test results yet</p>
    </div>
  );
}
