import test from 'node:test';
import assert from 'node:assert/strict';
import { assessRegion, invertRegion, readAlpha, resizeMask, reverseAlphaChannel } from '../src/engine/math.ts';
import { DEFAULT_SETTINGS } from '../src/engine/types.ts';

function fixture(size = 48) {
  const alpha = new Float32Array(size * size);
  const original = new Uint8ClampedArray(size * size * 4);
  const observed = new Uint8ClampedArray(original.length);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const dx = Math.abs((x - (size - 1) / 2) / (size * 0.4));
    const dy = Math.abs((y - (size - 1) / 2) / (size * 0.4));
    alpha[i] = Math.max(0, 1 - Math.sqrt(dx) - Math.sqrt(dy)) * 0.65;
    for (let c = 0; c < 3; c++) {
      const value = 45 + c * 30 + x * 0.5 + y * 0.25;
      original[i * 4 + c] = value;
      observed[i * 4 + c] = Math.round(original[i * 4 + c] * (1 - alpha[i]) + 255 * alpha[i]);
    }
    original[i * 4 + 3] = observed[i * 4 + 3] = 255;
  }
  return { mask: { name: 'synthetic-test', size, alpha }, original, observed };
}

test('known translucent overlay restores RGB within quantization tolerance and preserves alpha', () => {
  const { mask, original, observed } = fixture();
  const result = invertRegion(observed, mask, DEFAULT_SETTINGS);
  let maxError = 0;
  for (let i = 0; i < original.length; i++) maxError = Math.max(maxError, Math.abs(result.pixels[i] - original[i]));
  assert.ok(maxError <= 2, `Maximum RGB error was ${maxError}`);
  assert.equal(result.clipping, 0);
  for (let i = 3; i < original.length; i += 4) assert.equal(result.pixels[i], 255);
  const detection = assessRegion(observed, mask, DEFAULT_SETTINGS);
  assert.equal(detection.accepted, true, JSON.stringify(detection));
  assert.ok(detection.confidence > 0.9);
});

test('a clean gradient is rejected instead of silently damaged', () => {
  const { mask, original } = fixture();
  assert.equal(assessRegion(original, mask, DEFAULT_SETTINGS).accepted, false);
});

test('unrelated texture fails both the match and damage gates', () => {
  const { mask, original } = fixture();
  let seed = 29483;
  for (let i = 0; i < original.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    original[i] = i % 4 === 3 ? 255 : seed >>> 24;
  }
  assert.equal(assessRegion(original, mask, DEFAULT_SETTINGS).accepted, false);
});

test('an over-strong mask that would clip substantial content is rejected', () => {
  const { mask, observed } = fixture();
  assert.equal(assessRegion(observed, mask, { ...DEFAULT_SETTINGS, strength: 1.5 }).accepted, false);
});

test('opaque alpha values are left alone because their original pixels are unknowable', () => {
  assert.equal(reverseAlphaChannel(255, 1), 255);
  assert.equal(reverseAlphaChannel(255, 0.99), 255);
  assert.equal(reverseAlphaChannel(123, 0), 123);
  assert.throws(() => reverseAlphaChannel(123, NaN));
  assert.equal(reverseAlphaChannel(10, 0.7), 0);
});

test('white RGBA and black-background calibration images produce expected alpha', () => {
  const alpha = readAlpha(new Uint8ClampedArray([128, 128, 128, 255, 255, 255, 255, 128, 255, 255, 255, 0]));
  assert.ok(Math.abs(alpha[0] - 128 / 255) < 0.000001);
  assert.ok(Math.abs(alpha[1] - 128 / 255) < 0.000001);
  assert.equal(alpha[2], 0);
});

test('mask resize keeps constant opacity and correct dimensions', () => {
  const mask = resizeMask({ name: 'test', size: 8, alpha: new Float32Array(64).fill(0.5) }, 13);
  assert.equal(mask.alpha.length, 169);
  assert.ok(mask.alpha.every(value => value === 0.5));
});

test('feathering reduces the correction at the rectangle edge', () => {
  const pixels = new Uint8ClampedArray(8 * 8 * 4).fill(255);
  for (let i = 0; i < 64; i++) { pixels[i * 4] = 160; pixels[i * 4 + 1] = 160; pixels[i * 4 + 2] = 160; }
  const mask = { name: 'test', size: 8, alpha: new Float32Array(64).fill(0.3) };
  const hard = invertRegion(pixels, mask, { strength: 1, feather: 0 });
  const soft = invertRegion(pixels, mask, { strength: 1, feather: 4 });
  assert.ok(soft.pixels[0] > hard.pixels[0]);
  assert.equal(soft.pixels[(3 * 8 + 3) * 4], hard.pixels[(3 * 8 + 3) * 4]);
});
