# Random Notes local planner

A retro desktop-style local planner for dated tasks and loose notes.

## What it does

Open the page in any modern browser and use it like a small Windows-95-style desktop. The Planner window handles dated tasks, the Notes window holds loose thoughts, and `README.txt` gives a daily status summary.

Everything is saved in `localStorage` first, so it still works in the same browser when you are offline. Optional Firebase sync can be enabled so the same Google account sees the same planner and notes on phone and laptop.

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
