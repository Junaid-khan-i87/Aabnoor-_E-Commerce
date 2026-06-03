alter table public.products add column if not exists sku text;
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists slug text;
create unique index if not exists products_slug_unique_idx on public.products (slug) where slug is not null;
alter table public.products add column if not exists product_form text;

alter table public.products add column if not exists net_weight text;
alter table public.products add column if not exists country_of_origin text default 'Pakistan';
alter table public.products add column if not exists shelf_life text;

alter table public.products add column if not exists skin_type text[];
alter table public.products add column if not exists concerns text[];
alter table public.products add column if not exists claims text[];

alter table public.products add column if not exists seo_title text;
alter table public.products add column if not exists seo_description text;
alter table public.products add column if not exists tags text[];

alter table public.products add column if not exists status text default 'active';
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (status in ('active', 'draft', 'hidden'));
alter table public.products add column if not exists is_featured boolean default false;
alter table public.products add column if not exists is_new_arrival boolean default false;
alter table public.products add column if not exists is_best_seller boolean default false;
alter table public.products add column if not exists sort_order integer default 0;

alter table public.products add column if not exists is_cruelty_free boolean default false;
alter table public.products add column if not exists is_vegan boolean default false;
alter table public.products add column if not exists is_derma_tested boolean default false;

alter table public.products add column if not exists shipping_weight decimal(10,2);
alter table public.products add column if not exists is_free_shipping boolean default false;
alter table public.products add column if not exists estimated_delivery text default '3-5 business days';
alter table public.products add column if not exists return_policy text default '7-day-return';
alter table public.products add column if not exists warranty_info text;

alter table public.products add column if not exists product_video_url text;

alter table public.products add column if not exists has_variants boolean default false;
alter table public.products add column if not exists variant_type text;
alter table public.products add column if not exists variants jsonb default '[]'::jsonb;
