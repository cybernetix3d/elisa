# Zea Web Deployment — Fixes Required

## Current Architecture Issues

The app was designed for **Electron + local backend**. When deployed to Vercel (frontend) + Railway (backend), these things break:

### CRITICAL (app won't work at all)
1. **CORS doesn't handle preflight** — The CORS middleware doesn't respond to OPTIONS requests properly. Browser preflight requests will fail.
2. **Health check goes to wrong URL** — FIXED ✅
3. **GO button requires folder** — FIXED ✅ (skips folder picker in web mode)
4. **Web preview spawns localhost server** — DeployPhase.deployWeb() starts `npx serve` on Railway, generating a `localhost:3000` URL that's unreachable from the user's browser.

### HIGH (core features broken)
5. **Folder button doesn't work** — Opens a text input asking for a server-side path. Should be hidden in web mode.
6. **Save with workspace path tries server filesystem** — Save should always use download mode in web mode.
7. **Auth token hardcoded** — Frontend uses `dev-token` when no Electron API. This works but isn't secure for production.

### MEDIUM (features degraded)
8. **Portals (serial/hardware)** — Serial ports don't exist on Railway. Hardware deploy is impossible. These features should be hidden or show a message.
9. **No way to download built project** — After build, user needs to get their files. The export ZIP endpoint exists but there's no UI for it in web mode.
10. **Preview URL unreachable** — Even if `npx serve` runs on Railway, the URL is localhost on the server, not accessible to the user.

### LOW (nice to have)
11. **No settings page** — No way to see connection status, configure preferences, etc.
12. **Board detection** — useBoardDetect polls for serial ports which don't exist on Railway.

## Task List

### Task 1: Fix CORS for preflight requests ⚡
- The CORS middleware must handle OPTIONS requests BEFORE the auth middleware intercepts them
- Add explicit OPTIONS handler that returns 200

### Task 2: Hide local-only features in web mode ⚡
- Hide "Folder" button when not in Electron
- Make "Save" always use download mode (never filesystem save)
- Hide hardware/board-related UI (Board tab, board detection)

### Task 3: Fix web preview for deployed mode
- Instead of spawning `npx serve` locally, serve the built files through the Express API
- Add `/api/sessions/:id/preview/*` endpoint that serves files from the nugget directory
- Frontend opens preview in an iframe pointing to this API endpoint

### Task 4: Add "Download Project" button after build
- Show a download button when build completes
- Uses the existing `/api/sessions/:id/export` endpoint to download a ZIP
- Prominent in the UI so users can get their code

### Task 5: Disable hardware features gracefully
- Portals with mechanism=serial should show "Not available in web mode"
- Board detection polling should be disabled
- Hardware deploy options should be hidden
