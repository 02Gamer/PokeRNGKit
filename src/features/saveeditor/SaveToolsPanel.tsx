import { useRef, useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { SaveEditorPanel } from "./SaveEditorPanel";
import { EntityTemplateWorkspace } from "./EntityTemplateWorkspace";
import {
  entityTemplateWords,
  type EntityTemplateSource,
} from "./entityTemplate";
import { StandalonePokemonPanel } from "./StandalonePokemonPanel";
import { standaloneWords } from "./standaloneWords";
import { SaveSettingsWorkspace } from "./SaveSettingsWorkspace";
import { settingsWords } from "./settingsLabels";
import { useSaveClientBusy } from "./useSaveClientBusy";
import "./StandalonePokemonPanel.css";

export function SaveToolsPanel({
  active = true,
  ...props
}: ComponentProps<typeof SaveEditorPanel> & { active?: boolean }) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = standaloneWords[lang];
  const busy = useSaveClientBusy();
  const [mode, setMode] = useState<"save" | "entity" | "template" | "settings">(
    "save",
  );
  const [templateOpened, setTemplateOpened] = useState(false);
  const [templateSource, setTemplateSource] = useState<EntityTemplateSource>();
  const [opened, setOpened] = useState(false);
  const [settingsGroup, setSettingsGroup] = useState("legality");
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  return (
    <div className="save-tools-workspace">
      <div
        className="save-editor-toolbar save-tools-modes"
        role="group"
        aria-label={words.title}
      >
        <button
          type="button"
          aria-pressed={mode === "save"}
          disabled={busy}
          onClick={() => setMode("save")}
        >
          {words.save}
        </button>
        <button
          type="button"
          aria-pressed={mode === "entity"}
          disabled={busy}
          onClick={() => {
            setOpened(true);
            setMode("entity");
          }}
        >
          {words.title}
        </button>
        <button
          type="button"
          aria-pressed={mode === "settings"}
          ref={settingsTrigger}
          disabled={busy}
          onClick={() => setMode("settings")}
        >
          {settingsWords[lang].title}
        </button>
        <button
          type="button"
          aria-pressed={mode === "template"}
          disabled={busy}
          onClick={() => {
            setTemplateOpened(true);
            setMode("template");
          }}
        >
          {entityTemplateWords[lang].title}
        </button>
      </div>
      <div className="save-tools-pane" hidden={mode !== "save"}>
        <SaveEditorPanel
          {...props}
          startupActive={active}
          onTemplateSource={setTemplateSource}
          onOpenSettings={(group) => {
            setSettingsGroup(group);
            setMode("settings");
            settingsTrigger.current?.focus();
          }}
        />
      </div>
      <div className="save-tools-pane" hidden={mode !== "entity"}>
        {opened && <StandalonePokemonPanel />}
      </div>
      <div className="save-tools-pane" hidden={mode !== "template"}>
        {templateOpened && (
          <EntityTemplateWorkspace
            lang={lang}
            active={mode === "template"}
            source={templateSource}
            onOpenSettings={() => {
              setSettingsGroup("localResources");
              setMode("settings");
              settingsTrigger.current?.focus();
            }}
          />
        )}
      </div>
      {mode === "settings" && (
        <div className="save-tools-pane">
          <div className="save-editor-panel save-settings-workspace">
            <SaveSettingsWorkspace lang={lang} group={settingsGroup} />
          </div>
        </div>
      )}
    </div>
  );
}
