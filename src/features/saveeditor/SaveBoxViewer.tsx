import type { SlotMenuInvocation } from "./slotMenu";
import { Select } from "../shared/Select";
import { SaveBoxGrid } from "./SaveBoxGrid";
import { boxViewerWords, moveBoxView } from "./boxViewer";
import type { GalleryModifiers } from "./boxGallery";
import type { PokemonPosition, SaveReport } from "./domain";
import "./SaveBoxViewer.css";

export function SaveBoxViewer({
  searchMatches,
  report,
  main,
  secondary,
  selected,
  busy,
  lang,
  revision,
  scope,
  onMain,
  onSecondary,
  onSelect,
  onSwapViews,
  onDrop,
  onSlotMenu,
}: {
  searchMatches?: ReadonlySet<string>;
  report: SaveReport;
  main: number;
  secondary: number;
  selected: PokemonPosition;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  revision: number;
  scope: string;
  onMain(box: number): void;
  onSecondary(box: number): void;
  onSelect(position: PokemonPosition): void;
  onSlotMenu?(invocation: SlotMenuInvocation): boolean;
  onSwapViews(): void;
  onDrop(
    target: PokemonPosition,
    transfer: DataTransfer,
    keys: GalleryModifiers,
  ): Promise<void>;
}) {
  const w = boxViewerWords[lang];
  if (report.boxCount < 1) return null;
  const name = (box: number) =>
    report.boxes.find((b) => b.index === box)?.name ?? String(box + 1);
  return (
    <div className="save-box-viewer" role="group" aria-label={w.viewer}>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={busy || main === secondary}
          onClick={onSwapViews}
        >
          {w.swap}
        </button>
        <p className="save-editor-note">{w.note}</p>
      </div>
      <div className="save-box-viewer-panes">
        {(
          [
            { id: "main", box: main, label: w.main, change: onMain },
            {
              id: "secondary",
              box: secondary,
              label: w.secondary,
              change: onSecondary,
            },
          ] as const
        ).map((pane) => (
          <section
            key={pane.id}
            className="save-box-viewer-pane"
            aria-label={pane.label}
          >
            <label className="field">
              <span>{pane.label}</span>
              <Select
                value={pane.box}
                disabled={busy}
                onChange={(e) => pane.change(Number(e.target.value))}
              >
                {Array.from({ length: report.boxCount }, (_, box) => (
                  <option key={box} value={box}>
                    {name(box)}
                  </option>
                ))}
              </Select>
            </label>
            <div className="save-editor-toolbar save-box-viewer-navigation">
              <button
                type="button"
                disabled={busy}
                onClick={() => pane.change(0)}
              >
                {w.first}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={(e) =>
                  pane.change(
                    moveBoxView(
                      pane.box,
                      report.boxCount,
                      -1,
                      e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey,
                    ),
                  )
                }
              >
                {w.previous}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={(e) =>
                  pane.change(
                    moveBoxView(
                      pane.box,
                      report.boxCount,
                      1,
                      e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey,
                    ),
                  )
                }
              >
                {w.next}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => pane.change(report.boxCount - 1)}
              >
                {w.last}
              </button>
            </div>
            <SaveBoxGrid
              searchMatches={searchMatches}
              report={report}
              box={pane.box}
              selected={selected}
              busy={busy}
              lang={lang}
              revision={revision}
              scope={scope}
              onSlotMenu={onSlotMenu}
              onSelect={onSelect}
              onDrop={onDrop}
            />
            <p className="save-editor-note">
              {name(pane.box)} ·{" "}
              {report.pokemon.filter((p) => p.box === pane.box).length} /{" "}
              {report.boxSlotCount}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
