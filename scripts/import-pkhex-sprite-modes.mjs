// SPDX-License-Identifier: GPL-3.0-or-later
// Copy unmodified resources from the owner's PKHeX source. Record every source hash.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
if (!process.argv[2]) throw Error("Provide the PKHeX source directory.");
const root = fileURLToPath(new URL("../", import.meta.url)),
  source = path.resolve(process.argv[2]);
const project = path.join(source, "PKHeX.Drawing.PokeSprite");
const resx = await readFile(
  path.join(project, "Properties/Resources.resx"),
  "utf8",
);
const mapFile = path.join(root, "src/features/saveeditor/art-manifest.json"),
  hashFile = path.join(root, "third_party/pkhex/art-manifest.json");
const mapping = JSON.parse(await readFile(mapFile, "utf8")),
  hashes = JSON.parse(await readFile(hashFile, "utf8"));
const output = path.join(root, "public/save-art/26.08.26");
await mkdir(output, { recursive: true });
let count = 0;
for (const match of resx.matchAll(
  /<data name="((?:[abc]_|[ab]item_|rare_icon_alt|dyna|alpha_alt|_ball|warn|hint|team|locked|party[1-6]|starter|sick)[^"]*)"[^>]*>[\s\S]*?<value>([^<]+\.png);System\.Drawing\.Bitmap[\s\S]*?<\/data>/g,
)) {
  const [, key, encoded] = match;
  if (
    !/^(?:[abc]_|[ab]item_|rare_icon_alt|dyna|alpha_alt|_ball|warn|hint|team|locked|party[1-6]|starter|sick)[a-zA-Z0-9_.-]*$/.test(
      key,
    )
  )
    throw Error("Invalid resource key.");
  const relative = encoded.replaceAll("\\", "/");
  const file = path.resolve(project, "Properties", relative);
  const inside = path.relative(project, file);
  if (inside.startsWith("..") || path.isAbsolute(inside))
    throw Error("Resource escapes source project.");
  const bytes = await readFile(file);
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
    throw Error("Invalid PNG resource.");
  const original = "PKHeX.Drawing.PokeSprite/" + inside.replaceAll("\\", "/");
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hashes.files[original] && hashes.files[original] !== hash)
    throw Error("Existing source asset changed.");
  await writeFile(path.join(output, key + ".png"), bytes);
  mapping[key] = key + ".png";
  hashes.files[original] = hash;
  count++;
}
if (!mapping.b_25s || !mapping.a_25 || !mapping.c_25)
  throw Error("Missing source sprite modes.");
await writeFile(mapFile, JSON.stringify(mapping, null, 2) + "\n");
await writeFile(hashFile, JSON.stringify(hashes, null, 2) + "\n");
const dimensions = {};
for (const [key, filename] of Object.entries(mapping)) {
  if (
    !/^[ab]item_|^rare_icon_alt|^(dyna|alpha_alt|warn|hint|team|locked|party[1-6]|starter|sick)$|^_ball/.test(
      key,
    )
  )
    continue;
  const bytes = await readFile(path.join(output, filename));
  dimensions[key] = {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}
await writeFile(
  path.join(root, "src/features/saveeditor/sprite-overlay-dimensions.json"),
  JSON.stringify(dimensions, null, 2) + "\n",
);
process.stdout.write(
  `Imported ${count} unmodified source sprite resources and recorded overlay dimensions.\n`,
);
