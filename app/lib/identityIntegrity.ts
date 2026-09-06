// Identity integrity — does this record describe the dog it names?
//
// MOO's listing (RescueGroups 22736087, APA of Missouri) is titled "MOO" and
// its description begins "Abigail is a bouncy, happy dog…" and never mentions
// MOO. Two names, one record: whichever is right, the page cannot honestly
// present both as this dog. A visitor deciding whether to bring a dog home is
// reading the description, so publishing a description about a different
// animal is a factual error about a real dog, not a cosmetic bug.
//
// The rule is deliberately narrow, because the failure mode on the other side
// is worse: wrongly suppressing a good description hides a real dog's real
// story. A conflict is only declared when ALL of these hold:
//
//   1. The description's FIRST sentence opens by naming a subject
//      ("Abigail is…", "Meet Rufus,").
//   2. That opening name is not the record's name, not a token of it, and not
//      a near-spelling of it ("Micky"/"Mickey" is the same dog).
//   3. The record's own name appears NOWHERE in the description.
//
// Anything short of that is left alone. We never rewrite or merge records,
// and we never guess which of the two names is correct — a conflicting record
// is quarantined (description suppressed, barred from featured placement) and
// reported, so a person can decide.

// "Abigail is …", "Meet Rufus," — a capitalized subject in the opening
// position followed by a verb that starts a description.
const LEAD_SUBJECT =
  /^\s*(?:meet\s+)?([A-Z][a-zA-Z'-]{2,20})(?=\s+(?:is|was|has|have|loves?|came|arrived|enjoys?|likes?|and|the)\b|\s*,)/;

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Levenshtein distance, capped — we only care whether it is 0, 1 or 2.
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

// Shelters write "Micky" on the record and "Mickey" in the story, or add an
// accent, or drop a letter. Those are the same dog. Allow one edit for short
// names and two for longer ones.
export function isSameNameSpelling(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.startsWith(y) || y.startsWith(x)) return true;
  const allowed = Math.min(x.length, y.length) >= 6 ? 2 : 1;
  return editDistance(x, y) <= allowed;
}

export type IdentityConflict = {
  recordName: string;
  describedName: string;
  detail: string;
};

// The name tokens a record's title offers ("JIMMY JOHNS" -> jimmy, johns).
function nameTokens(name: string): string[] {
  return name
    .split(/[\s/&,+-]+/)
    .map(normalizeName)
    .filter((t) => t.length >= 3);
}

export function findIdentityConflict(
  name: string,
  description: string,
): IdentityConflict | null {
  const recordName = (name ?? "").trim();
  const desc = (description ?? "").trim();
  if (!recordName || !desc) return null;

  const match = desc.match(LEAD_SUBJECT);
  if (!match) return null;
  const described = match[1];

  const tokens = nameTokens(recordName);
  if (!tokens.length) return null;

  // The opening subject is the record's dog under any reasonable spelling.
  if (tokens.some((token) => isSameNameSpelling(token, described))) return null;

  // The record's name shows up somewhere in the description — the opening
  // subject was something else (a foster, a sibling, a person), and the dog
  // is still described. Leave it alone.
  const haystack = normalizeName(desc);
  if (tokens.some((token) => haystack.includes(token))) return null;

  return {
    recordName,
    describedName: described,
    detail: `listing is named "${recordName}" but its description is about "${described}" and never mentions "${recordName}"`,
  };
}

// A record with conflicting identity must not have its description published
// and must not be given premium placement. It is NOT deleted and NOT merged
// with another dog — the photo, name and rescue stay, so an existing link
// still resolves to something honest.
export function hasIdentityConflict(name: string, description: string): boolean {
  return findIdentityConflict(name, description) !== null;
}
