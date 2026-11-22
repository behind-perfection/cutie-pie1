/* Reader overlay for PDF and EPUB books.
   Builds a full-screen reader (PDF in an iframe, EPUB via epub.js) and tears it
   down cleanly. UI only — the caller supplies book metadata + the stored record.
   Vendor libraries (JSZip + epub.js) are injected lazily when an EPUB opens.
*/
(() => {
  'use strict';

  const VENDOR_SCRIPTS = ['vendor/jszip.min.js', 'vendor/epub.min.js'];
  let libsPromise = null;
  let overlay = null;
  let pdfObjectUrl = null;
  let epubBook = null;
  let rendition = null;
  let activeMeta = null;
  let onCloseCb = null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => res();
      s.onerror = () => rej(new Error(`Could not load ${src}`));
      document.head.appendChild(s);
    });
  }

  function ensureLibs() {
    if (!libsPromise) {
      libsPromise = (async () => {
        if (!window.JSZip) await loadScript(VENDOR_SCRIPTS[0]);
        if (!window.ePub) await loadScript(VENDOR_SCRIPTS[1]);
        if (!window.JSZip || !window.ePub) throw new Error('The EPUB library did not load correctly.');
      })();
    }
    return libsPromise;
  }

  function fmtSize(bytes) {
    if (!bytes) return '';
    const mb = bytes / 1048576;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function isOpen() { return !!overlay; }

  function close(silent) {
    if (!overlay) return;
    const cb = onCloseCb; onCloseCb = null;
    try { if (epubBook) epubBook.destroy(); } catch (e) {}
    try { if (rendition) rendition.destroy(); } catch (e) {}
    if (pdfObjectUrl) { try { URL.revokeObjectURL(pdfObjectUrl); } catch (e) {} pdfObjectUrl = null; }
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null; epubBook = null; rendition = null; activeMeta = null;
    document.body.classList.remove('reader-open', 'toc-open');
    if (!silent && cb) { try { cb(); } catch (e) {} }
  }

  // ---------- overlay chrome ----------

  function buildOverlay(meta) {
    const isPdf = meta.type === 'pdf';
    const el = document.createElement('div');
    el.className = 'reader-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', `Reading ${meta.title}`);
    el.innerHTML = `
      <header class="reader-top">
        <button type="button" class="reader-back" id="readerBack" aria-label="Back to the library">‹ Library</button>
        <div class="reader-head">
          <div class="reader-title">${esc(meta.title)}</div>
          <div class="reader-sub">${esc([meta.author, meta.type.toUpperCase(), fmtSize(meta.size)].filter(Boolean).join(' · '))}</div>
        </div>
        <button type="button" class="reader-dl" id="readerDownload">Download</button>
      </header>
      <div class="reader-body">
        <div class="reader-loading" id="readerLoading">Opening book…</div>
        <div class="reader-viewer" id="readerViewer" hidden></div>
      </div>
      <footer class="reader-bottom" ${isPdf ? 'hidden' : ''}>
        <button type="button" class="reader-nav" id="readerPrev">‹ Prev</button>
        <button type="button" class="reader-toc-toggle" id="readerTocToggle" hidden>☰ Contents</button>
        <div class="reader-meter">
          <div class="reader-progress"><i id="readerProgressBar" style="width:0%"></i></div>
          <div class="reader-chapter" id="readerChapter"></div>
        </div>
        <button type="button" class="reader-nav reader-next" id="readerNext">Next ›</button>
      </footer>
      <aside class="reader-toc" id="readerToc" hidden aria-label="Table of contents">
        <div class="reader-toc-head"><b>Contents</b><button type="button" id="readerTocClose" aria-label="Close contents">✕</button></div>
        <div class="reader-toc-list" id="readerTocList"></div>
      </aside>`;
    return el;
  }

  function buildTocList(items) {
    const ul = document.createElement('ul');
    ul.className = 'reader-toc-ul';
    for (const item of items || []) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'reader-toc-link';
      b.dataset.href = item.href || '';
      b.textContent = item.label || item.id || 'Section';
      li.appendChild(b);
      if (item.subitems && item.subitems.length) li.appendChild(buildTocList(item.subitems));
      ul.appendChild(li);
    }
    return ul;
  }

  // ---------- PDF ----------

  function openPdf(meta, record) {
    const viewer = overlay.querySelector('#readerViewer');
    const loading = overlay.querySelector('#readerLoading');
    if (loading) loading.remove();
    viewer.hidden = false;
    try {
      pdfObjectUrl = URL.createObjectURL(record.blob);
    } catch (e) {
      viewer.innerHTML = `<div class="reader-error"><h3>Could not open this PDF</h3><p>IndexedDB could not provide the file for display.</p><button class="reader-error-close" type="button">Close</button></div>`;
      overlay.querySelector('.reader-error-close').addEventListener('click', close);
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.className = 'reader-pdf';
    iframe.src = pdfObjectUrl;
    iframe.title = meta.title || 'PDF book';
    viewer.appendChild(iframe);
    const fallback = document.createElement('div');
    fallback.className = 'reader-fallback';
    const openLink = document.createElement('a');
    openLink.href = pdfObjectUrl;
    openLink.target = '_blank';
    openLink.rel = 'noopener';
    openLink.textContent = 'Open in browser';
    const dlLink = document.createElement('a');
    dlLink.href = pdfObjectUrl;
    dlLink.download = meta.fileName || 'book.pdf';
    dlLink.textContent = 'Download a copy';
    fallback.appendChild(openLink);
    fallback.appendChild(document.createTextNode(' · '));
    fallback.appendChild(dlLink);
    viewer.appendChild(fallback);
  }

  // ---------- EPUB ----------

  function setError(message) {
    if (!overlay) return;
    const loading = overlay.querySelector('#readerLoading');
    const viewer = overlay.querySelector('#readerViewer');
    if (loading) loading.remove();
    if (viewer) {
      viewer.hidden = false;
      viewer.innerHTML = `<div class="reader-error"><h3>Could not open this EPUB</h3><p>${esc(message)}</p><button class="reader-error-close" type="button">Close</button></div>`;
      const b = viewer.querySelector('.reader-error-close');
      if (b) b.addEventListener('click', close);
    }
  }

  async function openEpub(meta, record) {
    try { await ensureLibs(); } catch (e) { setError('The EPUB reader could not be loaded. Check that the app is served over HTTPS or localhost, and try again.'); return; }
    if (!overlay) return; // closed while loading
    const viewer = overlay.querySelector('#readerViewer');
    viewer.hidden = false;
    let buf;
    try { buf = await record.blob.arrayBuffer(); } catch (e) { setError('The file could not be read back from storage.'); return; }
    if (!overlay) return;
    try {
      epubBook = window.ePub(buf);
    } catch (e) { setError('The file is damaged or not a valid EPUB.'); return; }
    try {
      rendition = epubBook.renderTo(viewer, {
        manager: 'continuous',
        flow: 'scrolled',
        width: '100%',
        height: '100%',
        stylesheet: null,
      });
      rendition.themes.default({
        'body': 'font-family: Georgia, "Times New Roman", serif; background: #fdfaf3; color: #20302a; line-height: 1.72; max-width: 42rem; margin: 0 auto; padding: 1.1rem 1.3rem 3.5rem; font-size: 1.05rem;',
        'a': 'color: #1f6f5c; text-decoration: underline;',
        'img, svg': 'max-width: 100%; height: auto; display: block; margin: 0 auto;',
        'p': 'margin: 0 0 1em;',
        'h1, h2, h3, h4, h5, h6': 'line-height: 1.35; margin: 1.4em 0 .6em;',
        'blockquote': 'margin: 1em 0; padding: .6em 1em; border-left: 3px solid #d9d2bd; color: #405148;',
      });
      rendition.on('relocated', (loc) => onRelocated(loc));
      await rendition.display();
    } catch (e) {
      setError('The EPUB could not be rendered. It may use an unsupported layout.');
      return;
    }
    const loading = overlay && overlay.querySelector('#readerLoading');
    if (loading) loading.remove();
    bindNavigation();
    populateToc();
  }

  function onRelocated(loc) {
    if (!overlay) return;
    const start = loc && loc.start ? loc.start : null;
    if (!start) return;
    const bar = overlay.querySelector('#readerProgressBar');
    const chapter = overlay.querySelector('#readerChapter');
    const pct = typeof start.percentage === 'number' ? Math.max(0, Math.min(1, start.percentage)) : 0;
    if (bar) bar.style.width = `${Math.round(pct * 100)}%`;
    if (chapter) {
      const total = start.displayed && start.displayed.total;
      const page = start.displayed && start.displayed.page;
      chapter.textContent = total ? `Page ${page} of ${total}` : `${Math.round(pct * 100)}% read`;
    }
  }

  function populateToc() {
    if (!epubBook || !overlay) return;
    try {
      epubBook.loaded.navigation.then((navigation) => {
        if (!overlay || !navigation) return;
        const toc = navigation.toc || [];
        if (!toc.length) return;
        const list = overlay.querySelector('#readerTocList');
        if (list) {
          list.innerHTML = '';
          list.appendChild(buildTocList(toc));
          const toggle = overlay.querySelector('#readerTocToggle');
          if (toggle) { toggle.hidden = false; }
        }
      }).catch(() => {});
    } catch (e) {}
  }

  function bindNavigation() {
    if (!overlay) return;
    const prev = overlay.querySelector('#readerPrev');
    const next = overlay.querySelector('#readerNext');
    const tocToggle = overlay.querySelector('#readerTocToggle');
    const toc = overlay.querySelector('#readerToc');
    const tocClose = overlay.querySelector('#readerTocClose');
    const tocList = overlay.querySelector('#readerTocList');
    if (prev) prev.addEventListener('click', () => { if (rendition) rendition.prev().catch(() => {}); });
    if (next) next.addEventListener('click', () => { if (rendition) rendition.next().catch(() => {}); });
    if (tocToggle) tocToggle.addEventListener('click', () => {
      if (!toc) return;
      const willOpen = toc.hasAttribute('hidden');
      if (willOpen) { toc.removeAttribute('hidden'); document.body.classList.add('toc-open'); }
      else { toc.setAttribute('hidden', ''); document.body.classList.remove('toc-open'); }
    });
    if (tocClose) tocClose.addEventListener('click', () => {
      if (!toc) return;
      toc.setAttribute('hidden', ''); document.body.classList.remove('toc-open');
    });
    if (tocList) tocList.addEventListener('click', (e) => {
      const btn = e.target.closest('.reader-toc-link');
      if (!btn || !rendition) return;
      const href = btn.dataset.href;
      if (!href || !overlay) return;
      try { rendition.display(href).catch(() => {}); } catch (e) {}
      const toc = overlay.querySelector('#readerToc');
      if (toc) toc.setAttribute('hidden', '');
      document.body.classList.remove('toc-open');
    });
  }

  function bindOverlay(record) {
    const back = overlay.querySelector('#readerBack');
    const download = overlay.querySelector('#readerDownload');
    if (back) back.addEventListener('click', close);
    if (download) download.addEventListener('click', () => {
      const url = URL.createObjectURL(record.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeMeta ? activeMeta.fileName : 'book';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 5000);
    });
  }

  const api = {
    open(meta, record, opts) {
      close(true);
      activeMeta = meta;
      onCloseCb = opts && typeof opts.onClose === 'function' ? opts.onClose : null;
      pdfObjectUrl = null;
      epubBook = null;
      rendition = null;
      overlay = buildOverlay(meta);
      document.body.appendChild(overlay);
      document.body.classList.add('reader-open');
      if (meta.type === 'pdf') {
        openPdf(meta, record);
      } else {
        openEpub(meta, record);
      }
      bindOverlay(record);
    },

    close() { close(); },

    isOpen() { return isOpen(); },

    ensureLibs() { return ensureLibs(); },
  };

  if (typeof window !== 'undefined') window.AdhkarReader = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
