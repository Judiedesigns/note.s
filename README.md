# Random Notes local planner

A retro desktop-style local planner for dated tasks and loose notes.

## What it does

Open the page in any modern browser and use it like a small Windows-95-style desktop. The Planner window handles dated tasks, the Notes window holds loose thoughts, and `README.txt` gives a daily status summary.

Everything is saved in `localStorage` first, so it still works in the same browser when you are offline. Optional Supabase sync can be enabled so the same email account sees the same planner and notes on phone and laptop.

## Features

- Retro desktop UI with draggable desktop icons and movable windows
- Planner task buckets for Today, Week, and Month
- Task creation with one task field and a date
- Task completion, edit, delete, and status filtering
- Week and month task grouping
- `.ics` calendar export with confirmation before download
- Notes window for loose thoughts separate from tasks
- Note search and timeline filters
- Compact note previews with long notes opening in a retro popup
- Copy button for notes
- Generated `README.txt` daily summary with today, done, overdue, weekly, and note counts
- Persistent desktop icon and window positions
- Offscreen window recovery
- Responsive desktop, tablet, and mobile layout
- Backward-compatible loading for older saved note/todo entries
- Local-first storage with optional Supabase email-link sync

## Optional phone/laptop sync

1. Create a Supabase project.
2. In Supabase SQL Editor, run:

```sql
create table if not exists public.random_notes_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.random_notes_sync enable row level security;

create policy "Users can read their own random notes"
on public.random_notes_sync
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own random notes"
on public.random_notes_sync
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own random notes"
on public.random_notes_sync
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

3. In `index.html`, paste your project values:

```js
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
```

4. In Supabase Auth settings, add the hosted app URL to the allowed redirect URLs.
5. Host this folder somewhere your phone can open it.
6. Open Notes, enter your email, use the magic link, then sign in with the same email on your phone.

The app merges local and cloud items on sign-in. After that, task and note changes save locally first and then sync to Supabase.

## Preview

Run a local server from this folder:

```sh
python3 -m http.server 5174 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5174/
```

## Tests

Run the Playwright test suite:

```sh
npm test
```
