/** Cross-platform which() -- locates an executable on PATH. */

import { execFileSync } from 'node:child_process';
import process from 'node:process';

export function which(name: string): string | null {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileSync(cmd, [name], { encoding: 'utf-8' }).trim();
    // 'where' on Windows may return multiple lines; take the first
    return result.split('\n')[0].trim() || null;
  } catch {
    return null;
  }
}
