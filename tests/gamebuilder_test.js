// Game Builder Kit: the in-OS zip builder must produce REAL archives that
// the OS's own extractor (and any unzip) can open.
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
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://localhost/', beforeParse: attachShims });
  await sleep(4500);
  const w = dom.window;
  let pass = 0, fail = 0;
  const check = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); c ? pass++ : fail++; };

  check(!!w.MWO.ZipBuilder, 'MWO.ZipBuilder exposed');
  check(!!w.MWO.apps['game-builder'], 'Game Builder Kit registered in the Store catalog');
  check(w.MWO.apps['game-builder'].installed === false, 'Game Builder Kit is store-downloadable (not pre-installed)');
  check(typeof w.MWO.Publisher.openWithZip === 'function' && typeof w.MWO.Publisher.stageFile === 'function', 'Publisher accepts staged in-OS zips');

  // Build a real zip in-OS
  const enc = new w.TextEncoder();
  const buf = await w.MWO.ZipBuilder.buildZip([
    { name: 'index.html', bytes: enc.encode('<!DOCTYPE html><html><body><h1>Fox Game</h1></body></html>') },
    { name: 'readme.txt', bytes: enc.encode('Built in MossyWoss OS Game Builder Kit.') }
  ]);
  const u8 = new Uint8Array(buf);
  check(u8.length > 100 && u8[0] === 0x50 && u8[1] === 0x4B, 'zip has valid magic (PK) and non-trivial size');
  const dv = new DataView(buf);
  check(dv.getUint32(u8.length - 22, true) === 0x06054b50, 'zip has valid EOCD record');

  // Write it to the VFS and extract it with the OS's OWN extractor
  await w.MWO.fs.mkdir('/Downloads');
  // store as a data URL, mirroring the real publisher upload path
  const b64 = w.btoa(String.fromCharCode.apply(null, u8));
  await w.MWO.fs.writeFile('/Downloads/built_game.zip', 'data:application/zip;base64,' + b64);
  const res = await w.MWO.ZipKit.extractZip('/Downloads/built_game.zip', () => {});
  check(!!res && res.success !== false, 'OS extractor opens the builder-produced zip');
  const folder = (res && (res.folder || res.targetDir)) || '/WebApps/built_game_extracted';
  const names = await w.MWO.fs.listDir(folder);
  const htmlEntry = names.find(f => f.name === 'index.html');
  const extracted = htmlEntry ? await w.MWO.fs.readFile(htmlEntry.path) : '';
  check(String(extracted).includes('Fox Game'), 'extracted index.html content is intact (from ' + folder + ')');

  // Developer attribution contract
  const name = 'SocksTest';
  await w.MWO.fs.mkdir('/System/store/published');
  await w.MWO.fs.writeFile('/System/store/published/userapp_devtest.json', JSON.stringify({
    id: 'userapp_devtest', name: 'Dev Tag Test', description: 'x', category: 'game', icon: 'fox',
    folder: '/WebApps/foxtest', entryFile: 'index.html', publishedAt: new Date().toISOString(),
    publisher: name, version: '1.0.0' }));
  const items = await w.MWO.Publisher.listPublished();
  check(items.some(i => i.publisher === name), 'published item carries Developer name');

  console.log('\n=== GAME BUILDER: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH:', e.message); process.exit(1); });
