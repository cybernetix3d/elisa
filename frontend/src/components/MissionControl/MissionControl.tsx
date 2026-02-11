import { useState } from 'react';
import type { NuggetSpec } from '../BlockCanvas/blockInterpreter';
import type { UIState, Task, Agent, WSEvent, TokenUsage } from '../../types';
import TaskDAG from './TaskDAG';
import CommsFeed from './CommsFeed';
import MetricsPanel from './MetricsPanel';
import AgentAvatar from '../shared/AgentAvatar';

interface MissionControlProps {
  spec: NuggetSpec | null;
  tasks: Task[];
  agents: Agent[];
  events: WSEvent[];
  uiState: UIState;
  tokenUsage: TokenUsage;
  deployProgress?: { step: string; progress: number } | null;
}

export default function MissionControl({ spec, tasks, agents, events, uiState, tokenUsage, deployProgress }: MissionControlProps) {
  const [debugOpen, setDebugOpen] = useState(false);

  const displayAgents = agents.length > 0 ? agents : (spec?.agents ?? []).map(a => ({
    ...a,
    status: 'idle' as const,
  }));

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const isPlanning = uiState === 'building' && tasks.length === 0;

  const isDeploying = uiState === 'building' && deployProgress != null;

  const getPhaseText = () => {
    if (uiState === 'done') return 'Done!';
    if (isDeploying) return deployProgress!.step;
    if (isPlanning) return 'Planning...';
    if (totalCount > 0) {
      const inProgress = tasks.find(t => t.status === 'in_progress');
      if (inProgress) return `Building (${doneCount}/${totalCount})... ${inProgress.name}`;
      return `Building (${doneCount}/${totalCount})...`;
    }
    return `State: ${uiState}`;
  };

  const getProgressBarGradient = () => {
    if (uiState === 'done') return 'bg-gradient-to-r from-accent-mint to-accent-mint/70';
    if (isDeploying) return 'bg-gradient-to-r from-accent-lavender to-accent-lavender/70';
    if (tasks.some(t => t.status === 'failed')) return 'bg-gradient-to-r from-accent-gold to-accent-coral';
    return 'bg-gradient-to-r from-accent-sky to-accent-lavender';
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <h2 className="text-lg font-display font-semibold text-atelier-text">Mission Control</h2>

      <section>
        <h3 className="text-xs font-semibold text-atelier-text-muted uppercase tracking-wider mb-2">Agent Team</h3>
        {displayAgents.length ? (
          <ul className="text-sm space-y-1.5">
            {displayAgents.map((a, i) => (
              <li key={i} className="flex items-center gap-2.5 px-3 py-1.5 bg-atelier-surface/60 rounded-lg border border-border-subtle">
                <AgentAvatar name={a.name} role={a.role as Agent['role']} status={a.status as Agent['status']} size="sm" />
                <span className="text-atelier-text-secondary">{a.name}</span>
                <span className="text-atelier-text-muted text-xs ml-auto">{a.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-atelier-text-muted">No agents added yet</p>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-atelier-text-muted uppercase tracking-wider mb-2">Task Map</h3>
        {tasks.length > 0 ? (
          <TaskDAG tasks={tasks} />
        ) : (
          <p className="text-sm text-atelier-text-muted">Tasks will appear here during a build</p>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-atelier-text-muted uppercase tracking-wider mb-2">Progress</h3>
        {isDeploying ? (
          <div>
            <p className="text-sm text-accent-lavender font-medium mb-1.5">{getPhaseText()}</p>
            <div className="w-full h-1.5 bg-atelier-surface rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarGradient()} transition-all duration-300 rounded-full`}
                style={{ width: `${deployProgress!.progress}%` }}
              />
            </div>
          </div>
        ) : isPlanning ? (
          <p className="text-sm text-accent-sky font-medium">{getPhaseText()}</p>
        ) : totalCount > 0 ? (
          <div>
            <p className="text-sm text-atelier-text-secondary mb-1.5">{getPhaseText()}</p>
            <div className="w-full h-1.5 bg-atelier-surface rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressBarGradient()} transition-all duration-300 rounded-full`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : uiState === 'done' ? (
          <p className="text-sm text-accent-mint font-bold">{getPhaseText()}</p>
        ) : (
          <p className="text-sm text-atelier-text-muted">{getPhaseText()}</p>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-atelier-text-muted uppercase tracking-wider mb-2">Comms Feed</h3>
        <CommsFeed events={events} />
      </section>

      <section>
        <h3 className="text-xs font-semibold text-atelier-text-muted uppercase tracking-wider mb-2">Token Usage</h3>
        <MetricsPanel tokenUsage={tokenUsage} />
      </section>

      <section>
        <button
          onClick={() => setDebugOpen(!debugOpen)}
          className="text-xs text-atelier-text-muted hover:text-atelier-text-secondary underline transition-colors"
        >
          {debugOpen ? 'Hide' : 'Show'} Debug Spec
        </button>
        {debugOpen && spec && (
          <pre className="mt-2 text-xs bg-atelier-surface/80 text-atelier-text-secondary p-3 rounded-lg overflow-auto max-h-64 font-mono border border-border-subtle">
            {JSON.stringify(spec, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}
