alter table products
  add column if not exists must_include text not null default '';

update products
set must_include = 'Download FREE at {url}'
where must_include = '';
