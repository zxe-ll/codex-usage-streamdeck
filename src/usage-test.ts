import { getCodexUsage } from './usage/codexUsage.ts';

try {
  const usage = await getCodexUsage();
  console.log('Codex Usage (Asia/Tokyo)');
  for (const [label, w] of [['5h', usage.fiveHour], ['Weekly', usage.weekly]] as const) {
    console.log(`\n${label}\nRemaining: ${w ? `${w.remainingPercent}%` : '--'}`);
    console.log(`Reset: ${w?.resetAt ? new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(w.resetAt) : '--'}`);
  }
  if (!usage.fiveHour || !usage.weekly) process.exitCode = 2;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'CODEX_UNKNOWN_ERROR');
  process.exitCode = 1;
}
