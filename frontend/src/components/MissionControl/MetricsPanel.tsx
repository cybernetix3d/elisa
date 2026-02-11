import type { TokenUsage } from '../../types';

interface Props {
  tokenUsage: TokenUsage;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function MetricsPanel({ tokenUsage }: Props) {
  if (tokenUsage.total === 0) {
    return <p className="text-sm text-gray-400">No token data yet</p>;
  }

  const agentNames = Object.keys(tokenUsage.perAgent);

  return (
    <div className="space-y-2">
      <div className="text-sm">
        <p className="font-medium text-gray-700">
          Total tokens: {formatNumber(tokenUsage.total)}
        </p>
        <p className="text-xs text-gray-500">
          Input: {formatNumber(tokenUsage.input)} | Output: {formatNumber(tokenUsage.output)}
        </p>
      </div>
      {agentNames.length > 0 && (
        <ul className="text-xs space-y-1">
          {agentNames.map(name => {
            const agent = tokenUsage.perAgent[name];
            return (
              <li key={name} className="flex justify-between px-2 py-1 bg-gray-50 rounded">
                <span className="font-medium">{name}</span>
                <span className="text-gray-500">
                  {formatNumber(agent.input + agent.output)} tokens
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
