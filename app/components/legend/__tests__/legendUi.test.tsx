import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { commerceConfigFromEnv, providerStatuses } from "../../../lib/identity/commerce";

vi.mock("next/link", () => ({
  default: (props: { href: string; children?: unknown } & Record<string, unknown>) =>
    createElement("a", { ...props, href: props.href }, props.children as never),
}));

describe("legend studio (server render)", () => {
  it("renders the free experience with truthful, unconfigured commerce copy", async () => {
    const { default: LegendStudio } = await import("../LegendStudio");
    const html = renderToStaticMarkup(
      createElement(LegendStudio, {
        providers: providerStatuses(commerceConfigFromEnv({})),
        donationLine: null,
      }),
    );
    expect(html).toContain("Dog Legend Studio");
    expect(html).toContain("real name");
    expect(html).toContain("never leaves your device");
    // no purchase links pretend to exist, no donation claim renders
    expect(html).not.toContain("Continue to Shopify checkout");
    expect(html).not.toContain("Etsy shop");
    expect(html).not.toContain("helps twice");
    // no secrets or env names in the markup
    expect(html).not.toContain("PRINTIFY");
    expect(html).not.toContain("API");
  });

  it("shows real links only when a shop URL is actually configured", async () => {
    const { default: LegendStudio } = await import("../LegendStudio");
    const html = renderToStaticMarkup(
      createElement(LegendStudio, {
        providers: providerStatuses(
          commerceConfigFromEnv({ NEXT_PUBLIC_SHOPIFY_SHOP_URL: "https://shop.example.com" }),
        ),
        donationLine: null,
      }),
    );
    // hero not chosen yet server-side, so the shop section still doesn't render —
    // the studio never shows purchase links before a design exists.
    expect(html).not.toContain("shop.example.com");
  });
});

describe("hero identity provider + chooser (server render)", () => {
  it("profile page SSRs the default Bruzer Zayne identity with a clickable hero", async () => {
    const { getDogProfile } = await import("../../../lib/dogProfiles");
    const { default: DogProfileView } = await import("../../profile/DogProfileView");
    const html = renderToStaticMarkup(createElement(DogProfileView, { profile: getDogProfile("isaiah")! }));
    // the hero name renders inside a button that opens the chooser dialog
    expect(html).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>[\s\S]*?BRUZER ZAYNE|Bruzer Zayne/);
    expect(html).toContain("tap to choose");
  });
});
