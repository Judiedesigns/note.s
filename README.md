# random notes

An Aqua-style local planner for tasks and loose notes.

## What it does

Open the page in any modern browser, add tasks with dates, review them by Today, Week, or Month, and switch to Notes for thoughts that are not tied to a task. Everything is saved in `localStorage`, so it stays private to the same browser on the same device.

## Features

- Today, Week, Month, and Notes views
- Date-based tasks with completion, edit, and delete
- Week and month task grouping by date
- Loose note capture for thoughts and scribbles
- Backward-compatible loading for older saved note/todo entries
- Responsive Aqua-style desktop, tablet, and mobile layout
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
