/* ========================================================================
 * MossyWoss OS — Core System Engine (mw_web/core.js)
 * Fully Functional Single-File Web Operating System JavaScript
 * ======================================================================== */

var MWO = MWO || {};

/* ========================================================================
 * 1. MWO.db — IndexedDB Wrapper
 * ======================================================================== */
(function(MWO) {
  'use strict';

  MWO.db = {
    openCustom(dbName, storeName, keyPath) {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: keyPath });
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
      });
    },

    put(storeName, key, value, dbName = 'mwo-system') {
      // Support both call forms:
      //   put(store, key, value, dbName)  — key is string, value is record
      //   put(store, record, dbName)      — key is the record object, value is the dbName string
      if (typeof key === 'object' && typeof value === 'string') {
        dbName = value;
        value = undefined;
      }
      const isCustomRecord = typeof key === 'object' && value === undefined;
      const record = isCustomRecord ? key : Object.assign({}, value, { id: key });
      const keyPath = record.path !== undefined ? 'path' : 'id';

      return this.openCustom(dbName, storeName, keyPath).then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.put(record);
          req.onsuccess = () => resolve(record);
          req.onerror = (e) => reject(e.target.error);
        });
      });
    },

    get(storeName, key, dbName = 'mwo-system') {
      return this.openCustom(dbName, storeName, storeName === 'files' ? 'path' : 'id').then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = (e) => reject(e.target.error);
        });
      });
    },

    getAll(storeName, dbName = 'mwo-system') {
      return this.openCustom(dbName, storeName, storeName === 'files' ? 'path' : 'id').then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = (e) => reject(e.target.error);
        });
      });
    },

    delete(storeName, key, dbName = 'mwo-system') {
      return this.openCustom(dbName, storeName, storeName === 'files' ? 'path' : 'id').then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.delete(key);
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => reject(e.target.error);
        });
      });
    },

    clear(storeName, dbName = 'mwo-system') {
      return this.openCustom(dbName, storeName, storeName === 'files' ? 'path' : 'id').then(db => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.clear();
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => reject(e.target.error);
        });
      });
    }
  };
})(MWO);

/* ========================================================================
 * 2. MWO.fs — Virtual File System (IndexedDB)
 * ======================================================================== */
(function(MWO) {
  'use strict';
  const DB_NAME = 'mwo-filesystem';
  const STORE_NAME = 'files';

  function normalizePath(p) {
    if (!p) return '/';
    let clean = String(p).trim().replace(/\\/g, '/');
    if (!clean.startsWith('/')) clean = '/' + clean;
    if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
    return clean;
  }

  MWO.fs = {
    async init() {
      const rootExists = await this.exists('/');
      if (!rootExists) {
        await this.mkdir('/');
        const defaultDirs = [
          '/Desktop', '/Documents', '/Downloads', '/Pictures',
          '/Music', '/Videos', '/Games', '/WebApps', '/AppData',
          '/Settings', '/System'
        ];
        for (const dir of defaultDirs) {
          await this.mkdir(dir);
        }
      }
    },

    async mkdir(path) {
      const cleanPath = normalizePath(path);
      const name = cleanPath === '/' ? '/' : cleanPath.split('/').pop();
      const record = {
        path: cleanPath,
        name: name,
        type: 'dir',
        content: '',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        size: 0
      };
      return await MWO.db.put(STORE_NAME, record, DB_NAME);
    },

    async createFolder(path) {
      return await this.mkdir(path);
    },

    async writeFile(path, content = '') {
      const cleanPath = normalizePath(path);
      const name = cleanPath.split('/').pop();
      const parent = cleanPath.substring(0, cleanPath.lastIndexOf('/')) || '/';
      
      if (parent !== '/' && !(await this.exists(parent))) {
        await this.mkdir(parent);
      }

      const strContent = String(content);
      const record = {
        path: cleanPath,
        name: name,
        type: 'file',
        content: strContent,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        size: strContent.length
      };
      return await MWO.db.put(STORE_NAME, record, DB_NAME);
    },

    async readFile(path) {
      const cleanPath = normalizePath(path);
      const file = await MWO.db.get(STORE_NAME, cleanPath, DB_NAME);
      if (!file) throw new Error('File not found: ' + cleanPath);
      return file.content;
    },

    async permanentDelete(path) {
      const cleanPath = normalizePath(path);
      const file = await MWO.db.get(STORE_NAME, cleanPath, DB_NAME);
      if (!file) return false;
      if (file.type === 'dir') {
        const all = await MWO.db.getAll(STORE_NAME, DB_NAME);
        const children = all.filter(item => item.path.startsWith(cleanPath + '/') || item.path === cleanPath);
        for (const child of children) {
          await MWO.db.delete(STORE_NAME, child.path, DB_NAME);
        }
      } else {
        await MWO.db.delete(STORE_NAME, cleanPath, DB_NAME);
      }
      return true;
    },

    async deleteFile(path) {
      const cleanPath = normalizePath(path);
      const file = await MWO.db.get(STORE_NAME, cleanPath, DB_NAME);
      if (!file) return false;
      const BIN_CAP = 50 * 1024 * 1024;

      if (file.type === 'dir') {
        const all = await MWO.db.getAll(STORE_NAME, DB_NAME);
        const children = all.filter(item => item.path.startsWith(cleanPath + '/'));
        let totalSize = 0;
        for (const child of children) {
          if (child.type !== 'dir') totalSize += child.size || 0;
        }
        const binUsed = all.filter(r => r.trashed).reduce((s, r) => s + (r.size || 0), 0);
        if (binUsed + totalSize > BIN_CAP) {
          MWO.notif.show('Recycle Bin', 'Bin is full — empty it to delete more.');
          return false;
        }
        for (const child of children) {
          if (child.type === 'dir') {
            await MWO.db.delete(STORE_NAME, child.path, DB_NAME);
          } else {
            const name = child.path.split('/').pop();
            const trash = Object.assign({}, child, {
              path: '/RecycleBin/' + Date.now() + '_' + name,
              trashed: true,
              originalPath: child.path,
              deletedAt: new Date().toISOString(),
              trashName: name
            });
            await MWO.db.put(STORE_NAME, trash, DB_NAME);
            await MWO.db.delete(STORE_NAME, child.path, DB_NAME);
          }
        }
        await MWO.db.delete(STORE_NAME, cleanPath, DB_NAME);
        return true;
      }

      const binAll = await MWO.db.getAll(STORE_NAME, DB_NAME);
      const binUsedNow = binAll.filter(r => r.trashed).reduce((s, r) => s + (r.size || 0), 0);
      if (binUsedNow + (file.size || 0) > BIN_CAP) {
        MWO.notif.show('Recycle Bin', 'Bin is full — empty it to delete more.');
        return false;
      }
      const name = cleanPath.split('/').pop();
      const trash = Object.assign({}, file, {
        path: '/RecycleBin/' + Date.now() + '_' + name,
        trashed: true,
        originalPath: cleanPath,
        deletedAt: new Date().toISOString(),
        trashName: name
      });
      await MWO.db.put(STORE_NAME, trash, DB_NAME);
      await MWO.db.delete(STORE_NAME, cleanPath, DB_NAME);
      return true;
    },

    async listDir(path = '/') {
      const cleanPath = normalizePath(path);
      const all = await MWO.db.getAll(STORE_NAME, DB_NAME);
      const prefix = cleanPath === '/' ? '/' : cleanPath + '/';
      
      return all.filter(item => {
        if (item.path === cleanPath) return false;
        if (!item.path.startsWith(prefix)) return false;
        const subPath = item.path.slice(prefix.length);
        return subPath.length > 0 && !subPath.includes('/');
      });
    },

    async exists(path) {
      const cleanPath = normalizePath(path);
      const file = await MWO.db.get(STORE_NAME, cleanPath, DB_NAME);
      return !!file;
    },

    async rename(oldPath, newPath) {
      const src = normalizePath(oldPath);
      const dst = normalizePath(newPath);
      const file = await MWO.db.get(STORE_NAME, src, DB_NAME);
      if (!file) throw new Error('Source not found: ' + src);
      
      await this.deleteFile(src);
      file.path = dst;
      file.name = dst.split('/').pop();
      file.modified = new Date().toISOString();
      await MWO.db.put(STORE_NAME, file, DB_NAME);
      return true;
    }
  };
})(MWO);

/* ========================================================================
 * 3. MWO.boot — Boot Sequence
 * ======================================================================== */
(function(MWO) {
  'use strict';
  
  const statusMessages = [
    'Initializing kernel...',
    'Loading virtual filesystem...',
    'Mounting partitions...',
    'Starting display manager...',
    'Loading drivers...',
    'Starting desktop environment...'
  ];

  MWO.boot = {
    start() {
      const bootEl = document.getElementById('boot');
      const statusEl = document.getElementById('boot-status');
      const barEl = document.getElementById('boot-bar');
      
      if (!bootEl) return;
      bootEl.style.display = 'flex';
      bootEl.style.opacity = '1';

      const duration = 4000;
      const startTime = Date.now();

      const timer = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
        
        if (barEl) barEl.style.width = progress + '%';

        const msgIdx = Math.min(
          statusMessages.length - 1,
          Math.floor((progress / 100) * statusMessages.length)
        );
        if (statusEl) statusEl.textContent = statusMessages[msgIdx];

        if (progress >= 100) {
          clearInterval(timer);
          await MWO.fs.init();

          // Fresh-PC state: exactly once per device, reset the desktop to
          // Recycle Bin / Files / Browser. Everything else installs from the Store.
          if (!localStorage.getItem('mwo_freshpc')) {
            const keep = ['bin', 'files', 'browser'];
            Object.values(MWO.apps || {}).forEach(a => {
              a.installed = keep.includes(a.id);
            });
            localStorage.setItem('mwo_freshpc', '1');
            localStorage.setItem('mwo_installed', JSON.stringify(keep));
          }

          // Restore the installed-app set saved by the Store (persists installs
          // and uninstalls across reboots).
          try {
            const saved = JSON.parse(localStorage.getItem('mwo_installed') || '[]');
            Object.values(MWO.apps || {}).forEach(a => {
              a.installed = saved.includes(a.id);
            });
          } catch (e) {}
          
          bootEl.style.transition = 'opacity 0.8s ease';
          bootEl.style.opacity = '0';
          setTimeout(() => {
            bootEl.style.display = 'none';
            MWO.login.init();
          }, 800);
        }
      }, 50);
    },

    init() {
      this.start();
    }
  };
})(MWO);

/* ========================================================================
 * 4. MWO.login — Login / Signup System
 * ======================================================================== */
(function(MWO) {
  'use strict';
  const DB_NAME = 'mwo-users';
  const STORE_NAME = 'users';

  const COUNTRIES = [
    "United States", "Canada", "United Kingdom", "Australia", "Germany",
    "France", "Japan", "China", "India", "Brazil", "Mexico", "Italy",
    "Spain", "South Korea", "Russia", "Netherlands", "Switzerland", "Sweden",
    "Norway", "Denmark", "Finland", "Poland", "Belgium", "Austria", "Portugal",
    "Greece", "Ireland", "New Zealand", "Singapore", "Malaysia", "Indonesia",
    "Thailand", "Vietnam", "Philippines", "Egypt", "South Africa", "Nigeria",
    "Kenya", "Saudi Arabia", "United Arab Emirates", "Turkey", "Argentina",
    "Chile", "Colombia", "Peru", "Israel", "Pakistan", "Bangladesh", "Ukraine", "Czechia"
  ];

  MWO.login = {
    async init() {
      const loginEl = document.getElementById('login');
      if (loginEl) loginEl.classList.add('active');

      this.populateCountries();
      this.bindEvents();
      await this.renderUsers();
    },

    populateCountries() {
      const select = document.getElementById('login-country');
      if (!select || select.children.length > 1) return;
      
      COUNTRIES.slice().sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
      });
    },

    bindEvents() {
      const signupBtn = document.getElementById('signup-btn');
      const signinBtn = document.getElementById('signin-btn');
      const backBtn = document.getElementById('back-signup-btn');

      if (signupBtn) signupBtn.onclick = () => this.signUp();
      if (signinBtn) signinBtn.onclick = () => this.signIn();
      if (backBtn) backBtn.onclick = () => this.showSignup();
    },

    showSignup() {
      document.getElementById('signup-fields')?.classList.remove('mw-hidden');
      document.getElementById('signin-fields')?.classList.add('mw-hidden');
      const sub = document.getElementById('login-subtitle');
      if (sub) sub.textContent = 'Create your account to begin';
    },

    showSignin() {
      document.getElementById('signup-fields')?.classList.add('mw-hidden');
      document.getElementById('signin-fields')?.classList.remove('mw-hidden');
      const sub = document.getElementById('login-subtitle');
      if (sub) sub.textContent = 'Select or enter your account';
    },

    async renderUsers() {
      const listEl = document.getElementById('user-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      const users = await MWO.db.getAll(STORE_NAME, DB_NAME);
      if (users.length > 0) {
        this.showSignin();
        users.forEach(u => {
          const chip = document.createElement('div');
          chip.className = 'user-chip';
          
          const av = document.createElement('div');
          av.className = 'avatar';
          av.textContent = (u.name || 'U').charAt(0).toUpperCase();
          
          const nm = document.createElement('span');
          nm.textContent = u.name;
          
          chip.appendChild(av);
          chip.appendChild(nm);
          chip.onclick = () => this.loginAsUser(u);
          listEl.appendChild(chip);
        });
      } else {
        this.showSignup();
      }
    },

    async signUp() {
      const nameEl = document.getElementById('login-name');
      const countryEl = document.getElementById('login-country');
      const langEl = document.getElementById('login-language');
      const errEl = document.getElementById('login-error');

      const name = nameEl ? nameEl.value.trim() : '';
      const country = countryEl ? countryEl.value : '';
      const language = langEl ? langEl.value : 'en';

      if (!name) {
        if (errEl) errEl.textContent = 'Please enter your name.';
        return;
      }

      if (errEl) errEl.textContent = '';

      const user = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name,
        country: country || 'United States',
        language: language || 'en',
        createdDate: new Date().toISOString(),
        settings: { wallpaper: 'wp-1', activeDesktop: 1 },
        desktops: [
          { id: 1, wallpaper: 'wp-1' }
        ]
      };

      await MWO.db.put(STORE_NAME, user, DB_NAME);
      this.loginAsUser(user);
    },

    async signIn() {
      const inputEl = document.getElementById('signin-name');
      const errEl = document.getElementById('signin-error');
      const name = inputEl ? inputEl.value.trim() : '';

      if (!name) {
        if (errEl) errEl.textContent = 'Please enter user name.';
        return;
      }

      const users = await MWO.db.getAll(STORE_NAME, DB_NAME);
      const match = users.find(u => u.name.toLowerCase() === name.toLowerCase());

      if (match) {
        if (errEl) errEl.textContent = '';
        this.loginAsUser(match);
      } else {
        const newUser = {
          id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: name,
          country: 'United States',
          language: 'en',
          createdDate: new Date().toISOString(),
          settings: { wallpaper: 'wp-1', activeDesktop: 1 },
          desktops: [{ id: 1, wallpaper: 'wp-1' }]
        };
        await MWO.db.put(STORE_NAME, newUser, DB_NAME);
        this.loginAsUser(newUser);
      }
    },

    loginAsUser(user) {
      const loginEl = document.getElementById('login');
      if (loginEl) loginEl.classList.remove('active');
      MWO.desktop.init(user);
    }
  };
})(MWO);

/* ========================================================================
 * 5. MWO.desktop — Desktop Environment
 * ======================================================================== */
(function(MWO) {
  'use strict';
  
  let currentUser = null;
  let currentDesktopId = 1;

  const WALLPAPERS = {
    'wp-1': 'linear-gradient(135deg, #0a0a1a, #16213e 50%, #0f3460)',
    'wp-2': 'linear-gradient(135deg, #1a0826, #3a1c5d 50%, #6e2a8d)',
    'wp-3': 'linear-gradient(135deg, #051923, #003554 50%, #006494)',
    'wp-4': 'linear-gradient(135deg, #1b263b, #415a77 50%, #778da9)',
    'wp-5': 'linear-gradient(135deg, #2b0b14, #5c1328 50%, #8f1d3c)'
  };

  MWO.desktop = {
    init(user) {
      currentUser = user || {
        id: 'usr_guest',
        name: 'Guest',
        settings: { wallpaper: 'wp-1', activeDesktop: 1 },
        desktops: [{ id: 1, wallpaper: 'wp-1' }]
      };

      if (!currentUser.desktops || currentUser.desktops.length === 0) {
        currentUser.desktops = [{ id: 1, wallpaper: 'wp-1' }];
      }

      currentDesktopId = currentUser.settings?.activeDesktop || 1;

      const desktopEl = document.getElementById('desktop');
      if (desktopEl) desktopEl.classList.add('active');

      this.setWallpaper(this.getCurrentDesktopObj().wallpaper || 'wp-1');
      this.renderIcons();
      this.bindContextMenu();

      MWO.taskbar.init();
      MWO.start.init();
      MWO.notif.show('Welcome', `Logged in as ${currentUser.name}`);
    },

    getCurrentUser() {
      return currentUser;
    },

    getCurrentDesktop() {
      return currentDesktopId;
    },

    getCurrentDesktopObj() {
      return currentUser.desktops.find(d => d.id === currentDesktopId) || currentUser.desktops[0];
    },

    switchDesktop(id) {
      if (!currentUser.desktops.some(d => d.id === id)) return;
      currentDesktopId = id;
      currentUser.settings.activeDesktop = id;

      const dObj = this.getCurrentDesktopObj();
      this.setWallpaper(dObj.wallpaper || 'wp-1');

      MWO.taskbar.renderDesktopSwitcher();
      MWO.wm.updateWindowVisibility();
      this.saveUserData();
    },

    addDesktop() {
      if (currentUser.desktops.length >= 6) {
        MWO.notif.show('Desktop Limit', 'Maximum 6 desktops allowed.');
        return;
      }
      const newId = currentUser.desktops.length + 1;
      currentUser.desktops.push({ id: newId, wallpaper: 'wp-1' });
      this.switchDesktop(newId);
    },

    setWallpaper(wpName) {
      const wpEl = document.getElementById('wallpaper');
      const bg = WALLPAPERS[wpName] || WALLPAPERS['wp-1'];
      if (wpEl) wpEl.style.background = bg;

      const dObj = this.getCurrentDesktopObj();
      if (dObj) dObj.wallpaper = wpName;
      this.saveUserData();
    },

    renderIcons() {
      const container = document.getElementById('icons');
      if (!container) return;
      container.innerHTML = '';

      const installedApps = Object.values(MWO.apps || {}).filter(a => a.installed);
      installedApps.forEach(app => {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon';
        iconDiv.title = app.name;

        const imgDiv = document.createElement('div');
        imgDiv.className = 'icn-img';
        imgDiv.textContent = app.icon || '📱';

        const labelDiv = document.createElement('div');
        labelDiv.className = 'icn-label';
        labelDiv.textContent = app.name;

        iconDiv.appendChild(imgDiv);
        iconDiv.appendChild(labelDiv);

        iconDiv.onclick = (e) => {
          e.stopPropagation();
          document.querySelectorAll('.icon').forEach(i => i.classList.remove('selected'));
          iconDiv.classList.add('selected');
        };

        iconDiv.ondblclick = (e) => {
          e.stopPropagation();
          MWO.launchApp(app.id);
        };

        let lastTap = 0;
        iconDiv.addEventListener('touchend', (e) => {
          const currentTime = new Date().getTime();
          const tapLength = currentTime - lastTap;
          if (tapLength < 500 && tapLength > 0) {
            MWO.launchApp(app.id);
            e.preventDefault();
          }
          lastTap = currentTime;
        });

        container.appendChild(iconDiv);
      });
    },

    bindContextMenu() {
      const desktopEl = document.getElementById('desktop');
      if (!desktopEl) return;

      desktopEl.oncontextmenu = (e) => {
        if (e.target.closest('.window') || e.target.closest('#taskbar')) return;
        e.preventDefault();

        MWO.ctx.show(e.clientX, e.clientY, [
          {
            label: '🖼️ Change Wallpaper',
            action: () => this.showWallpaperPicker()
          },
          {
            label: '➕ Add Desktop',
            action: () => this.addDesktop()
          },
          { separator: true },
          {
            label: '⚙️ Settings',
            action: () => MWO.launchApp('settings')
          },
          {
            label: '🛒 Open Store',
            action: () => MWO.store.open()
          }
        ]);
      };

      desktopEl.onclick = (e) => {
        if (!e.target.closest('.icon')) {
          document.querySelectorAll('.icon').forEach(i => i.classList.remove('selected'));
        }
        MWO.ctx.hide();
        MWO.start.close();
      };
    },

    showWallpaperPicker() {
      const content = document.createElement('div');
      content.style.padding = '16px';
      content.style.display = 'grid';
      content.style.gridTemplateColumns = 'repeat(3, 1fr)';
      content.style.gap = '12px';

      Object.keys(WALLPAPERS).forEach((key, idx) => {
        const card = document.createElement('div');
        card.style.height = '70px';
        card.style.borderRadius = '8px';
        card.style.background = WALLPAPERS[key];
        card.style.cursor = 'pointer';
        card.style.border = '2px solid transparent';
        card.style.display = 'flex';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'center';
        card.style.color = '#fff';
        card.style.fontWeight = 'bold';
        card.textContent = 'WP ' + (idx + 1);

        if (this.getCurrentDesktopObj().wallpaper === key) {
          card.style.borderColor = 'var(--accent)';
        }

        card.onclick = () => {
          this.setWallpaper(key);
          MWO.wm.close('wp-picker-win');
        };

        content.appendChild(card);
      });

      MWO.wm.create({
        id: 'wp-picker-win',
        title: 'Choose Wallpaper',
        icon: '🖼️',
        width: 360,
        height: 220,
        content: content,
        resizable: false,
        maximizable: false
      });
    },

    async saveUserData() {
      if (currentUser && currentUser.id) {
        await MWO.db.put('users', currentUser, 'mwo-users');
      }
    }
  };
})(MWO);

/* ========================================================================
 * 6. MWO.wm — Window Manager
 * ======================================================================== */
(function(MWO) {
  'use strict';
  
  const windows = new Map();
  let highestZ = 100;

  MWO.wm = {
    create(opts = {}) {
      const id = opts.id || 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      
      if (windows.has(id)) {
        this.focus(id);
        const existing = windows.get(id);
        return existing.body || existing.element;
      }

      const desktopId = opts.desktopId || MWO.desktop.getCurrentDesktop();
      const width = opts.width || 600;
      const height = opts.height || 400;
      
      const winCount = windows.size;
      const left = opts.x !== undefined ? opts.x : Math.max(20, Math.min(window.innerWidth - width - 20, 40 + (winCount % 8) * 25));
      const top = opts.y !== undefined ? opts.y : Math.max(20, Math.min(window.innerHeight - height - 60, 40 + (winCount % 8) * 25));

      const winEl = document.createElement('div');
      winEl.className = 'window';
      winEl.id = id;
      winEl.style.width = width + 'px';
      winEl.style.height = height + 'px';
      winEl.style.left = left + 'px';
      winEl.style.top = top + 'px';
      winEl.style.zIndex = ++highestZ;

      const titlebar = document.createElement('div');
      titlebar.className = 'titlebar';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'w-icon';
      iconSpan.textContent = opts.icon || '📱';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'w-title';
      titleSpan.textContent = opts.title || 'Window';

      const btnsDiv = document.createElement('div');
      btnsDiv.className = 'w-btns';

      const minBtn = document.createElement('div');
      minBtn.className = 'w-btn minimize';
      minBtn.textContent = '—';
      minBtn.onclick = (e) => { e.stopPropagation(); this.minimize(id); };

      const maxBtn = document.createElement('div');
      maxBtn.className = 'w-btn maximize';
      maxBtn.textContent = '□';
      maxBtn.onclick = (e) => { e.stopPropagation(); this.maximize(id); };

      const closeBtn = document.createElement('div');
      closeBtn.className = 'w-btn close';
      closeBtn.textContent = '✕';
      closeBtn.onclick = (e) => { e.stopPropagation(); this.close(id); };

      if (opts.maximizable === false) maxBtn.style.display = 'none';

      btnsDiv.appendChild(minBtn);
      btnsDiv.appendChild(maxBtn);
      btnsDiv.appendChild(closeBtn);

      titlebar.appendChild(iconSpan);
      titlebar.appendChild(titleSpan);
      titlebar.appendChild(btnsDiv);

      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'w-body mw-scroll';
      
      if (typeof opts.content === 'string') {
        bodyDiv.innerHTML = opts.content;
      } else if (opts.content instanceof HTMLElement) {
        bodyDiv.appendChild(opts.content);
      }

      winEl.appendChild(titlebar);
      winEl.appendChild(bodyDiv);

      if (opts.resizable !== false) {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        winEl.appendChild(resizeHandle);
        this.bindResize(winEl, resizeHandle, id);
      }

      document.getElementById('desktop').appendChild(winEl);

      const winObj = {
        id,
        title: opts.title || 'Window',
        icon: opts.icon || '📱',
        element: winEl,
        body: bodyDiv,
        desktopId,
        minimized: false,
        maximized: false,
        onClose: opts.onClose,
        restoreState: null
      };

      windows.set(id, winObj);

      // Annotate the body element with window props so apps can use
      // the returned body directly (innerHTML, querySelector, isConnected)
      // while still being able to reach the window manager if needed.
      bodyDiv.windowId = id;
      bodyDiv.windowObj = winObj;

      this.bindDrag(winEl, titlebar, id);
      winEl.onpointerdown = () => this.focus(id);

      this.focus(id);
      MWO.taskbar.render();

      return bodyDiv;
    },

    bindDrag(winEl, titlebar, id) {
      let isDragging = false;
      let startX = 0, startY = 0;
      let initialLeft = 0, initialTop = 0;

      titlebar.onpointerdown = (e) => {
        if (e.target.closest('.w-btn')) return;
        const winObj = windows.get(id);
        if (winObj && winObj.maximized) return;

        isDragging = true;
        titlebar.setPointerCapture(e.pointerId);
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = winEl.offsetLeft;
        initialTop = winEl.offsetTop;
        this.focus(id);
      };

      titlebar.onpointermove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        newTop = Math.max(0, Math.min(window.innerHeight - 40, newTop));
        newLeft = Math.max(-winEl.offsetWidth + 100, Math.min(window.innerWidth - 100, newLeft));

        winEl.style.left = newLeft + 'px';
        winEl.style.top = newTop + 'px';
      };

      titlebar.onpointerup = (e) => {
        if (isDragging) {
          isDragging = false;
          try { titlebar.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };

      titlebar.ondblclick = (e) => {
        if (e.target.closest('.w-btn')) return;
        this.maximize(id);
      };
    },

    bindResize(winEl, handle, id) {
      let isResizing = false;
      let startX = 0, startY = 0;
      let startW = 0, startH = 0;

      handle.onpointerdown = (e) => {
        e.stopPropagation();
        const winObj = windows.get(id);
        if (winObj && winObj.maximized) return;

        isResizing = true;
        handle.setPointerCapture(e.pointerId);
        startX = e.clientX;
        startY = e.clientY;
        startW = winEl.offsetWidth;
        startH = winEl.offsetHeight;
        this.focus(id);
      };

      handle.onpointermove = (e) => {
        if (!isResizing) return;
        const newW = Math.max(200, startW + (e.clientX - startX));
        const newH = Math.max(150, startH + (e.clientY - startY));

        winEl.style.width = newW + 'px';
        winEl.style.height = newH + 'px';
      };

      handle.onpointerup = (e) => {
        if (isResizing) {
          isResizing = false;
          try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };
    },

    focus(id) {
      const win = windows.get(id);
      if (!win) return;

      if (win.minimized) {
        win.minimized = false;
        win.element.classList.remove('minimized');
      }

      win.element.style.display = 'flex';
      win.element.style.zIndex = ++highestZ;

      windows.forEach(w => w.element.classList.remove('active'));
      win.element.classList.add('active');

      MWO.taskbar.render();
    },

    minimize(id) {
      const win = windows.get(id);
      if (!win) return;

      win.minimized = true;
      win.element.classList.add('minimized');
      win.element.style.display = 'none';

      MWO.taskbar.render();
    },

    maximize(id) {
      const win = windows.get(id);
      if (!win) return;

      if (win.maximized) {
        win.maximized = false;
        win.element.classList.remove('maximized');
        if (win.restoreState) {
          win.element.style.top = win.restoreState.top;
          win.element.style.left = win.restoreState.left;
          win.element.style.width = win.restoreState.width;
          win.element.style.height = win.restoreState.height;
        }
      } else {
        win.restoreState = {
          top: win.element.style.top,
          left: win.element.style.left,
          width: win.element.style.width,
          height: win.element.style.height
        };
        win.maximized = true;
        win.element.classList.add('maximized');
      }
    },

    close(id) {
      const win = windows.get(id);
      if (!win) return;

      if (typeof win.onClose === 'function') {
        win.onClose();
      }

      win.element.remove();
      windows.delete(id);
      MWO.taskbar.render();
    },

    updateWindowVisibility() {
      const curDesktop = MWO.desktop.getCurrentDesktop();
      windows.forEach(win => {
        if (win.desktopId === curDesktop) {
          if (!win.minimized) {
            win.element.style.display = 'flex';
          }
        } else {
          win.element.style.display = 'none';
        }
      });
      MWO.taskbar.render();
    },

    list() {
      return Array.from(windows.values());
    },

    getOpenWindows() {
      return this.list().filter(w => !w.minimized);
    },

    getWindow(id) {
      return windows.get(id);
    }
  };
})(MWO);

/* ========================================================================
 * 7. MWO.taskbar — Taskbar & Tray
 * ======================================================================== */
(function(MWO) {
  'use strict';

  let clockInterval = null;

  MWO.taskbar = {
    init() {
      this.bindEvents();
      this.startClock();
      this.renderDesktopSwitcher();
      this.render();
    },

    bindEvents() {
      const startBtn = document.getElementById('start-btn');
      if (startBtn) {
        startBtn.onclick = (e) => {
          e.stopPropagation();
          MWO.start.toggle();
        };
      }
    },

    startClock() {
      if (clockInterval) clearInterval(clockInterval);
      this.updateClock();
      clockInterval = setInterval(() => this.updateClock(), 1000);
    },

    updateClock() {
      const clockEl = document.getElementById('clock');
      if (!clockEl) return;
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const date = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
      clockEl.innerHTML = time + '<br><span style="color:var(--text2);font-size:0.8em">' + date + '</span>';
    },

    renderDesktopSwitcher() {
      const container = document.getElementById('desktop-switcher');
      if (!container) return;
      container.innerHTML = '';

      const user = MWO.desktop.getCurrentUser();
      const currentId = MWO.desktop.getCurrentDesktop();
      const desktops = user?.desktops || [{ id: 1 }];

      desktops.forEach(d => {
        const btn = document.createElement('div');
        btn.className = 'ds-btn' + (d.id === currentId ? ' active' : '');
        btn.textContent = d.id;
        btn.onclick = () => MWO.desktop.switchDesktop(d.id);
        container.appendChild(btn);
      });

      if (desktops.length < 6) {
        const addBtn = document.createElement('div');
        addBtn.className = 'ds-btn ds-add';
        addBtn.textContent = '+';
        addBtn.title = 'Add Desktop';
        addBtn.onclick = () => MWO.desktop.addDesktop();
        container.appendChild(addBtn);
      }
    },

    render() {
      const container = document.getElementById('taskbar-apps');
      if (!container) return;
      container.innerHTML = '';

      const curDesktop = MWO.desktop.getCurrentDesktop();
      const desktopWindows = MWO.wm.list().filter(w => w.desktopId === curDesktop);

      desktopWindows.forEach(win => {
        const tab = document.createElement('div');
        const isActive = win.element.classList.contains('active') && !win.minimized;
        tab.className = 'taskbar-app' + (isActive ? ' active' : '');
        
        const icn = document.createElement('span');
        icn.textContent = win.icon || '📱';
        
        const title = document.createElement('span');
        title.textContent = win.title;

        tab.appendChild(icn);
        tab.appendChild(title);

        tab.onclick = () => {
          if (isActive) {
            MWO.wm.minimize(win.id);
          } else {
            MWO.wm.focus(win.id);
          }
        };

        container.appendChild(tab);
      });

      this.renderDesktopSwitcher();
    }
  };
})(MWO);

/* ========================================================================
 * 8. MWO.start — Start Menu
 * ======================================================================== */
(function(MWO) {
  'use strict';
  let activeTab = 'all';
  let searchQuery = '';

  MWO.start = {
    init() {
      this.bindEvents();
    },

    bindEvents() {
      const searchInput = document.getElementById('sm-search-input');
      if (searchInput) {
        searchInput.oninput = (e) => this.search(e.target.value);
      }

      const tabs = document.querySelectorAll('#start-menu .sm-tab');
      tabs.forEach(tab => {
        tab.onclick = () => {
          const t = tab.getAttribute('data-tab');
          if (t) this.setTab(t);
        };
      });
    },

    toggle() {
      const menu = document.getElementById('start-menu');
      if (!menu) return;
      if (menu.classList.contains('active')) {
        this.close();
      } else {
        this.open();
      }
    },

    open() {
      const menu = document.getElementById('start-menu');
      if (!menu) return;
      menu.classList.add('active');
      this.render();
      const input = document.getElementById('sm-search-input');
      if (input) {
        input.value = '';
        searchQuery = '';
        input.focus();
      }
    },

    close() {
      const menu = document.getElementById('start-menu');
      if (menu) menu.classList.remove('active');
    },

    setTab(tab) {
      activeTab = tab;
      const tabs = document.querySelectorAll('#start-menu .sm-tab');
      tabs.forEach(t => {
        if (t.getAttribute('data-tab') === tab) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });
      this.render();
    },

    search(query) {
      searchQuery = query.toLowerCase().trim();
      this.render();
    },

    render() {
      const content = document.getElementById('sm-content');
      if (!content) return;
      content.innerHTML = '';

      if (activeTab === 'system') {
        this.renderSystemTab(content);
        return;
      }

      if (activeTab === 'store') {
        this.close();
        MWO.store.open();
        return;
      }

      const installed = Object.values(MWO.apps || {}).filter(a => a.installed);
      let filtered = installed.filter(app => {
        if (searchQuery) {
          return app.name.toLowerCase().includes(searchQuery) || 
                 (app.description && app.description.toLowerCase().includes(searchQuery));
        }
        if (activeTab === 'apps') return app.category === 'app';
        if (activeTab === 'games') return app.category === 'game';
        return true;
      });

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.style.padding = '20px';
        empty.style.textAlign = 'center';
        empty.style.color = 'var(--text2)';
        empty.textContent = searchQuery ? 'No matching apps found' : 'No installed items';
        content.appendChild(empty);
        return;
      }

      filtered.forEach(app => {
        const item = document.createElement('div');
        item.className = 'sm-item';

        const icn = document.createElement('div');
        icn.className = 'sm-icon';
        icn.textContent = app.icon || '📱';

        const text = document.createElement('div');
        text.className = 'sm-text';

        const name = document.createElement('div');
        name.className = 'sm-name';
        name.textContent = app.name;

        const desc = document.createElement('div');
        desc.className = 'sm-desc';
        desc.style.fontSize = '0.75em';
        desc.style.color = 'var(--text2)';
        desc.textContent = app.description || '';

        text.appendChild(name);
        text.appendChild(desc);

        item.appendChild(icn);
        item.appendChild(text);

        item.onclick = () => {
          this.close();
          MWO.launchApp(app.id);
        };

        content.appendChild(item);
      });
    },

    renderSystemTab(container) {
      const sysItems = [
        { name: 'Settings', desc: 'System preferences & wallpapers', icon: '⚙️', action: () => MWO.launchApp('settings') },
        { name: 'MossGuard', desc: 'Security scanner & OS updates', icon: '🛡️', action: () => MWO.launchApp('mossguard') },
        { name: 'About MossyWoss OS', desc: 'System info and specs', icon: 'ℹ️', action: () => this.showAbout() },
        { name: 'Lock Screen', desc: 'Lock session', icon: '🔒', action: () => MWO.lock.lock() },
        { name: 'Shut Down', desc: 'Turn off system', icon: '🔌', action: () => MWO.shutdown.start() }
      ];

      sysItems.forEach(sys => {
        const item = document.createElement('div');
        item.className = 'sm-item';

        const icn = document.createElement('div');
        icn.className = 'sm-icon';
        icn.textContent = sys.icon;

        const text = document.createElement('div');
        text.className = 'sm-text';

        const name = document.createElement('div');
        name.className = 'sm-name';
        name.textContent = sys.name;

        const desc = document.createElement('div');
        desc.className = 'sm-desc';
        desc.style.fontSize = '0.75em';
        desc.style.color = 'var(--text2)';
        desc.textContent = sys.desc;

        text.appendChild(name);
        text.appendChild(desc);

        item.appendChild(icn);
        item.appendChild(text);

        item.onclick = () => {
          this.close();
          sys.action();
        };

        container.appendChild(item);
      });
    },

    showAbout() {
      MWO.dialog.alert(
        'About MossyWoss OS',
        'MossyWoss OS v1.0\nA fully functional browser-based operating system.\nBuilt with HTML5, CSS3, JavaScript, and IndexedDB.'
      );
    }
  };
})(MWO);

/* ========================================================================
 * 9. MWO.notif — Notification System
 * ======================================================================== */
(function(MWO) {
  'use strict';
  const notifications = [];

  MWO.notif = {
    show(title, body, icon = '🔔') {
      const area = document.getElementById('notif-area');
      if (!area) return;

      const card = document.createElement('div');
      card.style.background = 'rgba(22, 33, 62, 0.95)';
      card.style.border = '1px solid rgba(255,255,255,0.1)';
      card.style.borderRadius = '8px';
      card.style.padding = '12px 16px';
      card.style.marginTop = '8px';
      card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
      card.style.cursor = 'pointer';
      card.style.transition = 'all 0.3s ease';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '10px';

      const icn = document.createElement('span');
      icn.style.fontSize = '1.3em';
      icn.textContent = icon;

      const txt = document.createElement('div');
      const t = document.createElement('div');
      t.style.fontWeight = 'bold';
      t.style.fontSize = '0.88em';
      t.textContent = title;

      const b = document.createElement('div');
      b.style.fontSize = '0.78em';
      b.style.color = 'var(--text2)';
      b.textContent = body;

      txt.appendChild(t);
      txt.appendChild(b);

      card.appendChild(icn);
      card.appendChild(txt);

      notifications.push({ title, body, date: new Date() });

      card.onclick = () => {
        card.remove();
      };

      area.appendChild(card);

      setTimeout(() => {
        if (card.parentNode) {
          card.style.opacity = '0';
          setTimeout(() => card.remove(), 300);
        }
      }, 4000);
    },

    togglePanel() {
      const content = document.createElement('div');
      content.style.padding = '12px';

      if (notifications.length === 0) {
        content.textContent = 'No recent notifications.';
      } else {
        notifications.slice(-10).reverse().forEach(n => {
          const row = document.createElement('div');
          row.style.padding = '8px';
          row.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
          
          const title = document.createElement('div');
          title.style.fontWeight = 'bold';
          title.textContent = n.title;

          const body = document.createElement('div');
          body.style.fontSize = '0.8em';
          body.style.color = 'var(--text2)';
          body.textContent = n.body;

          row.appendChild(title);
          row.appendChild(body);
          content.appendChild(row);
        });
      }

      MWO.wm.create({
        id: 'notif-panel-win',
        title: 'Notification Center',
        icon: '🔔',
        width: 320,
        height: 380,
        content: content,
        resizable: true,
        maximizable: false
      });
    }
  };
})(MWO);

/* ========================================================================
 * 10. MWO.dialog — Modal Dialog System
 * ======================================================================== */
(function(MWO) {
  'use strict';

  MWO.dialog = {
    confirm(title, body, onYes, onNo) {
      const overlay = document.getElementById('dialog-overlay');
      const titleEl = document.getElementById('dialog-title');
      const bodyEl = document.getElementById('dialog-body');
      const btnsEl = document.getElementById('dialog-btns');

      if (!overlay || !titleEl || !bodyEl || !btnsEl) return;

      titleEl.textContent = title;
      bodyEl.textContent = body;
      btnsEl.innerHTML = '';

      const yesBtn = document.createElement('button');
      yesBtn.className = 'btn primary';
      yesBtn.style.padding = '8px 16px';
      yesBtn.style.borderRadius = '6px';
      yesBtn.style.background = 'var(--accent)';
      yesBtn.style.color = '#fff';
      yesBtn.style.marginRight = '8px';
      yesBtn.style.cursor = 'pointer';
      yesBtn.textContent = 'Yes';
      yesBtn.onclick = () => {
        overlay.style.display = 'none';
        if (typeof onYes === 'function') onYes();
      };

      const noBtn = document.createElement('button');
      noBtn.className = 'btn secondary';
      noBtn.style.padding = '8px 16px';
      noBtn.style.borderRadius = '6px';
      noBtn.style.background = 'rgba(255,255,255,0.1)';
      noBtn.style.color = '#fff';
      noBtn.style.cursor = 'pointer';
      noBtn.textContent = 'No';
      noBtn.onclick = () => {
        overlay.style.display = 'none';
        if (typeof onNo === 'function') onNo();
      };

      btnsEl.appendChild(yesBtn);
      btnsEl.appendChild(noBtn);

      overlay.style.display = 'flex';
    },

    alert(title, body, onOk) {
      const overlay = document.getElementById('dialog-overlay');
      const titleEl = document.getElementById('dialog-title');
      const bodyEl = document.getElementById('dialog-body');
      const btnsEl = document.getElementById('dialog-btns');

      if (!overlay || !titleEl || !bodyEl || !btnsEl) return;

      titleEl.textContent = title;
      bodyEl.textContent = body;
      btnsEl.innerHTML = '';

      const okBtn = document.createElement('button');
      okBtn.className = 'btn primary';
      okBtn.style.padding = '8px 20px';
      okBtn.style.borderRadius = '6px';
      okBtn.style.background = 'var(--accent)';
      okBtn.style.color = '#fff';
      okBtn.style.cursor = 'pointer';
      okBtn.textContent = 'OK';
      okBtn.onclick = () => {
        overlay.style.display = 'none';
        if (typeof onOk === 'function') onOk();
      };

      btnsEl.appendChild(okBtn);
      overlay.style.display = 'flex';
    }
  };
})(MWO);

/* ========================================================================
 * 11. MWO.ctx — Context Menu
 * ======================================================================== */
(function(MWO) {
  'use strict';

  MWO.ctx = {
    show(x, y, items) {
      const menu = document.getElementById('ctx-menu');
      if (!menu) return;

      menu.innerHTML = '';
      menu.style.display = 'block';
      menu.style.position = 'fixed';
      menu.style.zIndex = '99999';

      items.forEach(item => {
        if (item.separator) {
          const sep = document.createElement('div');
          sep.style.height = '1px';
          sep.style.background = 'rgba(255,255,255,0.1)';
          sep.style.margin = '4px 0';
          menu.appendChild(sep);
        } else {
          const el = document.createElement('div');
          el.className = 'ctx-item';
          el.style.padding = '8px 14px';
          el.style.fontSize = '0.85em';
          el.style.cursor = 'pointer';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.gap = '8px';
          el.style.borderRadius = '4px';
          el.style.color = item.disabled ? 'var(--text2)' : 'var(--text)';

          el.textContent = item.label;

          if (!item.disabled) {
            el.onmouseenter = () => el.style.background = 'rgba(255,255,255,0.1)';
            el.onmouseleave = () => el.style.background = 'none';
            el.onclick = (e) => {
              e.stopPropagation();
              this.hide();
              if (typeof item.action === 'function') item.action();
            };
          }

          menu.appendChild(el);
        }
      });

      const menuW = 180;
      const menuH = menu.offsetHeight || 150;
      const posX = Math.min(x, window.innerWidth - menuW - 10);
      const posY = Math.min(y, window.innerHeight - menuH - 10);

      menu.style.left = Math.max(0, posX) + 'px';
      menu.style.top = Math.max(0, posY) + 'px';
    },

    hide() {
      const menu = document.getElementById('ctx-menu');
      if (menu) menu.style.display = 'none';
    }
  };
})(MWO);

/* ========================================================================
 * 12. MWO.lock — Lock Screen
 * ======================================================================== */
(function(MWO) {
  'use strict';
  let lockTimer = null;

  MWO.lock = {
    lock() {
      const user = MWO.desktop.getCurrentUser() || { name: 'User' };
      const lockEl = document.getElementById('lock-screen');
      const avEl = document.getElementById('lock-av');
      const nmEl = document.getElementById('lock-nm');
      const tmEl = document.getElementById('lock-tm');

      if (!lockEl) return;

      if (avEl) avEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
      if (nmEl) nmEl.textContent = user.name;

      const updateTime = () => {
        if (tmEl) {
          const now = new Date();
          tmEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      };

      updateTime();
      if (lockTimer) clearInterval(lockTimer);
      lockTimer = setInterval(updateTime, 1000);

      lockEl.style.display = 'flex';
    },

    unlock() {
      const lockEl = document.getElementById('lock-screen');
      if (lockEl) lockEl.style.display = 'none';
      if (lockTimer) clearInterval(lockTimer);
    }
  };
})(MWO);

/* ========================================================================
 * 13. MWO.shutdown — Shutdown Engine
 * ======================================================================== */
(function(MWO) {
  'use strict';

  MWO.shutdown = {
    start() {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = '#0a0a1a';
      overlay.style.zIndex = '999999';
      overlay.style.display = 'flex';
      overlay.style.flexDirection = 'column';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.color = '#fff';
      overlay.style.fontSize = '1.2em';

      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      spinner.style.width = '40px';
      spinner.style.height = '40px';
      spinner.style.border = '3px solid rgba(255,255,255,0.2)';
      spinner.style.borderTopColor = 'var(--accent)';
      spinner.style.borderRadius = '50%';
      spinner.style.animation = 'spin 1s linear infinite';
      spinner.style.marginBottom = '16px';

      const text = document.createElement('div');
      text.textContent = 'MossyWoss OS is shutting down...';

      overlay.appendChild(spinner);
      overlay.appendChild(text);
      document.body.appendChild(overlay);

      setTimeout(() => {
        location.reload();
      }, 1500);
    }
  };
})(MWO);

/* ========================================================================
 * 14. App Registration System & Pre-Installed Apps
 * ======================================================================== */
(function(MWO) {
  'use strict';

  MWO.apps = MWO.apps || {};

  MWO.registerApp = function(appDef) {
    if (!appDef || !appDef.id) return;
    MWO.apps[appDef.id] = Object.assign({
      installed: true,
      category: 'app',
      icon: '📱',
      description: ''
    }, appDef);

    if (MWO.desktop && MWO.desktop.renderIcons) {
      MWO.desktop.renderIcons();
    }
    if (MWO.start && MWO.start.render) {
      MWO.start.render();
    }
  };

  MWO.unregisterApp = function(id) {
    if (MWO.apps[id]) {
      MWO.apps[id].installed = false;
      if (MWO.desktop && MWO.desktop.renderIcons) MWO.desktop.renderIcons();
      if (MWO.start && MWO.start.render) MWO.start.render();
    }
  };

  MWO.launchApp = function(id) {
    const app = MWO.apps[id];
    if (app && typeof app.launch === 'function') {
      app.launch();
    } else {
      MWO.notif.show('App Error', 'Cannot launch app: ' + id);
    }
  };

  /* Terminal */
  MWO.registerApp({
    id: 'terminal',
    name: 'Terminal',
    description: 'Interactive system shell & VFS CLI',
    icon: '🐚',
    category: 'app',
    installed: true,
    launch() {
      let cwd = '/Documents';
      const container = document.createElement('div');
      container.style.height = '100%';
      container.style.background = '#0d1117';
      container.style.color = '#58a6ff';
      container.style.fontFamily = 'var(--mono)';
      container.style.padding = '12px';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';

      const output = document.createElement('div');
      output.style.flex = '1';
      output.style.overflowY = 'auto';
      output.style.whiteSpace = 'pre-wrap';
      output.style.marginBottom = '8px';
      output.style.fontSize = '0.85em';
      output.textContent = 'MossyWoss Terminal v1.0\nType "help" for a list of available commands.\n\n';

      const promptRow = document.createElement('div');
      promptRow.style.display = 'flex';
      promptRow.style.alignItems = 'center';
      promptRow.style.gap = '8px';

      const promptLabel = document.createElement('span');
      promptLabel.style.color = '#79c0ff';
      promptLabel.style.fontWeight = 'bold';
      promptLabel.textContent = `user@mossywoss:${cwd}$`;

      const input = document.createElement('input');
      input.type = 'text';
      input.style.flex = '1';
      input.style.background = 'none';
      input.style.border = 'none';
      input.style.color = '#f0f6fc';
      input.style.fontFamily = 'inherit';
      input.style.fontSize = '0.85em';
      input.style.outline = 'none';

      promptRow.appendChild(promptLabel);
      promptRow.appendChild(input);

      container.appendChild(output);
      container.appendChild(promptRow);

      const appendLog = (text, color = '#f0f6fc') => {
        const line = document.createElement('div');
        line.style.color = color;
        line.textContent = text;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
      };

      input.onkeydown = async (e) => {
        if (e.key === 'Enter') {
          const cmdStr = input.value.trim();
          input.value = '';
          if (!cmdStr) return;

          appendLog(`user@mossywoss:${cwd}$ ${cmdStr}`, '#79c0ff');
          const parts = cmdStr.split(' ');
          const cmd = parts[0].toLowerCase();
          const args = parts.slice(1);

          switch (cmd) {
            case 'help':
              appendLog('Available commands:\n  ls, cd, cat, touch, mkdir, rm, echo, clear, date, whoami, sysinfo, help');
              break;
            case 'clear':
              output.innerHTML = '';
              break;
            case 'date':
              appendLog(new Date().toString());
              break;
            case 'whoami':
              const u = MWO.desktop.getCurrentUser();
              appendLog(u ? u.name : 'guest');
              break;
            case 'sysinfo':
              appendLog('MossyWoss OS v1.0\nHost: WebBrowser / IndexedDB VFS\nMemory: Virtual RAM Active\nResolution: ' + window.innerWidth + 'x' + window.innerHeight);
              break;
            case 'ls':
              try {
                const items = await MWO.fs.listDir(cwd);
                if (items.length === 0) {
                  appendLog('(empty directory)');
                } else {
                  items.forEach(it => {
                    const mark = it.type === 'dir' ? '📁 ' : '📄 ';
                    appendLog(mark + it.name, it.type === 'dir' ? '#a5d6ff' : '#f0f6fc');
                  });
                }
              } catch (err) {
                appendLog('ls error: ' + err.message, '#ff7b72');
              }
              break;
            case 'cd':
              const target = args[0] || '/';
              let newPath = target.startsWith('/') ? target : (cwd === '/' ? '/' + target : cwd + '/' + target);
              try {
                const ex = await MWO.fs.exists(newPath);
                if (ex) {
                  cwd = newPath;
                  promptLabel.textContent = `user@mossywoss:${cwd}$`;
                } else {
                  appendLog('cd: no such directory: ' + target, '#ff7b72');
                }
              } catch (err) {
                appendLog('cd error: ' + err.message, '#ff7b72');
              }
              break;
            case 'cat':
              if (!args[0]) {
                appendLog('cat: missing filename', '#ff7b72');
              } else {
                const fPath = args[0].startsWith('/') ? args[0] : (cwd === '/' ? '/' + args[0] : cwd + '/' + args[0]);
                try {
                  const content = await MWO.fs.readFile(fPath);
                  appendLog(content);
                } catch (err) {
                  appendLog('cat: ' + err.message, '#ff7b72');
                }
              }
              break;
            case 'touch':
              if (!args[0]) {
                appendLog('touch: missing filename', '#ff7b72');
              } else {
                const fPath = args[0].startsWith('/') ? args[0] : (cwd === '/' ? '/' + args[0] : cwd + '/' + args[0]);
                await MWO.fs.writeFile(fPath, '');
                appendLog('File created: ' + args[0]);
              }
              break;
            case 'mkdir':
              if (!args[0]) {
                appendLog('mkdir: missing folder name', '#ff7b72');
              } else {
                const dPath = args[0].startsWith('/') ? args[0] : (cwd === '/' ? '/' + args[0] : cwd + '/' + args[0]);
                await MWO.fs.mkdir(dPath);
                appendLog('Folder created: ' + args[0]);
              }
              break;
            case 'rm':
              if (!args[0]) {
                appendLog('rm: missing path', '#ff7b72');
              } else {
                const rPath = args[0].startsWith('/') ? args[0] : (cwd === '/' ? '/' + args[0] : cwd + '/' + args[0]);
                await MWO.fs.deleteFile(rPath);
                appendLog('Removed: ' + args[0]);
              }
              break;
            case 'echo':
              appendLog(args.join(' '));
              break;
            default:
              appendLog('Command not found: ' + cmd + '. Type "help" for command list.', '#ff7b72');
          }
        }
      };

      MWO.wm.create({
        id: 'terminal-win',
        title: 'Terminal',
        icon: '🐚',
        width: 600,
        height: 400,
        content: container
      });

      setTimeout(() => input.focus(), 100);
    }
  });

  /* Mossy AI */
  MWO.registerApp({
    id: 'mossy-ai',
    name: 'Mossy AI',
    description: 'Intelligent OS Assistant & AI Copilot',
    icon: '🤖',
    category: 'app',
    installed: true,
    launch() {
      const container = document.createElement('div');
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.background = '#16213e';
      container.style.padding = '12px';

      const chatBox = document.createElement('div');
      chatBox.style.flex = '1';
      chatBox.style.overflowY = 'auto';
      chatBox.style.display = 'flex';
      chatBox.style.flexDirection = 'column';
      chatBox.style.gap = '10px';
      chatBox.style.marginBottom = '12px';

      const addMsg = (sender, text) => {
        const bubble = document.createElement('div');
        bubble.style.padding = '10px 14px';
        bubble.style.borderRadius = '12px';
        bubble.style.maxWidth = '80%';
        bubble.style.fontSize = '0.88em';
        bubble.style.lineHeight = '1.4';

        if (sender === 'ai') {
          bubble.style.background = 'rgba(233, 69, 96, 0.2)';
          bubble.style.border = '1px solid rgba(233, 69, 96, 0.4)';
          bubble.style.alignSelf = 'flex-start';
          bubble.style.color = '#eee';
        } else {
          bubble.style.background = 'var(--accent2)';
          bubble.style.alignSelf = 'flex-end';
          bubble.style.color = '#fff';
        }

        bubble.textContent = text;
        chatBox.appendChild(bubble);
        chatBox.scrollTop = chatBox.scrollHeight;
      };

      addMsg('ai', 'Hello! I am Mossy AI, your assistant in MossyWoss OS. Ask me anything or tell me how I can help with your desktop experience!');

      const inputRow = document.createElement('div');
      inputRow.style.display = 'flex';
      inputRow.style.gap = '8px';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Ask Mossy AI...';
      input.style.flex = '1';
      input.style.padding = '10px 14px';
      input.style.background = 'rgba(255,255,255,0.06)';
      input.style.border = '1px solid rgba(255,255,255,0.1)';
      input.style.borderRadius = '8px';
      input.style.color = '#fff';

      const sendBtn = document.createElement('button');
      sendBtn.textContent = 'Send';
      sendBtn.style.padding = '10px 16px';
      sendBtn.style.background = 'var(--accent)';
      sendBtn.style.color = '#fff';
      sendBtn.style.borderRadius = '8px';
      sendBtn.style.fontWeight = 'bold';
      sendBtn.style.cursor = 'pointer';

      const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        addMsg('user', text);

        setTimeout(() => {
          const lower = text.toLowerCase();
          let reply = "I'm here to assist! You can open the App Store, browse files in the File Manager, or customize your wallpapers in Settings.";
          if (lower.includes('hello') || lower.includes('hi')) reply = "Greetings! How is your day going on MossyWoss OS?";
          if (lower.includes('wallpaper')) reply = "You can change wallpapers by right-clicking the desktop and selecting 'Change Wallpaper'.";
          if (lower.includes('store') || lower.includes('install')) reply = "Visit the App Store from the taskbar or start menu to install apps and games!";
          if (lower.includes('time') || lower.includes('clock')) reply = `The current time is ${new Date().toLocaleTimeString()}.`;
          if (lower.includes('name')) reply = `Your account name is ${MWO.desktop.getCurrentUser()?.name || 'User'}.`;
          addMsg('ai', reply);
        }, 600);
      };

      sendBtn.onclick = handleSend;
      input.onkeydown = (e) => { if (e.key === 'Enter') handleSend(); };

      inputRow.appendChild(input);
      inputRow.appendChild(sendBtn);

      container.appendChild(chatBox);
      container.appendChild(inputRow);

      MWO.wm.create({
        id: 'mossy-ai-win',
        title: 'Mossy AI Assistant',
        icon: '🤖',
        width: 500,
        height: 450,
        content: container
      });
    }
  });

  /* Web Browser */
  MWO.registerApp({
    id: 'browser',
    name: 'Web Browser',
    description: 'Lightweight internal web browser',
    icon: '🌐',
    category: 'app',
    installed: true,
    launch() {
      const container = document.createElement('div');
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.background = '#1a1a2e';

      const navBar = document.createElement('div');
      navBar.style.display = 'flex';
      navBar.style.alignItems = 'center';
      navBar.style.gap = '6px';
      navBar.style.padding = '8px';
      navBar.style.background = 'var(--surface)';

      const backBtn = document.createElement('button');
      backBtn.textContent = '◀';
      backBtn.style.padding = '6px 10px';
      backBtn.style.background = 'rgba(255,255,255,0.08)';
      backBtn.style.borderRadius = '4px';

      const homeBtn = document.createElement('button');
      homeBtn.textContent = '🏠';
      homeBtn.style.padding = '6px 10px';
      homeBtn.style.background = 'rgba(255,255,255,0.08)';
      homeBtn.style.borderRadius = '4px';

      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.value = 'mossywoss://home';
      urlInput.style.flex = '1';
      urlInput.style.padding = '6px 12px';
      urlInput.style.background = 'rgba(255,255,255,0.06)';
      urlInput.style.border = '1px solid rgba(255,255,255,0.1)';
      urlInput.style.borderRadius = '6px';
      urlInput.style.color = '#fff';

      const goBtn = document.createElement('button');
      goBtn.textContent = 'Go';
      goBtn.style.padding = '6px 12px';
      goBtn.style.background = 'var(--accent)';
      goBtn.style.color = '#fff';
      goBtn.style.borderRadius = '6px';

      navBar.appendChild(backBtn);
      navBar.appendChild(homeBtn);
      navBar.appendChild(urlInput);
      navBar.appendChild(goBtn);

      const frameBody = document.createElement('div');
      frameBody.style.flex = '1';
      frameBody.style.padding = '20px';
      frameBody.style.overflowY = 'auto';

      const renderPage = (url) => {
        frameBody.innerHTML = '';
        if (url.includes('home')) {
          frameBody.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
              <h1 style="color:var(--accent);margin-bottom:10px;">🦊 MossyWoss Web</h1>
              <p style="color:var(--text2);margin-bottom:30px;">Welcome to the single-file browser network</p>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;max-width:400px;margin:0 auto;">
                <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;cursor:pointer;">📰 News</div>
                <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;cursor:pointer;">🎮 Web Games</div>
                <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;cursor:pointer;">📖 Docs</div>
                <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;cursor:pointer;">🔍 Search</div>
              </div>
            </div>
          `;
        } else {
          frameBody.innerHTML = `<div style="padding:20px;"><h2>Web Page: ${url}</h2><p style="color:var(--text2);margin-top:10px;">Loaded mock page content successfully.</p></div>`;
        }
      };

      goBtn.onclick = () => renderPage(urlInput.value);
      homeBtn.onclick = () => { urlInput.value = 'mossywoss://home'; renderPage(urlInput.value); };
      backBtn.onclick = () => { urlInput.value = 'mossywoss://home'; renderPage(urlInput.value); };

      renderPage('mossywoss://home');

      container.appendChild(navBar);
      container.appendChild(frameBody);

      MWO.wm.create({
        id: 'browser-win',
        title: 'Web Browser',
        icon: '🌐',
        width: 680,
        height: 480,
        content: container
      });
    }
  });

  /* Files */
  MWO.registerApp({
    id: 'files',
    name: 'Files',
    description: 'IndexedDB Virtual File System Explorer',
    icon: '📁',
    category: 'app',
    installed: true,
    launch() {
      let currentDir = '/Documents';

      const container = document.createElement('div');
      container.style.height = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';

      const toolbar = document.createElement('div');
      toolbar.style.padding = '8px 12px';
      toolbar.style.background = 'var(--surface)';
      toolbar.style.display = 'flex';
      toolbar.style.alignItems = 'center';
      toolbar.style.gap = '8px';

      const pathLabel = document.createElement('div');
      pathLabel.style.flex = '1';
      pathLabel.style.fontWeight = 'bold';
      pathLabel.style.fontSize = '0.88em';
      pathLabel.textContent = currentDir;

      const newFolderBtn = document.createElement('button');
      newFolderBtn.textContent = '📁 New Folder';
      newFolderBtn.style.padding = '6px 12px';
      newFolderBtn.style.background = 'rgba(255,255,255,0.08)';
      newFolderBtn.style.borderRadius = '6px';
      newFolderBtn.style.fontSize = '0.82em';

      const newFileBtn = document.createElement('button');
      newFileBtn.textContent = '📄 New File';
      newFileBtn.style.padding = '6px 12px';
      newFileBtn.style.background = 'var(--accent)';
      newFileBtn.style.color = '#fff';
      newFileBtn.style.borderRadius = '6px';
      newFileBtn.style.fontSize = '0.82em';

      toolbar.appendChild(pathLabel);
      toolbar.appendChild(newFolderBtn);
      toolbar.appendChild(newFileBtn);

      const body = document.createElement('div');
      body.style.flex = '1';
      body.style.display = 'flex';

      const sidebar = document.createElement('div');
      sidebar.style.width = '140px';
      sidebar.style.background = 'rgba(0,0,0,0.2)';
      sidebar.style.padding = '8px';
      sidebar.style.borderRight = '1px solid rgba(255,255,255,0.06)';

      const quickLinks = ['/', '/Desktop', '/Documents', '/Downloads', '/Pictures', '/Music'];
      quickLinks.forEach(link => {
        const item = document.createElement('div');
        item.style.padding = '8px';
        item.style.borderRadius = '6px';
        item.style.cursor = 'pointer';
        item.style.fontSize = '0.82em';
        item.textContent = link === '/' ? '🏠 Root' : '📁 ' + link.replace('/', '');
        item.onclick = () => loadDir(link);
        sidebar.appendChild(item);
      });

      const fileList = document.createElement('div');
      fileList.style.flex = '1';
      fileList.style.padding = '12px';
      fileList.style.display = 'grid';
      fileList.style.gridTemplateColumns = 'repeat(auto-fill, minmax(90px, 1fr))';
      fileList.style.gap = '12px';
      fileList.style.alignContent = 'start';

      body.appendChild(sidebar);
      body.appendChild(fileList);

      const loadDir = async (path) => {
        currentDir = path;
        pathLabel.textContent = currentDir;
        fileList.innerHTML = '';

        try {
          const items = await MWO.fs.listDir(currentDir);
          if (items.length === 0) {
            const empty = document.createElement('div');
            empty.style.gridColumn = '1 / -1';
            empty.style.color = 'var(--text2)';
            empty.style.padding = '20px';
            empty.textContent = 'Folder is empty';
            fileList.appendChild(empty);
            return;
          }

          items.forEach(it => {
            const card = document.createElement('div');
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'center';
            card.style.padding = '8px';
            card.style.borderRadius = '8px';
            card.style.cursor = 'pointer';
            card.style.background = 'rgba(255,255,255,0.03)';

            const icn = document.createElement('div');
            icn.style.fontSize = '2em';
            icn.textContent = it.type === 'dir' ? '📁' : '📄';

            const nm = document.createElement('div');
            nm.style.fontSize = '0.75em';
            nm.style.marginTop = '4px';
            nm.style.textAlign = 'center';
            nm.style.wordBreak = 'break-all';
            nm.textContent = it.name;

            card.appendChild(icn);
            card.appendChild(nm);

            card.ondblclick = async () => {
              if (it.type === 'dir') {
                loadDir(it.path);
              } else {
                const content = await MWO.fs.readFile(it.path);
                MWO.dialog.alert(it.name, content);
              }
            };

            fileList.appendChild(card);
          });
        } catch (err) {
          MWO.notif.show('FS Error', err.message);
        }
      };

      newFolderBtn.onclick = async () => {
        const name = prompt('Folder name:');
        if (name) {
          const p = currentDir === '/' ? '/' + name : currentDir + '/' + name;
          await MWO.fs.mkdir(p);
          loadDir(currentDir);
        }
      };

      newFileBtn.onclick = async () => {
        const name = prompt('File name:');
        if (name) {
          const content = prompt('File text content:') || '';
          const p = currentDir === '/' ? '/' + name : currentDir + '/' + name;
          await MWO.fs.writeFile(p, content);
          loadDir(currentDir);
        }
      };

      loadDir(currentDir);

      container.appendChild(toolbar);
      container.appendChild(body);

      MWO.wm.create({
        id: 'files-win',
        title: 'File Manager',
        icon: '📁',
        width: 640,
        height: 420,
        content: container
      });
    }
  });

  /* Settings */
  MWO.registerApp({
    id: 'settings',
    name: 'Settings',
    description: 'System preferences & theme customization',
    icon: '⚙️',
    category: 'app',
    installed: true,
    launch() {
      const content = document.createElement('div');
      content.style.padding = '20px';

      const h2 = document.createElement('h2');
      h2.textContent = 'System Preferences';
      h2.style.marginBottom = '16px';

      const user = MWO.desktop.getCurrentUser();
      const info = document.createElement('div');
      info.style.marginBottom = '20px';
      info.style.fontSize = '0.9em';
      info.innerHTML = `
        <p><strong>User:</strong> ${user?.name || 'Guest'}</p>
        <p><strong>Country:</strong> ${user?.country || 'N/A'}</p>
        <p><strong>Language:</strong> ${user?.language || 'en'}</p>
      `;

      const wpBtn = document.createElement('button');
      wpBtn.textContent = '🖼️ Change Wallpaper';
      wpBtn.style.padding = '10px 16px';
      wpBtn.style.background = 'var(--accent)';
      wpBtn.style.color = '#fff';
      wpBtn.style.borderRadius = '8px';
      wpBtn.style.cursor = 'pointer';
      wpBtn.onclick = () => MWO.desktop.showWallpaperPicker();

      content.appendChild(h2);
      content.appendChild(info);
      content.appendChild(wpBtn);

      MWO.wm.create({
        id: 'settings-win',
        title: 'Settings',
        icon: '⚙️',
        width: 400,
        height: 300,
        content: content
      });
    }
  });

})(MWO);

/* ========================================================================
 * 15. MWO.store — App Store & Installable Items
 * ======================================================================== */
(function(MWO) {
  'use strict';

  // The store catalogs REAL registered apps (MWO.apps) — single source of truth.
  // No bundled dummy entries: every card below is a fully working app.

  MWO.saveInstalled = function() {
    try {
      const ids = Object.values(MWO.apps || {}).filter(a => a.installed).map(a => a.id);
      localStorage.setItem('mwo_installed', JSON.stringify(ids));
    } catch (e) {}
  };

  MWO.store = {
    open() {
      const container = document.createElement('div');
      container.style.padding = '16px';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '12px';

      const bar = document.createElement('div');
      bar.style.display = 'flex';
      bar.style.gap = '8px';
      bar.style.flexWrap = 'wrap';
      const search = document.createElement('input');
      search.type = 'text';
      search.placeholder = 'Search apps & games...';
      search.style.flex = '1';
      search.style.minWidth = '140px';
      search.style.padding = '9px 12px';
      search.style.background = 'rgba(255,255,255,0.06)';
      search.style.border = '1px solid rgba(255,255,255,0.12)';
      search.style.borderRadius = '8px';
      search.style.color = 'var(--text)';
      const filters = ['All', 'app', 'game'];
      let activeFilter = 'All';
      const chips = [];
      filters.forEach(f => {
        const chip = document.createElement('button');
        chip.textContent = f === 'All' ? 'All' : (f === 'game' ? 'Games' : 'Apps');
        chip.style.padding = '8px 14px';
        chip.style.borderRadius = '999px';
        chip.style.border = '1px solid rgba(255,255,255,0.15)';
        chip.style.background = f === 'All' ? 'var(--accent)' : 'rgba(255,255,255,0.05)';
        chip.style.color = 'var(--text)';
        chip.onclick = () => {
          activeFilter = f;
          chips.forEach(ch => ch.style.background = 'rgba(255,255,255,0.05)');
          chip.style.background = 'var(--accent)';
          renderGrid();
        };
        chips.push(chip);
        bar.appendChild(chip);
      });
      bar.appendChild(search);
      if (MWO.Publisher && MWO.Publisher.open) {
        const pubBtn = document.createElement('button');
        pubBtn.textContent = '📤 Publish your own';
        pubBtn.style.padding = '8px 14px';
        pubBtn.style.borderRadius = '999px';
        pubBtn.style.border = '1px solid rgba(255,255,255,0.15)';
        pubBtn.style.background = 'rgba(34,197,94,0.15)';
        pubBtn.style.color = '#86efac';
        pubBtn.style.fontWeight = 'bold';
        pubBtn.onclick = () => MWO.Publisher.open();
        bar.appendChild(pubBtn);
      }
      container.appendChild(bar);

      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
      grid.style.gap = '14px';
      container.appendChild(grid);

      const SYSTEM_APPS = ['bin', 'files', 'browser', 'settings', 'terminal'];

      const renderGrid = () => {
        grid.innerHTML = '';
        const q = search.value.trim().toLowerCase();
        const apps = Object.values(MWO.apps || {}).filter(a => {
          if (activeFilter !== 'All' && (a.category || 'app') !== activeFilter) return false;
          if (!q) return true;
          return (a.name + ' ' + (a.description || '')).toLowerCase().includes(q);
        }).sort((a, b) => a.name.localeCompare(b.name));

        if (apps.length === 0) {
          const empty = document.createElement('div');
          empty.style.color = 'var(--text2)';
          empty.style.padding = '20px';
          empty.textContent = 'No apps match that search.';
          grid.appendChild(empty);
          return;
        }

        apps.forEach(item => {
          const card = document.createElement('div');
          card.style.background = 'rgba(255,255,255,0.04)';
          card.style.border = '1px solid rgba(255,255,255,0.08)';
          card.style.borderRadius = '10px';
          card.style.padding = '14px';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.gap = '8px';

          const top = document.createElement('div');
          top.style.display = 'flex';
          top.style.alignItems = 'center';
          top.style.gap = '10px';
          const icn = document.createElement('div');
          icn.style.fontSize = '2em';
          icn.textContent = item.icon || '📦';
          const info = document.createElement('div');
          const nm = document.createElement('div');
          nm.style.fontWeight = 'bold';
          nm.style.fontSize = '0.9em';
          nm.textContent = item.name;
          const cat = document.createElement('div');
          cat.style.fontSize = '0.72em';
          cat.style.color = 'var(--text2)';
          cat.textContent = (item.category === 'game' ? 'Game' : 'App');
          info.appendChild(nm);
          info.appendChild(cat);
          top.appendChild(icn);
          top.appendChild(info);

          const desc = document.createElement('div');
          desc.style.fontSize = '0.78em';
          desc.style.color = 'var(--text2)';
          desc.style.flex = '1';
          desc.textContent = item.description || '';

          const actions = document.createElement('div');
          actions.style.display = 'flex';
          actions.style.gap = '6px';

          const isSystem = SYSTEM_APPS.includes(item.id);

          if (item.installed) {
            const openBtn = document.createElement('button');
            openBtn.textContent = 'Open';
            openBtn.style.flex = '1';
            openBtn.style.padding = '8px';
            openBtn.style.borderRadius = '6px';
            openBtn.style.border = 'none';
            openBtn.style.fontWeight = 'bold';
            openBtn.style.background = 'var(--accent)';
            openBtn.style.color = '#fff';
            openBtn.onclick = () => MWO.launchApp(item.id);
            actions.appendChild(openBtn);

            if (!isSystem) {
              const delBtn = document.createElement('button');
              delBtn.textContent = 'Uninstall';
              delBtn.style.padding = '8px';
              delBtn.style.borderRadius = '6px';
              delBtn.style.border = '1px solid rgba(255,255,255,0.15)';
              delBtn.style.background = 'rgba(255,255,255,0.05)';
              delBtn.style.color = 'var(--text2)';
              delBtn.onclick = () => {
                item.installed = false;
                MWO.saveInstalled();
                if (MWO.desktop && MWO.desktop.renderIcons) MWO.desktop.renderIcons();
                MWO.notif.show('Store', item.name + ' uninstalled.');
                renderGrid();
              };
              actions.appendChild(delBtn);
            }
          } else {
            const btn = document.createElement('button');
            btn.textContent = 'Install';
            btn.style.flex = '1';
            btn.style.padding = '9px';
            btn.style.borderRadius = '6px';
            btn.style.border = 'none';
            btn.style.fontWeight = 'bold';
            btn.style.background = 'var(--accent)';
            btn.style.color = '#fff';
            btn.onclick = () => {
              item.installed = true;
              MWO.saveInstalled();
              if (MWO.desktop && MWO.desktop.renderIcons) MWO.desktop.renderIcons();
              MWO.notif.show('Store', item.name + ' installed.');
              renderGrid();
            };
            actions.appendChild(btn);
          }

          card.appendChild(top);
          card.appendChild(desc);
          card.appendChild(actions);
          grid.appendChild(card);
        });

        // Published-by-user entries (Publish Studio) — real installs from the VFS.
        if (MWO.Publisher && MWO.Publisher.listPublished) {
          MWO.Publisher.listPublished().then(items => {
            if (!items.length) return;
            items.forEach(p => {
              const card = document.createElement('div');
              card.style.background = 'rgba(34,197,94,0.07)';
              card.style.border = '1px solid rgba(34,197,94,0.25)';
              card.style.borderRadius = '10px';
              card.style.padding = '14px';
              card.style.display = 'flex';
              card.style.flexDirection = 'column';
              card.style.gap = '8px';
              const top = document.createElement('div');
              top.style.display = 'flex';
              top.style.alignItems = 'center';
              top.style.gap = '10px';
              const icn = document.createElement('div');
              icn.style.fontSize = '2em';
              icn.textContent = p.icon || '📦';
              const info = document.createElement('div');
              const nm = document.createElement('div');
              nm.style.fontWeight = 'bold';
              nm.style.fontSize = '0.9em';
              nm.textContent = p.name;
              const cat = document.createElement('div');
              cat.style.fontSize = '0.72em';
              cat.style.color = 'var(--text2)';
              cat.textContent = 'Published · ' + (p.category === 'game' ? 'Game' : 'App');
              info.appendChild(nm);
              info.appendChild(cat);
              top.appendChild(icn);
              top.appendChild(info);
              const desc = document.createElement('div');
              desc.style.fontSize = '0.78em';
              desc.style.color = 'var(--text2)';
              desc.style.flex = '1';
              desc.textContent = p.description || '';
              const runBtn = document.createElement('button');
              runBtn.textContent = '▶ Run';
              runBtn.style.padding = '9px';
              runBtn.style.borderRadius = '6px';
              runBtn.style.border = 'none';
              runBtn.style.fontWeight = 'bold';
              runBtn.style.background = 'var(--accent)';
              runBtn.style.color = '#fff';
              runBtn.onclick = () => MWO.Publisher.runPublished(p.id);
              card.appendChild(top);
              card.appendChild(desc);
              card.appendChild(runBtn);
              grid.appendChild(card);
            });
          }).catch(function() {});
        }
      };

      search.oninput = renderGrid;
      renderGrid();

      const body = MWO.wm.create({ id: 'store-win', title: 'Store', icon: '🛒', width: 880, height: 620, resizable: true });
      body.style.overflow = 'auto';
      body.appendChild(container);
      return body;
    }
  };

})(MWO);

/* ========================================================================
 * 16. System Auto-Initialization
 * ======================================================================== */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MWO.boot.init());
} else {
  MWO.boot.init();
}
