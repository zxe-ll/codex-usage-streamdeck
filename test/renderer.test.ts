import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usageFeedback, statusFeedback, barFeedback } from '../src/infobar/renderer.ts';

test('reset formatting uses Japan time and weekly date', () => {
  const w = { remainingPercent: 79, resetAt: new Date('2026-09-30T09:56:40Z') };
  const feedback = usageFeedback({ fiveHour: w, weekly: { remainingPercent: 66, resetAt: new Date('2026-10-03T19:32:28Z') } }, new Date('2026-09-30T09:00:00Z'));
  assert.equal(feedback.five.value, '79%');
  assert.equal(feedback.fiveReset, '18:56');
  assert.equal(feedback.weekReset, '10/04');
});
test('bar image fill length matches remaining percentage', () => {
  for (const [percent, width] of [[0, 0], [64, 68], [90, 95], [100, 106], [150, 106]]) {
    const result = barFeedback({ remainingPercent: percent, resetAt: null }, '#63D6A6');
    const svg = Buffer.from(result.value.split(',')[1], 'base64').toString();
    assert.ok(svg.includes(`<rect width="${width}" height="4" fill="#63D6A6"/>`));
    assert.equal(result.enabled, true);
  }
  assert.equal(barFeedback(null, '#63D6A6').enabled, false);
});
test('missing values and errors do not display old usage', () => {
  const feedback = usageFeedback({ fiveHour: null, weekly: null });
  assert.equal(feedback.five.value, '--');
  assert.equal(feedback.fiveBar.enabled, false);
  assert.equal(statusFeedback('LOGIN').week.value, 'LOGIN');
});
