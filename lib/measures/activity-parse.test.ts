import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseActivity } from './activity-parse';

test('parses category + minutes + note', () => {
  assert.deepEqual(parseActivity('run 28min easy pace'),
    { category: 'run', durationMin: 28, note: 'easy pace' });
});
test('parses hours to minutes', () => {
  assert.deepEqual(parseActivity('gym 1h'), { category: 'gym', durationMin: 60, note: null });
});
test('ignores non-duration tokens (km) but keeps them as note', () => {
  assert.deepEqual(parseActivity('ran 5km 28min'),
    { category: 'ran', durationMin: 28, note: '5km' });
});
test('category only, no duration', () => {
  assert.deepEqual(parseActivity('yoga'), { category: 'yoga', durationMin: null, note: null });
});
test('duration only, no category', () => {
  assert.deepEqual(parseActivity('45 minutes'), { category: null, durationMin: 45, note: null });
});
test('empty input', () => {
  assert.deepEqual(parseActivity('   '), { category: null, durationMin: null, note: null });
});
test('does not treat metre distance as minutes', () => {
  assert.deepEqual(parseActivity('swim 500m'),
    { category: 'swim', durationMin: null, note: '500m' });
});
test('keeps distance token and parses real minutes', () => {
  assert.deepEqual(parseActivity('swim 500m 30min'),
    { category: 'swim', durationMin: 30, note: '500m' });
});
