import { useState, useCallback, useEffect, useRef } from 'react';
import BlockCanvas from './components/BlockCanvas/BlockCanvas';
import { interpretWorkspace, type ProjectSpec } from './components/BlockCanvas/blockInterpreter';
import MissionControl from './components/MissionControl/MissionControl';
import BottomBar from './components/BottomBar/BottomBar';
import GoButton from './components/shared/GoButton';
import TeachingToast from './components/shared/TeachingToast';
import { useWebSocket } from './hooks/useWebSocket';
import { useBuildSession } from './hooks/useBuildSession';
import type { TeachingMoment } from './types';

export default function App() {
  const [spec, setSpec] = useState<ProjectSpec | null>(null);
  const {
    uiState, tasks, agents, commits, events, sessionId,
    teachingMoments, testResults, coveragePct, tokenUsage,
    handleEvent, startBuild,
  } = useBuildSession();
  const { connected } = useWebSocket({ sessionId, onEvent: handleEvent });

  const [currentToast, setCurrentToast] = useState<TeachingMoment | null>(null);
  const lastToastIndexRef = useRef(-1);

  // Show toast when a new teaching moment arrives
  useEffect(() => {
    const latestIndex = teachingMoments.length - 1;
    if (latestIndex > lastToastIndexRef.current && teachingMoments.length > 0) {
      setCurrentToast(teachingMoments[latestIndex]);
      lastToastIndexRef.current = latestIndex;
    }
  }, [teachingMoments]);

  const handleDismissToast = useCallback(() => {
    setCurrentToast(null);
  }, []);

  const handleWorkspaceChange = useCallback((json: Record<string, unknown>) => {
    setSpec(interpretWorkspace(json));
  }, []);

  const handleGo = async () => {
    if (!spec) return;
    lastToastIndexRef.current = -1;
    setCurrentToast(null);
    await startBuild(spec);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold tracking-tight">Elisa</h1>
        <nav className="flex gap-2">
          <button className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-500 cursor-not-allowed">
            My Projects
          </button>
          <button className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-500 cursor-not-allowed">
            Settings
          </button>
          <button className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-500 cursor-not-allowed">
            Help
          </button>
        </nav>
        <span className={`text-xs px-2 py-1 rounded ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: BlockCanvas */}
        <div className="flex-1 relative">
          <BlockCanvas onWorkspaceChange={handleWorkspaceChange} />
        </div>

        {/* Right: Mission Control */}
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <MissionControl
            spec={spec}
            tasks={tasks}
            agents={agents}
            events={events}
            uiState={uiState}
            tokenUsage={tokenUsage}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <BottomBar
        commits={commits}
        testResults={testResults}
        coveragePct={coveragePct}
        teachingMoments={teachingMoments}
      />

      {/* Teaching toast overlay */}
      <TeachingToast moment={currentToast} onDismiss={handleDismissToast} />

      {/* Footer with GO button */}
      <footer className="flex items-center justify-center px-4 py-3 bg-white border-t border-gray-200">
        <GoButton
          disabled={uiState !== 'design' || !spec?.project.goal}
          onClick={handleGo}
        />
      </footer>
    </div>
  );
}
