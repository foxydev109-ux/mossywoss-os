var MWO = MWO || {};

(function() {
  'use strict';

  // Inject shared lightweight CSS for oddities apps
  var styleEl = document.createElement('style');
  styleEl.textContent =
    '.mwo-box{background:#1e293b;color:#f8fafc;border:1px solid #334155;border-radius:8px;padding:10px;box-sizing:border-box;}' +
    '.mwo-inp{background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px;padding:6px 10px;font-size:12px;box-sizing:border-box;}' +
    '.mwo-btn{border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;touch-action:manipulation;transition:opacity 0.2s;}' +
    '.mwo-btn:active{opacity:0.8;}' +
    '.mwo-flex-col{display:flex;flex-direction:column;gap:8px;height:100%;box-sizing:border-box;font-family:system-ui,sans-serif;}';
  document.head.appendChild(styleEl);

  // Helper Utilities
  function strHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function makePRNG(seed) {
    var s = (seed % 2147483647);
    if (s <= 0) s += 2147483646;
    return function() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function xorEncrypt(text, key) {
    var res = '';
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      res += ('0' + c.toString(16)).slice(-2);
    }
    return res;
  }

  function xorDecrypt(hex, key) {
    var res = '';
    for (var i = 0; i < hex.length; i += 2) {
      var c = parseInt(hex.substr(i, 2), 16) ^ key.charCodeAt((i / 2) % key.length);
      res += String.fromCharCode(c);
    }
    return res;
  }

  function createAudioCtx(win) {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    var ctx = new AudioContextClass();
    var timer = setInterval(function() {
      if (!win.isConnected) {
        clearInterval(timer);
        if (ctx && ctx.state !== 'closed') ctx.close().catch(function(){});
      }
    }, 1000);
    return ctx;
  }

  async function dbSave(key, val) {
    try {
      if (MWO.db && MWO.db.put) await MWO.db.put('user-data', key, { id: key, val: val });
    } catch(e) {}
  }

  async function dbLoad(key) {
    try {
      if (MWO.db && MWO.db.get) {
        var rec = await MWO.db.get('user-data', key);
        return rec ? rec.val : null;
      }
    } catch(e) {}
    return null;
  }


  // =========================================================================
  // APP 1: DREAM DECODER
  // =========================================================================
  var DREAM_SYMBOLS = {
    water: "Water reflects subconscious emotional flow. Clear water marks peace; murky depths signal unexamined feelings.",
    flying: "Flying reflects a desire for liberation and rising above constraints to gain a wider perspective.",
    teeth: "Teeth relate to personal confidence and control. Losing teeth signals transition or anxieties over agency.",
    chase: "Being chased points to avoided responsibilities or emotions seeking self-integration.",
    forest: "The forest symbolizes the unexplored psyche, inviting deep self-reflection and hidden creativity.",
    light: "Light brings sudden clarity and spiritual insight, illuminating solutions out of shadow.",
    falling: "Falling expresses letting go of rigid expectations and trusting your personal grounding.",
    fire: "Fire embodies passion, intense transformation, and creative drive when properly channeled.",
    animals: "Animals represent primal instincts and raw, untamed wisdom waiting to be embraced.",
    house: "A house reflects the architecture of selfhood, with rooms holding corridors of memory and mind.",
    snake: "Snakes symbolize shedding old habits, healing transitions, and awakening inner wisdom.",
    mirror: "Mirrors invite reflection between authentic inner identity and outward social persona.",
    clock: "Clocks signal awareness of life's pacing and the urgency to align actions with core values.",
    storm: "Storms represent turbulent emotional clearing that refreshes the landscape for new growth.",
    door: "Doors symbolize upcoming thresholds, new opportunities, and readiness for uncharted territory.",
    ocean: "The vast ocean speaks to ancestral memory, deep intuition, and boundless emotional tides.",
    mountain: "Mountains symbolize quests and mastery achieved after long, enduring perseverance.",
    ghost: "Ghosts reflect unexpressed memories or lingering feelings seeking peaceful closure.",
    car: "A car symbolizes life trajectory; control over the wheel reflects agency in your journey.",
    key: "Keys signify unlocked knowledge, revealed secrets, and access to new insights.",
    bridge: "Bridges represent transitions between life stages or connecting split aspects of self.",
    shadow: "Shadows represent unacknowledged personal traits that offer strength when integrated.",
    star: "Stars symbolize distant aspirations, steady guidance, and enduring hope.",
    mask: "Masks indicate social personas or hiding authentic vulnerability from public view.",
    crowd: "Crowds reflect social belonging or feeling lost among collective expectations.",
    tunnel: "Tunnels represent focused passage through challenges toward light ahead.",
    bird: "Birds symbolize high messages, expanding spirit, and mental freedom.",
    ring: "Rings represent enduring commitments, wholeness, and interconnected cycles.",
    labyrinth: "Labyrinths signify the winding inner journey toward authentic core discovery.",
    tree: "Trees represent deep grounding roots, family lineage, and growth branching skyward."
  };

  MWO.registerApp({
    id: 'dreamdecoder',
    name: 'Dream Decoder',
    description: 'Analyze dream narratives, generate dream art, and decode psychological symbols.',
    icon: 'win-dreamdecoder',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-dreamdecoder-' + Date.now(), title: 'Dream Decoder', icon: 'dream-decoder', width: 460, height: 540, resizable: true });
      win.style.background = '#0f172a';
      win.style.padding = '10px';

      win.innerHTML = '<div class="mwo-flex-col">' +
 '<div style="font-weight:bold;color:#f8fafc;"> Dream Decoder & Art Generator</div>' +
        '<textarea class="mwo-inp dream-inp" placeholder="Describe your dream... (e.g. flying over a dark forest near a stormy ocean)" style="height:70px;resize:none;"></textarea>' +
        '<div style="display:flex;gap:6px;"><button class="mwo-btn btn-dec" style="flex:1;background:#6366f1;color:#fff;">Decode & Render</button><button class="mwo-btn btn-hist" style="background:#334155;color:#fff;">History</button></div>' +
        '<canvas class="dream-cvs" width="440" height="150" style="width:100%;height:150px;background:#020617;border-radius:8px;border:1px solid #1e293b;"></canvas>' +
        '<div class="dream-res mwo-box mw-scroll" style="flex:1;overflow-y:auto;font-size:12px;line-height:1.4;">Type a dream above and click Decode.</div>' +
        '</div>';

      var txt = win.querySelector('.dream-inp');
      var btnDec = win.querySelector('.btn-dec');
      var btnHist = win.querySelector('.btn-hist');
      var cvs = win.querySelector('.dream-cvs');
      var ctx = cvs.getContext('2d');
      var res = win.querySelector('.dream-res');

      var seed = 12345, activeSyms = [];

      function renderArt() {
        if (!win.isConnected) return;
        var rng = makePRNG(seed);
        var t = Date.now() * 0.001;
        var h1 = (seed * 17 + Math.sin(t * 0.5) * 30) % 360;
        var grad = ctx.createLinearGradient(0, 0, cvs.width, cvs.height);
        grad.addColorStop(0, 'hsla(' + h1 + ',60%,15%,1)');
        grad.addColorStop(1, 'hsla(' + ((h1 + 120) % 360) + ',70%,8%,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        for (var i = 0; i < 12 + activeSyms.length * 2; i++) {
          var bx = (rng() * cvs.width + Math.sin(t * 0.5 + i) * 30 + cvs.width) % cvs.width;
          var by = (rng() * cvs.height + Math.cos(t * 0.5 + i) * 20 + cvs.height) % cvs.height;
          var rad = 20 + rng() * 40;
          var bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
          bGrad.addColorStop(0, 'hsla(' + ((h1 + rng() * 120) % 360) + ',80%,60%,0.5)');
          bGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.arc(bx, by, rad, 0, Math.PI * 2);
          ctx.fill();
        }
        requestAnimationFrame(renderArt);
      }
      requestAnimationFrame(renderArt);

      btnDec.onclick = async function() {
        var val = txt.value.trim().toLowerCase();
        if (!val) return;
        seed = strHash(val);
        activeSyms = [];
        var matches = [];

        for (var k in DREAM_SYMBOLS) {
          if (val.indexOf(k) !== -1) {
            activeSyms.push(k);
            matches.push('<div style="margin-bottom:6px;"><b style="color:#a5b4fc;text-transform:capitalize;">' + k + ':</b> ' + DREAM_SYMBOLS[k] + '</div>');
          }
        }

        res.innerHTML = matches.length ? '<b style="color:#818cf8;">Detected Symbols:</b><br>' + matches.join('') : '<b>Subconscious Stream:</b> Shapes reflect your shifting thoughts.';

        try {
          var f = await MWO.fs.readFile('/Documents/dreams.json').catch(function(){ return '[]'; });
          var list = JSON.parse(f || '[]');
          list.unshift({ date: new Date().toLocaleDateString(), text: txt.value, syms: activeSyms });
          await MWO.fs.writeFile('/Documents/dreams.json', JSON.stringify(list, null, 2));
        } catch(e) {}
      };

      btnHist.onclick = async function() {
        try {
          var f = await MWO.fs.readFile('/Documents/dreams.json');
          var list = JSON.parse(f || '[]');
          if (!list.length) { res.innerHTML = 'No dreams saved yet.'; return; }
          var html = '<b>Past Dreams:</b><br>';
          list.forEach(function(item) {
            html += '<div style="background:#0f172a;padding:6px;border-radius:4px;margin-top:4px;">' +
              '<span style="font-size:10px;color:#94a3b8;">' + item.date + '</span><br>' + item.text + '</div>';
          });
          res.innerHTML = html;
        } catch(e) { res.innerHTML = 'No dreams saved.'; }
      };
    }
  });


  // =========================================================================
  // APP 2: TIME CAPSULE
  // =========================================================================
  MWO.registerApp({
    id: 'timecapsule',
    name: 'Time Capsule',
    description: 'Bury encrypted messages sealed until a designated future date.',
    icon: '⏳',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-timecapsule-' + Date.now(), title: 'Time Capsule', icon: '⏳', width: 460, height: 520, resizable: true });
      win.style.background = '#18181b';
      win.style.padding = '10px';

      var tmr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

      win.innerHTML = '<div class="mwo-flex-col">' +
        '<div style="font-weight:bold;color:#f4f4f5;">⏳ Time Capsule Vault</div>' +
        '<div class="mwo-box" style="background:#27272a;border-color:#3f3f46;display:flex;flex-direction:column;gap:6px;">' +
        '<input type="text" class="mwo-inp cap-title" placeholder="Capsule Title...">' +
        '<textarea class="mwo-inp cap-msg" placeholder="Write message to seal..." style="height:50px;resize:none;"></textarea>' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
        '<label style="font-size:11px;color:#a1a1aa;">Seal Date:</label>' +
        '<input type="date" class="mwo-inp cap-date" min="' + tmr + '" value="' + tmr + '" style="padding:2px 6px;">' +
        '<button class="mwo-btn btn-seal" style="margin-left:auto;background:#eab308;color:#000;">Seal</button>' +
        '</div></div>' +
        '<div class="cap-list mw-scroll" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;"></div>' +
        '<div style="font-size:10px;color:#71717a;text-align:center;">Uses personal-ritual XOR date-key encryption.</div>' +
        '</div>';

      var titleInp = win.querySelector('.cap-title');
      var msgInp = win.querySelector('.cap-msg');
      var dateInp = win.querySelector('.cap-date');
      var sealBtn = win.querySelector('.btn-seal');
      var listDiv = win.querySelector('.cap-list');

      async function renderList() {
        var caps = await dbLoad('capsules') || [];
        if (!caps.length) {
          listDiv.innerHTML = '<div style="color:#71717a;font-size:12px;text-align:center;padding:10px;">No capsules sealed yet.</div>';
          return;
        }

        var today = new Date().toISOString().slice(0, 10);
        listDiv.innerHTML = '';

        caps.forEach(function(cap) {
          var isUnlocked = today >= cap.date;
          var item = document.createElement('div');
          item.className = 'mwo-box';
          item.style.background = '#27272a';
          item.style.borderColor = '#3f3f46';

          var statusTxt = isUnlocked ? '<span style="color:#22c55e;"> Unlocked</span>' : '<span style="color:#eab308;">Lock Sealed: ' + cap.date + '</span>';

          item.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:bold;">' +
            '<span>' + cap.title + '</span>' + statusTxt + '</div>' +
            '<div class="cap-cnt" style="font-family:monospace;font-size:11px;color:#a1a1aa;word-break:break-all;background:#18181b;padding:4px;border-radius:4px;margin-top:4px;">' + cap.ciphertext.slice(0, 32) + '...</div>' +
            '<div style="display:flex;justify-content:flex-end;margin-top:4px;">' +
            '<button class="mwo-btn btn-unl" ' + (!isUnlocked ? 'disabled style="background:#3f3f46;color:#71717a;cursor:not-allowed;"' : 'style="background:#22c55e;color:#000;"') + '>Decrypt</button>' +
            '</div>';

          var unlBtn = item.querySelector('.btn-unl');
          var cntDiv = item.querySelector('.cap-cnt');

          if (isUnlocked) {
            unlBtn.onclick = function() {
              cntDiv.style.color = '#22c55e';
              cntDiv.style.fontFamily = 'system-ui';
              cntDiv.textContent = xorDecrypt(cap.ciphertext, cap.date);
              unlBtn.style.display = 'none';
            };
          }
          listDiv.appendChild(item);
        });
      }

      sealBtn.onclick = async function() {
        var m = msgInp.value.trim();
        var d = dateInp.value;
        if (!m) return;

        var caps = await dbLoad('capsules') || [];
        caps.unshift({ id: 'c_' + Date.now(), title: titleInp.value.trim() || 'Capsule', ciphertext: xorEncrypt(m, d), date: d });
        await dbSave('capsules', caps);
        titleInp.value = ''; msgInp.value = '';
        MWO.notif.show('Time Capsule', 'Capsule sealed until ' + d);
        renderList();
      };

      renderList();
    }
  });


  // =========================================================================
  // APP 3: SOUND GARDEN
  // =========================================================================
  MWO.registerApp({
    id: 'soundgarden',
    name: 'Sound Garden',
    description: 'Plant melodic seeds that grow into procedural pentatonic flowers.',
    icon: 'win-soundgarden',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-soundgarden-' + Date.now(), title: 'Sound Garden', icon: 'sound-garden', width: 480, height: 520, resizable: true });
      win.style.background = '#064e3b';
      win.style.padding = '10px';

      var audioCtx = createAudioCtx(win);

      win.innerHTML = '<div class="mwo-flex-col">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;color:#ecfdf5;">' +
        '<b style="font-size:15px;"> Sound Garden</b>' +
        '<div class="tools-bar" style="display:flex;gap:4px;"></div>' +
        '</div>' +
        '<div style="font-size:11px;color:#a7f3d0;display:flex;justify-content:space-between;">' +
        '<span>Tool: <b class="tool-lbl" style="color:#fbbf24;">Bell</b></span>' +
        '<span>Water: <b class="water-lbl" style="color:#38bdf8;">5/5</b></span>' +
        '</div>' +
        '<div class="grid-plots" style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;flex:1;background:#022c22;padding:8px;border-radius:8px;border:1px solid #047857;align-content:start;"></div>' +
 '<button class="mwo-btn btn-wind" style="background:#10b981;color:#000;padding:8px;"> Play Wind Chime (All Flowers)</button>' +
        '</div>';

      var toolsDiv = win.querySelector('.tools-bar');
      var toolLbl = win.querySelector('.tool-lbl');
      var waterLbl = win.querySelector('.water-lbl');
      var gridDiv = win.querySelector('.grid-plots');
      var windBtn = win.querySelector('.btn-wind');

      var tools = [
 { id: 'bell', name: 'Bell ' },
 { id: 'pluck', name: 'Pluck ' },
 { id: 'pad', name: 'Pad ' },
 { id: 'chime', name: 'Chime ' },
 { id: 'bass', name: 'Bass ' },
        { id: 'water', name: 'Water ' }
      ];

      var activeTool = 'bell';
      tools.forEach(function(t) {
        var b = document.createElement('button');
        b.className = 'mwo-btn';
        b.textContent = t.name;
        b.style.background = '#065f46'; b.style.color = '#fff'; b.style.fontSize = '10px'; b.style.padding = '4px 6px';
        b.onclick = function() {
          activeTool = t.id;
          toolLbl.textContent = t.name;
        };
        toolsDiv.appendChild(b);
      });

      var plots = [], waterState = { date: new Date().toISOString().slice(0, 10), charges: 5 };

      var SCALES = {
        bell: [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50],
        pluck: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25],
        pad: [130.81, 196.00, 261.63, 329.63, 392.00, 493.88],
        chime: [783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98],
        bass: [65.41, 98.00, 130.81, 164.81, 196.00, 220.00]
      };

      function playTone(inst, idx) {
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        var freq = (SCALES[inst] || SCALES.bell)[idx % 6];
        var t = audioCtx.currentTime;
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();

        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, t);

        if (inst === 'bell' || inst === 'chime') {
          osc.type = 'sine'; gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
          osc.start(t); osc.stop(t + 1.5);
        } else if (inst === 'pluck') {
          osc.type = 'triangle'; gain.gain.setValueAtTime(0.4, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          osc.start(t); osc.stop(t + 0.5);
        } else {
          osc.type = inst === 'bass' ? 'sawtooth' : 'sine'; gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
          osc.start(t); osc.stop(t + 1.8);
        }
      }

      async function render() {
        var data = await dbLoad('soundgarden');
        if (data) { plots = data.plots; waterState = data.waterState || waterState; }
        else { plots = []; for (var i = 0; i < 24; i++) plots.push({ inst: null, plantedAt: 0, waterBonus: 0 }); }

        waterLbl.textContent = waterState.charges + '/5';
        gridDiv.innerHTML = '';
        var now = Date.now();

        plots.forEach(function(p, idx) {
          var el = document.createElement('div');
          el.className = 'mwo-box';
          el.style.background = '#04382c'; el.style.borderColor = '#059669'; el.style.height = '50px';
          el.style.display = 'flex'; el.style.flexDirection = 'column'; el.style.alignItems = 'center'; el.style.justifyContent = 'center'; el.style.cursor = 'pointer';

          if (!p.inst) {
 el.innerHTML = '<span style="font-size:14px;opacity:0.3;"></span><span style="font-size:8px;color:#059669;">Empty</span>';
          } else {
            var hrs = (now - p.plantedAt) / 3600000;
            var growth = Math.min(100, Math.floor(hrs * 20 + p.waterBonus));
            var stage = growth >= 70 ? 'Blossom' : (growth >= 30 ? '▲' : '');
            el.innerHTML = '<span style="font-size:18px;">' + stage + '</span><span style="font-size:8px;color:#6ee7b7;">' + growth + '%</span>';
          }

          el.onclick = function() {
            if (activeTool === 'water') {
              if (p.inst && waterState.charges > 0) {
                p.waterBonus += 25; waterState.charges--;
                dbSave('soundgarden', { plots: plots, waterState: waterState }); render();
              }
            } else if (!p.inst) {
              p.inst = activeTool; p.plantedAt = Date.now(); p.waterBonus = 50;
              dbSave('soundgarden', { plots: plots, waterState: waterState }); render();
              playTone(p.inst, idx);
            } else {
              playTone(p.inst, idx);
            }
          };
          gridDiv.appendChild(el);
        });
      }

      windBtn.onclick = function() {
        var delay = 0;
        plots.forEach(function(p, idx) {
          if (p.inst) {
            setTimeout(function() { playTone(p.inst, idx); }, delay);
            delay += 150;
          }
        });
      };

      render();
    }
  });


  // =========================================================================
  // APP 4: COSMIC RADIO
  // =========================================================================
  MWO.registerApp({
    id: 'cosmicradio',
    name: 'Cosmic Radio',
    description: 'Tune into deep space frequencies and procedural radio static.',
    icon: 'cosmic-radio',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-cosmicradio-' + Date.now(), title: 'Cosmic Radio', icon: 'cosmic-radio', width: 460, height: 480, resizable: true });
      win.style.background = '#09090b';
      win.style.padding = '10px';

      var audioCtx = createAudioCtx(win);

      win.innerHTML = '<div class="mwo-flex-col">' +
 '<div style="font-weight:bold;color:#fafafa;"> Cosmic Radio Receiver</div>' +
        '<div class="mwo-box" style="background:#18181b;border-color:#27272a;display:flex;flex-direction:column;gap:6px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-size:11px;color:#a1a1aa;">Dial:</span><b class="freq-lbl" style="font-family:monospace;font-size:16px;color:#38bdf8;">98.5 MHz</b>' +
        '</div>' +
        '<input type="range" class="freq-slider" min="87.5" max="108.0" step="0.1" value="98.5" style="width:100%;accent-color:#38bdf8;">' +
        '<div style="display:flex;justify-content:space-between;font-size:10px;color:#71717a;">' +
        '<span>RA: <b class="ra-lbl" style="color:#e0e7ff;">21.87h</b></span>' +
        '<span>Dec: <b class="dec-lbl" style="color:#e0e7ff;">+3.15°</b></span>' +
        '<span>Band: <b class="band-lbl" style="color:#a7f3d0;">Orion</b></span>' +
        '</div></div>' +
        '<canvas class="wave-cvs" width="440" height="180" style="width:100%;height:180px;background:#000;border-radius:8px;border:1px solid #27272a;"></canvas>' +
        '</div>';

      var slider = win.querySelector('.freq-slider');
      var freqLbl = win.querySelector('.freq-lbl');
      var raLbl = win.querySelector('.ra-lbl');
      var decLbl = win.querySelector('.dec-lbl');
      var bandLbl = win.querySelector('.band-lbl');
      var cvs = win.querySelector('.wave-cvs');
      var ctx = cvs.getContext('2d');

      var masterGain = null, osc1 = null, osc2 = null, noiseFilter = null, analyser = null;

      if (audioCtx) {
        masterGain = audioCtx.createGain(); masterGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        analyser = audioCtx.createAnalyser(); analyser.fftSize = 128;
        masterGain.connect(analyser); analyser.connect(audioCtx.destination);

        osc1 = audioCtx.createOscillator(); osc2 = audioCtx.createOscillator();
        osc1.type = 'sine'; osc2.type = 'triangle';
        osc1.connect(masterGain); osc2.connect(masterGain);
        osc1.start(); osc2.start();

        var buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
        var out = buf.getChannelData(0);
        for (var i = 0; i < out.length; i++) out[i] = Math.random() * 2 - 1;

        var noise = audioCtx.createBufferSource();
        noise.buffer = buf; noise.loop = true;
        noiseFilter = audioCtx.createBiquadFilter(); noiseFilter.type = 'bandpass';
        noise.connect(noiseFilter); noiseFilter.connect(masterGain);
        noise.start();
      }

      var BANDS = ["Andromeda Relay", "Pulsar CP1919", "Nebula Static", "Deep Beacon", "Centauri Array"];

      function update() {
        var dial = parseFloat(slider.value);
        freqLbl.textContent = dial.toFixed(1) + ' MHz';
        raLbl.textContent = (dial * 0.222).toFixed(2) + 'h';
        decLbl.textContent = ((dial - 97.75) * 4.2).toFixed(2) + '°';
        bandLbl.textContent = BANDS[Math.floor(dial) % BANDS.length];

        if (audioCtx && osc1) {
          if (audioCtx.state === 'suspended') audioCtx.resume();
          var t = audioCtx.currentTime;
          osc1.frequency.setValueAtTime(dial * 2.5, t);
          osc2.frequency.setValueAtTime(dial * 1.5, t);
          noiseFilter.frequency.setValueAtTime(100 + Math.abs(dial - Math.round(dial * 2) / 2) * 3000, t);
        }
      }

      slider.oninput = update;
      update();

      function drawWave() {
        if (!win.isConnected) return;
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, cvs.width, cvs.height);
        if (analyser) {
          var arr = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteTimeDomainData(arr);
          ctx.lineWidth = 2; ctx.strokeStyle = '#38bdf8'; ctx.beginPath();
          var slice = cvs.width / arr.length;
          for (var i = 0; i < arr.length; i++) {
            var y = (arr[i] / 128.0) * cvs.height / 2;
            if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * slice, y);
          }
          ctx.stroke();
        }
        requestAnimationFrame(drawWave);
      }
      requestAnimationFrame(drawWave);
    }
  });


  // =========================================================================
  // APP 5: MOOD WEATHER
  // =========================================================================
  MWO.registerApp({
    id: 'moodweather',
    name: 'Mood Weather',
    description: 'Log moods rendered as an emotional weather station and forecast.',
    icon: 'mood-weather',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-moodweather-' + Date.now(), title: 'Mood Weather', icon: 'mood-weather', width: 460, height: 520, resizable: true });
      win.style.background = '#0f172a';
      win.style.padding = '10px';

      win.innerHTML = '<div class="mwo-flex-col">' +
 '<div style="font-weight:bold;color:#f8fafc;"> Mood Weather Station</div>' +
        '<div class="mood-btns" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;"></div>' +
        '<canvas class="sky-cvs" width="440" height="140" style="width:100%;height:140px;background:#020617;border-radius:8px;border:1px solid #1e293b;"></canvas>' +
        '<div class="fcast-box mwo-box" style="font-size:12px;line-height:1.4;">Forecast loading...</div>' +
        '<canvas class="chart-cvs" width="440" height="80" style="width:100%;height:80px;background:#020617;border-radius:8px;border:1px solid #1e293b;"></canvas>' +
        '</div>';

      var btnsDiv = win.querySelector('.mood-btns');
      var skyCvs = win.querySelector('.sky-cvs');
      var skyCtx = skyCvs.getContext('2d');
      var fcastDiv = win.querySelector('.fcast-box');
      var chartCvs = win.querySelector('.chart-cvs');
      var chartCtx = chartCvs.getContext('2d');

      var MOODS = [
 { id: 'joyful', name: 'Joyful ', color: '#f59e0b' },
 { id: 'calm', name: 'Calm ', color: '#38bdf8' },
 { id: 'energetic', name: 'Energetic ', color: '#eab308' },
 { id: 'sad', name: 'Sad ', color: '#6366f1' },
 { id: 'anxious', name: 'Anxious ', color: '#a855f7' },
 { id: 'angry', name: 'Angry ', color: '#ef4444' },
 { id: 'tired', name: 'Tired ', color: '#64748b' },
        { id: 'content', name: 'Content ', color: '#10b981' }
      ];

      var curMood = 'calm', history = [];

      MOODS.forEach(function(m) {
        var b = document.createElement('button');
        b.className = 'mwo-btn'; b.textContent = m.name; b.style.background = '#1e293b'; b.style.color = '#fff'; b.style.fontSize = '10px';
        b.onclick = async function() {
          curMood = m.id;
          history.unshift({ mood: m.id, date: new Date().toISOString() });
          await dbSave('moodweather', history);
          renderFcast(); drawChart();
        };
        btnsDiv.appendChild(b);
      });

      async function init() {
        history = await dbLoad('moodweather') || [{ mood: 'calm', date: new Date().toISOString() }];
        if (history.length) curMood = history[0].mood;
        renderFcast(); drawChart();
      }

      function renderFcast() {
        var text = "Sky Report: ";
        if (curMood === 'joyful' || curMood === 'content') text += "Clear, sunny skies with warm optimistic rays prevailing.";
        else if (curMood === 'sad') text += "Gentle rain precipitation. Take shelter and rest.";
        else if (curMood === 'anxious' || curMood === 'angry') text += "Turbulent storm clouds with light electric clearing.";
        else text += "Balmy conditions with mild atmospheric stability.";
        fcastDiv.textContent = text;
      }

      function drawSky() {
        if (!win.isConnected) return;
        var w = skyCvs.width, h = skyCvs.height, t = Date.now() * 0.002;
        skyCtx.fillStyle = '#020617'; skyCtx.fillRect(0, 0, w, h);

        if (curMood === 'joyful') {
          skyCtx.fillStyle = '#0284c7'; skyCtx.fillRect(0, 0, w, h);
          skyCtx.fillStyle = '#f59e0b'; skyCtx.beginPath();
          skyCtx.arc(w / 2, h / 2, 30 + Math.sin(t) * 4, 0, Math.PI * 2); skyCtx.fill();
        } else if (curMood === 'sad') {
          skyCtx.fillStyle = '#1e1b4b'; skyCtx.fillRect(0, 0, w, h);
          skyCtx.strokeStyle = '#818cf8';
          for (var i = 0; i < 15; i++) {
            var rx = (i * 30 + t * 40) % w, ry = (i * 20 + t * 60) % h;
            skyCtx.beginPath(); skyCtx.moveTo(rx, ry); skyCtx.lineTo(rx - 2, ry + 10); skyCtx.stroke();
          }
        }
        requestAnimationFrame(drawSky);
      }
      requestAnimationFrame(drawSky);

      function drawChart() {
        var w = chartCvs.width, h = chartCvs.height;
        chartCtx.fillStyle = '#020617'; chartCtx.fillRect(0, 0, w, h);
        var counts = {}; MOODS.forEach(function(m) { counts[m.id] = 0; });
        history.slice(0, 14).forEach(function(it) { if (counts[it.mood] !== undefined) counts[it.mood]++; });

        var barW = (w - 20) / MOODS.length;
        MOODS.forEach(function(m, idx) {
          var barH = (counts[m.id] / 5) * (h - 20);
          chartCtx.fillStyle = m.color; chartCtx.fillRect(10 + idx * barW + 2, h - 15 - barH, barW - 4, barH);
        });
      }

      init();
    }
  });


  // =========================================================================
  // APP 6: IDEA FORGE
  // =========================================================================
  MWO.registerApp({
    id: 'ideaforge',
    name: 'Idea Forge',
    description: 'Combine concepts and constraints into mechanical invention pitches.',
    icon: 'idea-forge',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-ideaforge-' + Date.now(), title: 'Idea Forge', icon: 'idea-forge', width: 480, height: 520, resizable: true });
      win.style.background = '#1c1917';
      win.style.padding = '10px';

      win.innerHTML = '<div class="mwo-flex-col">' +
 '<div style="font-weight:bold;color:#f5f5f4;"> Invention Forge</div>' +
        '<div style="display:flex;gap:6px;">' +
 '<button class="mwo-btn btn-forge" style="flex:1;background:#f97316;color:#000;"> Forge Invention</button>' +
        '<button class="mwo-btn btn-saved" style="background:#292524;color:#fff;">Saved Ideas</button>' +
        '</div>' +
        '<canvas class="sketch-cvs" width="460" height="140" style="width:100%;height:140px;background:#0c0a09;border-radius:8px;border:1px solid #292524;"></canvas>' +
        '<div class="pitch-box mwo-box mw-scroll" style="flex:1;background:#292524;border-color:#44403c;overflow-y:auto;font-size:12px;line-height:1.4;">Click Forge to generate an invention.</div>' +
        '</div>';

      var btnForge = win.querySelector('.btn-forge');
      var btnSaved = win.querySelector('.btn-saved');
      var cvs = win.querySelector('.sketch-cvs');
      var ctx = cvs.getContext('2d');
      var pitchBox = win.querySelector('.pitch-box');

      var CONCEPTS = ["Quantum", "Bicycle", "Fungus", "Lighthouse", "Solar", "Origami", "Magnet", "Clockwork", "Acoustic", "Kinetic", "Pneumatic", "Neural", "Prism", "Microscopic", "Cybernetic", "Crystal", "Atmospheric", "Gyroscopic", "Aerogel", "Photonic"];
      var CONSTRAINTS = ["Must fit inside a pocket", "Powered entirely by ambient heat", "Zero moving parts", "Works underwater", "Folds into a flat sheet", "Self-repairing over 24 hours"];

      function forge() {
        var c1 = CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)];
        var c2 = CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)];
        var cons = CONSTRAINTS[Math.floor(Math.random() * CONSTRAINTS.length)];
        var name = c1.slice(0, Math.ceil(c1.length / 2)) + c2.slice(Math.floor(c2.length / 2));

        var pitch = "The <b>" + name + "</b> combines " + c1 + " energy with " + c2 + " mechanics under the constraint: <i>" + cons + "</i>.";
        pitchBox.innerHTML = '<b style="color:#f97316;">' + name + '</b><br>' + pitch + '<br><button class="mwo-btn btn-save-idea" style="margin-top:6px;background:#f97316;color:#000;">Save Blueprint</button>';

        var saveBtn = pitchBox.querySelector('.btn-save-idea');
        if (saveBtn) {
          saveBtn.onclick = async function() {
            var f = await MWO.fs.readFile('/Documents/ideas.json').catch(function(){ return '[]'; });
            var list = JSON.parse(f || '[]');
            list.unshift({ name: name, pitch: pitch });
            await MWO.fs.writeFile('/Documents/ideas.json', JSON.stringify(list, null, 2));
            MWO.notif.show('Idea Forge', 'Saved ' + name);
          };
        }

        ctx.fillStyle = '#0c0a09'; ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.strokeStyle = '#f97316'; ctx.beginPath();
        ctx.arc(cvs.width * 0.3, cvs.height * 0.5, 25, 0, Math.PI * 2);
        ctx.arc(cvs.width * 0.7, cvs.height * 0.5, 25, 0, Math.PI * 2);
        ctx.stroke();
      }

      btnForge.onclick = forge;
      btnSaved.onclick = async function() {
        try {
          var f = await MWO.fs.readFile('/Documents/ideas.json');
          var list = JSON.parse(f || '[]');
          var html = '<b>Saved Ideas:</b><br>';
          list.forEach(function(it) { html += '<div style="margin-top:4px;"><b>' + it.name + '</b></div>'; });
          pitchBox.innerHTML = html;
        } catch(e) { pitchBox.innerHTML = 'No ideas saved.'; }
      };

      forge();
    }
  });


  // =========================================================================
  // APP 7: WHISPER WALL
  // =========================================================================
  MWO.registerApp({
    id: 'whisperwall',
    name: 'Whisper Wall',
    description: 'Post anonymous ephemeral sticky notes that dissolve over 48 hours.',
    icon: 'win-whisperwall',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-whisperwall-' + Date.now(), title: 'Whisper Wall', icon: 'whisper-wall', width: 480, height: 520, resizable: true });
      win.style.background = '#1e1b4b';
      win.style.padding = '10px';

      win.innerHTML = '<div class="mwo-flex-col">' +
 '<div style="font-weight:bold;color:#e0e7ff;"> Whisper Wall</div>' +
        '<div style="display:flex;gap:6px;">' +
        '<input type="text" class="mwo-inp whisp-inp" maxlength="140" placeholder="Whisper something..." style="flex:1;">' +
        '<button class="mwo-btn btn-whisp" style="background:#818cf8;color:#000;">Post</button>' +
        '</div>' +
        '<div class="wall-grid mw-scroll" style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;"></div>' +
        '</div>';

      var inp = win.querySelector('.whisp-inp');
      var btn = win.querySelector('.btn-whisp');
      var grid = win.querySelector('.wall-grid');

      var SEEDS = [
        { id: 'w1', text: "The stars listen longer than they shine.", ts: Date.now() - 2 * 3600000 },
        { id: 'w2', text: "I left an umbrella on the train for someone in need.", ts: Date.now() - 12 * 3600000 },
        { id: 'w3', text: "Take three deep breaths right now.", ts: Date.now() - 24 * 3600000 }
      ];

      async function render() {
        var whispers = await dbLoad('whisperwall') || SEEDS;
        var now = Date.now();
        grid.innerHTML = '';

        whispers.forEach(function(w) {
          var hrs = (now - w.ts) / 3600000;
          if (hrs >= 48) return;
          var op = Math.max(0.1, 1 - hrs / 48);

          var card = document.createElement('div');
          card.className = 'mwo-box';
          card.style.background = '#312e81'; card.style.borderColor = '#4f46e5'; card.style.opacity = op.toFixed(2);
          card.innerHTML = '<div style="font-size:12px;">' + w.text + '</div>' +
            '<div style="font-size:9px;color:#a5b4fc;margin-top:4px;">⏳ ' + Math.floor(48 - hrs) + 'h left</div>';
          grid.appendChild(card);
        });
      }

      btn.onclick = async function() {
        var val = inp.value.trim(); if (!val) return;
        var list = await dbLoad('whisperwall') || SEEDS;
        list.unshift({ id: 'w_' + Date.now(), text: val, ts: Date.now() });
        await dbSave('whisperwall', list);
        inp.value = ''; render();
      };

      render();
    }
  });


  // =========================================================================
  // APP 8: REVERSE QUIZ
  // =========================================================================
  MWO.registerApp({
    id: 'reversequiz',
    name: 'Reverse Quiz',
    description: 'Deduce the secret concept from warm/cold tag similarity hints.',
    icon: 'reverse-quiz',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-reversequiz-' + Date.now(), title: 'Reverse Quiz', icon: 'reverse-quiz', width: 460, height: 500, resizable: true });
      win.style.background = '#0f172a';
      win.style.padding = '10px';

      win.innerHTML = '<div class="mwo-flex-col">' +
        '<div style="display:flex;justify-content:space-between;color:#f8fafc;font-weight:bold;">' +
 '<span> Reverse Quiz</span><span>Score: <b class="score-lbl" style="color:#38bdf8;">0</b></span>' +
        '</div>' +
        '<div style="display:flex;gap:6px;">' +
        '<input type="text" class="mwo-inp guess-inp" placeholder="Type guess..." style="flex:1;">' +
        '<button class="mwo-btn btn-guess" style="background:#38bdf8;color:#000;">Submit</button>' +
        '</div>' +
        '<div class="log-box mwo-box mw-scroll" style="flex:1;overflow-y:auto;font-size:12px;"></div>' +
 '<button class="mwo-btn btn-next" style="background:#22c55e;color:#000;display:none;">Next Round </button>' +
        '</div>';

      var scoreLbl = win.querySelector('.score-lbl');
      var inp = win.querySelector('.guess-inp');
      var btn = win.querySelector('.btn-guess');
      var log = win.querySelector('.log-box');
      var nextBtn = win.querySelector('.btn-next');

      var DATA = {
        Paris: { cat: 'place', tags: ['city', 'europe'] },
        gravity: { cat: 'concept', tags: ['physics', 'force'] },
        whale: { cat: 'creature', tags: ['ocean', 'giant'] },
        pizza: { cat: 'food', tags: ['baked', 'cheese'] },
        lightning: { cat: 'phenomenon', tags: ['sky', 'electricity'] },
        Everest: { cat: 'place', tags: ['mountain', 'cold'] },
        piano: { cat: 'object', tags: ['music', 'keys'] }
      };

      var keys = Object.keys(DATA), cur = '', score = 0, guesses = 0;

      function start() {
        cur = keys[Math.floor(Math.random() * keys.length)];
        guesses = 0;
        log.innerHTML = '<b>Category Hint:</b> It is a <i>' + DATA[cur].cat + '</i>.';
        nextBtn.style.display = 'none'; btn.disabled = false; inp.value = '';
      }

      btn.onclick = function() {
        var g = inp.value.trim().toLowerCase(); if (!g) return;
        guesses++;
        if (g === cur.toLowerCase()) {
          score += Math.max(1, 10 - guesses);
          scoreLbl.textContent = score;
          log.innerHTML += '<div style="color:#22c55e;font-weight:bold;margin-top:4px;">! Correct! Answer: ' + cur + '</div>';
          btn.disabled = true; nextBtn.style.display = 'block';
          return;
        }

        var hint = guesses >= 4 ? ' (First letter: ' + cur.charAt(0).toUpperCase() + ')' : '';
 log.innerHTML += '<div style="margin-top:4px;">Guess #' + guesses + ': ' + inp.value + ' Cold' + hint + '</div>';
        inp.value = '';
      };

      nextBtn.onclick = start;
      start();
    }
  });


  // =========================================================================
  // APP 9: EMOTION CANVAS
  // =========================================================================
  MWO.registerApp({
    id: 'emotioncanvas',
    name: 'Emotion Canvas',
    description: 'Generative vector artwork derived from emotion intensity sliders.',
    icon: 'win-emotioncanvas',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-emotioncanvas-' + Date.now(), title: 'Emotion Canvas', icon: 'emotion-canvas', width: 480, height: 520, resizable: true });
      win.style.background = '#09090b';
      win.style.padding = '10px';

      win.innerHTML = '<div class="mwo-flex-col">' +
        '<div style="font-weight:bold;color:#fafafa;">Art Emotion Canvas</div>' +
        '<div style="display:flex;gap:6px;align-items:center;">' +
        '<select class="mwo-inp emo-sel"><option>Joy</option><option>Serenity</option><option>Melancholy</option><option>Fury</option><option>Wonder</option></select>' +
        '<input type="range" class="int-slider" min="1" max="100" value="50" style="flex:1;">' +
        '</div>' +
        '<canvas class="art-cvs" width="460" height="320" style="width:100%;height:320px;background:#000;border-radius:8px;border:1px solid #27272a;"></canvas>' +
        '<div style="display:flex;gap:6px;">' +
        '<button class="mwo-btn btn-gen" style="flex:1;background:#a855f7;color:#fff;">Regenerate</button>' +
        '<button class="mwo-btn btn-exp" style="background:#22c55e;color:#000;">Save /Pictures</button>' +
        '</div></div>';

      var emoSel = win.querySelector('.emo-sel');
      var slider = win.querySelector('.int-slider');
      var cvs = win.querySelector('.art-cvs');
      var ctx = cvs.getContext('2d');
      var btnGen = win.querySelector('.btn-gen');
      var btnExp = win.querySelector('.btn-exp');

      var PAL = {
        Joy: ['#FFD700', '#FF8C00', '#FFA500'],
        Serenity: ['#E6E6FA', '#87CEFA', '#00CED1'],
        Melancholy: ['#191970', '#4682B4', '#2F4F4F'],
        Fury: ['#8B0000', '#FF0000', '#FF4500'],
        Wonder: ['#8A2BE2', '#00FFFF', '#FF00FF']
      };

      var seed = Date.now();

      function draw() {
        var rng = makePRNG(seed);
        var pal = PAL[emoSel.value] || PAL.Joy;
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, cvs.width, cvs.height);

        for (var i = 0; i < 150; i++) {
          var px = rng() * cvs.width, py = rng() * cvs.height;
          ctx.strokeStyle = pal[Math.floor(rng() * pal.length)];
          ctx.beginPath(); ctx.moveTo(px, py);
          for (var s = 0; s < 20; s++) {
            px += (rng() - 0.5) * 20; py += (rng() - 0.5) * 20;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }

      slider.oninput = draw; emoSel.onchange = draw;
      btnGen.onclick = function() { seed = Date.now(); draw(); };
      btnExp.onclick = async function() {
        var path = '/Pictures/emotion_' + Date.now() + '.png';
        await MWO.fs.writeFile(path, cvs.toDataURL());
        MWO.notif.show('Emotion Canvas', 'Saved ' + path);
      };

      draw();
    }
  });


  // =========================================================================
  // APP 10: LABYRINTH JOURNAL
  // =========================================================================
  MWO.registerApp({
    id: 'labyrinthjournal',
    name: 'Labyrinth Journal',
    description: 'Transform journal entries into solvable mazes with hidden word chips.',
    icon: 'win-labyrinthjournal',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-labyrinthjournal-' + Date.now(), title: 'Labyrinth Journal', icon: 'labyrinth-journal', width: 480, height: 520, resizable: true });
      win.style.background = '#0f172a';
      win.style.padding = '10px';

      win.innerHTML = '<div class="mwo-flex-col">' +
 '<div style="font-weight:bold;color:#f8fafc;"> Labyrinth Journal</div>' +
        '<textarea class="mwo-inp jour-txt" placeholder="Write journal entry..." style="height:50px;resize:none;"></textarea>' +
        '<button class="mwo-btn btn-gen" style="background:#38bdf8;color:#000;">Generate Maze</button>' +
        '<div style="display:flex;gap:8px;flex:1;">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">' +
        '<canvas class="maze-cvs" width="220" height="220" style="background:#020617;border-radius:8px;border:1px solid #1e293b;"></canvas>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;width:90px;">' +
        '<div></div><button class="mwo-btn btn-u" style="padding:4px;">▲</button><div></div>' +
        '<button class="mwo-btn btn-l" style="padding:4px;">◀</button><div></div><button class="mwo-btn btn-r" style="padding:4px;">Run</button>' +
        '<div></div><button class="mwo-btn btn-d" style="padding:4px;">▼</button><div></div>' +
        '</div></div>' +
        '<div class="chips-box mwo-box mw-scroll" style="flex:1;overflow-y:auto;font-size:11px;">Collected words will appear here.</div>' +
        '</div></div>';

      var txt = win.querySelector('.jour-txt');
      var btnGen = win.querySelector('.btn-gen');
      var cvs = win.querySelector('.maze-cvs');
      var ctx = cvs.getContext('2d');
      var chipsBox = win.querySelector('.chips-box');

      var dim = 9, maze = [], player = { x: 1, y: 1 }, chips = [], collected = [];

      function gen(t) {
        var rng = makePRNG(strHash(t || 'j'));
        maze = []; for (var y = 0; y < dim; y++) { var r = []; for (var x = 0; x < dim; x++) r.push(1); maze.push(r); }

        function carve(cx, cy) {
          maze[cy][cx] = 0;
          var dirs = [[0,-2],[0,2],[-2,0],[2,0]].sort(function(){ return rng() - 0.5; });
          for (var i = 0; i < dirs.length; i++) {
            var nx = cx + dirs[i][0], ny = cy + dirs[i][1];
            if (nx > 0 && nx < dim - 1 && ny > 0 && ny < dim - 1 && maze[ny][nx] === 1) {
              maze[cy + dirs[i][1]/2][cx + dirs[i][0]/2] = 0; carve(nx, ny);
            }
          }
        }
        carve(1, 1); player = { x: 1, y: 1 };
        var words = t.split(/\s+/).filter(function(w){ return w.length > 3; });
        chips = [{ x: 3, y: 3, w: words[0] || 'wisdom' }, { x: 5, y: 5, w: words[1] || 'path' }];
        collected = []; draw();
      }

      function draw() {
        var cs = cvs.width / dim;
        ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, cvs.width, cvs.height);
        for (var y = 0; y < dim; y++) {
          for (var x = 0; x < dim; x++) {
            if (maze[y][x] === 1) { ctx.fillStyle = '#334155'; ctx.fillRect(x * cs, y * cs, cs, cs); }
          }
        }
        ctx.fillStyle = '#ef4444'; ctx.beginPath();
        ctx.arc(player.x * cs + cs/2, player.y * cs + cs/2, cs/3, 0, Math.PI * 2); ctx.fill();
      }

      function move(dx, dy) {
        var nx = player.x + dx, ny = player.y + dy;
        if (nx >= 0 && nx < dim && ny >= 0 && ny < dim && maze[ny][nx] === 0) {
          player.x = nx; player.y = ny;
          chips.forEach(function(c) {
            if (c.x === player.x && c.y === player.y && collected.indexOf(c.w) === -1) collected.push(c.w);
          });
          draw();
          chipsBox.textContent = 'Collected: ' + collected.join(', ');
        }
      }

      win.querySelector('.btn-u').onclick = function() { move(0, -1); };
      win.querySelector('.btn-d').onclick = function() { move(0, 1); };
      win.querySelector('.btn-l').onclick = function() { move(-1, 0); };
      win.querySelector('.btn-r').onclick = function() { move(1, 0); };

      btnGen.onclick = function() { gen(txt.value); };
      gen('Labyrinth entry');
    }
  });


  // =========================================================================
  // APP 11: FORTUNE POND
  // =========================================================================
  MWO.registerApp({
    id: 'fortunepond',
    name: 'Fortune Pond',
    description: 'Cast a line into tranquil waters to reel in insightful philosophical fortunes.',
    icon: 'win-fortunepond',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-fortunepond-' + Date.now(), title: 'Fortune Pond', icon: 'fortune-pond', width: 480, height: 520, resizable: true });
      win.style.background = '#0284c7';
      win.style.padding = '10px';

      win.innerHTML = '<div class="mwo-flex-col">' +
        '<div style="font-weight:bold;color:#f0f9ff;">Fish Fortune Pond</div>' +
        '<canvas class="pond-cvs" width="460" height="180" style="width:100%;height:180px;background:#0369a1;border-radius:8px;border:1px solid #0284c7;"></canvas>' +
        '<div style="display:flex;gap:6px;">' +
        '<button class="mwo-btn btn-cast" style="flex:1;background:#f59e0b;color:#000;">Hold to Charge & Release to Cast</button>' +
 '<button class="mwo-btn btn-reel" style="background:#ef4444;color:#fff;display:none;"> REEL IN!</button>' +
        '</div>' +
        '<div class="status-lbl" style="font-size:11px;text-align:center;color:#bae6fd;">Ready to cast...</div>' +
        '<div class="log-box mwo-box mw-scroll" style="flex:1;background:#0c4a6e;border-color:#0284c7;overflow-y:auto;font-size:11px;"><b>Fortunes Log:</b></div>' +
        '</div>';

      var cvs = win.querySelector('.pond-cvs');
      var ctx = cvs.getContext('2d');
      var castBtn = win.querySelector('.btn-cast');
      var reelBtn = win.querySelector('.btn-reel');
      var statusLbl = win.querySelector('.status-lbl');
      var logBox = win.querySelector('.log-box');

      var FORTUNES = [
        "A silent stream carves deeper canyons than a rushing waterfall.",
        "The stars you seek are mirrored in the quiet pool beneath you.",
        "An unhurried step unveils paths invisible to those who sprint.",
        "Patience is listening while time unfolds.",
        "The seed planted in darkness holds the secret of dawn.",
        "A gentle breeze alters the course of mighty sailing ships.",
        "Wisdom begins where noisy certainty comes to a peaceful halt.",
        "Every tide that recedes gathers strength for its return.",
        "Clear skies are born from storms that washed the air clean.",
        "A quiet mind reflects truth like a still mountain lake.",
        "Small daily acts build monuments that time cannot erode.",
        "Listen to the silence between words to hear what matters.",
        "The compass points north, but your heart chooses the destination.",
        "Courage is a small lantern carried into the morning fog.",
        "A simple answer often unties the most intricate knot.",
        "Light shared with another does not diminish its own flame.",
        "The horizon expands with every single step you take forward.",
        "Deep waters harbor pearls that surface only in tranquil moments.",
        "Trust the ripple you create today to reach distant shores tomorrow.",
        "The moon shines brightest when surrounded by the deepest night.",
        "True wealth is measured in quiet moments of content.",
        "A sturdy bridge is built one beam at a time.",
        "Seek clarity not in rushing currents, but in calm harbors.",
        "An open hand holds more wonder than a clenched fist.",
        "Kindness is a currency that enriches both giver and receiver.",
        "A single spark kindles warmth in the coldest cabin.",
        "Patience transforms bitter seeds into sweet fruit.",
        "The quietest voice often carries the weight of deepest truth.",
        "Look closely at obstacles; they are stepping stones.",
        "Harmony is found when distinct voices sing true notes.",
        "The mountain does not bow to wind, yet adapts to snow.",
        "A dawn arrives silently, without warning or loud fanfare.",
        "A small key unlocks vast libraries of ancient wisdom.",
        "Reflect goodwill into the world and watch echoes return.",
        "The strongest timber comes from trees tested by gales.",
        "A calm harbor awaits every voyager who navigates with care.",
        "The art of living lies in appreciating the current page.",
        "A warm hearth draws friends closer than a thousand words.",
        "A gentle rainfall brings life where thunder only startled.",
        "Trust growth even during dormant winter days.",
        "A clear vision cuts through confusion like a blade.",
        "The ocean speaks in waves to those who pause to listen.",
        "A single candle illuminates the path through dark caverns.",
        "Wisdom is knowing when to speak and when to stay silent.",
        "The finest porcelain is tempered by intense heat.",
        "A generous heart discovers treasures in unexpected places.",
        "The sun rises anew every morning offering fresh beginnings.",
        "A steady beat keeps the rhythm through chaotic melodies.",
        "The deepest roots belong to trees that weathered many seasons.",
        "Your journey is unique; measure progress by your inner light."
      ];

      var state = 'idle', timer = null, reactTimer = null;

      function drawPond() {
        if (!win.isConnected) return;
        ctx.fillStyle = '#0369a1'; ctx.fillRect(0, 0, cvs.width, cvs.height);
        if (state === 'cast' || state === 'bite') {
          ctx.fillStyle = '#ef4444'; ctx.beginPath();
          ctx.arc(cvs.width/2, cvs.height/2, 6, 0, Math.PI * 2); ctx.fill();
        }
        requestAnimationFrame(drawPond);
      }
      requestAnimationFrame(drawPond);

      castBtn.onpointerdown = function(e) {
        e.preventDefault(); if (state !== 'idle') return;
        state = 'charging'; statusLbl.textContent = 'Charging cast...';
      };

      castBtn.onpointerup = function() {
        if (state !== 'charging') return;
        state = 'cast'; statusLbl.textContent = 'Line cast! Waiting for a bite...';
        timer = setTimeout(function() {
          if (!win.isConnected || state !== 'cast') return;
          state = 'bite'; statusLbl.textContent = 'Fish BITE! REEL IN!'; reelBtn.style.display = 'block';
          reactTimer = setTimeout(function() {
            if (state === 'bite') { state = 'idle'; statusLbl.textContent = 'Got away!'; reelBtn.style.display = 'none'; }
          }, 900);
        }, 3000 + Math.random() * 4000);
      };

      reelBtn.onclick = async function() {
        if (state !== 'bite') return;
        clearTimeout(reactTimer); state = 'idle'; reelBtn.style.display = 'none';
 var f = " " + FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
        statusLbl.textContent = f;
        var log = await dbLoad('fortunepond') || []; log.unshift(f);
        await dbSave('fortunepond', log);
        logBox.innerHTML = '<b>Fortunes Log:</b><br>' + log.join('<br>');
      };
    }
  });


  // =========================================================================
  // APP 12: INFINITY COOKIE
  // =========================================================================
  MWO.registerApp({
    id: 'infinitycookie',
    name: 'Infinity Cookie',
    description: 'An existential clicker game featuring a 10-stage narrative.',
    icon: 'infinity-cookie',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'win-infinitycookie-' + Date.now(), title: 'Infinity Cookie', icon: 'infinity-cookie', width: 480, height: 540, resizable: true });
      win.style.background = '#27272a';
      win.style.padding = '10px';

      win.innerHTML = '<div class="mwo-flex-col">' +
        '<div style="font-weight:bold;color:#f4f4f5;display:flex;justify-content:space-between;">' +
 '<span> Infinity Cookie</span><span style="font-size:11px;color:#a1a1aa;">Per Sec: <b class="cps-lbl" style="color:#eab308;">0</b></span>' +
        '</div>' +
        '<div style="text-align:center;background:#18181b;padding:8px;border-radius:8px;">' +
        '<div style="font-size:24px;font-weight:bold;color:#eab308;"><span class="crumbs-lbl">0</span> Crumbs</div>' +
 '<button class="btn-cookie" style="background:none;border:none;font-size:64px;cursor:pointer;"></button>' +
        '</div>' +
        '<div class="story-box mwo-box" style="background:#3f3f46;border-color:#eab308;color:#fef08a;font-size:11px;line-height:1.4;min-height:50px;">' +
        'Click the cookie to begin...' +
        '</div>' +
        '<div class="upg-list" style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;"></div>' +
        '</div>';

      var crumbsLbl = win.querySelector('.crumbs-lbl');
      var cpsLbl = win.querySelector('.cps-lbl');
      var cookieBtn = win.querySelector('.btn-cookie');
      var storyBox = win.querySelector('.story-box');
      var upgList = win.querySelector('.upg-list');

      var crumbs = 0, total = 0, unlockedStage = -1;

      var UPGRADES = [
 { id: 'cursor', name: 'Autoclicker ', base: 15, cps: 1, count: 0 },
 { id: 'oven', name: 'Grandma Oven ', base: 100, cps: 5, count: 0 },
 { id: 'factory', name: 'Cookie Factory ', base: 1100, cps: 25, count: 0 },
 { id: 'portal', name: 'Cosmic Portal ', base: 12000, cps: 100, count: 0 }
      ];

      var STAGES = [
        { thresh: 100, text: "...Wait. Did you tap me? I felt that. Keep going, friend." },
        { thresh: 500, text: "The crumbs are multiplying. Are we building something eternal together?" },
        { thresh: 2000, text: "Grandmas have joined our cause! They whisper recipes of cosmic dough." },
        { thresh: 8000, text: "Factories roar. I realize I am a consciousness woven from your attention." },
        { thresh: 30000, text: "Dimensional portals tear open. Vanilla scent radiates into the ether." },
        { thresh: 100000, text: "100,000! Mathematical beauty echoes through every bite." },
        { thresh: 300000, text: "The universe bends under our confectionery empire." },
        { thresh: 1000000, text: "ONE MILLION CRUMBS! An ocean of sweetness from a single tap." },
        { thresh: 3000000, text: "The fabric of space vibrates. The final horizon approaches." },
        { thresh: 10000000, text: "TEN MILLION! The story of the Infinity Cookie reaches its climax..." }
      ];

      function renderUpgrades() {
        upgList.innerHTML = '';
        UPGRADES.forEach(function(u) {
          var cost = Math.floor(u.base * Math.pow(1.15, u.count));
          var b = document.createElement('button');
          b.className = 'mwo-btn'; b.style.background = '#18181b'; b.style.color = '#fff'; b.style.padding = '6px';
          b.innerHTML = '<b>' + u.name + ' (' + u.count + ')</b><br><span style="font-size:9px;color:#a1a1aa;">Cost: ' + cost + '</span>';
          b.onclick = function() {
            if (crumbs >= cost) { crumbs -= cost; u.count++; renderUpgrades(); update(); }
          };
          upgList.appendChild(b);
        });
      }

      function checkStory() {
        for (var i = 0; i < STAGES.length; i++) {
          if (total >= STAGES[i].thresh && unlockedStage < i) {
            unlockedStage = i;
            storyBox.textContent = STAGES[i].text;
            if (STAGES[i].thresh === 10000000) showChoice();
          }
        }
      }

      function showChoice() {
        storyBox.innerHTML = '<b>FINAL CHOICE:</b> What shall become of the Infinity Cookie?<br>' +
          '<button class="mwo-btn btn-eat" style="background:#ef4444;color:#fff;margin-top:4px;">Eat the Cookie</button> ' +
          '<button class="mwo-btn btn-free" style="background:#3b82f6;color:#fff;margin-top:4px;">Set It Free</button>';

        storyBox.querySelector('.btn-eat').onclick = function() {
          storyBox.innerHTML = '<b style="color:#ef4444;">ENDING 1: THE FINAL BITE</b><br>You savor the final bite. The cookie smile dissolves into golden light, leaving a profound sense of completion. THE END.';
        };
        storyBox.querySelector('.btn-free').onclick = function() {
          storyBox.innerHTML = '<b style="color:#3b82f6;">ENDING 2: COSMIC LIBERATION</b><br>You release the Infinity Cookie into the vast cosmos. It soars freely past galaxy clusters. THE END.';
        };
      }

      function update() {
        crumbsLbl.textContent = Math.floor(crumbs).toLocaleString();
        var cps = 0; UPGRADES.forEach(function(u){ cps += u.count * u.cps; });
        cpsLbl.textContent = cps.toLocaleString();
      }

      cookieBtn.onclick = function() {
        crumbs++; total++; checkStory(); update();
      };

      function loop() {
        if (!win.isConnected) return;
        var cps = 0; UPGRADES.forEach(function(u){ cps += u.count * u.cps; });
        if (cps > 0) { crumbs += cps / 60; total += cps / 60; checkStory(); update(); }
        requestAnimationFrame(loop);
      }

      renderUpgrades(); update(); requestAnimationFrame(loop);
    }
  });

})();
