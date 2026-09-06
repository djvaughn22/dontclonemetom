import { NextRequest, NextResponse } from "next/server";
import { runIntegrityAudit } from "../../lib/integrityAudit";

// Scheduled adoption-integrity audit.
//
// Runs on the same Vercel Cron mechanism the daily Instagram publish already
// uses, and is authorized the same way (Authorization: Bearer $CRON_SECRET,
// or ?key=$SOCIAL_ADMIN_KEY for a human running it by hand). Fails closed:
// with no secret configured, nothing runs.
//
// The output is a report, not an action — it never edits data. Its job is to
// make "29 of this provider's links are dead" visible the day it happens
// instead of when an adopter finds out. Logs carry dog ids, rescue names and
// destinations only; nothing about any visitor.

export const dynamic = "force-dynamic";
// A full pass makes bounded outbound requests; give it room without letting
// it run unbounded.
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = process.env.SOCIAL_ADMIN_KEY;
  if (!cronSecret && !adminKey) return false;

  const auth = req.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const key = req.nextUrl.searchParams.get("key");
  return Boolean(adminKey && key === adminKey);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const report = await runIntegrityAudit();

    if (report.failures.length) {
      console.warn(
        `[integrity-audit] ${report.failures.length} confirmed-bad destination(s) of ${report.checked} checked: ` +
          report.failures.map((f) => `${f.id} ${f.name} (${f.org}) ${f.status}`).join(" | "),
      );
    }
    for (const decision of report.quarantine) {
      if (decision.quarantined) {
        console.error(`[integrity-audit] QUARANTINE ${decision.provider}: ${decision.reason}`);
      }
    }

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "audit failed" },
      { status: 500 },
    );
  }
}
