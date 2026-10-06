-- Read-only: lists every active (non-archived) size that has no photo of
-- its own AND whose product also has no shared/fallback photo — these are
-- the ones that would show the placeholder icon everywhere.
select p.code, v.size_text, v.image_urls, p.image_url as product_fallback_image
from stock_variants v
join stock_products p on p.id = v.product_id
where v.archived = false
  and coalesce(array_length(v.image_urls, 1), 0) = 0
  and (p.image_url is null or p.image_url = '')
order by p.code, v.size_text;
