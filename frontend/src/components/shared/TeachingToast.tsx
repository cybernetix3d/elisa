import { useState, useEffect } from 'react';
import type { TeachingMoment } from '../../types';

interface Props {
  moment: TeachingMoment | null;
  onDismiss: () => void;
}

export default function TeachingToast({ moment, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!moment) return;
    setExpanded(false);
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [moment, onDismiss]);

  if (!moment) return null;

  return (
    <div
      className="fixed right-4 top-20 w-80 bg-white border border-orange-200 rounded-lg shadow-lg p-4 z-50 transition-transform duration-300"
      role="alert"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-gray-800">{moment.headline}</p>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 ml-2"
          aria-label="Dismiss"
        >
          x
        </button>
      </div>
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
    </div>
  );
}
