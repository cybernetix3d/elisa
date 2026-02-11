import { useState } from 'react';
import type { TeachingMoment } from '../../types';

interface Props {
  moments: TeachingMoment[];
}

function MomentCard({ moment, isLatest }: { moment: TeachingMoment; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`p-3 rounded-xl border ${isLatest ? 'bg-accent-gold/10 border-accent-gold/30' : 'bg-atelier-surface/50 border-border-subtle'}`}>
      <p className="text-sm font-semibold text-atelier-text">{moment.headline}</p>
      <p className="text-xs text-atelier-text-secondary mt-1">{moment.explanation}</p>
      {moment.tell_me_more && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent-gold hover:text-accent-gold/80 mt-1 underline transition-colors"
          >
            {expanded ? 'Show less' : 'Tell me more'}
          </button>
          {expanded && (
            <p className="text-xs text-atelier-text-muted mt-1">{moment.tell_me_more}</p>
          )}
        </>
      )}
      {moment.related_concepts && moment.related_concepts.length > 0 && (
        <div className="flex gap-1 mt-2">
          {moment.related_concepts.map((rc, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-atelier-elevated text-atelier-text-muted rounded-full">
              {rc}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeachingSidebar({ moments }: Props) {
  if (moments.length === 0) {
    return <p className="text-sm text-atelier-text-muted p-4">Teaching moments will appear as you build</p>;
  }

  const reversed = [...moments].reverse();

  return (
    <div className="p-4 space-y-2 overflow-y-auto">
      {reversed.map((m, i) => (
        <MomentCard key={i} moment={m} isLatest={i === 0} />
      ))}
    </div>
  );
}
