// SPDX-License-Identifier: GPL-3.0-or-later
import { libraryFolderName } from "./saveLibraryLocations";
export function programAdvancedSettings(json: string) {
  if (!json)
    return {
      checkUnsavedEntity: true,
      directory: "local",
      exclusions: [] as string[],
    };
  const a = JSON.parse(json).advanced;
  if (
    !a ||
    typeof a.saveExportCheckUnsavedEntity !== "boolean" ||
    typeof a.pathBlockKeyList !== "string" ||
    a.pathBlockKeyList.length > 32767 ||
    typeof a.hideEvent8Contains !== "string" ||
    a.hideEvent8Contains.length > 32767
  )
    throw Error("Invalid advanced save settings.");
  return {
    checkUnsavedEntity: a.saveExportCheckUnsavedEntity as boolean,
    directory: libraryFolderName(a.pathBlockKeyList),
    exclusions: (a.hideEvent8Contains as string)
      .split(",")
      .filter(Boolean)
      .map((s) => s.trim()),
  };
}
export function blockKeyFileName(format: string, flags: boolean) {
  if (!/^SAV[a-z0-9]+$/i.test(format)) throw Error("Invalid save format.");
  return format + (flags ? "_flagwork" : "") + ".txt";
}
