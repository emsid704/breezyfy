import { assessRegion, resizeMask } from './math';
import { throwIfAborted, yieldToBrowser, type WorkingContext } from './browser';
import type { AlphaMask, Candidate, Detection, RemovalSettings } from './types';

export function buildCandidates(width: number, height: number, masks: AlphaMask[], settings: RemovalSettings, video = false): Candidate[] {
  const result: Candidate[] = [], seen = new Set<string>();
  const add = (mask: AlphaMask, size: number, right: number, bottom: number) => {
    size = Math.max(8, Math.min(768, Math.round(size * settings.scale)));
    // A manual rectangle is a base geometry: scale expands around its center.
    const x = settings.position ? Math.round(settings.position.x + (settings.position.size - size) / 2) + settings.offsetX : width - Math.round(right) - size + settings.offsetX;
    const y = settings.position ? Math.round(settings.position.y + (settings.position.size - size) / 2) + settings.offsetY : height - Math.round(bottom) - size + settings.offsetY;
    if (x < 0 || y < 0 || x + size > width || y + size > height) return;
    const key = `${mask.name}:${size}:${x}:${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ x, y, size, mask: resizeMask(mask, size) });
  };
  for (const mask of masks) {
    if (settings.position) { add(mask, settings.position.size, 0, 0); continue; }
    if (video) {
      const factor = Math.min(width, height) / 1080;
      add(mask, 72 * factor, 108 * factor, 108 * factor);
      add(mask, 72 * factor, 144 * factor, 144 * factor);
      if (Math.min(width, height) === 720) {
        add(mask, 44, 29, 40);
        if (height > width) { add(mask, 35, 102, 96); add(mask, 24, 48, 48); }
      }
    }
    if (mask.name === 'compact') { add(mask, 48, 32, 32); add(mask, 48, 96, 96); }
    else if (mask.name === 'classic') add(mask, 96, 64, 64);
    else if (mask.name === 'modern') { add(mask, 96, 192, 192); add(mask, 96, 64, 64); }
    else add(mask, mask.size, Math.round(mask.size * 2 / 3), Math.round(mask.size * 2 / 3));
  }
  return result;
}

export function examineCandidate(ctx: WorkingContext, candidate: Candidate, settings: RemovalSettings): Detection {
  const pixels = ctx.getImageData(candidate.x, candidate.y, candidate.size, candidate.size);
  return { candidate, ...assessRegion(pixels.data, candidate.mask, settings) };
}

export async function detectWatermark(ctx: WorkingContext, candidates: Candidate[], settings: RemovalSettings, signal?: AbortSignal): Promise<Detection | null> {
  let best: Detection | null = null;
  for (let i = 0; i < candidates.length; i++) {
    throwIfAborted(signal);
    const match = examineCandidate(ctx, candidates[i], settings);
    if (!best || (match.accepted && !best.accepted) || (match.accepted === best.accepted && match.confidence > best.confidence)) best = match;
    if (i % 4 === 3) await yieldToBrowser(signal);
  }
  return best;
}

export function applyDetection(ctx: WorkingContext, detection: Detection): void {
  if (!detection.accepted) return;
  const { x, y, size } = detection.candidate;
  // Copy into a browser ImageData to avoid ArrayBufferLike differences across TS lib versions.
  const patch = ctx.createImageData(size, size);
  patch.data.set(detection.corrected);
  ctx.putImageData(patch, x, y);
}
