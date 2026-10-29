import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  CirclePlay,
  Clock3,
  Download,
  FileImage,
  Film,
  FolderArchive,
  ImagePlus,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Maximize2,
  Menu,
  Monitor,
  Moon,
  Move,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  WandSparkles,
  Wind,
  X,
} from "lucide-react";
import { zip } from "fflate";
import { DEFAULT_SETTINGS } from "./engine/types";
import { processImage } from "./engine/image";
import type { RemovalSettings } from "./engine";
import { legalPages, infoPages, legalLastUpdated } from "./content/pages";
import { siteConfig } from "./config";
import {
  demoFile,
  download,
  fileKind,
  formatBytes,
  IMAGE_LIMIT,
  QUEUE_LIMIT,
  safeName,
  TOTAL_LIMIT,
  VIDEO_LIMIT,
} from "./utils";

type Item = {
  id: string;
  file: File;
  kind: "image" | "video";
  url: string;
  status: "ready" | "processing" | "done" | "skipped" | "error";
  progress: number;
  message?: string;
  result?: Blob;
  resultUrl?: string;
  width?: number;
  height?: number;
  outputName?: string;
  originalWidth?: number;
  originalHeight?: number;
  position?: { x: number; y: number; size: number };
};
type ExportSettings = {
  format: "png" | "jpeg" | "webp";
  quality: number;
  width: string;
  height: string;
  keepRatio: boolean;
};
const exportDefaults: ExportSettings = {
  format: "png",
  quality: 0.95,
  width: "",
  height: "",
  keepRatio: true,
};
function initialSettings(): RemovalSettings {
  try {
    const raw = JSON.parse(localStorage.getItem("breezyfy.settings") || "{}");
    const s = { ...DEFAULT_SETTINGS };
    for (const key of [
      "strength",
      "scale",
      "offsetX",
      "offsetY",
      "threshold",
      "feather",
    ] as const)
      if (typeof raw[key] === "number" && Number.isFinite(raw[key]))
        (s as unknown as Record<string, unknown>)[key] = raw[key];
    if (["auto", "classic", "modern", "compact"].includes(raw.profile))
      s.profile = raw.profile;
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function Brand() {
  return (
    <a className="brand" href="/" aria-label="Breezyfy home">
      <img src="/favicon.svg" alt="" />
      breezyfy<span className="brand-dot">.</span>
    </a>
  );
}
function Pill({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="pill">
      {icon}
      {children}
    </span>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <label className="range-field">
      <span>
        {label}
        <output>{Number(value.toFixed(2))}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
function App() {
  const [items, setItems] = useState<Item[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [selected, setSelected] = useState<string>();
  const current = items.find((i) => i.id === selected) || items[0];
  const [mode, setMode] = useState<"image" | "video">("image");
  const [settings, setSettings] = useState(initialSettings);
  const [exportSettings, setExportSettings] = useState(exportDefaults);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [notice, setNotice] = useState("");
  const [slider, setSlider] = useState(50);
  const [view, setView] = useState<"compare" | "before" | "after">("compare");
  const [manual, setManual] = useState(false);
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("breezyfy.theme") || "light";
    } catch {
      return "light";
    }
  });
  const [pageKey] = useState(() =>
    decodeURIComponent(window.location.pathname.replace(/^\/|\/$/g, "")),
  );
  const page = legalPages[pageKey] || infoPages[pageKey];
  const fileInput = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const workspace = useRef<HTMLElement>(null);
  const previewImage = useRef<HTMLImageElement>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("breezyfy.theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    if (page) {
      document.title = `${page.title} — Breezyfy`;
      const link = document.querySelector("link[rel=canonical]");
      link?.setAttribute("href", `https://breezyfy.com/${pageKey}`);
    }
  }, [page, pageKey]);
  useEffect(
    () => () => {
      abort.current?.abort();
      itemsRef.current.forEach((i) => {
        URL.revokeObjectURL(i.url);
        if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
      });
    },
    [],
  );
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (
        page ||
        busy ||
        /INPUT|TEXTAREA/.test((e.target as HTMLElement)?.tagName || "")
      )
        return;
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (busy) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  function update(id: string, patch: Partial<Item>) {
    setItems((old) => old.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function addFiles(files: File[]) {
    if (busy) return;
    const added: Item[] = [];
    const errors: string[] = [];
    let total = itemsRef.current.reduce((sum, i) => sum + i.file.size, 0);
    for (const file of files) {
      const kind = fileKind(file);
      if (!kind) {
        errors.push(`${file.name}: choose PNG, JPG, WebP, BMP or MP4.`);
        continue;
      }
      if (file.size > (kind === "image" ? IMAGE_LIMIT : VIDEO_LIMIT)) {
        errors.push(
          `${file.name}: exceeds the ${kind === "image" ? 50 : 100} MB limit.`,
        );
        continue;
      }
      if (!file.size) {
        errors.push(`${file.name}: the file is empty.`);
        continue;
      }
      if (
        itemsRef.current.length + added.length >= QUEUE_LIMIT ||
        total + file.size > TOTAL_LIMIT
      ) {
        errors.push(
          "The queue holds up to 50 files and 512 MB in total. Clear files to make room.",
        );
        break;
      }
      total += file.size;
      added.push({
        id: crypto.randomUUID(),
        file,
        kind,
        url: URL.createObjectURL(file),
        status: "ready",
        progress: 0,
      });
    }
    if (added.length) {
      setItems((old) => [...old, ...added]);
      setSelected(added[0].id);
      setMode(added[0].kind);
      setView("compare");
      setManual(false);
      setTimeout(
        () =>
          workspace.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        40,
      );
    }
    if (errors.length) setNotice(errors.slice(0, 3).join(" "));
  }
  function removeItem(id: string) {
    if (busy) return;
    const i = itemsRef.current.find((i) => i.id === id);
    if (i) {
      URL.revokeObjectURL(i.url);
      if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
    }
    setItems((old) => old.filter((i) => i.id !== id));
  }
  function clearFiles() {
    if (busy) return;
    itemsRef.current.forEach((i) => {
      URL.revokeObjectURL(i.url);
      if (i.resultUrl) URL.revokeObjectURL(i.resultUrl);
    });
    setItems([]);
    setSelected(undefined);
    setManual(false);
  }
  async function run(onlyCurrent = false) {
    if (busy || !items.length) return;
    const queue =
      onlyCurrent && current
        ? [current]
        : items.filter((i) => i.status !== "done");
    if (!queue.length) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setManual(false);
    const queuedIds = new Set(queue.map((i) => i.id));
    let outputBytes = items
      .filter((i) => !queuedIds.has(i.id) && i.status === "done")
      .reduce((n, i) => n + (i.result?.size || 0), 0);
    try {
      for (const item of queue) {
        if (controller.signal.aborted) break;
        setSelected(item.id);
        setMode(item.kind);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
        update(item.id, {
          status: "processing",
          progress: 0,
          message: "Reading your file…",
          result: undefined,
          resultUrl: undefined,
        });
        try {
          const options = {
            signal: controller.signal,
            onProgress: (n: number, label?: string) =>
              update(item.id, {
                progress: Math.min(99, Math.round(n * 100)),
                message: label || "Cleaning on your device…",
              }),
            format: exportSettings.format,
            quality: exportSettings.quality,
            width: exportSettings.width ? +exportSettings.width : undefined,
            height: exportSettings.keepRatio
              ? undefined
              : exportSettings.height
                ? +exportSettings.height
                : undefined,
          };
          const config = { ...settings, position: item.position };
          const result =
            item.kind === "image"
              ? await processImage(item.file, config, options)
              : await (
                  await import("./engine/video")
                ).processVideo(item.file, config, {
                  signal: options.signal,
                  onProgress: options.onProgress,
                });
          if (controller.signal.aborted) {
            update(item.id, {
              status: "ready",
              progress: 0,
              message: "Cancelled. Your original is safe.",
            });
            break;
          }
          if (result.detected) {
            if (outputBytes + result.blob.size > TOTAL_LIMIT)
              throw new Error(
                "Results reached the 512 MB memory limit. Download and clear finished files, then retry this file.",
              );
            outputBytes += result.blob.size;
          }
          const ext = !result.detected
            ? item.file.name.split(".").pop()!.toLowerCase()
            : item.kind === "video"
              ? "mp4"
              : result.blob.type === "image/jpeg"
                ? "jpg"
                : result.blob.type === "image/webp"
                  ? "webp"
                  : "png";
          update(item.id, {
            status: result.detected ? "done" : "skipped",
            progress: 100,
            message: result.message,
            result: result.blob,
            resultUrl: URL.createObjectURL(result.blob),
            width: result.width,
            height: result.height,
            outputName: safeName(
              item.file.name,
              ext,
              result.detected ? "_breezyfy" : "_unchanged",
            ),
          });
        } catch (e) {
          const cancelled =
            controller.signal.aborted ||
            (e instanceof Error && e.name === "AbortError");
          update(item.id, {
            status: cancelled ? "ready" : "error",
            progress: 0,
            message: cancelled
              ? "Cancelled. Your original is safe."
              : e instanceof Error
                ? e.message
                : "This file could not be processed. Try another original file.",
          });
          if (cancelled) break;
        }
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }
  async function downloadZip() {
    const results = items.filter((i) => i.result && i.status === "done");
    if (!results.length) return;
    if (results.reduce((n, i) => n + i.result!.size, 0) > 256 * 1024 * 1024) {
      setNotice(
        "These results exceed the 256 MB ZIP limit. Download them individually to keep browser memory safe.",
      );
      return;
    }
    setZipBusy(true);
    try {
      const entries: Record<string, Uint8Array> = {};
      for (let n = 0; n < results.length; n++) {
        const i = results[n];
        entries[`${String(n + 1).padStart(2, "0")}_${i.outputName}`] =
          new Uint8Array(await i.result!.arrayBuffer());
      }
      const zipped = await new Promise<Uint8Array>((resolve, reject) =>
        zip(entries, { level: 0 }, (err, data) =>
          err ? reject(err) : resolve(data),
        ),
      );
      download(
        new Blob([zipped.slice().buffer as ArrayBuffer], {
          type: "application/zip",
        }),
        "breezyfy-creations.zip",
      );
    } catch {
      setNotice(
        "Could not create the ZIP. Your individual downloads are still available.",
      );
    } finally {
      setZipBusy(false);
    }
  }
  async function loadDemo() {
    try {
      addFiles([await demoFile()]);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not load the example.");
    }
  }
  const doneCount = items.filter((i) => i.status === "done").length;
  const settingsPanel = (
    <>
      <div className="settings-heading">
        <div>
          <SlidersHorizontal size={18} />
          <h3>Make it your own</h3>
        </div>
        <button
          className="icon-btn mobile-settings-close"
          aria-label="Close settings"
          onClick={() => setSettingsOpen(false)}
        >
          <X size={18} />
        </button>
      </div>
      <p className="panel-intro">A little fine-tuning, when you need it.</p>
      <fieldset disabled={busy} className="controls-fieldset">
        <div className="field">
          <label htmlFor="profile">Watermark profile</label>
          <select
            id="profile"
            value={settings.profile}
            onChange={(e) =>
              setSettings({
                ...settings,
                profile: e.target.value as RemovalSettings["profile"],
              })
            }
          >
            <option value="auto">Auto-detect · recommended</option>
            <option value="compact">Compact · 48 px</option>
            <option value="classic">Classic · 96 px</option>
            <option value="modern">Modern · May 2026</option>
          </select>
          <small>Uses calibrated visible sparkle patterns.</small>
        </div>
        <Range
          label="Removal strength"
          value={settings.strength}
          min={0.5}
          max={1.5}
          step={0.01}
          onChange={(v) => setSettings({ ...settings, strength: v })}
        />
        <Range
          label="Watermark scale"
          value={settings.scale}
          min={0.5}
          max={2}
          step={0.05}
          onChange={(v) => setSettings({ ...settings, scale: v })}
        />
        <details className="advanced">
          <summary>
            Fine-tune detection
            <ChevronDown size={15} />
          </summary>
          <Range
            label="Detection threshold"
            value={settings.threshold}
            min={0.15}
            max={0.8}
            step={0.01}
            onChange={(v) => setSettings({ ...settings, threshold: v })}
            hint="Higher values are more cautious about modifying pixels."
          />
          <Range
            label="Edge feather"
            value={settings.feather}
            min={0}
            max={5}
            step={1}
            onChange={(v) => setSettings({ ...settings, feather: v })}
          />
          <div className="field-pair">
            <label>
              Offset X
              <input
                type="number"
                min={-256}
                max={256}
                value={settings.offsetX}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    offsetX: Math.max(-256, Math.min(256, +e.target.value)),
                  })
                }
              />
            </label>
            <label>
              Offset Y
              <input
                type="number"
                min={-256}
                max={256}
                value={settings.offsetY}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    offsetY: Math.max(-256, Math.min(256, +e.target.value)),
                  })
                }
              />
            </label>
          </div>
          <button
            className={`button subtle full ${manual ? "active" : ""}`}
            disabled={!current || current.kind === "video"}
            onClick={() => {
              setView("before");
              setManual(!manual);
            }}
          >
            {manual ? <X size={15} /> : <Move size={15} />}
            {manual ? "Cancel positioning" : "Place watermark manually"}
          </button>
          {current?.position && (
            <button
              className="text-button"
              onClick={() => update(current.id, { position: undefined })}
            >
              Reset position to auto ({current.position.x}, {current.position.y}
              )
            </button>
          )}
          <small className="helper">
            Click the centre of the visible logo in your original image.
            Position applies to this file only.
          </small>
        </details>
        <div className="panel-divider" />
        <div className="field">
          <label htmlFor="export-format">Image export format</label>
          <div className="segment small" id="export-format">
            {(["png", "jpeg", "webp"] as const).map((format) => (
              <button
                key={format}
                className={exportSettings.format === format ? "active" : ""}
                aria-pressed={exportSettings.format === format}
                onClick={() => setExportSettings({ ...exportSettings, format })}
              >
                {format === "jpeg" ? "JPG" : format.toUpperCase()}
              </button>
            ))}
          </div>
          <small>
            {exportSettings.format === "png"
              ? "Lossless PNG · recommended for images"
              : "Lossy export · may change image detail"}
            <br />
            Videos export as MP4.
          </small>
        </div>
        {exportSettings.format !== "png" && (
          <Range
            label="Image quality"
            min={0.5}
            max={1}
            step={0.01}
            value={exportSettings.quality}
            onChange={(v) =>
              setExportSettings({ ...exportSettings, quality: v })
            }
          />
        )}
        <details className="advanced">
          <summary>
            Resize image exports
            <ChevronDown size={15} />
          </summary>
          <div className="field-pair">
            <label>
              Width, px
              <input
                aria-label="Export width"
                placeholder="Original"
                type="number"
                min={32}
                max={8192}
                value={exportSettings.width}
                onChange={(e) =>
                  setExportSettings({
                    ...exportSettings,
                    width: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Height, px
              <input
                aria-label="Export height"
                placeholder="Auto"
                disabled={exportSettings.keepRatio}
                type="number"
                min={32}
                max={8192}
                value={exportSettings.height}
                onChange={(e) =>
                  setExportSettings({
                    ...exportSettings,
                    height: e.target.value,
                  })
                }
              />
            </label>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={exportSettings.keepRatio}
              onChange={(e) =>
                setExportSettings({
                  ...exportSettings,
                  keepRatio: e.target.checked,
                })
              }
            />
            Keep original proportions
          </label>
          <small className="helper">
            Blank dimensions keep the original size. Video dimensions are
            preserved.
          </small>
        </details>
        <div className="settings-footer">
          <button
            className="text-button"
            onClick={() => {
              setSettings({ ...DEFAULT_SETTINGS });
              setExportSettings(exportDefaults);
              if (current) update(current.id, { position: undefined });
            }}
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            className="text-button"
            onClick={() => {
              try {
                const { position: _position, ...saved } = settings;
                localStorage.setItem(
                  "breezyfy.settings",
                  JSON.stringify(saved),
                );
                setNotice("Your removal settings are saved on this device.");
              } catch {
                setNotice(
                  "Your browser could not save preferences. Settings still work for this session.",
                );
              }
            }}
          >
            Save preferences
          </button>
        </div>
      </fieldset>
      <div className="privacy-note">
        <ShieldCheck size={19} />
        <div>
          <strong>Your files stay yours.</strong>
          <p>Processed on this device. Never uploaded for cleanup.</p>
        </div>
      </div>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="nav-wrap">
          <Brand />
          <nav className={menu ? "open" : ""} aria-label="Main navigation">
            <a className={!pageKey ? "nav-active" : ""} href="/#workspace">
              Watermark remover
            </a>
            <a href="/#how-it-works">How it works</a>
            <a href="/guide">Guide</a>
            <a href="/faq">FAQs</a>
          </nav>
          <div className="nav-actions">
            <span className="free-badge">
              <span />
              Always free
            </span>
            <button
              className="icon-btn theme-toggle"
              aria-label={
                theme === "light"
                  ? "Switch to dark theme"
                  : "Switch to light theme"
              }
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="icon-btn menu-toggle"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        {page ? (
          <article className="document-page">
            <a className="back-link" href="/">
              <ArrowLeft size={16} />
              Back to the studio
            </a>
            <span className="eyebrow">{page.kicker}</span>
            <h1>{page.title}</h1>
            <p className="document-intro">{page.intro}</p>
            {legalPages[pageKey] && (
              <p className="document-date">Last updated: {legalLastUpdated}</p>
            )}
            {pageKey === "contact" && (
              <a
                className="button primary contact-button"
                href={`mailto:${siteConfig.supportEmail}`}
              >
                Email Breezyfy
                <ArrowRight size={16} />
              </a>
            )}
            <div className="document-grid">
              <aside>
                <strong>On this page</strong>
                {page.sections.map((s, i) => (
                  <a key={i} href={`#section-${i}`}>
                    {s.title}
                  </a>
                ))}
              </aside>
              <div>
                {page.sections.map((s, i) => (
                  <section id={`section-${i}`} key={i}>
                    <h2>{s.title}</h2>
                    {s.body.map((p, n) => (
                      <p key={n}>{p}</p>
                    ))}
                  </section>
                ))}
              </div>
            </div>
          </article>
        ) : pageKey && pageKey !== "tool" ? (
          <div className="not-found">
            <span className="eyebrow">A small detour</span>
            <h1>This page drifted away.</h1>
            <p>Let's get you back to creating.</p>
            <a href="/" className="button primary">
              Back to Breezyfy
              <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          <>
            <section className="hero">
              <div className="hero-orb orb-one" />
              <div className="hero-orb orb-two" />
              <Pill icon={<Sparkles size={13} />}>
                A clearer canvas for your next idea
              </Pill>
              <h1>
                Let your creations
                <br />
                <span>breathe.</span>
                <svg
                  className="hero-sparkle"
                  width="39"
                  height="47"
                  viewBox="0 0 39 47"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M20 0c0 17-4 22-20 24 16 2 20 7 20 23 1-16 5-21 19-23C25 22 21 17 20 0Z"
                    fill="currentColor"
                  />
                </svg>
              </h1>
              <p>
                Remove visible Gemini watermarks from your images and videos.
                <br className="desktop-break" /> Just your creativity, with a
                little less in the way.
              </p>
              <div className="hero-trust">
                <span>
                  <ShieldCheck />
                  Private by design
                </span>
                <span>
                  <Check />
                  No sign-up
                </span>
                <span>
                  <Layers3 />
                  Batch-ready
                </span>
              </div>
            </section>
            <section
              className="workspace-shell"
              id="workspace"
              ref={workspace}
              aria-label="Watermark removal studio"
            >
              <div className="workspace-top">
                <div className="workspace-title">
                  <span className="studio-icon">
                    <Wind size={19} />
                  </span>
                  <div>
                    <h2>Your creative clean-up space</h2>
                    <p>Drop it in. Clean it up. Make it yours.</p>
                  </div>
                </div>
                <div className="workspace-top-right">
                  <span className="device-status">
                    <span />
                    On-device processing
                  </span>
                  <button
                    className={`icon-btn ${settingsOpen ? "active" : ""}`}
                    title="Toggle settings"
                    aria-label="Toggle settings"
                    aria-expanded={settingsOpen}
                    onClick={() => setSettingsOpen(!settingsOpen)}
                  >
                    <SlidersHorizontal size={19} />
                  </button>
                </div>
              </div>
              <div
                className={`workspace-body ${settingsOpen ? "show-settings" : ""}`}
              >
                <div className="editor-main">
                  <div className="editor-tabs">
                    <div className="segment">
                      <button
                        className={mode === "image" ? "active" : ""}
                        aria-pressed={mode === "image"}
                        onClick={() => setMode("image")}
                      >
                        <FileImage size={16} />
                        Images
                      </button>
                      <button
                        className={mode === "video" ? "active" : ""}
                        aria-pressed={mode === "video"}
                        onClick={() => setMode("video")}
                      >
                        <Film size={16} />
                        Video<span className="tiny-badge">MP4</span>
                      </button>
                    </div>
                    <span className="batch-caption">
                      <Layers3 size={14} />
                      Up to 50 files
                    </span>
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept={
                      mode === "image" ? ".png,.jpg,.jpeg,.webp,.bmp" : ".mp4"
                    }
                    className="sr-only"
                    aria-label="Choose files"
                    disabled={busy}
                    onChange={(e) => {
                      if (e.target.files) addFiles(Array.from(e.target.files));
                      e.target.value = "";
                    }}
                  />
                  {!items.length ? (
                    <>
                      <div
                        className={`drop-zone ${drag ? "dragging" : ""}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDrag(true);
                        }}
                        onDragLeave={(e) => {
                          if (
                            !e.currentTarget.contains(e.relatedTarget as Node)
                          )
                            setDrag(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDrag(false);
                          addFiles(Array.from(e.dataTransfer.files));
                        }}
                      >
                        <div className="upload-illustration">
                          <div className="file-card back-card">
                            <Film size={29} />
                          </div>
                          <div className="file-card front-card">
                            <ImagePlus size={31} />
                            <span />
                            <span />
                          </div>
                          <span className="float-sparkle">
                            <Sparkles size={18} />
                          </span>
                        </div>
                        <h3>
                          A fresh start for your{" "}
                          {mode === "image" ? "images" : "videos"}.
                        </h3>
                        <p>
                          Drag & drop{" "}
                          {mode === "image" ? "your files" : "an MP4"} here, or
                          choose from your device.
                        </p>
                        <button
                          className="button primary upload-button"
                          onClick={() => fileInput.current?.click()}
                        >
                          <Plus size={18} />
                          Choose {mode === "image" ? "images" : "videos"}
                          <ArrowRight size={16} />
                        </button>
                        <span className="drop-meta">
                          {mode === "image"
                            ? "PNG, JPG, WebP, BMP · Up to 50 MB each"
                            : "MP4 · Up to 100 MB · Compatible WebCodecs browser"}
                        </span>
                        <span className="paste-caption">
                          You can also paste an image with <kbd>Ctrl</kbd> +{" "}
                          <kbd>V</kbd>
                        </span>
                      </div>
                      <div className="example-row">
                        <span>Just looking around?</span>
                        <button onClick={loadDemo} className="demo-link">
                          <img
                            src="/studio.svg"
                            alt="Pastel architectural illustration"
                          />
                          <span>Try an example</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="loaded-toolbar">
                        <span className="filename" title={current?.file.name}>
                          {current?.file.name}
                        </span>
                        <div>
                          <button
                            className="icon-btn"
                            aria-label="Expand preview"
                            onClick={() => dialog.current?.showModal()}
                          >
                            <Maximize2 size={15} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label="Add more files"
                            disabled={busy}
                            onClick={() => fileInput.current?.click()}
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                      <div
                        className={`media-preview ${manual ? "manual-position" : ""}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          addFiles(Array.from(e.dataTransfer.files));
                        }}
                      >
                        {current?.kind === "video" ? (
                          <video
                            key={`${current.id}-${view}`}
                            src={
                              view === "before"
                                ? current.url
                                : current.resultUrl || current.url
                            }
                            controls
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          current && (
                            <div className="compare-images">
                              <img
                                ref={previewImage}
                                className="base-image"
                                src={
                                  current.resultUrl && view !== "before"
                                    ? current.resultUrl
                                    : current.url
                                }
                                alt={
                                  view === "before"
                                    ? "Original image"
                                    : current.resultUrl
                                      ? "Processed image"
                                      : "Original image"
                                }
                                onLoad={(e) => {
                                  const img = e.currentTarget;
                                  if (!current.originalWidth && !current.result)
                                    update(current.id, {
                                      originalWidth: img.naturalWidth,
                                      originalHeight: img.naturalHeight,
                                      width: img.naturalWidth,
                                      height: img.naturalHeight,
                                    });
                                }}
                                onClick={(e) => {
                                  if (!manual || !previewImage.current) return;
                                  const img = previewImage.current;
                                  const rect = img.getBoundingClientRect();
                                  const size =
                                    settings.profile === "compact" ||
                                    (settings.profile === "auto" &&
                                      (img.naturalWidth <= 1024 ||
                                        img.naturalHeight <= 1024))
                                      ? 48
                                      : 96;
                                  update(current.id, {
                                    position: {
                                      x: Math.max(
                                        0,
                                        Math.round(
                                          ((e.clientX - rect.left) /
                                            rect.width) *
                                            img.naturalWidth -
                                            size / 2,
                                        ),
                                      ),
                                      y: Math.max(
                                        0,
                                        Math.round(
                                          ((e.clientY - rect.top) /
                                            rect.height) *
                                            img.naturalHeight -
                                            size / 2,
                                        ),
                                      ),
                                      size,
                                    },
                                  });
                                  setManual(false);
                                  setNotice(
                                    "Manual position set for this image. Reprocess to apply.",
                                  );
                                }}
                              />
                              {current.resultUrl && view === "compare" && (
                                <>
                                  <img
                                    className="before-image"
                                    src={current.url}
                                    alt="Original before processing"
                                    style={{
                                      clipPath: `inset(0 ${100 - slider}% 0 0)`,
                                    }}
                                  />
                                  <span
                                    className="compare-line"
                                    style={{ left: `${slider}%` }}
                                  >
                                    <span>
                                      <ArrowLeft size={12} />
                                      <ArrowRight size={12} />
                                    </span>
                                  </span>
                                  <input
                                    className="compare-range"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={slider}
                                    aria-label="Before and after comparison"
                                    onChange={(e) => setSlider(+e.target.value)}
                                  />
                                  <span className="media-label original-label">
                                    Original
                                  </span>
                                  <span className="media-label result-label">
                                    {current.status === "done"
                                      ? "Breezyfy"
                                      : "Unchanged"}
                                  </span>
                                </>
                              )}
                            </div>
                          )
                        )}
                        {current?.status === "processing" && (
                          <div className="processing-overlay">
                            <LoaderCircle className="spin" size={26} />
                            <strong>{current.progress}%</strong>
                            <span>{current.message}</span>
                          </div>
                        )}
                        {manual && (
                          <span className="manual-tip">
                            Click the centre of the watermark
                          </span>
                        )}
                      </div>
                      <div className="preview-bottom">
                        <div className="segment tiny">
                          <button
                            aria-pressed={view === "before"}
                            className={view === "before" ? "active" : ""}
                            onClick={() => setView("before")}
                          >
                            Original
                          </button>
                          {current?.kind === "image" && (
                            <button
                              disabled={!current.result}
                              aria-pressed={view === "compare"}
                              className={view === "compare" ? "active" : ""}
                              onClick={() => setView("compare")}
                            >
                              Compare
                            </button>
                          )}
                          <button
                            disabled={!current?.result}
                            aria-pressed={view === "after"}
                            className={view === "after" ? "active" : ""}
                            onClick={() => setView("after")}
                          >
                            Result
                          </button>
                        </div>
                        <span>
                          {current?.width
                            ? `${view === "before" ? current.originalWidth || current.width : current.width} × ${view === "before" ? current.originalHeight || current.height : current.height} · `
                            : ""}
                          {current &&
                            formatBytes(
                              view === "before"
                                ? current.file.size
                                : current.result?.size || current.file.size,
                            )}
                        </span>
                      </div>
                      {current?.message && current.status !== "processing" && (
                        <p
                          role="status"
                          className={`result-message ${current.status}`}
                        >
                          <span>
                            {current.status === "done" ? (
                              <CheckCheck size={16} />
                            ) : (
                              <CircleHelp size={16} />
                            )}
                          </span>
                          {current.message}
                        </p>
                      )}
                      <div className="queue-heading">
                        <span>
                          Your files <b>{items.length}</b>
                        </span>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={clearFiles}
                        >
                          <Trash2 size={13} />
                          Clear all
                        </button>
                      </div>
                      <div className="file-queue">
                        {items.map((item) => (
                          <div
                            className={`queue-item ${item.id === current?.id ? "selected" : ""}`}
                            key={item.id}
                          >
                            <button
                              className="queue-select"
                              onClick={() => {
                                setSelected(item.id);
                                setManual(false);
                                setMode(item.kind);
                              }}
                            >
                              {item.kind === "image" ? (
                                <img src={item.url} alt="" />
                              ) : (
                                <span className="video-thumb">
                                  <Film size={20} />
                                </span>
                              )}
                              <span>
                                <strong>{item.file.name}</strong>
                                <small>
                                  {formatBytes(item.file.size)} ·{" "}
                                  {item.status === "done"
                                    ? "Ready to download"
                                    : item.status === "skipped"
                                      ? "No confident match"
                                      : item.status === "processing"
                                        ? `${item.progress}% processing`
                                        : item.status === "error"
                                          ? "Needs attention"
                                          : "Ready to clean"}
                                </small>
                              </span>
                            </button>
                            {item.status === "processing" ? (
                              <LoaderCircle className="spin" size={16} />
                            ) : item.result ? (
                              <button
                                className="icon-btn"
                                title={
                                  item.status === "done"
                                    ? "Download result"
                                    : "Download unchanged file"
                                }
                                aria-label={`Download ${item.file.name}`}
                                onClick={() =>
                                  download(item.result!, item.outputName!)
                                }
                              >
                                <ArrowDownToLine size={17} />
                              </button>
                            ) : null}
                            <button
                              className="icon-btn"
                              disabled={busy}
                              aria-label={`Remove ${item.file.name}`}
                              onClick={() => removeItem(item.id)}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="editor-actions">
                        {busy ? (
                          <button
                            className="button secondary"
                            onClick={() => abort.current?.abort()}
                          >
                            <X size={17} />
                            Cancel processing
                          </button>
                        ) : (
                          <button
                            className="button primary"
                            onClick={() => run(doneCount === items.length)}
                          >
                            <WandSparkles size={17} />
                            {doneCount === items.length
                              ? "Reprocess selected"
                              : items.length > 1
                                ? "Clean queued files"
                                : current?.status === "error" ||
                                    current?.status === "skipped"
                                  ? "Try again"
                                  : "Remove watermark"}
                            <ArrowRight size={16} />
                          </button>
                        )}
                        {doneCount > 0 && (
                          <button
                            className="button secondary"
                            disabled={zipBusy || busy}
                            onClick={downloadZip}
                          >
                            {zipBusy ? (
                              <LoaderCircle className="spin" size={16} />
                            ) : (
                              <FolderArchive size={17} />
                            )}
                            Download ZIP ({doneCount})
                          </button>
                        )}
                        {current?.result &&
                          !busy &&
                          doneCount !== items.length && (
                            <button
                              className="text-button"
                              onClick={() => run(true)}
                            >
                              Reprocess selected
                            </button>
                          )}
                      </div>
                    </>
                  )}
                  <div className="editor-footnote">
                    <LockKeyhole size={13} />
                    <span>
                      Only use media you own or have permission to edit.{" "}
                      <a href="/acceptable-use">Acceptable use</a>
                    </span>
                  </div>
                </div>
                <aside
                  className="settings-panel"
                  aria-label="Removal and export settings"
                >
                  {settingsPanel}
                </aside>
              </div>
            </section>
            <div className="compatibility">
              <span>Made for your creative workflow</span>
              <span className="google-word">
                <Sparkles size={17} />
                Gemini
              </span>
              <span className="google-word">
                <Layers3 size={17} />
                AI Studio
              </span>
              <span className="google-word">
                <Film size={17} />
                Google Flow
              </span>
              <a href="/technology">
                See supported patterns
                <ArrowRight size={13} />
              </a>
            </div>
            <section className="feature-section" id="features">
              <div className="section-heading">
                <span className="eyebrow">Less friction. More creating.</span>
                <h2>
                  Good work deserves
                  <br />a clean finish.
                </h2>
                <p>
                  Thoughtfully simple tools. Nothing between
                  <br className="desktop-break" /> you and your next great idea.
                </p>
              </div>
              <div className="feature-grid">
                <article className="feature-card purple-card">
                  <div className="feature-icon">
                    <ShieldCheck size={22} />
                  </div>
                  <h3>Your files. Your device.</h3>
                  <p>
                    Your media stays in your browser. No upload queue, no server
                    storage, no account to make.
                  </p>
                  <div className="privacy-visual">
                    <span>
                      <FileImage size={19} />
                    </span>
                    <i />
                    <span className="visual-laptop">
                      <Monitor size={27} />
                      <Check size={10} />
                    </span>
                    <i />
                    <span>
                      <LockKeyhole size={19} />
                    </span>
                  </div>
                  <small>Private, from the first pixel.</small>
                </article>
                <article className="feature-card peach-card">
                  <div className="feature-icon">
                    <Layers3 size={22} />
                  </div>
                  <h3>One file. Or a full batch.</h3>
                  <p>
                    Give up to 50 files a fresh finish in one queue, then
                    collect your results in a single ZIP.
                  </p>
                  <div className="batch-visual">
                    <div>
                      <FileImage size={20} />
                      <span>creation_01.png</span>
                      <Check size={14} />
                    </div>
                    <div>
                      <Film size={20} />
                      <span>the_next_big_idea.mp4</span>
                      <Check size={14} />
                    </div>
                    <div>
                      <FileImage size={20} />
                      <span>something_good.webp</span>
                      <Check size={14} />
                    </div>
                  </div>
                </article>
                <article className="feature-card green-card">
                  <div className="feature-icon">
                    <SlidersHorizontal size={22} />
                  </div>
                  <h3>A little more control.</h3>
                  <p>
                    Fine-tune the pattern, position and strength. Preview the
                    difference before you download.
                  </p>
                  <div className="sliders-visual">
                    <div>
                      <span>Strength</span>
                      <b>1.00</b>
                    </div>
                    <i />
                    <div>
                      <span>Export</span>
                      <b>
                        PNG <Check size={10} />
                      </b>
                    </div>
                  </div>
                </article>
              </div>
            </section>
            <section className="how-section" id="how-it-works">
              <div className="how-preview">
                <div className="demo-topline">
                  <span>
                    <span />A little before & after
                  </span>
                  <span className="tiny-badge">ILLUSTRATIVE DEMO</span>
                </div>
                <div className="demo-art">
                  <img
                    src="/studio.svg"
                    alt="Original pastel arch and sphere artwork made for Breezyfy"
                  />
                  <div className="demo-divider" />
                  <span className="demo-original">Before</span>
                  <span className="demo-after">
                    <Sparkles size={12} />
                    After
                  </span>
                  <span className="decorative-watermark">✦</span>
                </div>
                <div className="demo-bottom">
                  <span>All the detail. More room to shine.</span>
                  <button className="text-button" onClick={loadDemo}>
                    Try it yourself
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
              <div className="how-copy">
                <span className="eyebrow">From busy to breezy</span>
                <h2>
                  Three small steps.
                  <br />
                  One clean creation.
                </h2>
                {[
                  [
                    "01",
                    "Bring your original",
                    "Choose an image or MP4 you generated and have permission to edit.",
                  ],
                  [
                    "02",
                    "Let Breezyfy do its thing",
                    "Clean a supported visible sparkle pattern locally. Adjust the settings if it needs a little help.",
                  ],
                  [
                    "03",
                    "Make something great",
                    "Compare the result, download your file, and get back to creating.",
                  ],
                ].map(([n, title, body]) => (
                  <div className="how-step" key={n}>
                    <span>{n}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="honest-strip">
              <span className="honest-icon">
                <Sparkles size={24} />
              </span>
              <div>
                <h3>A cleaner image, still your AI creation.</h3>
                <p>
                  Breezyfy targets supported visible logos, not invisible AI
                  provenance. Results depend on the original file and watermark
                  pattern.
                </p>
              </div>
              <a href="/technology">
                How the technology works
                <ArrowRight size={15} />
              </a>
            </section>
            <section className="faq-section" id="faq">
              <div>
                <span className="eyebrow">A little clarity</span>
                <h2>
                  Good questions.
                  <br />
                  Straight answers.
                </h2>
                <p>Everything else you might be wondering.</p>
                <a className="text-button" href="/faq">
                  Visit the help guide
                  <ArrowRight size={15} />
                </a>
              </div>
              <div className="faq-list">
                {[
                  [
                    "Is Breezyfy really free?",
                    "Yes. This version has no subscriptions, credits, login or payment. File and queue limits keep processing manageable on your device.",
                  ],
                  [
                    "Do my files leave my device?",
                    "No media is uploaded for processing. The app downloads its code and calibration assets, then works with your files in browser memory. Your web host still receives ordinary page requests.",
                  ],
                  [
                    "Which watermarks can I remove?",
                    "Supported visible Gemini sparkle patterns, using compact, classic and May 2026 calibrations. New, opaque or heavily compressed patterns may not work. This is not a general-purpose stock-photo watermark remover.",
                  ],
                  [
                    "Can I clean videos too?",
                    "Yes, compatible MP4 video can be processed frame by frame in a WebCodecs-enabled browser. Supported audio is copied. Keep clips within 100 MB; unsupported codecs are reported rather than silently dropping audio.",
                  ],
                  [
                    "What if the watermark is still visible?",
                    "Use the original generated file, try another profile, or adjust the mask scale, strength and position. Some patterns cannot be reversed accurately. Always inspect the result before using it.",
                  ],
                ].map(([q, a]) => (
                  <details key={q}>
                    <summary>
                      {q}
                      <Plus size={17} />
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </section>
            <section className="bottom-cta">
              <span className="eyebrow">Back to the good part</span>
              <h2>More creating. Less cleaning.</h2>
              <p>Your next idea is waiting. Give it room to breathe.</p>
              <a className="button primary" href="#workspace">
                Let's make it breezy
                <ArrowRight size={17} />
              </a>
              <span>
                <ShieldCheck size={13} />
                Free. Private. Made for your flow.
              </span>
            </section>
          </>
        )}
      </main>
      <footer>
        <div className="footer-top">
          <div className="footer-brand">
            <Brand />
            <p>
              A little less in the way.
              <br />A little more room to create.
            </p>
            <span className="footer-local">
              <LockKeyhole size={13} />
              Made for local processing
            </span>
          </div>
          <div>
            <h4>The studio</h4>
            <a href="/#workspace">Image watermark remover</a>
            <a href="/#workspace">Video watermark remover</a>
            <a href="/#how-it-works">How it works</a>
          </div>
          <div>
            <h4>A little help</h4>
            <a href="/guide">Getting started</a>
            <a href="/technology">Our technology</a>
            <a href="/faq">FAQs & troubleshooting</a>
            <a href="/contact">Contact Breezyfy</a>
          </div>
          <div>
            <h4>The important things</h4>
            <a href="/terms">Terms of service</a>
            <a href="/privacy">Privacy policy</a>
            <a href="/acceptable-use">Acceptable use</a>
            <a href="/cookies">Storage & cookies</a>
            <a href="/third-party-notices.txt">Open-source credits</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Breezyfy. Built for a clearer creative
            flow.
          </span>
          <span>Independent tool. Not affiliated with Google.</span>
        </div>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <CircleHelp size={19} />
          <p>{notice}</p>
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="preview-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="dialog-heading">
          <strong>{current?.file.name}</strong>
          <button
            className="icon-btn"
            aria-label="Close expanded preview"
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        {current?.kind === "video" ? (
          <video src={current.resultUrl || current.url} controls playsInline />
        ) : (
          <img
            src={current?.resultUrl || current?.url}
            alt="Expanded selected result"
          />
        )}
      </dialog>
    </>
  );
}
export default App;
