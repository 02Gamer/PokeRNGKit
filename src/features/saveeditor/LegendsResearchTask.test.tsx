import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LegendsResearchThresholds,
  LegendsResearchPoints,
} from "./LegendsResearchTask";
import { legendsDexLabels, type Dex8aTask } from "./legendsPokedex";
const task: Dex8aTask = {
  name: { zh: "研究", en: "Research", ja: "研究" },
  editable: true,
  derivedForms: false,
  thresholds: [1, 2, 3, 4, 5],
  reported: 2,
  reached: 3,
  points: 20,
  bonusPoints: 10,
  required: false,
};
it.each(["zh", "en", "ja"] as const)(
  "renders source threshold states with localized text and independent bonus in %s",
  (lang) => {
    const labels = legendsDexLabels[lang];
    const html = renderToStaticMarkup(
      <LegendsResearchThresholds task={task} current={3} lang={lang} />,
    );
    for (const state of ["reported", "pending", "unreached"] as const) {
      expect(html).toContain(`data-state="${state}"`);
      expect(html).toContain(labels.thresholdStates[state]);
    }
    const regressed = renderToStaticMarkup(
      <LegendsResearchThresholds
        task={{ ...task, reported: 3 }}
        current={1}
        lang={lang}
      />,
    );
    expect(regressed).toContain('data-state="regressed"');
    expect(regressed).toContain(labels.thresholdStates.regressed);
    const points = renderToStaticMarkup(
      <LegendsResearchPoints task={task} lang={lang} />,
    );
    expect(points).toContain(labels.bonusPoints);
    expect(points).toContain("research_bonus_points.png");
    expect(
      renderToStaticMarkup(
        <LegendsResearchPoints
          task={{ ...task, bonusPoints: 0 }}
          lang={lang}
        />,
      ),
    ).not.toContain("<img");
    expect(task.thresholds).toEqual([1, 2, 3, 4, 5]);
  },
);
