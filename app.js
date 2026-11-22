(() => {
  const KEY = 'adhkar-walk-v1';
  const DEFAULTS = {
    settings: { goal: 10000, strideCm: 70, weightKg: 65, sens: 1.2, arabicSize: 30, school: 0, method: 1, lat: null, lng: null, keepAwake: true },
    days: {}, timings: null, tab: 'walk',
    library: { books: [] },
  };
  const $ = (s, r = document) => r.querySelector(s);
  const view = $('#view');

  // ---------- storage ----------
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY)) || {};
      return { ...DEFAULTS, ...s, settings: { ...DEFAULTS.settings, ...(s.settings || {}) }, library: { books: [], ...(s.library || {}) } };
    } catch { return JSON.parse(JSON.stringify(DEFAULTS)); }
  }
  let state = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  const dkey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const readDay = (k = dkey()) => state.days[k] || { steps: 0, counts: {}, habits: {} };
  const day = (k = dkey()) => (state.days[k] ||= { steps: 0, counts: {}, habits: {} });
  const fmt = (n) => Math.round(n).toLocaleString();

  const fmtSize = (bytes) => {
    if (!bytes) return '0 KB';
    const mb = bytes / 1048576;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };
  const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const newId = () => `book-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const relTime = (ts) => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const t = new Date(ts); t.setHours(0, 0, 0, 0);
    const days = Math.round((d - t) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };
  const ensureEpubAssets = () =>
    (window.AdhkarReader && typeof window.AdhkarReader.ensureLibs === 'function')
      ? window.AdhkarReader.ensureLibs()
      : Promise.resolve();

  let toastTimer = null;
  function toast(msg) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
  }

  let coverUrls = [];
  function revokeCoverUrls() {
    for (const url of coverUrls) { try { URL.revokeObjectURL(url); } catch {} }
    coverUrls = [];
  }
  async function mountLibraryCovers() {
    if (state.tab !== 'library' || (window.AdhkarReader && window.AdhkarReader.isOpen())) return;
    revokeCoverUrls();
    const imgs = Array.from(view.querySelectorAll('img[data-cover-id]'));
    await Promise.all(imgs.map(async (img) => {
      const id = img.dataset.coverId;
      try {
        const rec = await AdhkarStore.get(id);
        if (!rec || !rec.coverBlob || !img.isConnected) return;
        const url = URL.createObjectURL(rec.coverBlob);
        coverUrls.push(url);
        img.onload = () => img.classList.add('ready');
        img.onerror = () => img.removeAttribute('src');
        img.src = url;
      } catch {}
    }));
  }

  // ---------- completion + streak ----------
  const listDone = (d, period) => LISTS[period].every((id) => (d.counts[`${period}:${id}`] || 0) >= ITEMS[id].count);
  const dayComplete = (d) => listDone(d, 'morning') && listDone(d, 'evening');
  function streak() {
    let n = 0; const d = new Date();
    if (!dayComplete(readDay(dkey(d)))) d.setDate(d.getDate() - 1);
    while (dayComplete(readDay(dkey(d)))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- prayer times (Aladhan) ----------
  const hm = (s) => { if (!s) return null; const [h, m] = s.split(' ')[0].split(':').map(Number); return h * 60 + m; };
  const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  async function ensureTimings() {
    const s = state.settings, t = state.timings;
    if (s.lat == null || s.lng == null) return null;
    if (t && t.date === dkey() && t.lat === s.lat && t.lng === s.lng && t.method === s.method && t.school === s.school) return t;
    try {
      const n = new Date();
      const url = `https://api.aladhan.com/v1/timings/${String(n.getDate()).padStart(2, '0')}-${String(n.getMonth() + 1).padStart(2, '0')}-${n.getFullYear()}?latitude=${s.lat}&longitude=${s.lng}&method=${s.method}&school=${s.school}`;
      const r = await fetch(url); const j = await r.json(); const T = j.data.timings;
      state.timings = { date: dkey(), lat: s.lat, lng: s.lng, method: s.method, school: s.school,
        fajr: T.Fajr.split(' ')[0], sunrise: T.Sunrise.split(' ')[0], dhuhr: T.Dhuhr.split(' ')[0], asr: T.Asr.split(' ')[0], maghrib: T.Maghrib.split(' ')[0], isha: T.Isha.split(' ')[0] };
      save(); return state.timings;
    } catch { return t && t.date === dkey() ? t : null; }
  }
  function currentPeriod() {
    const t = state.timings && state.timings.date === dkey() ? state.timings : null;
    const dhuhr = t ? hm(t.dhuhr) : 12 * 60;
    return nowMin() < dhuhr ? 'morning' : 'evening';
  }

  // ---------- step sensor ----------
  let sensor = 'idle'; // idle | running | unsupported | denied | nodata
  let detector = null, lastSave = 0, gotData = false, wakeLock = null, evCount = 0, evSince = 0;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    gotData = true;
    const now = performance.now();
    evCount++;
    if (now - evSince > 1000) {
      const el = $('#sensorInfo'); if (el) el.textContent = `Sensor: ${Math.round(evCount * 1000 / (now - evSince))} readings/s`;
      evCount = 0; evSince = now;
    }
    const c = detector.push(a.x, a.y, a.z, now);
    if (c > 0) {
      day().steps += c;
      if (Date.now() - lastSave > 2000) { save(); lastSave = Date.now(); }
      updateWalkLive();
    }
  }
  async function startSensor() {
    if (!('DeviceMotionEvent' in window)) { sensor = 'unsupported'; return render(); }
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const r = await DeviceMotionEvent.requestPermission();
        if (r !== 'granted') { sensor = 'denied'; return render(); }
      }
    } catch { sensor = 'denied'; return render(); }
    detector = StepDetector({ threshold: state.settings.sens });
    gotData = false; evCount = 0; evSince = performance.now();
    window.addEventListener('devicemotion', onMotion);
    sensor = 'running'; render();
    if (state.settings.keepAwake) requestWake();
    setTimeout(() => { if (sensor === 'running' && !gotData) { stopSensor(); sensor = 'nodata'; render(); } }, 3000);
  }
  function stopSensor() {
    window.removeEventListener('devicemotion', onMotion);
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    save(); sensor = 'idle';
  }
  async function requestWake() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch {}
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sensor === 'running' && state.settings.keepAwake) requestWake();
    if (document.visibilityState === 'hidden') save();
  });

  // ---------- views ----------
  const R = 92, C = 2 * Math.PI * R;
  function metrics(steps) {
    const s = state.settings, km = steps * s.strideCm / 100000;
    return { km, kcal: km * s.weightKg * 0.75, pct: Math.min(1, steps / s.goal) };
  }
  function viewWalk() {
    const d = readDay(), s = state.settings, m = metrics(d.steps);
    const msgs = {
      idle: '', running: '<div class="notice">Counting. Keep this screen open and the phone in a pocket or hand while you walk. Steps are added once you have taken about six in a row at a steady pace. <span class="muted small" id="sensorInfo"></span></div>',
      unsupported: '<div class="notice">This browser has no motion sensor. Open the app on your phone, or add steps by hand below.</div>',
      denied: '<div class="notice">Motion access was refused. Allow it in your browser’s site settings, then press Start again.</div>',
      nodata: '<div class="notice">No motion data arrived. This usually means a desktop browser. Use your phone, or add steps by hand.</div>',
    };
    const bars = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      bars.push({ k: dkey(dt), label: dt.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2), steps: readDay(dkey(dt)).steps, today: i === 0 });
    }
    const max = Math.max(s.goal, ...bars.map((b) => b.steps));
    return `
      <section class="card">
        <div class="ring-wrap">
          <svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label="Steps progress">
            <circle class="ring-bg" cx="110" cy="110" r="${R}" fill="none" stroke-width="14"/>
            <circle class="ring-fg" id="ring" cx="110" cy="110" r="${R}" fill="none" stroke-width="14" stroke-linecap="round"
              stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - m.pct)}" transform="rotate(-90 110 110)"/>
          </svg>
          <div class="ring-text"><div class="n" id="stepNum">${fmt(d.steps)}</div><div class="g">of ${fmt(s.goal)} steps</div></div>
        </div>
        <div class="stats">
          <div><b id="km">${m.km.toFixed(2)}</b><span>km</span></div>
          <div><b id="kcal">${fmt(m.kcal)}</b><span>kcal (approx.)</span></div>
          <div><b id="pct">${Math.round(m.pct * 100)}%</b><span>of goal</span></div>
        </div>
        <div class="row center" style="margin-top:14px">
          <button class="btn" id="toggle">${sensor === 'running' ? 'Pause counting' : 'Start counting'}</button>
          <button class="btn ghost" id="addSteps">Add steps</button>
        </div>
        ${msgs[sensor] ? `<div style="margin-top:12px">${msgs[sensor]}</div>` : ''}
      </section>
      <section class="card">
        <h2>Last 7 days</h2>
        <div class="bars">${bars.map((b) => `<div class="bar ${b.today ? 'today' : ''}" title="${fmt(b.steps)} steps"><i style="height:${Math.max(3, (b.steps / max) * 100)}%"></i><em>${b.label}</em></div>`).join('')}</div>
        <p class="muted small" style="margin:10px 0 0">A web app can only count while this page is open and the screen is on. Distance uses your stride length from Settings.</p>
      </section>`;
  }
  function updateWalkLive() {
    if (state.tab !== 'walk') return;
    const d = readDay(), m = metrics(d.steps);
    const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    set('stepNum', fmt(d.steps)); set('km', m.km.toFixed(2)); set('kcal', fmt(m.kcal)); set('pct', Math.round(m.pct * 100) + '%');
    const ring = $('#ring'); if (ring) ring.setAttribute('stroke-dashoffset', C * (1 - m.pct));
  }

  const indic = (n) => String(n).replace(/\d/g, (c) => '٠١٢٣٤٥٦٧٨٩'[c]);
  // Verse-end markers are drawn in CSS so they look right even when the Quran font is not available.
  function arabicHtml(it) {
    if (it.start == null) return it.arabic;
    return it.arabic.split('۝').map((p) => p.trim()).map((p, i) => `${p} <span class="vn">${indic(it.start + i)}</span>`).join(' ');
  }
  function dhikrCard(id, period, d) {
    const it = ITEMS[id], key = `${period}:${id}`, n = d.counts[key] || 0, done = n >= it.count;
    return `
      <article class="card dhikr ${done ? 'done' : ''}">
        <header><h3>${it.title}</h3><span class="ref">${it.count > 1 ? `${it.count}×` : '1×'}</span></header>
        ${it.bism ? `<div class="ar bism">${BISM}</div>` : ''}
        <div class="ar">${arabicHtml(it)}</div>
        ${it.translit ? `<div class="translit">${it.translit}</div>` : ''}
        <details><summary>English meaning</summary><p class="trans">${it.translation}</p></details>
        <div class="ref" style="margin-top:6px">${it.ref}</div>
        <button class="counter" data-key="${key}" data-id="${id}" ${done ? '' : ''}>${done ? '✓ Done' : `${n} / ${it.count} — tap to count`}</button>
        ${n > 0 ? `<button class="btn ghost small" data-reset="${key}" style="margin-top:8px">Reset</button>` : ''}
      </article>`;
  }
  let adhkarPeriod = null;
  function viewAdhkar() {
    adhkarPeriod ||= currentPeriod();
    const p = adhkarPeriod, d = readDay(), list = LISTS[p];
    const done = list.filter((id) => (d.counts[`${p}:${id}`] || 0) >= ITEMS[id].count).length;
    const t = state.timings && state.timings.date === dkey() ? state.timings : null;
    const when = p === 'morning'
      ? `Best after Fajr${t ? ` (${t.fajr})` : ''} until sunrise${t ? ` (${t.sunrise})` : ''}; many scholars allow it until Dhuhr.`
      : `Best after Asr${t ? ` (${t.asr})` : ''} until Maghrib${t ? ` (${t.maghrib})` : ''}; many scholars allow it into the evening.`;
    return `
      <div class="seg" role="group" aria-label="Time of day">
        <button data-period="morning" aria-pressed="${p === 'morning'}">Morning</button>
        <button data-period="evening" aria-pressed="${p === 'evening'}">Evening</button>
      </div>
      <p class="muted small" style="margin:10px 4px 0">${when}${t ? '' : ' Set your location in Settings to see prayer times here.'}</p>
      <div class="progress"><i style="width:${(done / list.length) * 100}%"></i></div>
      <div class="muted small" style="margin:0 4px 4px">${done} of ${list.length} complete</div>
      ${list.map((id) => dhikrCard(id, p, d)).join('')}`;
  }

  function viewHabits() {
    const d = readDay(), h = d.habits;
    const sleepDone = LISTS.sleep.filter((id) => (d.counts[`sleep:${id}`] || 0) >= ITEMS[id].count).length;
    return `
      <section class="card">
        <h2>Ajwah dates</h2>
        <label class="check"><input type="checkbox" data-habit="dates" ${h.dates ? 'checked' : ''}>
          <span>Ate seven ajwah dates this morning on an empty stomach</span></label>
        <p class="muted small" style="margin:6px 0 0">Narrated in Sahih al-Bukhari (5445) and Sahih Muslim (2047). Read it on
          <a href="https://sunnah.com/bukhari:5445" target="_blank" rel="noopener">sunnah.com</a>.</p>
      </section>
      <section class="card">
        <h2>Ayat al-Kursi after each prayer</h2>
        ${PRAYERS.map(([k, n]) => `<label class="check"><input type="checkbox" data-habit="kursi_${k}" ${h['kursi_' + k] ? 'checked' : ''}><span>After ${n}</span></label>`).join('')}
      </section>
      <section class="card">
        <h2>Before sleep</h2>
        <p class="muted small" style="margin:0">Ayat al-Kursi, the three short surahs, and the last two verses of Al-Baqarah. ${sleepDone} of ${LISTS.sleep.length} done tonight.</p>
      </section>
      ${LISTS.sleep.map((id) => dhikrCard(id, 'sleep', d)).join('')}`;
  }

  function viewRuqyah() {
    return `
      <section class="card prose">
        <h2>Ruqyah shar‘iyyah</h2>
        <p>Ruqyah means seeking healing by reciting the Quran and authentic supplications, with the belief that all benefit and cure are from Allah alone.</p>
        <h3>What makes it permissible</h3>
        <ul>
          <li>The words are the Quran, the names and attributes of Allah, or authentic prophetic supplications.</li>
          <li>It is in a language that is understood, with no shirk and no unclear or hidden words.</li>
          <li>You believe the healing comes from Allah, not from the words or the reciter by themselves.</li>
        </ul>
        <p class="muted small">The Prophet ﷺ said there is no harm in ruqyah as long as it contains no shirk (Sahih Muslim 2200). The three conditions above are those stated by scholars such as Ibn Hajar.</p>
        <h3>Commonly recited</h3>
        <ul>
          <li>Al-Fatihah, Ayat al-Kursi, and the last two verses of Al-Baqarah</li>
          <li>Al-Ikhlas, Al-Falaq and An-Nas</li>
          <li>The prophetic duas in the Adhkar tab</li>
        </ul>
        <h3>What to avoid</h3>
        <ul>
          <li>Anyone who claims to know the unseen, asks for personal items, names or your mother’s name, or tells you to do unusual rituals.</li>
          <li>Amulets, charms, or words you cannot understand.</li>
        </ul>
        <h3>Treatment too</h3>
        <p>Seeking medical care is part of the Sunnah: Allah sent down a cure for every disease (Sahih al-Bukhari 5678). If you have physical or mental health symptoms, see a doctor as well as using ruqyah.</p>
        <p class="muted small">This is general guidance, not a fatwa. For your own situation, ask a qualified scholar.</p>
      </section>`;
  }

  function viewLibrary() {
    const books = state.library.books;
    const totalSize = books.reduce((n, b) => n + (b.size || 0), 0);
    const byline = (b) => {
      const bits = [];
      if (b.author) bits.push(b.author);
      bits.push(fmtSize(b.size));
      return bits.join(' · ');
    };
    const cards = books.map((b) => `
        <article class="book" data-id="${b.id}">
          <div class="book-cover ${b.type}">
            <div class="book-placeholder">
              <span class="book-initial">${escHtml((b.title || '?').trim().charAt(0).toUpperCase() || '?')}</span>
              <span class="book-type-badge">${b.type === 'pdf' ? 'PDF' : 'EPUB'}</span>
            </div>
            <img data-cover-id="${b.id}" alt="Cover of ${escHtml(b.title)}" loading="lazy">
          </div>
          <div class="book-info">
            <h3 class="book-title">${escHtml(b.title)}</h3>
            <p class="book-meta">${escHtml(byline(b))}</p>
            <p class="book-added">Added ${new Date(b.addedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}${b.lastOpenedAt ? ` · opened ${relTime(b.lastOpenedAt)}` : ''}</p>
          </div>
          <div class="book-actions">
            <button class="btn small" data-lib-open="${b.id}">Read</button>
            <button class="btn ghost small" data-lib-download="${b.id}">Download</button>
            <button class="btn ghost small danger" data-lib-delete="${b.id}" aria-label="Delete ${escHtml(b.title)}">✕</button>
          </div>
        </article>`).join('');
    return `
      <section class="card library-head">
        <div class="library-head-row">
          <div>
            <h2>My library</h2>
            <p class="muted small">${books.length ? `${books.length} book${books.length > 1 ? 's' : ''} · ${fmtSize(totalSize)} · stored only on this device` : 'Your library is empty'}</p>
          </div>
          <button class="btn" data-lib-add>Add books</button>
        </div>
        <p class="muted small library-hint">PDF and EPUB files live in this browser on this device — nothing is uploaded.</p>
        <input type="file" id="bookPicker" class="visually-hidden-file" accept=".pdf,.epub,application/pdf,application/epub+zip" multiple>
      </section>
      ${books.length ? `<div class="books">${cards}</div>` : `
        <section class="library-empty">
          <img class="library-empty-logo" src="icons/icon.svg" alt="" width="74" height="74">
          <h2>Add your first book</h2>
          <p>PDF and EPUB files are supported. They are stored only in this browser — no account, no cloud, no upload.</p>
          <button class="btn" data-lib-add>Add a book</button>
        </section>`}`;
  }

  async function openBook(id) {
    const meta = state.library.books.find((b) => b.id === id);
    if (!meta) return;
    let rec = null;
    try { rec = await AdhkarStore.get(id); } catch {}
    if (!rec || !rec.blob) { toast('This book is no longer stored on this device. Delete it and add it again.'); return; }
    meta.lastOpenedAt = Date.now();
    save();
    window.AdhkarReader.open(meta, rec, { onClose: () => render() });
  }

  async function downloadBook(id) {
    const meta = state.library.books.find((b) => b.id === id);
    if (!meta) return;
    let rec = null;
    try { rec = await AdhkarStore.get(id); } catch {}
    if (!rec || !rec.blob) { toast('This book is no longer stored on this device.'); return; }
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = meta.fileName || meta.title || 'book';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 5000);
    toast(`Downloading “${meta.title}”.`);
  }

  async function deleteBook(id) {
    const meta = state.library.books.find((b) => b.id === id);
    if (!meta) return;
    if (!confirm(`Delete “${meta.title}” from your library? This removes the file from this device.`)) return;
    try { await AdhkarStore.remove(id); } catch {}
    state.library.books = state.library.books.filter((b) => b.id !== id);
    save();
    render();
    toast(`Deleted “${meta.title}”.`);
  }

  async function handleBookFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const picked = [];
    const skipped = [];
    for (const f of files) {
      const ext = f.name.split('.').pop().toLowerCase();
      const type = ext === 'pdf' ? 'pdf' : ext === 'epub' ? 'epub'
        : f.type === 'application/pdf' ? 'pdf' : f.type === 'application/epub+zip' ? 'epub' : null;
      if (!type) { skipped.push(f.name); continue; }
      picked.push({ f, type, name: f.name.replace(/\.(pdf|epub)$/i, '') || 'Untitled' });
    }
    if (!picked.length) { toast('Only PDF and EPUB files are supported.'); return; }
    let added = 0;
    for (const { f, type, name } of picked) {
      const id = newId();
      const meta = { id, title: name, author: '', type, size: f.size, fileName: f.name, addedAt: Date.now(), lastOpenedAt: 0 };
      let coverBlob = null;
      if (type === 'epub') {
        try {
          await ensureEpubAssets();
          const buf = await f.arrayBuffer();
          const info = await AdhkarStore.extractEpubInfo(buf).catch(() => null);
          if (info) {
            if (info.title) meta.title = info.title;
            if (info.author) meta.author = info.author;
            coverBlob = info.coverBlob || null;
          }
        } catch {}
      }
      try {
        await AdhkarStore.put({ id, blob: f, coverBlob });
      } catch {
        toast(`Could not save “${meta.title}”. Your browser may be full or the library unavailable.`);
        continue;
      }
      state.library.books.push(meta);
      added++;
    }
    save();
    const parts = [];
    if (added) parts.push(`Added ${added} book${added > 1 ? 's' : ''}.`);
    if (skipped.length) parts.push(`Skipped ${skipped.length} unsupported file${skipped.length > 1 ? 's' : ''}.`);
    if (parts.length) toast(parts.join(' '));
    render();
  }

  function viewSettings() {
    const s = state.settings;
    const f = (id, label, type, val, extra = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${val}" ${extra}></div>`;
    return `
      <section class="card">
        <h2>Walking</h2>
        ${f('goal', 'Daily step goal', 'number', s.goal, 'min="1000" step="500" inputmode="numeric"')}
        ${f('stride', 'Stride length (cm)', 'number', s.strideCm, 'min="30" max="120" inputmode="numeric"')}
        ${f('weight', 'Body weight (kg), for calorie estimate', 'number', s.weightKg, 'min="25" max="250" inputmode="numeric"')}
        <div class="field"><label for="sens">Step sensitivity (lower counts more)</label><input id="sens" type="range" min="0.6" max="2.4" step="0.1" value="${s.sens}"></div>
        <label class="check"><input type="checkbox" id="awake" ${s.keepAwake ? 'checked' : ''}><span>Keep the screen on while counting</span></label>
      </section>
      <section class="card">
        <h2>Prayer times</h2>
        <p class="muted small" style="margin:0 0 8px">Used to show the morning and evening windows. Your location stays on this device and is only sent to the Aladhan prayer-times service.</p>
        <div class="row"><button class="btn small" id="geo">Use my location</button>
          <span class="muted small">${s.lat != null ? `Saved: ${(+s.lat).toFixed(2)}, ${(+s.lng).toFixed(2)}` : 'Not set'}</span></div>
        <div class="field"><label for="method">Calculation method</label>
          <select id="method">${[[1, 'University of Islamic Sciences, Karachi'], [2, 'ISNA'], [3, 'Muslim World League'], [4, 'Umm al-Qura, Makkah'], [5, 'Egyptian General Authority']].map(([v, n]) => `<option value="${v}" ${s.method == v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="school">Asr time</label>
          <select id="school"><option value="0" ${s.school == 0 ? 'selected' : ''}>Standard (Shafi‘i, Maliki, Hanbali)</option><option value="1" ${s.school == 1 ? 'selected' : ''}>Hanafi</option></select></div>
      </section>
      <section class="card">
        <h2>Reading</h2>
        <div class="field"><label for="asize">Arabic text size</label><input id="asize" type="range" min="22" max="44" step="1" value="${s.arabicSize}"></div>
        <div class="ar" style="margin:0">ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ</div>
      </section>
      <section class="card">
        <h2>Your data</h2>
        <p class="muted small" style="margin:0 0 8px">Everything is stored only in this browser. Book files (PDF/EPUB) live in the browser’s storage by themselves and are not included in the backup below.</p>
        <div class="row"><button class="btn ghost small" id="export">Download backup</button>
          <button class="btn ghost small" id="resetToday">Reset today</button></div>
      </section>`;
  }

  // ---------- render + events ----------
  const VIEWS = { walk: viewWalk, adhkar: viewAdhkar, habits: viewHabits, ruqyah: viewRuqyah, library: viewLibrary, settings: viewSettings };
  function chrome() {
    const h = new Date().getHours();
    $('#hello').textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    $('#today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    const n = streak(); $('#streak').textContent = n > 0 ? `🔥 ${n} day${n > 1 ? 's' : ''}` : 'Adhkar streak: 0';
    document.querySelectorAll('#tabs button').forEach((b) => { if (b.dataset.tab === state.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    document.documentElement.style.setProperty('--arabic', state.settings.arabicSize + 'px');
  }
  function render() {
    const y = window.scrollY;
    view.innerHTML = VIEWS[state.tab]();
    chrome();
    mountLibraryCovers();
    window.scrollTo(0, y);
  }

  const num = (id, min, max) => { const v = parseFloat($('#' + id).value); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null; };
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.tab) { state.tab = t.dataset.tab; save(); render(); window.scrollTo(0, 0); return; }
    if (t.dataset.libAdd) { const p = $('#bookPicker'); if (p) p.click(); return; }
    if (t.dataset.libOpen) { await openBook(t.dataset.libOpen); return; }
    if (t.dataset.libDownload) { await downloadBook(t.dataset.libDownload); return; }
    if (t.dataset.libDelete) { await deleteBook(t.dataset.libDelete); return; }
    if (t.dataset.period) { adhkarPeriod = t.dataset.period; render(); return; }
    if (t.classList.contains('counter')) {
      const d = day(), k = t.dataset.key, max = ITEMS[t.dataset.id].count;
      if ((d.counts[k] || 0) < max) { d.counts[k] = (d.counts[k] || 0) + 1; if (navigator.vibrate) navigator.vibrate(15); save(); render(); }
      return;
    }
    if (t.dataset.reset) { delete day().counts[t.dataset.reset]; save(); render(); return; }
    if (t.id === 'toggle') { sensor === 'running' ? (stopSensor(), render()) : startSensor(); return; }
    if (t.id === 'addSteps') {
      const v = parseInt(prompt('Add how many steps? (use a negative number to subtract)', '100'), 10);
      if (Number.isFinite(v)) { const d = day(); d.steps = Math.max(0, d.steps + v); save(); render(); }
      return;
    }
    if (t.id === 'geo') {
      if (!navigator.geolocation) return alert('This browser cannot share a location.');
      navigator.geolocation.getCurrentPosition(async (p) => {
        state.settings.lat = +p.coords.latitude.toFixed(3); state.settings.lng = +p.coords.longitude.toFixed(3);
        state.timings = null; save(); await ensureTimings(); render();
      }, () => alert('Location was not shared. Prayer times will use default morning and evening windows.'));
      return;
    }
    if (t.id === 'export') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
      a.download = `adhkar-steps-backup-${dkey()}.json`; a.click(); return;
    }
    if (t.id === 'resetToday') { if (confirm('Clear today’s steps and adhkar progress?')) { state.days[dkey()] = { steps: 0, counts: {}, habits: {} }; save(); render(); } }
  });
  document.addEventListener('change', async (e) => {
    const t = e.target, s = state.settings;
    if (t.dataset.habit) { day().habits[t.dataset.habit] = t.checked; save(); return; }
    if (t.id === 'bookPicker') { await handleBookFiles(t.files); t.value = ''; return; }
    const map = { goal: () => (s.goal = num('goal', 1000, 100000) ?? s.goal), stride: () => (s.strideCm = num('stride', 30, 120) ?? s.strideCm),
      weight: () => (s.weightKg = num('weight', 25, 250) ?? s.weightKg), awake: () => (s.keepAwake = t.checked),
      method: () => { s.method = +t.value; state.timings = null; }, school: () => { s.school = +t.value; state.timings = null; } };
    if (map[t.id]) { map[t.id](); save(); if (t.id === 'method' || t.id === 'school') await ensureTimings(); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'asize') { state.settings.arabicSize = +t.value; document.documentElement.style.setProperty('--arabic', t.value + 'px'); save(); }
    if (t.id === 'sens') { state.settings.sens = +t.value; if (detector) detector = StepDetector({ threshold: +t.value }); save(); }
  });

  window.addEventListener('pagehide', save);
  render();
  ensureTimings().then((t) => { if (t) render(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
