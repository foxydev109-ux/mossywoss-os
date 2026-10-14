import os, subprocess

with open('mw_web/megapack.js', 'a', encoding='utf-8') as f:
    f.write('''
  /* --------------------------------------------------------------------
   * 14. PASSWORD GENERATOR
   * -------------------------------------------------------------------- */
  reg('mp-passgen', 'Password Generator', 'Crypto random password generator with entropy meter', '🔑', 'utility', function(){
    var w = MWO.wm.create({id:'mp-pass-'+Date.now(), title:'Password Generator', icon:'🔑', width:400, height:360, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;height:100%;background:#0f172a;color:#f8fafc;padding:12px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div style='display:flex;gap:6px;margin-bottom:12px'>" +
        "<input id='pg-out' type='text' readonly style='flex:1;padding:10px;background:#1e293b;border:1px solid #334155;color:#38bdf8;border-radius:6px;font-family:monospace;font-size:1.1em;font-weight:bold'/>" +
        "<button id='pg-copy' style='padding:10px 14px;background:#38bdf8;color:#0f172a;border:none;border-radius:6px;font-weight:bold;cursor:pointer'>Copy</button>" +
      "</div>" +
      "<div id='pg-meter' style='height:6px;background:#334155;border-radius:3px;margin-bottom:12px;overflow:hidden'>" +
        "<div id='pg-bar' style='height:100%;width:50%;background:#eab308;transition:all 0.3s'></div>" +
      "</div>" +
      "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px'>" +
        "<div>Length: <span id='pg-len-txt' style='font-weight:bold;color:#38bdf8'>16</span></div>" +
        "<input id='pg-len' type='range' min='6' max='64' value='16' style='width:180px'/>" +
      "</div>" +
      "<div style='display:flex;flex-direction:column;gap:8px;margin-bottom:12px'>" +
        "<label><input id='pg-uc' type='checkbox' checked/> Uppercase (A-Z)</label>" +
        "<label><input id='pg-lc' type='checkbox' checked/> Lowercase (a-z)</label>" +
        "<label><input id='pg-num' type='checkbox' checked/> Digits (0-9)</label>" +
        "<label><input id='pg-sym' type='checkbox' checked/> Symbols (!@#$%^&*)</label>" +
      "</div>" +
      "<button id='pg-gen' style='margin-top:auto;padding:10px;background:#22c55e;color:#0f172a;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:1em'>Generate Password</button>" +
    "</div>";

    var outIn = w.querySelector('#pg-out'), copyBtn = w.querySelector('#pg-copy'), lenSlider = w.querySelector('#pg-len'), lenTxt = w.querySelector('#pg-len-txt'), ucChk = w.querySelector('#pg-uc'), lcChk = w.querySelector('#pg-lc'), numChk = w.querySelector('#pg-num'), symChk = w.querySelector('#pg-sym'), genBtn = w.querySelector('#pg-gen'), bar = w.querySelector('#pg-bar');

    function generate() {
      var len = parseInt(lenSlider.value);
      lenTxt.textContent = len;
      var chars = '';
      if (ucChk.checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (lcChk.checked) chars += 'abcdefghijklmnopqrstuvwxyz';
      if (numChk.checked) chars += '0123456789';
      if (symChk.checked) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

      if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

      var res = '';
      var randVals = new Uint32Array(len);
      crypto.getRandomValues(randVals);
      for (var i = 0; i < len; i++) {
        res += chars[randVals[i] % chars.length];
      }
      outIn.value = res;

      // Entropy
      var poolSize = chars.length;
      var entropy = len * Math.log2(poolSize);
      var pct = Math.min(100, (entropy / 120) * 100);
      bar.style.width = pct + '%';
      bar.style.background = pct < 40 ? '#ef4444' : pct < 70 ? '#eab308' : '#22c55e';
    }

    lenSlider.oninput = generate;
    [ucChk, lcChk, numChk, symChk].forEach(function(c){ c.onchange = generate; });
    genBtn.onclick = generate;

    copyBtn.onclick = function() {
      navigator.clipboard.writeText(outIn.value);
      MWO.notif.show('Password Generator', 'Copied password to clipboard!');
      playTone(600, 0.1, 'sine', 0.15);
    };

    generate();
  });

  /* --------------------------------------------------------------------
   * 15. CALCULATOR+
   * -------------------------------------------------------------------- */
  reg('mp-calcplus', 'Calculator+', 'Scientific calculator with Shunting-yard evaluator', '🧮', 'utility', function(){
    var w = MWO.wm.create({id:'mp-calc-'+Date.now(), title:'Calculator+', icon:'🧮', width:340, height:440, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;height:100%;background:#090d16;color:#fff;padding:10px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div style='background:#131c2e;padding:10px;border-radius:6px;margin-bottom:10px;text-align:right'>" +
        "<div id='cl-expr' style='font-size:0.85em;color:#64748b;min-height:18px'></div>" +
        "<div id='cl-res' style='font-size:1.8em;font-weight:bold;color:#38bdf8'>0</div>" +
      "</div>" +
      "<div style='display:grid;grid-template-columns:repeat(4,1fr);gap:6px;flex:1'>" +
        "<button class='c-b' data-v='C' style='background:#ef4444;color:#fff'>C</button>" +
        "<button class='c-b' data-v='(' style='background:#334155'>(</button>" +
        "<button class='c-b' data-v=')' style='background:#334155'>)</button>" +
        "<button class='c-b' data-v='/' style='background:#f59e0b;color:#fff'>÷</button>" +
        "<button class='c-b' data-v='sin(' style='background:#1e293b'>sin</button>" +
        "<button class='c-b' data-v='cos(' style='background:#1e293b'>cos</button>" +
        "<button class='c-b' data-v='tan(' style='background:#1e293b'>tan</button>" +
        "<button class='c-b' data-v='*' style='background:#f59e0b;color:#fff'>×</button>" +
        "<button class='c-b' data-v='7'>7</button><button class='c-b' data-v='8'>8</button><button class='c-b' data-v='9'>9</button>" +
        "<button class='c-b' data-v='-' style='background:#f59e0b;color:#fff'>-</button>" +
        "<button class='c-b' data-v='4'>4</button><button class='c-b' data-v='5'>5</button><button class='c-b' data-v='6'>6</button>" +
        "<button class='c-b' data-v='+' style='background:#f59e0b;color:#fff'>+</button>" +
        "<button class='c-b' data-v='1'>1</button><button class='c-b' data-v='2'>2</button><button class='c-b' data-v='3'>3</button>" +
        "<button class='c-b' data-v='=' style='grid-row:span 2;background:#22c55e;color:#fff;font-size:1.4em'>=</button>" +
        "<button class='c-b' data-v='0' style='grid-column:span 2'>0</button><button class='c-b' data-v='.'>.</button>" +
      "</div>" +
    "</div>";

    var exprEl = w.querySelector('#cl-expr'), resEl = w.querySelector('#cl-res');
    var expr = '';

    function evalExpr(eStr) {
      try {
        // Tokenizer and shunting yard evaluator
        var tokens = eStr.replace(/sin\(/g, 's(').replace(/cos\(/g, 'c(').replace(/tan\(/g, 't(').match(/([0-9.]+|[+*\-\/()sct])/g) || [];
        var output = [], ops = [];
        var prec = {'+':1, '-':1, '*':2, '/':2, 's':3, 'c':3, 't':3};

        tokens.forEach(function(tok) {
          if (!isNaN(parseFloat(tok))) output.push(parseFloat(tok));
          else if ('sct'.indexOf(tok) !== -1) ops.push(tok);
          else if (tok === '(') ops.push(tok);
          else if (tok === ')') {
            while (ops.length > 0 && ops[ops.length - 1] !== '(') output.push(ops.pop());
            ops.pop();
            if (ops.length > 0 && 'sct'.indexOf(ops[ops.length - 1]) !== -1) output.push(ops.pop());
          } else {
            while (ops.length > 0 && prec[ops[ops.length - 1]] >= prec[tok]) output.push(ops.pop());
            ops.push(tok);
          }
        });
        while (ops.length > 0) output.push(ops.pop());

        var stack = [];
        output.forEach(function(tok) {
          if (typeof tok === 'number') stack.push(tok);
          else if (tok === 's') stack.push(Math.sin(stack.pop()));
          else if (tok === 'c') stack.push(Math.cos(stack.pop()));
          else if (tok === 't') stack.push(Math.tan(stack.pop()));
          else {
            var b = stack.pop(), a = stack.pop();
            if (tok === '+') stack.push(a + b);
            if (tok === '-') stack.push(a - b);
            if (tok === '*') stack.push(a * b);
            if (tok === '/') stack.push(a / b);
          }
        });
        return stack[0];
      } catch(err) {
        return Error;
      }
    }

    w.querySelectorAll('.c-b').forEach(function(btn) {
      btn.style.padding = '10px'; btn.style.border = 'none'; btn.style.borderRadius = '6px'; btn.style.fontWeight = 'bold'; btn.style.cursor = 'pointer'; btn.style.fontSize = '1em';
      btn.onclick = function() {
        var v = btn.getAttribute('data-v');
        if (v === 'C') { expr = ''; resEl.textContent = '0'; exprEl.textContent = ''; }
        else if (v === '=') {
          var res = evalExpr(expr);
          exprEl.textContent = expr;
          resEl.textContent = typeof res === 'number' && !isNaN(res) ? res : 'Error';
          playTone(600, 0.1, 'sine', 0.15);
        } else {
          expr += v;
          resEl.textContent = expr;
        }
      };
    });
  });

  /* --------------------------------------------------------------------
   * 16. ASTEROIDS
   * -------------------------------------------------------------------- */
  reg('mp-asteroids', 'Asteroids', 'Canvas space shooter with physics & asteroid splitting', '🚀', 'game', function(){
    var w = MWO.wm.create({id:'mp-ast-'+Date.now(), title:'Asteroids', icon:'🚀', width:480, height:420, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#000;color:#fff;padding:4px;box-sizing:border-box'>" +
      "<div style='display:flex;justify-content:space-between;width:100%;padding:4px 8px;font-family:monospace;font-size:0.9em'>" +
        "<div>Score: <span id='ast-sc' style='color:#4ecca3'>0</span></div>" +
        "<div>Lives: <span id='ast-lv' style='color:#e94560'>3</span></div>" +
      "</div>" +
      "<canvas id='ast-cv' width='460' height='340' style='border:1px solid #333;border-radius:4px;'></canvas>" +
      "<div style='font-size:0.75em;color:#888;margin-top:4px'>Arrows/WASD: Rotate & Thrust | Space: Shoot</div>" +
    "</div>";

    var cv = w.querySelector('#ast-cv'), cx = cv.getContext('2d'), scEl = w.querySelector('#ast-sc'), lvEl = w.querySelector('#ast-lv');
    var ship = {x: 230, y: 170, a: 0, rot: 0, thrust: false, vx: 0, vy: 0};
    var asteroids = [], bullets = [], score = 0, lives = 3, keys = {};

    function initGame() {
      asteroids = [];
      for (var i = 0; i < 4; i++) {
        asteroids.push({
          x: Math.random() * 460, y: Math.random() * 340,
          vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
          r: 30
        });
      }
    }

    function onKd(e) {
      if (!w.isConnected) { document.removeEventListener('keydown', onKd); document.removeEventListener('keyup', onKu); return; }
      keys[e.key] = true;
      if (e.key === ' ' || e.key === 'Spacebar') {
        bullets.push({x: ship.x, y: ship.y, vx: Math.cos(ship.a)*6 + ship.vx, vy: Math.sin(ship.a)*6 + ship.vy, life: 40});
        playTone(700, 0.05, 'square', 0.1);
      }
    }
    function onKu(e) { keys[e.key] = false; }

    document.addEventListener('keydown', onKd);
    document.addEventListener('keyup', onKu);

    function loop() {
      if (!w.isConnected) return;

      // Update Ship
      if (keys['ArrowLeft'] || keys['a']) ship.a -= 0.08;
      if (keys['ArrowRight'] || keys['d']) ship.a += 0.08;
      if (keys['ArrowUp'] || keys['w']) {
        ship.vx += Math.cos(ship.a) * 0.15;
        ship.vy += Math.sin(ship.a) * 0.15;
      }
      ship.x = (ship.x + ship.vx + 460) % 460;
      ship.y = (ship.y + ship.vy + 340) % 340;
      ship.vx *= 0.98; ship.vy *= 0.98;

      // Update Bullets
      bullets.forEach(function(b){ b.x = (b.x + b.vx + 460) % 460; b.y = (b.y + b.vy + 340) % 340; b.life--; });
      bullets = bullets.filter(function(b){ return b.life > 0; });

      // Update Asteroids
      asteroids.forEach(function(ast){
        ast.x = (ast.x + ast.vx + 460) % 460;
        ast.y = (ast.y + ast.vy + 340) % 340;
      });

      // Collisions Bullet -> Asteroid
      bullets.forEach(function(b, bi){
        asteroids.forEach(function(ast, ai){
          var dist = Math.hypot(b.x - ast.x, b.y - ast.y);
          if (dist < ast.r) {
            bullets[bi].life = 0;
            if (ast.r > 15) {
              asteroids.push({x: ast.x, y: ast.y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, r: ast.r / 2});
              asteroids.push({x: ast.x, y: ast.y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, r: ast.r / 2});
            }
            asteroids.splice(ai, 1);
            score += 100; scEl.textContent = score;
            playTone(200, 0.1, 'sawtooth', 0.15);
          }
        });
      });

      // Render
      cx.fillStyle = '#000'; cx.fillRect(0,0,460,340);

      // Render Ship
      cx.save(); cx.translate(ship.x, ship.y); cx.rotate(ship.a);
      cx.strokeStyle = '#fff'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(12, 0); cx.lineTo(-10, -8); cx.lineTo(-6, 0); cx.lineTo(-10, 8); cx.closePath(); cx.stroke();
      cx.restore();

      // Render Bullets
      cx.fillStyle = '#e94560';
      bullets.forEach(function(b){ cx.fillRect(b.x-2, b.y-2, 4, 4); });

      // Render Asteroids
      cx.strokeStyle = '#4ecca3';
      asteroids.forEach(function(ast){
        cx.beginPath(); cx.arc(ast.x, ast.y, ast.r, 0, Math.PI*2); cx.stroke();
      });

      requestAnimationFrame(loop);
    }

    initGame();
    loop();
  });

''')

print("Part 7 written.")
