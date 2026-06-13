import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absoluteNutrition, NUTRIENTS } from './index';

const full = {
  portionG: 250,
  kcalPer100g: 120,
  carbsGPer100g: 20,
  sugarGPer100g: 5,
  fatGPer100g: 3,
  saturatedFatGPer100g: 1,
  proteinGPer100g: 8,
  fiberGPer100g: 2,
  saltGPer100g: 0.4,
};

test('absoluteNutrition scales per-100 g by portion/100', () => {
  const a = absoluteNutrition(full);
  assert.equal(a.kcal, 300); // 120 * 250/100
  assert.equal(a.carbs, 50);
  assert.equal(a.sugar, 12.5);
  assert.equal(a.protein, 20);
  assert.equal(a.salt, 1);
});

test('null portion or null per-100 g yields null for that nutrient', () => {
  const noPortion = absoluteNutrition({ ...full, portionG: null });
  for (const n of NUTRIENTS) assert.equal(noPortion[n.key], null);

  const noFat = absoluteNutrition({ ...full, fatGPer100g: null });
  assert.equal(noFat.fat, null);
  assert.equal(noFat.kcal, 300); // others unaffected
});
