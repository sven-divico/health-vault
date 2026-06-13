import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import jpeg from 'jpeg-js';
import { downsampleJpeg } from './index';

// scripts/seed-assets/meal-1.jpg is a committed 800x600 JPEG.
const SRC = readFileSync('scripts/seed-assets/meal-1.jpg');

test('shrinks an 800x600 image to fit a 768px long edge, preserving aspect', () => {
  const out = downsampleJpeg(SRC, 768, 80);
  assert.equal(out.width, 768);             // 800 -> 768 (long edge capped)
  assert.equal(out.height, 576);            // 600 * 768/800
  assert.ok(out.data.length > 0, 'produces a non-empty JPEG');
  // output must be a valid, correctly-sized JPEG (re-decodes to the new dimensions)
  const decoded = jpeg.decode(out.data, { useTArray: true });
  assert.equal(decoded.width, 768);
  assert.equal(decoded.height, 576);
});

test('never enlarges: a 400px cap on an already-small target keeps it within bound', () => {
  const out = downsampleJpeg(SRC, 10000, 80); // cap above source -> no resize
  assert.equal(out.width, 800);
  assert.equal(out.height, 600);
});
