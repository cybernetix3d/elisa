import { useState, useCallback, useRef, useEffect } from 'react';
import type { SkillPlan } from '../components/Skills/types';
import type { WSEvent, QuestionPayload } from '../types';

export interface SkillStepProgress {
  stepId: string;
  stepType: string;
  status: 'started' | 'completed' | 'failed';
}

export interface SkillQuestionRequest {
  stepId: string;
  questions: QuestionPayload[];
}

export function useSkillSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<SkillStepProgress[]>([]);
  const [questionRequest, setQuestionRequest] = useState<SkillQuestionRequest | null>(null);
  const [outputs, setOutputs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const handleEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case 'skill_started':
        setRunning(true);
        setResult(null);
        setError(null);
        break;
      case 'skill_step':
        setSteps(prev => {
          const existing = prev.findIndex(s => s.stepId === event.step_id);
          const entry: SkillStepProgress = {
            stepId: event.step_id,
            stepType: event.step_type,
            status: event.status,
          };
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = entry;
            return updated;
          }
          return [...prev, entry];
        });
        break;
      case 'skill_question':
        setQuestionRequest({
          stepId: event.step_id,
          questions: event.questions,
        });
        break;
      case 'skill_output':
        setOutputs(prev => [...prev, event.content]);
        break;
      case 'skill_completed':
        setRunning(false);
        setResult(event.result);
        break;
      case 'skill_error':
        setRunning(false);
        setError(event.message);
        break;
    }
  }, []);

  const connectWebSocket = useCallback((sid: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/session/${sid}`;
    const ws = new WebSocket(url);
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as WSEvent;
        handleEvent(data);
      } catch {
        // ignore
      }
    };
    wsRef.current = ws;
  }, [handleEvent]);

  const startRun = useCallback(async (plan: SkillPlan, allSkills: Array<{ id: string; name: string; prompt: string; category: string; workspace?: Record<string, unknown> }>) => {
    setSteps([]);
    setOutputs([]);
    setResult(null);
    setError(null);
    setQuestionRequest(null);

    const res = await fetch('/api/skills/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, allSkills }),
    });
    const { session_id } = await res.json();
    setSessionId(session_id);
    connectWebSocket(session_id);
  }, [connectWebSocket]);

  const answerQuestion = useCallback(async (stepId: string, answers: Record<string, any>) => {
    if (!sessionId) return;
    await fetch(`/api/skills/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step_id: stepId, answers }),
    });
    setQuestionRequest(null);
  }, [sessionId]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    sessionId,
    running,
    result,
    error,
    steps,
    outputs,
    questionRequest,
    startRun,
    answerQuestion,
  };
}
