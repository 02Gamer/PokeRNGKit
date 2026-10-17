import { expect, it } from "vitest";
import { SaveExportRegistry, equalEntityBytes } from "./saveExportRegistry";
it("tracks all live editors and invalidates a confirmation when drafts or editor membership change", () => {
  const registry = new SaveExportRegistry();
  let state: string | undefined;
  const remove = registry.register(() => state);
  expect(registry.hasUnsaved()).toBe(false);
  state = "draft one";
  const captured = registry.snapshot();
  expect(registry.hasUnsaved()).toBe(true);
  state = "draft two";
  expect(registry.snapshot()).not.toBe(captured);
  const second = registry.register(() => "extra slot");
  remove();
  remove();
  expect(registry.hasUnsaved()).toBe(true);
  second();
  expect(registry.hasUnsaved()).toBe(false);
});
it("requires exact acknowledged bytes including the full file length", () => {
  const acknowledged = new Uint8Array([1, 2]);
  expect(equalEntityBytes(acknowledged, acknowledged.slice())).toBe(true);
  expect(equalEntityBytes(acknowledged, new Uint8Array([1]))).toBe(false);
  expect(equalEntityBytes(acknowledged, new Uint8Array([1, 3]))).toBe(false);
});
