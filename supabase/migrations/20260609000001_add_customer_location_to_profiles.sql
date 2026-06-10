alter table profiles
  add column if not exists push_token text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
