import { NextResponse } from "@/lib/http";
import { regenerateOpportunities } from "@/lib/opportunities/regenerate";

export async function POST() {
  try {
    return NextResponse.json(await regenerateOpportunities());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Regeneration failed" },
      { status: 500 },
    );
  }
}
