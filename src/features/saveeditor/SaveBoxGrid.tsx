import { slotMenuKey, type SlotMenuInvocation } from "./slotMenu";
import { useMemo, type CSSProperties, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { useBoxPointerDrag } from "./useBoxPointerDrag";
import type { BoxPointerDrop } from "./boxPointerController";
import { boxWallpaper } from "./art";
import { pokemonAccess } from "./savePokemonEditing";
import { PokemonSprite } from "./PokemonSprite";
import {
  boxBackgroundDragOver,
  boxBackgroundDrop,
  boxSlotDragOver,
} from "./boxDropFeedback";
import { playSaveSound } from "./saveSound";
import { defaultSpriteFilter } from "./spritePixels";
import {
  BOX_SLOT_DRAG_TYPE,
  boxSlotNavigation,
  encodeBoxDrag,
  type GalleryModifiers,
  type GalleryDropMode,
} from "./boxGallery";
import { boxGalleryWords } from "./boxGalleryWords";
import type { PokemonEntry, PokemonPosition, SaveReport } from "./domain";
export function SaveBoxGrid({
  searchMatches,
  report,
  box,
  selected,
  busy,
  lang,
  revision,
  scope,
  dropMode = "auto",
  entries,
  onSelect,
  onDrop,
  onPointerDrop,
  onSlotMenu,
  onSet,
}: {
  searchMatches?: ReadonlySet<string>;
  report: SaveReport;
  box: number;
  selected: PokemonPosition;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  revision: number;
  scope: string;
  dropMode?: GalleryDropMode;
  entries?: PokemonEntry[];
  onSelect(position: PokemonPosition): void;
  onSlotMenu?(invocation: SlotMenuInvocation): boolean;
  onSet?(position: PokemonPosition): void;
  onPointerDrop?: BoxPointerDrop;
  onDrop(
    target: PokemonPosition,
    transfer: DataTransfer,
    keys: GalleryModifiers,
  ): Promise<void>;
}) {
  const w = boxGalleryWords[lang],
    party = box === -1;
  const count = party ? Math.max(6, report.partyCount) : report.boxSlotCount;
  const columns = party ? 3 : Math.max(1, Math.floor(count / 5));
  const slots = useMemo(
    () =>
      new Map(
        (entries ?? report.pokemon.filter((p) => p.box === box)).map((p) => [
          p.slot,
          p,
        ]),
      ),
    [entries, report.pokemon, box],
  );
  const writable =
    !busy &&
    pokemonAccess(report).canStorage &&
    report.checksumsValid &&
    !party;
  const recognized = (e: DragEvent) =>
    e.dataTransfer.types.includes(BOX_SLOT_DRAG_TYPE) ||
    e.dataTransfer.types.includes("Files");
  const boxName =
    report.boxes.find((b) => b.index === box)?.name || w.box + " " + (box + 1);
  const { rootRef, pointerDown, preview, failed } = useBoxPointerDrag({
    scope,
    revision,
    box,
    count,
    writable,
    mode: dropMode,
    name: boxName,
    entries: slots,
    onPointerDrop,
  });
  return (
    <>
      <div
        ref={rootRef}
        data-box-pointer-grid="true"
        className="save-pokemon-slots"
        onDragOver={boxBackgroundDragOver}
        onDrop={boxBackgroundDrop}
        data-party={party}
        data-box={box}
        role="group"
        aria-label={party ? w.current : boxName}
        style={
          party
            ? undefined
            : ({
                "--box-wallpaper": 'url("' + boxWallpaper(report, box) + '")',
                "--box-columns": columns,
              } as CSSProperties)
        }
      >
        {Array.from({ length: count }, (_, slot) => {
          const p = slots.get(slot),
            position = { box, slot };
          const emptyMarkers = !p
            ? report.emptySlotMarkers?.find(
                (entry) => entry.box === box && entry.slot === slot,
              )?.markers
            : undefined;
          const label = [
            w.slot + " " + (slot + 1),
            p ? p.speciesName[lang] : w.empty,
            p?.nickname,
            p ? w.level + " " + p.level : "",
            p?.shiny ? w.shiny : "",
            p?.egg ? w.egg : "",
            p && !p.valid ? w.invalid : "",
          ]
            .filter(Boolean)
            .join(" · ");
          const isSelected = selected.box === box && selected.slot === slot;
          return (
            <button
              type="button"
              key={slot}
              data-slot={slot}
              data-hover-box={p ? box : undefined}
              data-hover-slot={p ? slot : undefined}
              data-search-match={
                searchMatches && box >= 0 && p
                  ? searchMatches.has(`${box}:${slot}`)
                  : undefined
              }
              aria-label={label}
              aria-pressed={isSelected}
              disabled={busy}
              tabIndex={
                slot === (selected.box === box ? selected.slot : 0) ? 0 : -1
              }
              draggable={writable && !!p?.valid && p.species > 0}
              onPointerDown={(event) => pointerDown(event, position)}
              aria-haspopup={onSlotMenu ? "menu" : undefined}
              onContextMenu={(event) => {
                if (!onSlotMenu) return;
                const rect = event.currentTarget.getBoundingClientRect();
                if (
                  onSlotMenu({
                    position,
                    trigger: event.currentTarget,
                    x: event.clientX || rect.left,
                    y: event.clientY || rect.bottom,
                    keys: event,
                  })
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onClick={(event) => {
                if (
                  onSet &&
                  event.shiftKey &&
                  !event.ctrlKey &&
                  !event.altKey &&
                  !event.metaKey
                ) {
                  event.preventDefault();
                  onSet(position);
                } else onSelect(position);
              }}
              onKeyDown={(e) => {
                if (onSlotMenu && slotMenuKey(e.key, e.shiftKey)) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (
                    onSlotMenu({
                      position,
                      trigger: e.currentTarget,
                      x: rect.left,
                      y: rect.bottom,
                      keys: e,
                    })
                  ) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                  return;
                }
                if (e.ctrlKey || e.altKey || e.metaKey) return;
                const next = boxSlotNavigation(slot, e.key, count, columns);
                if (next === undefined) return;
                e.preventDefault();
                onSelect({ box, slot: next });
                e.currentTarget.parentElement
                  ?.querySelector<HTMLButtonElement>(
                    '[data-slot="' + next + '"]',
                  )
                  ?.focus();
              }}
              onDragStart={(e) => {
                if (!writable || !p?.valid || p.species === 0) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.effectAllowed = "copyMove";
                e.dataTransfer.setData(
                  BOX_SLOT_DRAG_TYPE,
                  encodeBoxDrag(scope, revision, position),
                );
              }}
              onDragOver={(e) => {
                boxSlotDragOver(e, writable, dropMode);
              }}
              onDrop={(e) => {
                if (!recognized(e)) return;
                e.preventDefault();
                e.stopPropagation();
                if (!writable) {
                  playSaveSound("other");
                  return;
                }
                void onDrop(position, e.dataTransfer, {
                  shiftKey: e.shiftKey,
                  altKey: e.altKey,
                  ctrlKey: e.ctrlKey,
                  metaKey: e.metaKey,
                });
              }}
            >
              <span className="save-pokemon-slot-number">{slot + 1}</span>
              {!p && emptyMarkers?.length ? (
                <PokemonSprite
                  pokemon={{
                    species: 0,
                    sprite: "b_0",
                    slotMarkers: emptyMarkers,
                  }}
                  alt=""
                  width={68}
                  height={56}
                  draggable={false}
                />
              ) : null}
              {p && (
                <>
                  <PokemonSprite
                    pokemon={p}
                    filterProfile={
                      searchMatches &&
                      box >= 0 &&
                      !searchMatches.has(`${box}:${slot}`)
                        ? (report.spriteFilter ?? defaultSpriteFilter)
                        : undefined
                    }
                    alt=""
                    draggable={false}
                    width={68}
                    height={56}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="save-pokemon-slot-state">
                    {!p.valid ? "!" : ""}
                    {p.shiny ? "★" : ""}
                    {p.egg ? "○" : ""}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      {preview &&
        createPortal(
          <div
            className="save-box-pointer-preview"
            aria-hidden="true"
            data-allowed={preview.frame.allowed}
            style={{
              left: Math.max(
                8,
                Math.min(preview.frame.point.x + 12, window.innerWidth - 228),
              ),
              top: Math.max(
                8,
                Math.min(preview.frame.point.y + 12, window.innerHeight - 148),
              ),
            }}
          >
            <PokemonSprite pokemon={preview.pokemon} />
            <div>
              <strong>
                {preview.pokemon.nickname || preview.pokemon.speciesName[lang]}
              </strong>
              <span>
                {preview.frame.allowed
                  ? w.modes[preview.frame.mode]
                  : w.dropUnavailable}
              </span>
              {preview.frame.allowed && (
                <small>{preview.frame.target?.label}</small>
              )}
            </div>
          </div>,
          document.body,
        )}
      {failed && (
        <p className="save-editor-note" role="alert">
          {w.dragError}
        </p>
      )}
    </>
  );
}
