import {
  Input, BlobSource, MP4, QTFF, WEBM, CanvasSink, CanvasSource,
  EncodedPacketSink, EncodedAudioPacketSource, Output, Mp4OutputFormat,
  StreamTarget, Quality, canEncodeVideo,
  type EncodedPacket, type StreamTargetChunk,
} from 'mediabunny';
import { context2d, createCanvas, loadMasks, normalizeSettings, releaseCanvas, throwIfAborted, validateDimensions, yieldToBrowser, type WorkingCanvas } from './browser';
import { applyDetection, buildCandidates, detectWatermark, examineCandidate } from './detection';
import { clamp } from './math';
import { MEDIA_LIMITS, type Detection, type ProcessOptions, type ProcessResult, type RemovalSettings } from './types';

export async function getVideoSupport(): Promise<{ supported: boolean; reason: string }> {
  if (!globalThis.isSecureContext) return { supported: false, reason: 'Video processing needs HTTPS or localhost.' };
  if (!('VideoEncoder' in globalThis) || !('VideoDecoder' in globalThis)) {
    return { supported: false, reason: 'This browser does not expose WebCodecs video encoding. Try current Chrome or Edge on a desktop.' };
  }
  try {
    if (await canEncodeVideo('avc', { width: 640, height: 360, quality: new Quality('high') })) {
      return { supported: true, reason: 'Local MP4 export is available. Each file is also checked for codec compatibility.' };
    }
  } catch { /* Report capability rather than a low-level driver error. */ }
  return { supported: false, reason: 'H.264 encoding is unavailable on this browser/device. Try current Chrome or Edge with hardware acceleration enabled.' };
}

/** A seekable in-memory target with a hard byte ceiling, avoiding unbounded BufferTarget growth. */
function boundedTarget(maxBytes: number, signal?: AbortSignal) {
  const blockSize = 1024 * 1024;
  const blocks = new Map<number, Uint8Array<ArrayBuffer>>();
  let length = 0;
  const target = new StreamTarget(new WritableStream<StreamTargetChunk>({
    write({ data, position }) {
      throwIfAborted(signal);
      const end = position + data.length;
      if (!Number.isSafeInteger(position) || position < 0 || end > maxBytes) throw new Error('The output reached the 256 MB memory limit. Use a shorter or smaller video.');
      length = Math.max(length, end);
      for (let i = 0; i < data.length;) {
        const at = position + i, index = Math.floor(at / blockSize), offset = at % blockSize;
        let block = blocks.get(index);
        if (!block) { block = new Uint8Array(blockSize); blocks.set(index, block); }
        const count = Math.min(blockSize - offset, data.length - i);
        block.set(data.subarray(i, i + count), offset); i += count;
      }
    },
  }));
  return {
    target,
    blob() {
      const parts: Uint8Array<ArrayBuffer>[] = [];
      for (let offset = 0; offset < length; offset += blockSize) {
        const block = blocks.get(Math.floor(offset / blockSize));
        if (!block) throw new Error('Video export is incomplete.');
        parts.push(block.subarray(0, Math.min(blockSize, length - offset)));
      }
      const result = new Blob(parts, { type: 'video/mp4' });
      blocks.clear();
      return result;
    },
    clear() { blocks.clear(); },
  };
}

interface AudioCopy {
  source: EncodedAudioPacketSource;
  packets: AsyncGenerator<EncodedPacket, void, unknown>;
  next: IteratorResult<EncodedPacket, void>;
  decoderConfig: NonNullable<Awaited<ReturnType<import('mediabunny').InputAudioTrack['getDecoderConfig']>>>;
  first: boolean;
}

export async function processVideo(file: Blob, settings: RemovalSettings, options: ProcessOptions = {}): Promise<ProcessResult> {
  throwIfAborted(options.signal);
  if (!file.size) throw new Error('This file is empty.');
  if (file.size > MEDIA_LIMITS.videoBytes) throw new Error('Video exceeds the 100 MB file limit.');
  const support = await getVideoSupport();
  if (!support.supported) throw new Error(support.reason);
  const config = normalizeSettings(settings);
  const input = new Input({ source: new BlobSource(file), formats: [MP4, QTFF, WEBM] });
  let output: Output | undefined, working: WorkingCanvas | undefined, scaled: WorkingCanvas | undefined;
  let finalized = false;
  const audioCopies: AudioCopy[] = [];
  const storage = boundedTarget(MEDIA_LIMITS.videoOutputBytes, options.signal);
  const onAbort = () => { input.dispose(); if (output) void output.cancel().catch(() => {}); };
  options.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    options.onProgress?.(0.01, 'Checking video and audio');
    if (!(await input.canRead())) throw new Error('Use a valid MP4, MOV or WebM file.');
    const videoTracks = await input.getVideoTracks();
    const audioTracks = await input.getAudioTracks();
    if (videoTracks.length !== 1) throw new Error('Use a file containing exactly one video track.');
    if (audioTracks.length > 8) throw new Error('Videos with more than eight audio tracks are not supported.');
    const track = videoTracks[0];
    const [width, height, codedWidth, codedHeight, start, end, videoStart] = await Promise.all([
      track.getDisplayWidth(), track.getDisplayHeight(), track.getCodedWidth(), track.getCodedHeight(),
      input.getFirstTimestamp(), input.computeDuration(), track.getFirstTimestamp(),
    ]);
    throwIfAborted(options.signal);
    validateDimensions(width, height, true);
    validateDimensions(codedWidth, codedHeight, true);
    const origin = Math.max(0, start), duration = end - origin;
    if (!Number.isFinite(duration) || duration <= 0 || duration > MEDIA_LIMITS.videoDuration) throw new Error('Use a video between 0 and 300 seconds long.');
    if (!(await track.canDecode())) throw new Error('This browser cannot decode this video codec. Convert it to H.264 MP4 first.');
    if (await track.hasHighDynamicRange()) throw new Error('HDR video is not supported. Export an SDR version first to preserve the intended colors.');
    if (await track.canBeTransparent()) throw new Error('Transparent video is not supported for MP4 export.');
    const outWidth = Math.round(options.width ?? (options.height ? width * options.height / height : width));
    const outHeight = Math.round(options.height ?? (options.width ? height * options.width / width : height));
    validateDimensions(outWidth, outHeight, true);
    if (outWidth % 2 || outHeight % 2) throw new Error('H.264 export needs even pixel dimensions. Resize the video to an even width and height first.');
    const [packetStats, metadataBitrate] = await Promise.all([track.computePacketStats(180), track.getAverageBitrate()]);
    throwIfAborted(options.signal);
    const sourceBitrate = metadataBitrate && Number.isFinite(metadataBitrate) && metadataBitrate > 0
      ? metadataBitrate : packetStats.averageBitrate;
    const frameRate = Number.isFinite(packetStats.averagePacketRate) && packetStats.averagePacketRate > 0
      ? packetStats.averagePacketRate : 30;
    const pixelRatio = outWidth * outHeight / (width * height);
    const qualityFactor = 0.3 + clamp(options.quality ?? 0.95, 0.1, 1) * 0.7;
    // Follow the source stream's bitrate when known, with bounded floor/ceiling for browser export.
    // Packet statistics and quality scaling can yield fractions; WebCodecs requires an integer.
    const bitrate = Math.round(clamp((Number.isFinite(sourceBitrate) && sourceBitrate > 0
      ? sourceBitrate * pixelRatio : outWidth * outHeight * frameRate * 0.13) * qualityFactor, 500_000, 20_000_000));
    const quality = new Quality({ bitrate });
    if (!(await canEncodeVideo('avc', { width: outWidth, height: outHeight, quality }))) throw new Error('H.264 encoding at this resolution is unavailable on your device. Resize the video or try another browser.');
    if (duration * bitrate / 8 > MEDIA_LIMITS.videoOutputBytes * 0.9) throw new Error('This resolution and duration would exceed the 256 MB output limit. Use a shorter or smaller video.');

    const format = new Mp4OutputFormat({ fastStart: false });
    // Check all audio tracks before processing a single frame. Never silently drop or re-encode audio.
    const audioInfo = await Promise.all(audioTracks.map(async audio => ({
      track: audio, codec: await audio.getCodec(), decoderConfig: await audio.getDecoderConfig(),
      languageCode: await audio.getLanguageCode(), name: await audio.getName(),
    })));
    for (const audio of audioInfo) {
      if (!audio.codec || !audio.decoderConfig || !format.getSupportedAudioCodecs().includes(audio.codec)) {
        throw new Error(`The ${audio.codec ?? 'unknown'} audio track cannot be copied into MP4. Export a compatible AAC audio version first; your audio has not been removed.`);
      }
    }
    const masks = await loadMasks(config, options.signal);
    const candidates = buildCandidates(width, height, masks, config, true);
    if (!candidates.length) throw new Error('The watermark region is outside this video. Reset the size or position.');
    working = createCanvas(width, height);
    const ctx = context2d(working);
    const sink = new CanvasSink(track, { poolSize: 1 });
    let detection: Detection | null = null;
    const sampleTimes = [0.1, 0.4, 0.7, 0.92].map(fraction => videoStart + (end - videoStart) * fraction);
    for (let i = 0; i < sampleTimes.length; i++) {
      throwIfAborted(options.signal);
      const frame = await sink.getCanvas(sampleTimes[i]);
      if (!frame) continue;
      ctx.drawImage(frame.canvas, 0, 0);
      const match = await detectWatermark(ctx, candidates, config, options.signal);
      if (match?.accepted && (!detection || match.confidence > detection.confidence)) detection = match;
      options.onProgress?.(0.03 + i * 0.02, 'Checking watermark across sample frames');
    }
    if (!detection) {
      options.onProgress?.(1, 'Original kept');
      return { blob: file, width, height, duration, detected: false, confidence: 0,
        message: 'No reliable matching watermark in the sampled video frames. The original file and audio are unchanged.' };
    }
    if (outWidth !== width || outHeight !== height) scaled = createCanvas(outWidth, outHeight);
    const outCtx = scaled ? context2d(scaled) : undefined;
    const videoSource = new CanvasSource(scaled ?? working, { codec: 'avc', quality, keyFrameInterval: 2 });
    output = new Output({ format, target: storage.target });
    // No frameRate metadata: preserve original variable frame timing without snapping.
    output.addVideoTrack(videoSource);
    for (const audio of audioInfo) {
      const source = new EncodedAudioPacketSource(audio.codec!);
      output.addAudioTrack(source, { languageCode: audio.languageCode, name: audio.name ?? undefined });
      const packets = new EncodedPacketSink(audio.track).packets();
      audioCopies.push({ source, packets, next: await packets.next(), decoderConfig: audio.decoderConfig!, first: true });
    }
    throwIfAborted(options.signal);
    await output.start();
    const copyAudioUntil = async (time: number) => {
      for (const audio of audioCopies) {
        while (!audio.next.done && audio.next.value.timestamp <= time) {
          throwIfAborted(options.signal);
          const packet = audio.next.value;
          if (packet.timestamp > end + 1 || packet.duration > MEDIA_LIMITS.videoDuration) throw new Error('Invalid audio timestamps in this file.');
          await audio.source.add(origin ? packet.clone({ timestamp: packet.timestamp - origin }) : packet,
            audio.first ? { decoderConfig: audio.decoderConfig } : undefined);
          audio.first = false;
          audio.next = await audio.packets.next();
        }
        if (audio.next.done) audio.source.close();
      }
    };
    let totalFrames = 0, processedFrames = 0;
    for await (const frame of sink.canvases()) {
      throwIfAborted(options.signal);
      if (++totalFrames > 36_000 || frame.timestamp - origin > MEDIA_LIMITS.videoDuration + 0.1) throw new Error('Video has too many frames or invalid timestamps.');
      if (frame.canvas.width !== width || frame.canvas.height !== height) throw new Error('Videos that change frame dimensions are not supported.');
      ctx.drawImage(frame.canvas, 0, 0);
      // Re-check each frame at the stable detected location to avoid damaging scenes where the mark disappears.
      const current = examineCandidate(ctx, detection.candidate, config);
      if (current.accepted) { applyDetection(ctx, current); processedFrames++; }
      if (outCtx && scaled) outCtx.drawImage(working, 0, 0, outWidth, outHeight);
      await videoSource.add(frame.timestamp - origin, frame.duration);
      // Interleave compressed audio near the video clock instead of buffering the whole soundtrack.
      await copyAudioUntil(frame.timestamp + frame.duration + 0.1);
      options.onProgress?.(Math.min(0.96, 0.1 + (frame.timestamp - origin) / duration * 0.86), `Processing frame ${totalFrames}`);
      if (totalFrames % 4 === 0) await yieldToBrowser(options.signal);
    }
    videoSource.close();
    await copyAudioUntil(Infinity);
    if (!totalFrames) throw new Error('No decodable video frames were found.');
    if (!processedFrames) {
      await output.cancel();
      options.onProgress?.(1, 'Original kept');
      return { blob: file, width, height, duration, detected: false, confidence: detection.confidence,
        message: 'The watermark could not be safely corrected. The original video and audio are unchanged.', totalFrames, processedFrames };
    }
    options.onProgress?.(0.98, 'Finalizing MP4 with original audio');
    await output.finalize();
    finalized = true;
    throwIfAborted(options.signal);
    const blob = storage.blob();
    options.onProgress?.(1, 'Video ready');
    return { blob, width: outWidth, height: outHeight, duration, detected: true, confidence: detection.confidence, processedFrames, totalFrames,
      message: `${processedFrames} of ${totalFrames} frames matched and were corrected. ${audioTracks.length ? 'Original compressed audio was preserved.' : 'The source has no audio track.'} Video was re-encoded as H.264; review the result.` };
  } catch (error) {
    throwIfAborted(options.signal);
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    if (output && !finalized) await output.cancel().catch(() => {});
    for (const audio of audioCopies) await audio.packets.return().catch(() => {});
    input.dispose();
    storage.clear(); releaseCanvas(working); releaseCanvas(scaled);
  }
}
