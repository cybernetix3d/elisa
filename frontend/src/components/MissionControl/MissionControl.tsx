import { useState, useRef, useEffect } from 'react';
import type { ProjectSpec } from '../BlockCanvas/blockInterpreter';
import type { UIState, Task, Agent, WSEvent } from '../../types';
import TaskDAG from './TaskDAG';

interface MissionControlProps {
  spec: ProjectSpec | null;
  tasks: Task[];
  agents: Agent[];
  events: WSEvent[];
  uiState: UIState;
}

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-gray-400',
  working: 'bg-blue-500 animate-pulse',
  done: 'bg-green-500',
  error: 'bg-red-500',
};

export default function MissionControl({ spec, tasks, agents, events, uiState }: MissionControlProps) {
  const [debugOpen, setDebugOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const agentOutputs = events.filter(
    (e): e is Extract<WSEvent, { type: 'agent_output' }> => e.type === 'agent_output'
  );

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [agentOutputs.length]);

  const displayAgents = agents.length > 0 ? agents : (spec?.agents ?? []).map(a => ({
    ...a,
    status: 'idle' as const,
  }));

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const isPlanning = uiState === 'building' && tasks.length === 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">Mission Control</h2>

      <section>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Agent Team</h3>
        {displayAgents.length ? (
          <ul className="text-sm space-y-1">
            {displayAgents.map((a, i) => (
              <li key={i} className="flex items-center gap-2 px-2 py-1 bg-orange-50 rounded">
                <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[a.status] || STATUS_DOT.idle}`} />
                <span>{a.name} ({a.role})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No agents added yet</p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Task Map</h3>
        {tasks.length > 0 ? (
          <TaskDAG tasks={tasks} />
        ) : (
          <p className="text-sm text-gray-400">Tasks will appear here during a build</p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Progress</h3>
        {isPlanning ? (
          <p className="text-sm text-blue-500 font-medium">Planning...</p>
        ) : totalCount > 0 ? (
          <div>
            <p className="text-sm text-gray-600 mb-1">{doneCount} / {totalCount} tasks</p>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            State: <span className="font-mono">{uiState}</span>
          </p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Comms Feed</h3>
        {agentOutputs.length > 0 ? (
          <div ref={feedRef} className="max-h-48 overflow-y-auto">
            <ul className="text-xs space-y-1">
              {agentOutputs.map((e, i) => (
                <li key={i} className="px-2 py-1 bg-gray-50 rounded font-mono">
                  <span className="text-orange-600 font-semibold">{e.agent_name}: </span>
                  {e.content}
                </li>
              ))}
            </ul>
          </div>
        ) : events.length > 0 ? (
          <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
            {events.map((e, i) => (
              <li key={i} className="px-2 py-1 bg-gray-50 rounded font-mono">
                {e.type}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No events yet</p>
        )}
      </section>

      <section>
        <button
          onClick={() => setDebugOpen(!debugOpen)}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          {debugOpen ? 'Hide' : 'Show'} Debug Spec
        </button>
        {debugOpen && spec && (
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
            {JSON.stringify(spec, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}
