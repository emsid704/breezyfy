# Breezyfy launch checklist

Prepared 29 October 2026 for the free, browser-local website. This records concrete outstanding configuration and verification; it is not a legal-compliance certificate.

## Owner information still required

- [ ] Confirm the legal operator's name and country/jurisdiction. `Breezyfy` is currently only the supplied brand name. Do not infer residence from a computer timezone or a domain.
- [x] Configure the supplied support/privacy contact: **korisolution@gmail.com**. The owner should confirm that the inbox is monitored. No postal address or response-time guarantee has been invented.
- [ ] Add any operator details, contact information, lawful-basis explanations, retention information and regional notices applicable to the actual operator and audience.
- [ ] Have the original terms/privacy/acceptable-use text reviewed against the actual service, target markets and operator details. Mandatory consumer rights are preserved; no specific governing law or arbitrary liability cap has been invented.

## Match the policy to the final application

- [ ] Verify that selecting, processing and exporting media sends no media bytes, thumbnails or filenames to a remote server. Inspect image and video network activity with lawful local fixtures.
- [ ] Verify that persistent browser storage holds only processing preferences and theme. File content and processing history must remain absent unless the policy is changed first.
- [ ] Confirm clearing a file releases its active object URLs/references; refreshing creates an empty workspace. Do not promise secure erasure from browser/OS memory, caches or backups.
- [ ] Confirm all external assets/libraries/fonts are bundled or accurately disclosed; inspect the production build for analytics, advertising, error-reporting and third-party upload endpoints.
- [ ] Keep accounts, payment, ads, tracking and admin interfaces absent for this release, per user instruction.
- [ ] Review actual Vercel settings and data access. Determine applicable log retention rather than applying a runtime-log dashboard retention value to every CDN/security record. Do not claim all visitors are anonymous.
- [ ] Confirm that the actual deployment and any platform security cookies match the Browser Storage notice; add legally required controls if optional tracking is later enabled.

## Processing claims that need evidence

- [ ] Check all guide instructions against the delivered controls, formats, limits and error messages. Remove any described control not implemented.
- [x] Validate synthetic translucent overlays, clean-image passthrough, BMP compatibility, manual scaling, corrupt files and oversize inputs. Opaque fill is explicitly unsupported.
- [ ] Verify that each displayed setting changes processing as described. Reset and saved preferences should behave predictably.
- [ ] Verify image output MIME types, dimensions, transparency/flattening behavior and any resize/quality controls; JPEG export cannot retain transparency.
- [ ] Verify batch progress, cancellation, retry, per-file failure isolation, repeated downloads and ZIP export. Sequential video processing should not exhaust memory with a large queue.
- [x] Validate a synthetic MP4 with generated audio: 24/24 frames corrected, 94 audio packets retain identical bytes and timestamps. Broader real-world clips remain a future compatibility check.
- [ ] Confirm unsupported browser/codec paths display a clear error, rather than silently exporting a lower-fidelity substitute.
- [ ] Keep the independent-engine limitation visible in the Technology page. Public observation did not establish exact reproduction of Erasio's proprietary calibration or separate Veo/Omni pipeline.
- [ ] Do not promise perfect removal, preserved metadata, lossless video, universal browser support, or guaranteed survival/removal of invisible provenance signals.

## Publishing through the existing setup

- [ ] Check repository ownership, branch and Vercel project before replacing the old site. Keep the current deployment recoverable.
- [ ] Confirm the custom domain, HTTPS, build command, output directory and SPA/document routes against the actual project.
- [ ] Check page titles, canonical URLs, sitemap/robots behavior, mobile layout, keyboard access and all footer links on a preview.
- [ ] Run the production build and appropriate processing tests. Preview actual exported files as well as the interface.
- [ ] Publish only the reviewed build; preserve a recovery path to the earlier deployment.

## Official sources reviewed

These sources support implementation facts and review questions. They do not supply a ready-made legal policy for Breezyfy. Copy in `src/content/pages.ts` is original.

- [Vercel Privacy Notice](https://vercel.com/legal/privacy-notice), updated June 1, 2026, reviewed October 29, 2026: Vercel discusses information about end-user website traffic and device/request data. Treat hosting records separately from media processed locally.
- [Vercel runtime logs documentation](https://vercel.com/docs/logs/runtime), reviewed October 29, 2026: request/log views include URL, time, status, user agent and related fields; documented dashboard retention varies by plan. This does not establish the full retention policy for all provider data.
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), reviewed October 29, 2026: local preferences persist across sessions; site-data controls and browser policy can remove or block them.
- [MDN WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API), reviewed October 29, 2026: WebCodecs supplies encoding/decoding, while a separate container layer handles mux/demux; device/browser codec availability varies.

Feature comparison evidence, with source conflicts and limits, is recorded in `docs/ERASIO-PUBLIC-AUDIT.md` and `docs/REA-FINDINGS.json`. No third-party legal text, source engine or calibration asset is licensed merely because it is publicly accessible.
