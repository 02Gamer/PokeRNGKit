// SPDX-License-Identifier: GPL-3.0-or-later
import { researchBonusImage } from "./art";
import {
  dex8aThresholdState,
  legendsDexLabels,
  type Dex8aTask,
} from "./legendsPokedex";
import "./LegendsResearchTask.css";
export function LegendsResearchThresholds({
  task,
  current,
  lang,
}: {
  task: Dex8aTask;
  current: number;
  lang: "zh" | "en" | "ja";
}) {
  const labels = legendsDexLabels[lang].thresholdStates;
  return (
    <ul className="save-la-thresholds">
      {task.thresholds.map((threshold, index) => {
        const state = dex8aThresholdState(
          current,
          threshold,
          index,
          task.reported,
        );
        return (
          <li key={index} data-state={state}>
            <span>{threshold}</span>
            <span>{labels[state]}</span>
          </li>
        );
      })}
    </ul>
  );
}
export function LegendsResearchPoints({
  task,
  lang,
}: {
  task: Dex8aTask;
  lang: "zh" | "en" | "ja";
}) {
  const w = legendsDexLabels[lang];
  return (
    <div className="save-la-points">
      <span>{task.points}</span>
      {task.bonusPoints !== 0 && (
        <span>
          <img src={researchBonusImage()} alt="" />
          {w.bonusPoints}: {task.bonusPoints}
        </span>
      )}
    </div>
  );
}
