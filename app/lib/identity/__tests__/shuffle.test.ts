import { describe, expect, it } from "vitest";
import { nearDupKey } from "../engine";
import {
  HISTORY_LIMIT,
  deal,
  lockWord,
  newSession,
  removeSuggestion,
  resetSession,
  restoreSuggestion,
  saveFavorite,
  setLaneFilter,
  surpriseMe,
  unsaveFavorite,
} from "../shuffle";
import { BEHAVIOR_CATALOG, MOOD_CATALOG, factFromCatalog } from "../behaviors";

const baseInput = {
  realName: "Biscuit",
  facts: [
    factFromCatalog(BEHAVIOR_CATALOG.find((b) => b.id === "sock-thief")!),
    factFromCatalog(MOOD_CATALOG.find((m) => m.id === "goofy")!),
  ],
};

describe("endless shuffle", () => {
  it("deals deterministically from a seed", () => {
    const a = deal(newSession("seed-1"), baseInput, 6);
    const b = deal(newSession("seed-1"), baseInput, 6);
    expect(a.candidates.map((c) => c.nickname)).toEqual(b.candidates.map((c) => c.nickname));
  });

  it("keeps producing fresh hands across a long session without exact repeats", () => {
    let session = newSession("marathon");
    const seen = new Set<string>();
    let total = 0;
    for (let i = 0; i < 40; i++) {
      const r = deal(session, baseInput, 6);
      session = r.session;
      for (const c of r.candidates) {
        expect(seen.has(c.nickname)).toBe(false);
        seen.add(c.nickname);
      }
      total += r.candidates.length;
      expect(r.candidates.length).toBeGreaterThan(0);
    }
    expect(total).toBeGreaterThan(150);
  });

  it("suppresses near-duplicates across the session, not just exact strings", () => {
    let session = newSession("near-dup");
    const keys = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const r = deal(session, baseInput, 6);
      session = r.session;
      for (const c of r.candidates) {
        const key = nearDupKey(c.nickname);
        expect(keys.has(key)).toBe(false); // no punctuation-only or filler-word variants
        keys.add(key);
      }
    }
  });

  it("keeps history bounded", () => {
    let session = newSession("bounded");
    for (let i = 0; i < 90; i++) session = deal(session, baseInput, 6).session;
    expect(session.shownIds.length).toBeLessThanOrEqual(HISTORY_LIMIT);
    expect(session.shownKeys.length).toBeLessThanOrEqual(HISTORY_LIMIT);
  });

  it("reset clears history but keeps favorites", () => {
    let session = newSession("resettable");
    const r = deal(session, baseInput, 6);
    session = saveFavorite(r.session, r.candidates[0]);
    session = resetSession(session);
    expect(session.shownIds).toEqual([]);
    expect(session.step).toBe(0);
    expect(session.favorites).toHaveLength(1);
  });

  it("removed suggestions stay gone until restored", () => {
    let session = newSession("removal");
    const first = deal(session, baseInput, 6);
    session = first.session;
    const target = first.candidates[0];
    session = removeSuggestion(session, target);
    for (let i = 0; i < 10; i++) {
      const r = deal(session, baseInput, 6);
      session = r.session;
      expect(r.candidates.some((c) => c.id === target.id)).toBe(false);
    }
    session = restoreSuggestion(session, target.id);
    expect(session.removed).toHaveLength(0);
  });

  it("favorites save and unsave", () => {
    let session = newSession("favs");
    const r = deal(session, baseInput, 6);
    session = saveFavorite(r.session, r.candidates[1]);
    session = saveFavorite(session, r.candidates[1]); // idempotent
    expect(session.favorites).toHaveLength(1);
    session = unsaveFavorite(session, r.candidates[1].id);
    expect(session.favorites).toHaveLength(0);
  });

  it("lane filter narrows deals; surprise-me clears it", () => {
    let session = setLaneFilter(newSession("filters"), ["basketball"]);
    const r = deal(session, baseInput, 6);
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) expect(c.lane).toBe("basketball");
    session = surpriseMe(r.session);
    expect(session.filters.lanes).toBeUndefined();
  });

  it("locked words survive shuffling until unlocked", () => {
    let session = lockWord(newSession("locks"), "Biscuit");
    const r = deal(session, baseInput, 6);
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) expect(c.nickname.toLowerCase()).toContain("biscuit");
    session = lockWord(r.session, undefined);
    expect(session.lockedWord).toBeUndefined();
  });
});
