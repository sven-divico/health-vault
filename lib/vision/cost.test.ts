import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visionCostMicroUsd } from './index';

test('cost in micro-USD = input*1 + output*5 (Haiku 4.5 $1/$5 per 1M)', () => {
  assert.equal(visionCostMicroUsd(1180, 92), 1180 + 460); // 1640 µUSD = $0.00164
});

test('zero tokens => zero cost', () => {
  assert.equal(visionCostMicroUsd(0, 0), 0);
});

test('a round million input tokens costs exactly $1 (1_000_000 µUSD)', () => {
  assert.equal(visionCostMicroUsd(1_000_000, 0), 1_000_000);
});
