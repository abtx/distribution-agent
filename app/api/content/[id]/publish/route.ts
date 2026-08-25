import { NextResponse } from "@/lib/http";
import { marketingStore } from "@/lib/marketingStore";
import { publishContent } from "@/lib/publishContent";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = (await marketingStore.allContent()).find(
    (candidate) => candidate.id === id,
  );
  if (!item)
    return NextResponse.json(
      { error: "Content item not found" },
      { status: 404 },
    );
  try {
    return NextResponse.json(await publishContent(item));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publishing failed" },
      { status: 502 },
    );
  }
}
