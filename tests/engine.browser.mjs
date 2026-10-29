// Run after `npm run dev`: node tests/engine.browser.mjs
// Uses a real Chromium browser; no media is uploaded by these checks.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await browser.newPage();
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173/');
  const result = await page.evaluate(async () => {
    const engine = await import('/src/engine/index.ts');
    const bunny = await import('/node_modules/.vite/deps/mediabunny.js');
    const { DEFAULT_SETTINGS, processImage, processVideo, getVideoSupport } = engine;
    const settings = { ...DEFAULT_SETTINGS, profile: 'compact' };
    const bitmap = await createImageBitmap(await (await fetch('/masks/compact-48.png')).blob());
    const calibration = document.createElement('canvas'); calibration.width = calibration.height = 48;
    const maskCtx = calibration.getContext('2d'); maskCtx.drawImage(bitmap, 0, 0); bitmap.close();
    const rawMask = maskCtx.getImageData(0, 0, 48, 48).data;
    const alpha = Float32Array.from({ length: 48 * 48 }, (_, i) => Math.max(...rawMask.subarray(i * 4, i * 4 + 3)) / 255);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const drawFixture = (watermark, step = 0) => {
      const pixels = ctx.createImageData(512, 512);
      for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
        const i = (y * 512 + x) * 4;
        pixels.data[i] = 30 + Math.round(x * 0.1) + step;
        pixels.data[i + 1] = 60 + Math.round(y * 0.06) + step;
        pixels.data[i + 2] = 95 + Math.round((x + y) * 0.03) + step;
        pixels.data[i + 3] = 255;
      }
      if (watermark) for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
        const at = ((y + 432) * 512 + x + 432) * 4, a = alpha[y * 48 + x];
        for (let c = 0; c < 3; c++) pixels.data[at + c] = Math.round(pixels.data[at + c] * (1 - a) + a * 255);
      }
      ctx.putImageData(pixels, 0, 0);
    };
    const toBlob = () => new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    drawFixture(false);
    const clean = await toBlob();
    const originalPixels = ctx.getImageData(0, 0, 512, 512).data;
    drawFixture(true);
    const marked = await toBlob();
    const progress = [];
    const corrected = await processImage(marked, settings, { onProgress: n => progress.push(n) });
    const outputBitmap = await createImageBitmap(corrected.blob);
    ctx.drawImage(outputBitmap, 0, 0); outputBitmap.close();
    const correctedPixels = ctx.getImageData(0, 0, 512, 512).data;
    let maxError = 0, meanError = 0;
    for (let i = 0; i < correctedPixels.length; i++) {
      const error = Math.abs(correctedPixels[i] - originalPixels[i]); maxError = Math.max(maxError, error); meanError += error;
    }
    meanError /= correctedPixels.length;
    const unchanged = await processImage(clean, settings);
    const converted = await processImage(marked, settings, { format: 'webp', width: 256, height: 256 });
    const pinnedScaled = await processImage(marked, { ...settings, scale: 2, position: { x: 444, y: 444, size: 24 } });
    const bmpBitmap = await createImageBitmap(marked); ctx.drawImage(bmpBitmap, 0, 0); bmpBitmap.close();
    const bmpPixels = ctx.getImageData(0, 0, 512, 512).data;
    const bmpBytes = new Uint8Array(54 + 512 * 512 * 3), bmpHeader = new DataView(bmpBytes.buffer);
    bmpBytes[0] = 66; bmpBytes[1] = 77;
    bmpHeader.setUint32(2, bmpBytes.length, true); bmpHeader.setUint32(10, 54, true);
    bmpHeader.setUint32(14, 40, true); bmpHeader.setInt32(18, 512, true); bmpHeader.setInt32(22, 512, true);
    bmpHeader.setUint16(26, 1, true); bmpHeader.setUint16(28, 24, true);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const src = (y * 512 + x) * 4, dst = 54 + ((511 - y) * 512 + x) * 3;
      bmpBytes[dst] = bmpPixels[src + 2]; bmpBytes[dst + 1] = bmpPixels[src + 1]; bmpBytes[dst + 2] = bmpPixels[src];
    }
    const bmpResult = await processImage(new Blob([bmpBytes], { type: 'image/bmp' }), settings);
    bmpHeader.setUint32(30, 1, true);
    let compressedBmp = '';
    try { await processImage(new Blob([bmpBytes], { type: 'image/bmp' }), settings); } catch (error) { compressedBmp = error.message; }
    const controller = new AbortController(); controller.abort();
    let cancellation = '';
    try { await processImage(marked, settings, { signal: controller.signal }); } catch (error) { cancellation = error.name; }
    let spoofed = '';
    try { await processImage(new Blob(['not-an-image'], { type: 'image/png' }), settings); } catch (error) { spoofed = error.message; }
    const header = new Uint8Array(await marked.arrayBuffer());
    new DataView(header.buffer).setUint32(16, 100_000);
    let oversized = '';
    try { await processImage(new Blob([header]), settings); } catch (error) { oversized = error.message; }
    const support = await getVideoSupport();
    const images = {
      matched: corrected.detected, confidence: corrected.confidence, maxError, meanError,
      unchanged: unchanged.blob === clean && !unchanged.detected,
      converted: converted.blob.type === 'image/webp' && converted.width === 256 && converted.height === 256,
      progressValid: progress.every(n => n >= 0 && n <= 1) && progress.at(-1) === 1,
      cancellation, spoofed, oversized, pinnedScaleWorks: pinnedScaled.detected,
      bmpMatched: bmpResult.detected && bmpResult.blob.type === 'image/png', compressedBmpRejected: compressedBmp.includes('uncompressed'),
    };
    if (!support.supported) return { images, video: { supported: false, reason: support.reason } };

    const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, AudioBufferSource, Quality,
      Input, BlobSource, ALL_FORMATS, EncodedPacketSink, CanvasSink } = bunny;
    const fixtureTarget = new BufferTarget();
    const fixtureOutput = new Output({ target: fixtureTarget, format: new Mp4OutputFormat({ fastStart: false }) });
    const videoSource = new CanvasSource(canvas, { codec: 'avc', quality: new Quality({ bitrate: 3_000_000 }) });
    const audioSource = new AudioBufferSource({ codec: 'aac', quality: new Quality({ bitrate: 128_000 }) });
    fixtureOutput.addVideoTrack(videoSource);
    fixtureOutput.addAudioTrack(audioSource);
    await fixtureOutput.start();
    const audio = new AudioBuffer({ numberOfChannels: 1, sampleRate: 48000, length: 96000 });
    const samples = audio.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i * 440 * 2 * Math.PI / 48000) * 0.2;
    await audioSource.add(audio); audioSource.close();
    for (let i = 0; i < 24; i++) { drawFixture(true, i % 4); await videoSource.add(i / 12, 1 / 12); }
    videoSource.close(); await fixtureOutput.finalize();
    const videoFixture = new Blob([fixtureTarget.buffer], { type: 'video/mp4' });
    const videoResult = await processVideo(videoFixture, settings);
    const packets = async blob => {
      const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
      try {
        const track = await input.getPrimaryAudioTrack();
        const bytes = [], times = [];
        for await (const packet of new EncodedPacketSink(track).packets()) {
          bytes.push(...packet.data); times.push([packet.timestamp, packet.duration]);
        }
        const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
        return { hash: Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join(''), times };
      } finally { input.dispose(); }
    };
    const beforeAudio = await packets(videoFixture), afterAudio = await packets(videoResult.blob);
    const inputResult = new Input({ source: new BlobSource(videoResult.blob), formats: ALL_FORMATS });
    const outputTrack = await inputResult.getPrimaryVideoTrack();
    const sample = await new CanvasSink(outputTrack, { poolSize: 1 }).getCanvas(0.5);
    const resultCtx = sample.canvas.getContext('2d');
    const exportedPixels = resultCtx.getImageData(432, 432, 48, 48).data;
    drawFixture(false, 6 % 4);
    const expectedPixels = ctx.getImageData(432, 432, 48, 48).data;
    let videoMeanError = 0;
    for (let i = 0; i < exportedPixels.length; i++) videoMeanError += Math.abs(exportedPixels[i] - expectedPixels[i]);
    videoMeanError /= exportedPixels.length;
    inputResult.dispose();
    const cancelVideo = new AbortController(); let videoCancellation = '';
    try {
      await processVideo(videoFixture, settings, { signal: cancelVideo.signal, onProgress: n => { if (n > 0.2 && n < 0.96) cancelVideo.abort(); } });
    } catch (error) { videoCancellation = error.name; }
    const bytes = async blob => Array.from(new Uint8Array(await blob.arrayBuffer()));
    return { images, video: {
      supported: true, matched: videoResult.detected, frames: videoResult.totalFrames,
      correctedFrames: videoResult.processedFrames, type: videoResult.blob.type,
      audioHashMatches: beforeAudio.hash === afterAudio.hash,
      audioPackets: beforeAudio.times.length,
      audioPacketTimesMatch: JSON.stringify(beforeAudio.times) === JSON.stringify(afterAudio.times),
      videoMeanError, videoCancellation,
      fixture: await bytes(videoFixture), output: await bytes(videoResult.blob),
    }, fixture: await bytes(marked), output: await bytes(corrected.blob) };
  });
  await mkdir('tests/engine-fixtures', { recursive: true });
  if (result.fixture) await writeFile('tests/engine-fixtures/synthetic-watermarked.png', Buffer.from(result.fixture));
  if (result.output) await writeFile('tests/engine-fixtures/synthetic-corrected.png', Buffer.from(result.output));
  if (result.video.fixture) await writeFile('tests/engine-fixtures/synthetic-audio-watermarked.mp4', Buffer.from(result.video.fixture));
  if (result.video.output) await writeFile('tests/engine-fixtures/synthetic-audio-corrected.mp4', Buffer.from(result.video.output));
  delete result.fixture; delete result.output; delete result.video.fixture; delete result.video.output;
  console.log(JSON.stringify(result, null, 2));
  await writeFile('tests/engine-fixtures/browser-results.json', JSON.stringify(result, null, 2) + '\n');
  assert.equal(result.images.matched, true);
  assert.ok(result.images.maxError <= 3);
  assert.equal(result.images.unchanged, true);
  assert.equal(result.images.converted, true);
  assert.equal(result.images.pinnedScaleWorks, true);
  assert.equal(result.images.bmpMatched, true);
  assert.equal(result.images.compressedBmpRejected, true);
  assert.equal(result.images.progressValid, true);
  assert.equal(result.images.cancellation, 'AbortError');
  assert.ok(result.images.spoofed.includes('valid'));
  assert.ok(result.images.oversized.includes('40 megapixels'));
  assert.equal(result.video.supported, true, result.video.reason);
  assert.equal(result.video.matched, true);
  assert.equal(result.video.frames, 24);
  assert.equal(result.video.correctedFrames, 24);
  assert.equal(result.video.audioHashMatches, true);
  assert.equal(result.video.audioPacketTimesMatch, true);
  assert.ok(result.video.videoMeanError < 4);
  assert.equal(result.video.videoCancellation, 'AbortError');
} finally { await browser.close(); }
