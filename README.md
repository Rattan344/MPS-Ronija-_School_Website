# Mamta Public School, Ronija — Website + Admin Tools

A plain static website (no build step, no framework) with a small admin area for staff. Hosted on GitHub Pages.

| Page | Purpose |
| --- | --- |
| `index.html` | Public school website |
| `login.html` | Admin login (auto-redirects to dashboard if already logged in) |
| `dashboard.html` | Links to admin tools |
| `students.html` | Central student database: search, filters, sorting, pagination, bulk edit, class-wise card batches |
| `fees.html` | Fee charges, receipts, student ledger, class-wise billing and CSV export |
| `marks.html` | Class-wise marks entry with automatic percentages, grades and ranks |
| `awards.html` | Awards and scholarships register + class/session/all-time top performers |
| `analytics.html` | Dashboards for strength, fee collection, academics, toppers and follow-up lists |
| `sessions.html` | Session history, class/school promotion, full backup + restore, data cleanup |
| `id-card.html` | Student ID card editor (tabs, live preview, front/back) + print/export flow |
| `print.html` | Print-ready ID cards (CR80 85.6×53.98 mm), export PNG/PDF |
| `admit-card.html` | A4 admit card generator (English + Hindi) + class batch loader |
| `verify.html` | Public page an admit-card QR code opens |
| `bell-system.html` | Scheduled + manual period bells |
| `404.html` | Friendly not-found page that fixes missing `.html` extensions |
| `style.css`, `common.js` | Shared styles and helpers (auth, storage, database, fees, marks, awards) |
| `audio/` | Sample bell sounds used by the bell system |

All links are relative, so the site works from a subpath such as `https://<user>.github.io/<repo>/` with no configuration.

---

## Publishing to GitHub Pages

The repository ships with `.github/workflows/pages.yml`, which publishes the site automatically on every push to `main`.

One-time setup in the repository:

1. **Settings → Pages → Build and deployment → Source: _GitHub Actions_**
2. Commit and push. The workflow publishes the site and shows the live URL.

To run it again by hand: **Actions → Deploy to GitHub Pages → Run workflow**.

`.nojekyll` is present so Pages serves the files as-is instead of running them through Jekyll.

`404.html` catches mistyped addresses (including page names without `.html`) and redirects to the right page when it can.

---

## Security — please read

**The admin login is not real authentication.** GitHub Pages only serves static files, so credentials are checked in the browser and a session is stored locally (`localStorage` key `mps-auth`, with a 30‑day expiry by default). Anyone can read the source/console and bypass this. Treat it as a convenience lock only.

Do this now:

1. Set strong values for `ADMIN_ID` / `ADMIN_PASS` in `login.html` (and remember they are still visible to anyone who can view source).
2. If you need real protection, put the site/admin behind a real auth layer (e.g. Cloudflare Access, Netlify Identity, Supabase Auth) or a backend.

`SECRET` in `admit-card.html` and `verify.html` signs verification links in the client only; it is also readable in source and can be forged. Keep both copies in sync.

Previously bundled files `old_index.html` and `Master_Engineeri.pdf` were removed from the repo root; do not commit sensitive PDFs or unused pages you do not want public.

---

## Changing things

**New academic session.** Open `sessions.html` → **Start next session**. It creates the new session label, promotes every active student one class up (Class XII becomes *Graduated*), updates ID-card validity, and makes the new session active. Old marks, fees and awards stay attached to their original session for history. Also update `SESSION_START` near the top of the script in `print.html` and `id-card.html` (currently `2026` → “2026–27”) so newly printed cards show the right default session.

**Bell schedule.** `bell-system.html` stores the schedule in `localStorage` under `mps-bells`. Click **Load sample schedule** for the standard day. Browsers block sound until you interact with the page; click **Ring now** once after load if needed.

**Bell sounds.** Choose Beep, Chime (synth), School bell (synth), or Custom audio. Custom audio can be a repo file (two samples ship in `audio/`: `school-bell.wav`, `chime.wav` — pick **Use school-bell sample** / **Use chime sample**) or a URL such as `audio/assembly.mp3`. The mode and URL are remembered in `localStorage` under `mps-bell-sound`; an uploaded file only lasts for the current session.

**Hardware pairing (optional).** On Chrome/Edge desktop the page can pair with an Arduino/ESP32 over **Web Serial** (9600 baud). Each bell (scheduled, manual, or test pulse) writes `RING\n` to the serial port, so the board can switch a relay or buzzer. Basic Arduino sketch:

```cpp
void setup(){ Serial.begin(9600); pinMode(13, OUTPUT); }
void loop(){
  if (Serial.readStringUntil('\n') == "RING") {
    digitalWrite(13, HIGH); delay(1000); digitalWrite(13, LOW);
  }
}
```

Web Serial needs a Chromium desktop browser and a secure context (GitHub Pages is HTTPS). Keep the bell tab open; if the tab is throttled in the background, missed bells ring once when you return.

---

## Hardware bell (standalone, recommended for daily use)

`hardware/esp32-bell/esp32-bell.ino` is a ready-to-flash ESP32 sketch that:

- connects to WiFi, sets the clock with NTP (IST), and keeps its **own** schedule,
- drives a relay on GPIO 13 for `RING_MS`, and
- also listens on serial at 9600 baud for `RING\n`, so `bell-system.html` can trigger it while open.

Wiring: relay `IN` → GPIO 13, relay `VCC`/`GND` to the board, bell/siren through the relay contacts. Use a relay rated for the load; have 230V mains wiring done by a qualified electrician.

Steps:

1. Copy `hardware/esp32-bell/esp32-bell.ino`, set `WIFI_SSID`, `WIFI_PASS`, relay pin, ring duration, and `RELAY_ACTIVE_LOW` for your relay board.
2. Keep `SCHEDULE[]` in step with the schedule saved on `bell-system.html`.
3. Flash with the Arduino IDE (ESP32 board package), open Serial Monitor at 9600 baud.
4. To test: either wait for a scheduled time, or type `RING` + Enter in the Serial Monitor, or use **Connect device → Send test pulse** on `bell-system.html`.

An Arduino Uno (no WiFi) can be used with the website only — flash a sketch that reads `RING\n` at 9600 baud and switches the relay; there is no standalone schedule in that case.

## Student records, fees, marks, awards and sessions

Everything in the admin area is **local to this browser on this computer**. There is no server and no account: another computer (or browser profile) starts empty. Use the full backup in `sessions.html` to move or protect data.

### One record, used everywhere

Students live under `localStorage` key `mps-students`. Marks, fees and awards are stored separately but always point at the student's unique id — never a copied name or class. That means:

- Edit a name, class, photo or contact **once** in `students.html`; ID cards, admit cards, fee ledgers, marks, awards and analytics all show the new value immediately.
- Promote a class; old marks/fees/awards stay tagged with their session, so all-time toppers still work.
- Delete a student; their marks, fees and awards are removed with them (cascade delete). `sessions.html` can also clean orphan records left over from old data.

Storage keys: `mps-students`, `mps-marks`, `mps-fees`, `mps-awards`, `mps-config` (active session + session list), plus the card hand-off keys described below. Student photos live in an IndexedDB store (`mps-media` / `photos`) and are referenced by student id, so a database of 1,000 students does not exhaust `localStorage`.

### Student database (`students.html`)

- Search by name, admission no., roll, phone or father's name; filter by class, section, status and fee status; sort by class, name, admission no., fee due or score; 25/50/100 rows per page.
- **Analytics strip** shows active students, classes, outstanding fees and average score at a glance.
- **Bulk actions** on selected students (or *Select all filtered*): ID cards, admit cards, assign class/section, promote, add a fee charge, set status, delete.
- **Class quick print**: choose a class → *Print ID cards* (opens `print.html`, fronts then backs) or *Print admit cards* (opens `admit-card.html` with the class loaded). Set the exam/timetable once, then **Print all**.
- **Import/Export students** moves student details and photos as JSON. Importing matches admission numbers and updates existing students. For marks/fees/awards too, use the **full backup** in `sessions.html`.
- Photos are downscaled to ~180 px WebP (JPEG fallback) and stored in IndexedDB, so the main student records stay small. If IndexedDB is unavailable, a compressed copy is kept inline as a fallback. If saving fails, storage is full — download a backup, then use **Compress stored photos** in Sessions or remove some photos.

### Fees (`fees.html`)

- Per-session ledger: add a charge or record a payment per student, or bill/collect for an entire class in one action.
- Summary table shows billed, paid, due and status (Paid / Partial / Unpaid / No dues) with search, class and status filters.
- Installments and mixed heads are fine: payments are recorded against the student, not locked to a single charge.
- A student ledger lists every charge/receipt; delete a wrong entry and totals recalculate.
- **Export CSV** for the filtered view.

### Marks (`marks.html`)

- Pick a class and an exam name (existing exams are suggested), enter obtained marks out of a custom maximum, and save the whole class at once.
- Percentages, grades and class ranks are computed automatically. Scores feed class toppers, school toppers, awards and analytics.
- Leaving a marks box empty removes that student's record for the exam.

### Awards and scholarships (`awards.html`)

- Register awards and scholarships with title, category, session, amount, date and note.
- Live **School top 10** and **Class top 3** for the current session, plus **All-time top 10** across every session. Click **Award** on a ranked student to prefill the form.
- Export the filtered register as CSV.

### Analytics (`analytics.html`)

- KPI cards for active students, fee collection %, outstanding, average score and awards.
- Fee collection bars overall and by class, class-wise report (strength, average, highest, topper, billed/collected/due, collection %, awards), session and all-time top 10, highest dues and students below 33%.
- Export the class-wise report as CSV.

### Sessions and promotion (`sessions.html`)

- Set the active session; add past/planned sessions; see session-wise counts and money.
- Promote one class to any target class, or **Start next session** to promote the whole school and mark Class XII as graduated.
- **Download full backup**: one JSON file with students, marks, fees, awards, photos and session settings. **Restore** replaces everything on this computer after confirmation. **Compress stored photos** shrinks existing photos in place.
- Clean orphan records, inspect approximate storage size, or erase all school data (double confirmation).

Uploaded photos are resized automatically. Batch hand-off keys are `mps-card-batch`, `mps-admit-batch`, plus single-student `mps-card-prefill` / `mps-admit-prefill`; they are cleared automatically when used.

**ID card data (keys).** The editor stores draft/print data under `mps-card-data` (student/family/school fields, layout, photo data URL) and `mps-card-print` (`{ sides: [...] }`), in `localStorage` so the print tab can read them. Printing a single card clears any stale class batch; use **Print Front/Back/Both** from the editor to open `print.html`.

**Admit card verification link.** Cards get a random serial and QR code opening `verify.html` with details in the URL. Use **Test verification page ↗** before printing. QR/fonts load from public CDNs; if blocked, pages warn and continue where possible.

---

## Printing

**ID card (`print.html`)**

- Print dialog: **100% scale**, no headers/footers.
- Page size is set to CR80 for the chosen layout: **vertical** card → 53.98×85.6 mm portrait page, **horizontal** card → 85.6×53.98 mm landscape page. Choose CR80 if available; otherwise print on A4 at 100% and cut (do **not** “Fit to page”).
- Use **Print Front / Print Back / Print Both** from `id-card.html` (or ensure `mps-card-data`/`mps-card-print` exist). Opening `print.html` directly with no data shows a warning.
- **Export:** on `print.html` you can download **Front (PNG)**, **Back (PNG)**, or **Both (PDF)** (CR80-sized pages). Export is available for single cards; a class batch hides it. Requires internet for html2canvas/jsPDF CDNs on first load in some setups; if offline, use browser Print/Save as PDF.
- **Class batch** (from `students.html`): fronts are rendered first, then backs, one card per page. Use **Fronts only** / **Backs only** / **Front + back** in the batch bar, then run the matching print jobs (e.g. print fronts, flip the stack, print backs for duplex).

**Admit card (`admit-card.html`)**

- A4 at 100% scale. Timetable auto-shrinks to help fit (up to ~12 rows). A warning appears if the timetable is empty.
- **Print all N** (class batch) prints one A4 page per student using the exam name, session and timetable currently on screen; each card gets its own serial and QR code.

If a QR is missing in print, an ad blocker or blocked CDN is a common cause; check on-screen warnings.
