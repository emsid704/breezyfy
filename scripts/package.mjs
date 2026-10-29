import { readdir, readFile, mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { zipSync, unzipSync } from "fflate";

const sourceRoots = [
  "src",
  "public",
  "scripts",
  "licenses",
  "docs",
  "tests",
  "package.json",
  "package-lock.json",
  "index.html",
  "vite.config.ts",
  "tsconfig.json",
  "vercel.json",
  "README.md",
  ".gitignore",
  ".prettierignore",
];
async function collect(root, prefix = "") {
  const entries = {};
  async function visit(relative) {
    const filename = path.join(root, relative);
    if ((await stat(filename)).isDirectory()) {
      for (const child of await readdir(filename))
        await visit(path.join(relative, child));
    } else
      entries[path.posix.join(prefix, relative.replaceAll("\\", "/"))] =
        new Uint8Array(await readFile(filename));
  }
  if (root === ".") for (const relative of sourceRoots) await visit(relative);
  else for (const relative of await readdir(root)) await visit(relative);
  return entries;
}
await mkdir("artifacts", { recursive: true });
for (const [name, root] of [
  ["breezyfy-source.zip", "."],
  ["breezyfy-production.zip", "dist"],
]) {
  const entries = await collect(root);
  const archive = zipSync(entries, { level: 6 });
  const verified = unzipSync(archive);
  if (
    Object.keys(entries).length !== Object.keys(verified).length ||
    !verified["index.html"]
  )
    throw new Error(`Archive verification failed: ${name}`);
  await writeFile(path.join("artifacts", name), archive);
  console.log(
    `${name}: ${Object.keys(entries).length} files, ${archive.length} bytes, archive verified`,
  );
}
