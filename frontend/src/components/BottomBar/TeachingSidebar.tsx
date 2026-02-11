import { useState } from 'react';
import type { TeachingMoment } from '../../types';

interface Props {
  moments: TeachingMoment[];
}

function MomentCard({ moment, isLatest }: { moment: TeachingMoment; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`p-3 rounded border ${isLatest ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
      <p className="text-sm font-semibold text-gray-800">{moment.headline}</p>
      <p className="text-xs text-gray-600 mt-1">{moment.explanation}</p>
      {moment.tell_me_more && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-orange-600 hover:text-orange-700 mt-1 underline"
          >
            {expanded ? 'Show less' : 'Tell me more'}
          </button>
          {expanded && (
            <p className="text-xs text-gray-500 mt-1">{moment.tell_me_more}</p>
          )}
        </>
      )}
      {moment.related_concepts && moment.related_concepts.length > 0 && (
        <div className="flex gap-1 mt-2">
          {moment.related_concepts.map((rc, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
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
    return <p className="text-sm text-gray-400 p-4">Teaching moments will appear as you build</p>;
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
