import { useRef, useEffect } from 'react';
import type { WSEvent } from '../../types';

interface Props {
  events: WSEvent[];
}

type CommEvent =
  | Extract<WSEvent, { type: 'agent_output' }>
  | Extract<WSEvent, { type: 'agent_message' }>;

function isCommEvent(e: WSEvent): e is CommEvent {
  return e.type === 'agent_output' || e.type === 'agent_message';
}

function getAgentName(e: CommEvent): string {
  if (e.type === 'agent_output') return e.agent_name;
  return e.from;
}

function getContent(e: CommEvent): string {
  if (e.type === 'agent_output') return e.content;
  return e.content;
}

export default function CommsFeed({ events }: Props) {
  const feedRef = useRef<HTMLDivElement>(null);
  const commEvents = events.filter(isCommEvent);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [commEvents.length]);

  if (commEvents.length === 0) {
    return <p className="text-sm text-gray-400">No messages yet</p>;
  }

  return (
    <div ref={feedRef} className="max-h-48 overflow-y-auto">
      <ul className="text-xs space-y-1">
        {commEvents.map((e, i) => (
          <li key={i} className="px-2 py-1 bg-gray-50 rounded font-mono">
            <span className={`font-semibold ${e.type === 'agent_message' ? 'text-blue-600' : 'text-orange-600'}`}>
              {getAgentName(e)}:{' '}
            </span>
            {getContent(e)}
          </li>
        ))}
      </ul>
    </div>
  );
}
