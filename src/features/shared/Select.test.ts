import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

describe("Select option labels", () => {
  it("shows a numeric zero instead of an empty selected option", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Select,
        { value: 0 },
        createElement("option", { value: 0 }, 0),
        createElement("option", { value: 1 }, 1),
      ),
    );
    expect(markup).toContain("<span>0</span>");
  });

  it("preserves the number in a mixed den number and location label", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Select,
        { value: "den-2" },
        createElement(
          "optgroup",
          { label: "Wild Area" },
          createElement(
            "option",
            { value: "den-1" },
            1,
            ": ",
            "Rolling Fields",
          ),
          createElement(
            "option",
            { value: "den-2" },
            2,
            ": ",
            "Rolling Fields",
          ),
        ),
      ),
    );
    expect(markup).toContain("<span>2: Rolling Fields</span>");
  });
});
