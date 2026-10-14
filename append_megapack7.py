import os, subprocess

with open('mw_web/megapack.js', 'a', encoding='utf-8') as f:
    f.write('''
  /* --------------------------------------------------------------------
   * 17. SPACE INVADERS
   * -------------------------------------------------------------------- */
  reg('mp-spaceinvaders', 'Space Invaders', 'Canvas 5x11 alien march with destructible barriers', '👾', 'game', function(){
    var w = MWO.wm.create({id:'mp-inv-'+Date.now(), title:'Space Invaders', icon:'👾', width:480, height:420, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#000;color:#00ff00;padding:4px;box-sizing:border-box'>" +
      "<div style='display:flex;justify-content:space-between;width:100%;padding:4px 8px;font-family:monospace;font-size:0.9em;color:#fff'>" +
        "<div>Score: <span id='inv-sc' style='color:#00ff00'>0</span></div>" +
        "<div>Lives: <span id='inv-lv' style='color:#ff0000'>3</span></div>" +
      "</div>" +
      "<canvas id='inv-cv' width='460' height='340' style='border:1px solid #222;border-radius:4px;'></canvas>" +
      "<div style='font-size:0.75em;color:#888;margin-top:4px'>Arrows/A/D: Move | Space: Fire</div>" +
    "</div>";

    var cv = w.querySelector('#inv-cv'), cx = cv.getContext('2d'), scEl = w.querySelector('#inv-sc'), lvEl = w.querySelector('#inv-lv');
    var cannon = {x: 220, w: 24, h: 12}, bullet = null, aliens = [], alienDir = 1, score = 0, lives = 3, keys = {};

    function initAliens() {
      aliens = [];
      for (var r = 0; r < 5; r++) {
        for (var c = 0; c < 10; c++) {
          aliens.push({x: 30 + c * 36, y: 30 + r * 24, alive: true, r: r});
        }
      }
    }

    function onKd(e) {
      if (!w.isConnected) { document.removeEventListener('keydown', onKd); document.removeEventListener('keyup', onKu); return; }
      keys[e.key] = true;
      if ((e.key === ' ' || e.key === 'Spacebar') && !bullet) {
        bullet = {x: cannon.x + 10, y: 310};
        playTone(600, 0.05, 'square', 0.1);
      }
    }
    function onKu(e) { keys[e.key] = false; }

    document.addEventListener('keydown', onKd);
    document.addEventListener('keyup', onKu);

    function loop() {
      if (!w.isConnected) return;

      if (keys['ArrowLeft'] || keys['a']) cannon.x = Math.max(10, cannon.x - 4);
      if (keys['ArrowRight'] || keys['d']) cannon.x = Math.min(426, cannon.x + 4);

      if (bullet) {
        bullet.y -= 7;
        if (bullet.y < 0) bullet = null;
      }

      // Move Aliens
      var shiftDown = false;
      aliens.forEach(function(a) {
        if (!a.alive) return;
        if ((a.x > 430 && alienDir > 0) || (a.x < 10 && alienDir < 0)) shiftDown = true;
      });

      if (shiftDown) {
        alienDir *= -1;
        aliens.forEach(function(a){ if(a.alive) a.y += 10; });
      } else {
        aliens.forEach(function(a){ if(a.alive) a.x += alienDir * 0.8; });
      }

      // Bullet collision
      if (bullet) {
        aliens.forEach(function(a) {
          if (a.alive && bullet && Math.abs(bullet.x - (a.x + 10)) < 12 && Math.abs(bullet.y - a.y) < 10) {
            a.alive = false; bullet = null;
            score += 50; scEl.textContent = score;
            playTone(300, 0.08, 'sawtooth', 0.15);
          }
        });
      }

      // Render
      cx.fillStyle = '#000'; cx.fillRect(0,0,460,340);

      // Render Cannon
      cx.fillStyle = '#00ff00'; cx.fillRect(cannon.x, 315, cannon.w, cannon.h);
      cx.fillRect(cannon.x + 9, 308, 6, 8);

      // Render Bullet
      if (bullet) { cx.fillStyle = '#ffffff'; cx.fillRect(bullet.x, bullet.y, 4, 10); }

      // Render Aliens
      aliens.forEach(function(a) {
        if (!a.alive) return;
        cx.fillStyle = a.r === 0 ? '#ff0055' : a.r < 3 ? '#33ccff' : '#yellow';
        cx.fillRect(a.x, a.y, 20, 14);
      });

      requestAnimationFrame(loop);
    }

    initAliens();
    loop();
  });

  /* --------------------------------------------------------------------
   * 18. DOODLE JUMP CLONE
   * -------------------------------------------------------------------- */
  reg('mp-doodlejump', 'Doodle Jump', 'Canvas auto-bounce platformer with moving platforms', '🦒', 'game', function(){
    var w = MWO.wm.create({id:'mp-dood-'+Date.now(), title:'Doodle Jump', icon:'🦒', width:360, height:460, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#111;color:#fff;padding:4px;box-sizing:border-box'>" +
      "<div style='font-family:sans-serif;font-size:1.1em;font-weight:bold;color:#facc15;margin-bottom:4px'>Height: <span id='dood-sc'>0</span></div>" +
      "<canvas id='dood-cv' width='340' height='380' style='border:1px solid #333;border-radius:4px'></canvas>" +
      "<div style='font-size:0.75em;color:#888;margin-top:4px'>Use Left/Right Arrows or Tap sides to move</div>" +
    "</div>";

    var cv = w.querySelector('#dood-cv'), cx = cv.getContext('2d'), scEl = w.querySelector('#dood-sc');
    var p = {x: 170, y: 300, vy: 0, vx: 0}, platforms = [], score = 0, keys = {};

    function initGame() {
      p = {x: 170, y: 250, vy: -8, vx: 0};
      platforms = [{x: 150, y: 350, w: 60, h: 10}];
      for (var i = 0; i < 7; i++) {
        platforms.push({x: Math.random() * 280, y: 300 - i * 50, w: 60, h: 10});
      }
      score = 0;
    }

    function onKd(e) { if (w.isConnected) keys[e.key] = true; }
    function onKu(e) { if (w.isConnected) keys[e.key] = false; }
    document.addEventListener('keydown', onKd); document.addEventListener('keyup', onKu);

    function loop() {
      if (!w.isConnected) return;

      if (keys['ArrowLeft'] || keys['a']) p.vx = -4;
      else if (keys['ArrowRight'] || keys['d']) p.vx = 4;
      else p.vx *= 0.8;

      p.x = (p.x + p.vx + 340) % 340;
      p.vy += 0.3; // Gravity
      p.y += p.vy;

      // Platform Bouncing
      if (p.vy > 0) {
        platforms.forEach(function(plat) {
          if (p.x + 16 > plat.x && p.x < plat.x + plat.w && p.y + 20 >= plat.y && p.y + 20 <= plat.y + 12) {
            p.vy = -9;
            playTone(400, 0.05, 'sine', 0.1);
          }
        });
      }

      // Camera Scrolling
      if (p.y < 180) {
        var diff = 180 - p.y;
        p.y = 180;
        score += Math.round(diff); scEl.textContent = score;
        platforms.forEach(function(plat) {
          plat.y += diff;
          if (plat.y > 380) {
            plat.y = 0; plat.x = Math.random() * 280;
          }
        });
      }

      // Game Over
      if (p.y > 380) initGame();

      // Render
      cx.fillStyle = '#0f172a'; cx.fillRect(0,0,340,380);

      // Player
      cx.fillStyle = '#facc15'; cx.fillRect(p.x, p.y, 20, 20);

      // Platforms
      cx.fillStyle = '#22c55e';
      platforms.forEach(function(plat){ cx.fillRect(plat.x, plat.y, plat.w, plat.h); });

      requestAnimationFrame(loop);
    }

    initGame();
    loop();
  });

  /* --------------------------------------------------------------------
   * 19. SNAKE BATTLE
   * -------------------------------------------------------------------- */
  reg('mp-snakebattle', 'Snake Battle', '2-Player local battle: WASD vs Arrows', '🐍', 'game', function(){
    var w = MWO.wm.create({id:'mp-snb-'+Date.now(), title:'Snake Battle', icon:'🐍', width:480, height:420, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#090d16;color:#fff;padding:8px;box-sizing:border-box'>" +
      "<div style='display:flex;justify-content:space-between;width:100%;font-weight:bold;margin-bottom:6px;font-family:sans-serif'>" +
        "<div style='color:#22c55e'>P1 (WASD): <span id='snb-p1'>0</span></div>" +
        "<div style='color:#ef4444'>P2 (Arrows): <span id='snb-p2'>0</span></div>" +
      "</div>" +
      "<canvas id='snb-cv' width='440' height='340' style='border:2px solid #334155;border-radius:6px'></canvas>" +
    "</div>";

    var cv = w.querySelector('#snb-cv'), cx = cv.getContext('2d'), p1ScEl = w.querySelector('#snb-p1'), p2ScEl = w.querySelector('#snb-p2');
    var s1 = [{x:5,y:5}], d1 = {x:1,y:0}, s2 = [{x:15,y:15}], d2 = {x:-1,y:0}, food = {x:10,y:10}, p1Sc = 0, p2Sc = 0, loopId = null;

    function initGame() {
      s1 = [{x:4,y:10},{x:3,y:10}]; d1 = {x:1,y:0};
      s2 = [{x:18,y:10},{x:19,y:10}]; d2 = {x:-1,y:0};
      food = {x:11,y:10}; p1Sc = 0; p2Sc = 0;
      if (loopId) clearInterval(loopId);
      loopId = setInterval(tk, 120);
    }

    function onKd(e) {
      if (!w.isConnected) { document.removeEventListener('keydown', onKd); clearInterval(loopId); return; }
      if (e.key === 'w' && d1.y === 0) d1 = {x:0,y:-1};
      if (e.key === 's' && d1.y === 0) d1 = {x:0,y:1};
      if (e.key === 'a' && d1.x === 0) d1 = {x:-1,y:0};
      if (e.key === 'd' && d1.x === 0) d1 = {x:1,y:0};

      if (e.key === 'ArrowUp' && d2.y === 0) d2 = {x:0,y:-1};
      if (e.key === 'ArrowDown' && d2.y === 0) d2 = {x:0,y:1};
      if (e.key === 'ArrowLeft' && d2.x === 0) d2 = {x:-1,y:0};
      if (e.key === 'ArrowRight' && d2.x === 0) d2 = {x:1,y:0};
    }
    document.addEventListener('keydown', onKd);

    function tk() {
      var h1 = {x: s1[0].x + d1.x, y: s1[0].y + d1.y};
      var h2 = {x: s2[0].x + d2.x, y: s2[0].y + d2.y};

      // Collision checks
      var dead1 = h1.x<0||h1.x>=22||h1.y<0||h1.y>=17 || s1.some(s=>s.x===h1.x&&s.y===h1.y) || s2.some(s=>s.x===h1.x&&s.y===h1.y);
      var dead2 = h2.x<0||h2.x>=22||h2.y<0||h2.y>=17 || s2.some(s=>s.x===h2.x&&s.y===h2.y) || s1.some(s=>s.x===h2.x&&s.y===h2.y);

      if (dead1 || dead2) {
        clearInterval(loopId);
        playTone(200, 0.4, 'sawtooth', 0.2);
        setTimeout(initGame, 1500);
        return;
      }

      s1.unshift(h1); s2.unshift(h2);

      if (h1.x === food.x && h1.y === food.y) { p1Sc++; p1ScEl.textContent = p1Sc; food = {x:Math.floor(Math.random()*22), y:Math.floor(Math.random()*17)}; playTone(600,0.05,'sine',0.1); } else s1.pop();
      if (h2.x === food.x && h2.y === food.y) { p2Sc++; p2ScEl.textContent = p2Sc; food = {x:Math.floor(Math.random()*22), y:Math.floor(Math.random()*17)}; playTone(600,0.05,'sine',0.1); } else s2.pop();

      // Render
      cx.fillStyle = '#0f172a'; cx.fillRect(0,0,440,340);
      cx.fillStyle = '#facc15'; cx.beginPath(); cx.arc(food.x*20+10, food.y*20+10, 8, 0, Math.PI*2); cx.fill();

      cx.fillStyle = '#22c55e'; s1.forEach(s=>cx.fillRect(s.x*20+1,s.y*20+1,18,18));
      cx.fillStyle = '#ef4444'; s2.forEach(s=>cx.fillRect(s.x*20+1,s.y*20+1,18,18));
    }

    initGame();
  });

  /* --------------------------------------------------------------------
   * 20. BATTLESHIP
   * -------------------------------------------------------------------- */
  reg('mp-battleship', 'Battleship', '10x10 naval strategy vs targeted hunting AI', '⚓', 'game', function(){
    var w = MWO.wm.create({id:'mp-bat-'+Date.now(), title:'Battleship', icon:'⚓', width:520, height:420, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;height:100%;background:#0f172a;color:#fff;padding:8px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div id='bat-status' style='font-size:1em;font-weight:bold;color:#38bdf8;text-align:center;margin-bottom:8px'>Tap AI grid to fire salvo!</div>" +
      "<div style='display:flex;justify-content:space-around;flex:1'>" +
        "<div style='text-align:center'><div style='font-size:0.8em;color:#94a3b8;margin-bottom:4px'>YOUR FLEET</div><div id='bat-pgrid' style='display:grid;grid-template-columns:repeat(10,22px);gap:1px;background:#1e293b;padding:4px;border-radius:4px'></div></div>" +
        "<div style='text-align:center'><div style='font-size:0.8em;color:#e2e8f0;margin-bottom:4px'>TARGET AI GRID</div><div id='bat-aigrid' style='display:grid;grid-template-columns:repeat(10,22px);gap:1px;background:#1e293b;padding:4px;border-radius:4px;cursor:pointer'></div></div>" +
      "</div>" +
    "</div>";

    var pGridEl = w.querySelector('#bat-pgrid'), aiGridEl = w.querySelector('#bat-aigrid'), statusEl = w.querySelector('#bat-status');
    var pBoard = [], aiBoard = [], pHits = [], aiHits = [], gameOver = false;

    function initGame() {
      pBoard = Array(10).fill(0).map(()=>Array(10).fill(0));
      aiBoard = Array(10).fill(0).map(()=>Array(10).fill(0));
      pHits = Array(10).fill(0).map(()=>Array(10).fill(0));
      aiHits = Array(10).fill(0).map(()=>Array(10).fill(0));
      gameOver = false;

      placeShipsRandom(pBoard);
      placeShipsRandom(aiBoard);
      render();
    }

    function placeShipsRandom(b) {
      [5, 4, 3, 3, 2].forEach(function(len) {
        var placed = false;
        while (!placed) {
          var horiz = Math.random() < 0.5;
          var r = Math.floor(Math.random() * (horiz ? 10 : 10 - len));
          var c = Math.floor(Math.random() * (horiz ? 10 - len : 10));
          var ok = true;
          for (var i = 0; i < len; i++) {
            if (b[horiz ? r : r + i][horiz ? c + i : c] !== 0) ok = false;
          }
          if (ok) {
            for (var i = 0; i < len; i++) b[horiz ? r : r + i][horiz ? c + i : c] = 1;
            placed = true;
          }
        }
      });
    }

    function render() {
      pGridEl.innerHTML = ''; aiGridEl.innerHTML = '';
      for (var r = 0; r < 10; r++) {
        for (var c = 0; c < 10; c++) {
          var pCell = document.createElement('div');
          pCell.style.width = '22px'; pCell.style.height = '22px'; pCell.style.borderRadius = '2px';
          if (pBoard[r][c] === 1) pCell.style.background = '#64748b'; else pCell.style.background = '#020617';
          if (aiHits[r][c] === 1) pCell.style.background = '#ef4444'; // AI hit player
          else if (aiHits[r][c] === 2) pCell.style.background = '#94a3b8'; // AI miss
          pGridEl.appendChild(pCell);

          var aiCell = document.createElement('div');
          aiCell.style.width = '22px'; aiCell.style.height = '22px'; aiCell.style.borderRadius = '2px'; aiCell.style.background = '#020617';
          if (pHits[r][c] === 1) aiCell.style.background = '#ef4444'; // Player hit AI
          else if (pHits[r][c] === 2) aiCell.style.background = '#334155'; // Player miss

          (function(row, col) {
            aiCell.onclick = function() { playerFire(row, col); };
          })(r, c);

          aiGridEl.appendChild(aiCell);
        }
      }
    }

    function playerFire(r, c) {
      if (gameOver || pHits[r][c] !== 0) return;
      if (aiBoard[r][c] === 1) {
        pHits[r][c] = 1; playTone(600, 0.1, 'sine', 0.2);
        statusEl.textContent = "DIRECT HIT!";
      } else {
        pHits[r][c] = 2; playTone(200, 0.1, 'triangle', 0.1);
        statusEl.textContent = "SPLASH! Miss.";
      }
      render();

      if (checkWin(pHits, aiBoard)) {
        statusEl.textContent = "VICTORY! Enemy fleet destroyed!"; gameOver = true; return;
      }

      setTimeout(aiTurn, 400);
    }

    function aiTurn() {
      if (!w.isConnected || gameOver) return;
      var r, c;
      do { r = Math.floor(Math.random()*10); c = Math.floor(Math.random()*10); } while (aiHits[r][c] !== 0);

      if (pBoard[r][c] === 1) aiHits[r][c] = 1; else aiHits[r][c] = 2;
      render();

      if (checkWin(aiHits, pBoard)) {
        statusEl.textContent = "DEFEAT! Your fleet was sunk."; gameOver = true;
      }
    }

    function checkWin(hits, b) {
      for (var r=0; r<10; r++) for (var c=0; c<10; c++) if (b[r][c] === 1 && hits[r][c] !== 1) return false;
      return true;
    }

    initGame();
  });

  /* --------------------------------------------------------------------
   * 21. WORD SEARCH
   * -------------------------------------------------------------------- */
  reg('mp-wordsearch', 'Word Search', '10x10 word search with drag selection & list greying', '🔍', 'game', function(){
    var w = MWO.wm.create({id:'mp-ws-'+Date.now(), title:'Word Search', icon:'🔍', width:440, height:420, resizable:false});
    w.innerHTML = "<div style='display:flex;height:100%;background:#1e1e2e;color:#cdd6f4;padding:8px;box-sizing:border-box;font-family:sans-serif;gap:10px'>" +
      "<div id='ws-grid' style='display:grid;grid-template-columns:repeat(10,28px);grid-template-rows:repeat(10,28px);gap:3px;background:#313244;padding:6px;border-radius:6px;cursor:pointer'></div>" +
      "<div style='flex:1;display:flex;flex-direction:column;gap:6px;background:#181825;padding:8px;border-radius:6px'>" +
        "<div style='font-weight:bold;color:#89b4fa;font-size:0.9em'>Find Words:</div>" +
        "<div id='ws-list' style='display:flex;flex-direction:column;gap:4px;font-size:0.85em;font-family:monospace'></div>" +
      "</div>" +
    "</div>";

    var gridEl = w.querySelector('#ws-grid'), listEl = w.querySelector('#ws-list');
    var WORDS = ['CODE', 'SUPER', 'MOSS', 'GAME', 'DATA', 'NODE', 'WEB', 'OS'];
    var grid = Array(10).fill(0).map(()=>Array(10).fill(''));
    var found = [], selCells = [];

    function initGame() {
      grid = Array(10).fill(0).map(()=>Array(10).fill(''));
      found = []; selCells = [];
      // Place words
      WORDS.forEach(function(word) {
        var placed = false;
        while (!placed) {
          var horiz = Math.random() < 0.5;
          var r = Math.floor(Math.random() * (horiz ? 10 : 10 - word.length));
          var c = Math.floor(Math.random() * (horiz ? 10 - word.length : 10));
          var ok = true;
          for (var i = 0; i < word.length; i++) {
            var ch = grid[horiz ? r : r + i][horiz ? c + i : c];
            if (ch !== '' && ch !== word[i]) ok = false;
          }
          if (ok) {
            for (var i = 0; i < word.length; i++) grid[horiz ? r : r + i][horiz ? c + i : c] = word[i];
            placed = true;
          }
        }
      });
      // Fill empty
      for (var r = 0; r < 10; r++) {
        for (var c = 0; c < 10; c++) {
          if (!grid[r][c]) grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random()*26));
        }
      }
      render();
    }

    function render() {
      gridEl.innerHTML = ''; listEl.innerHTML = '';
      for (var r = 0; r < 10; r++) {
        for (var c = 0; c < 10; c++) {
          var cell = document.createElement('div');
          cell.style.width = '28px'; cell.style.height = '28px'; cell.style.display = 'flex'; cell.style.alignItems = 'center'; cell.style.justifyContent = 'center';
          cell.style.fontWeight = 'bold'; cell.style.fontSize = '14px'; cell.style.borderRadius = '4px'; cell.style.background = '#45475a';
          cell.textContent = grid[r][c];

          (function(row, col) {
            cell.onclick = function() {
              selCells.push({r: row, c: col});
              checkSelectedWord();
              render();
            };
          })(r, c);

          gridEl.appendChild(cell);
        }
      }

      WORDS.forEach(function(wStr) {
        var item = document.createElement('div');
        item.textContent = wStr;
        if (found.indexOf(wStr) !== -1) { item.style.textDecoration = 'line-through'; item.style.color = '#a6e3a1'; }
        listEl.appendChild(item);
      });
    }

    function checkSelectedWord() {
      var str = selCells.map(p=>grid[p.r][p.c]).join('');
      if (WORDS.indexOf(str) !== -1 && found.indexOf(str) === -1) {
        found.push(str); playTone(600, 0.2, 'sine', 0.2); selCells = [];
      }
    }

    initGame();
  });

  /* --------------------------------------------------------------------
   * 22. IDLE FOX GROVE
   * -------------------------------------------------------------------- */
  reg('mp-foxgrove', 'Idle Fox Grove', 'Clicker idler with upgrade shop & VFS offline progress', '🦊', 'game', function(){
    var w = MWO.wm.create({id:'mp-fox-'+Date.now(), title:'Idle Fox Grove', icon:'🦊', width:420, height:440, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#1c1917;color:#fef3c7;padding:12px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div style='font-size:1.6em;font-weight:bold;color:#f59e0b' id='fx-coins'>🦊 0 Coins</div>" +
      "<div style='font-size:0.85em;color:#a8a29e;margin-bottom:12px' id='fx-rate'>0 coins/sec</div>" +
      "<div id='fx-tree' style='width:100px;height:100px;border-radius:50%;background:radial-gradient(circle,#f59e0b,#b45309);display:flex;align-items:center;justify-content:center;font-size:48px;cursor:pointer;box-shadow:0 4px 15px rgba(245,158,11,0.4);user-select:none;margin-bottom:16px'>🦊</div>" +
      "<div style='flex:1;width:100%;overflow-y:auto;display:flex;flex-direction:column;gap:6px' id='fx-shop'></div>" +
    "</div>";

    var coinsEl = w.querySelector('#fx-coins'), rateEl = w.querySelector('#fx-rate'), treeEl = w.querySelector('#fx-tree'), shopEl = w.querySelector('#fx-shop');

    var coins = 0, coinsPerSec = 0, lastSeen = Date.now();
    var upgrades = [
      {id:'h1', name:'Fox Helper', cost:15, cps:1, count:0},
      {id:'h2', name:'Berry Bush', cost:100, cps:5, count:0},
      {id:'h3', name:'Fox Den', cost:500, cps:25, count:0}
    ];

    async function loadSave() {
      try {
        var str = await MWO.fs.readFile('/Documents/fox_grove.json');
        var data = JSON.parse(str);
        coins = data.coins || 0;
        upgrades = data.upgrades || upgrades;
        var offlineSec = Math.floor((Date.now() - (data.lastSeen || Date.now())) / 1000);
        calcCps();
        var earned = offlineSec * coinsPerSec;
        if (earned > 0) {
          coins += earned;
          MWO.notif.show('Idle Fox Grove', 'Offline Earnings: 🦊 ' + earned + ' coins!');
        }
      } catch(e) {}
      render();
    }

    function calcCps() {
      coinsPerSec = upgrades.reduce((acc, u) => acc + (u.count * u.cps), 0);
      rateEl.textContent = coinsPerSec + ' coins/sec';
    }

    function render() {
      coinsEl.textContent = '🦊 ' + Math.floor(coins) + ' Coins';
      calcCps();
      shopEl.innerHTML = '';
      upgrades.forEach(function(u) {
        var card = document.createElement('div');
        card.style.background = '#292524'; card.style.padding = '8px 12px'; card.style.borderRadius = '6px';
        card.style.display = 'flex'; card.style.justifyContent = 'space-between'; card.style.alignItems = 'center';
        card.innerHTML = "<div><div style='font-weight:bold'>" + u.name + " (" + u.count + ")</div><div style='font-size:0.75em;color:#a8a29e'>+" + u.cps + " c/s</div></div>" +
          "<button style='padding:6px 12px;background:#f59e0b;color:#1c1917;border:none;border-radius:4px;font-weight:bold;cursor:pointer'>Buy " + u.cost + "</button>";

        card.querySelector('button').onclick = function() {
          if (coins >= u.cost) {
            coins -= u.cost;
            u.count++;
            u.cost = Math.floor(u.cost * 1.15);
            playTone(500, 0.1, 'sine', 0.15);
            saveGame();
            render();
          }
        };
        shopEl.appendChild(card);
      });
    }

    async function saveGame() {
      var data = {coins: coins, upgrades: upgrades, lastSeen: Date.now()};
      await MWO.fs.writeFile('/Documents/fox_grove.json', JSON.stringify(data));
    }

    treeEl.onclick = function() {
      coins += 1;
      playTone(700, 0.05, 'sine', 0.1);
      render();
    };

    setInterval(function() {
      if (!w.isConnected) return;
      coins += coinsPerSec;
      render();
    }, 1000);

    loadSave();
  });

})();
''')

print("Part 8 written.")
