import { useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { SaveEditorPanel } from "./SaveEditorPanel";
import { StandalonePokemonPanel } from "./StandalonePokemonPanel";
import { standaloneWords } from "./standaloneWords";
import "./StandalonePokemonPanel.css";

export function SaveToolsPanel(props: ComponentProps<typeof SaveEditorPanel>) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = standaloneWords[lang];
  const [mode, setMode] = useState<"save" | "entity">("save");
  const [opened, setOpened] = useState(false);
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
          onClick={() => setMode("save")}
        >
          {words.save}
        </button>
        <button
          type="button"
          aria-pressed={mode === "entity"}
          onClick={() => {
            setOpened(true);
            setMode("entity");
          }}
        >
          {words.title}
        </button>
      </div>
      <div className="save-tools-pane" hidden={mode !== "save"}>
        <SaveEditorPanel {...props} />
      </div>
      <div className="save-tools-pane" hidden={mode !== "entity"}>
        {opened && <StandalonePokemonPanel />}
      </div>
    </div>
  );
}
