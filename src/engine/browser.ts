import { clamp, readAlpha } from './math';
import { MEDIA_LIMITS, type AlphaMask, type RemovalSettings } from './types';

export type WorkingCanvas = HTMLCanvasElement | OffscreenCanvas;
export type WorkingContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Processing cancelled.', 'AbortError');
}

export async function yieldToBrowser(signal?: AbortSignal): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  throwIfAborted(signal);
}

export function createCanvas(width: number, height: number): WorkingCanvas {
  if (typeof document === 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}

export function context2d(canvas: WorkingCanvas): WorkingContext {
  const context = canvas.getContext('2d', { willReadFrequently: true }) as WorkingContext | null;
  if (!context) throw new Error('Canvas processing is unavailable in this browser.');
  return context;
}

export function releaseCanvas(canvas?: WorkingCanvas): void {
  if (canvas) { canvas.width = 1; canvas.height = 1; }
}

export async function encodeCanvas(canvas: WorkingCanvas, type: string, quality: number, signal?: AbortSignal): Promise<Blob> {
  throwIfAborted(signal);
  const blob = 'convertToBlob' in canvas
    ? await canvas.convertToBlob({ type, quality })
    : await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Image export failed. Try PNG.')), type, quality));
  throwIfAborted(signal);
  if (blob.type !== type) throw new Error('This browser cannot export that image format. Choose PNG.');
  return blob;
}

export function normalizeSettings(settings: RemovalSettings): RemovalSettings {
  if (!['auto', 'classic', 'compact', 'modern', 'custom'].includes(settings.profile)) throw new Error('Unknown watermark profile.');
  for (const name of ['strength', 'scale', 'offsetX', 'offsetY', 'threshold', 'feather'] as const) {
    if (!Number.isFinite(settings[name])) throw new Error(`Invalid ${name} setting.`);
  }
  if (settings.position && !Object.values(settings.position).every(Number.isFinite)) throw new Error('Invalid watermark position.');
  return {
    ...settings,
    strength: clamp(settings.strength, 0.1, 1.5), scale: clamp(settings.scale, 0.25, 4),
    offsetX: Math.round(clamp(settings.offsetX, -12288, 12288)), offsetY: Math.round(clamp(settings.offsetY, -12288, 12288)),
    threshold: clamp(settings.threshold, 0.1, 0.95), feather: clamp(settings.feather, 0, 32),
    position: settings.position ? {
      x: Math.round(settings.position.x), y: Math.round(settings.position.y),
      size: Math.round(clamp(settings.position.size, 8, 768)),
    } : undefined,
  };
}

export function validateDimensions(width: number, height: number, video = false): void {
  const maxPixels = video ? MEDIA_LIMITS.videoPixels : MEDIA_LIMITS.imagePixels;
  const maxEdge = video ? 3840 : MEDIA_LIMITS.imageDimension;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16) throw new Error('The file has invalid or very small dimensions (minimum 16 × 16).');
  if (width * height > maxPixels || Math.max(width, height) > maxEdge) {
    throw new Error(video ? 'Video exceeds the 4K frame limit. Resize it before processing.' : 'Image exceeds 40 megapixels or 12,288 pixels on one side. Resize it before processing.');
  }
}

function ascii(bytes: Uint8Array, start: number, count: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + count));
}

/** Inspect actual bytes and dimensions before allocating a decoded image. MIME labels are not trusted. */
export async function inspectImage(file: Blob, mask = false): Promise<{ width: number; height: number; type: string }> {
  if (!file.size) throw new Error('This file is empty.');
  if (file.size > (mask ? MEDIA_LIMITS.maskBytes : MEDIA_LIMITS.imageBytes)) throw new Error(mask ? 'Calibration mask must be smaller than 4 MB.' : 'Image exceeds the 50 MB file limit.');
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer());
  const data = new DataView(bytes.buffer);
  let width = 0, height = 0, type = '';
  if (bytes.length >= 24 && bytes[0] === 137 && ascii(bytes, 1, 7) === 'PNG\r\n\x1a\n') {
    width = data.getUint32(16); height = data.getUint32(20); type = 'image/png';
    for (let p = 8; p + 8 <= bytes.length;) {
      const chunk = ascii(bytes, p + 4, 4), length = data.getUint32(p);
      if (chunk === 'acTL') throw new Error('Animated PNG files are not supported. Export a still image first.');
      if (chunk === 'IDAT') break;
      if (length > bytes.length || p + length + 12 > bytes.length) break;
      p += length + 12;
    }
  } else if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216) {
    type = 'image/jpeg';
    for (let p = 2; p + 8 < bytes.length;) {
      if (bytes[p++] !== 255) continue;
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      const length = data.getUint16(p);
      if (length < 2 || p + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        height = data.getUint16(p + 3); width = data.getUint16(p + 5); break;
      }
      p += length;
    }
  } else if (bytes.length >= 54 && ascii(bytes, 0, 2) === 'BM') {
    const headerSize = data.getUint32(14, true), offset = data.getUint32(10, true);
    const bits = data.getUint16(28, true), compression = data.getUint32(30, true);
    if (headerSize < 40 || data.getUint16(26, true) !== 1 || ![24, 32].includes(bits) || compression !== 0) {
      throw new Error('Use an uncompressed 24-bit or 32-bit BMP, or convert this BMP to PNG.');
    }
    width = data.getInt32(18, true); height = Math.abs(data.getInt32(22, true)); type = 'image/bmp';
    if (width <= 0 || height === 0 || offset < 14 + headerSize || offset > file.size || offset + Math.ceil(width * bits / 32) * 4 * height > file.size) {
      throw new Error('This BMP is truncated or has invalid dimensions.');
    }
  } else if (bytes.length >= 30 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    type = 'image/webp';
    const chunk = ascii(bytes, 12, 4);
    if (chunk === 'VP8X') {
      if (bytes[20] & 2) throw new Error('Animated WebP files are not supported. Export a still image first.');
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === 'VP8 ' && bytes.length >= 30) {
      width = data.getUint16(26, true) & 0x3fff; height = data.getUint16(28, true) & 0x3fff;
    } else if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      width = 1 + bytes[21] + ((bytes[22] & 0x3f) << 8);
      height = 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10);
    }
  }
  if (!type || !width || !height) throw new Error('Use a valid, non-animated PNG, JPEG, WebP or uncompressed BMP image. Large or malformed metadata is not supported.');
  if (mask) {
    if (width !== height || width < 8 || width > 1024) throw new Error('Calibration mask must be square, between 8 and 1,024 pixels.');
  } else validateDimensions(width, height);
  return { width, height, type };
}

export async function decodeMask(blob: Blob, name: string): Promise<AlphaMask> {
  const { width } = await inspectImage(blob, true);
  const image = await createImageBitmap(blob);
  const canvas = createCanvas(width, width);
  try {
    const ctx = context2d(canvas);
    ctx.drawImage(image, 0, 0);
    const alpha = readAlpha(ctx.getImageData(0, 0, width, width).data);
    let usable = 0, opaque = 0;
    for (const a of alpha) { if (a > 0.01 && a < 0.99) usable++; if (a >= 0.99) opaque++; }
    if (usable < 4 || opaque / alpha.length > 0.05) throw new Error('This mask is opaque or has no calibrated opacity values. Opaque logos cannot be reversed. Use a white-on-black alpha calibration.');
    return { name, size: width, alpha };
  } finally { image.close(); releaseCanvas(canvas); }
}

let builtInMasks: Promise<AlphaMask[]> | undefined;
export async function loadMasks(settings: RemovalSettings, signal?: AbortSignal): Promise<AlphaMask[]> {
  throwIfAborted(signal);
  if (settings.profile === 'custom' && settings.customMask) {
    const mask = await decodeMask(settings.customMask, 'custom');
    throwIfAborted(signal);
    return [mask];
  }
  if (!builtInMasks) {
    builtInMasks = Promise.all([
      ['compact', '/masks/compact-48.png'], ['classic', '/masks/classic-96.png'], ['modern', '/masks/modern-96.png'],
    ].map(async ([name, path]) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error('Watermark calibration could not be loaded. Refresh and try again.');
      return decodeMask(await response.blob(), name);
    })).catch(error => { builtInMasks = undefined; throw error; });
  }
  const masks = await builtInMasks;
  throwIfAborted(signal);
  return settings.profile === 'auto' ? masks : masks.filter(mask => mask.name === (settings.profile === 'custom' ? 'compact' : settings.profile));
}
