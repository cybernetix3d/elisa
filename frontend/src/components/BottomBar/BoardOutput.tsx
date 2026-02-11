import { useRef, useEffect } from 'react';
import type { SerialLine } from '../../hooks/useBuildSession';

interface Props {
  serialLines: SerialLine[];
}

export default function BoardOutput({ serialLines }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [serialLines]);

  if (serialLines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-atelier-text-muted">
        Connect your board to see its output
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto terminal-panel font-mono text-xs p-3">
      {serialLines.map((entry, i) => {
        const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
        return (
          <div key={i} className="whitespace-pre-wrap">
            <span className="text-atelier-text-muted">{ts} </span>
            {entry.line}
          </div>
        );
      })}
    </div>
  );
}
