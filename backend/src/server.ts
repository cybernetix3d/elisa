/** Express + WebSocket server -- replaces FastAPI main.py. */

import { randomUUID } from 'node:crypto';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'node:http';
import type { BuildSession, SessionState } from './models/session.js';
import { Orchestrator } from './services/orchestrator.js';
import { HardwareService } from './services/hardwareService.js';

// -- State --

const sessions = new Map<string, BuildSession>();
const orchestrators = new Map<string, Orchestrator>();
const runningTasks = new Map<string, { cancel: () => void }>();
const hardwareService = new HardwareService();

// -- WebSocket Connection Manager --

class ConnectionManager {
  private connections = new Map<string, Set<WebSocket>>();

  connect(sessionId: string, ws: WebSocket): void {
    if (!this.connections.has(sessionId)) {
      this.connections.set(sessionId, new Set());
    }
    this.connections.get(sessionId)!.add(ws);
  }

  disconnect(sessionId: string, ws: WebSocket): void {
    this.connections.get(sessionId)?.delete(ws);
  }

  async sendEvent(sessionId: string, event: Record<string, any>): Promise<void> {
    const conns = this.connections.get(sessionId);
    if (!conns) return;
    const data = JSON.stringify(event);
    for (const ws of conns) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      } catch {
        // ignore send errors
      }
    }
  }
}

const manager = new ConnectionManager();

// -- Express App --

const app = express();
app.use(express.json());

// CORS
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Create session
app.post('/api/sessions', (_req, res) => {
  const sessionId = randomUUID();
  sessions.set(sessionId, {
    id: sessionId,
    state: 'idle',
    spec: null,
    tasks: [],
    agents: [],
  });
  res.json({ session_id: sessionId });
});

// Get session
app.get('/api/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) { res.status(404).json({ detail: 'Session not found' }); return; }
  res.json(session);
});

// Start session
app.post('/api/sessions/:id/start', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) { res.status(404).json({ detail: 'Session not found' }); return; }

  const spec = req.body.spec;
  session.state = 'planning';
  session.spec = spec;

  const orchestrator = new Orchestrator(
    session,
    (evt) => manager.sendEvent(req.params.id, evt),
  );
  orchestrators.set(req.params.id, orchestrator);

  // Run in background
  let cancelled = false;
  const promise = orchestrator.run(spec);
  promise.catch((err) => {
    if (!cancelled) console.error('Orchestrator run error:', err);
  });

  runningTasks.set(req.params.id, {
    cancel: () => { cancelled = true; },
  });

  res.json({ status: 'started' });
});

// Stop session
app.post('/api/sessions/:id/stop', async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) { res.status(404).json({ detail: 'Session not found' }); return; }

  const task = runningTasks.get(req.params.id);
  if (task) {
    task.cancel();
    runningTasks.delete(req.params.id);
  }

  session.state = 'done';
  await manager.sendEvent(req.params.id, {
    type: 'error',
    message: 'Build stopped by user',
    recoverable: false,
  });

  res.json({ status: 'stopped' });
});

// Get tasks
app.get('/api/sessions/:id/tasks', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) { res.status(404).json({ detail: 'Session not found' }); return; }
  res.json(session.tasks);
});

// Get git
app.get('/api/sessions/:id/git', (req, res) => {
  const orch = orchestrators.get(req.params.id);
  if (!orch) { res.status(404).json({ detail: 'Session not found' }); return; }
  res.json(orch.getCommits());
});

// Get tests
app.get('/api/sessions/:id/tests', (req, res) => {
  const orch = orchestrators.get(req.params.id);
  if (!orch) { res.status(404).json({ detail: 'Session not found' }); return; }
  res.json(orch.getTestResults());
});

// Gate response
app.post('/api/sessions/:id/gate', (req, res) => {
  const orch = orchestrators.get(req.params.id);
  if (!orch) { res.status(404).json({ detail: 'Session not found' }); return; }
  orch.respondToGate(req.body.approved ?? true, req.body.feedback ?? '');
  res.json({ status: 'ok' });
});

// Question response (NEW)
app.post('/api/sessions/:id/question', (req, res) => {
  const orch = orchestrators.get(req.params.id);
  if (!orch) { res.status(404).json({ detail: 'Session not found' }); return; }
  orch.respondToQuestion(req.body.task_id, req.body.answers ?? {});
  res.json({ status: 'ok' });
});

// Templates
app.get('/api/templates', (_req, res) => {
  res.json([]);
});

// Hardware detect
app.post('/api/hardware/detect', async (_req, res) => {
  const board = await hardwareService.detectBoard();
  if (board) {
    res.json({ detected: true, port: board.port, board_type: board.boardType });
  } else {
    res.json({ detected: false });
  }
});

// Hardware flash
app.post('/api/hardware/flash/:id', async (req, res) => {
  const orch = orchestrators.get(req.params.id);
  if (!orch) { res.status(404).json({ detail: 'Session not found' }); return; }
  const result = await hardwareService.flash(orch.projectDir);
  res.json({ success: result.success, message: result.message });
});

// -- HTTP + WebSocket Server --

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: undefined });

// Handle WebSocket upgrades on /ws/session/:id
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '', `http://${request.headers.host}`);
  const match = url.pathname.match(/^\/ws\/session\/(.+)$/);
  if (!match) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    const sessionId = match[1];
    manager.connect(sessionId, ws);
    ws.on('close', () => manager.disconnect(sessionId, ws));
    ws.on('message', () => {
      // Client keepalive; ignore content
    });
  });
});

const PORT = Number(process.env.PORT ?? 8000);
server.listen(PORT, () => {
  console.log(`Elisa backend listening on port ${PORT}`);
});
