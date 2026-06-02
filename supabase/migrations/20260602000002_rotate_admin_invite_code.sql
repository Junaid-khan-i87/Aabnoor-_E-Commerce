/*
  Admin invite code rotation instructions:

  1. Generate a random 32-character alphanumeric code locally.
  2. Compute its SHA-256 hex hash.
  3. Replace the placeholder 'REPLACE_WITH_NEW_HASH' below with that hash.
  4. Store the plaintext code securely in 1Password / a password manager.
  5. Do not commit the plaintext invite code to source control.

  Hash command:
    printf 'YOUR_NEW_CODE' | openssl dgst -sha256
*/

update public.admin_invite_codes
set is_active = false
where code_hash = encode(extensions.digest('9A5wqvNqWp98', 'sha256'), 'hex');

insert into public.admin_invite_codes (code_hash, label, is_active)
values ('REPLACE_WITH_NEW_HASH', 'rotated invite June 2026', true)
on conflict (code_hash) do update set is_active = true;
