import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absoluteDrink } from './index';

test('absoluteDrink scales concentration by volume/100', () => {
  const a = absoluteDrink({ volumeMl: 500, alcoholGPer100ml: 4, sugarGPer100ml: 0 });
  assert.equal(a.volumeMl, 500);
  assert.equal(a.alcoholG, 20); // 4 g/100ml × 500/100
  assert.equal(a.sugarG, 0);
});

test('null concentration → null absolute; volume passes through', () => {
  const a = absoluteDrink({ volumeMl: 330, alcoholGPer100ml: null, sugarGPer100ml: 10.6 });
  assert.equal(a.volumeMl, 330);
  assert.equal(a.alcoholG, null);
  assert.equal(a.sugarG, 34.98); // 10.6 × 330/100
});

test('null volume → null alcohol/sugar', () => {
  const a = absoluteDrink({ volumeMl: null, alcoholGPer100ml: 4, sugarGPer100ml: 5 });
  assert.equal(a.alcoholG, null);
  assert.equal(a.sugarG, null);
});
