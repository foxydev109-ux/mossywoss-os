// MossyWoss OS — fresh-PC + Recycle Bin + persistence suite
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('/app/conversations/69c77ec56e1663b653b6eaa5/mossywoss_os.html', 'utf8');
const patched = html.replace(/<script src="https:\/\/cdn\.babylonjs\.com\/babylon\.js"><\/script>/, '');

const memDBs = {};
const memStorage = {};
function makeDom() {
  return new JSDOM(patched, {
    runScripts: 'dangerously',
    url: 'http://localhost:8000/../mossywoss_os.html',
    pretendToBeVisual: true,
    beforeParse(window) {
      const ctxStub = new Proxy({}, {
        get: (t, p) => {
          if (p === 'measureText') return () => ({ width: 10 });
          if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: () => {} });
          if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
          return typeof p === 'string' ? () => {} : undefined;
        }, set: () => true
      });
      window.HTMLCanvasElement.prototype.getContext = function() { if (!this.__ctx) this.__ctx = ctxStub; return this.__ctx; };
      window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
      window.AudioContext = function() {
        const n = () => ({ connect: () => {}, start: () => {}, stop: () => {}, frequency: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, gain: { value: 0, setValueAtTime: () => {} }, type: 'sine', delayTime: { value: 0 }, fftSize: 256, getByteFrequencyData: () => {}, getByteTimeDomainData: () => {}, frequencyBinCount: 128, buffer: null, Q: { value: 1 } });
        return { currentTime: 0, state: 'running', sampleRate: 44100, destination: {},
          createOscillator: n, createGain: n, createBufferSource: n, createBiquadFilter: n,
          createAnalyser: n, createDelay: n, createDynamicsCompressor: n, createScriptProcessor: n,
          createBuffer: () => ({ getChannelData: () => new Float32Array(4410) }),
          close: () => {}, resume: () => Promise.resolve() };
      };
      window.webkitAudioContext = window.AudioContext;
      try {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get: function() {
            var store = {
              getItem: function(k) { return Object.prototype.hasOwnProperty.call(memStorage, k) ? memStorage[k] : null; },
              setItem: function(k, v) { memStorage[k] = String(v); },
              removeItem: function(k) { delete memStorage[k]; },
              clear: function() { for (var k in memStorage) delete memStorage[k]; }
            };
            return store;
          }
        });
      } catch (e) {}
      window.indexedDB = {
        open(dbName) {
          const db = memDBs[dbName] || (memDBs[dbName] = {
            stores: {},
            objectStoreNames: { contains: (n) => n in memDBs[dbName].stores },
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
          const req = { result: db, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
          setTimeout(() => { if (req.onupgradeneeded) req.onupgradeneeded({ target: req }); req.onsuccess && req.onsuccess({ target: req }); }, 0);
          return req;
        }
      };
    }
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (cond, name) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); cond ? pass++ : fail++; };

(async () => {
  // BOOT 1 — first ever boot = fresh PC
  let dom = makeDom();
  let doc = dom.window.document;
  await sleep(5600);

  // login
  doc.getElementById('login-name').value = 'Socks';
  doc.getElementById('signup-btn').click();
  await sleep(800);
  const MWO = dom.window.MWO;

  // FRESH PC: exactly bin, files, browser installed
  const installed = Object.values(MWO.apps).filter(a => a.installed).map(a => a.id).sort();
  check(JSON.stringify(installed) === JSON.stringify(['bin', 'browser', 'files']),
    'fresh PC has only bin/browser/files installed (got: ' + installed.join(',') + ')');
  const icons = doc.querySelectorAll('.icon').length;
  check(icons === 3, 'desktop shows exactly 3 icons (got ' + icons + ')');

  // FRESH PC: no pre-made files
  const docs = await MWO.fs.listDir('/Documents');
  const desk = await MWO.fs.listDir('/Desktop');
  check(docs.length === 0 && desk.length === 0, 'no pre-made files (Documents=' + docs.length + ' Desktop=' + desk.length + ')');

  // Store still has everything available
  const total = Object.keys(MWO.apps).length;
  check(total >= 70, 'store catalog intact: ' + total + ' apps registered');

  // Brand purge spot checks
  const names = Object.values(MWO.apps).map(a => a.name + ' ' + a.description).join(' ').toLowerCase();
  const bad = ['tetris', 'minesweeper', 'wordle', 'flappy', 'space invaders', 'pong', 'snake game', 'google', 'itch.io', 'windows 11'];
  const foundBrands = bad.filter(b => names.includes(b));
  check(foundBrands.length === 0, 'no brand names in app catalog (found: ' + (foundBrands.join(',') || 'none') + ')');
  check(typeof MWO.apps['browser'].launch === 'function' && MWO.apps['browser'].description.includes('HTML5'), 'new browser registered');

  // BIN: delete moves to bin, restore works
  await MWO.fs.writeFile('/Documents/important.txt', 'precious fox data');
  await MWO.fs.deleteFile('/Documents/important.txt');
  let stillThere = false;
  try { await MWO.fs.readFile('/Documents/important.txt'); stillThere = true; } catch (e) {}
  check(!stillThere, 'deleted file removed from original location');
  const binItems = await MWO.Bin.items();
  check(binItems.length === 1 && binItems[0].trashName === 'important.txt', 'file moved to Recycle Bin');
  await MWO.Bin.restore(binItems[0]);
  const restored = await MWO.fs.readFile('/Documents/important.txt');
  check(restored === 'precious fox data', 'restore puts file back with content');

  // BIN: empty
  await MWO.fs.deleteFile('/Documents/important.txt');
  await MWO.Bin.empty();
  const afterEmpty = await MWO.Bin.items();
  check(afterEmpty.length === 0, 'empty bin clears trash');

  // Browser window launches
  const before = doc.querySelectorAll('.window').length;
  MWO.apps['browser'].launch();
  await sleep(400);
  const after = doc.querySelectorAll('.window').length;
  check(after > before, 'browser window opens');

  // Store install flow: open the real Store, click the real Install button
  const storeBody = MWO.store.open();
  await sleep(300);
  check(storeBody.textContent.includes('Serpent'), 'store catalogs Serpent (real app)');
  let snakeBtn = null;
  storeBody.querySelectorAll('button').forEach(b => {
    if (b.textContent !== 'Install') return;
    const card = b.parentElement ? b.parentElement.parentElement : null; // actions -> card
    if (card && card.textContent && card.textContent.includes('Serpent')) snakeBtn = b;
  });
  check(!!snakeBtn, 'store shows real Install button for Serpent');
  if (snakeBtn) snakeBtn.click();
  await sleep(300);
  check(doc.querySelectorAll('.icon').length === 4, 'store install adds desktop icon');

  dom.window.close();

  // BOOT 2 — same device: installed state persists, fresh-PC only ran once
  dom = makeDom();
  doc = dom.window.document;
  await sleep(5600);
  const chips = doc.querySelectorAll('.user-chip');
  chips[0] && chips[0].click();
  await sleep(800);
  const MWO2 = dom.window.MWO;
  const installed2 = Object.values(MWO2.apps).filter(a => a.installed).map(a => a.id).sort();
  check(JSON.stringify(installed2) === JSON.stringify(['bin', 'browser', 'files', 'snake']),
    'store install persisted across reboot (got: ' + installed2.join(',') + ')');
  dom.window.close();

  console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
  process.exit(fail ? 2 : 0);
})().catch(e => { console.log('HARNESS ERROR:', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });