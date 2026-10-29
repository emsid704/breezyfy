# Validation record

29 October 2026. Tests run locally on Windows using installed Chrome. No deployment or DNS changes were performed.

## Verified

- Production TypeScript/Vite build succeeds; libraries and fonts are local, with video processing in a separate lazy-loaded bundle.
- Eight mathematical tests passed: translucent reconstruction, unmodified clean image, rejection of unrelated texture and clipping, opaque-alpha guard, mask decoding, resize and feather behavior.
- Browser image test reconstructed a synthetic calibrated overlay with maximum channel error **1/255**. A clean source was returned unchanged. WebP resize, malformed input, excessive dimensions and cancellation were checked.
- Added checks passed for uncompressed BMP correction, compressed BMP rejection, and mask scaling around a manually pinned centre.
- Browser MP4 test corrected **24/24 frames** of a generated clip. All **94 compressed audio packets** retained identical bytes and timestamps. Cancellation returned `AbortError`.
- UI test verified real demo export, PNG signature, ZIP contents, expanded preview, saved theme/settings, mixed-media processing with isolated invalid-file failure, WebP resizing, independent video dimensions, original/result metadata, mobile controls, legal/contact routes and no application JavaScript errors.
- The UI/export suite also passed against the production build served by Vite preview.
- The UI test observed no application media-upload requests or third-party network destinations. A visitor's hosting requests remain normal web traffic; browser extensions are outside this guarantee.
- Desktop and 390 px mobile screenshots inspected; no horizontal overflow at tested widths. Both light and dark controls are functional. The user's Tabbit profile applies an external dark-mode extension; isolated Chrome screenshots establish the application's own light appearance.

## Limits of these checks

Synthetic overlays prove the tested arithmetic and pipeline, not identical quality to Erasio on all real Gemini, Nano Banana, Veo or Flow outputs. No comprehensive real-world generator corpus was supplied. Opaque marks and the proprietary special Veo/Omni pipeline are not equivalent features in this release.

Tests do not certify legal compliance, all browsers/hardware, every codec, maximum-size concurrency, or all possible malformed files. Current Chrome on this machine has the required codecs; other devices may receive capability errors.

Source tests: `tests/engine.test.ts`, `tests/engine.browser.mjs`, `tests/ui.browser.mjs`. The synthetic media and measured browser results are in `tests/engine-fixtures/`. UI artifacts are local-only in `.qa/` and excluded from source/deployment packages.

## Commands

```sh
npm test
npm run build
```

With `npm run dev` running separately:

```sh
npm run test:browser
npm run test:ui
```

`CHROME_PATH` selects another installed Chromium executable. `TEST_URL` selects the local test server. Engine source-module tests require the Vite dev server; UI tests also support a production preview.
