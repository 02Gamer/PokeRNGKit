import type { SlotMenuInvocation } from "./slotMenu";
import { useMemo } from "react";
import { boxBackgroundDragOver, boxBackgroundDrop } from "./boxDropFeedback";
import {
  adjacentBoxEdit,
  type GalleryModifiers,
  type GalleryDropMode,
} from "./boxGallery";
import { boxGalleryWords } from "./boxGalleryWords";
import { SaveBoxGrid } from "./SaveBoxGrid";
import type {
  BoxEdit,
  PokemonEntry,
  PokemonPosition,
  SaveReport,
} from "./domain";
import "./SaveBoxGallery.css";
export function SaveBoxGallery({
  searchMatches,
  report,
  revision,
  scope,
  dropMode,
  selected,
  busy,
  lang,
  onSelect,
  onSwap,
  onDrop,
  onSlotMenu,
  onSet,
}: {
  searchMatches?: ReadonlySet<string>;
  report: SaveReport;
  revision: number;
  scope: string;
  dropMode?: GalleryDropMode;
  selected: PokemonPosition;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onSelect(position: PokemonPosition): void;
  onSlotMenu?(invocation: SlotMenuInvocation): boolean;
  onSet?(position: PokemonPosition): void;
  onSwap(edit: BoxEdit): Promise<void>;
  onDrop(
    target: PokemonPosition,
    transfer: DataTransfer,
    keys: GalleryModifiers,
  ): Promise<void>;
}) {
  const w = boxGalleryWords[lang];
  const grouped = useMemo(() => {
    const map = new Map<number, PokemonEntry[]>();
    for (const p of report.pokemon) {
      if (p.box < 0) continue;
      const entries = map.get(p.box) ?? [];
      entries.push(p);
      map.set(p.box, entries);
    }
    return map;
  }, [report.pokemon]);
  const disabled =
    busy ||
    !report.canEdit ||
    !report.checksumsValid ||
    !report.boxOptions.canSwap ||
    report.boxCount < 2;
  return (
    <div
      className="save-box-gallery"
      aria-label={w.all}
      onDragOver={boxBackgroundDragOver}
      onDrop={boxBackgroundDrop}
    >
      {Array.from({ length: report.boxCount }, (_, box) => {
        const entries = grouped.get(box) ?? [],
          name =
            report.boxes.find((b) => b.index === box)?.name ||
            w.box + " " + (box + 1);
        const previous = (box + report.boxCount - 1) % report.boxCount,
          next = (box + 1) % report.boxCount;
        const targetName = (i: number) =>
          report.boxes.find((b) => b.index === i)?.name ||
          w.box + " " + (i + 1);
        return (
          <section
            key={box}
            className="save-box-gallery-box"
            aria-label={name}
            data-selected={selected.box === box}
          >
            <div className="save-box-gallery-heading">
              <h4>{name}</h4>
              <span>
                {entries.length} / {report.boxSlotCount}
              </span>
            </div>
            <SaveBoxGrid
              searchMatches={searchMatches}
              report={report}
              box={box}
              entries={entries}
              selected={selected}
              busy={busy}
              lang={lang}
              revision={revision}
              scope={scope}
              dropMode={dropMode}
              onSlotMenu={onSlotMenu}
              onSet={onSet}
              onSelect={onSelect}
              onDrop={onDrop}
            />
            <div className="save-box-gallery-actions">
              <button
                type="button"
                disabled={disabled}
                title={w.previous + " · " + targetName(previous)}
                onClick={() => void onSwap(adjacentBoxEdit(report, box, -1))}
              >
                {w.previous}
              </button>
              <button
                type="button"
                disabled={disabled}
                title={w.next + " · " + targetName(next)}
                onClick={() => void onSwap(adjacentBoxEdit(report, box, 1))}
              >
                {w.next}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
