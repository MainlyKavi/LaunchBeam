-- LaunchBeam production hardening for databases that already applied 0001.

drop table if exists public.beta_signups;

-- Project limits belong in an explicit billing layer, not an undocumented
-- database constraint.
drop index if exists public.projects_one_active_per_owner_idx;

-- Keep the immediately previous confirmation token valid when a pending
-- subscriber requests another email. This prevents a failed resend from
-- invalidating the last confirmation link that was delivered successfully.
alter table public.subscribers
  add column if not exists previous_confirmation_token_hash text;

-- Keep legacy rows readable by their owners, but prevent new reserved slugs.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_slug_not_reserved'
  ) then
    alter table public.projects
      add constraint projects_slug_not_reserved
      check (
        lower(slug) not in (
          'api',
          'dashboard',
          'login',
          'signup',
          'logout',
          'auth',
          'preview',
          'pricing',
          'about',
          'privacy',
          'terms',
          'support',
          'admin',
          'settings',
          'features',
          'analytics',
          'favicon.ico',
          'robots.txt',
          'sitemap.xml',
          'manifest.webmanifest',
          '_next'
        )
      ) not valid;
  end if;
end;
$$;

drop policy if exists "owners and visitors read projects" on public.projects;
create policy "owners and visitors read projects"
on public.projects
for select
using (
  (
    status = 'published'
    and lower(slug) not in (
      'api',
      'dashboard',
      'login',
      'signup',
      'logout',
      'auth',
      'preview',
      'pricing',
      'about',
      'privacy',
      'terms',
      'support',
      'admin',
      'settings',
      'features',
      'analytics',
      'favicon.ico',
      'robots.txt',
      'sitemap.xml',
      'manifest.webmanifest',
      '_next'
    )
  )
  or owner_id = (select auth.uid())
);

-- Record every signup and additionally record a referral conversion when one
-- is awarded. A pending row is safely promoted if verification is later
-- disabled, so an address cannot remain stranded forever.
create or replace function public.subscribe_to_waitlist(
  p_project_slug text,
  p_email text,
  p_name text,
  p_custom_answer text,
  p_referral_code text,
  p_session_id text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_confirmation_token_hash text
)
returns table (
  subscriber_id uuid,
  email text,
  status text,
  position integer,
  referral_code text,
  referral_count integer,
  already_subscribed boolean,
  referral_awarded boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_existing public.subscribers%rowtype;
  v_subscriber public.subscribers%rowtype;
  v_referrer public.subscribers%rowtype;
  v_email text := lower(trim(p_email));
  v_status text;
  v_position integer;
  v_referral_code text;
  v_referral_awarded boolean := false;
  v_verification_required boolean;
begin
  select p.*
  into v_project
  from public.projects as p
  where p.slug = lower(trim(p_project_slug))
    and p.status = 'published'
    and lower(p.slug) not in (
      'api',
      'dashboard',
      'login',
      'signup',
      'logout',
      'auth',
      'preview',
      'pricing',
      'about',
      'privacy',
      'terms',
      'support',
      'admin',
      'settings',
      'features',
      'analytics',
      'favicon.ico',
      'robots.txt',
      'sitemap.xml',
      'manifest.webmanifest',
      '_next'
    );

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'published_project_not_found';
  end if;

  v_verification_required := coalesce(
    (v_project.settings->>'requireEmailVerification')::boolean,
    false
  );

  perform pg_advisory_xact_lock(
    hashtextextended(v_project.id::text, 19790621)
  );

  select s.*
  into v_existing
  from public.subscribers as s
  where s.project_id = v_project.id
    and s.email = v_email
  for update;

  if found then
    if v_existing.status = 'pending'
       and not v_verification_required then
      update public.subscribers as s
      set
        status = 'subscribed',
        confirmation_token_hash = null,
        previous_confirmation_token_hash = null,
        confirmed_at = now()
      where s.id = v_existing.id
      returning * into v_existing;

      if v_existing.referred_by is not null then
        update public.subscribers as s
        set referral_count = s.referral_count + 1
        where s.id = v_existing.referred_by
          and s.project_id = v_existing.project_id
          and s.status = 'subscribed'
          and s.email <> v_existing.email;
        v_referral_awarded := found;
      end if;

      if v_referral_awarded then
        insert into public.events (
          project_id,
          event_type,
          subscriber_id,
          metadata
        )
        values (
          v_existing.project_id,
          'referral_signup',
          v_existing.id,
          '{"verificationDisabled": true}'::jsonb
        );
      end if;
    elsif v_existing.status = 'pending'
       and p_confirmation_token_hash is not null then
      update public.subscribers as s
      set
        previous_confirmation_token_hash = s.confirmation_token_hash,
        confirmation_token_hash = p_confirmation_token_hash
      where s.id = v_existing.id
      returning * into v_existing;
    end if;

    return query
    select
      v_existing.id,
      v_existing.email,
      v_existing.status,
      v_existing.position,
      v_existing.referral_code,
      v_existing.referral_count,
      true,
      v_referral_awarded;
    return;
  end if;

  if coalesce((v_project.settings->>'referralsEnabled')::boolean, true)
     and p_referral_code is not null then
    select s.*
    into v_referrer
    from public.subscribers as s
    where s.project_id = v_project.id
      and s.referral_code = upper(trim(p_referral_code))
      and s.status = 'subscribed'
      and s.email <> v_email
    for update;
  end if;

  v_status := case
    when v_verification_required then 'pending'
    else 'subscribed'
  end;

  if v_status = 'pending' and p_confirmation_token_hash is null then
    raise exception using
      errcode = '22023',
      message = 'confirmation_token_required';
  end if;

  select coalesce(max(s.position), 0) + 1
  into v_position
  from public.subscribers s
  where s.project_id = v_project.id;

  loop
    v_referral_code := upper(
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
    );
    exit when not exists (
      select 1
      from public.subscribers as s
      where s.referral_code = v_referral_code
    );
  end loop;

  insert into public.subscribers (
    project_id,
    email,
    name,
    custom_answer,
    status,
    referral_code,
    referred_by,
    position,
    utm_source,
    utm_medium,
    utm_campaign,
    confirmation_token_hash,
    confirmed_at
  )
  values (
    v_project.id,
    v_email,
    nullif(trim(p_name), ''),
    nullif(trim(p_custom_answer), ''),
    v_status,
    v_referral_code,
    v_referrer.id,
    v_position,
    nullif(trim(p_utm_source), ''),
    nullif(trim(p_utm_medium), ''),
    nullif(trim(p_utm_campaign), ''),
    case when v_status = 'pending' then p_confirmation_token_hash else null end,
    case when v_status = 'subscribed' then now() else null end
  )
  returning * into v_subscriber;

  if v_referrer.id is not null and v_status = 'subscribed' then
    update public.subscribers as s
    set referral_count = s.referral_count + 1
    where s.id = v_referrer.id
      and s.project_id = v_project.id
      and s.status = 'subscribed'
      and s.email <> v_email;
    v_referral_awarded := found;
  end if;

  insert into public.events (
    project_id,
    event_type,
    session_id,
    subscriber_id,
    metadata
  )
  values (
    v_project.id,
    'signup',
    nullif(trim(p_session_id), ''),
    v_subscriber.id,
    jsonb_build_object(
      'utmSource', nullif(trim(p_utm_source), ''),
      'utmMedium', nullif(trim(p_utm_medium), ''),
      'utmCampaign', nullif(trim(p_utm_campaign), '')
    )
  );

  if v_referral_awarded then
    insert into public.events (
      project_id,
      event_type,
      session_id,
      subscriber_id,
      metadata
    )
    values (
      v_project.id,
      'referral_signup',
      nullif(trim(p_session_id), ''),
      v_subscriber.id,
      '{}'::jsonb
    );
  end if;

  return query
  select
    v_subscriber.id,
    v_subscriber.email,
    v_subscriber.status,
    v_subscriber.position,
    v_subscriber.referral_code,
    v_subscriber.referral_count,
    false,
    v_referral_awarded;
end;
$$;

revoke all on function public.subscribe_to_waitlist(
  text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.subscribe_to_waitlist(
  text, text, text, text, text, text, text, text, text, text
) to service_role;

create or replace function public.confirm_waitlist_subscription(
  p_subscriber_id uuid,
  p_confirmation_token_hash text
)
returns table (
  subscriber_id uuid,
  project_id uuid,
  status text,
  referral_awarded boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscriber public.subscribers%rowtype;
  v_awarded boolean := false;
begin
  select s.*
  into v_subscriber
  from public.subscribers as s
  where s.id = p_subscriber_id
    and s.status = 'pending'
    and (
      s.confirmation_token_hash = p_confirmation_token_hash
      or s.previous_confirmation_token_hash = p_confirmation_token_hash
    )
  for update;

  if not found then
    return;
  end if;

  update public.subscribers as s
  set
    status = 'subscribed',
    confirmed_at = now(),
    confirmation_token_hash = null,
    previous_confirmation_token_hash = null
  where s.id = v_subscriber.id;

  if v_subscriber.referred_by is not null then
    update public.subscribers as s
    set referral_count = s.referral_count + 1
    where s.id = v_subscriber.referred_by
      and s.project_id = v_subscriber.project_id
      and s.status = 'subscribed';
    v_awarded := found;
  end if;

  if v_awarded then
    insert into public.events (
      project_id,
      event_type,
      subscriber_id,
      metadata
    )
    values (
      v_subscriber.project_id,
      'referral_signup',
      v_subscriber.id,
      '{"confirmed": true}'::jsonb
    );
  end if;

  return query
  select
    v_subscriber.id,
    v_subscriber.project_id,
    'subscribed'::text,
    v_awarded;
end;
$$;

revoke all on function public.confirm_waitlist_subscription(uuid, text)
from public, anon, authenticated;
grant execute on function public.confirm_waitlist_subscription(uuid, text)
to service_role;

-- Exact totals stay accurate when the detailed chart rows are intentionally
-- capped for response size.
create or replace function public.get_project_analytics_totals(
  p_project_id uuid,
  p_start timestamptz default null
)
returns table (
  page_views bigint,
  unique_visitors bigint,
  subscribers bigint,
  confirmed_subscribers bigint,
  referral_signups bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (
      select count(*)::bigint
      from public.events as e
      where e.project_id = p_project_id
        and e.event_type = 'page_view'
        and (p_start is null or e.created_at >= p_start)
    ),
    (
      select count(distinct e.session_id)::bigint
      from public.events as e
      where e.project_id = p_project_id
        and e.event_type = 'page_view'
        and e.session_id is not null
        and (p_start is null or e.created_at >= p_start)
    ),
    (
      select count(*)::bigint
      from public.subscribers as s
      where s.project_id = p_project_id
        and s.status <> 'unsubscribed'
        and (p_start is null or s.created_at >= p_start)
    ),
    (
      select count(*)::bigint
      from public.subscribers as s
      where s.project_id = p_project_id
        and s.status = 'subscribed'
        and (p_start is null or s.created_at >= p_start)
    ),
    (
      select count(*)::bigint
      from public.subscribers as s
      where s.project_id = p_project_id
        and s.status = 'subscribed'
        and s.referred_by is not null
        and (p_start is null or s.created_at >= p_start)
    );
$$;

revoke all on function public.get_project_analytics_totals(uuid, timestamptz)
from public, anon;
grant execute on function public.get_project_analytics_totals(uuid, timestamptz)
to authenticated;

drop policy if exists "owners delete project assets" on storage.objects;
create policy "owners delete project assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.projects as p
    where p.id::text = (storage.foldername(name))[2]
      and p.owner_id = (select auth.uid())
  )
  and storage.filename(name)
    ~ '^(logo|hero|background|screenshot)-[0-9a-f-]{36}\.(jpg|png|webp|avif)$'
);
