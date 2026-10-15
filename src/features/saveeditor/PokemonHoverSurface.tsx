// SPDX-License-Identifier: GPL-3.0-or-later
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type PointerEvent,
  type FocusEvent,
} from "react";
import { createPortal } from "react-dom";
import type { PokemonPosition, SaveReport } from "./domain";
import { PokemonSprite } from "./PokemonSprite";
import { typeIconImage, pokemonOverlay } from "./art";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import {
  PokemonHoverReader,
  hoverPlacement,
  pokemonHoverSettings,
  hoverTargetKey,
  hoverTargetFromData,
  hoverResponseMatches,
  type PokemonHoverReport,
  type ReadPokemonHoverTarget,
} from "./pokemonHover";
import "./PokemonHoverSurface.css";
import { cryPlayback, serverCryPlaybackState } from "./cryPlayback";
import { cryDirectory } from "./cryLibrary";
import { PokemonSlotGlow } from "./PokemonSlotGlow";
import { useGenderLabel } from "./useGenderLabel";
import { saveEditorResources } from "./locales";

export function PokemonHoverSurface({
  children,
  report,
  revision,
  busy,
  lang,
  read,
  readTarget,
}: {
  children: ReactNode;
  report?: SaveReport;
  revision: unknown;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  read?(position: PokemonPosition): Promise<PokemonHoverReport | undefined>;
  readTarget?: ReadPokemonHoverTarget;
}) {
  const settingsJson = useSaveSettingsJson();
  const genderLabel = useGenderLabel();
  const playback = useSyncExternalStore(
    cryPlayback.subscribe,
    cryPlayback.snapshot,
    serverCryPlaybackState,
  );
  const [cryOwner] = useState(() => ({}));
  let soundDirectory = "";
  try {
    soundDirectory = cryDirectory(settingsJson);
  } catch {
    /* Invalid settings cannot select another folder. */
  }
  let settings: ReturnType<typeof pokemonHoverSettings> | undefined;
  try {
    settings = pokemonHoverSettings(settingsJson);
  } catch {
    /* Invalid settings lock the preview; Core validates the complete policy. */
  }
  const reader = useRef(new PokemonHoverReader()),
    target = useRef<HTMLButtonElement | null>(null),
    panel = useRef<HTMLDivElement>(null);
  const touch = useRef(false);
  const scope = useRef<HTMLDivElement>(null);
  const activeKey = useRef("");
  const id = useId();
  const [shown, setShown] = useState<{
    data: PokemonHoverReport;
    source?: SaveReport;
    revision: unknown;
    button: HTMLButtonElement;
  }>();
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [alt, setAlt] = useState(false);
  const close = useCallback(() => {
    reader.current.clear();
    cryPlayback.stop(cryOwner);
    if (target.current?.getAttribute("aria-describedby") === id)
      target.current.removeAttribute("aria-describedby");
    target.current = null;
    activeKey.current = "";
    setShown(undefined);
  }, [id, cryOwner]);
  useEffect(() => {
    let active = true;
    const currentReader = reader.current;
    queueMicrotask(() => {
      if (active) close();
    });
    return () => {
      active = false;
      currentReader.clear();
      cryPlayback.stop(cryOwner);
      if (target.current?.getAttribute("aria-describedby") === id)
        target.current.removeAttribute("aria-describedby");
      target.current = null;
    };
  }, [settingsJson, revision, report, busy, lang, close, id, cryOwner]);
  useEffect(() => {
    const clear = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".save-pokemon-hover")
      )
        return;
      close();
    };
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.key.startsWith("Arrow"))
        touch.current = false;
      if (event.key === "Alt") setAlt(event.type === "keydown");
      if (event.key === "Escape" && target.current) {
        close();
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("resize", clear);
    window.addEventListener("blur", clear);
    window.addEventListener("scroll", clear, true);
    const hidden = () => {
      if (document.hidden) close();
    };
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("keydown", keys);
    document.addEventListener("keyup", keys);
    return () => {
      window.removeEventListener("resize", clear);
      window.removeEventListener("blur", clear);
      window.removeEventListener("scroll", clear, true);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("keydown", keys);
      document.removeEventListener("keyup", keys);
    };
  }, [close]);
  const current =
    !busy && shown && shown.source === report && shown.revision === revision
      ? shown.data
      : undefined;
  const pokemon = current
    ? report?.pokemon.find(
        (value) => value.box === current.box && value.slot === current.slot,
      )
    : undefined;
  const preview = Boolean(
    current?.mode !== "encounter" && settings?.preview && !alt,
  );
  const text = current?.text[lang];
  const ball =
    current?.ball != null
      ? pokemonOverlay(`_ball${current.ball}`, "ball")
      : pokemon && (current?.generation ?? report?.generation ?? 0) > 2
        ? pokemonOverlay(`_ball${pokemon.origin.ball}`, "ball")
        : undefined;
  const visible = Boolean(text && settings && (preview || settings.text));
  useLayoutEffect(() => {
    if (!visible || !panel.current) return;
    const bounds = panel.current.getBoundingClientRect();
    const position = hoverPlacement(
      point.x,
      point.y,
      bounds.width,
      bounds.height,
      window.innerWidth,
      window.innerHeight,
    );
    panel.current.style.left = `${position.left}px`;
    panel.current.style.top = `${position.top}px`;
  }, [visible, point, preview, text]);
  function slot(element: EventTarget | null) {
    const button =
      element instanceof Element
        ? element.closest<HTMLButtonElement>(
            "button[data-hover-target],button[data-hover-box][data-hover-slot]",
          )
        : null;
    return button?.closest(".save-pokemon-hover-scope") === scope.current
      ? button
      : null;
  }
  function begin(
    button: HTMLButtonElement,
    x: number,
    y: number,
    altKey: boolean,
  ) {
    if (busy || !settings || button.disabled) return;
    setAlt(altKey);
    setPoint({ x: x + settings.offset.x, y: y + settings.offset.y });
    const position = hoverTargetFromData(button.dataset);
    if (
      !position ||
      (!settings.preview &&
        !settings.text &&
        !(
          settings.glow &&
          (position.kind === "slot" || position.kind === "registered")
        ) &&
        !(settings.cry && playback.enabled && soundDirectory)) ||
      (position.kind !== "slot" && !readTarget) ||
      ((position.kind === "encounter" || position.kind === "gift") &&
        !settings.text &&
        !(settings.cry && playback.enabled && soundDirectory))
    )
      return;
    const key = hoverTargetKey(position);
    if (target.current === button && activeKey.current === key) return;
    close();
    target.current = button;
    activeKey.current = key;
    reader.current.start(
      () =>
        readTarget
          ? readTarget(position)
          : position.kind === "slot" && read
            ? read(position)
            : Promise.resolve(undefined),
      (data) => {
        if (
          !button.isConnected ||
          target.current !== button ||
          !hoverResponseMatches(position, data) ||
          !hoverTargetFromData(button.dataset) ||
          hoverTargetKey(hoverTargetFromData(button.dataset)!) !== key
        )
          return;
        if (settings.preview || settings.text)
          button.setAttribute("aria-describedby", id);
        setShown({ data, source: report, revision, button });
        if (
          settings.cry &&
          playback.enabled &&
          soundDirectory &&
          data.cryNames?.length
        )
          void cryPlayback.play(cryOwner, soundDirectory, data.cryNames);
      },
    );
  }
  function over(event: PointerEvent<HTMLDivElement>) {
    touch.current = event.pointerType === "touch";
    if (touch.current) return;
    const button = slot(event.target);
    if (button) begin(button, event.clientX, event.clientY, event.altKey);
  }
  function focus(event: FocusEvent<HTMLDivElement>) {
    if (touch.current) return;
    const button = slot(event.target);
    if (button) {
      const bounds = button.getBoundingClientRect();
      begin(button, bounds.right, bounds.top, false);
    }
  }
  function leave(related: EventTarget | null) {
    if (
      related instanceof Element &&
      (related.closest(".save-pokemon-hover") ||
        slot(related) === target.current)
    )
      return;
    close();
  }
  return (
    <div
      ref={scope}
      className="save-pokemon-hover-scope"
      onPointerOverCapture={over}
      onPointerMoveCapture={over}
      onPointerOutCapture={(event) => leave(event.relatedTarget)}
      onFocusCapture={focus}
      onBlurCapture={(event) => leave(event.relatedTarget)}
      onPointerDownCapture={(event) => {
        touch.current = event.pointerType === "touch";
        if (!(
          event.target instanceof Element &&
          event.target.closest(".save-pokemon-hover")
        ))
          close();
      }}
      onDragStartCapture={close}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape" && target.current) {
          close();
          event.preventDefault();
          event.stopPropagation();
        } else if (event.key !== "Alt") close();
      }}
    >
      {children}
      {settings?.glow &&
      current?.glowArtwork &&
      shown &&
      (current.target?.kind === "slot" ||
        current.target?.kind === "registered") ? (
        <PokemonSlotGlow target={shown.button} artwork={current.glowArtwork} />
      ) : null}
      {visible && text && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panel}
              id={id}
              role="tooltip"
              className="save-pokemon-hover"
              style={{ left: point.x, top: point.y }}
            >
              {preview ? (
                <>
                  <div className="save-pokemon-hover-heading">
                    {current?.artwork || pokemon ? (
                      <PokemonSprite
                        pokemon={current?.artwork ?? pokemon!}
                        alt=""
                        width={68}
                        height={56}
                      />
                    ) : null}
                    <strong>{text.title}</strong>
                    {current.gender != null && (
                      <span>
                        {genderLabel(
                          current.gender,
                          [
                            saveEditorResources[lang].male,
                            saveEditorResources[lang].female,
                            saveEditorResources[lang].genderless,
                          ][current.gender],
                        )}
                      </span>
                    )}
                    {ball ? (
                      <img src={ball.url} width={24} height={24} alt="" />
                    ) : null}
                  </div>
                  {text.before ? <p>{text.before}</p> : null}
                  {text.moves.length ? (
                    <ul>
                      {text.moves.map((move, index) => (
                        <li key={index} data-invalid={!move.valid}>
                          {typeIconImage(move.type) ? (
                            <img
                              src={typeIconImage(move.type)}
                              width={24}
                              height={24}
                              alt=""
                            />
                          ) : null}
                          {move.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {text.hint ? (
                    <p className="save-editor-error">{text.hint}</p>
                  ) : null}
                  {text.after ? <p>{text.after}</p> : null}
                </>
              ) : (
                <p>{text.tooltip}</p>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
