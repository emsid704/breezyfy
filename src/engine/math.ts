import type { AlphaMask, RemovalSettings } from './types';

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Invert a known translucent white overlay. Fully opaque pixels are unrecoverable. */
export function reverseAlphaChannel(observed: number, alpha: number): number {
  if (!Number.isFinite(observed) || !Number.isFinite(alpha)) throw new Error('Invalid pixel or opacity.');
  if (alpha <= 0) return observed;
  if (alpha >= 0.99) return observed;
  return clamp((observed - 255 * alpha) / (1 - alpha), 0, 255);
}

export function readAlpha(rgba: Uint8ClampedArray): Float32Array {
  const alpha = new Float32Array(rgba.length / 4);
  for (let i = 0; i < alpha.length; i++) {
    // Covers both white-on-black captures and transparent white masks.
    alpha[i] = Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]) / 255 * rgba[i * 4 + 3] / 255;
  }
  return alpha;
}

/** Bilinear interpolation is deterministic and needs no DOM/canvas in unit tests. */
export function resizeMask(source: AlphaMask, size: number): AlphaMask {
  if (size === source.size) return source;
  const result = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const sx = clamp((x + 0.5) * source.size / size - 0.5, 0, source.size - 1);
    const sy = clamp((y + 0.5) * source.size / size - 0.5, 0, source.size - 1);
    const x0 = Math.floor(sx), y0 = Math.floor(sy);
    const x1 = Math.min(source.size - 1, x0 + 1), y1 = Math.min(source.size - 1, y0 + 1);
    const fx = sx - x0, fy = sy - y0;
    result[y * size + x] =
      source.alpha[y0 * source.size + x0] * (1 - fx) * (1 - fy) +
      source.alpha[y0 * source.size + x1] * fx * (1 - fy) +
      source.alpha[y1 * source.size + x0] * (1 - fx) * fy +
      source.alpha[y1 * source.size + x1] * fx * fy;
  }
  return { name: source.name, size, alpha: result };
}

export function invertRegion(
  rgba: Uint8ClampedArray, mask: AlphaMask, settings: Pick<RemovalSettings, 'strength' | 'feather'>,
): { pixels: Uint8ClampedArray; clipping: number; changed: number } {
  if (rgba.length !== mask.alpha.length * 4) throw new Error('Mask dimensions do not match the selected region.');
  const result = new Uint8ClampedArray(rgba);
  let clipped = 0, affected = 0, changed = 0;
  for (let i = 0; i < mask.alpha.length; i++) {
    const a = mask.alpha[i] * settings.strength;
    if (a < 0.003 || a >= 0.99 || rgba[i * 4 + 3] < 250) continue;
    const edge = Math.min(i % mask.size, Math.floor(i / mask.size), mask.size - 1 - i % mask.size, mask.size - 1 - Math.floor(i / mask.size));
    const feather = settings.feather > 0 ? clamp((edge + 1) / settings.feather, 0, 1) : 1;
    for (let c = 0; c < 3; c++) {
      const at = i * 4 + c, raw = (rgba[at] - 255 * a) / (1 - a);
      // Allow a small tolerance for quantization and video compression.
      if (raw < -5 || raw > 260) clipped++;
      affected++;
      result[at] = Math.round(rgba[at] * (1 - feather) + clamp(raw, 0, 255) * feather);
      if (result[at] !== rgba[at]) changed++;
    }
  }
  return { pixels: result, clipping: affected ? clipped / affected : 0, changed };
}

function luminance(rgba: Uint8ClampedArray): Float64Array {
  const l = new Float64Array(rgba.length / 4);
  for (let i = 0; i < l.length; i++) l[i] = rgba[i * 4] * 0.2126 + rgba[i * 4 + 1] * 0.7152 + rgba[i * 4 + 2] * 0.0722;
  return l;
}

/** Remove a fitted plane so a simple lighting gradient does not look like a watermark. */
function detrend(values: ArrayLike<number>, size: number): Float64Array {
  let mean = 0, dx = 0, dy = 0, variance = 0;
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = values[y * size + x];
    mean += v; dx += (x - center) * v; dy += (y - center) * v;
    variance += (x - center) ** 2;
  }
  mean /= values.length; dx /= variance || 1; dy /= variance || 1;
  return Float64Array.from(values, (v, i) => v - mean - dx * (i % size - center) - dy * (Math.floor(i / size) - center));
}

function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa > 1e-8 && bb > 1e-8 ? dot / Math.sqrt(aa * bb) : 0;
}

function edges(values: ArrayLike<number>, size: number): Float64Array {
  const result = new Float64Array((size - 1) * (size - 1) * 2);
  let n = 0;
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const i = y * size + x;
    result[n++] = values[i + 1] - values[i];
    result[n++] = values[i + size] - values[i];
  }
  return result;
}

export function scoreRegion(rgba: Uint8ClampedArray, mask: AlphaMask): { spatial: number; edge: number; energy: number } {
  const luma = luminance(rgba), a = detrend(mask.alpha, mask.size);
  const le = edges(luma, mask.size), ae = edges(mask.alpha, mask.size);
  let energy = 0;
  for (const n of le) energy += n * n;
  return { spatial: correlation(detrend(luma, mask.size), a), edge: correlation(le, ae), energy: energy / le.length };
}

/** Two independent match signals plus a damage check. Fail closed when the mask does not fit. */
export function assessRegion(rgba: Uint8ClampedArray, mask: AlphaMask, settings: RemovalSettings) {
  const before = scoreRegion(rgba, mask);
  const { pixels, clipping, changed } = invertRegion(rgba, mask, settings);
  const after = scoreRegion(pixels, mask);
  const confidence = clamp(before.spatial * 0.6 + before.edge * 0.4, 0, 1);
  const threshold = clamp(settings.threshold, 0.1, 0.95);
  const improvement = before.spatial - Math.abs(after.spatial);
  const edgeImprovement = before.edge - Math.abs(after.edge);
  const accepted = changed > 0 && before.spatial >= threshold && before.edge >= Math.max(0.12, threshold * 0.55)
    && confidence >= threshold && clipping < 0.025
    && (improvement >= 0.08 || edgeImprovement >= 0.08)
    && after.energy <= before.energy * 1.12 + 0.05;
  return { confidence, accepted, corrected: pixels, clipping, before, after };
}
