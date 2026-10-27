// SPDX-License-Identifier: GPL-3.0-or-later
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  createBoxPointerController,
  type BoxPointerDrop,
  type BoxPointerFeedback,
  type BoxPointerTarget,
} from "./boxPointerController";
import { encodeBoxDrag, type GalleryDropMode } from "./boxGallery";
import type { PokemonEntry, PokemonPosition } from "./domain";
import { programDragThreshold } from "./programDragSettings";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { playSaveSound } from "./saveSound";
import { suppressBoxPointerClick } from "./boxPointerClick";

interface GridConfig {
  scope: string;
  revision: number;
  box: number;
  count: number;
  writable: boolean;
  mode: GalleryDropMode;
  name: string;
  entries: ReadonlyMap<number, PokemonEntry>;
  onPointerDrop?: BoxPointerDrop;
}
interface LiveGrid extends GridConfig {
  settings: string;
  threshold?: number;
}
const grids = new WeakMap<Element, LiveGrid>();
let cancelActive: (() => void) | undefined;
let clearClickBlock: (() => void) | undefined;

function targetAt(
  doc: Document,
  point: { x: number; y: number },
): BoxPointerTarget | undefined {
  const element = doc.elementFromPoint(point.x, point.y);
  const button = element?.closest<HTMLButtonElement>("button[data-slot]");
  const root = button?.closest("[data-box-pointer-grid]");
  const config = root && grids.get(root);
  if (!button || !root || !config?.onPointerDrop) return undefined;
  const slot = Number(button.dataset.slot);
  if (!Number.isInteger(slot) || slot < 0 || slot >= config.count)
    return undefined;
  const position = { box: config.box, slot };
  const { scope, revision } = config;
  return {
    token: button,
    scope,
    revision,
    position,
    writable: config.writable && !button.disabled,
    mode: config.mode,
    label: `${config.name} · ${slot + 1}`,
    async apply(payload, keys) {
      const live = grids.get(root);
      if (
        !button.isConnected ||
        !live?.writable ||
        !live.onPointerDrop ||
        live.scope !== scope ||
        live.revision !== revision ||
        live.box !== position.box ||
        position.slot >= live.count
      )
        throw Error("Stale box pointer target.");
      await live.onPointerDrop(position, payload, keys);
    },
  };
}

export function useBoxPointerDrag(config: GridConfig) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const [preview, setPreview] = useState<{
    frame: BoxPointerFeedback;
    pokemon: PokemonEntry;
  }>();
  const [failed, setFailed] = useState(false);
  const settings = useSaveSettingsJson();
  let threshold: number | undefined;
  try {
    threshold = programDragThreshold(settings);
  } catch {
    /* Worker reports invalid stored settings; retain native fallback. */
  }
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    grids.set(root, { ...config, settings, threshold });
    return () => {
      grids.delete(root);
    };
  });
  useEffect(
    () => () => {
      cleanup.current?.();
    },
    [config.scope, config.revision, config.box, config.writable, settings],
  );

  function pointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    position: PokemonPosition,
  ) {
    const root = rootRef.current,
      initial = root && grids.get(root);
    const pokemon = initial?.entries.get(position.slot);
    if (
      !root ||
      !initial?.writable ||
      !initial.onPointerDrop ||
      initial.threshold === undefined ||
      position.box !== initial.box ||
      !pokemon?.valid ||
      pokemon.species === 0
    )
      return;
    const button = event.currentTarget;
    const doc = button.ownerDocument,
      win = doc.defaultView;
    if (!win) return;
    let highlighted: Element | undefined;
    const readSource = () => {
      const live = grids.get(root),
        current = live?.entries.get(position.slot);
      return button.isConnected &&
        live?.writable &&
        live.onPointerDrop &&
        live.box === position.box &&
        live.settings === initial.settings &&
        live.threshold === initial.threshold &&
        current?.valid &&
        current.species > 0
        ? { scope: live.scope, revision: live.revision, position }
        : undefined;
    };
    const controller = createBoxPointerController(
      event,
      initial.threshold,
      { scope: initial.scope, revision: initial.revision, position },
      {
        readSource,
        targetAt: (point) => targetAt(doc, point),
        render: (frame) => {
          highlighted?.removeAttribute("data-pointer-drop-target");
          highlighted =
            frame?.allowed && frame.target?.token instanceof Element
              ? frame.target.token
              : undefined;
          highlighted?.setAttribute("data-pointer-drop-target", "true");
          if (frame) button.dataset.pointerSource = "dragging";
          setPreview(frame ? { frame, pokemon } : undefined);
        },
      },
    );
    if (!controller) return;
    cancelActive?.();
    setFailed(false);
    // Own the mouse gesture before the browser can initiate native HTML dragging.
    // Restore its native capability at cleanup; touch/pen retain their native path.
    button.draggable = false;
    button.dataset.pointerSource = "armed";
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      /* Window listeners still track the gesture. */
    }
    let disposed = false;
    const dispose = (suppressClick: boolean) => {
      if (disposed) return;
      disposed = true;
      win.removeEventListener("pointermove", move, true);
      win.removeEventListener("pointerup", up, true);
      win.removeEventListener("pointercancel", cancelPointer, true);
      win.removeEventListener("keydown", key, true);
      win.removeEventListener("keyup", key, true);
      win.removeEventListener("blur", abort);
      win.removeEventListener("scroll", refresh, true);
      win.removeEventListener("resize", refresh);
      doc.removeEventListener("visibilitychange", visibility);
      button.removeEventListener("lostpointercapture", lostCapture);
      controller.cancel();
      try {
        if (button.hasPointerCapture(event.pointerId))
          button.releasePointerCapture(event.pointerId);
      } catch {
        /* Detached or implicitly released capture needs no further action. */
      }
      button.removeAttribute("data-pointer-source");
      const live = grids.get(root),
        current = live?.entries.get(position.slot);
      button.draggable = !!(
        live?.writable &&
        live.box === position.box &&
        current?.valid &&
        current.species > 0
      );
      if (cancelActive === abort) cancelActive = undefined;
      cleanup.current = undefined;
      if (suppressClick) {
        clearClickBlock?.();
        clearClickBlock = suppressBoxPointerClick(win);
      }
    };
    const abort = () => dispose(true);
    const lostCapture = () => abort();
    const visibility = () => {
      if (doc.hidden) abort();
    };
    const refresh = () => {
      controller.refresh();
      if (!controller.active) abort();
    };
    const cancelPointer = (e: PointerEvent) => {
      if (e.pointerId === controller.pointerId) abort();
    };
    const move = (e: PointerEvent) => {
      if (controller.move(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!controller.active) dispose(controller.consumed);
    };
    const up = (e: PointerEvent) => {
      if (
        e.pointerId !== controller.pointerId ||
        e.button !== 0 ||
        e.buttons & 1
      )
        return;
      const hit = doc.elementFromPoint(e.clientX, e.clientY);
      const preserveClick = controller.canClick(
        e,
        !!hit && button.contains(hit),
      );
      const result = controller.finish(e);
      dispose(!preserveClick);
      if (!preserveClick) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (result) {
        const payload = encodeBoxDrag(
          result.source.scope,
          result.source.revision,
          result.source.position,
        );
        void result.target.apply(payload, result.keys).catch(() => {
          playSaveSound("other");
          setFailed(true);
        });
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        abort();
        return;
      }
      controller.modifiers(e);
      if (!controller.active) abort();
    };
    cleanup.current = abort;
    cancelActive = abort;
    win.addEventListener("pointermove", move, {
      capture: true,
      passive: false,
    });
    win.addEventListener("pointerup", up, true);
    win.addEventListener("pointercancel", cancelPointer, true);
    win.addEventListener("keydown", key, true);
    win.addEventListener("keyup", key, true);
    win.addEventListener("blur", abort);
    win.addEventListener("scroll", refresh, true);
    win.addEventListener("resize", refresh);
    doc.addEventListener("visibilitychange", visibility);
    button.addEventListener("lostpointercapture", lostCapture);
  }
  return { rootRef, pointerDown, preview, failed };
}
