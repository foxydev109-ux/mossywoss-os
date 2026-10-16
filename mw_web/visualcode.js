/* ========================================================================
 * MossyWoss OS — Visual Code Studio (Blocks & Blueprint Node Studio)
 * File: mw_web/visualcode.js
 * Scratch-style Block Coding + Blueprint Node Programming Engine.
 * ======================================================================== */

var MWO = MWO || {};

MWO.VisualCode = (function() {
  'use strict';

  // CSS Styles Injection
  function injectStyles() {
    if (document.getElementById('mwo-visualcode-styles')) return;
    const style = document.createElement('style');
    style.id = 'mwo-visualcode-styles';
    style.textContent = `
      .vc-tab {
        padding: 6px 14px;
        background: #1a1a36;
        color: #aaa;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85em;
        font-weight: 600;
        transition: all 0.2s ease;
      }
      .vc-tab.active {
        background: #00b894;
        color: #fff;
        border-color: #00b894;
        box-shadow: 0 2px 8px rgba(0,184,148,0.4);
      }
      .vc-block {
        padding: 8px 12px;
        border-radius: 6px;
        color: #fff;
        font-size: 0.82em;
        font-weight: 600;
        user-select: none;
        cursor: grab;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.2);
        touch-action: none;
      }
      .vc-block:active {
        cursor: grabbing;
      }
      .vc-block-events { background: #e67e22; }
      .vc-block-motion { background: #3498db; }
      .vc-block-looks { background: #9b59b6; }
      .vc-block-sound { background: #e84393; }
      .vc-block-control { background: #d35400; }
      .vc-block-sensing { background: #00cec9; color: #111; }
      .vc-block-operators { background: #2ecc71; }
      .vc-block-variables { background: #e74c3c; }

      .vc-input {
        background: rgba(0,0,0,0.25);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 0.9em;
        width: 50px;
        text-align: center;
      }
      .vc-node {
        position: absolute;
        width: 170px;
        background: #1f1f3d;
        border: 1px solid #3498db;
        border-radius: 8px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        color: #fff;
        font-size: 0.8em;
        z-index: 10;
        touch-action: none;
      }
      .vc-node-header {
        background: #2980b9;
        padding: 6px 10px;
        border-top-left-radius: 7px;
        border-top-right-radius: 7px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .vc-node-body {
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .vc-pin {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #00b894;
        border: 2px solid #fff;
        cursor: pointer;
        display: inline-block;
      }
      .vc-pin-in { margin-right: 4px; }
      .vc-pin-out { margin-left: 4px; }
    `;
    document.head.appendChild(style);
  }

  // Real sound effects, synthesized live with WebAudio
  function playSfxKind(kind) {
    var dur = 200;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        var ac = new AC();
        var t = ac.currentTime;
        var mk = function(type, f0, f1, at, len, vol) {
          var o = ac.createOscillator(); var g = ac.createGain();
          o.type = type;
          o.frequency.setValueAtTime(f0, t + at);
          if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + at + len);
          g.gain.setValueAtTime(vol || 0.18, t + at);
          g.gain.exponentialRampToValueAtTime(0.001, t + at + len);
          o.connect(g); g.connect(ac.destination);
          o.start(t + at); o.stop(t + at + len + 0.02);
        };
        if (kind === 'coin') { mk('square', 900, null, 0, 0.07); mk('square', 1350, null, 0.08, 0.16); dur = 300; }
        else if (kind === 'boing') { mk('sine', 320, 70, 0, 0.35, 0.25); dur = 420; }
        else if (kind === 'zap') { mk('sawtooth', 1400, 90, 0, 0.18, 0.2); dur = 240; }
        else if (kind === 'blip') { mk('square', 620, null, 0, 0.08); dur = 140; }
        else if (kind === 'boom') {
          var blen = 0.45;
          var buf = ac.createBuffer(1, Math.floor(ac.sampleRate * blen), ac.sampleRate);
          var d = buf.getChannelData(0);
          for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
          var src = ac.createBufferSource(); src.buffer = buf;
          var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
          var gg = ac.createGain(); gg.gain.value = 0.5;
          src.connect(lp); lp.connect(gg); gg.connect(ac.destination); src.start(t);
          dur = 520;
        }
        setTimeout(function() { try { ac.close(); } catch (e) {} }, dur + 300);
      }
    } catch (e) {}
    return dur;
  }

  // Visual effects (flash / shake / particle burst)
  var VFX_COLORS = { gold: '#ffd54a', red: '#ff5252', blue: '#4e9eff', green: '#2ecc71', pink: '#ff7ab8', white: '#ffffff' };
  function vfxFlash(color) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:' + color + ';opacity:0.55;z-index:99998;pointer-events:none;transition:opacity 0.25s';
    document.body.appendChild(d);
    requestAnimationFrame(function() { d.style.opacity = '0'; });
    setTimeout(function() { d.remove(); }, 340);
  }
  function vfxShake() {
    var seq = [[7, -4], [-6, 4], [4, -2], [-2, 1], [0, 0]];
    seq.forEach(function(tr, i) {
      setTimeout(function() { document.body.style.transform = 'translate(' + tr[0] + 'px,' + tr[1] + 'px)'; }, i * 70);
    });
    setTimeout(function() { document.body.style.transform = ''; }, seq.length * 70 + 120);
  }
  function vfxBurst(color) {
    for (var i = 0; i < 26; i++) {
      var p = document.createElement('div');
      p.style.cssText = 'position:fixed;width:8px;height:8px;border-radius:50%;background:' + color + ';z-index:99999;pointer-events:none;left:' + (45 + Math.random() * 10) + 'vw;top:40vh';
      document.body.appendChild(p);
      (function(p) {
        var ang = Math.random() * 6.283, dist = 70 + Math.random() * 110;
        var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist + 50;
        setTimeout(function() {
          p.style.transition = 'all 0.7s ease-out';
          requestAnimationFrame(function() {
            p.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
            p.style.opacity = '0';
          });
          setTimeout(function() { p.remove(); }, 760);
        }, 12);
      })(p);
    }
  }

  function playWebAudioTone(freq, durationMs) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq || 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (durationMs / 1000));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (durationMs / 1000));
    } catch (e) {}
  }

  function launch() {
    injectStyles();

    const win = MWO.wm.create({
      id: 'visualcode-' + Date.now(),
      title: 'Visual Code Studio',
      icon: 'visual-code-studio',
      width: 880,
      height: 600,
      resizable: true
    });

    const body = (win && win.body) ? win.body : (win && win.element ? win.element.querySelector('.w-body') : win);
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.background = '#0e0e1e';
    body.style.color = '#e0e0e0';
    body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    body.style.overflow = 'hidden';

    // Application State
    let currentMode = 'blocks'; // 'blocks', 'blueprint', 'export'
    let isRunning = false;
    let runInterval = null;
    let variables = { score: 0, speed: 5 };

    // Sprite State
    let sprite = {
      x: 200,
      y: 150,
      rotation: 0,
      scale: 1,
      visible: true,
      color: '#ff9f43',
      speech: '',
      emoji: 'Fox'
    };

    // Workspace Program AST
    let blockTree = [
      {
        id: 'b_start',
        type: 'event_start',
        category: 'events',
        label: 'When Run clicked',
        next: 'b_say',
        x: 30,
        y: 30
      },
      {
        id: 'b_say',
        type: 'looks_say',
        category: 'looks',
        label: 'say [Hello MossyWoss!]',
        inputs: { text: 'Hello MossyWoss!' },
        next: 'b_move',
        x: 30,
        y: 75
      },
      {
        id: 'b_move',
        type: 'motion_move_x',
        category: 'motion',
        label: 'move x by [15]',
        inputs: { steps: 15 },
        next: 'b_sound',
        x: 30,
        y: 120
      },
      {
        id: 'b_sound',
        type: 'sound_tone',
        category: 'sound',
        label: 'play tone [523] Hz for [250] ms',
        inputs: { freq: 523, ms: 250 },
        next: null,
        x: 30,
        y: 165
      }
    ];

    // Blueprint Nodes State
    let blueprintNodes = [
      { id: 'n_start', type: 'Start', x: 40, y: 50, title: 'Run Start' },
 { id: 'n_say', type: 'Say', x: 220, y: 50, title: ' Say', text: 'Hello MossyWoss!' },
 { id: 'n_move', type: 'MoveSprite', x: 400, y: 50, title: ' Move', dx: 20, dy: 0 }
    ];
    let blueprintWires = [
      { from: 'n_start', to: 'n_say' },
      { from: 'n_say', to: 'n_move' }
    ];

    body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#181832;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div style="display:flex;gap:6px">
 <button class="vc-tab active" data-mode="blocks"> Blocks</button>
 <button class="vc-tab" data-mode="blueprint"> Blueprint</button>
          <button class="vc-tab" data-mode="export">&lt;/&gt; JavaScript</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="vc-btn-run" class="mw-btn" style="padding:5px 14px;background:#2ecc71;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer">Run</button>
          <button id="vc-btn-stop" class="mw-btn" style="padding:5px 14px;background:#e74c3c;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer">⏹ Stop</button>
 <button id="vc-btn-save" class="mw-btn" style="padding:5px 10px;font-size:0.85em"> Save</button>
          <button id="vc-btn-load" class="mw-btn" style="padding:5px 10px;font-size:0.85em">Dir Load</button>
        </div>
      </div>

      <div style="flex:1;display:flex;overflow:hidden">
        <!-- LEFT PALETTE -->
        <div id="vc-palette" style="width:220px;background:#131326;border-right:1px solid rgba(255,255,255,0.08);padding:10px;display:flex;flex-direction:column;gap:10px;overflow-y:auto">
        </div>

        <!-- CENTER WORKSPACE -->
        <div id="vc-workspace" style="flex:1;position:relative;background:#0b0b18;overflow:hidden;touch-action:none">
          <div id="vc-blocks-canvas" style="width:100%;height:100%;position:relative;overflow:auto;padding:20px"></div>
          <div id="vc-blueprint-canvas" style="display:none;width:100%;height:100%;position:relative;overflow:hidden;background-image:radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);background-size:20px 20px">
            <canvas id="vc-wire-layer" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas>
            <div id="vc-nodes-container" style="position:absolute;inset:0"></div>
          </div>
          <textarea id="vc-export-code" style="display:none;width:100%;height:100%;background:#090912;color:#00ff99;font-family:monospace;padding:16px;border:none;outline:none;resize:none;font-size:0.9em" readonly></textarea>
        </div>

        <!-- RIGHT STAGE & INSPECTOR -->
        <div style="width:310px;background:#131326;border-left:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;padding:10px;gap:10px">
          <div style="font-size:0.8em;font-weight:bold;color:#aaa">STAGE VIEW (400x300)</div>
          <div style="position:relative;width:100%;height:210px;background:#1a1a36;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center">
            <canvas id="vc-stage" width="400" height="300" style="width:100%;height:100%;object-fit:contain"></canvas>
          </div>

          <div style="flex:1;display:flex;flex-direction:column;gap:6px;background:#181832;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);overflow-y:auto">
            <div style="font-size:0.8em;font-weight:bold;color:#3498db">INSPECTOR & VARIABLES</div>
            <div id="vc-inspector-info" style="font-size:0.75em;color:#aaa;line-height:1.4">
              Sprite: Fox Fox | X: <span id="vc-sp-x">200</span> Y: <span id="vc-sp-y">150</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
              <span style="font-size:0.78em;font-weight:600;color:#aaa">Scope Variables</span>
              <button id="vc-add-var-btn" class="mw-btn" style="padding:2px 6px;font-size:0.7em">+ New Var</button>
            </div>
            <div id="vc-vars-list" style="display:flex;flex-direction:column;gap:4px;margin-top:4px">
            </div>
          </div>
        </div>
      </div>
    `;

    const tabs = body.querySelectorAll('.vc-tab');
    const palette = body.querySelector('#vc-palette');
    const workspaceBlocks = body.querySelector('#vc-blocks-canvas');
    const workspaceBlueprint = body.querySelector('#vc-blueprint-canvas');
    const exportCodeArea = body.querySelector('#vc-export-code');
    const stageCanvas = body.querySelector('#vc-stage');
    const ctx = stageCanvas.getContext('2d');
    const runBtn = body.querySelector('#vc-btn-run');
    const stopBtn = body.querySelector('#vc-btn-stop');
    const saveBtn = body.querySelector('#vc-btn-save');
    const loadBtn = body.querySelector('#vc-btn-load');
    const varsListEl = body.querySelector('#vc-vars-list');
    const addVarBtn = body.querySelector('#vc-add-var-btn');
    const wireCanvas = body.querySelector('#vc-wire-layer');
    const wireCtx = wireCanvas.getContext('2d');
    const nodesContainer = body.querySelector('#vc-nodes-container');

    // Render Stage Canvas
    function renderStage() {
      ctx.clearRect(0, 0, 400, 300);

      // Draw background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 400; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 300); ctx.stroke();
      }
      for (let y = 0; y < 300; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(400, y); ctx.stroke();
      }

      if (!sprite.visible) return;

      ctx.save();
      ctx.translate(sprite.x, sprite.y);
      ctx.rotate((sprite.rotation * Math.PI) / 180);
      ctx.scale(sprite.scale, sprite.scale);

      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sprite.emoji, 0, 0);
      ctx.restore();

      // Render Speech Bubble
      if (sprite.speech) {
        ctx.save();
        ctx.font = '12px system-ui, sans-serif';
        const tw = ctx.measureText(sprite.speech).width;
        const bx = Math.max(10, Math.min(390 - tw - 16, sprite.x - tw / 2));
        const by = Math.max(10, sprite.y - 45);

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(bx, by, tw + 16, 24, 6);
        ctx.fill();

        ctx.fillStyle = '#111111';
        ctx.shadowBlur = 0;
        ctx.fillText(sprite.speech, bx + 8 + tw / 2, by + 12);
        ctx.restore();
      }

      body.querySelector('#vc-sp-x').textContent = Math.round(sprite.x);
      body.querySelector('#vc-sp-y').textContent = Math.round(sprite.y);
    }

    // Update Live Inspector Variables Table
    function renderVarsTable() {
      varsListEl.innerHTML = '';
      Object.keys(variables).forEach(vName => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:#1e1e3f;padding:4px 8px;border-radius:4px;font-size:0.75em';
        row.innerHTML = `<span style="color:#00cec9;font-weight:600">${vName}</span><span style="color:#fff;font-family:monospace">${variables[vName]}</span>`;
        varsListEl.appendChild(row);
      });
    }

    addVarBtn.onclick = () => {
      const vName = prompt('Enter new variable name:');
      if (vName && vName.trim()) {
        const cleanName = vName.trim().replace(/[^a-zA-Z0-9_]/g, '');
        variables[cleanName] = 0;
        renderVarsTable();
      }
    };

    // Blocks Mode Palette Definition
    function renderPalette() {
      palette.innerHTML = '';

      if (currentMode === 'blocks') {
        const categories = [
          { name: 'Events', color: 'events', items: [
            { type: 'event_start', label: 'When Run clicked' },
            { type: 'event_keypress', label: 'When [space] pressed' }
          ]},
          { name: 'Motion', color: 'motion', items: [
            { type: 'motion_move_x', label: 'move x by [15]' },
            { type: 'motion_move_y', label: 'move y by [15]' },
            { type: 'motion_goto', label: 'go to x: [200] y: [150]' }
          ]},
          { name: 'Looks', color: 'looks', items: [
            { type: 'looks_say', label: 'say [Hello!]' },
            { type: 'looks_show', label: 'show sprite' },
            { type: 'looks_hide', label: 'hide sprite' }
          ]},
          { name: 'Sound', color: 'sound', items: [
            { type: 'sound_tone', label: 'play tone [440] Hz for [200] ms' },
            { type: 'sound_sfx', label: 'play sfx [coin]' }
          ]},
          { name: 'VFX', color: 'looks', items: [
            { type: 'vfx_flash', label: 'vfx flash [gold]' },
            { type: 'vfx_shake', label: 'vfx shake screen' },
            { type: 'vfx_burst', label: 'vfx particle burst [gold]' }
          ]},
          { name: 'Control', color: 'control', items: [
            { type: 'control_wait', label: 'wait [500] ms' },
            { type: 'control_repeat', label: 'repeat [3] times' }
          ]}
        ];

        categories.forEach(cat => {
          const header = document.createElement('div');
          header.style.cssText = 'font-weight:bold;font-size:0.75em;color:#aaa;text-transform:uppercase;margin-top:6px';
          header.textContent = cat.name;
          palette.appendChild(header);

          cat.items.forEach(item => {
            const bEl = document.createElement('div');
            bEl.className = `vc-block vc-block-${cat.color}`;
            bEl.textContent = item.label;

            bEl.onpointerdown = (e) => {
              const newId = 'b_' + Date.now();
              const newBlock = {
                id: newId,
                type: item.type,
                category: cat.color,
                label: item.label,
                inputs: { text: 'Hello!', steps: 15, x: 200, y: 150, freq: 440, ms: 250, times: 3, sfx: 'coin', color: 'gold' },
                next: null,
                x: 100,
                y: 100
              };
              blockTree.push(newBlock);
              renderWorkspaceBlocks();
            };

            palette.appendChild(bEl);
          });
        });
      } else if (currentMode === 'blueprint') {
        const nodeTypes = [
          { type: 'Start', title: 'Run Start' },
 { type: 'Say', title: 'Say' },
 { type: 'MoveSprite', title: 'Move' },
          { type: 'Wait', title: 'Wait' }
        ];

        const header = document.createElement('div');
        header.style.cssText = 'font-weight:bold;font-size:0.75em;color:#aaa;text-transform:uppercase';
        header.textContent = 'BLUEPRINT NODES';
        palette.appendChild(header);

        nodeTypes.forEach(n => {
          const btn = document.createElement('button');
          btn.className = 'mw-btn';
          btn.style.cssText = 'padding:8px;font-size:0.8em;text-align:left;background:#1e1e3f;color:#fff;border:1px solid #3498db;border-radius:6px;cursor:pointer';
          btn.textContent = '+ Add ' + n.title;

          btn.onclick = () => {
            const newN = {
              id: 'n_' + Date.now(),
              type: n.type,
              title: n.title,
              x: 50 + Math.random() * 100,
              y: 50 + Math.random() * 100,
              text: 'Hello!',
              dx: 15,
              dy: 0,
              ms: 500
            };
            blueprintNodes.push(newN);
            renderBlueprintNodes();
          };

          palette.appendChild(btn);
        });
      }
    }

    // Render Scratch Blocks in Workspace
    function renderWorkspaceBlocks() {
      workspaceBlocks.innerHTML = '';

      let topY = 20;
      blockTree.forEach((blk, idx) => {
        const el = document.createElement('div');
        el.className = `vc-block vc-block-${blk.category || 'events'}`;
        el.style.position = 'absolute';
        el.style.left = (blk.x || 30) + 'px';
        el.style.top = (blk.y || (topY + idx * 45)) + 'px';

        el.innerHTML = `<span>${blk.label}</span>`;

        // Inline input elements
        if (blk.inputs && blk.inputs.text !== undefined && blk.type.includes('say')) {
          const inp = document.createElement('input');
          inp.className = 'vc-input';
          inp.style.width = '110px';
          inp.value = blk.inputs.text;
          inp.onchange = (e) => { blk.inputs.text = e.target.value; };
          el.appendChild(inp);
        }

        // Make draggable & snappable
        let isDragging = false;
        let startX = 0, startY = 0;

        el.onpointerdown = (e) => {
          e.stopPropagation();
          isDragging = true;
          el.setPointerCapture(e.pointerId);
          startX = e.clientX - el.offsetLeft;
          startY = e.clientY - el.offsetTop;
        };

        el.onpointermove = (e) => {
          if (!isDragging) return;
          const newX = e.clientX - startX;
          const newY = e.clientY - startY;
          el.style.left = newX + 'px';
          el.style.top = newY + 'px';
          blk.x = newX;
          blk.y = newY;
        };

        el.onpointerup = (e) => {
          if (!isDragging) return;
          isDragging = false;
          try { el.releasePointerCapture(e.pointerId); } catch (_) {}

          // Snapping logic: check distance to other blocks
          blockTree.forEach(other => {
            if (other.id !== blk.id) {
              const distY = Math.abs(blk.y - (other.y + 40));
              const distX = Math.abs(blk.x - other.x);
              if (distY < 30 && distX < 40) {
                blk.x = other.x;
                blk.y = other.y + 42;
                other.next = blk.id;
                el.style.left = blk.x + 'px';
                el.style.top = blk.y + 'px';
              }
            }
          });
        };

        workspaceBlocks.appendChild(el);
      });
    }

    // Render Blueprint Nodes & SVG Wires
    function renderBlueprintNodes() {
      nodesContainer.innerHTML = '';
      wireCtx.clearRect(0, 0, wireCanvas.width, wireCanvas.height);

      blueprintNodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'vc-node';
        nodeEl.style.left = node.x + 'px';
        nodeEl.style.top = node.y + 'px';

        nodeEl.innerHTML = `
          <div class="vc-node-header">
            <span>${node.title}</span>
            <span class="vc-pin vc-pin-out" data-nid="${node.id}"></span>
          </div>
          <div class="vc-node-body">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span class="vc-pin vc-pin-in" data-nid="${node.id}"></span>
              <span style="color:#aaa">Flow In/Out</span>
            </div>
          </div>
        `;

        // Make node draggable
        let isDragging = false;
        let startX = 0, startY = 0;

        const header = nodeEl.querySelector('.vc-node-header');
        header.onpointerdown = (e) => {
          if (e.target.classList.contains('vc-pin')) return;
          isDragging = true;
          header.setPointerCapture(e.pointerId);
          startX = e.clientX - node.x;
          startY = e.clientY - node.y;
        };

        header.onpointermove = (e) => {
          if (!isDragging) return;
          node.x = e.clientX - startX;
          node.y = e.clientY - startY;
          nodeEl.style.left = node.x + 'px';
          nodeEl.style.top = node.y + 'px';
          drawWires();
        };

        header.onpointerup = (e) => {
          if (isDragging) {
            isDragging = false;
            try { header.releasePointerCapture(e.pointerId); } catch (_) {}
          }
        };

        nodesContainer.appendChild(nodeEl);
      });

      drawWires();
    }

    // Draw SVG bezier wires between Blueprint nodes
    function drawWires() {
      wireCtx.clearRect(0, 0, wireCanvas.width, wireCanvas.height);
      blueprintWires.forEach(w => {
        const fromNode = blueprintNodes.find(n => n.id === w.from);
        const toNode = blueprintNodes.find(n => n.id === w.to);

        if (fromNode && toNode) {
          const x1 = fromNode.x + 160;
          const y1 = fromNode.y + 15;
          const x2 = toNode.x + 10;
          const y2 = toNode.y + 35;

          const cx1 = x1 + 40;
          const cx2 = x2 - 40;

          wireCtx.strokeStyle = '#00b894';
          wireCtx.lineWidth = 3;
          wireCtx.beginPath();
          wireCtx.moveTo(x1, y1);
          wireCtx.bezierCurveTo(cx1, y1, cx2, y2, x2, y2);
          wireCtx.stroke();
        }
      });
    }

    // Generate JavaScript Source Code Export
    function generateJSCode() {
      let code = `// ==========================================\n`;
      code += `// Generated by MossyWoss Visual Code Studio\n`;
      code += `// ==========================================\n\n`;
      code += `let vars = ${JSON.stringify(variables, null, 2)};\n\n`;
      code += `async function runProgram(sprite, stage) {\n`;

      blockTree.forEach(blk => {
        if (blk.type === 'looks_say') {
          code += `  sprite.say("${blk.inputs ? blk.inputs.text || 'Hello!' : 'Hello!'}");\n`;
        } else if (blk.type === 'motion_move_x') {
          code += `  sprite.x += ${blk.inputs ? blk.inputs.steps || 15 : 15};\n`;
          code += `  stage.redraw();\n`;
        } else if (blk.type === 'sound_tone') {
          code += `  await stage.playTone(${blk.inputs ? blk.inputs.freq || 440 : 440}, ${blk.inputs ? blk.inputs.ms || 250 : 250});\n`;
        } else if (blk.type === 'sound_sfx') {
          code += `  await stage.playSfx("${blk.inputs ? blk.inputs.sfx || 'coin' : 'coin'}");\n`;
        } else if (blk.type === 'vfx_flash') {
          code += `  stage.vfxFlash("${blk.inputs ? blk.inputs.color || 'gold' : 'gold'}");\n`;
        } else if (blk.type === 'vfx_shake') {
          code += `  stage.vfxShake();\n`;
        } else if (blk.type === 'vfx_burst') {
          code += `  stage.vfxBurst("${blk.inputs ? blk.inputs.color || 'gold' : 'gold'}");\n`;
        } else if (blk.type === 'control_wait') {
          code += `  await stage.wait(${blk.inputs ? blk.inputs.ms || 500 : 500});\n`;
        }
      });

      code += `}\n`;
      return code;
    }

    // Switch View Mode Tabs
    tabs.forEach(tab => {
      tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentMode = tab.dataset.mode;

        workspaceBlocks.style.display = 'none';
        workspaceBlueprint.style.display = 'none';
        exportCodeArea.style.display = 'none';

        if (currentMode === 'blocks') {
          workspaceBlocks.style.display = 'block';
          renderPalette();
          renderWorkspaceBlocks();
        } else if (currentMode === 'blueprint') {
          workspaceBlueprint.style.display = 'block';
          renderPalette();
          renderBlueprintNodes();
        } else if (currentMode === 'export') {
          exportCodeArea.style.display = 'block';
          exportCodeArea.value = generateJSCode();
        }
      };
    });

    // Execute Program Engine
    async function executeProgram() {
      if (isRunning) return;
      isRunning = true;

      sprite.x = 200;
      sprite.y = 150;
      sprite.speech = '';
      renderStage();

      for (const blk of blockTree) {
        if (!isRunning) break;

        if (blk.type === 'looks_say') {
          sprite.speech = blk.inputs ? blk.inputs.text : 'Hello!';
          renderStage();
          await new Promise(r => setTimeout(r, 600));
        } else if (blk.type === 'motion_move_x') {
          const steps = blk.inputs ? Number(blk.inputs.steps) || 15 : 15;
          sprite.x = Math.max(20, Math.min(380, sprite.x + steps));
          renderStage();
          await new Promise(r => setTimeout(r, 100));
        } else if (blk.type === 'sound_tone') {
          const freq = blk.inputs ? Number(blk.inputs.freq) || 440 : 440;
          const ms = blk.inputs ? Number(blk.inputs.ms) || 250 : 250;
          playWebAudioTone(freq, ms);
          await new Promise(r => setTimeout(r, ms));
        } else if (blk.type === 'sound_sfx') {
          const kind = (blk.inputs && blk.inputs.sfx) || 'coin';
          const sd = playSfxKind(kind);
          await new Promise(r => setTimeout(r, sd));
        } else if (blk.type === 'vfx_flash') {
          const col = VFX_COLORS[(blk.inputs && blk.inputs.color) || 'gold'] || '#ffd54a';
          vfxFlash(col);
          await new Promise(r => setTimeout(r, 280));
        } else if (blk.type === 'vfx_shake') {
          vfxShake();
          await new Promise(r => setTimeout(r, 460));
        } else if (blk.type === 'vfx_burst') {
          const col = VFX_COLORS[(blk.inputs && blk.inputs.color) || 'gold'] || '#ffd54a';
          vfxBurst(col);
          await new Promise(r => setTimeout(r, 520));
        } else if (blk.type === 'control_wait') {
          const ms = blk.inputs ? Number(blk.inputs.ms) || 500 : 500;
          await new Promise(r => setTimeout(r, ms));
        }
      }

      isRunning = false;
    }

    runBtn.onclick = executeProgram;
    stopBtn.onclick = () => { isRunning = false; sprite.speech = ''; renderStage(); };

    // Save Program to VFS
    saveBtn.onclick = async () => {
      const name = prompt('Save project as:', 'my_program');
      if (!name) return;

      const payload = JSON.stringify({
        blockTree,
        blueprintNodes,
        blueprintWires,
        variables
      }, null, 2);

      const filename = `/Documents/${name.trim().replace(/[^a-zA-Z0-9_]/g, '_')}.blocks.json`;
      await MWO.fs.mkdir('/Documents');
      await MWO.fs.writeFile(filename, payload);
      MWO.notif.show('Visual Code', 'Saved project to ' + filename);
    };

    // Load Program from VFS
    loadBtn.onclick = async () => {
      try {
        const files = await MWO.fs.listDir('/Documents');
        const projects = files.filter(f => f.name.endsWith('.blocks.json'));

        if (projects.length === 0) {
          alert('No saved .blocks.json projects found in /Documents');
          return;
        }

        const choice = prompt('Select project to load:\n' + projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n'));
        const idx = parseInt(choice) - 1;

        if (idx >= 0 && idx < projects.length) {
          const content = await MWO.fs.readFile(projects[idx].path);
          const data = JSON.parse(content);

          if (data.blockTree) blockTree = data.blockTree;
          if (data.blueprintNodes) blueprintNodes = data.blueprintNodes;
          if (data.blueprintWires) blueprintWires = data.blueprintWires;
          if (data.variables) variables = data.variables;

          renderVarsTable();
          renderPalette();
          renderWorkspaceBlocks();
          renderBlueprintNodes();
          MWO.notif.show('Visual Code', 'Loaded project ' + projects[idx].name);
        }
      } catch (e) {
        alert('Failed to load project');
      }
    };

    // Initial render
    renderVarsTable();
    renderPalette();
    renderWorkspaceBlocks();
    renderStage();
  }

  // Register App in MossyWoss OS
  if (window.MWO && MWO.registerApp) {
    MWO.registerApp({
      id: 'visualcode',
      name: 'Visual Code',
      description: 'Block coding & blueprint node programming',
      icon: 'visual-code',
      category: 'app',
      installed: false,
      launch: launch
    });
  }

  return {
    launch: launch
  };
})();
