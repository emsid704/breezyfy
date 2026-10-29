import { createCanvas, context2d, encodeCanvas, inspectImage, loadMasks, normalizeSettings, releaseCanvas, throwIfAborted, validateDimensions, yieldToBrowser, type WorkingCanvas } from './browser';
import { applyDetection, buildCandidates, detectWatermark } from './detection';
import { clamp } from './math';
import type { ProcessOptions, ProcessResult, RemovalSettings } from './types';

export async function processImage(file: Blob, settings: RemovalSettings, options: ProcessOptions = {}): Promise<ProcessResult> {
  throwIfAborted(options.signal);
  const config = normalizeSettings(settings);
  options.onProgress?.(0.02, 'Checking image');
  await inspectImage(file);
  throwIfAborted(options.signal);
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let canvas: WorkingCanvas | undefined, exported: WorkingCanvas | undefined;
  try {
    throwIfAborted(options.signal);
    const { width, height } = bitmap;
    validateDimensions(width, height);
    canvas = createCanvas(width, height);
    const ctx = context2d(canvas);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    options.onProgress?.(0.15, 'Matching watermark');
    const masks = await loadMasks(config, options.signal);
    const candidates = buildCandidates(width, height, masks, config);
    if (!candidates.length) throw new Error('The selected watermark region is outside the image. Reset its size or position.');
    const match = await detectWatermark(ctx, candidates, config, options.signal);
    if (!match?.accepted) {
      options.onProgress?.(1, 'Original kept');
      return { blob: file, width, height, detected: false, confidence: match?.confidence ?? 0,
        message: 'No reliable match for the selected watermark. The original file is unchanged. Try the correct profile or adjust its position.' };
    }
    applyDetection(ctx, match);
    options.onProgress?.(0.7, 'Exporting image');
    await yieldToBrowser(options.signal);
    let outputWidth = options.width ?? (options.height ? Math.round(width * options.height / height) : width);
    let outputHeight = options.height ?? (options.width ? Math.round(height * options.width / width) : height);
    outputWidth = Math.round(outputWidth); outputHeight = Math.round(outputHeight);
    validateDimensions(outputWidth, outputHeight);
    const type = `image/${options.format ?? 'png'}`;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(type)) throw new Error('Unsupported export format.');
    if (outputWidth !== width || outputHeight !== height || type === 'image/jpeg') {
      exported = createCanvas(outputWidth, outputHeight);
      const exportCtx = context2d(exported);
      if (type === 'image/jpeg') { exportCtx.fillStyle = '#ffffff'; exportCtx.fillRect(0, 0, outputWidth, outputHeight); }
      exportCtx.imageSmoothingEnabled = true; exportCtx.imageSmoothingQuality = 'high';
      exportCtx.drawImage(canvas, 0, 0, outputWidth, outputHeight);
    }
    const blob = await encodeCanvas(exported ?? canvas, type, clamp(options.quality ?? 0.95, 0.1, 1), options.signal);
    options.onProgress?.(1, 'Image ready');
    return { blob, width: outputWidth, height: outputHeight, detected: true, confidence: match.confidence,
      message: `${match.candidate.mask.name === 'custom' ? 'Custom' : match.candidate.mask.name.charAt(0).toUpperCase() + match.candidate.mask.name.slice(1)} watermark matched and corrected. Review the comparison before downloading.` };
  } finally { bitmap.close(); releaseCanvas(canvas); releaseCanvas(exported); }
}
