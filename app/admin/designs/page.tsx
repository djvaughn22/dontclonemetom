// Owner-only design review — /admin/designs?key=SOCIAL_ADMIN_KEY.
// Same gate as /admin/social: 404 without the key. Nothing here is public.
//
// Truthful scope: free designs live in each visitor's OWN browser and are
// never uploaded, so this page reviews designs saved on THIS device plus
// pasted design JSON — and shows the real commerce connection states.

import { notFound } from "next/navigation";
import DesignReviewPanel from "../../components/legend/DesignReviewPanel";
import {
  commerceConfigFromEnv,
  donationCopy,
  donationGateFromEnv,
  providerStatuses,
  publishedProducts,
} from "../../lib/identity/commerce";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ key?: string | string[] }> };

export default async function AdminDesignsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const providedKey = Array.isArray(resolved.key) ? resolved.key[0] : resolved.key;
  const adminKey = process.env.SOCIAL_ADMIN_KEY?.trim();
  if (!adminKey || providedKey !== adminKey) notFound();

  const providers = providerStatuses(commerceConfigFromEnv(process.env));
  const gate = donationGateFromEnv(process.env);
  const donationLine = donationCopy(gate);
  const products = publishedProducts();

  return (
    <main className="min-h-screen bg-[#0b1220] text-[#e8edf5]">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-black">Design review</h1>
        <p className="mt-1 text-sm font-semibold text-[#94a3b8]">
          Owner-only. Free designs stay in each visitor&apos;s browser — this reviews
          designs saved on this device, plus anything pasted in below.
        </p>

        <section className="mt-6 rounded-2xl border border-[#26324c] bg-[#141d2e] p-6">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#2DD4BF]">Commerce connections — the truth</p>
          <ul className="space-y-2">
            {providers.map((p) => (
              <li key={p.provider} className="text-sm font-semibold leading-6">
                <span className="font-black uppercase text-[#e8edf5]">{p.provider}</span>{" "}
                <span className="rounded-full border border-[#26324c] px-2 py-0.5 text-xs font-black text-[#94a3b8]">{p.state.replace(/_/g, " ")}</span>
                <span className="block text-xs text-[#94a3b8]">{p.detail}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-semibold leading-5 text-[#94a3b8]">
            Donation claim gate: {gate.charityClaimReady ? `ACTIVE — "${donationLine}"` : "OFF — no public charity claim renders until a real organization is selected and written permission is recorded (CHARITY_CLAIM_READY=1 + CHARITY_NAME)."}
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#94a3b8]">
            Published products: {products.map((p) => `${p.label} (site $${(p.siteSupportCents / 100).toFixed(2)} / dogs $${(p.dogDonationCents / 100).toFixed(2)})`).join(" · ")}
          </p>
        </section>

        <DesignReviewPanel />
      </div>
    </main>
  );
}
