-- Remove all write access from anonymous users on core storefront tables.
-- Server-side Vercel API routes use the Supabase secret key for trusted writes.

drop policy if exists "public products write" on public.products;

drop policy if exists "public orders read" on public.orders;
drop policy if exists "public orders write" on public.orders;

drop policy if exists "public customers write" on public.customers;

drop policy if exists "public coupons write" on public.coupons;

drop policy if exists "public store settings write" on public.store_settings;

revoke insert, update, delete on public.products from anon;
revoke select, insert, update, delete on public.orders from anon;
revoke insert, update, delete on public.customers from anon;
revoke insert, update, delete on public.coupons from anon;
revoke insert, update, delete on public.store_settings from anon;
