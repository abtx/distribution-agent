alter table opportunities
  add column if not exists matched_product_ids uuid[] not null default '{}',
  add column if not exists product_matches jsonb not null default '[]'::jsonb;

update opportunities
set matched_product_ids = array[matched_product_id],
    product_matches = jsonb_build_array(
      jsonb_build_object('productId', matched_product_id, 'score', match_score)
    )
where cardinality(matched_product_ids) = 0;
