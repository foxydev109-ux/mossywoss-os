var MWO = MWO || {};

(function() {
  'use strict';

  // ==========================================
  // SHARED UTILITIES & AUDIO SYNTHESIZER
  // ==========================================
  var audioCtx = null;
  function playSound(type) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      var now = audioCtx.currentTime;

      if (type === 'shoot') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
      } else if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.1);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'hoot') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now); osc.stop(now + 0.35);
      } else if (type === 'eat' || type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
      } else if (type === 'boom') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      } else if (type === 'powerup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.22);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.start(now); osc.stop(now + 0.22);
      }
    } catch(e) {}
  }

  // --- VFS PERSISTENCE HELPERS ---
  function saveGameData(key, data) {
    if (MWO.fs && MWO.fs.writeFile) {
      try {
        var path = '/Documents/saves/' + key + '.json';
        MWO.fs.writeFile(path, JSON.stringify(data)).catch(function(){});
      } catch(e) {}
    }
  }

  function loadGameData(key, cb) {
    if (MWO.fs && MWO.fs.readFile) {
      var path = '/Documents/saves/' + key + '.json';
      MWO.fs.readFile(path).then(function(str) {
        if (str) {
          try { cb(JSON.parse(str)); return; } catch(e) {}
        }
        cb(null);
      }).catch(function() { cb(null); });
    } else {
      cb(null);
    }
  }

  // --- ASSET LOADER WITH GUARD ---
  var assetCache = {};
  function getAssetImg(key) {
    if (MWO.ASSETS && MWO.ASSETS[key]) {
      if (!assetCache[key]) {
        var img = new Image();
        img.src = MWO.ASSETS[key];
        assetCache[key] = img;
      }
      return assetCache[key];
    }
    return null;
  }

  function isImgLoaded(img) {
    return img && img.complete && img.naturalWidth !== 0;
  }

  // --- VECTOR CANVAS SPRITE FALLBACKS ---
  function drawFoxSprite(ctx, x, y, size, facingLeft, stage) {
    var scale = (stage === 'Cub' ? 0.6 : stage === 'Teen' ? 0.8 : 1.0) * (size / 32);
    ctx.save();
    ctx.translate(x, y);
    if (facingLeft) ctx.scale(-1, 1);
    ctx.scale(scale, scale);

    // Body
    ctx.fillStyle = '#e65c00';
    ctx.beginPath();
    ctx.ellipse(0, 4, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chest/Belly
    ctx.fillStyle = '#fff5e6';
    ctx.beginPath();
    ctx.ellipse(3, 6, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#e65c00';
    ctx.beginPath();
    ctx.arc(10, -5, 8, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#fff5e6';
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.lineTo(18, -2);
    ctx.lineTo(12, 3);
    ctx.closePath();
    ctx.fill();

    // Nose
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(17, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#e65c00';
    ctx.beginPath();
    ctx.moveTo(6, -10); ctx.lineTo(10, -18); ctx.lineTo(12, -10); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(7, -11); ctx.lineTo(10, -16); ctx.lineTo(11, -11); ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(12, -6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.fillStyle = '#e65c00';
    ctx.beginPath();
    ctx.ellipse(-16, -2, 10, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-24, -5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#b34700';
    ctx.fillRect(4, 11, 3, 7);
    ctx.fillRect(-6, 11, 3, 7);

    ctx.restore();
  }

  function drawRabbitSprite(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    var s = size / 24;
    ctx.scale(s, s);

    // Body
    ctx.fillStyle = '#d9c8b4';
    ctx.beginPath(); ctx.ellipse(0, 2, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.beginPath(); ctx.arc(6, -3, 5, 0, Math.PI * 2); ctx.fill();
    // Ears
    ctx.fillStyle = '#c4b098';
    ctx.fillRect(4, -13, 2.5, 8); ctx.fillRect(7, -13, 2.5, 8);
    // Eye
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(8, -4, 1, 0, Math.PI * 2); ctx.fill();
    // Tail
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-8, 2, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawZombieSprite(ctx, x, y, radius, type, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);

    var mainColor = type === 'runner' ? '#3a7d44' : type === 'brute' ? '#1f4e2e' : type === 'spitter' ? '#6b8e23' : '#4a6b35';
    if (type === 'brute') radius *= 1.4;

    // Hands
    ctx.fillStyle = mainColor;
    ctx.beginPath(); ctx.arc(radius * 0.7, -radius * 0.5, radius * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(radius * 0.7, radius * 0.5, radius * 0.35, 0, Math.PI * 2); ctx.fill();

    // Head/Body
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();

    // Eyes (glowing red or yellow)
    ctx.fillStyle = type === 'spitter' ? '#00ff66' : '#e94560';
    ctx.beginPath(); ctx.arc(radius * 0.4, -radius * 0.3, radius * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(radius * 0.4, radius * 0.3, radius * 0.22, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }


  // =========================================================================
  // LIFE SIM 1: FOX LIFE 🦊
  // =========================================================================
  function launchFoxLife() {
    var win = MWO.wm.create({
      id: 'fox-life-' + Date.now(),
      title: 'Fox Life 🦊',
      icon: '🦊',
      width: 660,
      height: 520,
      resizable: false
    });

    win.innerHTML =
      "<div style='display:flex;flex-direction:column;width:100%;height:100%;background:#121820;color:#e2e8f0;font-family:sans-serif;user-select:none;position:relative;overflow:hidden'>" +
        // Header HUD
        "<div style='display:flex;justify-content:space-between;align-items:center;background:#1a2332;padding:6px 12px;border-bottom:1px solid #2d3748;font-size:0.8em'>" +
          "<div style='display:flex;gap:12px'>" +
            "<div>HP: <span id='fl-hp-val'>100</span> <div style='width:60px;height:6px;background:#334155;border-radius:3px;display:inline-block'><div id='fl-hp-bar' style='width:100%;height:100%;background:#ef4444;border-radius:3px'></div></div></div>" +
            "<div>Food: <span id='fl-fd-val'>100</span> <div style='width:60px;height:6px;background:#334155;border-radius:3px;display:inline-block'><div id='fl-fd-bar' style='width:100%;height:100%;background:#f59e0b;border-radius:3px'></div></div></div>" +
            "<div>Water: <span id='fl-wt-val'>100</span> <div style='width:60px;height:6px;background:#334155;border-radius:3px;display:inline-block'><div id='fl-wt-bar' style='width:100%;height:100%;background:#3b82f6;border-radius:3px'></div></div></div>" +
            "<div>Energy: <span id='fl-eg-val'>100</span> <div style='width:60px;height:6px;background:#334155;border-radius:3px;display:inline-block'><div id='fl-eg-bar' style='width:100%;height:100%;background:#10b981;border-radius:3px'></div></div></div>" +
          "</div>" +
          "<div style='text-align:right'>" +
            "<span id='fl-season-txt' style='color:#38bdf8;font-weight:bold'>Spring</span> | Day <span id='fl-day-txt'>1</span> (<span id='fl-stage-txt'>Cub</span>)" +
          "</div>" +
        "</div>" +

        // Main Viewport Canvas
        "<div style='position:relative;flex:1;background:#0f172a;display:flex;align-items:center;justify-content:center;overflow:hidden'>" +
          "<canvas id='fl-canvas' width='640' height='340' style='background:#1e293b;width:100%;height:100%'></canvas>" +

          // Overlay Minimap
          "<canvas id='fl-minimap' width='90' height='60' style='position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.6);border:1px solid #475569;border-radius:4px'></canvas>" +

          // Notification / Sniff Banner
          "<div id='fl-banner' style='position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.85);padding:4px 12px;border-radius:12px;border:1px solid #38bdf8;font-size:0.8em;display:none;color:#38bdf8'></div>" +

          // Title / Game Over Screen Overlay
          "<div id='fl-modal' style='position:absolute;inset:0;background:rgba(15,23,42,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;z-index:10'>" +
            "<h2 id='fl-modal-title' style='margin:0 0 10px 0;color:#f97316;font-size:1.8em'>Fox Life 🦊</h2>" +
            "<div id='fl-modal-body' style='color:#94a3b8;font-size:0.9em;margin-bottom:20px;text-align:center;max-width:400px'>" +
              "Survive as a wild fox. Hunt rabbits, drink from ponds, sleep in your den, find a mate, and raise cubs!" +
            "</div>" +
            "<div style='display:flex;gap:12px'>" +
              "<button id='fl-start-btn' style='padding:8px 20px;background:#ea580c;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer'>New Life</button>" +
              "<button id='fl-continue-btn' style='padding:8px 20px;background:#0284c7;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;display:none'>Continue</button>" +
            "</div>" +
          "</div>" +
        "</div>" +

        // Bottom Controls HUD
        "<div style='display:flex;background:#0f172a;padding:8px 12px;border-top:1px solid #1e293b;align-items:center;justify-content:space-between'>" +
          // D-Pad / Touch Joystick
          "<div style='display:grid;grid-template-columns:repeat(3,36px);grid-template-rows:repeat(3,36px);gap:2px'>" +
            "<div></div><button id='fl-btn-up' style='background:#1e293b;color:#fff;border:1px solid #334155;border-radius:4px'>▲</button><div></div>" +
            "<button id='fl-btn-left' style='background:#1e293b;color:#fff;border:1px solid #334155;border-radius:4px'>◀</button>" +
            "<button id='fl-btn-down' style='background:#1e293b;color:#fff;border:1px solid #334155;border-radius:4px'>▼</button>" +
            "<button id='fl-btn-right' style='background:#1e293b;color:#fff;border:1px solid #334155;border-radius:4px'>▶</button>" +
          "</div>" +

          // Action Buttons
          "<div style='display:flex;gap:6px;flex-wrap:wrap;max-width:360px'>" +
            "<button id='fl-act-eat' style='padding:8px 12px;background:#d97706;color:#fff;border:none;border-radius:6px;font-size:0.8em;font-weight:bold'>🍖 Eat/Hunt</button>" +
            "<button id='fl-act-sleep' style='padding:8px 12px;background:#4f46e5;color:#fff;border:none;border-radius:6px;font-size:0.8em;font-weight:bold'>⛺ Sleep</button>" +
            "<button id='fl-act-sniff' style='padding:8px 12px;background:#0284c7;color:#fff;border:none;border-radius:6px;font-size:0.8em;font-weight:bold'>🔍 Sniff</button>" +
            "<button id='fl-act-groom' style='padding:8px 12px;background:#059669;color:#fff;border:none;border-radius:6px;font-size:0.8em;font-weight:bold'>🧼 Groom</button>" +
            "<button id='fl-act-cuddle' style='padding:8px 12px;background:#db2777;color:#fff;border:none;border-radius:6px;font-size:0.8em;font-weight:bold'>❤️ Cuddle</button>" +
          "</div>" +
        "</div>" +
      "</div>";

    // --- GAME ENGINE STATE ---
    var canvas = win.querySelector('#fl-canvas');
    var ctx = canvas.getContext('2d');
    var miniCanvas = win.querySelector('#fl-minimap');
    var miniCtx = miniCanvas.getContext('2d');

    var MAP_W = 40, MAP_H = 24, TILE_SZ = 28;
    var map = [];
    var seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];

    var state = {
      active: false,
      day: 1,
      timeOfDay: 0, // 0..100
      seasonIdx: 0,
      rabbitsCaught: 0,
      cubsRaised: 0,
      sniffTimer: 0,
      fox: {
        x: 20 * TILE_SZ, y: 12 * TILE_SZ,
        vx: 0, vy: 0,
        hp: 100, hunger: 100, thirst: 100, energy: 100,
        facingLeft: false,
        inventory: 0 // stored rabbits carried
      },
      den: { x: 20, y: 12, food: 2 },
      mate: null, // {x, y, bonded}
      cubs: [], // array of {x, y, age}
      prey: [] // array of {type:'rabbit'|'mouse', x,y, vx,vy}
    };

    // Keyboard state
    var keys = {};
    function onKeyDown(e) { keys[e.key.toLowerCase()] = true; }
    function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Map Generation (0: Grass, 1: Forest, 2: Pond, 3: Berry Bush, 4: Den)
    function generateMap() {
      map = [];
      for (var y = 0; y < MAP_H; y++) {
        var row = [];
        for (var x = 0; x < MAP_W; x++) {
          if ((x - 8)*(x - 8) + (y - 6)*(y - 6) < 12) {
            row.push(2); // Pond
          } else if (x > 28 || y < 5) {
            row.push(Math.random() < 0.65 ? 1 : 0); // Forest
          } else if (Math.random() < 0.08) {
            row.push(3); // Berry bush
          } else {
            row.push(0); // Grass
          }
        }
        map.push(row);
      }
      map[state.den.y][state.den.x] = 4; // Den
    }

    function spawnPrey() {
      state.prey = [];
      for (var i = 0; i < 7; i++) {
        state.prey.push({
          type: 'rabbit',
          x: (5 + Math.random() * 30) * TILE_SZ,
          y: (3 + Math.random() * 18) * TILE_SZ,
          vx: 0, vy: 0
        });
      }
      for (var j = 0; j < 10; j++) {
        state.prey.push({
          type: 'mouse',
          x: (3 + Math.random() * 34) * TILE_SZ,
          y: (3 + Math.random() * 18) * TILE_SZ,
          vx: 0, vy: 0
        });
      }
    }

    function getStage() {
      if (state.day <= 2) return 'Cub';
      if (state.day <= 5) return 'Teen';
      if (state.day <= 14) return 'Adult';
      return 'Elder';
    }

    function showBanner(msg) {
      var el = win.querySelector('#fl-banner');
      el.textContent = msg;
      el.style.display = 'block';
      setTimeout(function() { el.style.display = 'none'; }, 2500);
    }

    // Check VFS Save Game
    loadGameData('fox_life', function(save) {
      if (save) {
        win.querySelector('#fl-continue-btn').style.display = 'inline-block';
      }
    });

    function startNewGame(isContinue) {
      if (isContinue) {
        loadGameData('fox_life', function(save) {
          if (save) {
            state = save;
            win.querySelector('#fl-modal').style.display = 'none';
            state.active = true;
          } else {
            initFresh();
          }
        });
      } else {
        initFresh();
      }
    }

    function initFresh() {
      state.active = true;
      state.day = 1;
      state.timeOfDay = 0;
      state.seasonIdx = 0;
      state.rabbitsCaught = 0;
      state.cubsRaised = 0;
      state.fox = { x: 20 * TILE_SZ, y: 12 * TILE_SZ, vx: 0, vy: 0, hp: 100, hunger: 100, thirst: 100, energy: 100, facingLeft: false, inventory: 0 };
      state.den = { x: 20, y: 12, food: 2 };
      state.mate = null;
      state.cubs = [];
      generateMap();
      spawnPrey();
      win.querySelector('#fl-modal').style.display = 'none';
    }

    win.querySelector('#fl-start-btn').onclick = function() { startNewGame(false); };
    win.querySelector('#fl-continue-btn').onclick = function() { startNewGame(true); };

    // Button event bindings
    win.querySelector('#fl-act-eat').onclick = function() {
      if (!state.active) return;
      var f = state.fox;
      var tx = Math.floor(f.x / TILE_SZ), ty = Math.floor(f.y / TILE_SZ);

      // Check berry bush
      if (map[ty] && map[ty][tx] === 3) {
        f.hunger = Math.min(100, f.hunger + 25);
        showBanner('🍒 Ate berries (+25 Hunger)');
        playSound('eat');
        return;
      }
      // Check den food
      if (tx === state.den.x && ty === state.den.y && state.den.food > 0) {
        state.den.food--;
        f.hunger = Math.min(100, f.hunger + 40);
        showBanner('⛺ Ate stored food from Den (+40 Hunger)');
        playSound('eat');
        return;
      }
      // Check carried food
      if (f.inventory > 0) {
        f.inventory--;
        f.hunger = Math.min(100, f.hunger + 45);
        showBanner('🍖 Ate carried prey (+45 Hunger)');
        playSound('eat');
        return;
      }
      showBanner('No food here! Hunt prey or find berry bushes.');
    };

    win.querySelector('#fl-act-sleep').onclick = function() {
      if (!state.active) return;
      var f = state.fox;
      var tx = Math.floor(f.x / TILE_SZ), ty = Math.floor(f.y / TILE_SZ);
      if (tx === state.den.x && ty === state.den.y) {
        f.energy = 100;
        f.hp = Math.min(100, f.hp + 20);
        state.day++;
        state.timeOfDay = 0;
        if (state.day % 3 === 0) {
          state.seasonIdx = (state.seasonIdx + 1) % 4;
        }
        // Cubs growth
        state.cubs.forEach(function(c) { c.age++; });
        showBanner('💤 Slept in Den. Morning arrives! Day ' + state.day);
        playSound('powerup');
        saveGameData('fox_life', state);
      } else {
        showBanner('Must be at Den tile (⛺) to sleep!');
      }
    };

    win.querySelector('#fl-act-sniff').onclick = function() {
      if (!state.active) return;
      state.sniffTimer = 180; // 3 sec arrow display
      playSound('hoot');
      showBanner('🔍 Sniffing... Prey & Mate directions highlighted!');
    };

    win.querySelector('#fl-act-groom').onclick = function() {
      if (!state.active) return;
      state.fox.hp = Math.min(100, state.fox.hp + 5);
      showBanner('🧼 Groomed coat (+5 HP)');
      playSound('coin');
    };

    win.querySelector('#fl-act-cuddle').onclick = function() {
      if (!state.active) return;
      if (state.mate && state.mate.bonded) {
        showBanner('❤️ Cuddled with Mate! Happiness restored.');
        playSound('coin');
      } else {
        showBanner('Find a Mate first! Bring a rabbit as a gift.');
      }
    };

    // Auto save interval
    var saveTimer = setInterval(function() {
      if (state.active && win.isConnected) saveGameData('fox_life', state);
    }, 30000);

    // D-Pad Touch bindings
    function bindBtn(id, dx, dy) {
      var b = win.querySelector(id);
      var active = false;
      var interval = null;
      function start() {
        if (active) return;
        active = true;
        interval = setInterval(function() {
          if (state.active) {
            state.fox.x = Math.max(10, Math.min((MAP_W - 1) * TILE_SZ, state.fox.x + dx * 3));
            state.fox.y = Math.max(10, Math.min((MAP_H - 1) * TILE_SZ, state.fox.y + dy * 3));
            if (dx < 0) state.fox.facingLeft = true;
            if (dx > 0) state.fox.facingLeft = false;
          }
        }, 30);
      }
      function stop() { active = false; clearInterval(interval); }
      b.onpointerdown = start;
      b.onpointerup = stop;
      b.onpointerleave = stop;
    }
    bindBtn('#fl-btn-up', 0, -1);
    bindBtn('#fl-btn-down', 0, 1);
    bindBtn('#fl-btn-left', -1, 0);
    bindBtn('#fl-btn-right', 1, 0);

    // --- MAIN GAME LOOP ---
    var lastTime = performance.now();
    function loop(now) {
      if (!win.isConnected) {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        clearInterval(saveTimer);
        return;
      }
      var dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (state.active) {
        updateGame(dt);
        renderGame();
      }

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function updateGame(dt) {
      var f = state.fox;
      var spd = (getStage() === 'Cub' ? 1.8 : 2.6) * 60 * dt;

      // Keyboard Controls
      var dx = 0, dy = 0;
      if (keys['arrowleft'] || keys['a']) dx -= 1;
      if (keys['arrowright'] || keys['d']) dx += 1;
      if (keys['arrowup'] || keys['w']) dy -= 1;
      if (keys['arrowdown'] || keys['s']) dy += 1;

      if (dx !== 0 || dy !== 0) {
        var len = Math.sqrt(dx * dx + dy * dy);
        f.x += (dx / len) * spd;
        f.y += (dy / len) * spd;
        if (dx < 0) f.facingLeft = true;
        if (dx > 0) f.facingLeft = false;
        f.energy = Math.max(0, f.energy - 0.8 * dt);
      }

      // Keep in bounds
      f.x = Math.max(12, Math.min((MAP_W - 1) * TILE_SZ - 12, f.x));
      f.y = Math.max(12, Math.min((MAP_H - 1) * TILE_SZ - 12, f.y));

      // Stats Decay
      var isNight = state.timeOfDay > 60;
      f.hunger = Math.max(0, f.hunger - 0.8 * dt);
      f.thirst = Math.max(0, f.thirst - 1.0 * dt);
      if (f.hunger <= 0 || f.thirst <= 0) {
        f.hp = Math.max(0, f.hp - 3.0 * dt);
      }

      // Check Drinking at Pond
      var tx = Math.floor(f.x / TILE_SZ), ty = Math.floor(f.y / TILE_SZ);
      if (map[ty] && map[ty][tx] === 2) {
        if (seasons[state.seasonIdx] === 'Winter') {
          // Frozen pond
        } else {
          f.thirst = Math.min(100, f.thirst + 15 * dt);
        }
      }

      // Time of Day & Seasons
      state.timeOfDay += 2.5 * dt;
      if (state.timeOfDay >= 100) {
        state.timeOfDay = 0;
        state.day++;
        if (state.day % 3 === 0) state.seasonIdx = (state.seasonIdx + 1) % 4;
      }

      // Spawn Mate at Adult Stage
      if (getStage() === 'Adult' && !state.mate) {
        state.mate = { x: 32 * TILE_SZ, y: 15 * TILE_SZ, bonded: false };
      }

      // Mate Interaction
      if (state.mate && !state.mate.bonded) {
        var mdist = Math.hypot(f.x - state.mate.x, f.y - state.mate.y);
        if (mdist < 30 && f.inventory > 0) {
          f.inventory--;
          state.mate.bonded = true;
          showBanner('❤️ Gave prey to Mate! Mate bonded & moved to Den!');
          playSound('powerup');
        }
      }

      // Mate & Cubs spawn at Den
      if (state.mate && state.mate.bonded && state.cubs.length === 0 && getStage() === 'Adult') {
        state.cubs = [
          { x: (state.den.x + 0.5) * TILE_SZ, y: (state.den.y + 0.5) * TILE_SZ, age: 0 },
          { x: (state.den.x - 0.5) * TILE_SZ, y: (state.den.y + 0.5) * TILE_SZ, age: 0 }
        ];
      }

      // Prey AI & Catching
      for (var i = state.prey.length - 1; i >= 0; i--) {
        var p = state.prey[i];
        var dist = Math.hypot(f.x - p.x, f.y - p.y);

        // Flee when Fox near
        if (dist < 110) {
          var ang = Math.atan2(p.y - f.y, p.x - f.x);
          p.x += Math.cos(ang) * 2.2;
          p.y += Math.sin(ang) * 2.2;
        }

        // Catch Prey
        if (dist < 20) {
          state.prey.splice(i, 1);
          state.rabbitsCaught++;
          playSound('eat');
          if (tx === state.den.x && ty === state.den.y) {
            state.den.food++;
            showBanner('⛺ Stored prey in Den!');
          } else if (f.inventory < 2) {
            f.inventory++;
            showBanner('🍖 Caught ' + p.type + '! (Carrying in mouth)');
          } else {
            f.hunger = Math.min(100, f.hunger + 35);
            showBanner('🍖 Ate ' + p.type + ' (+35 Hunger)');
          }
        }
      }

      // Respawn Prey periodically
      if (state.prey.length < 8 && Math.random() < 0.02) {
        state.prey.push({
          type: Math.random() < 0.5 ? 'rabbit' : 'mouse',
          x: (4 + Math.random() * 32) * TILE_SZ,
          y: (4 + Math.random() * 16) * TILE_SZ,
          vx: 0, vy: 0
        });
      }

      if (state.sniffTimer > 0) state.sniffTimer--;

      // Death Check
      if (f.hp <= 0 || state.day > 28) {
        state.active = false;
        win.querySelector('#fl-modal-title').textContent = 'Life Complete 🦊';
        win.querySelector('#fl-modal-body').innerHTML =
          "Days Survived: " + state.day + "<br>" +
          "Rabbits Caught: " + state.rabbitsCaught + "<br>" +
          "Cubs Raised: " + state.cubs.length;
        win.querySelector('#fl-start-btn').textContent = 'Play Again';
        win.querySelector('#fl-continue-btn').style.display = 'none';
        win.querySelector('#fl-modal').style.display = 'flex';
        playSound('boom');
      }

      // Update HUD Elements
      win.querySelector('#fl-hp-val').textContent = Math.round(f.hp);
      win.querySelector('#fl-hp-bar').style.width = f.hp + '%';
      win.querySelector('#fl-fd-val').textContent = Math.round(f.hunger);
      win.querySelector('#fl-fd-bar').style.width = f.hunger + '%';
      win.querySelector('#fl-wt-val').textContent = Math.round(f.thirst);
      win.querySelector('#fl-wt-bar').style.width = f.thirst + '%';
      win.querySelector('#fl-eg-val').textContent = Math.round(f.energy);
      win.querySelector('#fl-eg-bar').style.width = f.energy + '%';

      win.querySelector('#fl-season-txt').textContent = seasons[state.seasonIdx];
      win.querySelector('#fl-day-txt').textContent = state.day;
      win.querySelector('#fl-stage-txt').textContent = getStage();
    }

    function renderGame() {
      var f = state.fox;
      var curSeason = seasons[state.seasonIdx];

      // Camera centering
      var camX = Math.max(0, Math.min(MAP_W * TILE_SZ - canvas.width, f.x - canvas.width / 2));
      var camY = Math.max(0, Math.min(MAP_H * TILE_SZ - canvas.height, f.y - canvas.height / 2));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(-camX, -camY);

      // Render Tiles
      var grassImg = getAssetImg('grass');
      for (var y = 0; y < MAP_H; y++) {
        for (var x = 0; x < MAP_W; x++) {
          var px = x * TILE_SZ, py = y * TILE_SZ;
          var tile = map[y][x];

          if (tile === 0) { // Grass
            if (curSeason === 'Winter') ctx.fillStyle = '#e2e8f0';
            else if (curSeason === 'Autumn') ctx.fillStyle = '#d97706';
            else if (curSeason === 'Summer') ctx.fillStyle = '#15803d';
            else ctx.fillStyle = '#22c55e'; // Spring
            ctx.fillRect(px, py, TILE_SZ, TILE_SZ);
          } else if (tile === 1) { // Forest
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(px, py, TILE_SZ, TILE_SZ);
            ctx.fillStyle = '#047857';
            ctx.beginPath(); ctx.arc(px + 14, py + 14, 10, 0, Math.PI * 2); ctx.fill();
          } else if (tile === 2) { // Pond
            ctx.fillStyle = curSeason === 'Winter' ? '#cbd5e1' : '#0284c7';
            ctx.fillRect(px, py, TILE_SZ, TILE_SZ);
          } else if (tile === 3) { // Berry Bush
            ctx.fillStyle = '#166534';
            ctx.fillRect(px, py, TILE_SZ, TILE_SZ);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(px + 8, py + 8, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(px + 18, py + 16, 3, 0, Math.PI * 2); ctx.fill();
          } else if (tile === 4) { // Den
            ctx.fillStyle = '#78350f';
            ctx.fillRect(px, py, TILE_SZ, TILE_SZ);
            ctx.fillStyle = '#f59e0b';
            ctx.font = '14px sans-serif';
            ctx.fillText('⛺', px + 6, py + 20);
          }

          ctx.strokeStyle = 'rgba(0,0,0,0.05)';
          ctx.strokeRect(px, py, TILE_SZ, TILE_SZ);
        }
      }

      // Render Prey
      state.prey.forEach(function(p) {
        if (p.type === 'rabbit') {
          drawRabbitSprite(ctx, p.x, p.y, 20);
        } else {
          ctx.fillStyle = '#78716c';
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        }
      });

      // Render Mate
      if (state.mate) {
        drawFoxSprite(ctx, state.mate.x, state.mate.y, 28, false, 'Adult');
      }

      // Render Cubs
      state.cubs.forEach(function(c) {
        drawFoxSprite(ctx, c.x, c.y, 20, false, 'Cub');
      });

      // Render Player Fox
      var foxImg = getAssetImg('fox');
      if (isImgLoaded(foxImg)) {
        ctx.save();
        ctx.translate(f.x, f.y);
        if (f.facingLeft) ctx.scale(-1, 1);
        ctx.drawImage(foxImg, -16, -16, 32, 32);
        ctx.restore();
      } else {
        drawFoxSprite(ctx, f.x, f.y, 32, f.facingLeft, getStage());
      }

      // Sniff Direction Pointer
      if (state.sniffTimer > 0) {
        var targetX = state.mate ? state.mate.x : (state.prey[0] ? state.prey[0].x : f.x);
        var targetY = state.mate ? state.mate.y : (state.prey[0] ? state.prey[0].y : f.y);
        var sang = Math.atan2(targetY - f.y, targetX - f.x);

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(sang);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(35, 0); ctx.lineTo(22, -8); ctx.lineTo(22, 8); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Night Overlay
      if (state.timeOfDay > 60) {
        var alpha = Math.min(0.6, ((state.timeOfDay - 60) / 40) * 0.6);
        ctx.fillStyle = 'rgba(15, 23, 42, ' + alpha + ')';
        ctx.fillRect(camX, camY, canvas.width, canvas.height);
      }

      ctx.restore();

      // --- MINIMAP RENDER ---
      miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
      var mw = miniCanvas.width / MAP_W, mh = miniCanvas.height / MAP_H;
      for (var my = 0; my < MAP_H; my++) {
        for (var mx = 0; mx < MAP_W; mx++) {
          var t = map[my][mx];
          miniCtx.fillStyle = t === 1 ? '#047857' : t === 2 ? '#0284c7' : t === 4 ? '#f59e0b' : '#1e293b';
          miniCtx.fillRect(mx * mw, my * mh, mw, mh);
        }
      }
      // Fox on minimap
      miniCtx.fillStyle = '#ef4444';
      miniCtx.fillRect((f.x / TILE_SZ) * mw - 1, (f.y / TILE_SZ) * mh - 1, 3, 3);
    }
  }


  // =========================================================================
  // LIFE SIM 2: VILLAGE LIFE 🏘️
  // =========================================================================
  function launchVillageLife() {
    var win = MWO.wm.create({
      id: 'village-life-' + Date.now(),
      title: 'Village Life 🏘️',
      icon: '🏘️',
      width: 720,
      height: 520,
      resizable: false
    });

    win.innerHTML =
      "<div style='display:flex;width:100%;height:100%;background:#0f172a;color:#e2e8f0;font-family:sans-serif;user-select:none'>" +
        // Left Column: Village Canvas & Controls
        "<div style='flex:1;display:flex;flex-direction:column;border-right:1px solid #1e293b'>" +
          // Header Speed Controls
          "<div style='display:flex;justify-content:space-between;align-items:center;background:#1e293b;padding:6px 12px;font-size:0.8em'>" +
            "<div><b>Village Life</b> | Day <span id='vl-day'>1</span></div>" +
            "<div style='display:flex;gap:4px'>" +
              "<button id='vl-spd-0' style='padding:2px 8px;background:#334155;color:#fff;border:none;border-radius:3px'>⏸️</button>" +
              "<button id='vl-spd-1' style='padding:2px 8px;background:#0284c7;color:#fff;border:none;border-radius:3px'>1x</button>" +
              "<button id='vl-spd-2' style='padding:2px 8px;background:#334155;color:#fff;border:none;border-radius:3px'>2x</button>" +
              "<button id='vl-spd-4' style='padding:2px 8px;background:#334155;color:#fff;border:none;border-radius:3px'>4x</button>" +
            "</div>" +
          "</div>" +

          // Main Village Grid Canvas
          "<div style='flex:1;position:relative;background:#022c22'>" +
            "<canvas id='vl-canvas' width='480' height='380' style='width:100%;height:100%'></canvas>" +
          "</div>" +

          // Build Toolbar
          "<div style='display:flex;gap:6px;padding:8px;background:#1e293b;overflow-x:auto'>" +
            "<button id='vl-bld-house' style='padding:6px 10px;background:#334155;color:#fff;border:none;border-radius:4px;font-size:0.75em'>🏠 House (10W,5S)</button>" +
            "<button id='vl-bld-well' style='padding:6px 10px;background:#334155;color:#fff;border:none;border-radius:4px;font-size:0.75em'>🚰 Well (5W,10S)</button>" +
            "<button id='vl-bld-bakery' style='padding:6px 10px;background:#334155;color:#fff;border:none;border-radius:4px;font-size:0.75em'>🍞 Bakery (15W,15S)</button>" +
          "</div>" +
        "</div>" +

        // Right Column: Resources, Villager Inspector, Event Log
        "<div style='width:220px;display:flex;flex-direction:column;background:#0f172a;padding:8px;gap:8px;overflow-y:auto;font-size:0.8em'>" +
          // Resources Box
          "<div style='background:#1e293b;padding:8px;border-radius:6px'>" +
            "<div style='font-weight:bold;margin-bottom:4px;color:#38bdf8'>Storehouse Resources</div>" +
            "<div style='display:grid;grid-template-columns:1fr 1fr;gap:4px'>" +
              "<div>🪵 Wood: <b id='vl-res-wood'>20</b></div>" +
              "<div>🪨 Stone: <b id='vl-res-stone'>10</b></div>" +
              "<div>🫐 Berries: <b id='vl-res-berries'>15</b></div>" +
              "<div>🌾 Wheat: <b id='vl-res-wheat'>0</b></div>" +
              "<div>🍞 Bread: <b id='vl-res-bread'>0</b></div>" +
              "<div>👨‍👩‍👧 Pop: <b id='vl-res-pop'>4/4</b></div>" +
            "</div>" +
          "</div>" +

          // Villager Inspector
          "<div style='background:#1e293b;padding:8px;border-radius:6px'>" +
            "<div style='font-weight:bold;margin-bottom:4px;color:#f59e0b'>Villager Panel</div>" +
            "<div id='vl-v-info' style='color:#94a3b8'>Select a villager on map...</div>" +
            "<div id='vl-v-controls' style='display:none;margin-top:6px'>" +
              "<div style='margin-bottom:4px'>Job Assignment:</div>" +
              "<select id='vl-job-select' style='width:100%;background:#0f172a;color:#fff;border:1px solid #334155;padding:4px;border-radius:4px'>" +
                "<option value='forager'>Forager (Wood/Berries)</option>" +
                "<option value='farmer'>Farmer (Crops)</option>" +
                "<option value='builder'>Builder (Construct)</option>" +
                "<option value='guard'>Guard (Night Duty)</option>" +
              "</select>" +
            "</div>" +
          "</div>" +

          // Event Log Panel
          "<div style='flex:1;background:#1e293b;padding:8px;border-radius:6px;display:flex;flex-direction:column'>" +
            "<div style='font-weight:bold;margin-bottom:4px;color:#10b981'>Village Event Log</div>" +
            "<div id='vl-event-log' style='flex:1;overflow-y:auto;color:#cbd5e1;font-size:0.85em;display:flex;flex-direction:column;gap:4px'></div>" +
          "</div>" +
        "</div>" +
      "</div>";

    var canvas = win.querySelector('#vl-canvas');
    var ctx = canvas.getContext('2d');

    var GRID_W = 20, GRID_H = 16, TILE = 24;
    var gameSpeed = 1;
    var selectedVillager = null;
    var buildMode = null; // 'house' | 'well' | 'bakery'

    var state = {
      day: 1,
      time: 0, // 0..120s
      res: { wood: 20, stone: 10, berries: 15, wheat: 0, bread: 0 },
      grid: [],
      villagers: [],
      constructions: [],
      logs: []
    };

    function addLog(msg) {
      state.logs.unshift(msg);
      if (state.logs.length > 20) state.logs.pop();
      var el = win.querySelector('#vl-event-log');
      el.innerHTML = state.logs.map(function(l) { return "<div>• " + l + "</div>"; }).join('');
    }

    // Grid Initialization
    function initGrid() {
      state.grid = [];
      for (var y = 0; y < GRID_H; y++) {
        var row = [];
        for (var x = 0; x < GRID_W; x++) {
          if (x === 10 && y === 8) row.push({ type: 'storehouse' });
          else if (x > 14 && y < 5) row.push({ type: 'tree' });
          else if (x < 4 && y > 10) row.push({ type: 'rock' });
          else if (Math.random() < 0.1) row.push({ type: 'berry' });
          else if (Math.random() < 0.08) row.push({ type: 'farm', stage: 0, timer: 0 });
          else row.push({ type: 'grass' });
        }
        state.grid.push(row);
      }

      // Initial Villagers
      var names = ['Theo', 'Rosa', 'Mara', 'Leon', 'Iris'];
      var colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
      state.villagers = [];
      for (var i = 0; i < 4; i++) {
        state.villagers.push({
          id: i,
          name: names[i],
          color: colors[i],
          x: 10 + (i % 2), y: 7 + Math.floor(i / 2),
          job: i === 0 ? 'forager' : i === 1 ? 'farmer' : i === 2 ? 'builder' : 'guard',
          hunger: 100, energy: 100, mood: 90,
          carrying: null, target: null, pairedWith: null
        });
      }
      addLog('Village founded with 4 citizens!');
    }

    loadGameData('village_life', function(save) {
      if (save) {
        state = save;
        addLog('Loaded saved village.');
      } else {
        initGrid();
      }
    });

    // Speed button handlers
    [0, 1, 2, 4].forEach(function(s) {
      win.querySelector('#vl-spd-' + s).onclick = function() {
        gameSpeed = s;
        [0, 1, 2, 4].forEach(function(b) {
          win.querySelector('#vl-spd-' + b).style.background = b === s ? '#0284c7' : '#334155';
        });
      };
    });

    // Build button handlers
    function setBuild(type) {
      buildMode = type;
      ['house', 'well', 'bakery'].forEach(function(b) {
        win.querySelector('#vl-bld-' + b).style.background = b === type ? '#0284c7' : '#334155';
      });
    }
    win.querySelector('#vl-bld-house').onclick = function() { setBuild('house'); };
    win.querySelector('#vl-bld-well').onclick = function() { setBuild('well'); };
    win.querySelector('#vl-bld-bakery').onclick = function() { setBuild('bakery'); };

    // Canvas click picker
    canvas.onclick = function(e) {
      var rect = canvas.getBoundingClientRect();
      var gx = Math.floor((e.clientX - rect.left) / (rect.width / GRID_W));
      var gy = Math.floor((e.clientY - rect.top) / (rect.height / GRID_H));

      if (buildMode) {
        // Queue building construct
        var cost = buildMode === 'house' ? { w: 10, s: 5 } : buildMode === 'well' ? { w: 5, s: 10 } : { w: 15, s: 15 };
        if (state.res.wood >= cost.w && state.res.stone >= cost.s) {
          state.res.wood -= cost.w;
          state.res.stone -= cost.s;
          state.grid[gy][gx] = { type: 'construction', bType: buildMode, progress: 0 };
          addLog('Queued ' + buildMode + ' construction at (' + gx + ',' + gy + ')');
          playSound('coin');
          setBuild(null);
        } else {
          addLog('Not enough resources for ' + buildMode + '!');
        }
        return;
      }

      // Check villager click
      var v = state.villagers.find(function(v) { return Math.abs(v.x - gx) < 1 && Math.abs(v.y - gy) < 1; });
      if (v) {
        selectedVillager = v;
        win.querySelector('#vl-v-info').innerHTML =
          "<b>" + v.name + "</b><br>" +
          "Hunger: " + Math.round(v.hunger) + "%<br>" +
          "Energy: " + Math.round(v.energy) + "%<br>" +
          "Mood: " + Math.round(v.mood) + "%";
        win.querySelector('#vl-v-controls').style.display = 'block';
        win.querySelector('#vl-job-select').value = v.job;
      }
    };

    win.querySelector('#vl-job-select').onchange = function(e) {
      if (selectedVillager) {
        selectedVillager.job = e.target.value;
        addLog(selectedVillager.name + ' reassigned to ' + e.target.value);
      }
    };

    var saveInterval = setInterval(function() {
      if (win.isConnected) saveGameData('village_life', state);
    }, 30000);

    // --- GAME LOOP ---
    var lastTime = performance.now();
    function loop(now) {
      if (!win.isConnected) {
        clearInterval(saveInterval);
        return;
      }
      var dt = Math.min(0.1, (now - lastTime) / 1000) * gameSpeed;
      lastTime = now;

      if (gameSpeed > 0) {
        updateGame(dt);
        renderGame();
      }

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function updateGame(dt) {
      state.time += dt;
      if (state.time >= 120) {
        state.time = 0;
        state.day++;
        addLog('🌅 Day ' + state.day + ' begins!');

        // Night Fox Attack check
        if (Math.random() < 0.6) {
          var guards = state.villagers.filter(function(v) { return v.job === 'guard'; });
          if (guards.length > 0) {
            addLog('🦊 Guard ' + guards[0].name + ' scared off a wild fox!');
            playSound('hoot');
          } else if (state.res.berries > 2) {
            state.res.berries -= 2;
            addLog('🦊 A fox stole 2 berries at night!');
          }
        }
      }

      // Crop Growth
      for (var y = 0; y < GRID_H; y++) {
        for (var x = 0; x < GRID_W; x++) {
          var t = state.grid[y][x];
          if (t.type === 'farm' && t.stage < 2) {
            t.timer += dt;
            if (t.timer >= 12) { t.timer = 0; t.stage++; }
          }
        }
      }

      // Villager AI State Machine
      state.villagers.forEach(function(v) {
        v.hunger = Math.max(0, v.hunger - 0.4 * dt);
        v.energy = Math.max(0, v.energy - 0.3 * dt);

        // Eat if hungry
        if (v.hunger < 30) {
          if (state.res.bread > 0) {
            state.res.bread--;
            v.hunger = 100;
            addLog(v.name + ' ate bread');
          } else if (state.res.berries > 0) {
            state.res.berries--;
            v.hunger = 80;
          } else {
            v.mood = Math.max(0, v.mood - 2 * dt);
          }
        }

        // Job execution
        if (v.job === 'forager') {
          // Walk to wood or berries
          v.x += (14 - v.x) * 0.05 * dt;
          v.y += (3 - v.y) * 0.05 * dt;
          if (Math.abs(v.x - 14) < 1 && Math.abs(v.y - 3) < 1) {
            state.res.wood += 1;
            v.x = 10; v.y = 8; // Return storehouse
          }
        } else if (v.job === 'farmer') {
          // Farm work
          for (var fy = 0; fy < GRID_H; fy++) {
            for (var fx = 0; fx < GRID_W; fx++) {
              if (state.grid[fy][fx].type === 'farm' && state.grid[fy][fx].stage === 2) {
                state.grid[fy][fx].stage = 0;
                state.res.wheat += 2;
                addLog(v.name + ' harvested 2 wheat');
                playSound('coin');
                break;
              }
            }
          }
        } else if (v.job === 'builder') {
          // Find construction site
          for (var cy = 0; cy < GRID_H; cy++) {
            for (var cx = 0; cx < GRID_W; cx++) {
              var c = state.grid[cy][cx];
              if (c.type === 'construction') {
                c.progress += 20 * dt;
                if (c.progress >= 100) {
                  state.grid[cy][cx] = { type: c.bType };
                  addLog(v.name + ' finished building ' + c.bType + '!');
                  playSound('powerup');
                }
                break;
              }
            }
          }
        }
      });

      // Update UI Header
      win.querySelector('#vl-day').textContent = state.day;
      win.querySelector('#vl-res-wood').textContent = state.res.wood;
      win.querySelector('#vl-res-stone').textContent = state.res.stone;
      win.querySelector('#vl-res-berries').textContent = state.res.berries;
      win.querySelector('#vl-res-wheat').textContent = state.res.wheat;
      win.querySelector('#vl-res-bread').textContent = state.res.bread;

      var houses = 0;
      for (var y2 = 0; y2 < GRID_H; y2++)
        for (var x2 = 0; x2 < GRID_W; x2++)
          if (state.grid[y2][x2].type === 'house') houses++;

      var cap = 4 + houses * 2;
      win.querySelector('#vl-res-pop').textContent = state.villagers.length + '/' + cap;
    }

    function renderGame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      var tw = canvas.width / GRID_W;
      var th = canvas.height / GRID_H;

      // Render Grid Tiles
      for (var y = 0; y < GRID_H; y++) {
        for (var x = 0; x < GRID_W; x++) {
          var t = state.grid[y][x];
          var px = x * tw, py = y * th;

          if (t.type === 'grass') ctx.fillStyle = '#15803d';
          else if (t.type === 'storehouse') ctx.fillStyle = '#b45309';
          else if (t.type === 'tree') ctx.fillStyle = '#047857';
          else if (t.type === 'rock') ctx.fillStyle = '#64748b';
          else if (t.type === 'berry') ctx.fillStyle = '#15803d';
          else if (t.type === 'farm') ctx.fillStyle = t.stage === 2 ? '#eab308' : '#854d0e';
          else if (t.type === 'house') ctx.fillStyle = '#a16207';
          else if (t.type === 'well') ctx.fillStyle = '#0284c7';
          else if (t.type === 'bakery') ctx.fillStyle = '#d97706';
          else if (t.type === 'construction') ctx.fillStyle = '#71717a';

          ctx.fillRect(px, py, tw, th);
          ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          ctx.strokeRect(px, py, tw, th);

          // Tile Labels
          if (t.type === 'storehouse') { ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.fillText('📦', px + 4, py + 14); }
          else if (t.type === 'tree') { ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.fillText('🌲', px + 4, py + 14); }
          else if (t.type === 'house') { ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.fillText('🏠', px + 4, py + 14); }
        }
      }

      // Render Villagers
      state.villagers.forEach(function(v) {
        var vx = v.x * tw + tw / 2;
        var vy = v.y * th + th / 2;

        ctx.fillStyle = v.color;
        ctx.beginPath(); ctx.arc(vx, vy, tw * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '9px sans-serif';
        ctx.fillText(v.name[0], vx - 3, vy + 3);
      });

      // Night Overlay
      if (state.time > 80) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }


  // =========================================================================
  // LIFE SIM 3: PET LIFE 🐾
  // =========================================================================
  function launchPetLife() {
    var win = MWO.wm.create({
      id: 'pet-life-' + Date.now(),
      title: 'Pet Life 🐾',
      icon: '🐾',
      width: 440,
      height: 560,
      resizable: false
    });

    win.innerHTML =
      "<div style='display:flex;flex-direction:column;width:100%;height:100%;background:#0f172a;color:#e2e8f0;font-family:sans-serif;user-select:none'>" +
        // Top Room Canvas
        "<div style='position:relative;height:240px;background:#1e1b4b;overflow:hidden'>" +
          "<canvas id='pl-canvas' width='440' height='240' style='width:100%;height:100%'></canvas>" +
          "<div id='pl-bubble' style='position:absolute;top:20px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.9);color:#0f172a;padding:4px 12px;border-radius:12px;font-weight:bold;font-size:0.85em;box-shadow:0 2px 8px rgba(0,0,0,0.3)'>❤️ Feeling happy!</div>" +
        "</div>" +

        // Stat Bars Container
        "<div style='background:#1e293b;padding:8px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px;border-bottom:1px solid #334155;font-size:0.75em'>" +
          "<div>Hunger: <div style='height:6px;background:#334155;border-radius:3px'><div id='pl-bar-hunger' style='width:100%;height:100%;background:#f59e0b;border-radius:3px'></div></div></div>" +
          "<div>Happy: <div style='height:6px;background:#334155;border-radius:3px'><div id='pl-bar-happy' style='width:100%;height:100%;background:#ec4899;border-radius:3px'></div></div></div>" +
          "<div>Hygiene: <div style='height:6px;background:#334155;border-radius:3px'><div id='pl-bar-hygiene' style='width:100%;height:100%;background:#06b6d4;border-radius:3px'></div></div></div>" +
          "<div>Energy: <div style='height:6px;background:#334155;border-radius:3px'><div id='pl-bar-energy' style='width:100%;height:100%;background:#10b981;border-radius:3px'></div></div></div>" +
        "</div>" +

        // Interactive Action Controls
        "<div style='flex:1;background:#0f172a;padding:10px;display:grid;grid-template-columns:repeat(2,1fr);gap:8px'>" +
          "<button id='pl-act-feed' style='padding:12px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer'>🍖 Feed Meal</button>" +
          "<button id='pl-act-play' style='padding:12px;background:#ec4899;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer'>⚽ Play Ball</button>" +
          "<button id='pl-act-bath' style='padding:12px;background:#06b6d4;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer'>🧼 Bath & Brush</button>" +
          "<button id='pl-act-sleep' style='padding:12px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer'>💤 Sleep</button>" +
        "</div>" +
      "</div>";

    var canvas = win.querySelector('#pl-canvas');
    var ctx = canvas.getContext('2d');

    var state = {
      species: 'fox',
      stage: 'baby',
      hunger: 80,
      happy: 80,
      hygiene: 90,
      energy: 90,
      health: 100,
      asleep: false
    };

    loadGameData('pet_life', function(save) {
      if (save) {
        state = save;
        MWO.notif.show('Pet Life', 'Welcome back! Your pet was cared for while away.');
      }
    });

    win.querySelector('#pl-act-feed').onclick = function() {
      state.hunger = Math.min(100, state.hunger + 25);
      state.happy = Math.min(100, state.happy + 10);
      win.querySelector('#pl-bubble').textContent = '😋 Yum! Delicious!';
      playSound('eat');
    };

    win.querySelector('#pl-act-play').onclick = function() {
      state.happy = Math.min(100, state.happy + 30);
      state.energy = Math.max(0, state.energy - 15);
      win.querySelector('#pl-bubble').textContent = '⚽ Yay! So fun!';
      playSound('coin');
    };

    win.querySelector('#pl-act-bath').onclick = function() {
      state.hygiene = 100;
      win.querySelector('#pl-bubble').textContent = '🧼 Squeaky clean!';
      playSound('powerup');
    };

    win.querySelector('#pl-act-sleep').onclick = function() {
      state.asleep = !state.asleep;
      win.querySelector('#pl-bubble').textContent = state.asleep ? '💤 Zzz...' : '☀️ Good morning!';
      playSound('hoot');
    };

    var saveInterval = setInterval(function() {
      if (win.isConnected) saveGameData('pet_life', state);
    }, 30000);

    // --- LOOP ---
    var lastTime = performance.now();
    function loop(now) {
      if (!win.isConnected) {
        clearInterval(saveInterval);
        return;
      }
      var dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // Stats decay
      if (!state.asleep) {
        state.hunger = Math.max(0, state.hunger - 0.5 * dt);
        state.happy = Math.max(0, state.happy - 0.4 * dt);
        state.hygiene = Math.max(0, state.hygiene - 0.3 * dt);
        state.energy = Math.max(0, state.energy - 0.3 * dt);
      } else {
        state.energy = Math.min(100, state.energy + 2.0 * dt);
      }

      // Update UI Bars
      win.querySelector('#pl-bar-hunger').style.width = state.hunger + '%';
      win.querySelector('#pl-bar-happy').style.width = state.happy + '%';
      win.querySelector('#pl-bar-hygiene').style.width = state.hygiene + '%';
      win.querySelector('#pl-bar-energy').style.width = state.energy + '%';

      // Render Pet Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = state.asleep ? '#0f172a' : '#1e1b4b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Floor
      ctx.fillStyle = '#312e81';
      ctx.fillRect(0, 180, canvas.width, 60);

      // Draw Pet Sprite
      var foxImg = getAssetImg('fox');
      if (isImgLoaded(foxImg)) {
        ctx.drawImage(foxImg, canvas.width / 2 - 32, 140, 64, 64);
      } else {
        drawFoxSprite(ctx, canvas.width / 2, 160, 48, false, 'Cub');
      }

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }


  // =========================================================================
  // SHOOTER 1: ZOMBIE SIEGE 🧟
  // =========================================================================
  function launchZombieSiege() {
    var win = MWO.wm.create({
      id: 'zombie-siege-' + Date.now(),
      title: 'Zombie Siege 🧟',
      icon: '🧟',
      width: 680,
      height: 520,
      resizable: false
    });

    win.innerHTML =
      "<div style='display:flex;flex-direction:column;width:100%;height:100%;background:#090d16;color:#e2e8f0;font-family:sans-serif;user-select:none'>" +
        // HUD Header
        "<div style='display:flex;justify-content:space-between;align-items:center;background:#111827;padding:6px 12px;border-bottom:1px solid #1f2937;font-size:0.8em'>" +
          "<div>HP: <b id='zs-hp' style='color:#ef4444'>100</b> | Cash: $<b id='zs-cash' style='color:#10b981'>0</b></div>" +
          "<div>Wave <b id='zs-wave' style='color:#f59e0b'>1</b> | Kills: <b id='zs-kills'>0</b></div>" +
          "<div>Weapon: <b id='zs-wpn' style='color:#38bdf8'>Pistol</b></div>" +
        "</div>" +

        // Arena Canvas
        "<div style='position:relative;flex:1;background:#050811'>" +
          "<canvas id='zs-canvas' width='660' height='380' style='width:100%;height:100%'></canvas>" +

          // Intermission Buy Shop Overlay
          "<div id='zs-shop' style='position:absolute;inset:0;background:rgba(9,13,22,0.92);display:none;flex-direction:column;align-items:center;justify-content:center;padding:20px'>" +
            "<h2 style='color:#f59e0b;margin:0 0 10px 0'>Wave Cleared! Armory Shop</h2>" +
            "<div style='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px'>" +
              "<button id='zs-buy-hp' style='padding:10px;background:#1e293b;color:#fff;border:1px solid #374151;border-radius:6px'>❤️ Medkit (+50 HP) - $40</button>" +
              "<button id='zs-buy-sg' style='padding:10px;background:#1e293b;color:#fff;border:1px solid #374151;border-radius:6px'>🔫 Shotgun Ammo (+30) - $30</button>" +
              "<button id='zs-buy-smg' style='padding:10px;background:#1e293b;color:#fff;border:1px solid #374151;border-radius:6px'>⚡ SMG Ammo (+120) - $30</button>" +
              "<button id='zs-buy-rep' style='padding:10px;background:#1e293b;color:#fff;border:1px solid #374151;border-radius:6px'>🧱 Repair Barricades - $60</button>" +
            "</div>" +
            "<button id='zs-next-btn' style='padding:10px 24px;background:#059669;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer'>Start Next Wave ▶</button>" +
          "</div>" +
        "</div>" +

        // Controls Bar
        "<div style='display:flex;justify-content:space-between;align-items:center;background:#111827;padding:6px 12px'>" +
          "<div style='display:flex;gap:6px'>" +
            "<button id='zs-wpn-1' style='padding:6px 10px;background:#0284c7;color:#fff;border:none;border-radius:4px;font-size:0.75em'>1: Pistol</button>" +
            "<button id='zs-wpn-2' style='padding:6px 10px;background:#374151;color:#fff;border:none;border-radius:4px;font-size:0.75em'>2: Shotgun</button>" +
            "<button id='zs-wpn-3' style='padding:6px 10px;background:#374151;color:#fff;border:none;border-radius:4px;font-size:0.75em'>3: SMG</button>" +
          "</div>" +
          "<button id='zs-btn-repair' style='padding:6px 12px;background:#d97706;color:#fff;border:none;border-radius:4px;font-size:0.75em;font-weight:bold'>🧱 Repair (E)</button>" +
        "</div>" +
      "</div>";

    var canvas = win.querySelector('#zs-canvas');
    var ctx = canvas.getContext('2d');

    var state = {
      hp: 100, cash: 0, wave: 1, kills: 0,
      weapon: 'pistol',
      sgAmmo: 30, smgAmmo: 120,
      player: { x: 330, y: 190, angle: 0 },
      bullets: [],
      zombies: [],
      barricades: [
        { x: 230, y: 190, hp: 150 },
        { x: 430, y: 190, hp: 150 },
        { x: 330, y: 90, hp: 150 },
        { x: 330, y: 290, hp: 150 }
      ]
    };

    var keys = {};
    function onKeyDown(e) { keys[e.key.toLowerCase()] = true; }
    function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    canvas.onmousemove = function(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      state.player.angle = Math.atan2(my - state.player.y, mx - state.player.x);
    };

    canvas.onmousedown = function() { fireWeapon(); };

    function fireWeapon() {
      var p = state.player;
      if (state.weapon === 'pistol') {
        state.bullets.push({ x: p.x, y: p.y, vx: Math.cos(p.angle) * 8, vy: Math.sin(p.angle) * 8, dmg: 25 });
        playSound('shoot');
      } else if (state.weapon === 'shotgun' && state.sgAmmo > 0) {
        state.sgAmmo--;
        for (var i = -2; i <= 2; i++) {
          var a = p.angle + i * 0.1;
          state.bullets.push({ x: p.x, y: p.y, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, dmg: 16 });
        }
        playSound('shoot');
      } else if (state.weapon === 'smg' && state.smgAmmo > 0) {
        state.smgAmmo--;
        var a2 = p.angle + (Math.random() - 0.5) * 0.15;
        state.bullets.push({ x: p.x, y: p.y, vx: Math.cos(a2) * 9, vy: Math.sin(a2) * 9, dmg: 14 });
        playSound('shoot');
      }
    }

    function spawnWave() {
      state.zombies = [];
      var count = 6 + state.wave * 3;
      for (var i = 0; i < count; i++) {
        var ang = Math.random() * Math.PI * 2;
        var dist = 350 + Math.random() * 100;
        state.zombies.push({
          x: state.player.x + Math.cos(ang) * dist,
          y: state.player.y + Math.sin(ang) * dist,
          type: Math.random() < 0.2 ? 'brute' : Math.random() < 0.3 ? 'runner' : 'walker',
          hp: 30
        });
      }
    }
    spawnWave();

    win.querySelector('#zs-next-btn').onclick = function() {
      state.wave++;
      spawnWave();
      win.querySelector('#zs-shop').style.display = 'none';
    };

    // --- GAME LOOP ---
    var lastTime = performance.now();
    function loop(now) {
      if (!win.isConnected) {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        return;
      }
      var dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      updateGame(dt);
      renderGame();

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function updateGame(dt) {
      var p = state.player;
      var spd = 120 * dt;

      if (keys['a'] || keys['arrowleft']) p.x -= spd;
      if (keys['d'] || keys['arrowright']) p.x += spd;
      if (keys['w'] || keys['arrowup']) p.y -= spd;
      if (keys['s'] || keys['arrowdown']) p.y += spd;

      // Update Bullets
      for (var i = state.bullets.length - 1; i >= 0; i--) {
        var b = state.bullets[i];
        b.x += b.vx; b.y += b.vy;

        // Collision with zombies
        for (var j = state.zombies.length - 1; j >= 0; j--) {
          var z = state.zombies[j];
          if (Math.hypot(b.x - z.x, b.y - z.y) < 16) {
            z.hp -= b.dmg;
            state.bullets.splice(i, 1);
            if (z.hp <= 0) {
              state.zombies.splice(j, 1);
              state.kills++;
              state.cash += 15;
              playSound('hit');
            }
            break;
          }
        }
      }

      // Zombie AI
      state.zombies.forEach(function(z) {
        var zang = Math.atan2(p.y - z.y, p.x - z.x);
        var zspd = z.type === 'runner' ? 2.2 : 1.2;
        z.x += Math.cos(zang) * zspd;
        z.y += Math.sin(zang) * zspd;

        if (Math.hypot(p.x - z.x, p.y - z.y) < 16) {
          state.hp = Math.max(0, state.hp - 10 * dt);
        }
      });

      if (state.zombies.length === 0 && win.querySelector('#zs-shop').style.display !== 'flex') {
        win.querySelector('#zs-shop').style.display = 'flex';
      }

      // Update HUD
      win.querySelector('#zs-hp').textContent = Math.round(state.hp);
      win.querySelector('#zs-cash').textContent = state.cash;
      win.querySelector('#zs-wave').textContent = state.wave;
      win.querySelector('#zs-kills').textContent = state.kills;
    }

    function renderGame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background Forest Floor
      var bgImg = getAssetImg('bg_forest');
      if (isImgLoaded(bgImg)) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Render Barricades
      state.barricades.forEach(function(b) {
        if (b.hp > 0) {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(b.x - 15, b.y - 15, 30, 30);
        }
      });

      // Render Bullets
      ctx.fillStyle = '#f59e0b';
      state.bullets.forEach(function(b) {
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
      });

      // Render Zombies
      state.zombies.forEach(function(z) {
        var zImg = getAssetImg('zombie');
        if (isImgLoaded(zImg)) {
          ctx.drawImage(zImg, z.x - 14, z.y - 14, 28, 28);
        } else {
          drawZombieSprite(ctx, z.x, z.y, 14, z.type, 0);
        }
      });

      // Render Player
      var p = state.player;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(0, -3, 18, 6);
      ctx.restore();
    }
  }


  // =========================================================================
  // SHOOTER 2: NEON STRIKE ⚡
  // =========================================================================
  function launchNeonStrike() {
    var win = MWO.wm.create({
      id: 'neon-strike-' + Date.now(),
      title: 'Neon Strike ⚡',
      icon: '⚡',
      width: 680,
      height: 520,
      resizable: false
    });

    win.innerHTML =
      "<div style='display:flex;flex-direction:column;width:100%;height:100%;background:#050510;color:#00f3ff;font-family:sans-serif;user-select:none'>" +
        "<div style='display:flex;justify-content:space-between;align-items:center;background:#0a0a20;padding:6px 12px;border-bottom:1px solid #00f3ff;font-size:0.8em'>" +
          "<div>Score: <b id='ns-score'>0</b> | Multiplier: <b id='ns-mult'>1x</b></div>" +
          "<div>Lives: <b id='ns-lives'>3</b> | High Score: <b id='ns-hi'>0</b></div>" +
        "</div>" +

        "<div style='flex:1;position:relative'>" +
          "<canvas id='ns-canvas' width='660' height='420' style='width:100%;height:100%'></canvas>" +
        "</div>" +
      "</div>";

    var canvas = win.querySelector('#ns-canvas');
    var ctx = canvas.getContext('2d');

    var state = {
      score: 0, mult: 1, lives: 3, highScore: 0,
      player: { x: 330, y: 210, vx: 0, vy: 0 },
      bullets: [],
      enemies: [],
      particles: []
    };

    loadGameData('neon_strike', function(save) {
      if (save && save.highScore) {
        state.highScore = save.highScore;
        win.querySelector('#ns-hi').textContent = state.highScore;
      }
    });

    var keys = {};
    function onKeyDown(e) { keys[e.key.toLowerCase()] = true; }
    function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    canvas.onmousedown = function(e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var ang = Math.atan2(my - state.player.y, mx - state.player.x);

      state.bullets.push({ x: state.player.x, y: state.player.y, vx: Math.cos(ang) * 12, vy: Math.sin(ang) * 12 });
      playSound('shoot');
    };

    function spawnEnemies() {
      for (var i = 0; i < 5; i++) {
        state.enemies.push({
          x: Math.random() * canvas.width,
          y: Math.random() < 0.5 ? 0 : canvas.height,
          type: 'tri',
          hp: 1
        });
      }
    }
    spawnEnemies();

    // --- GAME LOOP ---
    var lastTime = performance.now();
    function loop(now) {
      if (!win.isConnected) {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        return;
      }
      var dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      updateGame(dt);
      renderGame();

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function updateGame(dt) {
      var p = state.player;
      var spd = 200 * dt;

      if (keys['a'] || keys['arrowleft']) p.x -= spd;
      if (keys['d'] || keys['arrowright']) p.x += spd;
      if (keys['w'] || keys['arrowup']) p.y -= spd;
      if (keys['s'] || keys['arrowdown']) p.y += spd;

      p.x = Math.max(10, Math.min(canvas.width - 10, p.x));
      p.y = Math.max(10, Math.min(canvas.height - 10, p.y));

      // Bullets
      for (var i = state.bullets.length - 1; i >= 0; i--) {
        var b = state.bullets[i];
        b.x += b.vx; b.y += b.vy;

        for (var j = state.enemies.length - 1; j >= 0; j--) {
          var e = state.enemies[j];
          if (Math.hypot(b.x - e.x, b.y - e.y) < 14) {
            state.enemies.splice(j, 1);
            state.bullets.splice(i, 1);
            state.score += 100 * state.mult;
            playSound('boom');
            break;
          }
        }
      }

      if (state.enemies.length === 0) spawnEnemies();

      win.querySelector('#ns-score').textContent = state.score;
      if (state.score > state.highScore) {
        state.highScore = state.score;
        win.querySelector('#ns-hi').textContent = state.highScore;
        saveGameData('neon_strike', { highScore: state.highScore });
      }
    }

    function renderGame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Neon Grid Floor
      ctx.strokeStyle = '#00f3ff22';
      ctx.lineWidth = 1;
      for (var x = 0; x < canvas.width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (var y = 0; y < canvas.height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Render Player
      var p = state.player;
      ctx.strokeStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.stroke();

      // Render Bullets
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      state.bullets.forEach(function(b) {
        ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
      });

      // Render Enemies
      ctx.strokeStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      state.enemies.forEach(function(e) {
        ctx.beginPath(); ctx.arc(e.x, e.y, 10, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }
  }


  // =========================================================================
  // REGISTER ALL 5 GAMES WITH MOSSYWOSS OS
  // =========================================================================
  MWO.registerApp({
    id: 'fox-life',
    name: 'Fox Life 🦊',
    description: 'Deep survival life sim',
    icon: '🦊',
    category: 'game',
    installed: false,
    launch: launchFoxLife
  });

  MWO.registerApp({
    id: 'village-life',
    name: 'Village Life 🏘️',
    description: 'Top-down village management sim',
    icon: '🏘️',
    category: 'game',
    installed: false,
    launch: launchVillageLife
  });

  MWO.registerApp({
    id: 'pet-life',
    name: 'Pet Life 🐾',
    description: 'Deep virtual pet simulation',
    icon: '🐾',
    category: 'game',
    installed: false,
    launch: launchPetLife
  });

  MWO.registerApp({
    id: 'zombie-siege',
    name: 'Zombie Siege 🧟',
    description: '2D top-down wave shooter',
    icon: '🧟',
    category: 'game',
    installed: false,
    launch: launchZombieSiege
  });

  MWO.registerApp({
    id: 'neon-strike',
    name: 'Neon Strike ⚡',
    description: 'Twin-stick neon arcade shooter',
    icon: '⚡',
    category: 'game',
    installed: false,
    launch: launchNeonStrike
  });

})();
