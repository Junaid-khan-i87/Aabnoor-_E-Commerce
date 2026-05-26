delete from public.orders
where id in ('ORD-001', 'ORD-002')
   or data->>'userEmail' in (
    'jane.doe@example.com',
    'smith.john@example.com',
    'alice.w@example.com',
    'robert.taylor@example.com'
  );

delete from public.customers
where id in ('USR-001', 'USR-002', 'USR-003', 'USR-004')
   or data->>'email' in (
    'jane.doe@example.com',
    'smith.john@example.com',
    'alice.w@example.com',
    'robert.taylor@example.com'
  );

delete from public.coupons
where id in ('C-001', 'C-002')
   or data->>'code' in ('WELCOME10', 'GLOW25');
