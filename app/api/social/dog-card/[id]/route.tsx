// Community "Make a Dog Card" image — any adoptable dog by stable listing id.
// GET /api/social/dog-card/12345.png → 1080×1350 branded share card.

import { chicagoDateKey, formatFullDate } from "../../../../lib/dailySocialCore";
import { fetchDogById } from "../../../../lib/rescueDogs";
import { renderDogCard } from "../../../../lib/dogCardImage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const dogId = id.replace(/\.png$/i, "");

  const { dog, gone, reason } = await fetchDogById(dogId);

  if (gone) return new Response("This dog is no longer listed.", { status: 404 });
  if (!dog) return new Response(`Source unavailable (${reason ?? "unknown"})`, { status: 503 });
  if (!dog.photo || !dog.name) {
    return new Response("This listing is missing a photo or name.", { status: 422 });
  }

  return renderDogCard(dog, {
    headline: "ADOPTABLE NEAR YOU",
    dateLine: `Card made ${formatFullDate(chicagoDateKey())}`,
    footerUrl: `DONTCLONEMETOM.COM/DOGS/${dog.id}`,
    note: "Availability can change — check the listing for the latest.",
  });
}
