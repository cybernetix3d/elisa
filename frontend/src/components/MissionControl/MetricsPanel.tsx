import type { TokenUsage } from '../../types';

interface Props {
  tokenUsage: TokenUsage;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function MetricsPanel({ tokenUsage }: Props) {
  if (tokenUsage.total === 0) {
    return <p className="text-sm text-atelier-text-muted">No token data yet</p>;
  }

  const agentNames = Object.keys(tokenUsage.perAgent);

  return (
    <div className="space-y-2">
      <div className="text-sm">
        <p className="font-medium text-atelier-text">
          Total tokens: {formatNumber(tokenUsage.total)}
        </p>
        <p className="text-xs text-atelier-text-muted">
          Input: {formatNumber(tokenUsage.input)} | Output: {formatNumber(tokenUsage.output)}
        </p>
      </div>
      {agentNames.length > 0 && (
        <ul className="text-xs space-y-1">
          {agentNames.map(name => {
            const agent = tokenUsage.perAgent[name];
            return (
              <li key={name} className="flex justify-between px-2.5 py-1.5 bg-atelier-surface/50 rounded-lg border border-border-subtle">
                <span className="font-medium text-atelier-text-secondary">{name}</span>
                <span className="text-atelier-text-muted font-mono">
                  {formatNumber(agent.input + agent.output)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
