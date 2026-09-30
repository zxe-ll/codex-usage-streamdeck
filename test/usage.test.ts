import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsage } from '../src/usage/codexUsage.ts';

test('select codex bucket and identify windows by duration, not position', () => {
  const result = normalizeUsage({ rateLimits: {}, rateLimitsByLimitId: {
    other: { primary: { usedPercent: 99, windowDurationMins: 300, resetsAt: 1 } },
    codex: {
      primary: { usedPercent: 28, windowDurationMins: 10080, resetsAt: 1800000000 },
      secondary: { usedPercent: 11, windowDurationMins: 300, resetsAt: 1800000001 },
    },
  } });
  assert.equal(result.fiveHour?.remainingPercent, 89);
  assert.equal(result.weekly?.remainingPercent, 72);
  assert.equal(result.fiveHour?.resetAt?.getTime(), 1800000001000);
});
test('missing data stays unavailable and percentages are clamped', () => {
  assert.deepEqual(normalizeUsage({ rateLimits: {} }), { fiveHour: null, weekly: null });
  assert.equal(normalizeUsage({ rateLimits: { primary: {
    usedPercent: 110, windowDurationMins: 300, resetsAt: null,
  } } }).fiveHour?.remainingPercent, 0);
  assert.throws(() => normalizeUsage({ rateLimits: {}, rateLimitsByLimitId: { other: {} } }), /BUCKET_UNAVAILABLE/);
});
