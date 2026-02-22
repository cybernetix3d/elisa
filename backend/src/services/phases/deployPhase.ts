/** Deploy phase: handles hardware flash, portal deployment, and web preview. */

import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { safeEnv } from '../../utils/safeEnv.js';
import { BUILD_TIMEOUT_MS } from '../../utils/constants.js';
import { findFreePort } from '../../utils/findFreePort.js';
import type { PhaseContext } from './types.js';
import { maybeTeach } from './types.js';
import { HardwareService } from '../hardwareService.js';
import { PortalService } from '../portalService.js';
import { TeachingEngine } from '../teachingEngine.js';

export class DeployPhase {
  private hardwareService: HardwareService;
  private portalService: PortalService;
  private teachingEngine: TeachingEngine;

  constructor(
    hardwareService: HardwareService,
    portalService: PortalService,
    teachingEngine: TeachingEngine,
  ) {
    this.hardwareService = hardwareService;
    this.portalService = portalService;
    this.teachingEngine = teachingEngine;
  }

  private async sendDeployChecklist(ctx: PhaseContext): Promise<void> {
    const specData = ctx.session.spec ?? {};
    const deployRules = (specData.rules ?? []).filter(
      (r: any) => r.trigger === 'before_deploy',
    );
    if (deployRules.length) {
      await ctx.send({
        type: 'deploy_checklist',
        rules: deployRules.map((r: any) => ({ name: r.name, prompt: r.prompt })),
      });
    }
  }

  shouldDeployWeb(ctx: PhaseContext): boolean {
    const spec = ctx.session.spec ?? {};
    const target = spec.deployment?.target ?? 'preview';
    return target === 'web' || target === 'both' || target === 'preview';
  }

  async deployWeb(ctx: PhaseContext): Promise<{ process: ChildProcess | null; url: string | null }> {
    ctx.session.state = 'deploying';
    await ctx.send({ type: 'deploy_started', target: 'web' });

    await this.sendDeployChecklist(ctx);

    await ctx.send({ type: 'deploy_progress', step: 'Preparing web preview...', progress: 10 });

    // Run build if package.json has a build script
    const pkgPath = path.join(ctx.nuggetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.scripts?.build) {
          await ctx.send({ type: 'deploy_progress', step: 'Running build...', progress: 30 });
          await new Promise<void>((resolve, reject) => {
            const isWin = process.platform === 'win32';
            const buildProc = spawn('npm', ['run', 'build'], {
              cwd: ctx.nuggetDir,
              stdio: 'pipe',
              shell: isWin,
              env: safeEnv(),
            });
            let stderr = '';
            buildProc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk; });
            buildProc.on('close', (code) => {
              if (code === 0) resolve();
              else reject(new Error(`Build failed (exit ${code}): ${stderr.slice(0, 500)}`));
            });
            buildProc.on('error', reject);
            setTimeout(() => { buildProc.kill(); reject(new Error('Build timed out')); }, BUILD_TIMEOUT_MS);
          });
        }
      } catch (err: any) {
        await ctx.send({ type: 'deploy_progress', step: `Build warning: ${err.message}`, progress: 30 });
      }
    }

    await ctx.send({ type: 'deploy_progress', step: 'Preparing preview URL...', progress: 80 });

    let finalUrl = `/preview/${ctx.session.id}`;

    // Vercel Deployment
    if (ctx.vercelToken) {
      await ctx.send({ type: 'deploy_progress', step: 'Deploying to Vercel...', progress: 90 });
      try {
        const isWin = process.platform === 'win32';
        const vercelUrl = await new Promise<string>((resolve, reject) => {
          const vercelArgs = ['vercel', '--yes', '--prod', `--token=${ctx.vercelToken}`];
          if (ctx.appEnvVars) {
            for (const [key, value] of Object.entries(ctx.appEnvVars)) {
              vercelArgs.push('--build-env', `${key}=${value}`, '--env', `${key}=${value}`);
            }
          }

          const vProc = spawn('npx', vercelArgs, {
            cwd: ctx.nuggetDir,
            stdio: 'pipe',
            shell: isWin,
            env: safeEnv(),
          });
          let out = '';
          vProc.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
          vProc.stderr?.on('data', (d: Buffer) => { out += d.toString(); });
          vProc.on('close', (code) => {
            if (code === 0) {
              const matches = out.match(/https:\/\/[a-zA-Z0-9-]+\.vercel\.app/g);
              if (matches && matches.length > 0) resolve(matches[matches.length - 1]);
              else resolve(finalUrl); // Fallback to local
            } else {
              reject(new Error(`Vercel CLI failed (exit ${code}): ${out.slice(0, 500)}`));
            }
          });
          vProc.on('error', reject);
        });

        if (vercelUrl && vercelUrl !== finalUrl) {
          finalUrl = vercelUrl;
          await ctx.send({ type: 'deploy_progress', step: 'Vercel deployment successful!', progress: 100 });
        }
      } catch (err: any) {
        console.warn('Vercel deployment failed:', err);
        await ctx.send({ type: 'deploy_progress', step: `Vercel deploy warning: ${err.message}`, progress: 95 });
      }
    }

    await ctx.send({ type: 'deploy_complete', target: 'web', url: finalUrl });
    return { process: null, url: finalUrl };
  }

  shouldDeployHardware(ctx: PhaseContext): boolean {
    const spec = ctx.session.spec ?? {};
    const target = spec.deployment?.target ?? 'preview';
    return target === 'esp32' || target === 'both';
  }

  shouldDeployPortals(ctx: PhaseContext): boolean {
    const spec = ctx.session.spec ?? {};
    return Array.isArray(spec.portals) && spec.portals.length > 0;
  }

  async initializePortals(ctx: PhaseContext): Promise<void> {
    const spec = ctx.session.spec ?? {};
    const portalSpecs = spec.portals ?? [];
    try {
      await this.portalService.initializePortals(portalSpecs);
    } catch (err: any) {
      console.warn('Portal initialization warning:', err.message);
    }
  }

  async deployHardware(ctx: PhaseContext): Promise<{ serialHandle: { close: () => void } | null }> {
    ctx.session.state = 'deploying';
    await ctx.send({ type: 'deploy_started', target: 'esp32' });

    await this.sendDeployChecklist(ctx);

    // Step 1: Compile
    await ctx.send({
      type: 'deploy_progress',
      step: 'Compiling MicroPython code...',
      progress: 25,
    });
    const compileResult = await this.hardwareService.compile(ctx.nuggetDir);
    await maybeTeach(this.teachingEngine, ctx, 'hardware_compile', '');

    if (!compileResult.success) {
      await ctx.send({
        type: 'deploy_progress',
        step: `Compile failed: ${compileResult.errors.join(', ')}`,
        progress: 25,
      });
      await ctx.send({
        type: 'error',
        message: `Compilation failed: ${compileResult.errors.join(', ')}`,
        recoverable: true,
      });
      return { serialHandle: null };
    }

    // Step 2: Flash
    await ctx.send({
      type: 'deploy_progress',
      step: 'Flashing to board...',
      progress: 60,
    });
    const flashResult = await this.hardwareService.flash(ctx.nuggetDir);
    ctx.logger?.info('Flash result', { success: flashResult.success, message: flashResult.message });
    await maybeTeach(this.teachingEngine, ctx, 'hardware_flash', '');

    if (!flashResult.success) {
      await ctx.send({
        type: 'deploy_progress',
        step: flashResult.message,
        progress: 60,
      });
      await ctx.send({
        type: 'error',
        message: flashResult.message,
        recoverable: true,
      });
      return { serialHandle: null };
    }

    // Skip serial monitor -- Node.js serialport cannot write to ESP32-S3
    // native USB CDC on Windows, so it can't send Ctrl+C on close.  Opening
    // the port may also trigger a DTR reset that re-runs main.py.  The
    // post-flash cleanup in the Python script already soft-resets the board
    // briefly so the user sees their code run.
    await ctx.send({ type: 'deploy_complete', target: 'esp32' });
    return { serialHandle: null };
  }

  async deployPortals(ctx: PhaseContext): Promise<{ serialHandle: { close: () => void } | null }> {
    ctx.session.state = 'deploying';
    await ctx.send({ type: 'deploy_started', target: 'portals' });

    await this.sendDeployChecklist(ctx);

    let serialHandle: { close: () => void } | null = null;

    // Deploy serial portals through existing hardware pipeline
    if (this.portalService.hasSerialPortals()) {
      await ctx.send({
        type: 'deploy_progress',
        step: 'Compiling code for serial portal...',
        progress: 25,
      });
      const compileResult = await this.hardwareService.compile(ctx.nuggetDir);

      if (!compileResult.success) {
        await ctx.send({
          type: 'deploy_progress',
          step: `Compile failed: ${compileResult.errors.join(', ')}`,
          progress: 25,
        });
        await ctx.send({
          type: 'error',
          message: `Compilation failed: ${compileResult.errors.join(', ')}`,
          recoverable: true,
        });
        return { serialHandle: null };
      }

      await ctx.send({
        type: 'deploy_progress',
        step: 'Flashing to board...',
        progress: 60,
      });
      const flashResult = await this.hardwareService.flash(ctx.nuggetDir);
      ctx.logger?.info('Flash result (portal)', { success: flashResult.success, message: flashResult.message });

      if (!flashResult.success) {
        await ctx.send({
          type: 'deploy_progress',
          step: flashResult.message,
          progress: 60,
        });
        await ctx.send({
          type: 'error',
          message: flashResult.message,
          recoverable: true,
        });
        return { serialHandle: null };
      }

      // Skip serial monitor (same reason as deployHardware -- Node.js
      // serialport can't write Ctrl+C to ESP32-S3 native USB on close)
    }

    // Deploy CLI portals by executing their commands
    const cliPortals = this.portalService.getCliPortals();
    for (const { name, adapter } of cliPortals) {
      await ctx.send({
        type: 'deploy_progress',
        step: `Running CLI portal "${name}"...`,
        progress: 80,
      });

      const result = await adapter.execute(ctx.nuggetDir);

      if (result.stdout) {
        await ctx.send({
          type: 'deploy_progress',
          step: result.stdout.slice(0, 500),
          progress: 85,
        });
      }

      if (!result.success) {
        await ctx.send({
          type: 'error',
          message: `CLI portal "${name}" failed: ${result.stderr.slice(0, 500)}`,
          recoverable: true,
        });
      }
    }

    await maybeTeach(this.teachingEngine, ctx, 'portal_used', '');
    await ctx.send({ type: 'deploy_complete', target: 'portals' });
    return { serialHandle };
  }

  async teardown(): Promise<void> {
    await this.portalService.teardownAll();
  }

  getMcpServers(): any[] {
    return this.portalService.getMcpServers();
  }
}
