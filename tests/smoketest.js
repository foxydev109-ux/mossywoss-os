// MossyWoss OS — full runtime smoke test: boot → login → desktop → every app
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('/app/conversations/69c77ec56e1663b653b6eaa5/mossywoss_os.html', 'utf8');
const patched = html.replace(/<script src="https:\/\/cdn\.babylonjs\.com\/babylon\.js"><\/script>/, '');

const dom = new JSDOM(patched, {
  runScripts: 'dangerously',
  url: 'http://localhost:8000/../mossywoss_os.html',
  pretendToBeVisual: true,
  beforeParse(window) {
    const ctxStub = new Proxy({}, {
      get: (t, prop) => {
        if (prop === 'measureText') return () => ({ width: 10 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop: () => {} });
        if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
        if (prop === 'isPointInPath') return () => false;
        return typeof prop === 'string' ? () => {} : undefined;
      },
      set: () => true
    });
    // ---- in-memory IndexedDB shim (jsdom lacks it) ----
    const memDBs = {};
    function makeReq(result) {
      const req = { result, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => { if (req.onupgradeneeded) { const ev = { target: req }; req.onupgradeneeded(ev); } req.onsuccess && req.onsuccess({ target: req }); }, 0);
      return req;
    }
    window.indexedDB = {
      open(dbName) {
        const db = memDBs[dbName] || (memDBs[dbName] = {
          stores: {},
          objectStoreNames: { contains: (n) => n in memDBs[dbName].stores },
          createObjectStore: (n, opts) => { memDBs[dbName].stores[n] = { data: new Map(), keyPath: opts.keyPath }; return memDBs[dbName].stores[n]; },
          transaction(storeName, mode) {
            const store = memDBs[dbName].stores[storeName];
            const mk = (run) => { const r = { onsuccess: null, onerror: null, result: null }; setTimeout(() => { try { r.result = run(); } catch (e) { r.error = e; } r.onsuccess && r.onsuccess({ target: r }); }, 0); return r; };
            const handle = {
              objectStore: (n) => ({
                put: (rec) => { const s = memDBs[dbName].stores[n]; s.data.set(rec[s.keyPath], rec); return mk(() => rec); },
                get: (k) => mk(() => { const s = memDBs[dbName].stores[n]; return s.data.has(k) ? s.data.get(k) : undefined; }),
                getAll: () => mk(() => Array.from(memDBs[dbName].stores[n].data.values())),
                delete: (k) => mk(() => { memDBs[dbName].stores[n].data.delete(k); return true; }),
                clear: () => mk(() => { memDBs[dbName].stores[n].data.clear(); return true; })
              })
            };
            return handle;
          }
        });
        return makeReq(db);
      }
    };
    window.HTMLCanvasElement.prototype.getContext = function() {
      if (!this.__ctx) this.__ctx = ctxStub;
      return this.__ctx;
    };
    window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
    const audioNode = () => ({ connect: () => {}, start: () => {}, stop: () => {}, frequency: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, gain: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, type: 'sine', delayTime: { value: 0 }, fftSize: 256, getByteFrequencyData: () => {}, frequencyBinCount: 128, buffer: null, Q: { value: 1 } });
    window.AudioContext = function() {
      return { currentTime: 0, state: 'running', sampleRate: 44100, destination: {},
        createOscillator: audioNode, createGain: audioNode, createBufferSource: audioNode,
        createBiquadFilter: audioNode, createAnalyser: audioNode, createDelay: audioNode,
        createDynamicsCompressor: audioNode, createScriptProcessor: audioNode,
        createBuffer: () => ({ getChannelData: () => new Float32Array(4410) }),
        close: () => {}, resume: () => Promise.resolve() };
    };
    window.webkitAudioContext = window.AudioContext;
  }
});

const { window } = dom;
const { document } = window;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const $ = (id) => document.getElementById(id);

(async () => {
  const fails = [];
  const log = (m) => console.log(m);

  // ---- 1. BOOT ----
  await sleep(5500); // boot is 4s + fade
  if (!$('boot') || $('boot').style.display !== 'none') fails.push('boot screen did not finish');
  if (!$('login') || !$('login').classList.contains('active')) fails.push('login screen not shown after boot');
  else log('✓ BOOT → login screen shown');

  // ---- 2. SIGNUP FLOW ----
  $('login-name').value = 'Socks';
  $('login-country').value = 'Australia';
  $('login-language').value = 'en';
  $('signup-btn').click();
  await sleep(600);
  if (!$('desktop') || !$('desktop').classList.contains('active')) fails.push('desktop not active after signup');
  else log('✓ SIGNUP → desktop active');

  // ---- 3. SHELL CHECKS ----
  if ($('taskbar') && $('taskbar').offsetParent !== undefined) log('✓ taskbar present');
  else fails.push('taskbar missing');
  const iconCount = document.querySelectorAll('.icon').length;
  if (iconCount > 0) log('✓ desktop icons rendered: ' + iconCount);
  else fails.push('no desktop icons rendered (pre-installed apps missing?)');
  if ($('clock') && $('clock').textContent.includes('--:--') === false) log('✓ clock ticking');
  else fails.push('clock not updating');

  // start menu opens
  $('start-btn').click();
  await sleep(300);
  if ($('start-menu').classList.contains('active')) log('✓ start menu opens');
  else fails.push('start menu does not open');
  const smItems = document.querySelectorAll('#sm-content .sm-item').length;
  if (smItems > 0) log('✓ start menu items: ' + smItems);
  else fails.push('start menu has no items');
  $('start-btn').click(); // close

  // ---- 4. LAUNCH EVERY APP ----
  const MWO = window.MWO;
  const appIds = Object.keys(MWO.apps || {});
  log('\nLaunching ' + appIds.length + ' registered apps…');
  const ok = [], bad = [];
  for (const id of appIds) {
    const app = MWO.apps[id];
    if (typeof app.launch !== 'function') { bad.push(id + ' (no launch fn)'); continue; }
    const before = document.querySelectorAll('.window').length;
    try {
      app.launch();
      await sleep(250);
      const after = document.querySelectorAll('.window').length;
      const isFileDialogApp = (id === 'importer'); // opens OS file picker, no window
      if (after > before || isFileDialogApp) ok.push(id);
      else bad.push(id + ' (launched but no window opened)');
    } catch (e) {
      bad.push(id + ' -> ' + String(e.message || e).slice(0, 80));
    }
    // close everything between apps
    try {
      document.querySelectorAll('.window .w-btn.close').forEach(b => b.click());
    } catch (e) {}
    await sleep(30);
  }

  // ---- 5. MULTIPLE DESKTOPS ----
  try {
    const user = MWO.desktop.getCurrentUser();
    $('desktop-switcher').querySelector('.ds-add')?.click();
    await sleep(200);
    const btns = document.querySelectorAll('#desktop-switcher .ds-btn').length;
    if (btns >= 2) log('✓ multiple desktops: ' + btns + ' switcher buttons');
    else fails.push('desktop switcher did not add a desktop');
    // switch back to 1
    const first = document.querySelectorAll('#desktop-switcher .ds-btn')[0];
    if (first) first.click();
  } catch (e) { fails.push('desktop switcher error: ' + e.message); }

  // ---- 6. LOCK SCREEN ----
  try {
    MWO.lock.lock();
    await sleep(150);
    if ($('lock-screen').style.display !== 'none') log('✓ lock screen engages');
    MWO.lock.unlock();
    await sleep(100);
    if ($('lock-screen').style.display === 'none') log('✓ lock screen unlocks');
    else fails.push('lock screen does not unlock');
  } catch (e) { fails.push('lock error: ' + e.message); }

  // ---- 7. PERSISTENCE (2nd boot with existing user) ----
  const users = await MWO.db.getAll('users', 'mwo-users').catch(() => []);
  if (users.length === 1 && users[0].name === 'Socks') log('✓ user saved to IndexedDB (persistence works)');
  else fails.push('user not persisted: ' + JSON.stringify(users.map(u => u.name)));

  console.log('\n=== RESULTS ===');
  console.log('APPS WORKING: ' + ok.length + '/' + appIds.length);
  if (bad.length) { console.log('\nFAILED APPS:'); bad.forEach(b => console.log('  ✗ ' + b)); }
  if (fails.length) { console.log('\nSHELL FAILURES:'); fails.forEach(f => console.log('  ✗ ' + f)); }
  const clean = bad.length === 0 && fails.length === 0;
  console.log(clean ? '\n🎉 ALL GREEN — everything works' : '\n❌ issues above');
  process.exit(clean ? 0 : 2);
})().catch(e => { console.log('HARNESS ERROR:', e.message, e.stack?.split('\n')[1] || ''); process.exit(1); });