export const IMAGE_LIMIT = 50 * 1024 * 1024;
export const VIDEO_LIMIT = 100 * 1024 * 1024;
export const QUEUE_LIMIT = 50;
export const TOTAL_LIMIT = 512 * 1024 * 1024;
export function fileKind(file: File): "image" | "video" | null {
  if (/\.mp4$/i.test(file.name) && (!file.type || file.type === "video/mp4"))
    return "video";
  if (
    /\.(png|jpe?g|webp|bmp)$/i.test(file.name) &&
    (!file.type || /^image\//.test(file.type))
  )
    return "image";
  return null;
}
export function formatBytes(n: number) {
  return n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
export function safeName(
  name: string,
  extension: string,
  suffix = "_breezyfy",
) {
  const base =
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .trim()
      .slice(0, 120) || "creation";
  return `${base}${suffix}.${extension}`;
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function demoFile() {
  const [art, mask] = await Promise.all(
    ["/studio.svg", "/masks/compact-48.png"].map(async (url) => {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(
          "Could not load the example. Please select your own file.",
        );
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const img = new Image();
        img.src = objectUrl;
        await img.decode();
        return img;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }),
  );
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(art, 0, 0, 960, 720);
  const mc = document.createElement("canvas");
  mc.width = mc.height = 48;
  const mx = mc.getContext("2d")!;
  mx.drawImage(mask, 0, 0, 48, 48);
  const m = mx.getImageData(0, 0, 48, 48).data;
  const img = ctx.getImageData(880, 640, 48, 48);
  for (let i = 0; i < m.length; i += 4) {
    const alpha = Math.max(m[i], m[i + 1], m[i + 2]) / 255;
    for (let c = 0; c < 3; c++)
      img.data[i + c] = Math.round(img.data[i + c] * (1 - alpha) + 255 * alpha);
  }
  ctx.putImageData(img, 880, 640);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not create demo"))),
      "image/png",
    ),
  );
  return new File([blob], "breezy-studio-demo.png", { type: "image/png" });
}
