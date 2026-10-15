import { useId, useState } from "react";
import type { SaveReport } from "./domain";
import { BattleTemplateViewer } from "./BattleTemplateViewer";
import { BattleTemplateImporter } from "./BattleTemplateImporter";
import {
  battleTemplateWords,
  type BattleTemplateQuery,
  type BattleTemplateReport,
} from "./battleTemplate";
import type {
  BattleTemplateTarget,
  BattleTemplateImportActions,
} from "./battleTemplateImport";
const modes = {
  zh: ["导出文本", "导入文本"],
  en: ["Export text", "Import text"],
  ja: ["テキスト出力", "テキスト読み込み"],
} as const;
export function BattleTemplateWorkspace({
  lang,
  busy,
  revision,
  report,
  fileTarget,
  onRead,
  importActions,
  onOpenSettings,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
  revision: number;
  report?: SaveReport;
  fileTarget?: BattleTemplateTarget;
  onRead(query: BattleTemplateQuery): Promise<BattleTemplateReport | undefined>;
  importActions: BattleTemplateImportActions;
  onOpenSettings?(): void;
}) {
  const [mode, setMode] = useState<"export" | "import">("export");
  const id = useId();
  return (
    <div>
      <div
        className="save-editor-toolbar"
        role="group"
        aria-label={battleTemplateWords[lang].title}
      >
        {(["export", "import"] as const).map((value, i) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            aria-controls={id}
            disabled={busy}
            onClick={() => setMode(value)}
          >
            {modes[lang][i]}
          </button>
        ))}
      </div>
      <div id={id}>
        {mode === "export" ? (
          <BattleTemplateViewer
            key={`${revision}:${lang}`}
            lang={lang}
            busy={busy}
            report={report}
            onRead={onRead}
            onOpenSettings={onOpenSettings}
          />
        ) : (
          <BattleTemplateImporter
            key={`${revision}:${lang}`}
            lang={lang}
            busy={busy}
            report={report}
            fileTarget={fileTarget}
            actions={importActions}
          />
        )}
      </div>
    </div>
  );
}
