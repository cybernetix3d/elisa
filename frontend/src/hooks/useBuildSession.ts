import { useState, useCallback } from 'react';
import type { ProjectSpec } from '../components/BlockCanvas/blockInterpreter';
import type { UIState, Task, Agent, Commit, WSEvent, TeachingMoment, TestResult, TokenUsage } from '../types';

export function useBuildSession() {
  const [uiState, setUiState] = useState<UIState>('design');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [teachingMoments, setTeachingMoments] = useState<TeachingMoment[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [coveragePct, setCoveragePct] = useState<number | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({ input: 0, output: 0, total: 0, perAgent: {} });

  const handleEvent = useCallback((event: WSEvent) => {
    setEvents(prev => [...prev, event]);

    switch (event.type) {
      case 'plan_ready':
        setTasks(event.tasks);
        setAgents(event.agents);
        break;
      case 'task_started':
        setTasks(prev => prev.map(t =>
          t.id === event.task_id ? { ...t, status: 'in_progress' as const } : t
        ));
        setAgents(prev => prev.map(a =>
          a.name === event.agent_name ? { ...a, status: 'working' as const } : a
        ));
        break;
      case 'task_completed':
        setTasks(prev => prev.map(t =>
          t.id === event.task_id ? { ...t, status: 'done' as const } : t
        ));
        setAgents(prev => prev.map(a =>
          a.status === 'working' ? { ...a, status: 'idle' as const } : a
        ));
        break;
      case 'task_failed':
        setTasks(prev => prev.map(t =>
          t.id === event.task_id ? { ...t, status: 'failed' as const } : t
        ));
        setAgents(prev => prev.map(a =>
          a.status === 'working' ? { ...a, status: 'error' as const } : a
        ));
        break;
      case 'commit_created':
        setCommits(prev => [...prev, {
          sha: event.sha,
          message: event.message,
          agent_name: event.agent_name,
          task_id: event.task_id,
          timestamp: event.timestamp,
          files_changed: event.files_changed,
        }]);
        break;
      case 'session_complete':
        setUiState('done');
        setAgents(prev => prev.map(a => ({ ...a, status: 'done' as const })));
        break;
      case 'teaching_moment':
        setTeachingMoments(prev => [...prev, {
          concept: event.concept,
          headline: event.headline,
          explanation: event.explanation,
          tell_me_more: event.tell_me_more,
          related_concepts: event.related_concepts,
        }]);
        break;
      case 'test_result':
        setTestResults(prev => [...prev, {
          test_name: event.test_name,
          passed: event.passed,
          details: event.details,
        }]);
        break;
      case 'coverage_update':
        setCoveragePct(event.percentage);
        break;
      case 'token_usage':
        setTokenUsage(prev => {
          const newInput = prev.input + event.input_tokens;
          const newOutput = prev.output + event.output_tokens;
          const agentPrev = prev.perAgent[event.agent_name] || { input: 0, output: 0 };
          return {
            input: newInput,
            output: newOutput,
            total: newInput + newOutput,
            perAgent: {
              ...prev.perAgent,
              [event.agent_name]: {
                input: agentPrev.input + event.input_tokens,
                output: agentPrev.output + event.output_tokens,
              },
            },
          };
        });
        break;
    }
  }, []);

  const startBuild = useCallback(async (spec: ProjectSpec) => {
    setUiState('building');
    setEvents([]);
    setTasks([]);
    setAgents([]);
    setCommits([]);
    setTeachingMoments([]);
    setTestResults([]);
    setCoveragePct(null);
    setTokenUsage({ input: 0, output: 0, total: 0, perAgent: {} });

    const res = await fetch('/api/sessions', { method: 'POST' });
    const { session_id } = await res.json();
    setSessionId(session_id);

    // Small delay to let WebSocket connect before starting
    await new Promise(r => setTimeout(r, 500));

    await fetch(`/api/sessions/${session_id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spec }),
    });
  }, []);

  return { uiState, tasks, agents, commits, events, sessionId, teachingMoments, testResults, coveragePct, tokenUsage, handleEvent, startBuild };
}
