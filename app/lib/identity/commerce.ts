// Commerce boundary — configuration and adapter seams only.
//
// DontCloneMeTom owns the identity experience and the free preview.
// Shopify is the intended cart/checkout/customer system, Etsy an additional
// discovery channel, Printify the initial print-on-demand fulfiller, and
// Canva an OWNER-FACING design workbench only (customers never design in
// Canva). None of that is connected yet — and this module never pretends
// otherwise: states are derived from configuration that actually exists.
//
// Secrets NEVER live here, in the client bundle, in source control, or in
// docs. Public config is limited to plain shop URLs (NEXT_PUBLIC_*), which
// are not secrets.

export type CommerceProvider = "shopify" | "etsy" | "printify" | "canva";

export type ConnectionState =
  | "not_configured"
  | "configured_unauthenticated"
  | "connected"
  | "connection_error"
  | "manual_review_required";

export type ProviderStatus = {
  provider: CommerceProvider;
  state: ConnectionState;
  /** truthful, human-readable — shown on the owner review page */
  detail: string;
  /** public link target when one is safely configured */
  publicUrl?: string;
};

export type CommerceConfig = {
  /** e.g. https://shop.dontclonemetom.com — public, not a secret */
  shopifyShopUrl?: string;
  /** e.g. https://www.etsy.com/shop/... — public, not a secret */
  etsyShopUrl?: string;
  /** presence flags only — the tokens themselves stay server-side */
  printifyTokenPresent?: boolean;
  /** authenticated-and-verified flags; only a real completed auth sets these */
  shopifyAuthVerified?: boolean;
  etsyAuthVerified?: boolean;
  printifyAuthVerified?: boolean;
};

const isHttps = (u?: string) => !!u && /^https:\/\/[^\s]+$/.test(u);

export function providerStatuses(cfg: CommerceConfig): ProviderStatus[] {
  const shopify: ProviderStatus = !isHttps(cfg.shopifyShopUrl)
    ? { provider: "shopify", state: "not_configured", detail: "No Shopify shop URL configured. Checkout stays offline." }
    : cfg.shopifyAuthVerified
      ? { provider: "shopify", state: "connected", detail: "Shopify shop URL configured and authentication verified.", publicUrl: cfg.shopifyShopUrl }
      : { provider: "shopify", state: "configured_unauthenticated", detail: "Shop URL configured; no verified authentication yet. Links may show, checkout is Shopify's.", publicUrl: cfg.shopifyShopUrl };

  const etsy: ProviderStatus = !isHttps(cfg.etsyShopUrl)
    ? { provider: "etsy", state: "not_configured", detail: "No Etsy shop URL configured." }
    : cfg.etsyAuthVerified
      ? { provider: "etsy", state: "connected", detail: "Etsy shop URL configured and authentication verified.", publicUrl: cfg.etsyShopUrl }
      : { provider: "etsy", state: "configured_unauthenticated", detail: "Etsy shop URL configured; no verified authentication yet.", publicUrl: cfg.etsyShopUrl };

  const printify: ProviderStatus = !cfg.printifyTokenPresent
    ? { provider: "printify", state: "not_configured", detail: "No Printify credentials on the server. Fulfillment stays offline." }
    : cfg.printifyAuthVerified
      ? { provider: "printify", state: "connected", detail: "Printify credentials present and verified." }
      : { provider: "printify", state: "configured_unauthenticated", detail: "Printify credentials present but not yet verified against the API." };

  const canva: ProviderStatus = {
    provider: "canva",
    state: "manual_review_required",
    detail: "Canva is an owner-facing design workbench only. Customers never design in Canva; the owner may use it to prepare marketing assets.",
  };

  return [shopify, etsy, printify, canva];
}

/** Read public/server env into a truthful config. Call server-side. */
export function commerceConfigFromEnv(env: Record<string, string | undefined>): CommerceConfig {
  return {
    shopifyShopUrl: env.NEXT_PUBLIC_SHOPIFY_SHOP_URL?.trim() || undefined,
    etsyShopUrl: env.NEXT_PUBLIC_ETSY_SHOP_URL?.trim() || undefined,
    printifyTokenPresent: !!env.PRINTIFY_API_TOKEN?.trim(),
    // Auth-verified flags are only ever set after a real, completed,
    // human-verified authentication — never inferred from a URL or token.
    shopifyAuthVerified: env.SHOPIFY_AUTH_VERIFIED === "1",
    etsyAuthVerified: env.ETSY_AUTH_VERIFIED === "1",
    printifyAuthVerified: env.PRINTIFY_AUTH_VERIFIED === "1",
  };
}

// ── products ────────────────────────────────────────────────────────────────

export type ProductId =
  | "poster-print"
  | "poster-digital"
  | "mug"
  | "tee"
  | "tote"
  // prepared for later — never published until real:
  | "hoodie"
  | "blanket"
  | "ornament"
  | "sticker"
  | "phone-case";

export type ProductConfig = {
  id: ProductId;
  label: string;
  kind: "physical" | "digital";
  published: boolean;
  /** included in the price of eligible physical items — not customer fees */
  siteSupportCents: number;
  dogDonationCents: number;
};

/** One approved design maps onto every published product. */
export const PRODUCTS: ProductConfig[] = [
  { id: "poster-print", label: "Printed poster + digital copy", kind: "physical", published: true, siteSupportCents: 100, dogDonationCents: 100 },
  { id: "poster-digital", label: "High-resolution digital poster (no watermark)", kind: "digital", published: true, siteSupportCents: 0, dogDonationCents: 0 },
  { id: "mug", label: "Mug", kind: "physical", published: true, siteSupportCents: 100, dogDonationCents: 100 },
  { id: "tee", label: "T-shirt", kind: "physical", published: true, siteSupportCents: 100, dogDonationCents: 100 },
  { id: "tote", label: "Tote bag", kind: "physical", published: true, siteSupportCents: 100, dogDonationCents: 100 },
  // Prepared but NOT published yet:
  { id: "hoodie", label: "Hoodie", kind: "physical", published: false, siteSupportCents: 100, dogDonationCents: 100 },
  { id: "blanket", label: "Blanket", kind: "physical", published: false, siteSupportCents: 100, dogDonationCents: 100 },
  { id: "ornament", label: "Ornament", kind: "physical", published: false, siteSupportCents: 100, dogDonationCents: 100 },
  { id: "sticker", label: "Sticker", kind: "physical", published: false, siteSupportCents: 100, dogDonationCents: 100 },
  { id: "phone-case", label: "Phone case", kind: "physical", published: false, siteSupportCents: 100, dogDonationCents: 100 },
];

export const publishedProducts = () => PRODUCTS.filter((p) => p.published);

// ── donation / charity claim gate ───────────────────────────────────────────

export type DonationGate = {
  /** flips true ONLY once a real organization is selected and written
   *  permission is recorded. Until then, no public charity claim. */
  charityClaimReady: boolean;
  charityName?: string;
};

export function donationCopy(gate: DonationGate): string | null {
  if (!gate.charityClaimReady) return null;
  // Never "tax deductible", never an implied official partnership beyond
  // the recorded permission.
  return `Every physical item helps twice: $1 keeps DontCloneMeTom running, and $1 helps rescue dogs${gate.charityName ? ` through ${gate.charityName}` : ""}.`;
}

export function donationGateFromEnv(env: Record<string, string | undefined>): DonationGate {
  return {
    charityClaimReady: env.CHARITY_CLAIM_READY === "1" && !!env.CHARITY_NAME?.trim(),
    charityName: env.CHARITY_NAME?.trim() || undefined,
  };
}
