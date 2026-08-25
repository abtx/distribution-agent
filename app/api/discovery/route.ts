import { NextResponse } from "@/lib/http";
import { runDiscovery } from "@/lib/discovery/runDiscovery";
export async function POST() {
  try {
    return NextResponse.json(await runDiscovery());
  } catch (e) {
    const message = e instanceof Error ? e.message : "Discovery failed";
    return NextResponse.json(
      { error: message },
      { status: message.includes("already") ? 409 : 500 },
    );
  }
}
