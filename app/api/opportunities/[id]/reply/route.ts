import { NextResponse } from "next/server";
import { z } from "zod";
import { generateReply } from "@/lib/ai/generateReply";
import { repository } from "@/lib/repository";

const schema = z.object({ product_ids: z.array(z.string()).min(1) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Select at least one product" },
      { status: 400 },
    );
  const [opportunities, allProducts] = await Promise.all([
    repository.opportunities(),
    repository.products(),
  ]);
  const opportunity = opportunities.find((item) => item.id === id);
  if (!opportunity)
    return NextResponse.json(
      { error: "Opportunity not found" },
      { status: 404 },
    );
  const products = parsed.data.product_ids
    .map((productId) => allProducts.find((product) => product.id === productId))
    .filter((product): product is (typeof allProducts)[number] =>
      Boolean(product),
    );
  if (products.length !== parsed.data.product_ids.length)
    return NextResponse.json(
      { error: "Unknown product selected" },
      { status: 400 },
    );
  const proposed_reply = await generateReply(
    {
      id: opportunity.reddit_post_id,
      subreddit: opportunity.subreddit,
      title: opportunity.post_title,
      body: opportunity.post_body,
      url: opportunity.post_url,
      author: opportunity.author,
      createdUtc: opportunity.created_utc,
    },
    products,
  );
  const product_matches = products.map(
    (product) =>
      opportunity.product_matches?.find(
        (match) => match.productId === product.id,
      ) || {
        productId: product.id,
        score: 70,
      },
  );
  const updated = await repository.updateOpportunity(id, {
    matched_product_id: products[0].id,
    matched_product_ids: products.map((product) => product.id),
    product_matches,
    match_score: product_matches[0].score,
    proposed_reply,
    edited_reply: null,
  });
  return NextResponse.json(updated);
}
