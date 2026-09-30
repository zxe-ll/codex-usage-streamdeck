import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolveCodexExecutable } from './resolveCodex.ts';

type Window = { usedPercent: number; windowDurationMins: number | null; resetsAt: number | null };
type Snapshot = { limitId?: string | null; primary?: Window | null; secondary?: Window | null };
export type UsageResponse = { rateLimits: Snapshot; rateLimitsByLimitId?: Record<string, Snapshot> | null };
export type UsageWindow = { remainingPercent: number; resetAt: Date | null };
export type CodexUsage = { fiveHour: UsageWindow | null; weekly: UsageWindow | null };

export function normalizeUsage(response: UsageResponse): CodexUsage {
  const buckets = response.rateLimitsByLimitId;
  const snapshot = buckets && Object.keys(buckets).length
    ? buckets.codex
    : response.rateLimits;
  if (!snapshot || (snapshot.limitId && snapshot.limitId !== 'codex')) {
    throw new Error('CODEX_BUCKET_UNAVAILABLE');
  }
  const windows = [snapshot.primary, snapshot.secondary];
  const read = (minutes: number): UsageWindow | null => {
    const w = windows.find(w => w?.windowDurationMins === minutes);
    if (!w || !Number.isFinite(w.usedPercent)) return null;
    const date = w.resetsAt != null && Number.isFinite(w.resetsAt) ? new Date(w.resetsAt * 1000) : null;
    return {
      remainingPercent: Math.max(0, Math.min(100, 100 - w.usedPercent)),
      resetAt: date && Number.isFinite(date.getTime()) ? date : null,
    };
  };
  return { fiveHour: read(300), weekly: read(10080) };
}

// Only metadata RPCs. No login, refresh, conversation, or inference requests.
// The application never reads, prints, or persists credentials or raw responses.
export async function getCodexUsage(): Promise<CodexUsage> {
  const child = spawn(resolveCodexExecutable(), ['app-server', '--listen', 'stdio://'], {
    windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stderr.resume(); // Do not expose server stderr (potentially sensitive).
  const lines = createInterface({ input: child.stdout });
  let nextId = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  const fail = (code: string) => {
    for (const p of pending.values()) p.reject(new Error(code));
    pending.clear();
  };
  child.on('error', (error: NodeJS.ErrnoException) => fail(
    error.code === 'ENOENT' ? 'CODEX_EXECUTABLE_NOT_FOUND' : 'CODEX_PROCESS_START_FAILED',
  ));
  child.on('exit', () => fail('CODEX_PROCESS_EXITED'));
  child.stdin.on('error', () => fail('CODEX_PIPE_FAILED'));
  lines.on('line', line => {
    let message: any;
    try { message = JSON.parse(line); } catch { return; }
    const p = pending.get(message.id);
    if (!p) return;
    pending.delete(message.id);
    if (message.error) p.reject(new Error('CODEX_RPC_FAILED'));
    else p.resolve(message.result);
  });
  const timer = setTimeout(() => { fail('CODEX_TIMEOUT'); child.kill(); }, 30000);
  const request = (method: string, params?: object): Promise<any> => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ id, method, ...(params ? { params } : {}) }) + '\n');
  });
  try {
    await request('initialize', { clientInfo: { name: 'codex_usage_streamdeck', title: 'Codex Usage', version: '0.0.1' } });
    child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
    const auth = await request('account/read', { refreshToken: false });
    if (!auth.account) throw new Error('CODEX_LOGIN_REQUIRED');
    if (auth.account.type !== 'chatgpt') throw new Error('CODEX_CHATGPT_AUTH_REQUIRED');
    return normalizeUsage(await request('account/rateLimits/read'));
  } finally {
    clearTimeout(timer);
    lines.close();
    child.stdin.end();
    child.kill();
  }
}
