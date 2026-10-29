# Local media engine

Breezyfy independently implements calibrated visible-overlay correction. The core category matches the public method observed at Erasio: reverse alpha blending for pixels, Canvas rendering, and WebCodecs with MP4 track handling for video. It is not an exact reproduction of Erasio's proprietary source, calibration library or special Veo/Omni pipeline.

## Image path

`src/engine/browser.ts` validates actual file bytes and dimensions before decoding. PNG, JPEG, non-animated WebP and uncompressed 24/32-bit BMP are admitted within the documented limits. `image.ts` decodes the image, evaluates a bounded set of calibrated candidates and applies a correction only when the match and damage checks accept it.

For an observed pixel `P`, white overlay value `W = 255` and opacity `a`, the underlying estimate is `(P - a × W) / (1 - a)`. Quantization, clipping, compression or an incorrect calibration prevent exact recovery. Fully opaque pixels cannot be inverted. `math.ts` retains opaque/unreliable areas instead of claiming to recover unknowable pixels.

Profiles are compact (48 px), classic (96 px), and a modern May-2026 calibration (96 px). Auto evaluates available candidate profiles. The engine API also accepts a caller-supplied custom calibration; the current website UI exposes the three built-in families and auto. Manual image placement defines a base rectangle, and scaling expands it around its centre.

Accepted corrections can export PNG, JPEG or WebP and resize. JPEG flattens transparency onto white. Files without a reliable accepted match are returned unchanged, so export conversion/resize does not silently alter an unmatched original.

## Video path

`src/engine/video.ts` uses Mediabunny for container parsing and muxing, and the browser's WebCodecs encoders/decoders. The website accepts MP4. One supported SDR video track and up to eight compatible audio tracks are admitted. HDR, transparent video, incompatible codecs and unsafe dimensions/durations receive errors.

Sample frames establish a stable candidate region. Each subsequent frame is checked before correction so a disappearing mark does not force the same patch into every scene. Original frame timestamps/durations are passed to the H.264 encoder. Output bitrate follows source metadata or sampled packet statistics within an enforced 500 kbit/s–20 Mbit/s range. This is an independent policy, not a claim that Erasio uses identical settings.

Compatible compressed audio packets are copied with their configuration and track metadata. Audio is not silently discarded or re-encoded as a fallback. The synthetic browser test verifies all 94 audio packets and timestamps remain identical in its tested MP4. Video pixels are re-encoded and therefore are not described as lossless.

Processing is sequential with frame-pool/backpressure controls. Cancellation disposes the input and cancels unfinished output. The output target enforces a 256 MB ceiling. See `types.ts` for file, dimension, pixel, duration and frame guards.

## Calibration provenance

Only calibration images obtained from the MIT-licensed [GargantuaX/gemini-watermark-remover](https://github.com/GargantuaX/gemini-watermark-remover) project are shipped. The license credits Jad and AllenK (Kwyshell). The retained notice is `licenses/gemini-watermark-remover.MIT.txt`; deployed notices are generated in `public/third-party-notices.txt`. File hashes are recorded in `public/masks/provenance.json`.

No downloaded Erasio engine source or Erasio calibration asset is included in the application or deployment archives. Public browser-code research remains separate from the independent engine implementation.

## API and tests

`src/engine/index.ts` exports the shared settings/types, `processImage`, `processVideo` and `getVideoSupport`. Progress fractions range from zero to one; an aborted job reports `AbortError`. Results expose the blob, dimensions, detection state, confidence score and a user-facing explanation. Confidence is a match score, not a calibrated probability.

Unit tests exercise math and safety behavior. Browser integration tests construct licensed-mask image/video fixtures and compare actual exported pixels, format, dimensions and audio. These establish the tested cases, not universal Gemini/Flow support. `docs/VALIDATION.md` records results; `docs/FEATURE-COVERAGE.md` records missing comparison features.
