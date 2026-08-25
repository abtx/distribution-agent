import { NextResponse } from "next/server";
import { publishDueContent } from "@/lib/publishContent";

export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = await publishDueContent();
  return NextResponse.json({ processed: results.length, results });
}
