// Mamta Public School — standalone ESP32 bell controller
// ------------------------------------------------------
// Two ways to ring the bell:
//   1. Standalone: the board keeps its own schedule and syncs time over WiFi/NTP,
//      so it rings even when no computer is on.
//   2. From the website: bell-system.html can pair over Web Serial (9600 baud)
//      and it sends "RING\n" for manual/scheduled bells.
//
// Wiring: relay module IN -> GPIO 13, VCC -> 5V (or 3V3 for 3.3V modules),
// GND -> GND. Use a relay rated for the bell/siren load, and keep mains wiring
// away from the board (prefer a qualified electrician for 230V work).

#include <WiFi.h>
#include <time.h>

// ---- CONFIGURE ----
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* TZ_RULE  = "IST-5:30";           // India Standard Time

const int RELAY_PIN = 13;
const unsigned long RING_MS = 3000;          // how long the relay stays on
const bool RELAY_ACTIVE_LOW = false;         // true for many cheap relay boards

// Keep this list in step with the schedule on bell-system.html.
const char* SCHEDULE[] = {
  "08:00",  // Assembly
  "08:30",  // Period 1
  "09:10",  // Period 2
  "09:50",  // Period 3
  "10:30",  // Short break
  "10:50",  // Period 4
  "11:30",  // Period 5
  "12:10",  // Lunch
  "12:50",  // Period 6
  "13:30",  // Period 7
  "14:00"   // School off
};
const size_t SCHEDULE_COUNT = sizeof(SCHEDULE) / sizeof(SCHEDULE[0]);
// -------------------

String lastMinute = "";

void relayOn()  { digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? LOW : HIGH); }
void relayOff() { digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW); }

void ringBell(const char* reason) {
  Serial.print("RING: ");
  Serial.println(reason);
  relayOn();
  delay(RING_MS);
  relayOff();
}

bool clockValid() {
  time_t now = time(nullptr);
  struct tm t;
  localtime_r(&now, &t);
  return t.tm_year > 100;   // year >= 2001 means NTP has set the clock
}

void setup() {
  Serial.begin(9600);
  pinMode(RELAY_PIN, OUTPUT);
  relayOff();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi connecting");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  configTzTime(TZ_RULE, "pool.ntp.org", "time.google.com");
  Serial.println("Bell controller ready. Send RING over serial 9600 baud.");
}

void loop() {
  // 1) Command from the website over Web Serial.
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "RING") ringBell("website");
  }

  // 2) Local schedule, checked once per minute.
  if (clockValid()) {
    time_t now = time(nullptr);
    struct tm t;
    localtime_r(&now, &t);
    char hhmm[6];
    strftime(hhmm, sizeof(hhmm), "%H:%M", &t);

    if (lastMinute != hhmm) {
      lastMinute = hhmm;
      for (size_t i = 0; i < SCHEDULE_COUNT; i++) {
        if (strcmp(SCHEDULE[i], hhmm) == 0) {
          ringBell("schedule");
          break;
        }
      }
    }
  }

  delay(200);
}
