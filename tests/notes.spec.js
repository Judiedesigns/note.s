const { test, expect } = require("@playwright/test");

function todayValue() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function addDaysValue(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
});

async function openNotesSurface(page) {
  const notesTab = page.getByRole("tab", { name: "Notes" });
  if (await notesTab.isVisible()) {
    await notesTab.click();
  } else {
    await page.getByRole("button", { name: "Open Notes" }).click();
  }
}

async function openPlannerSurface(page) {
  const plannerTab = page.getByRole("tab", { name: "Planner" });
  if (await plannerTab.isVisible()) {
    await plannerTab.click();
  } else {
    await page.getByRole("button", { name: "Open Planner" }).click();
  }
}

async function openReadmeSurface(page) {
  const readmeTab = page.getByRole("tab", { name: "README.txt" });
  if (await readmeTab.isVisible()) {
    await readmeTab.click();
  } else {
    await page.getByRole("button", { name: "Open README" }).click();
  }
}

async function openCalendarView(page, mode = "month") {
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await page.getByRole("tab", { name: mode === "week" ? "Week" : "Month", exact: true }).click();
}

async function openTodayView(page) {
  const sideToday = page.locator('.side-row[data-view="today"]');
  if (await sideToday.isVisible()) {
    await sideToday.click();
  } else {
    await page.locator('.planner-view-tab[data-planner-view="today"]').click();
  }
}

test("planner UI fits the viewport", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Open Planner" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Notes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open README" })).toBeVisible();
  await expect(page.getByLabel("Planner app")).toBeHidden();

  await page.getByRole("button", { name: "Open Planner" }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Calendar", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Week" })).toBeHidden();
  await expect(page.getByRole("tab", { name: "Month" })).toBeHidden();
  await expect(page.locator("#task-quick-input")).toBeVisible();
  await expect(page.getByPlaceholder("Add a task", { exact: true })).toBeHidden();
  await page.locator("#task-quick-input").fill("Plan the week");
  await page.locator("#task-quick-input").press("Control+Enter");
  await expect(page.getByPlaceholder("Add a task", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(page.getByPlaceholder("Add a task for today")).toHaveCount(0);
  await expect(page.getByLabel("Focus timer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export tasks to calendar" })).toBeVisible();

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(horizontalOverflow).toBe(false);
});

test("README opens as a generated daily checklist", async ({ page }) => {
  const yesterday = addDaysValue(-1);
  await page.evaluate(({ today, yesterday }) => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "one", type: "task", title: "Ship the morning draft", body: "", dueDate: today, done: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "two", type: "task", title: "Archive yesterday's clips", body: "", dueDate: yesterday, done: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "three", type: "note", title: "Loose note", body: "Keep this separate", dueDate: "", done: false, createdAt: Date.now(), updatedAt: Date.now() }
    ]));
  }, { today: todayValue(), yesterday });
  await page.reload({ waitUntil: "domcontentloaded" });
  await openReadmeSurface(page);

  const readme = page.getByLabel("README app");
  await expect(readme).toBeVisible();
  await expect(readme.locator("#readme-content")).toContainText("README.txt");
  await expect(readme.locator("#readme-content")).toContainText("DAILY TO DO");
  await expect(readme.locator("#readme-content")).toContainText("[ ] Ship the morning draft");
  await expect(readme.locator("#readme-content")).toContainText("[ ] Archive yesterday's clips");
  await expect(readme.locator("#readme-content")).toContainText("Week:");
  await expect(readme.locator("#readme-content")).toContainText("Notes: 1");
  await expect(page.getByLabel("Planner app")).toBeHidden();
});

test("adds and completes a task for today", async ({ page }) => {
  await openPlannerSurface(page);
  await page.locator("#task-quick-input").fill("Edit script and film B-roll");
  await page.locator("#task-quick-input").press("Enter");

  const plannerWindow = page.getByLabel("Planner app");
  await expect(plannerWindow.getByLabel("Saved tasks").getByText("Edit script and film B-roll")).toBeVisible();
  await expect(plannerWindow.getByText("1 task | 1 open")).toBeVisible();

  const checkbox = plannerWindow.getByRole("checkbox", { name: "Mark task as done" });
  await checkbox.click();
  await expect(plannerWindow.getByText("1 task | 0 open")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);
  const reloadedPlannerWindow = page.getByLabel("Planner app");
  await expect(reloadedPlannerWindow.getByRole("checkbox", { name: "Mark task as open" })).toBeChecked();
  await expect(reloadedPlannerWindow.getByText("1 task | 0 open")).toBeVisible();
});

test("quick capture keeps focus for consecutive tasks", async ({ page }) => {
  await openPlannerSurface(page);
  const quickInput = page.locator("#task-quick-input");
  await expect(quickInput).toBeFocused();

  await quickInput.fill("First quick task");
  await quickInput.press("Enter");
  await quickInput.fill("Second quick task");
  await quickInput.press("Enter");

  const plannerWindow = page.getByLabel("Planner app");
  await expect(plannerWindow.getByText("First quick task")).toBeVisible();
  await expect(plannerWindow.getByText("Second quick task")).toBeVisible();
  await expect(quickInput).toHaveValue("");
  await expect(quickInput).toBeFocused();
});

test("Tab in quick capture keeps normal keyboard navigation", async ({ page }) => {
  await openPlannerSurface(page);
  const quickInput = page.locator("#task-quick-input");
  await quickInput.click();
  await quickInput.press("Tab");

  // The full form must not open, and focus must not jump into the title field.
  await expect(quickInput).toBeVisible();
  await expect(page.locator("#task-title")).not.toBeFocused();
  await expect(page.getByPlaceholder("Add a task", { exact: true })).toBeHidden();
});

test("Enter during IME composition does not add a partial task", async ({ page }) => {
  await openPlannerSurface(page);
  const quickInput = page.locator("#task-quick-input");
  await quickInput.fill("にほん");

  await quickInput.evaluate(element => {
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    Object.defineProperty(event, "isComposing", { get: () => true });
    element.dispatchEvent(event);
  });

  await expect(page.getByLabel("Planner app").getByText("0 tasks | 0 open")).toBeVisible();
  await expect(quickInput).toHaveValue("にほん");
});

test("overdue tasks are labelled in the list", async ({ page }) => {
  await page.evaluate(({ yesterday }) => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "late", type: "task", title: "Send the invoice", body: "", dueDate: yesterday, planView: "today", done: false, createdAt: Date.now(), updatedAt: Date.now() }
    ]));
  }, { yesterday: addDaysValue(-1) });
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);

  const card = page.getByLabel("Planner app").locator(".task-card", { hasText: "Send the invoice" });
  await expect(card).toHaveClass(/is-overdue/);
  await expect(card).toContainText("Overdue ·");
});

test("opening notes focuses the composer and Cmd+Enter saves", async ({ page }) => {
  await openNotesSurface(page);
  const noteBody = page.getByRole("textbox", { name: "body" });
  await expect(noteBody).toBeFocused();

  await noteBody.fill("Captured without clicking Save");
  await noteBody.press("Meta+Enter");

  await expect(page.getByText("1 note")).toBeVisible();
  await expect(noteBody).toHaveValue("");
  await expect(noteBody).toBeFocused();
});

test("keyboard shortcuts jump straight to task and note capture", async ({ page }) => {
  await page.keyboard.press("t");
  await expect(page.getByLabel("Planner app")).toBeVisible();
  await expect(page.locator("#task-quick-input")).toBeFocused();

  await page.keyboard.press("Escape");
  await page.keyboard.press("n");
  await expect(page.getByLabel("Notes app")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "body" })).toBeFocused();
});

test("exports dated tasks to a calendar file", async ({ page }) => {
  await openPlannerSurface(page);
  await page.locator("#task-quick-input").fill("Review calendar sync");
  await page.locator("#task-quick-input").press("Enter");

  page.once("dialog", async dialog => {
    expect(dialog.message()).toContain("Export 1 task to a calendar file?");
    await dialog.accept();
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export tasks to calendar" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^random-notes-calendar-\d{4}-\d{2}-\d{2}\.ics$/);

  const path = await download.path();
  const content = require("fs").readFileSync(path, "utf8");
  expect(content).toContain("BEGIN:VCALENDAR");
  expect(content).toContain("BEGIN:VEVENT");
  expect(content).toContain("SUMMARY:Review calendar sync");
  expect(content).toContain(`DTSTART;VALUE=DATE:${todayValue().replaceAll("-", "")}`);
  expect(content).toContain("DESCRIPTION:Status: Open");
  expect(content).toContain("END:VCALENDAR");
});

test("exports one selected task to a calendar file", async ({ page }) => {
  const today = todayValue();
  await page.evaluate(dueDate => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "one", type: "task", title: "Call the venue", body: "", dueDate, planView: "today", done: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "two", type: "task", title: "Buy tape", body: "", dueDate, planView: "today", done: false, createdAt: Date.now() - 1, updatedAt: Date.now() - 1 }
    ]));
  }, today);
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);

  page.once("dialog", async dialog => {
    expect(dialog.message()).toContain('Add "Call the venue" to your calendar?');
    await dialog.accept();
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add Call the venue to calendar" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`random-notes-call-the-venue-${today}.ics`);

  const path = await download.path();
  const content = require("fs").readFileSync(path, "utf8");
  expect(content).toContain("SUMMARY:Call the venue");
  expect(content).not.toContain("SUMMARY:Buy tape");
});

test("calendar views place tasks by due date", async ({ page }) => {
  // Fixed Wednesday 4 Nov 2026 so month/week boundaries are predictable in
  // every project (desktop, tablet, mobile).
  await page.clock.setFixedTime(new Date(2026, 10, 4, 12, 0, 0));
  const dates = {
    today: "2026-11-04",
    sameWeek: "2026-11-06",
    sameMonth: "2026-11-18",
    nextMonth: "2026-12-02"
  };
  await page.evaluate(dates => {
    const now = Date.now();
    const task = (id, title, dueDate, index) => ({
      id, type: "task", title, body: "", dueDate,
      done: false, createdAt: now - index, updatedAt: now - index
    });
    localStorage.setItem("random_notes_v1", JSON.stringify([
      task("one", "Today task", dates.today, 0),
      task("two", "Friday task", dates.sameWeek, 1),
      task("three", "Mid-month task", dates.sameMonth, 2),
      task("four", "December task", dates.nextMonth, 3),
      task("five", "Undated task", "", 4),
      task("six", "Extra one", dates.today, 5),
      task("seven", "Extra two", dates.today, 6),
      task("eight", "Extra three", dates.today, 7)
    ]));
  }, dates);
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);

  const agenda = page.getByLabel("Saved tasks");
  await expect(agenda.getByText("Today task", { exact: true })).toBeVisible();
  await expect(agenda.getByText("Undated task", { exact: true })).toBeVisible();
  await expect(agenda.getByText("Friday task", { exact: true })).toBeHidden();
  await expect(agenda.getByText("December task", { exact: true })).toBeHidden();

  const calendar = page.locator("#calendar-view");
  await openCalendarView(page, "week");
  await expect(page.locator("#view-title")).toContainText("2026");
  await expect(calendar.getByRole("button", { name: "Today task" })).toBeVisible();
  await expect(calendar.getByRole("button", { name: "Friday task" })).toBeVisible();
  await expect(calendar.getByRole("button", { name: "Mid-month task" })).toBeHidden();
  await expect(calendar.getByRole("button", { name: "December task" })).toBeHidden();
  await expect(calendar.getByRole("group", { name: "Tasks with no date" })).toContainText("Undated task");

  await page.getByRole("tab", { name: "Month" }).click();
  await expect(page.locator("#view-title")).toContainText("2026");
  const novemberTitle = await page.locator("#view-title").innerText();
  await expect(calendar.getByRole("button", { name: "Today task" })).toBeVisible();
  await expect(calendar.getByRole("button", { name: "Friday task" })).toBeVisible();
  await expect(calendar.getByRole("button", { name: "Mid-month task" })).toBeVisible();
  await expect(calendar.locator('.calendar-day[data-date="2026-12-02"]')).toHaveClass(/is-outside/);

  const todayCell = page.locator('.calendar-day[data-date="2026-11-04"]');
  await expect(todayCell.locator(".calendar-chip")).toHaveCount(3);
  await todayCell.locator(".calendar-more").click();
  await expect(todayCell.locator(".calendar-chip")).toHaveCount(4);
  await expect(todayCell.locator(".calendar-more")).toHaveText("Show less");

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator("#view-title")).not.toHaveText(novemberTitle);
  await expect(calendar.getByRole("button", { name: "December task" })).toBeVisible();
  await expect(calendar.getByRole("button", { name: "Today task" })).toBeHidden();
  await expect(calendar.getByRole("group", { name: "Tasks with no date" })).toContainText("Undated task");
});

test("calendar destination remembers the last week or month mode", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 12, 0, 0));
  await page.evaluate(() => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "one", type: "task", title: "Today task", body: "", dueDate: "2026-11-04", done: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "two", type: "task", title: "Friday task", body: "", dueDate: "2026-11-06", done: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "three", type: "task", title: "Next week task", body: "", dueDate: "2026-11-12", done: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "four", type: "task", title: "December task", body: "", dueDate: "2026-12-01", done: false, createdAt: Date.now(), updatedAt: Date.now() }
    ]));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);

  const calendarButton = page.getByRole("button", { name: "Calendar", exact: true });
  const weekTab = page.getByRole("tab", { name: "Week", exact: true });
  const monthTab = page.getByRole("tab", { name: "Month", exact: true });

  await expect(weekTab).toBeHidden();
  await expect(monthTab).toBeHidden();
  await expect(page.locator('[data-side-count="today"]')).toHaveText("1");
  await expect(page.locator('[data-side-count="calendar"]')).toHaveText("3");

  await calendarButton.click();
  await expect(monthTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#view-title")).toContainText("November 2026");
  await expect(page.locator('[data-side-count="calendar"]')).toHaveText("3");

  await weekTab.click();
  await expect(weekTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-side-count="calendar"]')).toHaveText("2");

  await openTodayView(page);
  await expect(weekTab).toBeHidden();
  await expect(page.locator('[data-side-count="calendar"]')).toHaveText("2");

  await calendarButton.click();
  await expect(weekTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#view-title")).not.toContainText("November 2026");

  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);
  await expect(weekTab).toBeVisible();
  await expect(weekTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#calendar-view")).toBeVisible();
});

test("month grid supports arrow-key navigation and day popover", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 12, 0, 0));
  await page.evaluate(() => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "one", type: "task", title: "Today task", body: "", dueDate: "2026-11-04", done: false, createdAt: Date.now(), updatedAt: Date.now() }
    ]));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);
  await openCalendarView(page, "month");

  const todayCell = page.locator('.calendar-day[data-date="2026-11-04"]');
  await todayCell.focus();
  await todayCell.press("ArrowRight");
  await expect(page.locator('.calendar-day[data-date="2026-11-05"]')).toBeFocused();

  await page.locator('.calendar-day[data-date="2026-11-04"] .calendar-day-num').click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Today task");
  await dialog.getByRole("checkbox", { name: "Mark Today task as done" }).click();
  await expect(dialog.getByRole("checkbox", { name: "Mark Today task as open" })).toBeChecked();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("#calendar-view").getByRole("button", { name: "Today task (done)" })).toBeVisible();
});

test("adding from a calendar day presets the task date", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 12, 0, 0));
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);
  await openCalendarView(page, "month");

  await page.locator('.calendar-day[data-date="2026-11-18"] .calendar-day-num').click();
  await page.getByRole("button", { name: "+ Add task" }).click();
  await expect(page.getByRole("textbox", { name: "Task", exact: true })).toBeVisible();
  await expect(page.locator("#task-date")).toHaveValue("2026-11-18");

  await page.getByRole("textbox", { name: "Task", exact: true }).fill("Plan the offsite");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("#calendar-view").getByRole("button", { name: "Plan the offsite" })).toBeVisible();
});

test("planner handles a long task queue with compact expandable rows", async ({ page }) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 780) test.skip();

  const today = todayValue();
  await page.evaluate(dueDate => {
    const now = Date.now();
    const tasks = Array.from({ length: 24 }, (_, index) => ({
      id: `task-${index}`,
      type: "task",
      title: `Queue task ${index + 1}`,
      body: `Details for queue task ${index + 1}`,
      dueDate,
      done: false,
      createdAt: now - index,
      updatedAt: now - index
    }));
    localStorage.setItem("random_notes_v1", JSON.stringify(tasks));
  }, today);
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);

  const taskList = page.getByLabel("Saved tasks");
  await expect(taskList.getByRole("heading", { name: "Queue task 1", exact: true })).toBeVisible();

  const scrollState = await taskList.evaluate(element => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY
  }));
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
  expect(scrollState.overflowY).toBe("auto");

  const firstTask = page.getByRole("group", { name: "Task Queue task 1", exact: true });
  await expect(firstTask.locator(".task-details")).toBeHidden();
  await firstTask.click();
  await expect(firstTask.locator(".task-details")).toBeVisible();
});

test("notes view captures loose thoughts separately", async ({ page }) => {
  await openNotesSurface(page);
  await expect(page.getByRole("heading", { name: "notes", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "saved notes", exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Drop a thought… ⌘↵ to save")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Add Note" })).toBeVisible();

  await page.getByRole("textbox", { name: "body" }).fill("Hook idea\nTry a softer intro before the task list.");
  await page.getByRole("button", { name: "+ Add Note" }).click();

  await expect(page.getByText("1 note")).toBeVisible();
  const notePreview = page.getByRole("group", { name: "Note preview" });
  await expect(notePreview.locator(".note-preview")).toContainText("Hook idea");
  await notePreview.click();
  const notePopup = page.getByRole("dialog", { name: /Note \|/ });
  await expect(notePopup).toBeVisible();
  await expect(notePopup.locator("#note-popup-text")).toContainText("Try a softer intro before the task list.");
  await notePopup.getByRole("button", { name: "Done" }).click();
  await expect(notePopup).toBeHidden();

  await openPlannerSurface(page);
  await expect(page.getByLabel("Saved tasks").getByText("Hook idea")).toBeHidden();

  await page.reload({ waitUntil: "domcontentloaded" });
  await openNotesSurface(page);
  await expect(page.getByRole("group", { name: "Note preview" }).locator(".note-preview")).toContainText("Hook idea");
});

test("exports a JSON backup of local items", async ({ page }) => {
  const now = Date.now();
  await page.evaluate(now => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "backup-note", type: "note", title: "Backup note", body: "Keep this safe", dueDate: "", done: false, createdAt: now, updatedAt: now }
    ]));
  }, now);
  await page.reload({ waitUntil: "domcontentloaded" });
  await openNotesSurface(page);

  await page.getByRole("button", { name: "Sync" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^random-notes-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const path = await download.path();
  const backup = JSON.parse(require("fs").readFileSync(path, "utf8"));
  expect(backup.app).toBe("random-notes-planner");
  expect(backup.items).toHaveLength(1);
  expect(backup.items[0].body).toBe("Keep this safe");
});

test("imports a JSON backup by merging with local items", async ({ page }) => {
  const now = Date.now();
  await page.evaluate(now => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "local-note", type: "note", title: "Local note", body: "Already here", dueDate: "", done: false, createdAt: now, updatedAt: now }
    ]));
  }, now);
  await page.reload({ waitUntil: "domcontentloaded" });
  await openNotesSurface(page);
  await page.getByRole("button", { name: "Sync" }).click();

  page.once("dialog", async dialog => {
    expect(dialog.message()).toContain("Import 1 item from backup?");
    await dialog.accept();
  });
  await page.locator("#backup-file").setInputFiles({
    name: "random-notes-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      app: "random-notes-planner",
      version: 1,
      items: [
        { id: "imported-note", type: "note", title: "Imported note", body: "From backup", dueDate: "", done: false, createdAt: now + 1, updatedAt: now + 1 }
      ]
    }))
  });

  await expect(page.getByText("2 notes")).toBeVisible();
  await expect(page.getByRole("group", { name: "Note preview" }).filter({ hasText: "Already here" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Note preview" }).filter({ hasText: "From backup" })).toBeVisible();
});

test("notes can be searched and filtered", async ({ page }) => {
  const now = Date.now();
  const lastWeek = now - 8 * 24 * 60 * 60 * 1000;
  await page.evaluate(({ now, lastWeek }) => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "one", type: "note", title: "Today clip", body: "Find the color reference", dueDate: "", done: false, createdAt: now, updatedAt: now },
      { id: "two", type: "note", title: "Archive idea", body: "Old location note", dueDate: "", done: false, createdAt: lastWeek, updatedAt: lastWeek },
      { id: "three", type: "note", title: "Morning note", body: "Call sheet question", dueDate: "", done: false, createdAt: now, updatedAt: now }
    ]));
  }, { now, lastWeek });
  await page.reload({ waitUntil: "domcontentloaded" });
  await openNotesSurface(page);

  const notesWindow = page.getByLabel("Notes app");
  await expect(notesWindow.getByText("3 notes")).toBeVisible();

  await notesWindow.getByRole("searchbox", { name: "Search notes" }).fill("color");
  await expect(notesWindow.getByText("1 of 3 notes")).toBeVisible();
  await expect(notesWindow.locator(".note-preview", { hasText: "Find the color reference" })).toBeVisible();
  await expect(notesWindow.locator(".note-preview", { hasText: "Old location note" })).toBeHidden();

  await notesWindow.getByRole("button", { name: "Filter notes by timeline" }).click();
  await notesWindow.getByRole("menuitemradio", { name: "Today" }).click();
  await expect(notesWindow.getByText("1 of 3 notes")).toBeVisible();

  await notesWindow.getByRole("searchbox", { name: "Search notes" }).fill("");
  await expect(notesWindow.getByText("2 of 3 notes")).toBeVisible();
  await expect(notesWindow.locator(".note-preview", { hasText: "Old location note" })).toBeHidden();

  await notesWindow.getByRole("button", { name: "Filter notes by timeline" }).click();
  await notesWindow.getByRole("menuitemradio", { name: "All" }).click();
  await expect(notesWindow.getByText("3 notes")).toBeVisible();
  await expect(notesWindow.locator(".note-preview", { hasText: "Old location note" })).toBeVisible();
});

test("notes list reveals large archives in batches", async ({ page }) => {
  const now = Date.now();
  await page.evaluate(now => {
    const notes = Array.from({ length: 25 }, (_, index) => ({
      id: `note-${index}`,
      type: "note",
      title: `Archive note ${index + 1}`,
      body: index === 24 ? "Deep archive keyword" : `Archive note ${index + 1}`,
      dueDate: "",
      done: false,
      createdAt: now - index,
      updatedAt: now - index
    }));
    localStorage.setItem("random_notes_v1", JSON.stringify(notes));
  }, now);
  await page.reload({ waitUntil: "domcontentloaded" });
  await openNotesSurface(page);

  const notesWindow = page.getByLabel("Notes app");
  await expect(notesWindow.getByText("25 notes")).toBeVisible();
  await expect(notesWindow.locator(".note-card")).toHaveCount(10);
  await expect(notesWindow.getByRole("button", { name: "Show 10 more" })).toBeVisible();

  await notesWindow.getByRole("button", { name: "Show 10 more" }).click();
  await expect(notesWindow.locator(".note-card")).toHaveCount(20);
  await expect(notesWindow.getByRole("button", { name: "Show 5 more" })).toBeVisible();

  await notesWindow.getByRole("searchbox", { name: "Search notes" }).fill("Deep archive keyword");
  await expect(notesWindow.getByText("1 of 25 notes")).toBeVisible();
  await expect(notesWindow.locator(".note-card")).toHaveCount(1);
  await expect(notesWindow.locator(".note-preview")).toContainText("Deep archive keyword");
  await expect(notesWindow.getByRole("button", { name: /Show .* more/ })).toHaveCount(0);
});

test("short notes do not show expansion controls", async ({ page }) => {
  const now = Date.now();
  await page.evaluate(now => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "short", type: "note", title: "Short note", body: "Buy stamps", dueDate: "", done: false, createdAt: now, updatedAt: now },
      { id: "long", type: "note", title: "Long note", body: "This note is intentionally long enough to require a preview control because the full text should not all be treated as already visible in the compact archive.", dueDate: "", done: false, createdAt: now - 1, updatedAt: now - 1 }
    ]));
  }, now);
  await page.reload({ waitUntil: "domcontentloaded" });
  await openNotesSurface(page);

  const notesWindow = page.getByLabel("Notes app");
  const shortNote = notesWindow.locator(".note-card", { hasText: "Buy stamps" });
  await expect(shortNote.getByRole("button", { name: "Show full note" })).toHaveCount(0);

  const longNote = notesWindow.locator(".note-card", { hasText: "This note is intentionally long" });
  await expect(longNote.getByRole("button", { name: "Show full note" })).toBeVisible();
});

test("long note previews wrap without clipping actions", async ({ page }) => {
  const longPreview = "I want to study human-centered digital product design focusing on how designers understand complex workflows and make better tools";
  await page.evaluate(body => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "long-preview", type: "note", title: body, body, dueDate: "", done: false, createdAt: Date.now(), updatedAt: Date.now() }
    ]));
  }, longPreview);
  await page.reload({ waitUntil: "domcontentloaded" });
  await openNotesSurface(page);

  const note = page.getByLabel("Notes app").locator(".note-card", { hasText: "human-centered" });
  await expect(note).toBeVisible();
  const layout = await note.evaluate(element => {
    const preview = element.querySelector(".note-preview");
    return {
      cardOverflows: element.scrollWidth > element.clientWidth + 1,
      previewOverflows: preview.scrollWidth > preview.clientWidth + 1,
      actionsWidth: element.querySelector(".note-actions").getBoundingClientRect().width
    };
  });
  expect(layout.cardOverflows).toBe(false);
  expect(layout.previewOverflows).toBe(false);
  expect(layout.actionsWidth).toBeGreaterThan(0);
});

test("notes can be copied and long notes open in a popup", async ({ page }) => {
  const noteBody = "This note should copy cleanly.\nIt is long enough to open in a popup instead of expanding inside the card.";
  await page.evaluate(body => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "copy-note", type: "note", title: "Copy note", body, dueDate: "", done: false, createdAt: Date.now(), updatedAt: Date.now() }
    ]));
  }, noteBody);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.__copiedText = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async text => {
          window.__copiedText = text;
        }
      }
    });
  });
  await openNotesSurface(page);

  const note = page.getByLabel("Notes app").locator(".note-card", { hasText: "This note should copy cleanly" });
  await note.getByRole("button", { name: "Copy note" }).click();
  await expect(page.locator("#toast")).toHaveText("Note copied.");
  await expect.poll(() => page.evaluate(() => window.__copiedText)).toBe(noteBody);

  await note.getByRole("button", { name: "Show full note" }).click();
  const notePopup = page.getByRole("dialog", { name: /Note \|/ });
  await expect(notePopup).toBeVisible();
  await expect(notePopup.locator("#note-popup-text")).toContainText("instead of expanding inside the card");

  const popupStyle = await notePopup.locator("#note-popup-text").evaluate(element => {
    const styles = getComputedStyle(element);
    return {
      whiteSpace: styles.whiteSpace,
      overflowY: styles.overflowY
    };
  });
  expect(popupStyle.whiteSpace).toBe("pre-wrap");
  expect(["auto", "scroll"]).toContain(popupStyle.overflowY);

  await notePopup.getByRole("button", { name: "Close full note" }).click();
  await expect(notePopup).toBeHidden();
});

test("note popup respects a reduced mobile visual viewport", async ({ page }) => {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width > 520) test.skip();

  await page.addInitScript(() => {
    const listeners = {};
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        height: 520,
        offsetTop: 0,
        addEventListener: (name, callback) => {
          listeners[name] = callback;
        },
        removeEventListener: () => {}
      }
    });
  });

  await page.evaluate(() => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "reduced", type: "note", title: "Reduced viewport", body: "This note opens while mobile browser controls reduce the real visible area.\n\nThe popup actions should stay above the taskbar.", dueDate: "", done: false, createdAt: Date.now(), updatedAt: Date.now() }
    ]));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await openNotesSurface(page);
  await page.getByRole("button", { name: "Show full note" }).click();

  const popupBox = await page.locator(".note-popup-window").boundingBox();
  const actionsBox = await page.locator(".note-popup-actions").boundingBox();
  expect(popupBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(520 - 28 + 1);
  expect(actionsBox.y + actionsBox.height).toBeLessThanOrEqual(520 - 28 + 1);
});

test("delete asks for confirmation", async ({ page }) => {
  await page.evaluate(today => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "one", type: "task", title: "Keep or remove this", body: "Decide", dueDate: today, done: false, createdAt: Date.now(), updatedAt: Date.now() }
    ]));
  }, todayValue());
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);

  page.once("dialog", async dialog => {
    expect(dialog.message()).toContain("Delete this task?");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Delete task" }).click();
  await expect(page.getByLabel("Saved tasks").getByText("Keep or remove this")).toBeVisible();
  await expect(page.locator("#toast")).toHaveText("Item kept.");

  page.once("dialog", async dialog => {
    expect(dialog.message()).toContain("Delete this task?");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Delete task" }).click();
  await expect(page.getByLabel("Saved tasks").getByText("Keep or remove this")).toBeHidden();
  await expect(page.locator("#toast")).toHaveText("Item deleted.");
});

test("edit updates a task in place", async ({ page }) => {
  await page.evaluate(today => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "one", type: "task", title: "Rewrite this task", body: "Tighten copy", dueDate: today, done: false, createdAt: Date.now(), updatedAt: Date.now() }
    ]));
  }, todayValue());
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);

  await page.getByRole("button", { name: "Edit task" }).click();
  await expect(page.getByRole("textbox", { name: "Task", exact: true })).toHaveValue("Rewrite this task");
  await expect(page.getByRole("textbox", { name: "Details" })).toHaveCount(0);
  await expect(page.getByLabel("Saved tasks").getByText("Rewrite this task")).toBeVisible();

  await page.getByRole("textbox", { name: "Task", exact: true }).fill("Rewrite this task again");
  await page.getByRole("button", { name: "Update Task" }).click();

  await expect(page.getByLabel("Saved tasks").getByText("Rewrite this task again")).toBeVisible();
  await expect(page.getByLabel("Saved tasks").getByText("Rewrite this task", { exact: true })).toBeHidden();
  await expect(page.locator("#toast")).toHaveText("Task updated.");
});

test("planner filters open and completed tasks", async ({ page }) => {
  await page.evaluate(today => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "one", type: "task", title: "Open task", body: "", dueDate: today, done: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "two", type: "task", title: "Done task", body: "", dueDate: today, done: true, createdAt: Date.now() - 1, updatedAt: Date.now() - 1 }
    ]));
  }, todayValue());
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);

  await expect(page.getByLabel("Saved tasks").getByText("Open task")).toBeVisible();
  await expect(page.getByLabel("Saved tasks").getByText("Done task")).toBeVisible();

  await page.getByRole("button", { name: "Task status filter" }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByLabel("Saved tasks").getByText("Open task")).toBeVisible();
  await expect(page.getByLabel("Saved tasks").getByText("Done task")).toBeHidden();

  await page.getByRole("button", { name: "Task status filter" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByLabel("Saved tasks").getByText("Open task")).toBeHidden();
  await expect(page.getByLabel("Saved tasks").getByText("Done task")).toBeVisible();
});

test("migrates old note and todo entries", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "old-task", note: "Launch thought", todo: "Send checklist", done: false, ts: Date.now() },
      { id: "old-note", note: "Plain note", todo: "", done: false, ts: Date.now() }
    ]));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);

  await expect(page.getByLabel("Saved tasks").getByText("Send checklist")).toBeVisible();
  const migratedTask = page.getByRole("group", { name: "Task Send checklist" });
  await expect(migratedTask.locator(".task-details")).toBeHidden();
  await migratedTask.click();
  await expect(migratedTask.locator(".task-details")).toContainText("Launch thought");

  await openNotesSurface(page);
  await expect(page.getByRole("group", { name: "Note preview" }).locator(".note-preview")).toContainText("Plain note");
});

test("desktop window controls open, minimize, close, and full screen", async ({ page }) => {
  const plannerWindow = page.getByLabel("Planner app");

  await expect(plannerWindow).toBeHidden();
  await page.getByRole("button", { name: "Open Planner" }).click();
  await expect(plannerWindow).toBeVisible();

  await page.getByRole("button", { name: "Full screen Planner" }).click();
  await expect(plannerWindow).toHaveClass(/window-fullscreen/);

  await page.getByRole("button", { name: "Full screen Planner" }).click();
  await expect(plannerWindow).not.toHaveClass(/window-fullscreen/);

  await page.getByRole("button", { name: "Minimize Planner" }).click();
  await expect(plannerWindow).toBeHidden();

  await page.getByRole("button", { name: "Open Planner" }).click();
  await expect(plannerWindow).toBeVisible();

  await page.getByRole("button", { name: "Close Planner" }).click();
  await expect(plannerWindow).toBeHidden();

  await page.getByRole("button", { name: "Open Planner" }).click();
  await expect(plannerWindow).toBeVisible();
});

test("taskbar buttons open windows and start shows desktop", async ({ page }) => {
  const taskbar = page.getByLabel("Taskbar");
  const plannerWindow = page.getByLabel("Planner app");
  const notesWindow = page.getByLabel("Notes app");

  await taskbar.getByRole("button", { name: "Planner" }).click();
  await expect(plannerWindow).toBeVisible();
  await expect(taskbar.getByRole("button", { name: "Planner" })).toHaveAttribute("aria-pressed", "true");

  await taskbar.getByRole("button", { name: "Notes" }).click();
  await expect(notesWindow).toBeVisible();
  await expect(notesWindow).toHaveClass(/active-surface/);
  await expect(taskbar.getByRole("button", { name: "Notes" })).toHaveAttribute("aria-pressed", "true");

  await taskbar.getByRole("button", { name: "Start" }).click();
  await expect(plannerWindow).toBeHidden();
  await expect(notesWindow).toBeHidden();
});

test("desktop icons bring opened windows to the front", async ({ page }) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 780) test.skip();

  await page.getByRole("button", { name: "Open Planner" }).click();
  await page.getByRole("button", { name: "Open Notes" }).click();

  const notesWindow = page.getByLabel("Notes app");
  await expect(notesWindow).toBeVisible();
  await expect(notesWindow).toHaveClass(/active-surface/);

  let frontWindow = await page.evaluate(() => {
    const titlebar = document.querySelector("[data-surface='notes'] .window-titlebar");
    const rect = titlebar.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest("[data-surface]")?.dataset.surface;
  });
  expect(frontWindow).toBe("notes");

  await page.getByRole("button", { name: "Open README" }).click();

  const readmeWindow = page.getByLabel("README app");
  await expect(readmeWindow).toBeVisible();
  await expect(readmeWindow).toHaveClass(/active-surface/);

  frontWindow = await page.evaluate(() => {
    const titlebar = document.querySelector("[data-surface='readme'] .window-titlebar");
    const rect = titlebar.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest("[data-surface]")?.dataset.surface;
  });
  expect(frontWindow).toBe("readme");
});

test("desktop icons recover windows from stale offscreen positions", async ({ page }) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 780) test.skip();

  await page.evaluate(() => {
    localStorage.setItem("random_notes_window_positions_v1", JSON.stringify({
      notes: { left: 9999, top: 9999, width: 380, zIndex: "4" }
    }));
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Open Planner" }).click();
  await page.getByRole("button", { name: "Open Notes" }).click();

  const notesWindow = page.getByLabel("Notes app");
  await expect(notesWindow).toBeVisible();
  await expect(notesWindow).toHaveClass(/active-surface/);

  const result = await page.evaluate(() => {
    const notes = document.querySelector("[data-surface='notes']");
    const titlebar = notes.querySelector(".window-titlebar");
    const rect = notes.getBoundingClientRect();
    const titleRect = titlebar.getBoundingClientRect();
    return {
      visibleHorizontally: rect.left < window.innerWidth - 96 && rect.right > 96,
      visibleVertically: rect.top < window.innerHeight - 68 && rect.bottom > 96,
      frontWindow: document.elementFromPoint(
        titleRect.left + Math.min(titleRect.width / 2, 120),
        titleRect.top + titleRect.height / 2
      )?.closest("[data-surface]")?.dataset.surface
    };
  });

  expect(result.visibleHorizontally).toBe(true);
  expect(result.visibleVertically).toBe(true);
  expect(result.frontWindow).toBe("notes");
});

test("desktop icons can be dragged and keep their position", async ({ page }) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 780) test.skip();

  const plannerIcon = page.getByRole("button", { name: "Open Planner" });
  const before = await plannerIcon.boundingBox();
  expect(before).toBeTruthy();

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 96, before.y + before.height / 2 + 72, { steps: 4 });
  await page.mouse.up();

  const after = await plannerIcon.boundingBox();
  expect(after.x).toBeGreaterThan(before.x + 80);
  expect(after.y).toBeGreaterThan(before.y + 56);
  await expect(page.getByLabel("Planner app")).toBeHidden();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("random_notes_icon_positions_v1")));
  expect(saved.planner.left).toBeCloseTo(after.x, 1);
  expect(saved.planner.top).toBeCloseTo(after.y, 1);

  await page.reload({ waitUntil: "domcontentloaded" });
  const restored = await plannerIcon.boundingBox();
  expect(restored.x).toBeCloseTo(after.x, 1);
  expect(restored.y).toBeCloseTo(after.y, 1);
});

test("desktop windows can be dragged and keep their position", async ({ page }) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 780) test.skip();

  await page.getByRole("button", { name: "Open Notes" }).click();
  const notesWindow = page.getByLabel("Notes app");
  await expect(notesWindow).toBeVisible();

  const before = await notesWindow.boundingBox();
  const titlebar = notesWindow.locator(".window-titlebar");
  const handle = await titlebar.boundingBox();
  expect(before).toBeTruthy();
  expect(handle).toBeTruthy();

  // Traffic lights sit in the top-left of the title bar, so grab a neutral area.
  const grabX = handle.x + handle.width - 100;
  await page.mouse.move(grabX, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(grabX - 90, handle.y + 68, { steps: 8 });
  await page.mouse.up();

  const after = await notesWindow.boundingBox();
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(20);
  expect(Math.abs(after.y - before.y)).toBeGreaterThan(20);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open Notes" }).click();
  const restored = await page.getByLabel("Notes app").boundingBox();
  expect(Math.abs(restored.x - after.x)).toBeLessThanOrEqual(3);
  expect(Math.abs(restored.y - after.y)).toBeLessThanOrEqual(3);
});

test("desktop windows can be dragged upward", async ({ page }) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 780) test.skip();

  await page.getByRole("button", { name: "Open Planner" }).click();
  const plannerWindow = page.getByLabel("Planner app");
  await expect(plannerWindow).toBeVisible();

  const before = await plannerWindow.boundingBox();
  const titlebar = plannerWindow.locator(".window-titlebar");
  const handle = await titlebar.boundingBox();
  expect(before).toBeTruthy();
  expect(handle).toBeTruthy();

  // Traffic lights sit in the top-left of the title bar, so grab a neutral area.
  const grabX = handle.x + handle.width - 100;
  await page.mouse.move(grabX, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(grabX + 16, handle.y - 120, { steps: 8 });
  await page.mouse.up();

  const after = await plannerWindow.boundingBox();
  expect(after.y).toBeLessThan(before.y - 20);
  expect(after.y).toBeGreaterThanOrEqual(0);
});

test("desktop windows can be resized and keep their size", async ({ page }) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 780) test.skip();

  await page.getByRole("button", { name: "Open Planner" }).click();
  const plannerWindow = page.getByLabel("Planner app");
  await expect(plannerWindow).toBeVisible();

  const before = await plannerWindow.boundingBox();
  const rightGrip = await plannerWindow.locator('.window-resize-handle[data-resize="e"]').boundingBox();
  const cornerGrip = await plannerWindow.locator('.window-resize-handle[data-resize="se"]').boundingBox();
  expect(before).toBeTruthy();
  expect(rightGrip).toBeTruthy();
  expect(cornerGrip).toBeTruthy();

  // The right edge is the main resize affordance: drag it wider.
  const rightX = rightGrip.x + rightGrip.width / 2;
  const rightY = rightGrip.y + rightGrip.height / 2;
  const rightHit = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return element && element.dataset ? element.dataset.resize : null;
  }, { x: rightX, y: rightY });
  expect(rightHit).toBe("e");

  await page.mouse.move(rightX, rightY);
  await page.mouse.down();
  await page.mouse.move(rightX + 180, rightY, { steps: 8 });
  await page.mouse.up();

  const wider = await plannerWindow.boundingBox();
  expect(wider.width).toBeGreaterThan(before.width + 100);

  // The bottom-right corner still changes the height. Re-query it because the
  // window (and therefore the grip) moved when it got wider.
  const movedCorner = await plannerWindow.locator('.window-resize-handle[data-resize="se"]').boundingBox();
  const cornerX = movedCorner.x + movedCorner.width / 2;
  const cornerY = movedCorner.y + movedCorner.height / 2;
  await page.mouse.move(cornerX, cornerY);
  await page.mouse.down();
  await page.mouse.move(cornerX, cornerY + 120, { steps: 8 });
  await page.mouse.up();

  const after = await plannerWindow.boundingBox();
  expect(after.height).toBeGreaterThan(before.height + 60);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("random_notes_window_positions_v1")).planner);
  expect(saved.width).toBeGreaterThan(before.width);
  expect(saved.height).toBeGreaterThan(before.height);

  // Full screen must ignore the custom height and restore it afterwards.
  await plannerWindow.getByRole("button", { name: "Full screen Planner" }).click();
  const fullscreen = await plannerWindow.boundingBox();
  expect(fullscreen.width).toBeGreaterThan(after.width);
  await plannerWindow.getByRole("button", { name: "Full screen Planner" }).click();

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open Planner" }).click();
  const restored = await page.getByLabel("Planner app").boundingBox();
  expect(Math.abs(restored.width - after.width)).toBeLessThanOrEqual(3);
  expect(Math.abs(restored.height - after.height)).toBeLessThanOrEqual(3);
});

test("calendar and add-task form stay separated in a short window", async ({ page }) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 780) test.skip();

  await page.clock.setFixedTime(new Date(2026, 10, 4, 12, 0, 0));
  await page.evaluate(() => {
    localStorage.setItem("random_notes_window_positions_v1", JSON.stringify({
      planner: { left: 100, top: 90, width: 1000, height: 500 }
    }));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);
  await openCalendarView(page, "month");

  await page.locator('.calendar-day[data-date="2026-11-28"] .calendar-day-num').click();
  await page.getByRole("button", { name: "+ Add task" }).click();

  const calendarBox = await page.locator("#calendar-view").boundingBox();
  const formBox = await page.locator("#task-form").boundingBox();
  expect(calendarBox).toBeTruthy();
  expect(formBox).toBeTruthy();
  expect(formBox.y).toBeGreaterThanOrEqual(calendarBox.y + calendarBox.height - 1);
  await expect(page.locator("#task-title")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
});

test("right edge grip stays reachable on short screens", async ({ page }) => {
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 780) test.skip();

  await page.setViewportSize({ width: 1000, height: 768 });
  await page.getByRole("button", { name: "Open Planner" }).click();
  const plannerWindow = page.getByLabel("Planner app");
  await expect(plannerWindow).toBeVisible();

  const before = await plannerWindow.boundingBox();
  const grip = await plannerWindow.locator('.window-resize-handle[data-resize="e"]').boundingBox();
  expect(grip).toBeTruthy();

  const x = grip.x + grip.width / 2;
  const y = grip.y + grip.height / 2;
  const hit = await page.evaluate(({ pointX, pointY }) => {
    const element = document.elementFromPoint(pointX, pointY);
    return element && element.dataset ? element.dataset.resize : null;
  }, { pointX: x, pointY: y });
  expect(hit).toBe("e");

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y, { steps: 8 });
  await page.mouse.up();

  const after = await plannerWindow.boundingBox();
  expect(after.width).toBeGreaterThan(before.width + 80);
});

test("day popup traps focus and restores it on close", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 12, 0, 0));
  await openPlannerSurface(page);
  await openCalendarView(page, "month");

  const day = page.locator('.calendar-day[data-date="2026-11-04"]');
  await day.focus();
  await page.keyboard.press("Enter");

  const popup = page.locator("#day-popup");
  await expect(popup).toBeVisible();
  await expect(page.locator("#main-content")).toHaveAttribute("inert", "");
  await expect(page.locator(".taskbar")).toHaveAttribute("inert", "");

  for (let index = 0; index < 14; index += 1) {
    await page.keyboard.press("Tab");
  }
  const stayedInside = await page.evaluate(() => document.getElementById("day-popup").contains(document.activeElement));
  expect(stayedInside).toBe(true);

  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(page.locator("#main-content")).not.toHaveAttribute("inert", "");
  const restoredFocus = await page.evaluate(() => document.activeElement?.dataset?.date);
  expect(restoredFocus).toBe("2026-11-04");
});

test("invalid stored dates fall back to today instead of rolling over", async ({ page }) => {
  const result = await page.evaluate(() => {
    const valid = parseLocalDate("2026-11-04");
    const impossible = parseLocalDate("2026-02-31");
    const today = new Date();
    return {
      valid: [valid.getFullYear(), valid.getMonth(), valid.getDate()],
      impossibleIsToday:
        impossible.getFullYear() === today.getFullYear() &&
        impossible.getMonth() === today.getMonth() &&
        impossible.getDate() === today.getDate()
    };
  });
  expect(result.valid).toEqual([2026, 10, 4]);
  expect(result.impossibleIsToday).toBe(true);
});
