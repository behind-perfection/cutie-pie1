/* Library storage layer.
   - Books (PDF/EPUB files) are stored in IndexedDB (binary can't live in localStorage).
   - Book metadata (title/author/size/dates) lives in the app's localStorage state.
   - Also extracts EPUB title/author/cover so books look like real books in the library.
   No UI in this file; app.js owns the views.
*/
(() => {
  'use strict';

  const DB_NAME = 'adhkar-library-v1';
  const DB_VERSION = 1;
  const STORE = 'books';

  let dbPromise = null;
  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('This browser does not support IndexedDB, so books cannot be saved.'));
        return;
      }
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const r = req.result;
          if (!r.objectStoreNames.contains(STORE)) r.createObjectStore(STORE, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('Could not open the book library.'));
        req.onblocked = () => reject(new Error('Opening the book library was blocked by another tab.'));
      } catch (err) { reject(err); }
    });
    return dbPromise;
  }

  async function put(record) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put(record);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error || new Error('Could not save the book.'));
      t.onabort = () => rej(t.error || new Error('Could not save the book.'));
    });
  }

  async function get(id) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).get(id);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error || new Error('Could not read the book.'));
    });
  }

  async function remove(id) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(STORE, 'readwrite');
      t.objectStore(STORE).delete(id);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error || new Error('Could not delete the book.'));
    });
  }

  async function getAll() {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error || new Error('Could not read the library.'));
    });
  }

  // ---------- EPUB metadata / cover extraction ----------

  // Normalizes a path like "OPS/../images/cover.png" against the OPF directory.
  function resolvePath(dir, href) {
    const parts = (dir + href).split('/').filter((p) => p && p !== '.');
    const out = [];
    for (const p of parts) {
      if (p === '..') out.pop();
      else out.push(p);
    }
    return out.join('/');
  }

  function firstText(doc, localNames) {
    for (const name of localNames) {
      let nodes;
      try { nodes = doc.getElementsByTagNameNS('*', name); } catch (e) { nodes = null; }
      if (!nodes) continue;
      for (let i = 0; i < nodes.length; i++) {
        const t = (nodes[i].textContent || '').trim();
        if (t) return t;
      }
    }
    return '';
  }

  function findFile(zip, path) {
    let f = zip.file(path);
    if (f) return f;
    const wanted = path.toLowerCase();
    for (const key of Object.keys(zip.files)) {
      if (!zip.files[key].dir && key.toLowerCase() === wanted) return zip.files[key];
    }
    return null;
  }

  /**
   * Reads the OPF of an EPUB and returns { title, author, coverBlob, coverType }.
   * Throws when the buffer is not a readable EPUB. `env` overrides window globals
   * (used for Node-side testing).
   */
  async function extractEpubInfo(buffer, env) {
    env = env || {};
    const JSZip = env.JSZip || (typeof window !== 'undefined' ? window.JSZip : null);
    const DOMParserImpl = env.DOMParser || (typeof window !== 'undefined' ? window.DOMParser : null);
    if (!JSZip || !DOMParserImpl) throw new Error('EPUB reader assets are not loaded yet.');

    const zip = await JSZip.loadAsync(buffer);

    let containerFile = findFile(zip, 'META-INF/container.xml');
    if (!containerFile) {
      for (const key of Object.keys(zip.files)) {
        if (/^META-INF\/container\.xml$/i.test(key) && !zip.files[key].dir) { containerFile = zip.files[key]; break; }
      }
    }
    if (!containerFile) throw new Error('Not a valid EPUB: META-INF/container.xml is missing.');

    const containerDoc = new DOMParserImpl().parseFromString(await containerFile.async('string'), 'application/xml');
    const rootfile = containerDoc.getElementsByTagName('rootfile')[0];
    if (!rootfile) throw new Error('Not a valid EPUB: container.xml has no rootfile.');
    const packagePath = rootfile.getAttribute('full-path');
    if (!packagePath) throw new Error('Not a valid EPUB: rootfile has no full-path.');

    const packageFile = findFile(zip, packagePath);
    if (!packageFile) throw new Error('Not a valid EPUB: the OPF package is missing.');

    const opfXml = await packageFile.async('string');
    const opf = new DOMParserImpl().parseFromString(opfXml, 'application/xml');

    const title = firstText(opf, ['title']);
    const author = firstText(opf, ['creator']);

    // Find the cover: (1) epub 3 properties="cover-image", (2) meta name="cover",
    // (3) any <item> whose properties contains "cover" (epub 2 "cover" rel).
    const dir = packagePath.replace(/[^/]*$/, '');
    let coverHref = null;
    let coverMime = 'image/jpeg';

    const items = [];
    try {
      const found = opf.getElementsByTagNameNS('*', 'item');
      for (let i = 0; i < found.length; i++) items.push(found[i]);
    } catch (e) {}

    const coverImage = items.find((i) => (i.getAttribute('properties') || '').split(/\s+/).indexOf('cover-image') !== -1);
    if (coverImage) {
      coverHref = coverImage.getAttribute('href');
      coverMime = coverImage.getAttribute('media-type') || coverMime;
    }
    if (!coverHref) {
      const metas = [];
      try {
        const found = opf.getElementsByTagNameNS('*', 'meta');
        for (let i = 0; i < found.length; i++) metas.push(found[i]);
      } catch (e) {}
      const metaCover = metas.find((m) => m.getAttribute('name') === 'cover');
      if (metaCover) {
        const id = metaCover.getAttribute('content');
        const item = items.find((i) => i.getAttribute('id') === id);
        if (item) { coverHref = item.getAttribute('href'); coverMime = item.getAttribute('media-type') || coverMime; }
      }
    }
    if (!coverHref) {
      const item = items.find((i) => {
        const props = (i.getAttribute('properties') || '').split(/\s+/);
        return props.indexOf('cover') !== -1;
      });
      if (item) { coverHref = item.getAttribute('href'); coverMime = item.getAttribute('media-type') || coverMime; }
    }

    let coverBlob = null;
    if (coverHref) {
      try {
        const coverFile = findFile(zip, resolvePath(dir, coverHref));
        if (coverFile) {
          const bytes = await coverFile.async('uint8array');
          const type = coverMime && coverMime !== 'none' ? coverMime : 'image/jpeg';
          coverBlob = new Blob([bytes], { type });
        }
      } catch (e) { coverBlob = null; }
    }

    return { title: title || '', author: author || '', coverBlob, coverType: coverMime || 'image/jpeg' };
  }

  const api = { put, get, remove, getAll, extractEpubInfo };

  if (typeof window !== 'undefined') window.AdhkarStore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
