import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScale } from '../../src/ui/layout.js';

test('scale respects width, height, integer threshold and scroll fallback', () => {
  assert.equal(calculateScale(960, 540), 2);
  assert.equal(calculateScale(600, 500), 1);
  assert.equal(calculateScale(624, 500), 1.3);
  assert.equal(calculateScale(320, 500), 320 / 480);
  assert.equal(calculateScale(480, 0), 1);
  assert.equal(calculateScale(0, 500), 0);
});

test('compact scale fits available space without integer snapping', () => {
  assert.equal(calculateScale(544, 306, false), 544 / 480);
  assert.equal(calculateScale(424, 238, false), 238 / 270);
  assert.equal(calculateScale(352, 198, false), 352 / 480);
  assert.equal(calculateScale(960, 540, false), 2);
  assert.equal(calculateScale(600, 0, false), 1.25);
  assert.equal(calculateScale(Infinity, 500, false), 0);
});
