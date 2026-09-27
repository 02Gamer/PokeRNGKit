import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { PokemonEditor, type PokemonEdit } from "./PokemonEditor";
import { StandalonePokemonClient } from "./standaloneClient";
import {
  MAX_ENTITY_BYTES,
  type StandalonePokemonReport,
  type StandalonePokemonSnapshot,
  type StandalonePokemonRequest,
  type StandaloneAdvancedData,
} from "./standalonePokemon";
import { standaloneWords } from "./standaloneWords";
import { saveEditorResources } from "./locales";
import { pokemonImage } from "./art";
import { PokemonLegality } from "./PokemonLegality";
import type { PokemonLegalityReport, PokemonRawEdit } from "./domain";
import { PokemonRawEditor } from "./PokemonRawEditor";
import { PokemonShinyEditor } from "./PokemonShinyEditor";
import { PokemonTrainingEditor } from "./PokemonTrainingEditor";
import { PokemonEncounterEditor } from "./PokemonEncounterEditor";
import { PokemonFormArgumentEditor } from "./PokemonFormArgumentEditor";
import { PokemonRibbonEditor } from "./PokemonRibbonEditor";
import { PokemonMemoryEditor } from "./PokemonMemoryEditor";
import { PokemonHistoryEditor } from "./PokemonHistoryEditor";
import { PokemonRelearnEditor } from "./PokemonRelearnEditor";
import { PokemonCareEditor } from "./PokemonCareEditor";

function download(bytes: Uint8Array<ArrayBuffer>, name: string) {
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/octet-stream" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function StandalonePokemonPanel() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = standaloneWords[lang],
    common = saveEditorResources[lang];
  const client = useRef(new StandalonePokemonClient());
  const original = useRef<StandalonePokemonSnapshot | undefined>(undefined);
  const [working, setWorking] = useState<StandalonePokemonSnapshot>();
  const [history, setHistory] = useState<StandalonePokemonSnapshot[]>([]);
  const [report, setReport] = useState<StandalonePokemonReport>();
  const [legality, setLegality] = useState<PokemonLegalityReport>();
  const [revision, setRevision] = useState(0);
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false),
    operation = useRef(0);
  const [inputEncrypted, setInputEncrypted] = useState(false);
  const [party, setParty] = useState(false),
    [encrypted, setEncrypted] = useState(false);
  const [error, setError] = useState<
    "failed" | "timeout" | "size" | "runtime"
  >();
  const [status, setStatus] = useState<"applied" | "restored">();
  const dispose = useCallback(() => {
    operation.current++;
    client.current.dispose();
  }, []);
  useEffect(() => dispose, [dispose]);
  async function perform<T>(
    action: (id: number) => Promise<T>,
  ): Promise<T | undefined> {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(undefined);
    setStatus(undefined);
    const id = ++operation.current;
    try {
      return await action(id);
    } catch (cause) {
      if (id === operation.current)
        setError(
          cause instanceof Error && /API version mismatch/.test(cause.message)
            ? "runtime"
            : cause instanceof Error && /timed out/.test(cause.message)
              ? "timeout"
              : cause instanceof Error && cause.message === "size"
                ? "size"
                : "failed",
        );
    } finally {
      if (id === operation.current) {
        running.current = false;
        setBusy(false);
      }
    }
  }
  const open = (file: File) =>
    perform(async (id) => {
      if (!file.size || file.size > MAX_ENTITY_BYTES) throw new Error("size");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (id !== operation.current) return;
      const snapshot = { bytes, fileName: file.name, inputEncrypted };
      const result = await client.current.run(bytes, {
        fileName: file.name,
        inputEncrypted,
      });
      if (id !== operation.current) return;
      original.current = snapshot;
      setLegality(undefined);
      setChanged(false);
      setWorking(snapshot);
      setHistory([]);
      setReport(result.entity);
      setParty(result.entity.party);
      setEncrypted(false);
      setRevision((value) => value + 1);
    });
  const applyRequest = (
    change: Pick<StandalonePokemonRequest, "edit" | "raw">,
    kind: "entityEdit" | "entityRaw",
  ) =>
    perform(async (id) => {
      if (!working) return;
      const result = await client.current.run(
        working.bytes,
        {
          fileName: working.fileName,
          inputEncrypted: working.inputEncrypted,
          ...change,
        },
        kind,
      );
      if (id !== operation.current) return;
      if (!result.output) throw new Error("Missing edited file");
      setHistory((previous) => [...previous, working].slice(-20));
      setWorking({ ...working, bytes: result.output, inputEncrypted: false });
      setLegality(undefined);
      setChanged(true);
      setReport(result.entity);
      setRevision((value) => value + 1);
      setStatus("applied");
    });
  const apply = (edit: PokemonEdit) => applyRequest({ edit }, "entityEdit");
  const applyRaw = (raw: PokemonRawEdit) => applyRequest({ raw }, "entityRaw");
  const readDetails = <K extends keyof StandaloneAdvancedData>(
    readKind: K,
    handler?: number,
    memory?: number,
  ): Promise<NonNullable<StandaloneAdvancedData[K]> | undefined> =>
    perform(async (id) => {
      if (!working) return;
      const result = await client.current.run(
        working.bytes,
        {
          fileName: working.fileName,
          inputEncrypted: working.inputEncrypted,
          readKind,
          handler,
          memory,
        },
        "entityDetails",
      );
      if (id !== operation.current) return;
      return result.details?.[readKind] ?? undefined;
    });
  const restore = (reset: boolean) =>
    perform(async (id) => {
      const snapshot = reset ? original.current : history.at(-1);
      if (!snapshot) return;
      const result = await client.current.run(snapshot.bytes, {
        fileName: snapshot.fileName,
        inputEncrypted: snapshot.inputEncrypted,
      });
      if (id !== operation.current) return;
      setWorking(snapshot);
      setReport(result.entity);
      setChanged(snapshot !== original.current);
      setLegality(undefined);
      setHistory((previous) => (reset ? [] : previous.slice(0, -1)));
      setRevision((value) => value + 1);
      setStatus("restored");
    });
  const analyze = () =>
    perform(async (id) => {
      if (!working) return;
      setLegality(undefined);
      const result = await client.current.run(
        working.bytes,
        { fileName: working.fileName, inputEncrypted: working.inputEncrypted },
        "entityLegality",
      );
      if (id !== operation.current) return;
      if (!result.legality) throw new Error("Missing legality report");
      setLegality(result.legality);
    });
  const exportFile = () =>
    perform(async (id) => {
      if (!working || !report) return;
      const result = await client.current.run(
        working.bytes,
        {
          fileName: working.fileName,
          inputEncrypted: working.inputEncrypted,
          party,
          encrypted,
        },
        "entityExport",
      );
      if (id !== operation.current) return;
      if (!result.entityFile) throw new Error("Missing exported file");
      const stem = working.fileName.replace(/\.[^.]*$/, "");
      download(
        result.entityFile,
        `${stem}-edited${encrypted ? "-encrypted" : ""}.${report.extension.replace(/^\./, "")}`,
      );
    });
  return (
    <div className="save-editor-panel" aria-busy={busy}>
      <p>{words.intro}</p>
      <div className="save-editor-fields">
        <label className="field">
          <span>{words.inputLayout}</span>
          <Select
            disabled={busy}
            value={inputEncrypted ? "raw" : "normal"}
            onChange={(event) =>
              setInputEncrypted(event.target.value === "raw")
            }
          >
            <option value="normal">{words.normal}</option>
            <option value="raw">{words.rawBk4}</option>
          </Select>
        </label>
        <p className="save-editor-note">{words.inputNote}</p>
      </div>
      <div className="save-editor-toolbar">
        <label className="save-editor-file">
          {words.open}
          <input
            type="file"
            aria-label={words.open}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void open(file);
            }}
          />
        </label>
        {working && (
          <>
            <button
              type="button"
              disabled={busy || !history.length}
              onClick={() => void restore(false)}
            >
              {common.undo}
            </button>
            <button
              type="button"
              disabled={busy || !changed}
              onClick={() => void restore(true)}
            >
              {words.restore}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const source = original.current;
                if (source) download(source.bytes, source.fileName);
              }}
            >
              {words.original}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                original.current = undefined;
                setLegality(undefined);
                setChanged(false);
                setWorking(undefined);
                setReport(undefined);
                setHistory([]);
                setError(undefined);
                setStatus(undefined);
                client.current.dispose();
              }}
            >
              {common.close}
            </button>
          </>
        )}
        {busy && (
          <button
            type="button"
            onClick={() => {
              operation.current++;
              client.current.dispose();
              running.current = false;
              setBusy(false);
            }}
          >
            {t("cancel")}
          </button>
        )}
      </div>
      {busy && <p role="status">{common.loading}</p>}
      {error && (
        <p className="save-editor-error" role="alert">
          {words[error]}
        </p>
      )}
      {status && <p role="status">{words[status]}</p>}
      {report && working && (
        <>
          <div className="save-pokemon-identity">
            <img
              src={pokemonImage(report.pokemon)}
              alt=""
              width={68}
              height={56}
            />
            <h3>{report.pokemon.speciesName[lang]}</h3>
          </div>
          <p className="save-editor-note">
            {working.fileName} · {report.format} ·{" "}
            {report.party ? words.party : words.stored}
          </p>
          <dl className="save-editor-summary">
            {[
              [common.nickname, report.pokemon.nickname || "—"],
              [common.level, report.pokemon.level],
              [common.trainerName, report.pokemon.ot || "—"],
              ["TID / SID", `${report.pokemon.tid} / ${report.pokemon.sid}`],
              [common.nature, report.pokemon.nature[lang]],
              [common.ability, report.pokemon.ability[lang]],
              [
                common.gender,
                [common.male, common.female, common.genderless][
                  report.pokemon.gender
                ] ?? "—",
              ],
              [common.shiny, report.pokemon.shiny ? common.yes : common.no],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h3>{common.moves}</h3>
          <ul className="save-pokemon-moves">
            {report.pokemon.moves.map((move, index) => (
              <li key={index}>
                {move[lang]} · PP {report.pokemon.movePp[index]}
              </li>
            ))}
          </ul>
          <div className="save-pokemon-stats">
            <table>
              <thead>
                <tr>
                  <th scope="col">{common.pokemon}</th>
                  {[
                    common.hp,
                    common.attack,
                    common.defense,
                    common.spAttack,
                    common.spDefense,
                    common.speed,
                  ].map((stat) => (
                    <th scope="col" key={stat}>
                      {stat}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{common.ivs}</th>
                  {report.pokemon.ivs.map((value, index) => (
                    <td key={index}>{value}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{common.evs}</th>
                  {report.pokemon.evs.map((value, index) => (
                    <td key={index}>{value}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <PokemonLegality
            position={report.pokemon}
            report={legality}
            busy={busy}
            onAnalyze={analyze}
          />
          <p className="save-editor-note">{words.legalityContext}</p>
          {report.canEdit ? (
            <>
              <div className="save-editor-fields">
                <label className="field">
                  <span>{words.layout}</span>
                  <Select
                    disabled={busy}
                    value={party ? "party" : "stored"}
                    onChange={(event) =>
                      setParty(event.target.value === "party")
                    }
                  >
                    <option value="stored">{words.stored}</option>
                    <option value="party">{words.party}</option>
                  </Select>
                </label>
                <label className="field">
                  <span>{words.encoding}</span>
                  <Select
                    disabled={busy}
                    value={encrypted ? "encrypted" : "plain"}
                    onChange={(event) =>
                      setEncrypted(event.target.value === "encrypted")
                    }
                  >
                    <option value="plain">{words.plain}</option>
                    <option value="encrypted">{words.encrypted}</option>
                  </Select>
                </label>
              </div>
              <div className="save-editor-toolbar">
                <button
                  className="primary"
                  type="button"
                  disabled={busy}
                  onClick={() => void exportFile()}
                >
                  {words.export}
                </button>
              </div>
              <p className="save-editor-note">{words.history}</p>
              <PokemonEditor
                key={revision}
                pokemon={report.pokemon}
                moveChoices={report.moveChoices}
                attributeChoices={report.attributeChoices}
                disabled={busy}
                onApply={apply}
              />
              <PokemonTrainingEditor
                key={`training-${revision}`}
                training={report.pokemon.training}
                generation={report.generation}
                position={report.pokemon}
                disabled={busy}
                onApply={applyRaw}
              />
              <PokemonEncounterEditor
                key={`encounter-${revision}`}
                encounter={report.pokemon.encounter}
                position={report.pokemon}
                disabled={busy}
                onApply={applyRaw}
              />
              {report.canMemories && (
                <PokemonMemoryEditor
                  key={`memory-${revision}`}
                  position={report.pokemon}
                  disabled={busy}
                  readDisabled={busy}
                  onRead={(query) =>
                    readDetails("memory", query.handler, query.memory)
                  }
                  onApply={applyRaw}
                />
              )}
              {!report.canMemories && report.care.length > 0 && (
                <PokemonCareEditor
                  key={`care-${revision}`}
                  fields={report.care}
                  isEgg={report.pokemon.egg}
                  position={report.pokemon}
                  disabled={busy}
                  onApply={applyRaw}
                />
              )}
              {report.generation >= 6 && (
                <PokemonHistoryEditor
                  key={`history-${revision}`}
                  position={report.pokemon}
                  disabled={busy}
                  readDisabled={busy}
                  onRead={() => readDetails("history")}
                  onApply={applyRaw}
                />
              )}
              <PokemonRibbonEditor
                key={`ribbons-${revision}`}
                position={report.pokemon}
                generation={report.generation}
                disabled={busy}
                readDisabled={busy}
                onRead={() => readDetails("ribbons")}
                onApply={applyRaw}
              />
              <PokemonRelearnEditor
                key={`relearn-${revision}`}
                position={report.pokemon}
                moves={report.pokemon.relearnMoves}
                choices={report.moveChoices}
                disabled={busy}
                onSuggest={() => readDetails("relearn")}
                onApply={applyRaw}
              />
              <PokemonShinyEditor
                key={`shiny-${revision}`}
                position={report.pokemon}
                disabled={busy}
                onApply={applyRaw}
              />
              <PokemonRawEditor
                key={`raw-${revision}`}
                pokemon={report.pokemon}
                disabled={busy}
                onApply={applyRaw}
              />
              {report.pokemon.formArgument && (
                <PokemonFormArgumentEditor
                  key={`form-${revision}`}
                  argument={report.pokemon.formArgument}
                  position={report.pokemon}
                  disabled={busy}
                  onApply={applyRaw}
                />
              )}
            </>
          ) : (
            <p className="save-editor-note">{words.readonly}</p>
          )}
        </>
      )}
    </div>
  );
}
