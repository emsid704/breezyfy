# Erasio public feature audit for Breezyfy

Observed 2026-10-29. Scope: read-only public documentation, not logged-in execution. Parent agent owns REA runtime and bundle inspection. Labels below distinguish advertised behavior from verified runtime behavior. Nothing here establishes access to Erasio's private backend or a license to copy its engine/calibration assets.

User scope update relayed by parent: Breezyfy is free, with no login/payment. Admin panel is deferred. Accounts, credits, subscriptions, checkout, referrals, and their associated backend are therefore deliberately excluded. Website creation does not implicitly include publishing an extension or Android app.

## Website input and processing

Source: [Online tool](https://erasio.io/tool).

- Single-file mode, batch entry, drag/drop, file picker, clipboard paste.
- Accepted extensions advertised: PNG, JPG, WebP, BMP; MP4 video.
- Advertised caps: 50 MB per image; 100 MB per MP4.
- Standard processing targets visible Google Gemini/Nano Banana/AI Studio/Flow patterns.
- Browser-local image Canvas processing; local MP4 demux, per-frame processing, WebCodecs encoding and remux.
- Lossless PNG advertised as image output. MP4 for video; source dimensions and frame rate retained; source-derived bitrate.
- Original generated files recommended; recompressed files and screenshots may lose information needed for inversion.
- Batch and credit gates exist on Erasio but are intentionally absent in free Breezyfy.
- Runtime UI labels show video costs three credits. This differs from the FAQ's generic one-credit-per-file text.

## Batch and scope nuances

Source: [Features](https://erasio.io/features).

- Advertises up to ten images together, individual downloads, and ZIP download.
- Website works independently of browser extension; automatic interception of Google-site downloads belongs to the extension product.
- Android app is a separately advertised product, not a website capability.
- Support beyond Google's watermark families is presented as future work, not an existing general-purpose eraser.

Source: [Homepage](https://erasio.io/).

- Current homepage advertises batch processing of up to fifty images **or videos**, saved removal settings, and repeated downloads.
- The fifty-file description appears under paid plan benefits; free guides still mention ten images. This is a tier/documentation discrepancy, not proof that the latest engine only supports ten images.
- Image/video before-and-after demo, feature comparison, example gallery, FAQ, technology, legal, and guide links are public website content.
- Pricing changed between indexed copies and live page; paid commercial details need not be reproduced in Breezyfy.

Recommended Breezyfy choice: offer a clearly disclosed fifty-file sequential queue with image/video mixture, individual export, ZIP, cancellation, progress, per-item errors and retries, if the implementation can satisfy browser memory constraints. Avoid processing fifty videos concurrently. This recommendation is implementation judgment, not an observed Erasio concurrency policy.

## Image controls: public defaults and ranges

Source: [Image settings guide](https://erasio.io/image-watermark-removal-settings-guide).

| Control | Default | Range/options |
|---|---:|---|
| Trust standard placement, NCC | .50 | .2–.9 |
| Detection minimum NCC | .30 | .1–.6 |
| Search stride, pixels | 8 | 1–16 |
| Refine radius, pixels | 8 | 0–16 |
| Mask scale | 1 | .5–3 |
| Drift correction gain | .62 | .3–2 |
| Alpha ceiling | .99 | .5–1 |
| Skip alpha below | .002 | 0–.05 |
| Opaque fill | Auto | Auto/on/off |
| Fill core threshold | 75% | .3–1 |
| Fill dilation, pixels | 1 | 0–4 |
| Map family | Original | Original/2026/opaque-white |
| Logo luminance | 255 | 200–255 |

Also advertised: four presets (balanced, quality, speed, difficult), live preview, reset, manual position by click or X/Y, repeating nudge arrows, return-to-auto. Manual position is per-file, not persisted. Detection retains calibrated size while cleanup scale changes. Opaque filling reconstructs covered pixels from surroundings; it cannot recover information destroyed by a fully opaque overlay. Consequently, marketing about exact recovery does not describe every mode.

## Video controls: public defaults and ranges

Source: [Video settings guide](https://erasio.io/video-watermark-removal-settings-guide).

| Control | Default | Range/options |
|---|---:|---|
| Correction strength | 1 | .5–2 |
| Mask scale | 1 | .5–3 |
| Opacity mode | Auto | Auto/1/.62/custom |
| Custom opacity | .80 | .3–1 |
| Blend ceiling | .99 | .5–1 |
| Edge diffusion | Auto | Auto/on/off |
| Diffusion strength | .60 | .1–1 |
| Dilation radius, pixels | 2 | 0–5 |
| Maximum diffusion iterations | 120 | 10–200 |
| Map family | Original | Original/2026 |
| Overlay luminance | 255 | 200–255 |
| Bitrate multiplier | 1 | .5–3 |
| Pearson warning threshold | .35 | .1–.9 |

Advertises four presets, manual position/pixel coordinates/repeating nudge controls and auto reset, with position retained only for the current clip. Diffusion blends the patched boundary; stronger diffusion risks smoothing detail. Pearson threshold affects warning display, not the correction. Audio is retained while video is re-encoded. Original/2026 families and opacity variants are separate choices. Guide does not document an explicit resize control.

## Separate Veo/Omni pipeline

Source: [Veo & Omni page](https://erasio.io/veo-and-omni-watermark-remover).

- The explanatory section explicitly says **video only**, rejects images, and uses separate per-file automatic tuning with no settings drawer.
- Header and shared footer still mention images; do not treat those as evidence of image acceptance.
- MP4 limit is 100 MB; publicly visible UI shows three video credits and a sign-in batch gate.
- Page describes WebCodecs frame processing with original compressed audio copied across.
- Intended fallback for Veo/Omni Sparkle clips that standard processing handles poorly; standard engine is the reverse fallback.
- Documentation does not reveal the complete separate algorithm. An independently written standard pipeline must not be labeled an exact duplicate of this special pipeline.

## Technical and backend boundary

Source: [Technology](https://erasio.io/technology).

Advertised architecture uses calibrated reference patterns, luminance/color detection, inverse alpha compositing, Canvas and browser video APIs. It also mentions WebAssembly at a high level; that alone does not prove what work a WASM module performs. It expressly describes implementation details as proprietary. The visible logo is the target, not SynthID. Do not promise perfect recovery for arbitrary images: exact inversion requires an accurate alpha/color map, no irreversible clipping, and suitable source pixels. The mathematical method is reproducible independently; Erasio-specific calibration, exact heuristics and hidden services remain separate questions.

Source: [FAQ](https://erasio.io/faq).

Advertises unchanged passthrough when no mark is found, PNG output, preserved video dimensions/frame rate, source-based bitrate, and original audio copied without re-encoding. It distinguishes free guest use, account batch entitlement, daily allowances and paid balances. It claims one credit per file, conflicting with current tool video pricing. Browser statements favor Chromium for video; implement actual codec/API feature checks instead of assuming browser name proves support. These are product claims, not independently validated guarantees.

Source: [Guide](https://erasio.io/guide).

Website handles saved local files; extension intercepts downloads from Google Gemini/AI Studio/Flow. Image support includes Safari/Firefox, while video documentation requires WebCodecs. Per-file quality is described as identical across guest/account users. Files stay local; credit requests are a separate network concern. A website alone cannot automatically intercept other websites' downloads. Extension-only automation and Android install links must not appear as functioning Breezyfy features without those products actually being built.

## Preferences, history, export, resize

Source: [Changelog](https://erasio.io/changelog).

The release history describes dark mode, history, default-model preferences, auto-download, notification feedback, v1/v2 pattern choices, and PNG/WebP exports. These entries are strongly extension-oriented (popup and download interception), and are not proof that current public website exposes every feature. They also conflict with the website's PNG-only export documentation. Parent's live UI inspection should decide actual website export formats. Do not silently infer a website history screen from an extension changelog.

Source: [Privacy](https://erasio.io/privacy).

Local extension preferences include theme, model, mode and language; history normally stores filenames/time/type/model, with optional local media storage. Website privacy text discloses ads, Google Analytics, authentication, credit metering and Stripe. It describes Canvas, WebCodecs/MediaRecorder, and bundled alpha-map PNGs. These establish advertised categories, not all runtime calls. Free Breezyfy without auth/payments/analytics should have its own truthful policy, not copied claims about services it does not use. Hosting still processes ordinary request metadata.

**Needs parent runtime evidence:** adjust/resize panel, width/height/aspect lock, resampling, export quality options, actual JPG/WebP download controls, undo behavior, comparison slider, video preview, save/reset persistence, cancel/retry, ZIP behavior for videos. No requested documentation page establishes these precisely. If added independently, label them Breezyfy features rather than verified Erasio parity.

## Intellectual-property and legal-copy boundary

Source: [Terms](https://erasio.io/terms), sections 5 and 9.

Terms restrict reverse engineering/source extraction beyond applicable law, redistribution of service/calibration material, and bypassing credits or authentication. Engine, calibration data, interface and branding are claimed as Erasio property. No public license granting redistribution was identified. Therefore retain behavior-level findings and write original application code/copy/assets; do not ship downloaded calibration files or recovered proprietary code. This is a faithful description of published terms, not a legal determination of enforceability.

Breezyfy documents should reflect its actual free local-processing implementation, permitted content use, ownership, AI disclosure responsibilities, no promised perfect output, standard host metadata, browser storage and deletion behavior. Operator identity, contact channel and jurisdiction are still missing; do not invent them or guarantee that generic terms eliminate legal risk.

## Acceptance priorities for implementation

1. Match the independently verifiable processing category: local reverse-alpha images; local per-frame video with copied audio where supported. Clearly state custom/inexact calibration and special-pipeline limitations.
2. Provide original professional responsive UI, file import, queue, before/after inspection, controls, export, ZIP and useful failure states. All displayed controls must affect output.
3. Test clean-image passthrough, supported synthetic overlays, damaged input, oversized files, reset, manual position, transparency, batch isolation, cancellation and output dimensions.
4. Test video frames, source timing, decoded/encoded support, output playback and audio preservation with a lawful local fixture. Do not substitute MediaRecorder without disclosing its timing/audio/format differences from WebCodecs remux.
5. Keep paid/auth/backend marketing excluded per user clarification. Do not claim complete A–Z parity while an unverified dedicated pipeline, calibration family, or separate product remains absent.

No application files or third-party assets were created by this audit.
