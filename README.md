# Mamta Public School, Ronija — Website + Admin Tools

A plain static website (no build step, no framework) with a small admin area for staff. Hosted on GitHub Pages.

| Page | Purpose |
| --- | --- |
| `index.html` | Public school website |
| `login.html` | Admin login (auto-redirects to dashboard if already logged in) |
| `dashboard.html` | Links to admin tools |
| `students.html` | Local student database (add/edit/search, class-wise, import/export) |
| `id-card.html` | Student ID card editor (tabs, live preview, front/back) + print/export flow |
| `print.html` | Print-ready ID cards (CR80 85.6×53.98 mm), export PNG/PDF |
| `admit-card.html` | A4 admit card generator (English + Hindi) |
| `verify.html` | Public page an admit-card QR code opens |
| `bell-system.html` | Scheduled + manual period bells |
| `style.css`, `common.js` | Shared styles and helpers (auth + session storage) |
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

**New academic session.** Update `SESSION_START` near the top of the script in `print.html` and in `id-card.html` (currently `2026` → “2026–27”).

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

**Student database.** `students.html` keeps the student list in this browser only, under `localStorage` key `mps-students`. Add a student once (name, class, section, roll, father/mother, contact, address, photo, optional Hindi names), then:

- **ID card / Admit card** on a row opens the generator with that student filled in.
- **Classes** lists every class with counts; **ID cards** opens `print.html` with the whole class (fronts first, then backs, for duplex), and **Admit cards** opens `admit-card.html` with the class loaded — set the exam/session/timetable once, then **Print all**.
- **Export JSON / Import JSON** moves the list to another computer. Another computer (or browser profile) starts empty; that is expected.

Uploaded photos are resized to ~360 px JPEG before saving to keep storage small. If saving fails, the browser storage is full — export, delete a few photos, or free space. Batch hand-off keys are `mps-card-batch`, `mps-admit-batch`, plus single-student `mps-card-prefill` / `mps-admit-prefill`; they are cleared automatically when used.

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
