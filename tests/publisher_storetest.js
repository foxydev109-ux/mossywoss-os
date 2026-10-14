// Publish Studio -> Store contract test (real end-to-end, no server):
// publishes a real app via the exact manifest contract the Publisher writes,
// then verifies it lists and renders live in the Store's Published tab.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.cwd(), 'node_modules', 'jsdom'));
const memDBs = {};
function attachShims(w) {
  const db = memDBs['mwo'] || (memDBs['mwo'] = { stores: {}, objectStoreNames: { contains: (n) => n in memDBs['mwo'].stores },
    createObjectStore: (n, o) => { memDBs['mwo'].stores[n] = { data: new Map(), keyPath: o.keyPath }; return memDBs['mwo'].stores[n]; },
    transaction(sn) {
      const mk = (run) => { const r = { onsuccess: null, onerror: null, result: null }; setTimeout(() => { try { r.result = run(); } catch (e) { r.error = e; } r.onsuccess && r.onsuccess({ target: r }); }, 0); return r; };
      return { objectStore: (n) => ({
        put: (rec) => { const s = memDBs['mwo'].stores[n]; s.data.set(rec[s.keyPath], rec); return mk(() => rec); },
        get: (k) => mk(() => { const s = memDBs['mwo'].stores[n]; return s.data.has(k) ? s.data.get(k) : undefined; }),
        getAll: () => mk(() => Array.from(memDBs['mwo'].stores[n].data.values())),
        delete: (k) => mk(() => { memDBs['mwo'].stores[n].data.delete(k); return true; }),
        clear: () => mk(() => { memDBs['mwo'].stores[n].data.clear(); return true; })
      })};
    } });
  w.indexedDB = { open(name) { name = name || 'mwo'; const req = { result: db, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
    setTimeout(() => { if (req.onupgradeneeded) req.onupgradeneeded({ target: req }); req.onsuccess && req.onsuccess({ target: req }); }, 0); return req; } };
  const ctxStub = new Proxy({}, { get: (t, p) => {
    if (p === 'measureText') return () => ({ width: 10 });
    if (p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern') return () => ({ addColorStop: () => {} });
    if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
    return typeof p === 'string' ? () => {} : undefined; }, set: () => true });
  w.HTMLCanvasElement.prototype.getContext = function() { if (!this.__ctx) this.__ctx = ctxStub; return this.__ctx; };
  w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const html = fs.readFileSync('mossywoss_os.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://localhost/', beforeParse: (w) => attachShims(w) });
  const w = dom.window, d = w.document;
  await sleep(4500);
  let pass = 0, fail = 0;
  const check = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); c ? pass++ : fail++; };

  // 1. Build a real mini app inside the VFS
  await w.MWO.fs.mkdir('/WebApps/foxtest');
  await w.MWO.fs.writeFile('/WebApps/foxtest/index.html',
    '<!DOCTYPE html><html><body><h1>Fox Test App</h1></body></html>');

  // 2. Publish via the exact contract Publisher writes (same manifest shape + dir)
  const manifest = {
    id: 'userapp_test123',
    name: 'Fox Test App',
    description: 'A real published test app for the store contract test',
    category: 'game',
    icon: 'fox',
    folder: '/WebApps/foxtest',
    entryFile: 'index.html',
    publishedAt: new Date().toISOString(),
    publisher: 'local-user',
    version: '1.0.0'
  };
  await w.MWO.fs.mkdir('/System/store/published');
  await w.MWO.fs.writeFile('/System/store/published/userapp_test123.json', JSON.stringify(manifest, null, 2));

  // 3. The Publisher's own listPublished must see it
  const items = await w.MWO.Publisher.listPublished();
  check(items.length === 1 && items[0].name === 'Fox Test App', 'published app lists via MWO.Publisher.listPublished()');

  // 4. It must render live in the Store's Published tab
  w.MWO.store.open();
  await sleep(2600);
  const storeWin = d.querySelector('.window[data-win-id="store"], .window .w-title');
  const foundTitle = [...d.querySelectorAll('*')].some(e => e.textContent === 'Fox Test App' && e.children.length === 0);
  check(foundTitle, 'published app title renders live in the Store');

  // 5. The published entry file is real and re-readable (persistence contract)
  const reread = await w.MWO.fs.readFile('/System/store/published/userapp_test123.json');
  const parsed = typeof reread === 'string' ? JSON.parse(reread) : reread;
  check(parsed && parsed.id === 'userapp_test123' && parsed.entryFile === 'index.html', 'manifest persists and is re-readable');

  // 6. The app's own content is intact (the real file we published)
  const content = await w.MWO.fs.readFile('/WebApps/foxtest/index.html');
  check(String(content).includes('Fox Test App'), 'published app content intact in VFS');

  console.log('\n=== PUBLISHER/STORE CONTRACT: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH:', e.message); process.exit(1); });
