import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveCodexExecutable } from '../src/usage/resolveCodex.ts';

test('desktop executable is found without a Codex PATH entry', () => {
  const root = mkdtempSync(join(tmpdir(), 'codex-resolver-'));
  try {
    const bin = join(root, 'OpenAI', 'Codex', 'bin', 'version-one');
    mkdirSync(bin, { recursive: true });
    const exe = join(bin, 'codex.exe');
    writeFileSync(exe, 'fixture');
    assert.equal(resolveCodexExecutable({ PATH: '', LOCALAPPDATA: root }, 'win32'), exe);
    assert.equal(resolveCodexExecutable({ CODEX_BIN: exe }, 'win32'), exe);
    assert.throws(() => resolveCodexExecutable({ CODEX_BIN: join(root, 'missing.exe') }, 'win32'), /BIN_INVALID/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
