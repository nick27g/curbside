create table sightings (
  id               uuid          primary key default gen_random_uuid(),
  reported_by      uuid          not null references auth.users(id) on delete cascade,
  latitude         double precision not null,
  longitude        double precision not null,
  vendor_type      text,
  description      text,
  confirmed_count  integer       not null default 0,
  dismissed_count  integer       not null default 0,
  expires_at       timestamptz   not null default (now() + interval '2 hours'),
  created_at       timestamptz   not null default now()
);

create index sightings_expires_at_idx on sightings (expires_at);

alter table sightings enable row level security;

-- Authenticated users can read non-expired sightings
create policy "sightings_select"
  on sightings for select
  to authenticated
  using (expires_at > now());

-- Authenticated users can insert their own sightings
create policy "sightings_insert"
  on sightings for insert
  to authenticated
  with check (reported_by = auth.uid());

-- Authenticated users can update vote counts on non-expired sightings
create policy "sightings_update"
  on sightings for update
  to authenticated
  using (expires_at > now())
  with check (expires_at > now());
