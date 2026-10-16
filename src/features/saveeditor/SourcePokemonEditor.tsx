// SPDX-License-Identifier: GPL-3.0-or-later
import {
  useEffect,
  useEffectEvent,
  useCallback,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import type { PokemonPosition } from "./domain";
import { StandalonePokemonPanel } from "./StandalonePokemonPanel";
import { EditorLoadSession } from "./editorLoadSession";
import {
  editorSnapshot,
  pokemonSetWords,
  type PokemonSetActions,
  type PokemonEditorHandle,
  type PokemonEditorSaveContext,
} from "./pokemonSet";
import type { StandalonePokemonSnapshot } from "./standalonePokemon";
export function SourcePokemonEditor({
  source,
  revision,
  disabled,
  lang,
  actions,
  onReady,
}: {
  source: PokemonPosition;
  revision: number;
  disabled: boolean;
  lang: "zh" | "en" | "ja";
  actions: PokemonSetActions;
  onReady(handle: PokemonEditorHandle | undefined): void;
}) {
  const [loaded, setLoaded] = useState<{
    snapshot: StandalonePokemonSnapshot;
    context: PokemonEditorSaveContext;
  }>();
  const [context, setContext] = useState<PokemonEditorSaveContext>();
  const [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const alive = useRef(false);
  const loader = useRef(new EditorLoadSession());
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const latestActions = useRef(actions);
  const sourceBox = source.box,
    sourceSlot = source.slot;
  useLayoutEffect(() => {
    latestActions.current = actions;
  }, [actions]);
  const open = useEffectEvent(() => actions.open(source));
  const readContext = useEffectEvent(() => actions.context(source));
  useEffect(() => {
    if (disabled || loaded) return;
    let current = true;
    void loader.current
      .load(attempt, () => open())
      .then((result) => {
        if (!current) return;
        if (!result) {
          setError(true);
          return;
        }
        setLoaded({
          snapshot: editorSnapshot(result.file),
          context: result.context,
        });
        setError(false);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, [attempt, disabled, loaded]);
  useEffect(() => {
    let current = true;
    void readContext()
      .then((value) => {
        if (current && value) setContext(value);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, [revision]);
  const ready = useCallback(
    (handle: PokemonEditorHandle | undefined) => {
      if (error) {
        onReady(undefined);
        return;
      }
      onReady(
        handle
          ? {
              capture: handle.capture,
              accept: (file) => {
                void latestActions.current
                  .context({ box: sourceBox, slot: sourceSlot })
                  .then((value) => {
                    if (!alive.current) return;
                    if (!value) {
                      setError(true);
                      return;
                    }
                    setContext(value);
                    handle.accept(file);
                  })
                  .catch(() => {
                    if (alive.current) setError(true);
                  });
              },
            }
          : undefined,
      );
    },
    [onReady, sourceBox, sourceSlot, error],
  );
  const words = pokemonSetWords[lang];
  return (
    <section aria-label={words.editor}>
      {error && (
        <p className="save-editor-error" role="alert">
          {words.failed}{" "}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!loaded) {
                setAttempt((v) => v + 1);
                return;
              }
              void latestActions.current
                .context({ box: sourceBox, slot: sourceSlot })
                .then((value) => {
                  if (alive.current && value) {
                    setContext(value);
                    setError(false);
                  }
                })
                .catch(() => {
                  if (alive.current) setError(true);
                });
            }}
          >
            {words.retry}
          </button>
        </p>
      )}
      {!loaded && !error && <p role="status">{words.loading}</p>}
      {loaded && (
        <StandalonePokemonPanel
          seed={loaded.snapshot}
          saveContext={context ?? loaded.context}
          disabled={disabled}
          onEditorReady={ready}
        />
      )}
    </section>
  );
}
