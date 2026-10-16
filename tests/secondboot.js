// Second boot: existing user must appear as a chip; click chip -> desktop
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('/app/conversations/69c77ec56e1663b653b6eaa5/mossywoss_os.html', 'utf8');
const patched = html.replace(/<script src="https:\/\/cdn\.babylonjs\.com\/babylon\.js"><\/script>/, '');

const memDBs = {}; // shared across boots = IndexedDB persistence
const SHARED_LS = {}; // shared across boots = localStorage persistence (like a real browser)

function makeDom() {
  return new JSDOM(patched, {
    runScripts: 'dangerously',
    url: 'http://localhost:8000/../mossywoss_os.html',
    pretendToBeVisual: true,
    beforeParse(window) {
      // real browsers persist localStorage across reloads; mirror that here
      const lsImpl = {
        getItem: (k) => (Object.prototype.hasOwnProperty.call(SHARED_LS, k) ? SHARED_LS[k] : null),
        setItem: (k, v) => { SHARED_LS[k] = String(v); },
        removeItem: (k) => { delete SHARED_LS[k]; },
        clear: () => { Object.keys(SHARED_LS).forEach(k => delete SHARED_LS[k]); },
        key: (i) => Object.keys(SHARED_LS)[i] || null
      };
      Object.defineProperty(lsImpl, 'length', { get: () => Object.keys(SHARED_LS).length });
      try { Object.defineProperty(window, 'localStorage', { value: lsImpl, configurable: true }); } catch (e) {}
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
(async () => {
  let dom = makeDom();
  let doc = dom.window.document;
  await sleep(5500);
  doc.getElementById('login-name').value = 'Socks';
  doc.getElementById('login-country').value = 'Australia';
  doc.getElementById('signup-btn').click();
  await sleep(800);
  if (!doc.getElementById('desktop').classList.contains('active')) { console.log('BOOT1: signup failed'); process.exit(1); }
  console.log('boot1: signup ok');
  await dom.window.MWO.fs.writeFile('/home/socks/hello.txt', 'foxes rule');
  const rd = await dom.window.MWO.fs.readFile('/home/socks/hello.txt');
  console.log(rd === 'foxes rule' ? 'PASS FS write/read roundtrip' : 'FAIL FS roundtrip: ' + rd);
  // folder ops
  await dom.window.MWO.fs.mkdir('/home/socks/projects');
  const lst = await dom.window.MWO.fs.listDir('/home/socks');
  const hasDir = Array.isArray(lst) && lst.some(f => f.name === 'hello.txt');
  const hasProj = Array.isArray(lst) && lst.some(f => f.name === 'projects');
  console.log(hasDir && hasProj ? 'PASS FS listing shows file + folder' : 'FAIL FS listing: ' + JSON.stringify(lst && lst.map(f => f.name)));
  // delete
  await dom.window.MWO.fs.writeFile('/tmp/junk.txt', 'x');
  await dom.window.MWO.fs.deleteFile('/tmp/junk.txt');
  let gone = null;
  try { await dom.window.MWO.fs.readFile('/tmp/junk.txt'); } catch (e) { gone = true; }
  console.log(gone ? 'PASS FS delete works' : 'FAIL FS delete left file readable');
  dom.window.close();

  // ---- BOOT 2: returning user ----
  dom = makeDom();
  doc = dom.window.document;
  await sleep(5500);
  // NEW CONTRACT: a reload auto-restores the last signed-in user.
  // (A game death used to location.reload() and force a fresh sign-in.)
  console.log(doc.getElementById('desktop').classList.contains('active') ? 'PASS reload auto-restores session (no forced re-login)' : 'FAIL auto-login did not restore session');
  if (!doc.getElementById('desktop').classList.contains('active')) process.exit(1);
  // Explicit sign-out still shows the account picker:
  dom.window.MWO.login.signOut();
  await sleep(400);
  const chips = doc.querySelectorAll('.user-chip');
  console.log(chips.length === 1 ? 'PASS sign-out shows returning user chip' : 'FAIL expected 1 chip after sign-out, got ' + chips.length);
  if (chips.length < 1) process.exit(1);
  const chipName = chips[0].querySelector('span') ? chips[0].querySelector('span').textContent : null;
  console.log(chipName === 'Socks' ? 'PASS chip name = Socks' : 'FAIL chip name: ' + chipName);
  const signinVisible = !doc.getElementById('signin-fields').classList.contains('mw-hidden');
  console.log(signinVisible ? 'PASS sign-in view shown for returning users' : 'FAIL sign-in view not shown');
  chips[0].click();
  await sleep(600);
  console.log(doc.getElementById('desktop').classList.contains('active') ? 'PASS chip click logs in' : 'FAIL chip login');
  const rd2 = await dom.window.MWO.fs.readFile('/home/socks/hello.txt');
  console.log(rd2 === 'foxes rule' ? 'PASS file survived reboot' : 'FAIL file lost: ' + rd2);
  // name-based sign-in path (case-insensitive)
  dom.window.MWO.lock.lock();
  dom.window.MWO.lock.unlock();
  dom.window.MWO.login.showSignup();
  await sleep(100);
  dom.window.MWO.login.showSignin();
  doc.getElementById('signin-name').value = 'socks';
  doc.getElementById('signin-btn').click();
  await sleep(600);
  console.log(doc.getElementById('desktop').classList.contains('active') ? 'PASS name sign-in (case-insensitive)' : 'FAIL name sign-in');
  // settings persistence: switch wallpaper, reboot, check
  const user = dom.window.MWO.desktop.getCurrentUser();
  user.desktops[0].wallpaper = 'wp-3';
  await dom.window.MWO.desktop.saveUserData();
  dom.window.close();

  // ---- BOOT 3: settings survived ----
  dom = makeDom();
  doc = dom.window.document;
  await sleep(5500);
  // boot 3 auto-restores the session too (no chip click needed)
  await sleep(700);
  const wp = doc.getElementById('wallpaper');
  const hasWp3 = wp && /#006494|0, 100, 148|051923|5, 25, 35/.test(wp.style.background || wp.style.backgroundImage || '');
  console.log(doc.getElementById('desktop').classList.contains('active') ? 'PASS boot3 login' : 'FAIL boot3 login');
  console.log(hasWp3 ? 'PASS wallpaper setting survived reboot' : 'FAIL wallpaper not restored: ' + (wp && wp.style.cssText));
  dom.window.close();
  console.log('SECOND-BOOT SUITE DONE');
  process.exit(0);
})().catch(e => { console.log('HARNESS ERROR:', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });
