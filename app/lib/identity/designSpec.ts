// Stable design specification — one approved design, reusable across
// poster, mug, shirt, tote. Pure data + helpers; storage is the caller's
// concern (browser localStorage today, never a server upload).

import { stableId } from "./random";
import type { ConfirmedFact } from "./types";
import type { ProductId } from "./commerce";

export type WatermarkState = "isaiah-approval" | "none-purchased";

export type DesignRevision = { at: string; note: string };

export type DesignSpecV1 = {
  version: 1;
  designId: string;
  /** profile slug or anonymous session id — never personal data */
  dogRef: string;
  realName: string;
  heroName: string;
  subtitle?: string;
  /**
   * Reference to the photo IN THE OWNER'S BROWSER (object URL / file name).
   * Photos never leave the device in the free experience, so there is no
   * public URL to guess and nothing to leak.
   */
  photoRef?: string;
  crop?: { x: number; y: number; w: number; h: number };
  focalPoint?: { x: number; y: number };
  template: "classic";
  facts: ConfirmedFact[];
  watermark: WatermarkState;
  outputPx: { w: number; h: number };
  productIds: ProductId[];
  revisions: DesignRevision[];
};

export function createDesignSpec(args: {
  dogRef: string;
  realName: string;
  heroName: string;
  subtitle?: string;
  photoRef?: string;
  facts: ConfirmedFact[];
  now?: string;
}): DesignSpecV1 {
  const at = args.now ?? new Date().toISOString();
  return {
    version: 1,
    designId: `dsn-${stableId(args.dogRef + args.heroName + at)}`,
    dogRef: args.dogRef,
    realName: args.realName,
    heroName: args.heroName,
    subtitle: args.subtitle,
    photoRef: args.photoRef,
    template: "classic",
    facts: args.facts,
    // Free designs are ALWAYS watermarked. "none-purchased" only ever comes
    // from a completed purchase flow — never from the free experience.
    watermark: "isaiah-approval",
    outputPx: { w: 1080, h: 1350 },
    productIds: [],
    revisions: [{ at, note: "Design created" }],
  };
}

/** Every material change appends to the revision history — the audit trail. */
export function reviseDesign(spec: DesignSpecV1, changes: Partial<Pick<DesignSpecV1, "heroName" | "subtitle" | "photoRef" | "crop" | "focalPoint" | "facts" | "productIds">>, note: string, now?: string): DesignSpecV1 {
  return {
    ...spec,
    ...changes,
    revisions: [...spec.revisions, { at: now ?? new Date().toISOString(), note }],
  };
}
