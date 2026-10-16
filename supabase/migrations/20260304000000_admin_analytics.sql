-- Admin-only aggregate analytics. The function exposes operational totals,
-- not individual profile or transaction records.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'Account roles can only be changed by a database administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_update on public.profiles;
create trigger protect_profile_role_update
before update of role on public.profiles
for each row execute procedure public.protect_profile_role();

create or replace function public.get_admin_dashboard_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Administrator access required';
  end if;

  select jsonb_build_object(
    'users', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'new_30d', (
        select count(*) from public.profiles
        where created_at >= now() - interval '30 days'
      ),
      'by_role', coalesce((
        select jsonb_object_agg(role, role_count)
        from (
          select role::text as role, count(*) as role_count
          from public.profiles
          group by role
        ) as role_totals
      ), '{}'::jsonb)
    ),
    'animals', jsonb_build_object(
      'total', (select count(*) from public.animals),
      'new_30d', (
        select count(*) from public.animals
        where created_at >= now() - interval '30 days'
      ),
      'active', (
        select count(*) from public.animals where status = 'active'
      ),
      'stolen', (
        select count(*) from public.animals where status = 'stolen'
      ),
      'listed', (
        select count(*) from public.animals
        where is_listed = true and status = 'active'
      ),
      'by_species', coalesce((
        select jsonb_object_agg(species, species_count)
        from (
          select species, count(*) as species_count
          from public.animals
          group by species
        ) as species_totals
      ), '{}'::jsonb)
    ),
    'transfers', jsonb_build_object(
      'total', (select count(*) from public.ownership_transfers),
      'completed', (
        select count(*) from public.ownership_transfers
        where status = 'completed'
      ),
      'pending', (
        select count(*) from public.ownership_transfers
        where status = 'pending'
      ),
      'new_30d', (
        select count(*) from public.ownership_transfers
        where created_at >= now() - interval '30 days'
      )
    ),
    'safety', jsonb_build_object(
      'active_theft_reports', (
        select count(*) from public.theft_reports where is_active = true
      ),
      'recovered', (
        select count(*) from public.theft_reports
        where resolved_at is not null
      ),
      'fraud_alerts', (
        select count(*) from public.fraud_alerts where resolved = false
      )
    ),
    'activity', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'date', activity_day::date,
            'users', (
              select count(*) from public.profiles
              where created_at >= activity_day
                and created_at < activity_day + interval '1 day'
            ),
            'animals', (
              select count(*) from public.animals
              where created_at >= activity_day
                and created_at < activity_day + interval '1 day'
            ),
            'transfers', (
              select count(*) from public.ownership_transfers
              where created_at >= activity_day
                and created_at < activity_day + interval '1 day'
            )
          )
          order by activity_day
        ),
        '[]'::jsonb
      )
      from generate_series(
        date_trunc('day', now()) - interval '6 days',
        date_trunc('day', now()),
        interval '1 day'
      ) as days(activity_day)
    )
  )
  into result;

  return result;
end;
$$;

revoke execute on function public.get_admin_dashboard_analytics()
  from public, anon, authenticated;
grant execute on function public.get_admin_dashboard_analytics()
  to authenticated;
