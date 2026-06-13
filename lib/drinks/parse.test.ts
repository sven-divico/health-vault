import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDrink } from './parse';

test('parses volume units and bare ml', () => {
  assert.deepEqual(parseDrink('Bier 500ml'), { name: 'Bier', volumeMl: 500 });
  assert.deepEqual(parseDrink('Bier 0.5l'), { name: 'Bier', volumeMl: 500 });
  assert.deepEqual(parseDrink('Apfelschorle 0,5l'), { name: 'Apfelschorle', volumeMl: 500 });
  assert.deepEqual(parseDrink('Wasser 500'), { name: 'Wasser', volumeMl: 500 });
  assert.deepEqual(parseDrink('Cola Zero 330 ml'), { name: 'Cola Zero', volumeMl: 330 });
});

test('multi-word names are preserved', () => {
  assert.deepEqual(parseDrink('Alkoholfreies Weizen 0,5l'), { name: 'Alkoholfreies Weizen', volumeMl: 500 });
});

test('missing volume, empty name, or non-positive volume → null', () => {
  assert.equal(parseDrink('Wasser'), null);
  assert.equal(parseDrink('500ml'), null); // no name
  assert.equal(parseDrink('Bier 0'), null);
  assert.equal(parseDrink(''), null);
});
