-- LaunchBeam application integrity and observability follow-up.

-- Upgrade only the exact legacy Kimchi preset. Custom themes remain untouched.
update public.projects
set theme = jsonb_set(theme, '{muted}', '"#625b6c"'::jsonb)
where theme = '{
  "background": "#e9e5ff",
  "foreground": "#18151f",
  "muted": "#6f6879",
  "accent": "#5b4de4",
  "font": "argentum",
  "radius": 20,
  "alignment": "center",
  "buttonStyle": "solid",
  "animation": "subtle"
}'::jsonb;

alter table public.projects
  alter column content set default '{
    "productName": "Kimchi",
    "kicker": "Private beta",
    "headline": "Research that finds the signal in customer conversations.",
    "description": "Kimchi turns interviews and support calls into clear product decisions.",
    "buttonText": "Join the waitlist",
    "successTitle": "You''re on the list.",
    "successMessage": "We''ll let you know when Kimchi is ready.",
    "logoUrl": null,
    "heroImageUrl": null,
    "screenshotUrl": null,
    "backgroundImageUrl": null,
    "socialLinks": []
  }'::jsonb,
  alter column theme set default '{
    "background": "#e9e5ff",
    "foreground": "#18151f",
    "muted": "#625b6c",
    "accent": "#5b4de4",
    "font": "argentum",
    "radius": 20,
    "alignment": "center",
    "buttonStyle": "solid",
    "animation": "subtle"
  }'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_slug_format'
  ) then
    alter table public.projects
      add constraint projects_slug_format
      check (
        char_length(slug) between 3 and 40
        and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      ) not valid;
  end if;
end;
$$;

-- Make the privileged server client's required access explicit instead of
-- depending on project-level default privileges.
grant usage on schema public to service_role;
grant select, insert, update, delete
  on public.projects, public.subscribers, public.events
  to service_role;
grant usage, select on sequence public.events_id_seq to service_role;

-- Owners can suppress delivery for their own subscribers, but cannot use the
-- public authenticated Data API to reverse an unsubscribe. Privileged signup
-- and confirmation functions use service_role and continue to bypass RLS.
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
  status = 'unsubscribed'
  and exists (
    select 1
    from public.projects
    where projects.id = subscribers.project_id
      and projects.owner_id = (select auth.uid())
  )
);

-- Referral totals count only conversions for which the transactional signup or
-- confirmation function actually awarded credit.
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
      from public.events as e
      where e.project_id = p_project_id
        and e.event_type = 'referral_signup'
        and (p_start is null or e.created_at >= p_start)
    );
$$;

revoke all on function public.get_project_analytics_totals(uuid, timestamptz)
from public, anon;
grant execute on function public.get_project_analytics_totals(uuid, timestamptz)
to authenticated;

notify pgrst, 'reload schema';
