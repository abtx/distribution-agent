import { NextResponse } from "next/server";
import { repository } from "@/lib/repository";
export async function GET() {
  const [opportunities, products, runs] = await Promise.all([
    repository.opportunities(),
    repository.products(),
    repository.runs(),
  ]);
  return NextResponse.json({ opportunities, products, runs });
}
