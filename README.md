# Mobile Diet Plan PDF Generator

A mobile web app that lets a dietician create professionally formatted diet
plan PDFs from her phone — no laptop, no Google Docs, no typing help needed.

The PDF layout matches an existing branded diet plan format (cover page,
common daily plan, lunch/dinner tables, diet guidelines, weekly progress
tracker, coach contact page) rather than a generic template.

## What This App Does

1. Open one link on your phone.
2. Select an existing client, or add a new one.
3. Review/fill **Program Details** (Goal, Diet Type, Program Start Date &
   Weight) and the **Common Daily Plan** (On Rising, Before Exercise, After
   Exercise, Brunch, Snack, Bed Time) — these are the same every week, so
   they're pre-filled from last time and you only touch them if something
   changed.
4. Enter this week's number and start date (end date auto-fills to +6 days).
5. Fill in lunch and dinner for Day 1 through Day 7.
6. Tap **Generate PDF**.
7. Get a PDF link — open it or share it on WhatsApp.

Every client and every generated plan is saved automatically, so past plans
can be reopened later from the "Recent Plans" list.

## PDF Structure

Each generated PDF has these pages, matching the dietician's existing
format:

1. **Cover** — title, week number, client name, start/end date, starting
   weight, goal, diet type, an optional highlight banner (e.g. "45 Minutes
   Fast Walk is Compulsion Every Day"), and the coach's name/contact.
2. **Common Daily Plan** — the fixed daily routine (🌅 On Rising, 💪 Before
   Exercise, 🥤 After Exercise, 🥗 Brunch, ☕ Snack, 🌙 Bed Time) plus a
   hydration note.
3. **Lunch Plan** — a table with the actual calendar date for each of the 7
   days (e.g. "Tue, 08 Jul"), not "Day 1..Day 7".
4. **Dinner Plan** — same dated table for dinner, a dinner-timing note, and
   this week's optional note if one was entered.
5. **Diet Guidelines** — Do's (green, ✅) and Don'ts (red, ❌), plus
   lifestyle tips. This content is the same for every client, so it lives in
   `Code.gs` (`DOS_LIST`, `DONTS_LIST`, `LIFESTYLE_TIPS`) rather than being
   re-typed every week.
6. **Weekly Progress Tracker** — a blank 8-week weigh-in grid for the client
   to fill in by hand, with the program's start date/weight/goal at the top.
7. **Coach contact page** — dietician bio, referral note, and other
   programs, all pulled from `CONFIG` (see below). Instagram/Website/Other
   Programs are only shown if you actually fill them in — no more
   unfilled-looking `{{placeholder}}` text.

**Not included on purpose:** the client photo box from the original
template is skipped — there's no photo upload step in this app, and it was
never filled in the reference file either.

## How This Differs From a Template-Based Approach

Instead of copying a Google Doc template and replacing `{{PLACEHOLDERS}}`,
the PDF is built directly in code (using Google Docs' `DocumentApp` API).
There is no template document to create or maintain, and no risk of
placeholders silently failing to match because of Google Docs text styling
quirks — which is exactly the issue visible in the reference PDF's last
page (`{{Instagram_Handle}}`, `{{Program_1}}` etc. left unrendered). If you
want to change how the PDF looks, edit `createDietPlanPdf_()` and the
`build*Page_()` functions in `Code.gs` — everything about the layout
(colors, section order, tables) is defined there in one place.

## Cost

**$0.** Runs entirely on Google Apps Script, Google Sheets, and Google
Drive, all within free personal Google account limits for this scale of
use.

## File Structure

```
Code.gs          Backend: data storage + PDF generation
Index.html        Mobile-first frontend UI
appsscript.json   Apps Script project manifest
README.md         This file
```

## Setup

1. Create a new Google Sheet (e.g. "Diet Plan Data").
2. Open **Extensions → Apps Script**.
3. Delete the default `Code.gs` content and paste in this project's `Code.gs`.
4. Add a new HTML file named exactly `Index` and paste in `Index.html`.
5. Replace the manifest: click the gear icon → show `appsscript.json` in
   the editor (Project Settings → "Show appsscript.json manifest file in
   editor"), then paste in this project's `appsscript.json`.
6. In `Code.gs`, edit the `CONFIG` object at the top to match the
   dietician's brand:
   - `OUTPUT_FOLDER_ID` — paste a Google Drive folder ID to keep generated
     PDFs organized. Leave blank to save them in the root of Drive.
   - `DOC_TITLE`, `DOC_TAGLINE`, `DEFAULT_HIGHLIGHT` — cover page text.
   - `LUNCH_TIME_LABEL`, `DINNER_TIME_LABEL` — meal timing shown on those
     pages.
   - `HYDRATION_NOTE`, `DINNER_NOTE`, `MOTIVATIONAL_QUOTE` — static notes.
   - `DIETICIAN_NAME`, `CREDENTIALS`, `PHONE`, `EMAIL`, `INSTAGRAM_HANDLE`,
     `WEBSITE`, `REFERRAL_TEXT`, `OTHER_PROGRAMS` — coach bio/contact page.
     Leave `INSTAGRAM_HANDLE`/`WEBSITE` blank to omit them entirely.
   - `DOS_LIST`, `DONTS_LIST`, `LIFESTYLE_TIPS` (just below `CONFIG`) — the
     Diet Guidelines page content.
7. In the Apps Script editor, select the `initializeDatabase` function from
   the function dropdown and click **Run**. Approve the permission prompts.
   This creates the `Clients`, `DietPlans`, and `FoodLibrary` sheet tabs.
8. Click **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone with Google account** (see Security below)
9. Click **Deploy**, then copy the Web App URL.
10. Open that URL on your phone and test it end to end.

Re-running `initializeDatabase` at any time is safe — it never erases
existing rows and never duplicates the header row.

## Where Data Lives

- **Clients** tab — one row per client: identity (Name, Age, Phone, Notes)
  plus their latest Program Details and Common Daily Plan, which
  auto-prefill the form the next time a plan is generated for them.
- **DietPlans** tab — one row per generated plan, snapshotting the client's
  profile at that time plus that week's dates and meals.
- **Generated PDFs** are saved as files in Google Drive (in
  `OUTPUT_FOLDER_ID` if set, otherwise the root of My Drive).

Leaving a Program Details or Common Daily Plan field blank when generating
a plan never erases what was saved before — it's treated as "no change",
not "delete this".

## Bulk-Adding Existing Clients

If there are already clients being tracked outside this app (e.g. from
before it existed), add them straight into the Google Sheet instead of
typing each one through the phone form:

1. Make sure `initializeDatabase` has been run at least once, so the
   **Clients** tab already has all its column headers in row 1.
2. Open the Google Sheet, go to the **Clients** tab.
3. Starting at row 2 (or the next empty row), type one client per row,
   filling in whatever is known:
   - `Name`, `Age`, `Phone`, `Notes`
   - `Goal`, `DietType`, `ProgramStartDate` (format `YYYY-MM-DD`, e.g.
     `2026-05-10`), `ProgramStartWeight` (just the number, e.g. `95`)
   - `OnRising`, `BeforeExercise`, `AfterExercise`, `Brunch`, `Snack`,
     `BedTime` — optional; can also be filled in later from the app
   - **Leave `ClientID`, `CreatedAt`, and `UpdatedAt` blank.**
4. Once all rows are typed, open the Apps Script editor, select
   `fillMissingClientIds` from the function dropdown, and click **Run**.
   This assigns a unique ID and timestamp to every row that has a Name but
   no ID — it never touches a row that already has one.
5. Reload the web app — every client just added now appears in the
   dropdown, with their Program Details and Common Daily Plan already
   pre-filled for the next PDF generated for them.

This only backfills the client list itself, not historical week-by-week
PDFs — there's nothing to backfill there since those earlier weeks' plans
were never generated through this app.

## Security

- Deploy with **Execute as: Me** and **Who has access: Anyone with Google
  account** — this means only people signed into a Google account can open
  the app link, and it always runs under the dietician's own Drive/Sheets.
- Each **generated PDF file** is individually set to "Anyone with the
  link can view" so it can be opened by the client from a WhatsApp share —
  this does not expose the spreadsheet, the client list, or any other file
  in Drive, only that one PDF.
- Do not set the web app's own access to "Anyone" (no login) for real
  client data — that's for quick testing only.
- No client data is sent to any third-party or AI service.

## Customizing the PDF Layout

All PDF formatting lives in `createDietPlanPdf_()` and the `build*Page_()`
functions in `Code.gs`, plus the shared helpers below them
(`appendSectionHeader_`, `appendLabelValueTable_`, `appendDayMealTable_`,
`appendNoteBox_`). Common tweaks:

- **Cover page text / colors** — `CONFIG` values and the `DARK_GREEN` /
  `GOLD` / `LIGHT_GREEN` color constants near the top of `Code.gs`.
- **Diet Guidelines content** — edit `DOS_LIST`, `DONTS_LIST`, or
  `LIFESTYLE_TIPS` directly.
- **Extra fields** (e.g. a breakfast slot) — add a column to
  `PLANS_HEADERS`/`CLIENTS_HEADERS`, a field in the frontend, and a row in
  the relevant `build*Page_()` function.

## Testing Checklist

- [ ] `initializeDatabase()` runs without errors.
- [ ] Add a new client, fill Program Details + Common Daily Plan, generate
      a plan, refresh the app, confirm the client appears in the dropdown
      with those fields pre-filled.
- [ ] Start date selection auto-fills end date to +6 days.
- [ ] Fill Day 1–2 meals only, generate PDF, confirm Days 3–7 show `-`
      (not blank placeholders) and Days 1–2 show the correct text.
- [ ] Leave a Program Details field blank on a second generation for the
      same client — confirm the previously saved value is kept, not erased.
- [ ] Generated PDF opens from the returned link and all 7 pages look
      correct (cover, common daily, lunch, dinner, guidelines, tracker,
      contact).
- [ ] PDF is saved in the correct Drive folder.
- [ ] "Recent Plans" shows the plan just generated when the same client is
      reselected.
- [ ] Full flow works on an Android Chrome and/or iPhone Safari phone
      browser: add client → fill form → generate → open PDF → share via
      WhatsApp.

## Common Errors

| Message | Meaning |
|---|---|
| "Select a client or add a new client." | No client chosen and no new client name entered. |
| "Week number is required." | Week number field was left blank. |
| "Start date is required." / "End date is required." | A required date field was left blank. |
| "Add at least one lunch or dinner entry." | All 7 days were left completely empty. |
| "Could not save the PDF to Drive…" | `CONFIG.OUTPUT_FOLDER_ID` is invalid, or Drive permissions were not approved during setup — re-run `initializeDatabase` and re-approve permissions. |
| "No spreadsheet found…" | Script isn't bound to a Sheet and `CONFIG.SPREADSHEET_ID` is empty — either bind the script to a Sheet (Setup step 2) or paste a Spreadsheet ID into `CONFIG.SPREADSHEET_ID`. |

## What's Intentionally Not Included (MVP scope)

Login system, payment system, client-facing portal, AI-generated diet
content, WhatsApp API automation, client photo upload, and multi-user admin
dashboards are all out of scope for this MVP by design. The goal is: one
dietician can generate and share one complete diet plan PDF from her phone
without needing anyone else's help.

## Possible Next Steps (not built yet)

- "Copy previous week" button to prefill this week's meals from the
  client's last plan (Program Details/Common Daily Plan already do this
  automatically — this would extend it to Day 1–7 meals too).
- A dedicated "Edit client" screen (profile fields are currently only
  editable via the plan-generation form).
- Food library autosuggest for meal fields.
- A generated WhatsApp share message (text only, not automated sending).
