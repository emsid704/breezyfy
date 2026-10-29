import { readFile, mkdir, writeFile } from "node:fs/promises";
const libraries = [
  "react",
  "react-dom",
  "lucide-react",
  "fflate",
  "mediabunny",
  "@fontsource/dm-sans",
  "@fontsource/manrope",
];
const sections = [
  "Breezyfy — Third-party software and calibration notices\n\nThe app interface and original implementation are independent from Erasio.\n\nCalibration assets: https://github.com/GargantuaX/gemini-watermark-remover\n" +
    (await readFile("licenses/gemini-watermark-remover.MIT.txt", "utf8")),
];
for (const name of libraries) {
  let license;
  for (const file of [
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt",
    "license",
    "license.md",
  ]) {
    try {
      license = await readFile(`node_modules/${name}/${file}`, "utf8");
      break;
    } catch {}
  }
  if (!license) throw new Error(`License file missing for ${name}`);
  const metadata = JSON.parse(
    await readFile(`node_modules/${name}/package.json`, "utf8"),
  );
  sections.push(`${name} ${metadata.version}\n\n${license}`);
}
await mkdir("public", { recursive: true });
await writeFile(
  "public/third-party-notices.txt",
  sections.join("\n\n----------------------------------------\n\n"),
);
console.log("Third-party notices generated.");
