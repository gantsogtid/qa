create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  event_date text default '',
  program_image_url text default '',
  is_active boolean default false,
  created_at timestamp default now(),
  archived_at timestamp
);

create table if not exists settings (
  key text primary key,
  value text not null default ''
);

alter table attendance add column if not exists event_id uuid references events(id) on delete set null;
alter table questions add column if not exists event_id uuid references events(id) on delete set null;

create index if not exists attendance_event_id_idx on attendance(event_id);
create index if not exists questions_event_id_idx on questions(event_id);
create index if not exists events_is_active_idx on events(is_active);

create unique index if not exists events_single_active_idx
on events (is_active)
where is_active = true;

alter table events enable row level security;

drop policy if exists "events public read" on events;
drop policy if exists "events public insert" on events;
drop policy if exists "events public update" on events;

create policy "events public read"
on events for select
using (true);

create policy "events public insert"
on events for insert
with check (true);

create policy "events public update"
on events for update
using (true)
with check (true);

insert into events (title, event_date, program_image_url, is_active)
select
  coalesce((select value from settings where key = 'event_title'), 'Арга хэмжээ'),
  coalesce((select value from settings where key = 'event_date'), ''),
  coalesce((select value from settings where key = 'program_image_url'), ''),
  true
where not exists (select 1 from events);

update attendance
set event_id = (select id from events where is_active = true order by created_at desc limit 1)
where event_id is null;

update questions
set event_id = (select id from events where is_active = true order by created_at desc limit 1)
where event_id is null;
