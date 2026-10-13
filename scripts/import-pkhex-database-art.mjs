// Import the unmodified SAV_Database wallpaper from the owner-provided PKHeX source.
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
if (!process.argv[2]) throw Error("Provide the PKHeX source directory.");
const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.resolve(process.argv[2]);
const key = "box_wp_clean";
const relative = "PKHeX.WinForms/Resources/img/Accents/box_wp_clean.png";
const resx = await readFile(
  path.join(source, "PKHeX.WinForms/Properties/Resources.resx"),
  "utf8",
);
if (
  !resx.includes('name="box_wp_clean"') ||
  !resx.includes("box_wp_clean.png;System.Drawing.Bitmap")
)
  throw Error("Missing upstream database wallpaper resource.");
const bytes = await readFile(path.join(source, relative));
if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
  throw Error("Invalid PNG.");
const mapPath = path.join(root, "src/features/saveeditor/art-manifest.json"),
  hashPath = path.join(root, "third_party/pkhex/art-manifest.json");
const mapping = JSON.parse(await readFile(mapPath, "utf8")),
  hashes = JSON.parse(await readFile(hashPath, "utf8"));
const hash = createHash("sha256").update(bytes).digest("hex");
if (hashes.files[relative] && hashes.files[relative] !== hash)
  throw Error("Upstream asset changed.");
const output = path.join(root, "public/save-art/26.08.26");
await mkdir(output, { recursive: true });
await writeFile(path.join(output, key + ".png"), bytes);
mapping[key] = key + ".png";
hashes.files[relative] = hash;
await writeFile(mapPath, JSON.stringify(mapping, null, 2) + "\n");
await writeFile(hashPath, JSON.stringify(hashes, null, 2) + "\n");
