# Random Notes local planner

A retro desktop-style local planner for dated tasks, timed events, and loose notes.

## What it does

Open the page in any modern browser and use it like a small Windows-95-style desktop. The Planner window handles dated tasks and timed events, the Notes window holds loose thoughts, and `README.txt` gives a daily status summary.

Everything is saved in `localStorage` first, so it still works in the same browser when you are offline. Optional Firebase sync can be enabled so the same Google account sees the same planner and notes on phone and laptop.

## Features

- Retro desktop UI with draggable desktop icons and movable windows
- Windows can be resized by dragging the left or right edge, the bottom edge, or the bottom corners; the bottom-right grip is always visible and sizes persist across reloads
- Keyboard window control: focus a title bar and use arrow keys to move, or Shift plus arrow keys to resize
- Three planner views — Today, Week, and Month — with no separate Calendar destination
- The active view survives a reload, and Week or Month keeps the last period you were looking at
- Today shows an agenda grouped into Overdue, Today, and No date; the group heading only appears when more than one group has items
- Today includes a local focus dock that stays out of the way until there is a task: start a sprint from any task, run one at a time, and log focused minutes to the task and to today
- Focus sprints stop at the end and offer a short break, keeping going, or stopping; nothing starts, advances, or checks off on its own
- A daily focus goal is the main progress bar, and the menu-bar pill keeps the running timer visible from any view
- Focus sessions resume after a reload using an absolute end time; the session and daily minutes stay on this device
- Week shows day columns, Month shows a calendar grid with `+N more` expansion
- The Today sidebar count includes open undated tasks and today's events
- On mobile the sidebar is replaced by a compact Today / Week / Month switch
- Tab lists and filter menus support arrow keys, Home/End, and Escape
- Tasks without a date are allowed and collect in the No date tray
- Quick-capture task bar: type a title, then press Enter or click the visible **Save** button
- The create button follows the view: **New task** in Today, **New event** in Week or Month
- Events are real calendar items with a start time and duration; they do not have a Done checkbox or a focus sprint
- Quick event capture includes clickable time and duration chips; the full form exposes both fields
- If a new task is hidden by a filter or a future date, the toast explains where it went
- Quick capture in Week or Month defaults to the selected day
- Click a Month day (or press Enter on it) to open a day popover listing that day's tasks and events
- Week and Month support arrow-key day navigation, Home/End, and PageUp/PageDown
- On mobile, Month view collapses tasks to dots; tap a day to see its tasks
- Notes can be edited in place; Cancel keeps the original note untouched
- Press Cmd/Ctrl+Enter (or the `⋯` button) from the task bar to set a custom date, then Escape or Cancel to return
- Notes composer focuses automatically when the window opens; save with Cmd/Ctrl+Enter
- Keyboard shortcuts: `T` jumps to task capture, `N` jumps to a new note
- Overdue tasks are flagged in the task list instead of only in the README summary
- Week boundaries follow your browser locale (Sunday-first in the US, Monday-first in the UK/EU)
- IME-safe: Enter during Japanese/Chinese/Korean composition does not save a partial title
- Task creation with one task field and an optional due date
- Task completion, edit, delete, and status filtering
- `.ics` calendar export with confirmation before download, including timed events with start and end times
- Per-item `.ics` calendar export for adding one task or event to a calendar
- UTF-8-safe `.ics` line folding for long non-ASCII titles
- Offline app shell (service worker) so the page itself reloads without a network; requires HTTPS or localhost
- Notes window for loose thoughts separate from tasks
- Note search and timeline filters
- Compact note previews with long notes opening in a retro popup
- Copy button for notes
- Generated `README.txt` daily summary with today's schedule, done, overdue, weekly, and note counts
- Persistent desktop icon and window positions and sizes
- Offscreen window recovery
- Responsive desktop, tablet, and mobile layout, including 200% zoom and forced-colors modes
- Document language follows the browser locale used for dates
- Backward-compatible loading for older saved note/todo entries, with malformed dates repaired or treated as undated
- JSON backup export and non-destructive backup import
- Local-first storage with optional Firebase Google account sync

## Optional phone/laptop sync

1. Create or open a Firebase project.
2. In Firebase Authentication, enable Google sign-in.
3. In Firestore Database, create a database.
4. In Firestore Rules, use:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/planner/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. In Firebase Authentication settings, make sure the hosted app domain is authorized.
6. In `index.html`, paste your project values:

```js
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

7. Host this folder somewhere your phone can open it.
8. Open Notes, sign in with Google, then sign in with the same Google account on your phone.

The app stores each account separately at `users/{uid}/planner/state`. The app merges local and cloud items on sign-in. After that, task and note changes save locally first and then sync to Firestore.

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
