import { existsSync, readdirSync, statSync } from 'node:fs';
import { delimiter, join, isAbsolute } from 'node:path';

// Resolve an executable directly; never pass commands through a shell.
export function resolveCodexExecutable(env = process.env, platform = process.platform): string {
  if (env.CODEX_BIN) {
    if (!isAbsolute(env.CODEX_BIN) || !existsSync(env.CODEX_BIN)) {
      throw new Error('CODEX_BIN_INVALID');
    }
    return env.CODEX_BIN;
  }
  if (platform !== 'win32') return 'codex';
  const pathValue = env.PATH ?? env.Path ?? '';
  for (const directory of pathValue.split(delimiter).filter(Boolean)) {
    const executable = join(directory.replace(/^"|"$/g, ''), 'codex.exe');
    if (existsSync(executable)) return executable;
  }
  // Codex desktop adds its CLI to its own process environment, but an ordinary
  // PowerShell/Stream Deck process may not inherit that PATH entry.
  if (env.LOCALAPPDATA) {
    const bin = join(env.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin');
    try {
      const candidates = readdirSync(bin, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => join(bin, entry.name, 'codex.exe'))
        .filter(file => existsSync(file))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
      if (candidates[0]) return candidates[0];
    } catch { /* Installation absent or inaccessible. */ }
  }
  throw new Error('CODEX_EXECUTABLE_NOT_FOUND');
}
