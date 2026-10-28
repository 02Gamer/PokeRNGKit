import { useReducer, useRef, useState, type ComponentProps } from "react";
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
import {
  createSaveToolsNavigation,
  reduceSaveToolsNavigation,
} from "./saveToolsNavigation";
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
  const [{ mode, opened, settingsGroup }, navigate] = useReducer(
    reduceSaveToolsNavigation,
    undefined,
    createSaveToolsNavigation,
  );
  const [templateSource, setTemplateSource] = useState<EntityTemplateSource>();
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
          onClick={() => navigate({ type: "open", mode: "save" })}
        >
          {words.save}
        </button>
        <button
          type="button"
          aria-pressed={mode === "entity"}
          disabled={busy}
          onClick={() => navigate({ type: "open", mode: "entity" })}
        >
          {words.title}
        </button>
        <button
          type="button"
          aria-pressed={mode === "settings"}
          ref={settingsTrigger}
          disabled={busy}
          onClick={() => navigate({ type: "open", mode: "settings" })}
        >
          {settingsWords[lang].title}
        </button>
        <button
          type="button"
          aria-pressed={mode === "template"}
          disabled={busy}
          onClick={() => navigate({ type: "open", mode: "template" })}
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
            navigate({ type: "open", mode: "settings", settingsGroup: group });
            settingsTrigger.current?.focus();
          }}
        />
      </div>
      <div className="save-tools-pane" hidden={mode !== "entity"}>
        {opened.entity && <StandalonePokemonPanel />}
      </div>
      <div className="save-tools-pane" hidden={mode !== "template"}>
        {opened.template && (
          <EntityTemplateWorkspace
            lang={lang}
            active={mode === "template"}
            source={templateSource}
            onOpenSettings={() => {
              navigate({
                type: "open",
                mode: "settings",
                settingsGroup: "localResources",
              });
              settingsTrigger.current?.focus();
            }}
          />
        )}
      </div>
      {opened.settings && (
        <div
          className="save-tools-pane"
          hidden={mode !== "settings"}
          inert={!active || mode !== "settings"}
        >
          <div className="save-editor-panel save-settings-workspace">
            <SaveSettingsWorkspace
              lang={lang}
              group={settingsGroup}
              active={active && mode === "settings"}
              onGroupChange={(group) =>
                navigate({ type: "settingsGroup", group })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
