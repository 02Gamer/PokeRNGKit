// SPDX-License-Identifier: GPL-3.0-or-later
import {
  Children,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useMemo,
} from "react";
import { Select } from "../shared/Select";
import { useSaveSettingsJson } from "./useSaveSettingsJson";
import { invalidSelectionColor } from "./drawSettings";
type Props = ComponentProps<typeof Select>;
type Option = {
  children?: ReactNode;
  value?: string | number;
  disabled?: boolean;
  "data-source-invalid"?: boolean;
};
function findOption(children: ReactNode, value: string): Option | undefined {
  let found: Option | undefined;
  Children.forEach(children, (child) => {
    if (found || !child || typeof child !== "object" || !("type" in child))
      return;
    const element = child as ReactElement<Option>;
    if (
      element.type === "option" &&
      String(element.props.value ?? element.props.children ?? "") === value
    )
      found = element.props;
    else if (element.type === "optgroup")
      found = findOption(element.props.children, value);
  });
  return found;
}
export function PokemonSelect({ children, ...props }: Props) {
  const json = useSaveSettingsJson();
  const color = useMemo(() => {
    try {
      return invalidSelectionColor(json);
    } catch {
      return "#e9967a";
    } // Core rejects invalid policies before edits.
  }, [json]);
  const value = props.value == null ? undefined : String(props.value);
  const option = value === undefined ? undefined : findOption(children, value);
  const invalid =
    value !== undefined &&
    (!option || option.disabled || option["data-source-invalid"]);
  return (
    <Select
      {...props}
      aria-invalid={invalid || props["aria-invalid"]}
      style={
        invalid
          ? { ...props.style, backgroundColor: color, color: "#000000" }
          : props.style
      }
    >
      {invalid && !option ? (
        <option value={value} disabled>
          #{value}
        </option>
      ) : null}
      {children}
    </Select>
  );
}
