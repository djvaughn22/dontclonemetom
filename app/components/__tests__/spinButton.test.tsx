import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SpinButton from "../SpinButton";

describe("SpinButton — shared Home + dog-page spin control", () => {
  it("shows the 🔀 Spin another dog label with a real accessible label", () => {
    const html = renderToStaticMarkup(createElement(SpinButton, { onSpin: () => {}, spinning: false }));
    expect(html).toContain("🔀");
    expect(html).toContain("Spin another dog");
    expect(html).toContain('aria-label="Spin another dog"');
    expect(html).toContain('type="button"');
  });

  it("disables itself and announces busy state while spinning, to block rapid repeat clicks", () => {
    const html = renderToStaticMarkup(createElement(SpinButton, { onSpin: () => {}, spinning: true }));
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('aria-label="Spin another dog"');
  });

  it("carries a visible focus treatment for keyboard users", () => {
    const html = renderToStaticMarkup(createElement(SpinButton, { onSpin: () => {}, spinning: false }));
    expect(html).toContain("focus-visible:outline");
  });
});
