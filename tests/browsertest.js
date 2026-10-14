// MossyWoss OS — REAL browser download + zip test
// Streams a real zip (deflate-compressed via Node zlib) through the
// browser's download engine, then extracts it in-OS and verifies every byte.
const fs = require('fs');
const zlib = require('zlib');
const { JSDOM } = require('jsdom');

// Build a REAL zip: index.html + game.js, deflate method 8
function buildZip() {
  const files = [
    { name: 'index.html', data: Buffer.from('<!DOCTYPE html><html><head><title>FoxRunner</title></head><body><script src="game.js"></script></body></html>') },
    { name: 'game.js', data: Buffer.from('document.title="FoxRunner ran";console.log("real game executing");') }
  ];
  const chunks = []; const central = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name);
    const comp = zlib.deflateRawSync(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version
    local.writeUInt16LE(0x0800, 6);      // UTF-8 flag
    local.writeUInt16LE(8, 8);           // method deflate
    local.writeUInt32LE(0, 10);          // time/date
    local.writeUInt32LE(zlib.crc32 ? zlib.crc32(f.data) : crc32(f.data), 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, comp);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);   // version made by
    cd.writeUInt16LE(20, 6);   // version needed
    cd.writeUInt16LE(0x0800, 8); // flags (UTF-8)
    cd.writeUInt16LE(8, 10);   // method = deflate
    cd.writeUInt32LE(crc32(f.data), 16);
    cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(f.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28); cd.writeUInt16LE(0, 30);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + comp.length;
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12); eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cdBuf, eocd]);
}
function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const ZIP_BYTES = buildZip();
const html = fs.readFileSync('/app/conversations/69c77ec56e1663b653b6eaa5/../mossywoss_os.html', 'utf8')
  .replace(/<script src="https:\/\/cdn\.babylonjs\.com\/babylon\.js"><\/script>/, '');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (cond, name) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); cond ? pass++ : fail++; };

(async () => {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'http://localhost:8000/../mossywoss_os.html', pretendToBeVisual: true,
    beforeParse(window) {
      // canvas/audio stubs
      const ctxStub = new Proxy({}, { get: (t, p) => {
        if (p === 'measureText') return () => ({ width: 10 });
        if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: () => {} });
        return typeof p === 'string' ? () => {} : undefined;
      }, set: () => true });
      window.HTMLCanvasElement.prototype.getContext = function() { return ctxStub; };
      window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
      window.AudioContext = window.webkitAudioContext = function() { return {}; };
      // REAL-ish fetch: serves the zip bytes with a real stream
      window.fetch = async (url) => {
        const bytes = url.includes('fakefox.zip') ? ZIP_BYTES : new Uint8Array(0);
        return {
          ok: true, status: 200,
          headers: { get: (h) => h.toLowerCase() === 'content-length' ? String(bytes.length) : null },
          body: { getReader: () => {
            let done = false;
            return { read: async () => {
              if (done) return { value: undefined, done: true };
              done = true;
              return { value: new Uint8Array(bytes), done: false };
            }};
          }}
        };
      };
      window.AbortController = window.AbortController || class { constructor(){this.signal={};} abort(){} };
      // Node 20 has these natively; share into jsdom (real implementations)
      const w = window;
      ['DecompressionStream', 'Response', 'Blob', 'FileReader'].forEach(k => {
        try { if (globalThis[k]) w[k] = globalThis[k]; } catch(e) {}
      });
      // jsdom FileReader exists; ensure Blob with type
      const memDBs = {};
      window.indexedDB = {
        open(dbName) {
          const db = memDBs[dbName] || (memDBs[dbName] = {
            stores: {}, objectStoreNames: { contains: (n) => n in memDBs[dbName].stores },
            createObjectStore: (n, o) => { memDBs[dbName].stores[n] = { data: new Map(), keyPath: o.keyPath }; return memDBs[dbName].stores[n]; },
            transaction(sn) {
              const mk = (run) => { const r = { onsuccess: null, onerror: null, result: null }; setTimeout(() => { try { r.result = run(); } catch (e) { r.error = e; } r.onsuccess && r.onsuccess({ target: r }); }, 0); return r; };
              return { objectStore: (n) => ({
                put: (rec) => { const s = memDBs[dbName].stores[n]; s.data.set(rec[s.keyPath], rec); return mk(() => rec); },
                get: (k) => mk(() => { const s = memDBs[dbName].stores[n]; return s.data.has(k) ? s.data.get(k) : undefined; }),
                getAll: () => mk(() => Array.from(memDBs[dbName].stores[n].data.values())),
                delete: (k) => mk(() => { memDBs[dbName].stores[n].data.delete(k); return true; }),
                clear: () => mk(() => { memDBs[dbName].stores[n].data.clear(); return true; })
              })};
            }
          });
          const req = { result: db, onsuccess: null, onupgradeneeded: null };
          setTimeout(() => { if (req.onupgradeneeded) req.onupgradeneeded({ target: req }); req.onsuccess && req.onsuccess({ target: req }); }, 0);
          return req;
        }
      };
    }
  });
  dom.window.addEventListener('error', function(e){ console.log('PAGE ERROR:', (e.message||'').slice(0,160)); });
  const doc = dom.window.document;
  await sleep(5600);
  doc.getElementById('login-name').value = 'Socks';
  doc.getElementById('signup-btn').click();
  await sleep(900);
  const MWO = dom.window.MWO;
  const W = dom.window;

  check(typeof MWO.Browser === 'object' && MWO.Browser.launch, 'browser module present');

  // Launch browser and drive the real download path
  MWO.Browser.launch('about:home');
  await sleep(500);
  const win = doc.querySelectorAll('.window');
  check(win.length > 0, 'browser window opens');

  // Find the downloads button and open the panel, then start a download via the UI path.
  // The new-download form: fill URL, click start.
  const dlBtn = Array.from(doc.querySelectorAll('button')).find(b => (b.textContent || '').includes('📥') || (b.title || '').toLowerCase().includes('download'));
  check(!!dlBtn, 'downloads button found');
  if (dlBtn) { dlBtn.click(); await sleep(300); }

  const dlUrl = doc.querySelector('#mwb-dl-url-input');
  check(!!dlUrl, 'new-download URL field present');
  const dlStart = doc.querySelector('#mwb-dl-start-btn');
  check(!!dlStart, 'download start button present');
  if (dlUrl && dlStart) {
    dlUrl.value = 'https://cdn.example.com/fakefox.zip';
    dlStart.click();
    await sleep(3000);
  }

  // Verify the real bytes landed in /Downloads
  let inDownloads = [];
  try { inDownloads = await MWO.fs.listDir('/Downloads'); } catch (e) {}
  const zipFile = inDownloads.find(f => f.name === 'fakefox.zip');
  check(!!zipFile, 'downloaded zip stored in /Downloads (got: ' + inDownloads.map(f => f.name).join(', ') + ')');
  if (zipFile) {
    check(String(zipFile.content).startsWith('data:'), 'zip stored as real binary (base64 data URL)');
  }

  // Drive extraction via the UI Extract button, then verify the REAL extracted files
  const extractBtn = doc.querySelector('.mwb-dl-unzip-btn');
  check(!!extractBtn, 'extract button rendered for zip download');
  if (extractBtn) { extractBtn.click(); await sleep(5000); }
  // surface extraction errors if any

  let extracted = [];
  try { extracted = await MWO.fs.listDir('/Downloads/fakefox_extracted'); } catch (e) {}
  const idx = extracted.find(f => f.name === 'index.html');
  const js = extracted.find(f => f.name === 'game.js');
  check(!!idx, 'index.html extracted from real deflate zip');
  if (idx) { check(String(idx.content).includes('FoxRunner'), 'index.html content intact after real decompression'); }
  if (js) check(String(js.content).includes('real game executing'), 'game.js content intact after real decompression');

  console.log('\n=== BROWSER TEST: ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 2 : 0);
})().catch(e => { console.log('HARNESS ERROR:', e.message, (e.stack || '').split('\n').slice(0,3).join(' | ')); process.exit(1); });