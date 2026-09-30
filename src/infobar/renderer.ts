import type { CodexUsage, UsageWindow } from '../usage/codexUsage.ts';

const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit' });
export function barFeedback(window: UsageWindow | null, color: string) {
  const percent = window && Number.isFinite(window.remainingPercent)
    ? Math.max(0, Math.min(100, window.remainingPercent)) : 0;
  const width = Math.round(106 * percent / 100);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="106" height="4" viewBox="0 0 106 4"><rect width="106" height="4" fill="#303030"/><rect width="${width}" height="4" fill="${color}"/></svg>`;
  return { value: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, enabled: !!window };
}
export function usageFeedback(usage: CodexUsage, now = new Date()) {
  const reset = (w: UsageWindow | null, weekly: boolean) => !w?.resetAt ? '--' :
    weekly && day.format(w.resetAt) !== day.format(now) ? day.format(w.resetAt) : time.format(w.resetAt);
  return {
    fiveLabel: { enabled: true }, weekLabel: { enabled: true },
    five: { value: usage.fiveHour ? Math.round(usage.fiveHour.remainingPercent) + '%' : '--', font: { size: 27 } },
    week: { value: usage.weekly ? Math.round(usage.weekly.remainingPercent) + '%' : '--', font: { size: 27 } },
    fiveReset: reset(usage.fiveHour, false),
    weekReset: reset(usage.weekly, true),
    fiveBar: barFeedback(usage.fiveHour, '#63D6A6'),
    weekBar: barFeedback(usage.weekly, '#63B9FF'),
  };
}
export function statusFeedback(status: 'LOADING' | 'LOGIN' | 'ERROR') {
  return { fiveLabel: { enabled: false }, weekLabel: { enabled: false },
    five: { value: 'CODEX', font: { size: 16 } }, week: { value: status, font: { size: 15 } }, fiveReset: '--', weekReset: '--',
    fiveBar: barFeedback(null, '#63D6A6'), weekBar: barFeedback(null, '#63B9FF') };
}
