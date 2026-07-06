# Mobile Diet Plan PDF Generator

A mobile web app that lets a dietician create professionally formatted diet
plan PDFs from her phone — no laptop, no Google Docs, no typing help needed.

## What This App Does

1. Open one link on your phone.
2. Select an existing client, or add a new one.
3. Enter the week number and start date (end date auto-fills to +6 days).
4. Fill in lunch and dinner for Day 1 through Day 7.
5. Tap **Generate PDF**.
6. Get a PDF link — open it or share it on WhatsApp.

Every client and every generated plan is saved automatically, so past plans
can be reopened later from the "Recent Plans" list.

## How This Differs From a Template-Based Approach

Instead of copying a Google Doc template and replacing `{{PLACEHOLDERS}}`,
the PDF is built directly in code (using Google Docs' `DocumentApp` API).
There is no template document to create or maintain, and no risk of
placeholders silently failing to match because of Google Docs text styling
quirks. If you want to change how the PDF looks, edit the
`createPdfFromScratch_()` function in `Code.gs` — everything about the
layout (title, tables, colors, notes) is defined there in one place.

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
6. (Optional) In `Code.gs`, edit the `CONFIG` object at the top:
   - `OUTPUT_FOLDER_ID` — paste a Google Drive folder ID to keep generated
     PDFs organized. Leave blank to save them in the root of Drive.
   - `CLINIC_NAME` — the title printed at the top of every PDF.
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

- **Clients** and **DietPlans** tabs in the Google Sheet you created — this
  is the permanent record of every client and every plan generated.
- **Generated PDFs** are saved as files in Google Drive (in
  `OUTPUT_FOLDER_ID` if set, otherwise the root of My Drive).

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

All PDF formatting lives in `createPdfFromScratch_()` and its two helper
functions (`styleInfoTable_`, `styleMealsTable_`) in `Code.gs`. Common
tweaks:

- **Clinic name / title** — `CONFIG.CLINIC_NAME` at the top of `Code.gs`.
- **Colors** — the hex codes passed to `setBackgroundColor` /
  `setForegroundColor` in `styleMealsTable_`.
- **Extra fields** (e.g. breakfast) — add a column to `PLANS_HEADERS`, a
  field in the frontend, and a row/column in the meals table in
  `createPdfFromScratch_()`.

## Testing Checklist

- [ ] `initializeDatabase()` runs without errors.
- [ ] Add a new client, generate a plan, refresh the app, confirm the
      client now appears in the dropdown.
- [ ] Start date selection auto-fills end date to +6 days.
- [ ] Fill Day 1–2 meals only, generate PDF, confirm Days 3–7 show `-`
      (not blank placeholders) and Days 1–2 show the correct text.
- [ ] Generated PDF opens from the returned link.
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
content, WhatsApp API automation, and multi-user admin dashboards are all
out of scope for this MVP by design. The goal is: one dietician can
generate and share one complete diet plan PDF from her phone without
needing anyone else's help.

## Possible Next Steps (not built yet)

- "Copy previous week" button to prefill a new week from the client's last
  plan.
- Edit existing client details.
- Food library autosuggest for meal textareas.
- A generated WhatsApp share message (text only, not automated sending).
