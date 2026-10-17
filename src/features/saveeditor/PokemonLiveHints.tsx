// SPDX-License-Identifier: GPL-3.0-or-later
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  PokemonAutomaticHints,
  type AutomaticHints,
} from "./PokemonAutomaticHints";
import { PokemonDraftRegistry } from "./pokemonDraftRegistry";
import { PokemonDraftContext } from "./pokemonDraftValidation";
import {
  PokemonLiveHintsContext,
  type PokemonLiveHintState,
} from "./pokemonLiveHintsContext";
import type { PokemonDraftCapture } from "./pokemonDraftPlan";
import type { PokemonEditorSaveContext } from "./pokemonSet";
import type { StandalonePokemonSnapshot } from "./standalonePokemon";
import { StandalonePokemonClient } from "./standaloneClient";
import { bulkLegalitySourceHash } from "./bulkLegality";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { useMysteryGiftChanges } from "./useMysteryGiftChanges";
import {
  LatestHintQueue,
  moveHintWords,
  parsePokemonHintsPreview,
} from "./pokemonHintsPreview";
export function PokemonLiveHintsProvider({
  registry,
  snapshot,
  saveContext,
  haX,
  disabled,
  children,
}: {
  registry: PokemonDraftRegistry;
  snapshot?: StandalonePokemonSnapshot;
  saveContext?: PokemonEditorSaveContext;
  haX: boolean;
  disabled: boolean;
  children: ReactNode;
}) {
  const captureJson = useSyncExternalStore(
    registry.subscribe,
    registry.snapshot,
    registry.snapshot,
  );
  const settings = useSaveSettingsJson(),
    gifts = useMysteryGiftChanges();
  const sourceHash = useMemo(
    () => (snapshot ? bulkLegalitySourceHash(snapshot.bytes) : ""),
    [snapshot],
  );
  const contextKey = useMemo(
    () =>
      saveContext
        ? bulkLegalitySourceHash(saveContext.bytes) +
          JSON.stringify({
            source: saveContext.source,
            recognition: saveContext.recognition,
            brProfile: saveContext.brProfile,
          })
        : "",
    [saveContext],
  );
  const key = JSON.stringify([
    sourceHash,
    snapshot?.fileName,
    snapshot?.inputEncrypted,
    snapshot?.useFileFormat,
    captureJson,
    contextKey,
    settings,
    gifts,
  ]);
  const client = useRef(new StandalonePokemonClient()),
    queue = useRef(new LatestHintQueue());
  const [response, setResponse] = useState<{
    key: string;
    hints?: AutomaticHints | null;
    failed?: boolean;
  }>();
  useEffect(() => {
    const currentQueue = queue.current,
      currentClient = client.current;
    return () => {
      currentQueue.invalidate();
      currentClient.dispose();
    };
  }, []);
  useEffect(() => {
    queue.current.invalidate();
    client.current.dispose();
  }, [contextKey, settings, gifts]);
  useEffect(() => {
    if (!snapshot || haX || disabled || captureJson === "invalid") return;
    const currentQueue = queue.current;
    let live = true;
    const timer = setTimeout(() => {
      void currentQueue
        .request(async () => {
          client.current.setSaveContext(saveContext);
          const request = {
            fileName: snapshot.fileName,
            inputEncrypted: snapshot.inputEncrypted,
            useFileFormat: snapshot.useFileFormat ?? false,
            draftHints: {
              sourceHash,
              capture: JSON.parse(captureJson) as PokemonDraftCapture,
            },
          };
          const requestHash = bulkLegalitySourceHash(
            new TextEncoder().encode(JSON.stringify(request)),
          );
          const result = await client.current.readDraftHints(
            snapshot.bytes,
            request,
          );
          return parsePokemonHintsPreview(result, sourceHash, requestHash)
            .hints;
        })
        .then((hints) => {
          if (live && hints !== undefined) setResponse({ key, hints });
        })
        .catch(() => {
          if (live) setResponse({ key, failed: true });
        });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
      currentQueue.invalidate();
    };
  }, [snapshot, saveContext, key, sourceHash, captureJson, haX, disabled]);
  const value: PokemonLiveHintState =
    !snapshot || haX
      ? { status: "off" }
      : captureJson === "invalid"
        ? { status: "invalid" }
        : response?.key !== key
          ? { status: "pending" }
          : response.failed
            ? { status: "failed" }
            : { status: "ready", hints: response.hints };
  return (
    <PokemonDraftContext value={registry}>
      <PokemonLiveHintsContext value={value}>
        {children}
      </PokemonLiveHintsContext>
    </PokemonDraftContext>
  );
}
export function PokemonLiveHintsStatus({ lang }: { lang: "zh" | "en" | "ja" }) {
  const value = useContext(PokemonLiveHintsContext);
  if (value.status === "off") return null;
  if (value.status === "ready")
    return (
      <PokemonAutomaticHints info={value.hints} lang={lang} currentInputs />
    );
  return (
    <p className="save-editor-note" role="status">
      {moveHintWords[lang][value.status]}
    </p>
  );
}
