import { useState, useCallback, useEffect, useRef } from 'react';
import BlockCanvas from './components/BlockCanvas/BlockCanvas';
import type { BlockCanvasHandle } from './components/BlockCanvas/BlockCanvas';
import { interpretWorkspace, migrateWorkspace, type NuggetSpec } from './components/BlockCanvas/blockInterpreter';
import MissionControl from './components/MissionControl/MissionControl';
import BottomBar from './components/BottomBar/BottomBar';
import GoButton from './components/shared/GoButton';
import TeachingToast from './components/shared/TeachingToast';
import HumanGateModal from './components/shared/HumanGateModal';
import QuestionModal from './components/shared/QuestionModal';
import SkillsRulesModal from './components/Skills/SkillsRulesModal';
import PortalsModal from './components/Portals/PortalsModal';
import ExamplePickerModal from './components/shared/ExamplePickerModal';
import { EXAMPLE_NUGGETS } from './lib/examples';
import { useWebSocket } from './hooks/useWebSocket';
import { useBuildSession } from './hooks/useBuildSession';
import { useHealthCheck } from './hooks/useHealthCheck';
import ReadinessBadge from './components/shared/ReadinessBadge';
import { saveNuggetFile, loadNuggetFile, downloadBlob } from './lib/nuggetFile';
import type { TeachingMoment } from './types';
import elisaLogo from '../assets/Elisa.png';
import type { Skill, Rule } from './components/Skills/types';
import type { Portal } from './components/Portals/types';

const LS_WORKSPACE = 'elisa:workspace';
const LS_SKILLS = 'elisa:skills';
const LS_RULES = 'elisa:rules';
const LS_PORTALS = 'elisa:portals';

function readLocalStorageJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // corrupted data -- ignore
  }
  return null;
}

export default function App() {
  const [spec, setSpec] = useState<NuggetSpec | null>(null);
  const {
    uiState, tasks, agents, commits, events, sessionId,
    teachingMoments, testResults, coveragePct, tokenUsage,
    serialLines, deployProgress, gateRequest, questionRequest,
    handleEvent, startBuild, clearGateRequest, clearQuestionRequest,
  } = useBuildSession();
  useWebSocket({ sessionId, onEvent: handleEvent });
  const { health, loading: healthLoading } = useHealthCheck(uiState === 'design');

  // Restore skills/rules from localStorage on mount
  const [skills, setSkills] = useState<Skill[]>(() => readLocalStorageJson<Skill[]>(LS_SKILLS) ?? []);
  const [rules, setRules] = useState<Rule[]>(() => readLocalStorageJson<Rule[]>(LS_RULES) ?? []);
  const [portals, setPortals] = useState<Portal[]>(() => readLocalStorageJson<Portal[]>(LS_PORTALS) ?? []);
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [portalsModalOpen, setPortalsModalOpen] = useState(false);
  const [examplePickerOpen, setExamplePickerOpen] = useState(false);

  // The latest workspace JSON for saving nuggets
  const [workspaceJson, setWorkspaceJson] = useState<Record<string, unknown> | null>(null);

  // Saved workspace loaded from localStorage (read once on mount, passed to BlockCanvas)
  const [initialWorkspace] = useState<Record<string, unknown> | null>(
    () => {
      const ws = readLocalStorageJson<Record<string, unknown>>(LS_WORKSPACE);
      if (ws) migrateWorkspace(ws);
      return ws;
    },
  );

  // Open example picker on first launch (no saved workspace)
  useEffect(() => {
    if (!initialWorkspace) {
      setExamplePickerOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const blockCanvasRef = useRef<BlockCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Persist skills/rules to localStorage on change
  useEffect(() => {
    localStorage.setItem(LS_SKILLS, JSON.stringify(skills));
  }, [skills]);

  useEffect(() => {
    localStorage.setItem(LS_RULES, JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem(LS_PORTALS, JSON.stringify(portals));
  }, [portals]);

  const handleWorkspaceChange = useCallback((json: Record<string, unknown>) => {
    setSpec(interpretWorkspace(json, skills, rules, portals));
    setWorkspaceJson(json);
    try {
      localStorage.setItem(LS_WORKSPACE, JSON.stringify(json));
    } catch {
      // localStorage full or unavailable -- ignore
    }
  }, [skills, rules, portals]);

  const handleGo = async () => {
    if (!spec) return;
    lastToastIndexRef.current = -1;
    setCurrentToast(null);
    await startBuild(spec);
  };

  // -- Save Nugget --
  const handleSaveNugget = async () => {
    if (!workspaceJson) return;

    let outputArchive: Blob | undefined;
    if (sessionId) {
      try {
        const resp = await fetch(`/api/sessions/${sessionId}/export`);
        if (resp.ok) {
          outputArchive = await resp.blob();
        }
      } catch {
        // no generated code available -- that's fine
      }
    }

    const blob = await saveNuggetFile(workspaceJson, skills, rules, portals, outputArchive);
    const name = spec?.nugget.goal
      ? spec.nugget.goal.slice(0, 40).replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+$/, '')
      : 'nugget';
    downloadBlob(blob, `${name}.elisa`);
  };

  // -- Open Nugget --
  const handleOpenNugget = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await loadNuggetFile(file);

      // Migrate old block types in workspace
      migrateWorkspace(data.workspace);

      // Restore skills, rules, and portals
      setSkills(data.skills);
      setRules(data.rules);
      setPortals(data.portals);

      // Restore workspace via imperative handle
      setWorkspaceJson(data.workspace);
      blockCanvasRef.current?.loadWorkspace(data.workspace);

      // Update localStorage
      localStorage.setItem(LS_WORKSPACE, JSON.stringify(data.workspace));
      localStorage.setItem(LS_SKILLS, JSON.stringify(data.skills));
      localStorage.setItem(LS_RULES, JSON.stringify(data.rules));
      localStorage.setItem(LS_PORTALS, JSON.stringify(data.portals));
    } catch (err) {
      console.error('Failed to open nugget file:', err);
    }

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleSelectExample = useCallback((example: typeof EXAMPLE_NUGGETS[number]) => {
    setSkills(example.skills);
    setRules(example.rules);
    setPortals(example.portals);
    setWorkspaceJson(example.workspace);
    blockCanvasRef.current?.loadWorkspace(example.workspace);
    localStorage.setItem(LS_WORKSPACE, JSON.stringify(example.workspace));
    localStorage.setItem(LS_SKILLS, JSON.stringify(example.skills));
    localStorage.setItem(LS_RULES, JSON.stringify(example.rules));
    localStorage.setItem(LS_PORTALS, JSON.stringify(example.portals));
    setExamplePickerOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-screen atelier-bg noise-overlay text-atelier-text">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-2.5 glass-panel border-t-0 border-x-0">
        <div className="flex items-center gap-3">
          <img src={elisaLogo} alt="Elisa logo" className="h-8 w-8 rounded-full ring-2 ring-accent-lavender/30" />
          <h1 className="text-xl font-display font-bold tracking-tight gradient-text-warm">Elisa</h1>
        </div>
        <nav className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm rounded-lg bg-atelier-surface/80 text-atelier-text-secondary hover:bg-atelier-elevated hover:text-atelier-text transition-colors font-medium"
          >
            Open
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".elisa"
            className="hidden"
            onChange={handleOpenNugget}
          />
          <button
            onClick={handleSaveNugget}
            disabled={!workspaceJson}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              workspaceJson
                ? 'bg-atelier-surface/80 text-atelier-text-secondary hover:bg-atelier-elevated hover:text-atelier-text'
                : 'bg-atelier-surface/40 text-atelier-text-muted cursor-not-allowed'
            }`}
          >
            Save
          </button>
          <button
            onClick={() => setSkillsModalOpen(true)}
            className="px-3 py-1.5 text-sm rounded-lg bg-accent-lavender/15 text-accent-lavender hover:bg-accent-lavender/25 transition-colors font-medium"
          >
            Skills
          </button>
          <button
            onClick={() => setPortalsModalOpen(true)}
            className="px-3 py-1.5 text-sm rounded-lg bg-accent-sky/15 text-accent-sky hover:bg-accent-sky/25 transition-colors font-medium"
          >
            Portals
          </button>
          <button
            onClick={() => setExamplePickerOpen(true)}
            className="px-3 py-1.5 text-sm rounded-lg bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25 transition-colors font-medium"
          >
            Examples
          </button>
          <button className="px-3 py-1.5 text-sm rounded-lg bg-atelier-surface/40 text-atelier-text-muted cursor-not-allowed font-medium">
            Help
          </button>
        </nav>
        <ReadinessBadge health={health} loading={healthLoading} />
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Left: BlockCanvas */}
        <div className="flex-1 relative">
          <BlockCanvas
            ref={blockCanvasRef}
            onWorkspaceChange={handleWorkspaceChange}
            readOnly={uiState !== 'design'}
            skills={skills}
            rules={rules}
            portals={portals}
            initialWorkspace={initialWorkspace}
          />
        </div>

        {/* Right: Mission Control */}
        <div className="w-80 glass-panel border-t-0 border-b-0 border-r-0 overflow-y-auto">
          <MissionControl
            spec={spec}
            tasks={tasks}
            agents={agents}
            events={events}
            uiState={uiState}
            tokenUsage={tokenUsage}
            deployProgress={deployProgress}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <BottomBar
        commits={commits}
        testResults={testResults}
        coveragePct={coveragePct}
        teachingMoments={teachingMoments}
        serialLines={serialLines}
      />

      {/* Human gate modal */}
      {gateRequest && sessionId && (
        <HumanGateModal
          taskId={gateRequest.task_id}
          question={gateRequest.question}
          context={gateRequest.context}
          sessionId={sessionId}
          onClose={clearGateRequest}
        />
      )}

      {/* Question modal */}
      {questionRequest && sessionId && (
        <QuestionModal
          taskId={questionRequest.task_id}
          questions={questionRequest.questions}
          sessionId={sessionId}
          onClose={clearQuestionRequest}
        />
      )}

      {/* Skills & Rules modal */}
      {skillsModalOpen && (
        <SkillsRulesModal
          skills={skills}
          rules={rules}
          onSkillsChange={setSkills}
          onRulesChange={setRules}
          onClose={() => setSkillsModalOpen(false)}
        />
      )}

      {/* Portals modal */}
      {portalsModalOpen && (
        <PortalsModal
          portals={portals}
          onPortalsChange={setPortals}
          onClose={() => setPortalsModalOpen(false)}
        />
      )}

      {/* Example picker modal */}
      {examplePickerOpen && (
        <ExamplePickerModal
          examples={EXAMPLE_NUGGETS}
          onSelect={handleSelectExample}
          onClose={() => setExamplePickerOpen(false)}
        />
      )}

      {/* Done mode overlay */}
      {uiState === 'done' && (
        <div className="fixed inset-0 modal-backdrop z-40 flex items-center justify-center">
          <div className="glass-elevated rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center animate-float-in">
            <h2 className="text-2xl font-display font-bold mb-4 gradient-text-warm">Nugget Complete!</h2>
            <p className="text-atelier-text-secondary mb-4">
              {events.find(e => e.type === 'session_complete')?.type === 'session_complete'
                ? (events.find(e => e.type === 'session_complete') as { type: 'session_complete'; summary: string }).summary
                : 'Your nugget has been built successfully.'}
            </p>
            {teachingMoments.length > 0 && (
              <div className="text-left mb-4 bg-accent-lavender/10 rounded-xl p-4 border border-accent-lavender/20">
                <h3 className="text-sm font-semibold text-accent-lavender mb-2">What you learned:</h3>
                <ul className="text-sm text-atelier-text-secondary space-y-1">
                  {teachingMoments.map((m, i) => (
                    <li key={i}>- {m.headline}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="go-btn px-6 py-2.5 rounded-xl text-sm cursor-pointer"
            >
              Build something new
            </button>
          </div>
        </div>
      )}

      {/* Teaching toast overlay */}
      <TeachingToast moment={currentToast} onDismiss={handleDismissToast} />

      {/* Footer with GO button */}
      <footer className="relative z-10 flex items-center justify-center px-4 py-3 glass-panel border-b-0 border-x-0">
        <GoButton
          disabled={uiState !== 'design' || !spec?.nugget.goal}
          onClick={handleGo}
        />
      </footer>
    </div>
  );
}
