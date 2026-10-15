// SPDX-License-Identifier: GPL-3.0-or-later
import { pokemonOverlay } from "./art";
import { ballBrowserWords, type BallBrowserCatalog } from "./ballBrowser";
import "./PokemonBallBrowser.css";

export function PokemonBallBrowser({
  catalog,
  value,
  lang,
  disabled,
  onChoose,
}: {
  catalog: BallBrowserCatalog;
  value: number;
  lang: "zh" | "en" | "ja";
  disabled: boolean;
  onChoose(value: number): void;
}) {
  const words = ballBrowserWords[lang];
  return (
    <details>
      <summary>{words.title}</summary>
      <p className="save-editor-note">{words.note}</p>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoose(catalog.pokeBall)}
        >
          {words.poke}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoose(catalog.colorBall)}
        >
          {words.color}
        </button>
      </div>
      <div className="save-ball-browser" role="group" aria-label={words.title}>
        {catalog.choices.map((choice) => {
          const art = pokemonOverlay(`_ball${choice.id}`, "ball");
          return (
            <button
              key={choice.id}
              type="button"
              disabled={disabled}
              aria-pressed={choice.id === value}
              onClick={(event) =>
                onChoose(
                  event.altKey
                    ? catalog.pokeBall
                    : event.shiftKey
                      ? catalog.colorBall
                      : choice.storedValue,
                )
              }
            >
              {art && (
                <img
                  src={art.url}
                  width={art.width}
                  height={art.height}
                  alt=""
                  loading="lazy"
                />
              )}
              <span>{choice.name[lang]}</span>
              <span className="save-ball-check">
                {choice.legal ? words.legal : words.other}
              </span>
            </button>
          );
        })}
      </div>
    </details>
  );
}
