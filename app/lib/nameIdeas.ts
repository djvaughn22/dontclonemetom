// Nickname idea starters — plain deterministic wordplay on what the person
// typed, nothing else. Every idea is editable text; none of it claims
// anything about the dog.

export type NameIdeaInput = {
  realName: string;
  existingNickname?: string;
  words?: string[]; // words or references that fit the dog, owner-supplied
};

function clean(s: string): string {
  return s.replace(/[^a-zA-Z0-9' -]/g, "").trim();
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// First chunk of the name — "Isaiah" → "Isa", "Biscuit" → "Bis".
function shortForm(name: string): string {
  const m = name.match(/^[^aeiouAEIOU]*[aeiouAEIOU]+[^aeiouAEIOU]?/);
  return cap((m ? m[0] : name.slice(0, 3)).toLowerCase());
}

export function nameIdeas(input: NameIdeaInput): string[] {
  const real = cap(clean(input.realName));
  if (!real) return [];
  const base = cap(clean(input.existingNickname ?? "")) || shortForm(real);
  const words = (input.words ?? []).map(clean).filter(Boolean).slice(0, 4);

  const ideas = [
    `${base}-${base}`,
    `Big ${base}`,
    `${base} Train`,
    `Sir ${base}`,
    `Super${base}`,
    `${base}zilla`,
    `The ${base}inator`,
    `${real} the Magnificent`,
    ...words.map((w) => `${base} ${cap(w)}`),
    ...words.map((w) => `${cap(w)} ${base}`),
  ];

  // De-dupe, drop anything identical to the real name, keep it short.
  const seen = new Set<string>([real.toLowerCase()]);
  return ideas.filter((idea) => {
    const key = idea.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
