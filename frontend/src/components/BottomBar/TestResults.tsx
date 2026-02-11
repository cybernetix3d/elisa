import type { TestResult } from '../../types';

interface Props {
  results: TestResult[];
  coveragePct: number | null;
}

export default function TestResults({ results, coveragePct }: Props) {
  if (results.length === 0) {
    return <p className="text-sm text-gray-400 p-4">No test results yet</p>;
  }

  const passedCount = results.filter(r => r.passed).length;

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">
        {passedCount}/{results.length} tests passing
      </p>
      {coveragePct !== null && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Coverage: {coveragePct.toFixed(1)}%</p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              role="progressbar"
              style={{ width: `${Math.min(coveragePct, 100)}%` }}
            />
          </div>
        </div>
      )}
      <ul className="text-xs space-y-1">
        {results.map((r, i) => (
          <li key={i} className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded">
            <span className={r.passed ? 'text-green-600' : 'text-red-600'}>
              {r.passed ? 'PASS' : 'FAIL'}
            </span>
            <span className="font-mono">{r.test_name}</span>
            {r.details && r.details !== 'PASSED' && r.details !== 'FAILED' && (
              <span className="text-gray-400 ml-auto">{r.details}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
