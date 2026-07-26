-- LaunchBeam multi-tenant waitlist SaaS schema.
-- Apply with the Supabase CLI before enabling authentication or public signup.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique
    check (
      char_length(slug) between 3 and 40
      and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  template_id text not null default 'kimchi'
    check (
      template_id in (
        'minimal-beam',
        'kimchi',
        'kevinora',
        'spotbeam',
        'darkrai'
      )
    ),
  content jsonb not null default '{
    "productName": "Kimchi",
    "kicker": "Private beta",
    "headline": "Research that finds the signal in customer conversations.",
    "description": "Kimchi turns interviews and support calls into clear product decisions.",
    "buttonText": "Join the waitlist",
    "successTitle": "You''re on the list.",
    "successMessage": "We''ll let you know when Kimchi is ready.",
    "logoUrl": null,
    "heroImageUrl": null,
    "socialLinks": []
  }'::jsonb,
  theme jsonb not null default '{
    "background": "#e9e5ff",
    "foreground": "#18151f",
    "muted": "#6f6879",
    "accent": "#5b4de4",
    "font": "argentum",
    "radius": 20,
    "alignment": "center",
    "buttonStyle": "solid",
    "animation": "subtle"
  }'::jsonb,
  settings jsonb not null default '{
    "showSignupCount": false,
    "referralsEnabled": true,
    "requireEmailVerification": false,
    "collectName": false,
    "customQuestion": null,
    "privacyUrl": null
  }'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx
  on public.projects(owner_id);
create index if not exists projects_slug_idx
  on public.projects(slug);
create index if not exists projects_status_idx
  on public.projects(status);
create index if not exists projects_created_at_idx
  on public.projects(created_at desc);
create index if not exists projects_updated_at_idx
  on public.projects(updated_at desc);
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null
    check (
      email = lower(trim(email))
      and char_length(email) between 3 and 254
    ),
  name text check (name is null or char_length(name) <= 100),
  custom_answer text
    check (custom_answer is null or char_length(custom_answer) <= 500),
  status text not null default 'subscribed'
    check (status in ('pending', 'subscribed', 'unsubscribed')),
  referral_code text not null unique
    check (referral_code ~ '^[A-Z0-9]{8,24}$'),
  referred_by uuid,
  position integer not null check (position > 0),
  referral_count integer not null default 0 check (referral_count >= 0),
  utm_source text check (utm_source is null or char_length(utm_source) <= 100),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 100),
  utm_campaign text
    check (utm_campaign is null or char_length(utm_campaign) <= 100),
  confirmation_token_hash text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, id),
  unique(project_id, email),
  unique(project_id, position),
  foreign key (project_id, referred_by)
    references public.subscribers(project_id, id)
    on delete set null (referred_by),
  check (referred_by is null or referred_by <> id)
);

create index if not exists subscribers_project_id_idx
  on public.subscribers(project_id);
create index if not exists subscribers_project_created_at_idx
  on public.subscribers(project_id, created_at desc);
create index if not exists subscribers_referral_code_idx
  on public.subscribers(referral_code);
create index if not exists subscribers_referred_by_idx
  on public.subscribers(referred_by);
create index if not exists subscribers_status_idx
  on public.subscribers(project_id, status);
create index if not exists subscribers_email_idx
  on public.subscribers(project_id, email);
create index if not exists subscribers_confirmation_hash_idx
  on public.subscribers(confirmation_token_hash)
  where confirmation_token_hash is not null;

create table if not exists public.events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  event_type text not null
    check (
      event_type in (
        'page_view',
        'signup',
        'referral_visit',
        'referral_signup',
        'share_click'
      )
    ),
  session_id text
    check (
      session_id is null
      or (
        char_length(session_id) between 16 and 80
        and session_id ~ '^[A-Za-z0-9_-]+$'
      )
    ),
  subscriber_id uuid,
  referrer text check (referrer is null or char_length(referrer) <= 500),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  device_type text
    check (device_type is null or device_type in ('desktop', 'tablet', 'mobile', 'unknown')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (project_id, subscriber_id)
    references public.subscribers(project_id, id)
    on delete set null (subscriber_id)
);

create index if not exists events_project_created_at_idx
  on public.events(project_id, created_at desc);
create index if not exists events_project_event_type_idx
  on public.events(project_id, event_type);
create index if not exists events_session_id_idx
  on public.events(session_id)
  where session_id is not null;
create index if not exists events_project_page_view_session_idx
  on public.events(project_id, session_id)
  where event_type = 'page_view' and session_id is not null;
create index if not exists events_subscriber_id_idx
  on public.events(subscriber_id)
  where subscriber_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists subscribers_set_updated_at on public.subscribers;
create trigger subscribers_set_updated_at
before update on public.subscribers
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.subscribers enable row level security;
alter table public.events enable row level security;

grant select on public.projects to anon;
grant select, insert, update, delete on public.projects to authenticated;

drop policy if exists "owners and visitors read projects" on public.projects;
create policy "owners and visitors read projects"
on public.projects
for select
using (
  status = 'published'
  or owner_id = (select auth.uid())
);

drop policy if exists "owners create projects" on public.projects;
create policy "owners create projects"
on public.projects
for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "owners update projects" on public.projects;
create policy "owners update projects"
on public.projects
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "owners delete projects" on public.projects;
create policy "owners delete projects"
on public.projects
for delete
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "owners read subscribers" on public.subscribers;
create policy "owners read subscribers"
on public.subscribers
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = subscribers.project_id
      and projects.owner_id = (select auth.uid())
  )
);

drop policy if exists "owners update subscribers" on public.subscribers;
create policy "owners update subscribers"
on public.subscribers
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = subscribers.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = subscribers.project_id
      and projects.owner_id = (select auth.uid())
  )
);

drop policy if exists "owners delete subscribers" on public.subscribers;
create policy "owners delete subscribers"
on public.subscribers
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = subscribers.project_id
      and projects.owner_id = (select auth.uid())
  )
);

drop policy if exists "owners read events" on public.events;
create policy "owners read events"
on public.events
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = events.project_id
      and projects.owner_id = (select auth.uid())
  )
);

-- Public subscribers and analytics are intentionally not insertable through
-- the browser client. Server endpoints use the service role and the RPC below.
revoke all on public.subscribers from anon, authenticated;
grant select, delete on public.subscribers to authenticated;
grant update(status) on public.subscribers to authenticated;
revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;
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
begin
  select p.*
  into v_project
  from public.projects as p
  where p.slug = lower(trim(p_project_slug))
    and p.status = 'published';

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'published_project_not_found';
  end if;

  -- Serializes position allocation and duplicate checks per project while
  -- allowing different projects to accept signups concurrently.
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
       and p_confirmation_token_hash is not null then
      update public.subscribers as s
      set confirmation_token_hash = p_confirmation_token_hash
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
      false;
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
    when coalesce(
      (v_project.settings->>'requireEmailVerification')::boolean,
      false
    )
    then 'pending'
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
    case
      when v_referral_awarded then 'referral_signup'
      else 'signup'
    end,
    nullif(trim(p_session_id), ''),
    v_subscriber.id,
    jsonb_build_object(
      'utmSource', nullif(trim(p_utm_source), ''),
      'utmMedium', nullif(trim(p_utm_medium), ''),
      'utmCampaign', nullif(trim(p_utm_campaign), '')
    )
  );

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
    and s.confirmation_token_hash = p_confirmation_token_hash
  for update;

  if not found then
    return;
  end if;

  update public.subscribers as s
  set
    status = 'subscribed',
    confirmed_at = now(),
    confirmation_token_hash = null
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

create or replace function public.get_project_unique_visitors(
  p_project_id uuid
)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(distinct e.session_id)::bigint
  from public.events as e
  where e.project_id = p_project_id
    and e.event_type = 'page_view'
    and e.session_id is not null;
$$;

revoke all on function public.subscribe_to_waitlist(
  text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.subscribe_to_waitlist(
  text, text, text, text, text, text, text, text, text, text
) to service_role;

revoke all on function public.confirm_waitlist_subscription(uuid, text)
from public, anon, authenticated;
grant execute on function public.confirm_waitlist_subscription(uuid, text)
to service_role;

revoke all on function public.get_project_unique_visitors(uuid)
from public, anon;
grant execute on function public.get_project_unique_visitors(uuid)
to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-assets',
  'project-assets',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owners read project assets" on storage.objects;
create policy "owners read project assets"
on storage.objects for select
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
);

drop policy if exists "owners upload project assets" on storage.objects;
create policy "owners upload project assets"
on storage.objects for insert
to authenticated
with check (
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

drop policy if exists "owners update project assets" on storage.objects;
create policy "owners update project assets"
on storage.objects for update
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
)
with check (
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

drop policy if exists "owners delete project assets" on storage.objects;
create policy "owners delete project assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
