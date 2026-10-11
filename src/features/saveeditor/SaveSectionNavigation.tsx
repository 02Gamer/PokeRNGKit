import { Select } from "../shared/Select";
import {
  groupSaveSections,
  saveWorkspaceWords,
  type SaveSection,
  type SaveSectionItem,
} from "./saveWorkspace";
import "./SaveWorkspace.css";

export function SaveSectionNavigation({
  items,
  selected,
  busy,
  lang,
  onSelect,
}: {
  items: readonly SaveSectionItem[];
  selected: SaveSection;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onSelect(section: SaveSection): void;
}) {
  const words = saveWorkspaceWords[lang];
  const groups = groupSaveSections(items);
  return (
    <nav className="save-section-navigation" aria-label={words.navigation}>
      <label className="field save-section-mobile">
        <span>{words.navigation}</span>
        <Select
          aria-controls="save-section-content"
          value={selected}
          disabled={busy}
          onChange={(event) => {
            const item = items.find(
              (entry) => entry.available && entry.id === event.target.value,
            );
            if (item) onSelect(item.id);
          }}
        >
          {groups.map((group) => (
            <optgroup key={group.id} label={words[group.id]}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </label>
      <div className="save-section-desktop">
        {groups.map((group) => (
          <section key={group.id} aria-label={words[group.id]}>
            <h3>{words[group.id]}</h3>
            <div className="save-editor-toolbar">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-controls="save-section-content"
                  aria-current={selected === item.id ? "page" : undefined}
                  disabled={busy}
                  onClick={() => onSelect(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </nav>
  );
}
