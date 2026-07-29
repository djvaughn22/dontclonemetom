"use client";

import { useState } from "react";
import { nameIdeas } from "../../lib/nameIdeas";
import { track } from "../../lib/analytics";

// Quiet, collapsed-by-default helper at the end of a profile. The person
// supplies the real name and words that fit their dog; we hand back a few
// editable nickname starters. Nothing is claimed about the dog and nothing
// leaves the browser.
export default function NameIdeasHelper() {
  const [open, setOpen] = useState(false);
  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState("");
  const [words, setWords] = useState("");
  const [ideas, setIdeas] = useState("");

  function makeIdeas() {
    const list = nameIdeas({
      realName,
      existingNickname: nickname || undefined,
      words: words.split(/[,\s]+/).filter(Boolean),
    });
    setIdeas(list.join("\n"));
    track("dcmt_name_ideas_used", {});
  }

  const input =
    "w-full rounded-xl border border-[#26324c] bg-[#0b1220] px-4 py-3 text-sm font-bold text-[#e8edf5] placeholder-[#94a3b8] focus:border-[#2DD4BF] focus:outline-none";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print text-sm font-bold text-[#94a3b8] underline decoration-[#26324c] underline-offset-4 transition hover:text-[#2DD4BF]"
      >
        Have a dog with one name too few? Get nickname ideas →
      </button>
    );
  }

  return (
    <div className="no-print rounded-2xl border border-[#26324c] bg-[#141d2e] p-5">
      <p className="text-sm font-black text-[#e8edf5]">Nickname ideas for your dog</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#94a3b8]">
        Tell us what&apos;s true — the real name, an existing nickname, a few words that fit.
        You&apos;ll get editable starters. You know your dog; we just riff.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <input
          type="text"
          value={realName}
          onChange={(e) => setRealName(e.target.value)}
          placeholder="Dog's real name (required)"
          aria-label="Dog's real name"
          className={input}
        />
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Existing nickname, if any"
          aria-label="Existing nickname"
          className={input}
        />
        <input
          type="text"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder="Words or references that fit the dog"
          aria-label="Words or references that fit the dog"
          className={input}
        />
        <button
          type="button"
          onClick={makeIdeas}
          disabled={!realName.trim()}
          className="inline-flex justify-center rounded-xl bg-[#2DD4BF] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#0b1220] transition hover:opacity-90 disabled:opacity-40"
        >
          Give me name ideas
        </button>
        {ideas && (
          <textarea
            value={ideas}
            onChange={(e) => setIdeas(e.target.value)}
            rows={Math.min(10, ideas.split("\n").length + 1)}
            aria-label="Editable nickname ideas"
            className={`${input} font-semibold leading-6`}
          />
        )}
      </div>
    </div>
  );
}
