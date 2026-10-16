-- Fix the pgcrypto schema lookup and enforce role-specific write permissions.

-- Backfill the role selected during signup for accounts created before the
-- role-specific dashboards were added.
update public.profiles as profile
set role = (auth_user.raw_user_meta_data->>'role')::public.user_role,
    updated_at = now()
from auth.users as auth_user
where profile.id = auth_user.id
  and auth_user.raw_user_meta_data->>'role' in (
    'owner', 'buyer', 'official', 'admin'
  )
  and profile.role is distinct from
    (auth_user.raw_user_meta_data->>'role')::public.user_role;

create or replace function public.append_ledger_entry(
  animal_id_input uuid,
  event_type_input public.ledger_event,
  actor_id_input uuid,
  event_data_input jsonb default '{}'::jsonb
)
returns public.ledger_entries
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  previous_entry public.ledger_entries;
  next_sequence bigint;
  payload text;
  new_hash text;
  result public.ledger_entries;
begin
  select * into previous_entry
  from public.ledger_entries
  where animal_id = animal_id_input
  order by sequence_number desc
  limit 1
  for update;

  next_sequence := coalesce(previous_entry.sequence_number, 0) + 1;
  payload :=
    animal_id_input::text ||
    next_sequence::text ||
    event_type_input::text ||
    coalesce(actor_id_input::text, '') ||
    event_data_input::text ||
    coalesce(previous_entry.entry_hash, 'GENESIS');

  new_hash := encode(
    digest(convert_to(payload, 'UTF8'), 'sha256'::text),
    'hex'
  );

  insert into public.ledger_entries (
    animal_id, sequence_number, event_type, actor_id, event_data,
    previous_hash, entry_hash
  )
  values (
    animal_id_input, next_sequence, event_type_input, actor_id_input,
    event_data_input, previous_entry.entry_hash, new_hash
  )
  returning * into result;

  return result;
end;
$$;

drop policy if exists "Owners register animals" on public.animals;
create policy "Owners register animals"
  on public.animals for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

drop policy if exists "Owners update animals" on public.animals;
create policy "Owners update animals"
  on public.animals for update to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  )
  with check (owner_id = auth.uid());

drop policy if exists "Owners create transfers" on public.ownership_transfers;
create policy "Owners create transfers"
  on public.ownership_transfers for insert to authenticated
  with check (
    from_owner_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
    and exists (
      select 1 from public.animals
      where id = animal_id
        and owner_id = auth.uid()
        and status = 'active'
    )
  );

drop policy if exists "Owners create theft reports" on public.theft_reports;
create policy "Owners create theft reports"
  on public.theft_reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
    and exists (
      select 1 from public.animals
      where id = animal_id and owner_id = auth.uid()
    )
  );

revoke execute on function public.append_ledger_entry(
  uuid, public.ledger_event, uuid, jsonb
) from public, anon, authenticated;
