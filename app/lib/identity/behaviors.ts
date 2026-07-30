// Owner-confirmation catalog: real moods, behaviors, habits, quirks and
// situations an owner can confirm about their own dog. Neutral wording —
// nothing here claims any dog does any of this. A fact only exists once the
// owner selects or types it, and every fact remembers its source.

import type { ConfirmedFact, FactKind } from "./types";
import { stableId } from "./random";

export type CatalogEntry = { id: string; label: string; kind: FactKind };

export const BEHAVIOR_CATALOG: CatalogEntry[] = [
  { id: "sock-thief", label: "Sock thief", kind: "behavior" },
  { id: "couch-guardian", label: "Couch guardian", kind: "behavior" },
  { id: "delivery-alarm", label: "Delivery-truck alarm", kind: "behavior" },
  { id: "vacuum-coward", label: "Vacuum coward", kind: "quirk" },
  { id: "bath-escape", label: "Bath-time escape artist", kind: "behavior" },
  { id: "dramatic-beggar", label: "Dramatic beggar", kind: "behavior" },
  { id: "upside-down-sleeper", label: "Upside-down sleeper", kind: "quirk" },
  { id: "zoomies", label: "Zoomies", kind: "behavior" },
  { id: "lap-dog", label: "Lap dog", kind: "habit" },
  { id: "food-inspector", label: "Food inspector", kind: "habit" },
  { id: "toy-destroyer", label: "Toy destroyer", kind: "behavior" },
  { id: "blanket-burrower", label: "Blanket burrower", kind: "habit" },
  { id: "window-watcher", label: "Window watcher", kind: "habit" },
  { id: "mud-finder", label: "Mud finder", kind: "quirk" },
  { id: "door-greeter", label: "Door greeter", kind: "behavior" },
  { id: "snorer", label: "Snorer", kind: "quirk" },
  { id: "shadow-follower", label: "Shadow follower", kind: "habit" },
  { id: "backyard-patrol", label: "Backyard patrol", kind: "behavior" },
  { id: "car-ride-enthusiast", label: "Car-ride enthusiast", kind: "habit" },
  { id: "squirrel-suspicious", label: "Suspicious of squirrels", kind: "quirk" },
];

export const MOOD_CATALOG: CatalogEntry[] = [
  { id: "sleepy", label: "Sleepy", kind: "mood" },
  { id: "hungry", label: "Hungry", kind: "mood" },
  { id: "goofy", label: "Goofy", kind: "mood" },
  { id: "cuddly", label: "Cuddly", kind: "mood" },
  { id: "dramatic", label: "Dramatic", kind: "mood" },
  { id: "wild", label: "Wild", kind: "mood" },
  { id: "brave", label: "Brave", kind: "mood" },
  { id: "grumpy", label: "Grumpy", kind: "mood" },
  { id: "proud", label: "Proud", kind: "mood" },
  { id: "sneaky", label: "Sneaky", kind: "mood" },
];

export const SITUATION_CATALOG: CatalogEntry[] = [
  { id: "after-dinner", label: "After dinner", kind: "situation" },
  { id: "at-the-park", label: "At the park", kind: "situation" },
  { id: "bedtime", label: "Bedtime", kind: "situation" },
  { id: "when-guests-arrive", label: "When guests arrive", kind: "situation" },
  { id: "monday-morning", label: "Monday morning", kind: "situation" },
  { id: "bath-time", label: "Bath time", kind: "situation" },
  { id: "car-rides", label: "Car rides", kind: "situation" },
  { id: "treat-oclock", label: "Treat o'clock", kind: "situation" },
];

/** Owner tapped a catalog chip → a confirmed fact with its source. */
export function factFromCatalog(entry: CatalogEntry): ConfirmedFact {
  return { id: entry.id, text: entry.label, kind: entry.kind, source: "owner-selected" };
}

/** Owner typed their own truth → a confirmed fact with its source. */
export function factFromOwnerText(text: string, kind: FactKind): ConfirmedFact | null {
  const cleanText = text.replace(/\s+/g, " ").trim().slice(0, 60);
  if (!cleanText) return null;
  return { id: `custom-${stableId(kind + cleanText.toLowerCase())}`, text: cleanText, kind, source: "owner-entered" };
}
