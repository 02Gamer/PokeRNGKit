// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from "react";
import { subscribeMysteryGiftChanges } from "./mysteryGiftChanges";
export function useMysteryGiftChanges(origin?: object) {
  const [revision, setRevision] = useState(0);
  useEffect(
    () =>
      subscribeMysteryGiftChanges((source) => {
        if (!origin || source !== origin) setRevision((value) => value + 1);
      }),
    [origin],
  );
  return revision;
}
