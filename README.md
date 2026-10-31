# Adhkar & Steps

A installable web app (PWA): step counter + morning, evening and bedtime adhkar + ajwah dates tracker + ruqyah guidance.
No accounts, no server. Everything is saved in the browser.

## Run it
- Quick look on a computer: `python3 -m http.server 8000` in this folder, open http://localhost:8000
- On a phone it must be served over **HTTPS** (motion sensors and the install prompt need it). Free options:
  GitHub Pages, Netlify Drop (drag the folder onto app.netlify.com/drop), Cloudflare Pages.
- Android Chrome: menu > Install app. iPhone Safari: Share > Add to Home Screen. On iPhone, tap "Start counting" to grant motion access.

## Limits
- A web page can only count steps while it is open and the screen is on (the app asks the phone to keep the screen awake while counting). All-day background counting needs a native app.
- Prayer times come from the Aladhan API once you share a location in Settings.

## Content sources (please have a knowledgeable person review before sharing widely)
- Surahs 112, 113, 114 and Ayat al-Kursi: text supplied from Quran.com.
- 2:285-286: surahquran.com (Arabic, Uthmani-style) and Quran.com (translation, Clear Quran).
- Duas: Hisn al-Muslim on sunnah.com (86 and 97); Tirmidhi 3388, Ibn Majah 3869.
- Translations of 112-114 and the ruqyah/ajwah wording should be compared against Quran.com / Sunnah.com.
- "A‘udhu bikalimatillah..." is placed in the evening list because Hisn al-Muslim 97 gives it as an evening dhikr.

## Files
index.html, style.css, app.js (UI), data.js (all adhkar text), steps.js (step detector), steps.test.js (`node steps.test.js`), sw.js (offline), manifest.webmanifest, icons/
