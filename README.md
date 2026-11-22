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

## Library (PDF & EPUB)
A Library tab holds PDF and EPUB books stored entirely on the device (no accounts, no uploads):
- Add books from a file picker — PDF opens in the browser’s built-in PDF viewer inside the app; EPUB opens in the built-in reader.
- Each card shows the book’s title (read from the EPUB’s own metadata when possible), author, size and dates; EPUB covers from the file are shown.
- Readers: EPUB gets a continuous reading view with previous/next navigation, a contents panel, progress bar and chapter label; PDFs get an in-app viewer with an open-in-browser / download fallback.
- Download a copy, or delete; deleting removes the file from this device.
- The JSON backup in Settings contains adhkar/steps/habit data and library metadata, but not the book files themselves — those live in this browser’s IndexedDB and are lost if the browser data is cleared.
- epub.js (MIT) renders EPUBs; JSZip (MIT) reads the EPUB archive. The vendor files are in `vendor/` and load only when a library EPUB opens.

## Logo
The app icon (`icons/icon.svg` + generated PNGs: 192/512, plus maskable variants and a 180px apple-touch icon) is a rounded-green tile with a gold crescent moon, four ascending steps over an open book, and a four-pointed star. It shows up in the header, the favicon and the app manifest; the library empty state uses the same artwork.

## Files
index.html, style.css, app.js (UI), data.js (all adhkar text), steps.js (step detector), steps.test.js (`node steps.test.js`), library-store.js (book storage + EPUB metadata), library-reader.js (PDF/EPUB reader overlay), vendor/ (jszip.min.js, epub.min.js), sw.js (offline), manifest.webmanifest, icons/
