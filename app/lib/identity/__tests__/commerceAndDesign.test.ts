import { describe, expect, it } from "vitest";
import {
  PRODUCTS,
  commerceConfigFromEnv,
  donationCopy,
  donationGateFromEnv,
  providerStatuses,
  publishedProducts,
} from "../commerce";
import { createDesignSpec, reviseDesign } from "../designSpec";
import {
  BANNED_HERO_SPELLINGS,
  ISAIAH_HERO_ID,
  ISAIAH_HERO_NAME,
  resolveHeroIdentity,
  shareTextForIdentity,
  type HeroIdentitySource,
} from "../heroIdentity";

describe("commerce truthfulness", () => {
  it("everything is not_configured with an empty environment (Canva stays owner-facing)", () => {
    const statuses = providerStatuses(commerceConfigFromEnv({}));
    for (const s of statuses) {
      expect(s.state).not.toBe("connected");
      if (s.provider !== "canva") expect(s.state).toBe("not_configured");
    }
    const canva = statuses.find((s) => s.provider === "canva")!;
    expect(canva.detail).toContain("owner-facing");
  });

  it("a configured URL is never reported as connected without verified auth", () => {
    const statuses = providerStatuses(
      commerceConfigFromEnv({ NEXT_PUBLIC_SHOPIFY_SHOP_URL: "https://shop.example.com", PRINTIFY_API_TOKEN: "x" }),
    );
    expect(statuses.find((s) => s.provider === "shopify")!.state).toBe("configured_unauthenticated");
    expect(statuses.find((s) => s.provider === "printify")!.state).toBe("configured_unauthenticated");
  });

  it("connected requires the explicit verified flag", () => {
    const statuses = providerStatuses(
      commerceConfigFromEnv({ NEXT_PUBLIC_SHOPIFY_SHOP_URL: "https://shop.example.com", SHOPIFY_AUTH_VERIFIED: "1" }),
    );
    expect(statuses.find((s) => s.provider === "shopify")!.state).toBe("connected");
  });

  it("every published physical product carries the $1 + $1 allocation", () => {
    for (const p of publishedProducts()) {
      if (p.kind === "physical") {
        expect(p.siteSupportCents).toBe(100);
        expect(p.dogDonationCents).toBe(100);
      }
    }
  });

  it("future products exist but stay unpublished", () => {
    const future = PRODUCTS.filter((p) => !p.published).map((p) => p.id);
    expect(future).toEqual(expect.arrayContaining(["hoodie", "blanket", "ornament", "sticker", "phone-case"]));
    const publishedIds = publishedProducts().map((p) => p.id);
    for (const id of future) expect(publishedIds).not.toContain(id);
  });

  it("donation copy is gated until a real organization is approved", () => {
    expect(donationCopy(donationGateFromEnv({}))).toBeNull();
    expect(donationCopy(donationGateFromEnv({ CHARITY_CLAIM_READY: "1" }))).toBeNull(); // no name, no claim
    const line = donationCopy(donationGateFromEnv({ CHARITY_CLAIM_READY: "1", CHARITY_NAME: "Example Rescue" }));
    expect(line).toContain("$1 keeps DontCloneMeTom running");
    expect(line).toContain("Example Rescue");
    expect(line!.toLowerCase()).not.toContain("tax");
  });
});

describe("design spec", () => {
  it("free designs are always watermarked with the Isaiah approval seal", () => {
    const spec = createDesignSpec({ dogRef: "anon-1", realName: "Biscuit", heroName: "Sir Biscuit", facts: [] });
    expect(spec.watermark).toBe("isaiah-approval");
    expect(spec.outputPx).toEqual({ w: 1080, h: 1350 });
    expect(spec.revisions).toHaveLength(1);
  });

  it("material changes append to the audit trail", () => {
    const spec = createDesignSpec({ dogRef: "anon-1", realName: "Biscuit", heroName: "Sir Biscuit", facts: [] });
    const revised = reviseDesign(spec, { heroName: "Captain Biscuit" }, "Hero changed");
    expect(revised.heroName).toBe("Captain Biscuit");
    expect(revised.revisions).toHaveLength(2);
    expect(revised.revisions[1].note).toBe("Hero changed");
    expect(revised.designId).toBe(spec.designId);
  });
});

describe("hero identity model", () => {
  const source: HeroIdentitySource = {
    defaultHeroId: ISAIAH_HERO_ID,
    identities: [
      { id: ISAIAH_HERO_ID, name: ISAIAH_HERO_NAME, subtitle: "The Dark Zay", kind: "curated" },
      { id: "batdog", name: "Batdog", kind: "curated" },
    ],
  };

  it("resolves the chosen identity", () => {
    expect(resolveHeroIdentity(source, "batdog").name).toBe("Batdog");
  });

  it("unknown, stale, or missing ids fall back to Bruzer Zayne", () => {
    expect(resolveHeroIdentity(source, "nope").name).toBe(ISAIAH_HERO_NAME);
    expect(resolveHeroIdentity(source, null).name).toBe(ISAIAH_HERO_NAME);
    expect(resolveHeroIdentity(source, undefined).name).toBe(ISAIAH_HERO_NAME);
  });

  it("the canonical spelling is Bruzer Zayne and the banned ones are banned", () => {
    expect(ISAIAH_HERO_NAME).toBe("Bruzer Zayne");
    expect(BANNED_HERO_SPELLINGS).toContain("bruce zayne");
    expect(BANNED_HERO_SPELLINGS).toContain("bruze zayne");
    expect(BANNED_HERO_SPELLINGS).toContain("bruiser");
    for (const banned of BANNED_HERO_SPELLINGS) {
      expect(ISAIAH_HERO_NAME.toLowerCase()).not.toContain(banned);
    }
  });

  it("share text follows the identity while the real name stays separate", () => {
    const text = shareTextForIdentity("Isaiah", source.identities[1], "Adopt nearby.");
    expect(text).toContain("Isaiah");
    expect(text).toContain("Batdog");
    expect(text).toContain("Adopt nearby.");
  });
});
