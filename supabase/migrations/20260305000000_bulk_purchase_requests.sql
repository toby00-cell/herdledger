-- Bulk marketplace requests let one buyer source livestock from one or more
-- owners while preserving an individual transfer and ledger event per animal.

create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  request_ref text not null unique default (
    'REQ-NG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  species text not null check (species in ('cattle', 'goat', 'sheep')),
  breed text,
  quantity integer not null check (quantity between 2 and 500),
  sex_preference text not null default 'any'
    check (sex_preference in ('any', 'male', 'female')),
  max_price_per_animal numeric(14, 2)
    check (max_price_per_animal is null or max_price_per_animal > 0),
  location text not null,
  required_by date,
  notes text,
  status text not null default 'open'
    check (status in ('open', 'matched', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bulk_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests(id)
    on delete cascade,
  owner_id uuid not null references public.profiles(id),
  order_ref text not null unique default (
    'BULK-NG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  total_price numeric(14, 2) not null check (total_price > 0),
  message text,
  status text not null default 'submitted'
    check (status in ('submitted', 'accepted', 'completed', 'rejected')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

create table public.bulk_offer_animals (
  offer_id uuid not null references public.bulk_offers(id) on delete cascade,
  animal_id uuid not null references public.animals(id),
  primary key (offer_id, animal_id)
);

alter table public.ownership_transfers
  add column if not exists bulk_offer_id uuid references public.bulk_offers(id);

create index purchase_requests_status_created_idx
  on public.purchase_requests(status, created_at desc);
create index bulk_offers_request_idx
  on public.bulk_offers(request_id, created_at desc);
create index bulk_offers_owner_idx
  on public.bulk_offers(owner_id, created_at desc);
create index transfers_bulk_offer_idx
  on public.ownership_transfers(bulk_offer_id);

alter table public.purchase_requests enable row level security;
alter table public.bulk_offers enable row level security;
alter table public.bulk_offer_animals enable row level security;

create policy "Authenticated users read purchase requests"
  on public.purchase_requests for select to authenticated
  using (true);

create policy "Buyers create purchase requests"
  on public.purchase_requests for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('buyer', 'admin')
    )
  );

create or replace function public.submit_bulk_offer(
  request_id_input uuid,
  animal_ids_input uuid[],
  total_price_input numeric,
  message_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.purchase_requests;
  offer_id_result uuid;
  requested_count integer;
  eligible_count integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin')
  ) then
    raise exception 'Only livestock owners can submit offers';
  end if;

  select * into request_record
  from public.purchase_requests
  where id = request_id_input
  for update;

  if request_record.id is null or request_record.status not in ('open', 'matched') then
    raise exception 'This purchase request is no longer accepting offers';
  end if;
  if request_record.buyer_id = auth.uid() then
    raise exception 'You cannot respond to your own purchase request';
  end if;

  requested_count := coalesce(array_length(animal_ids_input, 1), 0);
  if requested_count < 1 or requested_count > request_record.quantity then
    raise exception 'Select between 1 and % animals', request_record.quantity;
  end if;
  if total_price_input is null or total_price_input <= 0 then
    raise exception 'Enter a valid total offer price';
  end if;

  select count(*) into eligible_count
  from public.animals
  where id = any(animal_ids_input)
    and owner_id = auth.uid()
    and status = 'active'
    and species = request_record.species
    and (
      request_record.sex_preference = 'any'
      or sex = request_record.sex_preference
    );

  if eligible_count <> requested_count then
    raise exception 'Every selected animal must be active, owned by you, and match the request';
  end if;

  insert into public.bulk_offers (
    request_id, owner_id, total_price, message
  )
  values (
    request_id_input, auth.uid(), total_price_input,
    nullif(trim(message_input), '')
  )
  returning id into offer_id_result;

  insert into public.bulk_offer_animals (offer_id, animal_id)
  select offer_id_result, unnest(animal_ids_input);

  insert into public.notifications (user_id, title, message, kind, link)
  values (
    request_record.buyer_id,
    'New bulk livestock offer',
    requested_count || ' animals were offered for your '
      || request_record.quantity || '-animal request.',
    'bulk_offer',
    '/bulk-orders'
  );

  return offer_id_result;
end;
$$;

create or replace function public.get_bulk_offers()
returns table (
  id uuid,
  request_id uuid,
  order_ref text,
  owner_name text,
  owner_phone text,
  animal_count bigint,
  animals jsonb,
  total_price numeric,
  message text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    offer.id,
    offer.request_id,
    offer.order_ref,
    owner_profile.full_name,
    case
      when request.buyer_id = auth.uid() or offer.owner_id = auth.uid()
        then owner_profile.phone
      else null
    end,
    count(offer_animal.animal_id),
    jsonb_agg(
      jsonb_build_object(
        'id', animal.id,
        'tag_id', animal.tag_id,
        'name', animal.name,
        'species', animal.species,
        'breed', animal.breed,
        'sex', animal.sex,
        'status', animal.status
      )
      order by animal.tag_id
    ),
    offer.total_price,
    offer.message,
    offer.status,
    offer.created_at
  from public.bulk_offers as offer
  join public.purchase_requests as request on request.id = offer.request_id
  join public.profiles as owner_profile on owner_profile.id = offer.owner_id
  join public.bulk_offer_animals as offer_animal
    on offer_animal.offer_id = offer.id
  join public.animals as animal on animal.id = offer_animal.animal_id
  where request.buyer_id = auth.uid() or offer.owner_id = auth.uid()
  group by offer.id, request.buyer_id, owner_profile.full_name,
    owner_profile.phone;
$$;

create or replace function public.accept_bulk_offer(offer_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_record public.bulk_offers;
  request_record public.purchase_requests;
  offer_count integer;
  already_accepted integer;
  available_count integer;
begin
  select * into offer_record
  from public.bulk_offers
  where id = offer_id_input
  for update;

  if offer_record.id is null or offer_record.status <> 'submitted' then
    raise exception 'This offer is no longer available';
  end if;

  select * into request_record
  from public.purchase_requests
  where id = offer_record.request_id
  for update;

  if request_record.buyer_id <> auth.uid() then
    raise exception 'Only the requesting buyer can accept this offer';
  end if;
  if request_record.status not in ('open', 'matched') then
    raise exception 'This purchase request is closed';
  end if;

  select count(*) into offer_count
  from public.bulk_offer_animals
  where offer_id = offer_id_input;

  select coalesce(sum(item_count), 0)::integer into already_accepted
  from (
    select count(*) as item_count
    from public.bulk_offers as accepted_offer
    join public.bulk_offer_animals as accepted_item
      on accepted_item.offer_id = accepted_offer.id
    where accepted_offer.request_id = request_record.id
      and accepted_offer.status in ('accepted', 'completed')
    group by accepted_offer.id
  ) as accepted_totals;

  if already_accepted + offer_count > request_record.quantity then
    raise exception 'This offer exceeds the remaining requested quantity';
  end if;

  select count(*) into available_count
  from public.bulk_offer_animals as item
  join public.animals as animal on animal.id = item.animal_id
  where item.offer_id = offer_id_input
    and animal.owner_id = offer_record.owner_id
    and animal.status = 'active'
    and not exists (
      select 1 from public.ownership_transfers as pending_transfer
      where pending_transfer.animal_id = animal.id
        and pending_transfer.status = 'pending'
    );

  if available_count <> offer_count then
    raise exception 'One or more offered animals are no longer available';
  end if;

  update public.bulk_offers
  set status = 'accepted', accepted_at = now()
  where id = offer_id_input;

  insert into public.ownership_transfers (
    animal_id, from_owner_id, to_owner_id, bulk_offer_id
  )
  select
    item.animal_id, offer_record.owner_id, request_record.buyer_id,
    offer_id_input
  from public.bulk_offer_animals as item
  where item.offer_id = offer_id_input;

  update public.purchase_requests
  set status = case
      when already_accepted + offer_count >= quantity then 'matched'
      else 'open'
    end,
    updated_at = now()
  where id = request_record.id;

  insert into public.notifications (user_id, title, message, kind, link)
  values (
    offer_record.owner_id,
    'Bulk offer accepted',
    'Your offer ' || offer_record.order_ref
      || ' was accepted. Arrange inspection, payment, and handover.',
    'bulk_offer_accepted',
    '/bulk-orders'
  );
end;
$$;

create or replace function public.complete_bulk_purchase(offer_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_record public.bulk_offers;
  request_record public.purchase_requests;
  transfer_record record;
  remaining_accepted integer;
  completed_animals integer;
begin
  select * into offer_record
  from public.bulk_offers
  where id = offer_id_input
  for update;

  if offer_record.id is null or offer_record.status <> 'accepted' then
    raise exception 'Accepted bulk offer not found';
  end if;

  select * into request_record
  from public.purchase_requests
  where id = offer_record.request_id
  for update;

  if request_record.buyer_id <> auth.uid() then
    raise exception 'Only the buyer can confirm this purchase';
  end if;

  for transfer_record in
    select id
    from public.ownership_transfers
    where bulk_offer_id = offer_id_input and status = 'pending'
    order by created_at
  loop
    perform public.accept_ownership_transfer(transfer_record.id);
  end loop;

  update public.bulk_offers
  set status = 'completed', completed_at = now()
  where id = offer_id_input;

  select count(*) into remaining_accepted
  from public.bulk_offers
  where request_id = request_record.id and status = 'accepted';

  select count(*) into completed_animals
  from public.bulk_offers as completed_offer
  join public.bulk_offer_animals as completed_item
    on completed_item.offer_id = completed_offer.id
  where completed_offer.request_id = request_record.id
    and completed_offer.status = 'completed';

  if remaining_accepted = 0
    and completed_animals >= request_record.quantity then
    update public.purchase_requests
    set status = 'completed', updated_at = now()
    where id = request_record.id;
  end if;

  insert into public.notifications (user_id, title, message, kind, link)
  values (
    offer_record.owner_id,
    'Bulk purchase completed',
    'The buyer confirmed handover for ' || offer_record.order_ref
      || '. Every animal now has a completed ownership transfer.',
    'bulk_purchase_completed',
    '/transfers'
  );
end;
$$;

revoke execute on function public.submit_bulk_offer(uuid, uuid[], numeric, text)
  from public, anon;
revoke execute on function public.get_bulk_offers() from public, anon;
revoke execute on function public.accept_bulk_offer(uuid) from public, anon;
revoke execute on function public.complete_bulk_purchase(uuid)
  from public, anon;

grant execute on function public.submit_bulk_offer(uuid, uuid[], numeric, text)
  to authenticated;
grant execute on function public.get_bulk_offers() to authenticated;
grant execute on function public.accept_bulk_offer(uuid) to authenticated;
grant execute on function public.complete_bulk_purchase(uuid)
  to authenticated;
