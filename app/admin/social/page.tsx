// Protected Dog of the Day publishing admin (shared Daily Social Engine).
// Open /admin/social?key=SOCIAL_ADMIN_KEY — 404s without the right key.
// "Choose another dog" steps the deterministic selection with ?offset=N;
// changing the offset or regenerating never invents facts — every candidate
// is a real verified listing.

import { notFound } from "next/navigation";
import AdminDailyPanel from "../../components/AdminDailyPanel";
import { buildDogOfTheDay, dogCityLabel, DCMT_BRAND } from "../../lib/dogOfTheDay";
import { addDaysToDateKey, chicagoDateKey } from "../../lib/dailySocialCore";
import { missingCredentials, readPublishConfig } from "../../lib/instagramPublisherCore";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ key?: string | string[]; offset?: string | string[] }>;
};

const OTHER_BRAND_ADMINS = [
  { name: "CrossHeartPray", url: "https://crossheartpray.com/admin/social" },
  { name: "TheDJCares", url: "https://thedjcares.com/admin/social" },
];

export default async function AdminSocialPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const providedKey = Array.isArray(resolved.key) ? resolved.key[0] : resolved.key;
  const adminKey = process.env.SOCIAL_ADMIN_KEY?.trim();

  if (!adminKey || providedKey !== adminKey) {
    notFound();
  }

  const offsetRaw = Array.isArray(resolved.offset) ? resolved.offset[0] : resolved.offset;
  const offset = Math.max(0, Number(offsetRaw) || 0);

  const today = chicagoDateKey();
  const tomorrow = addDaysToDateKey(today, 1);
  const config = readPublishConfig();
  const missing = missingCredentials(config);

  const days: Array<{ label: string; date: string; error?: string; data?: Awaited<ReturnType<typeof buildDogOfTheDay>> }> = [];
  for (const [label, date] of [["Today", today], ["Tomorrow (preview on current availability)", tomorrow]] as const) {
    try {
      days.push({ label, date, data: await buildDogOfTheDay(date, { offset }) });
    } catch (error) {
      days.push({ label, date, error: error instanceof Error ? error.message : "failed" });
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-[#e8edf5]">
      <h1 className="text-2xl font-black">Dog of the Day — Instagram admin</h1>

      <div className="mt-4 rounded-2xl border border-[#26324c] bg-[#141d2e] p-4 text-sm font-semibold leading-6 text-[#94a3b8]">
        <p>
          Destination account:{" "}
          <span className="text-[#e8edf5]">
            {config.accountId ? `…${config.accountId.slice(-4)}` : "not configured"}
          </span>
        </p>
        <p>
          Credentials:{" "}
          {missing.length ? (
            <span className="text-yellow-200">missing {missing.join(", ")}</span>
          ) : (
            <span className="text-[#2DD4BF]">configured</span>
          )}
        </p>
        <p>
          Automatic publishing:{" "}
          {config.autopublishEnabled ? (
            <span className="text-[#2DD4BF]">ENABLED</span>
          ) : (
            <span className="text-yellow-200">PAUSED (INSTAGRAM_AUTOPUBLISH_ENABLED)</span>
          )}
        </p>
        <p>
          Other brands:{" "}
          {OTHER_BRAND_ADMINS.map((brand, index) => (
            <span key={brand.name}>
              {index > 0 ? " · " : ""}
              <a className="text-[#2DD4BF]" href={brand.url}>
                {brand.name}
              </a>
            </span>
          ))}{" "}
          (each needs its own key)
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="text-[#94a3b8]">Selection:</span>
        <a
          className={`rounded-full border border-[#26324c] px-4 py-1.5 ${offset === 0 ? "bg-[#2DD4BF] text-[#0b1220]" : "bg-[#141d2e]"}`}
          href={`?key=${encodeURIComponent(adminKey)}`}
        >
          Today&apos;s pick
        </a>
        <a
          className="rounded-full border border-[#26324c] bg-[#141d2e] px-4 py-1.5"
          href={`?key=${encodeURIComponent(adminKey)}&offset=${offset + 1}`}
        >
          Choose another dog (#{offset + 1}) →
        </a>
        <a
          className="rounded-full border border-[#26324c] bg-[#141d2e] px-4 py-1.5"
          href={`?key=${encodeURIComponent(adminKey)}&offset=${offset}`}
        >
          Recheck source ↻
        </a>
      </div>

      {days.map(({ label, date, data, error }) => (
        <section key={label} className="mt-8 rounded-3xl border border-[#26324c] bg-[#141d2e] p-5">
          <h2 className="text-lg font-black">
            {label} — {date}
          </h2>

          {error || !data ? (
            <p className="mt-3 font-semibold text-yellow-200">
              No eligible dog: {error ?? "unknown"}
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs font-semibold text-[#94a3b8]">
                {data.dog.name} · {dogCityLabel(data.dog)} · {data.dog.org} · Listing ID {data.dog.id}
                {" · "}
                <a className="text-[#2DD4BF]" href={data.dog.url} target="_blank" rel="noreferrer">
                  source listing ↗
                </a>
                {" · "}
                <a className="text-[#2DD4BF]" href={data.post.pagePath}>
                  dog page
                </a>
                {" · "}
                <a className="text-[#2DD4BF]" href="/today">
                  /today
                </a>
              </p>
              <AdminDailyPanel
                adminKey={adminKey}
                date={data.post.date}
                caption={data.post.caption}
                imagePath={data.post.imagePath}
                imageFileName={data.post.imageFileName}
                extraParams={offset ? { offset: String(offset) } : {}}
              />
            </>
          )}
        </section>
      ))}

      <p className="mt-6 text-xs font-semibold leading-5 text-[#94a3b8]">
        Version {DCMT_BRAND.version}. A dog publishes only after re-verifying:
        still listed, real photo, real name, identified rescue, reachable
        listing, not featured recently. Duplicate posting is impossible — the
        account&apos;s own captions are the ledger.
      </p>
    </main>
  );
}
