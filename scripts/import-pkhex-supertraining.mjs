// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2])
  throw Error("Provide the read-only PKHeX source directory.");
const source = path.resolve(process.argv[2]);
const hashes = [],
  dictionaries = [];
for (const language of ["zh-Hans", "en", "ja"]) {
  const relative = `PKHeX.WinForms/Resources/text/lang_${language}.txt`;
  const bytes = await readFile(path.join(source, relative));
  hashes.push({
    source: relative,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  dictionaries.push(
    new Map(
      bytes
        .toString("utf8")
        .split(/\r?\n/)
        .filter(
          (line) =>
            line.startsWith("SuperTrainingEditor") && line.includes("="),
        )
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    ),
  );
}
const keys = [...dictionaries[1].keys()].sort();
const lines = keys.map((key) => {
  const values = dictionaries.map((map) => map.get(key));
  if (values.some((value) => value === undefined))
    throw Error(`Missing label ${key}`);
  return `[${JSON.stringify(key)}] = new(${values.map((value) => JSON.stringify(value)).join(",")}),`;
});
await writeFile(
  path.join(root, "src/features/saveeditor/superTrainingSourceLabels.ts"),
  `// SPDX-License-Identifier: GPL-3.0-or-later\n// Exact PKHeX 26.08.26 WinForms labels; see supertraining-sources.json.\nexport const superTrainingSourceLabels = ${JSON.stringify(Object.fromEntries(keys.map((key) => [key, { zh: dictionaries[0].get(key), en: dictionaries[1].get(key), ja: dictionaries[2].get(key) }])), null, 2)} as const;\n`,
);
await writeFile(
  path.join(root, "wasm/pkhex/SuperTrainingNames.cs"),
  `// SPDX-License-Identifier: GPL-3.0-or-later\n// Exact PKHeX 26.08.26 WinForms language resources; see supertraining-sources.json.\nnamespace PokeRNGKit.SaveEditor;\ninternal static class SuperTrainingNames {\nprivate static readonly Dictionary<string,LocalizedText> Rows = new() {\n${lines.join("\n")}\n};\ninternal static LocalizedText Get(string key) => Rows.TryGetValue(key, out var value) ? value : throw new ArgumentException("Missing SuperTraining label.");\n}\n`,
);
await writeFile(
  path.join(root, "third_party/pkhex/supertraining-sources.json"),
  JSON.stringify(
    { version: "26.08.26", labels: keys.length, files: hashes },
    null,
    2,
  ) + "\n",
);
