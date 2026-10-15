// SPDX-License-Identifier: GPL-3.0-or-later
import { loadMysteryGiftLibrary } from "./mysteryGiftLibrary";
import {
  mysteryGiftDirectory,
  mysteryGiftDirectorySources,
} from "./mysteryGiftDirectory";
export async function loadExternalMysteryGifts(settingsJson: string) {
  const library = await loadMysteryGiftLibrary();
  const json = JSON.stringify(
    mysteryGiftDirectorySources(
      library.files,
      mysteryGiftDirectory(settingsJson),
    ),
  );
  if (json.length > 24 * 1024 * 1024)
    throw new Error(
      "External mystery gift metadata exceeds the local size limit.",
    );
  return json;
}
