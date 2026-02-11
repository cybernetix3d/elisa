# Getting Started

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | Required |
| npm | 10+ | Comes with Node.js |
| `ANTHROPIC_API_KEY` | -- | Environment variable. Get one at [console.anthropic.com](https://console.anthropic.com) |
| Claude CLI | Latest | `npm install -g @anthropic-ai/claude-code`. Agents spawn `claude` subprocesses. |
| Python + pytest | 3.10+ | Optional. Only needed if builds include test tasks. |
| ESP32 + mpremote | -- | Optional. Only needed for hardware deployment. `pip install mpremote` |

## Install and Run

```bash
# Clone the repo
git clone https://github.com/your-org/elisa.git
cd elisa

# Terminal 1: Backend
cd backend
npm install
npm run dev          # Starts on port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev          # Starts on port 5173, proxies API to 8000
```

Open `http://localhost:5173` in your browser.

## First Build Session

1. **Design** -- Drag blocks from the palette onto the canvas. At minimum, add a `project_goal` block with a description of what you want to build.
2. **Press Go** -- The large floating button sends your block workspace to the backend as a ProjectSpec JSON.
3. **Watch** -- The right sidebar shows a task dependency graph. Agents appear, pick up tasks, and stream output. The bottom bar fills with git commits, test results, and teaching moments.
4. **Interact** -- If you placed a "check with me" block, the build pauses with a modal asking for your approval. Agents may also ask questions mid-build.
5. **Done** -- When the session completes, you have a working project with git history.

## Troubleshooting

**Backend won't start** -- Confirm `ANTHROPIC_API_KEY` is set in your environment. The server needs it for the meta-planner and teaching engine.

**WebSocket disconnects** -- The frontend auto-reconnects. If the backend crashed, restart it and create a new session.

**"claude" command not found** -- Install the Claude CLI globally: `npm install -g @anthropic-ai/claude-code`. The agent runner spawns it as a subprocess.

**ESP32 not detected** -- Check USB connection. Supported chips: CP210x (Heltec WiFi LoRa 32 V3), ESP32-S3 Native USB, CH9102. Run `npx @anthropic-ai/claude-code` once to verify the CLI works before testing hardware flash.

**Tests fail with "pytest not found"** -- Install Python and pytest: `pip install pytest pytest-cov`. The test runner calls `pytest tests/ -v --cov=src`.

**Port conflicts** -- Backend defaults to 8000, frontend to 5173. Change in `backend/src/server.ts` and `frontend/vite.config.ts` respectively.
