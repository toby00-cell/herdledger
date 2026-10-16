create extension if not exists pgcrypto;
create type public.user_role as enum ('owner', 'buyer', 'official', 'admin');
create type public.animal_status as enum ('active', 'stolen', 'transferred', 'deceased');
create type public.transfer_status as enum ('pending', 'completed', 'rejected', 'cancelled');
create type public.ledger_event as enum ('registration', 'transfer', 'theft_reported', 'theft_resolved', 'status_changed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'owner',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.animals (
  id uuid primary key default gen_random_uuid(),
  tag_id text not null unique,
  owner_id uuid not null references public.profiles(id),
  name text,
  species text not null check (species in ('cattle', 'goat', 'sheep')),
  breed text,
  sex text not null check (sex in ('male', 'female')),
  birth_date date,
  color_markings text not null,
  registration_location text not null,
  photo_url text,
  status public.animal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id),
  from_owner_id uuid not null references public.profiles(id),
  to_owner_id uuid not null references public.profiles(id),
  status public.transfer_status not null default 'pending',
  sender_signature text,
  receiver_signature text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint different_transfer_parties check (from_owner_id <> to_owner_id)
);
create table public.theft_reports (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id),
  reporter_id uuid not null references public.profiles(id),
  details text not null,
  is_active boolean not null default true,
  reported_at timestamptz not null default now(),
  resolved_at timestamptz
);
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id),
  sequence_number bigint not null,
  event_type public.ledger_event not null,
  actor_id uuid references public.profiles(id),
  event_data jsonb not null default '{}'::jsonb,
  previous_hash text,
  entry_hash text not null,
  created_at timestamptz not null default now(),
  unique (animal_id, sequence_number)
);
create table public.fraud_alerts (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id),
  transfer_id uuid references public.ownership_transfers(id),
  reason text not null,
  risk_score integer not null check (risk_score between 0 and 100),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index animals_owner_idx on public.animals(owner_id);
create index transfers_parties_idx on public.ownership_transfers(from_owner_id, to_owner_id);
create index ledger_animal_sequence_idx on public.ledger_entries(animal_id, sequence_number);
create unique index one_active_theft_report_per_animal on public.theft_reports(animal_id) where is_active;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role) values (
    new.id, lower(new.email),
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data->>'role' in ('owner', 'buyer', 'official')
      then (new.raw_user_meta_data->>'role')::public.user_role else 'owner'::public.user_role end
  );
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.find_transfer_recipient(email_input text)
returns uuid language sql security definer set search_path = public stable as $$
  select id from public.profiles
  where lower(email) = lower(email_input)
    and id <> auth.uid()
  limit 1;
$$;

create or replace function public.generate_livestock_tag() returns trigger language plpgsql as $$
begin
  if new.tag_id is null or new.tag_id = '' then new.tag_id := 'LVT-NG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)); end if;
  return new;
end; $$;
create trigger set_livestock_tag before insert on public.animals for each row execute procedure public.generate_livestock_tag();

create or replace function public.append_ledger_entry(animal_id_input uuid, event_type_input public.ledger_event, actor_id_input uuid, event_data_input jsonb default '{}'::jsonb)
returns public.ledger_entries language plpgsql security definer set search_path = public, extensions as $$
declare previous_entry public.ledger_entries; next_sequence bigint; new_hash text; result public.ledger_entries;
begin
  select * into previous_entry from public.ledger_entries where animal_id = animal_id_input order by sequence_number desc limit 1 for update;
  next_sequence := coalesce(previous_entry.sequence_number, 0) + 1;
  new_hash := encode(digest(convert_to(animal_id_input::text || next_sequence::text || event_type_input::text || coalesce(actor_id_input::text, '') || event_data_input::text || coalesce(previous_entry.entry_hash, 'GENESIS'), 'UTF8'), 'sha256'::text), 'hex');
  insert into public.ledger_entries (animal_id, sequence_number, event_type, actor_id, event_data, previous_hash, entry_hash)
  values (animal_id_input, next_sequence, event_type_input, actor_id_input, event_data_input, previous_entry.entry_hash, new_hash) returning * into result;
  return result;
end; $$;
create or replace function public.on_animal_registered() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.append_ledger_entry(new.id, 'registration', new.owner_id, jsonb_build_object('tag_id', new.tag_id, 'owner_id', new.owner_id));
  return new;
end; $$;
create trigger append_registration_ledger after insert on public.animals for each row execute procedure public.on_animal_registered();

create or replace function public.on_theft_reported() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.animals set status = 'stolen', updated_at = now() where id = new.animal_id and owner_id = new.reporter_id;
  perform public.append_ledger_entry(new.animal_id, 'theft_reported', new.reporter_id, jsonb_build_object('report_id', new.id));
  return new;
end; $$;
create trigger activate_theft_alert after insert on public.theft_reports for each row execute procedure public.on_theft_reported();

create or replace function public.accept_ownership_transfer(transfer_id_input uuid) returns void language plpgsql security definer set search_path = public as $$
declare transfer_record public.ownership_transfers; recent_count integer;
begin
  select * into transfer_record from public.ownership_transfers where id = transfer_id_input for update;
  if transfer_record.id is null then raise exception 'Transfer not found'; end if;
  if transfer_record.to_owner_id <> auth.uid() then raise exception 'Not authorised'; end if;
  if transfer_record.status <> 'pending' then raise exception 'Transfer is no longer pending'; end if;
  update public.animals set owner_id = transfer_record.to_owner_id, status = 'active', updated_at = now()
    where id = transfer_record.animal_id and owner_id = transfer_record.from_owner_id and status <> 'stolen';
  if not found then raise exception 'Animal is unavailable for transfer'; end if;
  update public.ownership_transfers set status = 'completed', completed_at = now() where id = transfer_id_input;
  perform public.append_ledger_entry(transfer_record.animal_id, 'transfer', auth.uid(), jsonb_build_object('transfer_id', transfer_record.id, 'from_owner_id', transfer_record.from_owner_id, 'to_owner_id', transfer_record.to_owner_id));
  select count(*) into recent_count from public.ownership_transfers where animal_id = transfer_record.animal_id and status = 'completed' and completed_at > now() - interval '30 days';
  if recent_count >= 3 then insert into public.fraud_alerts (animal_id, transfer_id, reason, risk_score) values (transfer_record.animal_id, transfer_record.id, 'Three or more transfers in 30 days', 80); end if;
end; $$;

alter table public.profiles enable row level security;
alter table public.animals enable row level security;
alter table public.ownership_transfers enable row level security;
alter table public.theft_reports enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.fraud_alerts enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Animals publicly verifiable" on public.animals for select to anon, authenticated using (true);
create policy "Owners register animals" on public.animals for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners update animals" on public.animals for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Parties read transfers" on public.ownership_transfers for select to authenticated using (from_owner_id = auth.uid() or to_owner_id = auth.uid());
create policy "Owners create transfers" on public.ownership_transfers for insert to authenticated with check (from_owner_id = auth.uid() and exists (select 1 from public.animals where id = animal_id and owner_id = auth.uid() and status = 'active'));
create policy "Theft reports public" on public.theft_reports for select to anon, authenticated using (true);
create policy "Owners create theft reports" on public.theft_reports for insert to authenticated with check (reporter_id = auth.uid() and exists (select 1 from public.animals where id = animal_id and owner_id = auth.uid()));
create policy "Owners resolve reports" on public.theft_reports for update to authenticated using (reporter_id = auth.uid()) with check (reporter_id = auth.uid());
create policy "Ledger publicly readable" on public.ledger_entries for select to anon, authenticated using (true);
create policy "Officials read alerts" on public.fraud_alerts for select to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and role in ('official', 'admin')));
revoke insert, update, delete on public.ledger_entries from anon, authenticated;
revoke execute on function public.append_ledger_entry(uuid, public.ledger_event, uuid, jsonb) from anon, authenticated;
revoke execute on function public.find_transfer_recipient(text) from public, anon;
grant execute on function public.accept_ownership_transfer(uuid) to authenticated;
grant execute on function public.find_transfer_recipient(text) to authenticated;
