import { useState, useEffect, useRef, useCallback } from 'react';

export interface HealthStatus {
  status: 'ready' | 'degraded' | 'offline';
  apiKey: 'valid' | 'invalid' | 'missing' | 'unchecked';
  apiKeyError?: string;
  agentSdk: 'available' | 'not_found';
}

const POLL_INTERVAL = 30_000;

export function useHealthCheck(enabled: boolean) {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'offline',
    apiKey: 'unchecked',
    agentSdk: 'not_found',
  });
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data as HealthStatus);
    } catch {
      setHealth({ status: 'offline', apiKey: 'unchecked', agentSdk: 'not_found' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetchHealth();
    timerRef.current = setInterval(fetchHealth, POLL_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, fetchHealth]);

  return { health, loading };
}
