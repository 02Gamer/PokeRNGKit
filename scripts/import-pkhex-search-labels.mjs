// SPDX-License-Identifier: GPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2])
  throw Error("Provide the read-only PKHeX source directory.");
const source = path.resolve(process.argv[2]),
  dictionaries = [],
  files = [];
for (const language of ["zh-Hans", "en", "ja"]) {
  const relative = `PKHeX.WinForms/Resources/text/lang_${language}.txt`;
  const bytes = await readFile(path.join(source, relative));
  files.push({
    source: relative,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  dictionaries.push(
    new Map(
      bytes
        .toString("utf8")
        .split(/\r?\n/)
        .filter(
          (line) => line.startsWith("EntitySearchSetup") && line.includes("="),
        )
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    ),
  );
}
const keys = [...dictionaries[1].keys()].sort();
const labels = Object.fromEntries(
  keys.map((key) => {
    const values = dictionaries.map((dictionary) => dictionary.get(key));
    if (values.some((value) => value === undefined))
      throw Error(`Missing source label: ${key}`);
    return [key, { zh: values[0], en: values[1], ja: values[2] }];
  }),
);
await writeFile(
  path.join(root, "src/features/saveeditor/pokemonSearchSourceLabels.ts"),
  `// SPDX-License-Identifier: GPL-3.0-or-later\n// Exact PKHeX 26.08.26 labels; see third_party/pkhex/search-sources.json.\nexport const pokemonSearchSourceLabels = ${JSON.stringify(labels, null, 2)} as const;\n`,
);
await writeFile(
  path.join(root, "third_party/pkhex/search-sources.json"),
  JSON.stringify({ version: "26.08.26", labels: keys.length, files }, null, 2) +
    "\n",
);
process.stdout.write(
  `Imported ${keys.length} exact three-language search labels.\n`,
);
