// Import unchanged donut/effect PNGs from the owner-provided PKHeX 26.08.26 archive.
// Run: node scripts/import-pkhex-donut-art.mjs <PKHeX-master directory>
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import console from "node:console";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
if (!process.argv[2])
  throw Error("Provide the PKHeX 26.08.26 source directory.");
const source = path.resolve(process.argv[2]);
const root = fileURLToPath(new URL("../", import.meta.url));
const resx = path.join(source, "PKHeX.Drawing.Misc/Properties/Resources.resx");
const xml = await readFile(resx, "utf8");
const mappingPath = path.join(
    root,
    "src/features/saveeditor/art-manifest.json",
  ),
  hashesPath = path.join(root, "third_party/pkhex/art-manifest.json");
const mapping = JSON.parse(await readFile(mappingPath, "utf8")),
  hashes = JSON.parse(await readFile(hashesPath, "utf8")),
  entries = [];
const storage = await readFile(
  path.join(source, "PKHeX.Core/Items/ItemStorage9ZA.cs"),
  "utf8",
);
const berryBlock = /ReadOnlySpan<ushort> Berry =>[^[]*\[([^\]]+)\]/.exec(
  storage,
)?.[1];
if (!berryBlock) throw Error("Missing source ZA berry list.");
const berryKeys = new Set(
  Array.from(berryBlock.matchAll(/\d+/g), (m) => `aitem_${Number(m[0])}`),
);
for (const match of xml.matchAll(
  /<data name="(donut_[\w]+|(?:sweet|spicy|fresh|bitter|sour)_[\w]+|star|flavorprofile)"[^>]*>\s*<value>([^<]+)<\/value>/g,
)) {
  const key = match[1],
    file = path.resolve(
      path.dirname(resx),
      match[2].split(";")[0].replaceAll("\\", "/"),
    ),
    relative = path.relative(source, file).replaceAll("\\", "/");
  if (
    relative.startsWith("../") ||
    path.isAbsolute(relative) ||
    !relative.endsWith(".png")
  )
    throw Error(`Invalid resource reference: ${key}`);
  const bytes = await readFile(file);
  if (
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw Error(`Not a PNG: ${relative}`);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hashes.files[relative] && hashes.files[relative] !== hash)
    throw Error(`Existing source hash differs: ${relative}`);
  if (mapping[key] && mapping[key] !== `${key}.png`)
    throw Error(`Existing resource key differs: ${key}`);
  entries.push({ key, relative, bytes, hash });
}
const itemResx = path.join(
    source,
    "PKHeX.Drawing.PokeSprite/Properties/Resources.resx",
  ),
  itemXml = await readFile(itemResx, "utf8");
for (const match of itemXml.matchAll(
  /<data name="(aitem_\d+)"[^>]*>\s*<value>([^<]+)<\/value>/g,
)) {
  const key = match[1];
  if (!berryKeys.has(key)) continue;
  const file = path.resolve(
      path.dirname(itemResx),
      match[2].split(";")[0].replaceAll("\\", "/"),
    ),
    relative = path.relative(source, file).replaceAll("\\", "/");
  if (
    relative.startsWith("../") ||
    path.isAbsolute(relative) ||
    !relative.endsWith(".png")
  )
    throw Error(`Invalid berry reference: ${key}`);
  const bytes = await readFile(file);
  if (
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw Error(`Not a PNG: ${relative}`);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hashes.files[relative] && hashes.files[relative] !== hash)
    throw Error(`Existing berry source hash differs: ${relative}`);
  if (mapping[key] && mapping[key] !== `${key}.png`)
    throw Error(`Existing berry resource key differs: ${key}`);
  entries.push({ key, relative, bytes, hash });
}
for (const key of berryKeys)
  if (!entries.some((e) => e.key === key)) throw Error(`Missing ${key}`);
for (const key of [
  "donut_sweet00",
  "donut_uni491",
  "donut_uni807",
  "sweet_01_lv1",
  "flavorprofile",
  "star",
])
  if (!entries.some((e) => e.key === key)) throw Error(`Missing ${key}`);
const output = path.join(root, "public/save-art/26.08.26");
await mkdir(output, { recursive: true });
for (const { key, relative, bytes, hash } of entries) {
  await writeFile(path.join(output, `${key}.png`), bytes);
  mapping[key] = `${key}.png`;
  hashes.files[relative] = hash;
}
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + "\n");
await writeFile(hashesPath, JSON.stringify(hashes, null, 2) + "\n");
console.log(
  `Imported ${entries.length} unchanged donut images (${entries.reduce((n, e) => n + e.bytes.length, 0)} bytes).`,
);
