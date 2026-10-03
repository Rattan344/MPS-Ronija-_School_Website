# Mamta Public School, Ronija — Website + Admin Tools

A plain static website (no build step, no framework) with a small admin area for
staff. Hosted on GitHub Pages.

| Page | Purpose |
| --- | --- |
| `index.html` | Public school website |
| `login.html` | Admin login |
| `dashboard.html` | Links to the three admin tools |
| `id-card.html` | Student ID card editor + live preview |
| `print.html` | Print-ready CR80 ID card (85.6 × 53.98 mm) |
| `admit-card.html` | A4 admit card generator (English + Hindi) |
| `verify.html` | Public page a admit-card QR code opens |
| `bell-system.html` | Scheduled + manual period bells |
| `style.css`, `common.js` | Shared styles and the session helper |

All links are relative, so the site works from a subpath such as
`https://<user>.github.io/<repo>/` with no configuration.

---

## Publishing to GitHub Pages

The repository ships with `.github/workflows/pages.yml`, which publishes the
site automatically on every push to `main`.

One-time setup in the repository:

1. **Settings → Pages → Build and deployment → Source: _GitHub Actions_**
2. Commit and push. The workflow publishes the site and shows the live URL.

To run it again by hand: **Actions → Deploy to GitHub Pages → Run workflow**.

`.nojekyll` is present so Pages serves the files as-is instead of running them
through Jekyll.

---

## Security — please read

**The admin login is not real authentication.** GitHub Pages can only host
static files, so the credentials are compared inside `login.html` and the
result is kept in `sessionStorage`. That means:

- Anyone can open the browser console, or **View Source**, and read the login
  ID and password, then skip the login entirely.
- The credentials have been committed to this public repository, so they must be
  treated as **already known to the public**.

Do this now:

1. Pick a new password and update `ADMIN_ID` / `ADMIN_PASS` in `login.html`.
2. Understand that this only deters casual visitors. If you need real
   protection, the student data must live behind a real backend — for example
   Cloudflare Access, Netlify Identity, Supabase Auth, or any server that can
   validate credentials.

The same applies to `SECRET` in `admit-card.html` and `verify.html`. It only
signs the verification link so a student cannot edit the URL by hand. It is
readable in the page source, so anyone can forge a "verified" link. Keep the
two copies identical — the links stop verifying if they drift apart.

Note also that `Master_Engineeri.pdf` and `old_index.html` sit in the public
repository root. `old_index.html` is an unused earlier version that nothing
links to any more. Remove any file that should not be public.

---

## Changing things

**New academic session.** Update `SESSION_START` near the top of the script in
`print.html` and in `id-card.html` (it is `2026` today, giving "2026 – 27").
Both pages read it so the card header and the expiry date cannot disagree.

**Bell schedule.** `bell-system.html` stores the schedule in `localStorage` under
`mps-bells`. Click **Load sample schedule** for the standard day. Browsers block
sound until you interact with the page, and background tabs are throttled, so
leave the tab in the foreground and click **Ring now** once to unlock audio.

**Admit card verification link.** Every card gets a random serial and a QR code
that opens `verify.html` with the student details in the URL. Use **Test
verification page ↗** to check a link before printing.

The QR code library and the fonts load from public CDNs (cdnjs, Google Fonts).
If either is blocked, the pages now show a clear warning and keep working
instead of breaking.

---

## Printing

**ID card (`print.html`)**

- In the print dialog set the scale to **100%** and turn off headers and
  footers, otherwise the card is pushed off the page.
- The page declares `@page { size: 85.6mm 53.98mm }` (CR80). Pick that paper size
  in the printer dialog if your printer driver offers it.
- If it does not, print on plain A4 at 100% and cut along the card outline. Do
  **not** use "Fit to page" — it rescales the card and spoils the CR80
  dimensions.
- Open the page from `id-card.html` via **Open Print Page**. Opening
  `print.html` directly shows an empty card and a warning, because the details
  are passed through the browser's session storage.

**Admit card (`admit-card.html`)**

- A4 at 100% scale. The timetable shrinks automatically so everything stays on
  one page, up to 12 exam rows.
- The page warns you when the timetable is still empty, so you do not print a
  card with a blank table.

If a QR code is missing from a print, check whether an ad-blocker or a captive
network blocked cdnjs — the page shows a warning when that happens.