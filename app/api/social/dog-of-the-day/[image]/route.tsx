// Dog of the Day Instagram card.
// GET /api/social/dog-of-the-day/2026-07-12.png  →  1080×1350 PNG (4:5)
// ?offset=N previews the admin's "choose another dog" alternative.
// Rendered from the same authoritative dog object as /today and the caption.

import { buildDogOfTheDay, DCMT_BRAND } from "../../../../lib/dogOfTheDay";
import { isValidDateKey } from "../../../../lib/dailySocialCore";
import { renderDogCard } from "../../../../lib/dogCardImage";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ image: string }> },
) {
  const { image } = await params;
  const dateKey = image.replace(/\.png$/i, "");

  if (!isValidDateKey(dateKey) || dateKey < DCMT_BRAND.startDate) {
    return new Response("Not found", { status: 404 });
  }

  const offset = Number(new URL(request.url).searchParams.get("offset")) || 0;

  try {
    const { dog, post } = await buildDogOfTheDay(dateKey, { offset });
    return renderDogCard(dog, {
      headline: "DOG OF THE DAY",
      dateLine: post.fullDate,
      footerUrl: "DONTCLONEMETOM.COM/TODAY",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unavailable";
    return new Response(`No card: ${message}`, { status: 503 });
  }
}
