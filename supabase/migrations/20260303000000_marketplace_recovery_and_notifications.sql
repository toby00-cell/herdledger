-- Add an opt-in livestock marketplace, protected seller contact reveal,
-- purchase/recovery notifications, and a two-step stolen-animal recovery flow.

alter table public.animals
  add column if not exists is_listed boolean not null default false,
  add column if not exists asking_price numeric(14, 2)
    check (asking_price is null or asking_price > 0),
  add column if not exists listed_at timestamptz;

alter table public.theft_reports
  add column if not exists found_at timestamptz,
  add column if not exists found_by uuid references public.profiles(id),
  add column if not exists found_details text;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  kind text not null default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists animals_marketplace_idx
  on public.animals(is_listed, status, created_at desc);

alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "Users update own notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke insert, delete on public.notifications from anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, phone)
  values (
    new.id,
    lower(new.email),
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    case
      when new.raw_user_meta_data->>'role' in ('owner', 'buyer', 'official')
        then (new.raw_user_meta_data->>'role')::public.user_role
      else 'owner'::public.user_role
    end,
    nullif(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$;

create or replace function public.get_market_listings()
returns table (
  animal_id uuid,
  tag_id text,
  name text,
  species text,
  breed text,
  sex text,
  asking_price numeric,
  location text,
  seller_name text,
  listed_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    animal.id,
    animal.tag_id,
    animal.name,
    animal.species,
    animal.breed,
    animal.sex,
    animal.asking_price,
    animal.registration_location,
    seller.full_name,
    animal.listed_at
  from public.animals as animal
  join public.profiles as seller on seller.id = animal.owner_id
  where animal.is_listed = true
    and animal.status = 'active'
    and animal.asking_price is not null
  order by animal.listed_at desc nulls last;
$$;

create or replace function public.reveal_listing_contact(animal_id_input uuid)
returns table (seller_name text, phone text)
language sql
security definer
set search_path = public
stable
as $$
  select seller.full_name, seller.phone
  from public.animals as animal
  join public.profiles as seller on seller.id = animal.owner_id
  where animal.id = animal_id_input
    and animal.is_listed = true
    and animal.status = 'active'
    and auth.uid() is not null
  limit 1;
$$;

create or replace function public.mark_stolen_animal_found(
  report_id_input uuid,
  details_input text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  report_record public.theft_reports;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('official', 'admin')
  ) then
    raise exception 'Only a market official can mark an animal as found';
  end if;

  select * into report_record
  from public.theft_reports
  where id = report_id_input
  for update;

  if report_record.id is null or not report_record.is_active then
    raise exception 'Active theft report not found';
  end if;
  if report_record.found_at is not null then
    raise exception 'Animal has already been marked as found';
  end if;

  update public.theft_reports
  set found_at = now(),
      found_by = auth.uid(),
      found_details = nullif(trim(details_input), '')
  where id = report_id_input;

  insert into public.notifications (user_id, title, message, kind, link)
  values (
    report_record.reporter_id,
    'Your reported animal has been found',
    'A market official located an animal from your active theft report. Review the report and reclaim it after confirming its identity.',
    'animal_found',
    '/reports'
  );
end;
$$;

create or replace function public.reclaim_stolen_animal(report_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  report_record public.theft_reports;
begin
  select * into report_record
  from public.theft_reports
  where id = report_id_input
  for update;

  if report_record.id is null
    or report_record.reporter_id <> auth.uid()
    or not report_record.is_active then
    raise exception 'Active theft report not found';
  end if;
  if report_record.found_at is null then
    raise exception 'A market official must mark the animal as found first';
  end if;

  update public.theft_reports
  set is_active = false, resolved_at = now()
  where id = report_id_input;

  update public.animals
  set status = 'active', updated_at = now()
  where id = report_record.animal_id and owner_id = auth.uid();

  perform public.append_ledger_entry(
    report_record.animal_id,
    'theft_resolved',
    auth.uid(),
    jsonb_build_object('report_id', report_record.id)
  );

  insert into public.notifications (user_id, title, message, kind, link)
  values (
    auth.uid(),
    'Animal reclaimed',
    'The theft alert was closed and the animal is active in your digital herd again.',
    'animal_reclaimed',
    '/animals'
  );
end;
$$;

revoke execute on function public.get_market_listings() from public, anon;
revoke execute on function public.reveal_listing_contact(uuid) from public, anon;
revoke execute on function public.mark_stolen_animal_found(uuid, text)
  from public, anon;
revoke execute on function public.reclaim_stolen_animal(uuid)
  from public, anon;

grant execute on function public.get_market_listings() to authenticated;
grant execute on function public.reveal_listing_contact(uuid) to authenticated;
grant execute on function public.mark_stolen_animal_found(uuid, text)
  to authenticated;
grant execute on function public.reclaim_stolen_animal(uuid) to authenticated;
