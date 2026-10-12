import { Select } from "../shared/Select";
import { PokemonLegality } from "./PokemonLegality";
import { pokemonImage } from "./art";
import { saveEditorResources } from "./locales";
import { boxSlotNavigation } from "./boxGallery";
import {
  groupPosition,
  moveGroup,
  registeredGroupWords,
  type RegisteredGroupCatalog,
  type RegisteredGroupPosition,
  type RegisteredGroupAnalysis,
} from "./registeredGroups";
import "./RegisteredGroupWorkspace.css";

export function RegisteredGroupWorkspace({
  catalog,
  group,
  slot,
  lang,
  busy,
  analysis,
  onGroup,
  onSlot,
  onAnalyze,
}: {
  catalog: RegisteredGroupCatalog;
  group: number;
  slot: number;
  lang: "zh" | "en" | "ja";
  busy: boolean;
  analysis?: RegisteredGroupAnalysis;
  onGroup(group: number): void;
  onSlot(slot: number): void;
  onAnalyze(position: RegisteredGroupPosition): Promise<void>;
}) {
  const w = registeredGroupWords[lang],
    words = saveEditorResources[lang];
  const entry = catalog.groups.find((entry) => entry.index === group);
  if (!entry) return <p>{w.unavailable}</p>;
  const selected = entry.slots.find((entry) => entry.slot === slot)?.pokemon;
  const currentAnalysis =
    analysis?.position.group === group && analysis.position.slot === slot
      ? analysis.report
      : undefined;
  return (
    <section className="save-registered-groups" aria-label={w.title}>
      <div className="save-registered-group-navigation">
        <label className="field">
          <span>{w.group}</span>
          <Select
            value={group}
            disabled={busy}
            onChange={(e) => onGroup(Number(e.target.value))}
          >
            {catalog.groups.map((entry) => (
              <option key={entry.index} value={entry.index}>
                {entry.name}
              </option>
            ))}
          </Select>
        </label>
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={busy}
            onClick={() => onGroup(catalog.groups[0].index)}
          >
            {w.first}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => onGroup(moveGroup(catalog, group, -1, e.ctrlKey))}
          >
            {w.previous}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => onGroup(moveGroup(catalog, group, 1, e.ctrlKey))}
          >
            {w.next}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onGroup(catalog.groups.at(-1)!.index)}
          >
            {w.last}
          </button>
        </div>
      </div>
      <div className="save-registered-group-body">
        <div>
          <div
            className="save-registered-group-slots"
            role="group"
            aria-label={entry.name}
          >
            {entry.slots.map((member, index) => {
              const p = member.pokemon;
              const label = `${words.slot} ${member.slot + 1} · ${p ? p.speciesName[lang] : w.empty}`;
              return (
                <button
                  type="button"
                  key={member.slot}
                  data-group-slot={member.slot}
                  aria-label={label}
                  title={
                    p
                      ? `${label} · ${p.nickname} · ${words.level} ${p.level}`
                      : label
                  }
                  disabled={busy}
                  aria-pressed={slot === member.slot}
                  tabIndex={slot === member.slot ? 0 : -1}
                  onClick={() => onSlot(member.slot)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.altKey || e.metaKey) return;
                    const next = boxSlotNavigation(
                      index,
                      e.key,
                      entry.slots.length,
                      3,
                    );
                    if (next === undefined) return;
                    e.preventDefault();
                    onSlot(entry.slots[next].slot);
                    e.currentTarget.parentElement
                      ?.querySelector<HTMLButtonElement>(
                        `[data-group-slot="${entry.slots[next].slot}"]`,
                      )
                      ?.focus();
                  }}
                >
                  {p ? (
                    <>
                      <img
                        src={pokemonImage(p)}
                        alt=""
                        width={68}
                        height={56}
                        loading="lazy"
                      />
                      <span>{p.speciesName[lang]}</span>
                      <small>
                        {words.level} {p.level}
                      </small>
                      {member.legality && (
                        <small
                          className={
                            member.legality === "valid"
                              ? undefined
                              : "save-editor-error"
                          }
                        >
                          {member.legality === "valid"
                            ? words.legalityValid
                            : member.legality === "invalid"
                              ? words.legalityInvalid
                              : words.legalityIncomplete}
                        </small>
                      )}
                    </>
                  ) : (
                    <span>{w.empty}</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="save-editor-note">
            {entry.slots.filter((member) => member.pokemon).length} /{" "}
            {entry.slots.length}
          </p>
          <p className="save-editor-note">{w.note}</p>
        </div>
        <div className="save-pokemon-detail">
          {selected ? (
            <>
              <div className="save-pokemon-identity">
                <img
                  src={pokemonImage(selected)}
                  alt=""
                  width={68}
                  height={56}
                />
                <h4>
                  {selected.speciesName[lang]} · {words.level} {selected.level}
                </h4>
              </div>
              <dl className="save-editor-summary">
                {[
                  [
                    words.species,
                    `#${selected.species} ${selected.speciesName[lang]}`,
                  ],
                  [words.nickname, selected.nickname],
                  [words.trainerName, selected.ot],
                  ["TID", selected.tid],
                  ["SID", selected.sid],
                  [words.level, selected.level],
                  [words.ivs, selected.ivs.join(" / ")],
                  [words.evs, selected.evs.join(" / ")],
                  [
                    words.moves,
                    selected.moves.map((move) => move[lang]).join(" / "),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <PokemonLegality
                position={{ box: -2, slot }}
                report={currentAnalysis}
                busy={busy}
                onAnalyze={() => onAnalyze(groupPosition(catalog, group, slot))}
              />
            </>
          ) : (
            <p>{words.empty}</p>
          )}
        </div>
      </div>
    </section>
  );
}
