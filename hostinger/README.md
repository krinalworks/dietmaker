# Diet Plan Generator — Hostinger (PHP + MySQL) version

This is the same app as the Google Apps Script version in the repo root,
rebuilt to run entirely on your own Hostinger shared hosting instead of
Google's infrastructure — same features, same PDF layout, but your own
domain, your own MySQL database, and PDF generation via a PHP library
(Dompdf) instead of Google Docs.

**Both versions exist side by side in this repo.** Pick one to actually
use; you don't need both running.

## What's Different From the Google Version

| | Google Apps Script version | This Hostinger version |
|---|---|---|
| Hosting | `script.google.com` link | Your own domain/subdomain |
| Database | Google Sheets | MySQL (via phpMyAdmin) |
| PDF engine | Google Docs (DocumentApp) | Dompdf (PHP library) |
| File storage | Google Drive | Your hosting's disk (`storage/pdfs/`) |
| Login gate | Built into Google's "Anyone with Google account" | You must set this up yourself (see Security below) — **do not skip this** |
| Cost | $0 | $0 extra — uses hosting you already pay for |

## Emoji Rendering — Set Expectations First

The PDF uses a few pictographic emoji (🌅💪🥤🥗☕🌙✅❌). A real color emoji
font is embedded (Noto Emoji) as a best-effort attempt, but PHP PDF
libraries generally cannot render full-color emoji the way Google Docs
does — expect **monochrome/outline icons**, not colorful ones. Plain
symbols like ✓ ✗ ★ render normally since they're regular font glyphs, not
emoji.

## Requirements

- Hostinger **Premium or Business shared hosting** (or higher) — needs PHP
  8.0+ and a MySQL database, both included by default.
- Access to **hPanel** (Hostinger's control panel).

## Setup

### 1. Create the database

In hPanel: **Databases → MySQL Databases** → create a new database and a
database user, and note down:

- Database name
- Database username
- Database password
- Database host (usually `localhost` on Hostinger)

### 2. Import the schema

Open **phpMyAdmin** (linked from the same Databases page), select your new
database, go to the **Import** tab, and upload `schema.sql` from this
folder. This creates the `clients`, `diet_plans`, and `food_library`
tables. Safe to re-run — it uses `CREATE TABLE IF NOT EXISTS`.

### 3. Configure the app

Open `public_html/config.php` and fill in:

- `db.host`, `db.name`, `db.user`, `db.pass` — from step 1.
- Everything else (branding, contact info, static PDF text) is already
  filled in for Foram Patel — edit if anything needs to change.

### 4. Upload the files

Upload the **entire contents of this folder's `public_html/`** (not the
folder itself — its contents) to your Hostinger hosting, either:

- Straight into your account's `public_html/` if this should be your main
  site, or
- Into a subfolder (e.g. `public_html/dietplan/`) if you want it at
  `yourdomain.com/dietplan/`, or
- Into a subdomain's document root if you've created one (e.g.
  `diet.yourdomain.com`) — see "Using a Subdomain" below.

Use hPanel's **File Manager** (upload a zip and extract it) or an FTP
client. The `vendor/` folder (the PDF library) is already included —
nothing needs to be installed on the server.

### 5. Set folder permissions

`storage/pdfs/` and `storage/fonts/` must be writable by PHP. In File
Manager, right-click each folder → Permissions → set to `755` (or `775` if
`755` gives a permission error).

### 6. Password-protect the app (mandatory)

This app has no built-in login screen — anyone who finds the URL could
otherwise view/add client data. In hPanel: go to **Websites → Manage →
Advanced → Password Protect Directories**, and protect the folder you
uploaded to (e.g. `public_html/dietplan/`) with a username and password of
your choice. The browser will ask for these once and remember them.

**Do not skip this step** — diet/health information is sensitive personal
data.

### 7. Test it

Open the URL on your phone, confirm the login prompt appears, then add a
test client and generate a PDF end to end.

## Using a Subdomain

If you'd rather use something like `diet.yourdomain.com`:

1. hPanel → **Domains → Subdomains** → create `diet` pointing at a new
   folder (e.g. `public_html/diet`).
2. Upload this app's `public_html/` contents into that folder instead.
3. Password-protect that folder the same way (step 6 above).

## Where Data Lives

- **MySQL database** — `clients` and `diet_plans` tables hold every client
  and every generated plan (viewable/editable via phpMyAdmin, similar to
  how the Google Sheets version let you browse data in a spreadsheet).
- **`storage/pdfs/`** — every generated PDF, named with a random ID (not
  guessable). Protected by the same password-protect-directory rule as the
  rest of the app.

## Security Notes

- The whole app folder must be password-protected (step 6) — this is the
  equivalent of the Google version's "Anyone with Google account" gate.
- `config.php`, `helpers.php`, `db.php`, `pdf_builder.php`, `schema.sql`,
  and everything in `lib/` are blocked from direct browser access via
  `.htaccess` as defense-in-depth, on top of the directory password.
- No client data is sent to any third-party or AI service.

## Customizing the PDF Layout

Same structure as the Google version: `pdf_builder.php` has one
`render_*_page()` function per page (cover, common daily, lunch, dinner,
guidelines, tracker, contact) plus shared CSS in `pdf_css()`. Static
Diet Guidelines content (`dos_list`, `donts_list`, `lifestyle_tips`) lives
in `config.php`.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| Blank page / 500 error | Check `config.php` DB credentials; check PHP error log in hPanel. |
| "Could not save the PDF" | `storage/pdfs/` isn't writable — recheck permissions (step 5). |
| PDF link asks for the app's password when a client opens it | `storage/pdfs/.htaccess` (included) is meant to override the directory password just for that folder, so shared PDF links stay open while the rest of the app stays locked. If your host's password-protection isn't implemented as a plain `.htaccess`/`AuthType` rule, this override won't take effect — contact Hostinger support if PDF links keep prompting for a password. |

**Note on sharing PDFs with clients:** the app itself (the form) is
password-protected (step 6), but generated PDFs are deliberately left
open at their random, unguessable link so a client can open one from
WhatsApp without needing your login — the same behavior as the Google
Drive version's "anyone with the link" PDF sharing.
