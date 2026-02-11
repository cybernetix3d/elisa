import { useState } from 'react';
import type { Commit } from '../../types';

const ROLE_COLORS: Record<string, string> = {
  builder: 'bg-accent-sky',
  tester: 'bg-accent-mint',
  reviewer: 'bg-accent-lavender',
};

function getDotColor(agentName: string): string {
  const lower = agentName.toLowerCase();
  for (const [role, color] of Object.entries(ROLE_COLORS)) {
    if (lower.includes(role)) return color;
  }
  return 'bg-atelier-text-muted';
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

interface Props {
  commits: Commit[];
}

export default function GitTimeline({ commits }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-atelier-text-muted">
        Commits will appear here as agents work
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto h-full px-3 py-2">
      {commits.map((commit) => (
        <div key={commit.sha}>
          <button
            type="button"
            className="flex items-center gap-2 w-full text-left hover:bg-atelier-surface/40 rounded-lg px-2 py-1 transition-colors"
            onClick={() => setExpanded(expanded === commit.sha ? null : commit.sha)}
          >
            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${getDotColor(commit.agent_name)}`} />
            <span className="text-xs font-medium text-atelier-text-secondary truncate">
              {commit.agent_name}:
            </span>
            <span className="text-xs text-atelier-text-muted truncate flex-1">
              "{commit.message}"
            </span>
            <span className="text-xs text-atelier-text-muted/60 flex-shrink-0 ml-auto font-mono">
              {formatTime(commit.timestamp)}
            </span>
          </button>
          {expanded === commit.sha && commit.files_changed.length > 0 && (
            <div className="ml-6 mt-0.5 mb-1 text-xs text-atelier-text-muted space-y-0.5">
              {commit.files_changed.map((f) => (
                <div key={f} className="font-mono">{f}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
