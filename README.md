# Random Notes local planner

A retro desktop-style local planner for dated tasks and loose notes.

## What it does

Open the page in any modern browser and use it like a small Windows-95-style desktop. The Planner window handles dated tasks, the Notes window holds loose thoughts, and `README.txt` gives a daily status summary.

Everything is saved in `localStorage`, so it stays private to the same browser on the same device. There is no backend, account, or sync layer yet.

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
- Local-only storage with no backend, accounts, or syncing

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
