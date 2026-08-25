import { NextResponse } from "next/server";
import { runDiscovery } from "@/lib/discovery/runDiscovery";
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  const auth = req.headers.get("authorization");
  if (
    auth !== `Bearer ${secret}` &&
    new URL(req.url).searchParams.get("secret") !== secret
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runDiscovery());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Discovery failed" },
      { status: 500 },
    );
  }
}
