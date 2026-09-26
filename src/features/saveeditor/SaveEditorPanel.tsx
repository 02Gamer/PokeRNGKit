import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileUp, RotateCcw, Unplug } from "lucide-react";
import { Select } from "../shared/Select";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import { SaveEditorClient } from "./client";
import {
  exportSaveName,
  MAX_SAVE_BYTES,
  saveGameChoices,
  trainerDraft,
  validateTrainer,
  type SaveReport,
  type TrainerDraft,
} from "./domain";
import { profileLink, type SaveProfileControllers } from "./profileLink";
import "./SaveEditorPanel.css";
import { saveEditorResources, localizeSaveError } from "./locales";
import { SavePokemonBrowser } from "./SavePokemonBrowser";

export function SaveEditorPanel(
  controllers: Omit<SaveProfileControllers, "gen5">,
) {
  const { t } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const gen5 = useGen5Profiles();
  const client = useRef(new SaveEditorClient());
  const original = useRef<Uint8Array | undefined>(undefined);
  const operation = useRef(0);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [cancellable, setCancellable] = useState(false);
  const [name, setName] = useState("");
  const [report, setReport] = useState<SaveReport>();
  const [section, setSection] = useState<"pokemon" | "trainer">("pokemon");
  const [draft, setDraft] = useState<TrainerDraft>({
    ot: "",
    tid: "",
    sid: "",
    money: "",
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [version, setVersion] = useState("");
  const [target, setTarget] = useState("new");
  const [profileName, setProfileName] = useState("");
  const [reviewDefaults, setReviewDefaults] = useState(false);
  const link = report
    ? profileLink(report, version, { ...controllers, gen5 })
    : undefined;
  const choices = report ? saveGameChoices(report) : [];

  useEffect(() => {
    const instance = client.current;
    const lifecycle = operation;
    return () => {
      lifecycle.current++;
      instance.dispose();
    };
  }, []);

  const perform = async (
    action: (id: number) => Promise<void>,
    canCancel = true,
  ) => {
    if (running.current) return;
    const id = ++operation.current;
    running.current = true;
    setBusy(true);
    setCancellable(canCancel);
    setError("");
    setStatus("");
    try {
      await action(id);
    } catch (cause) {
      if (id === operation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (id === operation.current) {
        running.current = false;
        setBusy(false);
      }
    }
  };

  const openFile = (file: File) =>
    perform(async (id) => {
      if (!file.size || file.size > MAX_SAVE_BYTES)
        throw new Error("Save file must be between 1 byte and 32 MiB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (id !== operation.current) return;
      const result = await client.current.run(bytes);
      if (id !== operation.current) return;
      original.current = bytes;
      setReport(result.report);
      setDraft(trainerDraft(result.report));
      setName(file.name);
      setProfileName(`${result.report.ot} · ${result.report.version}`);
      const games = saveGameChoices(result.report);
      setVersion(games.length === 1 ? games[0] : "");
      setTarget("new");
      setReviewDefaults(false);
    });

  const exportFile = () =>
    perform(async (id) => {
      if (!report || !original.current) return;
      const edit = validateTrainer(draft, report);
      const result = await client.current.run(
        original.current,
        JSON.stringify(edit),
      );
      if (id !== operation.current) return;
      if (!result.output) throw new Error("No output was returned.");
      const blob = new Blob([new Uint8Array(result.output)], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportSaveName(name);
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus("exported");
    });

  return (
    <div className="save-editor-panel" aria-busy={busy}>
      <p>{words.intro}</p>
      <div className="save-editor-toolbar">
        <label className="save-editor-file">
          <FileUp size={18} aria-hidden="true" /> {words.open}
          <input
            type="file"
            aria-label={words.open}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void openFile(file);
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy || !report}
          onClick={() => {
            original.current = undefined;
            setReport(undefined);
            setName("");
            setError("");
            setStatus("");
            client.current.dispose();
          }}
        >
          <Unplug size={18} aria-hidden="true" /> {words.close}
        </button>
        {busy && cancellable && (
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
      <p className="save-editor-note">{words.choose}</p>
      {busy && <p role="status">{words.loading}</p>}
      {error && (
        <p role="alert" className="save-editor-error">
          {localizeSaveError(error, words)}
        </p>
      )}
      {status && <p role="status">{words[status as "exported" | "linked"]}</p>}
      {report && (
        <>
          <h3>{name}</h3>
          {!report.checksumsValid && (
            <p role="alert" className="save-editor-error">
              {words.invalid}
            </p>
          )}
          <div
            className="save-editor-toolbar"
            role="group"
            aria-label={words.title}
          >
            <button
              type="button"
              aria-pressed={section === "pokemon"}
              onClick={() => setSection("pokemon")}
            >
              {words.pokemon}
            </button>
            <button
              type="button"
              aria-pressed={section === "trainer"}
              onClick={() => setSection("trainer")}
            >
              {words.trainer}
            </button>
          </div>
          {section === "pokemon" ? (
            <SavePokemonBrowser key={name} report={report} />
          ) : (
            <>
              <dl className="save-editor-summary">
                <div>
                  <dt>{t("game")}</dt>
                  <dd>
                    {choices
                      .map(
                        (game) =>
                          words.games[game as keyof typeof words.games] ?? game,
                      )
                      .join(" / ") || report.version}{" "}
                    · {words.generation} {report.generation}
                  </dd>
                </div>
                <div>
                  <dt>{words.checksums}</dt>
                  <dd>{report.checksumsValid ? words.valid : words.invalid}</dd>
                </div>
                <div>
                  <dt>{words.displayIds}</dt>
                  <dd>
                    {report.displayTid} / {report.displaySid}
                  </dd>
                </div>
                <div>
                  <dt>{words.playTime}</dt>
                  <dd>{report.playTime}</dd>
                </div>
                <div>
                  <dt>{words.partyBoxes}</dt>
                  <dd>
                    {report.partyCount} / {report.boxCount}
                  </dd>
                </div>
              </dl>
              {report.checksumsValid && !report.canEdit && (
                <p>{words.readonly}</p>
              )}
              <fieldset
                disabled={busy || !report.canEdit}
                className="save-editor-fields"
              >
                <legend>{words.trainer}</legend>
                <label className="field">
                  <span>{words.trainerName}</span>
                  <input
                    value={draft.ot}
                    maxLength={report.maxNameLength}
                    onChange={(e) => setDraft({ ...draft, ot: e.target.value })}
                  />
                </label>
                {(
                  [
                    ["tid", words.tid, 65535],
                    ["sid", words.sid, 65535],
                    ["money", words.money, report.maxMoney],
                  ] as const
                ).map(([key, label, max]) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <input
                      inputMode="numeric"
                      value={draft[key]}
                      maxLength={String(max).length}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </fieldset>
              <p className="save-editor-note">{words.ids}</p>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={busy || !report.canEdit}
                  onClick={() => {
                    setDraft(trainerDraft(report));
                    setError("");
                  }}
                >
                  <RotateCcw size={18} aria-hidden="true" /> {words.reset}
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={busy || !report.canEdit}
                  onClick={() => void exportFile()}
                >
                  <Download size={18} aria-hidden="true" /> {words.export}
                </button>
              </div>
              <section
                className="save-editor-profile"
                aria-label={t("profile")}
              >
                <h3>{t("profile")}</h3>
                <p className="save-editor-note">{words.link}</p>
                {choices.length === 0 ? (
                  <p>{words.unsupported}</p>
                ) : (
                  <>
                    {choices.length > 1 && <p>{words.ambiguous}</p>}
                    <div className="save-editor-fields">
                      <label className="field">
                        <span>{t("game")}</span>
                        <Select
                          value={version}
                          disabled={busy}
                          onChange={(e) => {
                            setVersion(e.target.value);
                            setTarget("new");
                          }}
                        >
                          <option value="">—</option>
                          {choices.map((game) => (
                            <option
                              key={
                                words.games[game as keyof typeof words.games] ??
                                game
                              }
                              value={
                                words.games[game as keyof typeof words.games] ??
                                game
                              }
                            >
                              {words.games[game as keyof typeof words.games] ??
                                game}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <label className="field">
                        <span>{t("profile")}</span>
                        <Select
                          value={target}
                          disabled={busy || !link || link.loading}
                          onChange={(e) => setTarget(e.target.value)}
                        >
                          <option value="new">{t("newProfile")}</option>
                          {link?.profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.name}
                            </option>
                          ))}
                        </Select>
                      </label>
                      {target === "new" && (
                        <label className="field">
                          <span>{words.profileName}</span>
                          <input
                            value={profileName}
                            disabled={busy}
                            onChange={(e) => setProfileName(e.target.value)}
                          />
                        </label>
                      )}
                    </div>
                    {target === "new" && (
                      <>
                        <p className="save-editor-note">{words.defaults}</p>
                        <label className="save-editor-review">
                          <input
                            type="checkbox"
                            checked={reviewDefaults}
                            disabled={busy}
                            onChange={(e) =>
                              setReviewDefaults(e.target.checked)
                            }
                          />
                          {words.acknowledge}
                        </label>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={
                        busy ||
                        !link ||
                        link.loading ||
                        (target === "new" &&
                          (!reviewDefaults || !profileName.trim()))
                      }
                      onClick={() =>
                        void perform(async (id) => {
                          await link!.save(target, profileName);
                          if (id === operation.current) setStatus("linked");
                        }, false)
                      }
                    >
                      {words.apply}
                    </button>
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}
      <p className="save-editor-note">
        <a
          href="https://github.com/kwsch/PKHeX"
          target="_blank"
          rel="noreferrer"
        >
          PKHeX
        </a>{" "}
        · GPL-3.0-or-later
      </p>
    </div>
  );
}
