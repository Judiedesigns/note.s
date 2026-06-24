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

test("planner UI fits the viewport", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Open Planner" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Notes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open README" })).toBeVisible();
  await expect(page.getByLabel("Planner app")).toBeHidden();

  await page.getByRole("button", { name: "Open Planner" }).click();
  await expect(page.getByRole("heading", { name: "daily" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Week" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Month" })).toBeVisible();
  await expect(page.getByPlaceholder("Task to remember")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Add Task" })).toBeVisible();
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
  await page.getByPlaceholder("Task to remember").fill("Edit script and film B-roll");
  await page.getByRole("button", { name: "+ Add Task" }).click();

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

test("exports dated tasks to a calendar file", async ({ page }) => {
  await openPlannerSurface(page);
  await page.getByPlaceholder("Task to remember").fill("Review calendar sync");
  await page.getByRole("textbox", { name: "Details" }).fill("Only my browser exports this task.");
  await page.getByRole("button", { name: "+ Add Task" }).click();

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
  expect(content).toContain("DESCRIPTION:Only my browser exports this task.");
  expect(content).toContain("END:VCALENDAR");
});

test("shows tasks across week and month views", async ({ page }) => {
  const today = todayValue();
  const sameWeek = addDaysValue(new Date().getDay() === 1 ? 1 : -1);
  await page.evaluate(({ today, sameWeek }) => {
    localStorage.setItem("random_notes_v1", JSON.stringify([
      { id: "one", type: "task", title: "Today priority", body: "", dueDate: today, done: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "two", type: "task", title: "Same-week priority", body: "", dueDate: sameWeek, done: false, createdAt: Date.now(), updatedAt: Date.now() },
      { id: "three", type: "note", title: "Loose thought", body: "Save for later", dueDate: "", done: false, createdAt: Date.now(), updatedAt: Date.now() }
    ]));
  }, { today, sameWeek });
  await page.reload({ waitUntil: "domcontentloaded" });
  await openPlannerSurface(page);

  await expect(page.getByLabel("Saved tasks").getByText("Today priority")).toBeVisible();
  await expect(page.getByLabel("Saved tasks").getByText("Same-week priority")).toBeHidden();

  await page.getByRole("tab", { name: "Week" }).click();
  await expect(page.getByLabel("Saved tasks").getByText("Today priority")).toBeVisible();
  await expect(page.getByLabel("Saved tasks").getByText("Same-week priority")).toBeVisible();
  await expect(page.getByLabel("Saved tasks").getByText("Loose thought", { exact: true })).toBeHidden();

  await page.getByRole("tab", { name: "Month" }).click();
  await expect(page.getByLabel("Saved tasks").getByText("Today priority")).toBeVisible();
  await expect(page.getByLabel("Saved tasks").getByText("Same-week priority")).toBeVisible();
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
  await expect(page.getByPlaceholder("Drop a thought, idea, reminder, or rough note")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Add Note" })).toBeVisible();

  await page.getByRole("textbox", { name: "body" }).fill("Hook idea\nTry a softer intro before the task list.");
  await page.getByRole("button", { name: "+ Add Note" }).click();

  await expect(page.getByText("1 note")).toBeVisible();
  const notePreview = page.getByRole("group", { name: "Note preview" });
  await expect(notePreview.locator(".note-preview")).toContainText("Hook idea");
  await expect(notePreview).toHaveAttribute("aria-expanded", "false");
  await notePreview.click();
  await expect(notePreview).toHaveAttribute("aria-expanded", "true");
  await expect(notePreview.getByRole("button", { name: "Hide full note" })).toBeVisible();
  await expect(notePreview.locator(".note-text")).toBeVisible();
  await expect(notePreview.locator(".note-text")).toContainText("Try a softer intro before the task list.");
  await notePreview.getByRole("button", { name: "Close note preview" }).click();
  await expect(notePreview).toHaveAttribute("aria-expanded", "false");
  await expect(notePreview.locator(".note-text")).toBeHidden();
  await notePreview.click();
  await notePreview.getByRole("button", { name: "Hide full note" }).click();
  await expect(notePreview).toHaveAttribute("aria-expanded", "false");
  await expect(notePreview.locator(".note-text")).toBeHidden();

  await openPlannerSurface(page);
  await expect(page.getByLabel("Saved tasks").getByText("Hook idea")).toBeHidden();

  await page.reload({ waitUntil: "domcontentloaded" });
  await openNotesSurface(page);
  await expect(page.getByRole("group", { name: "Note preview" }).locator(".note-preview")).toContainText("Hook idea");
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
  await expect(shortNote.getByRole("button", { name: "Close note preview" })).toHaveCount(0);

  const longNote = notesWindow.locator(".note-card", { hasText: "This note is intentionally long" });
  await expect(longNote.getByRole("button", { name: "Show full note" })).toBeVisible();
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
  await expect(page.getByPlaceholder("Task to remember")).toHaveValue("Rewrite this task");
  await expect(page.getByRole("textbox", { name: "Details" })).toHaveValue("Tighten copy");
  await expect(page.getByLabel("Saved tasks").getByText("Rewrite this task")).toBeVisible();

  await page.getByPlaceholder("Task to remember").fill("Rewrite this task again");
  await page.getByRole("textbox", { name: "Details" }).fill("Tighten copy twice");
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

  await page.mouse.move(handle.x + 24, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x - 90, handle.y + 68, { steps: 8 });
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

  await page.mouse.move(handle.x + 48, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 64, handle.y - 120, { steps: 8 });
  await page.mouse.up();

  const after = await plannerWindow.boundingBox();
  expect(after.y).toBeLessThan(before.y - 20);
  expect(after.y).toBeGreaterThanOrEqual(0);
});
