import os, subprocess

with open('mw_web/megapack.js', 'a', encoding='utf-8') as f:
    f.write('''
  /* --------------------------------------------------------------------
   * 6. HANGMAN
   * -------------------------------------------------------------------- */
  reg('mp-hangman', 'Hangman', 'Word guessing game with SVG gallows drawing', '😵', 'game', function(){
    var w = MWO.wm.create({id:'mp-hang-'+Date.now(), title:'Hangman', icon:'😵', width:420, height:440, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#1e1e2e;color:#cdd6f4;padding:10px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div style='display:flex;gap:20px;align-items:center;width:100%;justify-content:center'>" +
        "<svg id='hang-svg' width='120' height='140' style='background:#11111b;border-radius:6px;border:1px solid #313244'>" +
          "<line x1='10' y1='130' x2='110' y2='130' stroke='#89b4fa' stroke-width='4'/>" +
          "<line x1='30' y1='130' x2='30' y2='10' stroke='#89b4fa' stroke-width='4'/>" +
          "<line x1='30' y1='10' x2='80' y2='10' stroke='#89b4fa' stroke-width='4'/>" +
          "<line x1='80' y1='10' x2='80' y2='25' stroke='#f38ba8' stroke-width='3'/>" +
          "<circle id='h-head' cx='80' cy='38' r='12' stroke='#f38ba8' stroke-width='3' fill='none' style='display:none'/>" +
          "<line id='h-body' x1='80' y1='50' x2='80' y2='85' stroke='#f38ba8' stroke-width='3' style='display:none'/>" +
          "<line id='h-larm' x1='80' y1='60' x2='60' y2='75' stroke='#f38ba8' stroke-width='3' style='display:none'/>" +
          "<line id='h-rarm' x1='80' y1='60' x2='100' y2='75' stroke='#f38ba8' stroke-width='3' style='display:none'/>" +
          "<line id='h-lleg' x1='80' y1='85' x2='65' y2='110' stroke='#f38ba8' stroke-width='3' style='display:none'/>" +
          "<line id='h-rleg' x1='80' y1='85' x2='95' y2='110' stroke='#f38ba8' stroke-width='3' style='display:none'/>" +
        "</svg>" +
        "<div style='display:flex;flex-direction:column;gap:6px'>" +
          "<div id='hang-cat' style='font-size:0.8em;color:#a6adc8'>Category: Animals</div>" +
          "<div id='hang-word' style='font-size:1.4em;letter-spacing:4px;font-family:monospace;font-weight:bold;color:#a6e3a1'>_ _ _ _</div>" +
          "<div id='hang-wrong' style='font-size:0.8em;color:#f38ba8'>Wrong: 0 / 6</div>" +
        "</div>" +
      "</div>" +
      "<div id='hang-kbd' style='display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:12px;width:100%'></div>" +
      "<button id='hang-reset' style='margin-top:auto;padding:6px 14px;background:#89b4fa;color:#11111b;border:none;border-radius:4px;cursor:pointer;font-weight:bold'>Next Word</button>" +
    "</div>";

    var WORDS = [
      {word:'ELEPHANT',cat:'Animals'},{word:'COMPUTER',cat:'Tech'},{word:'GALAXY',cat:'Space'},
      {word:'PYRAMID',cat:'History'},{word:'DOLPHIN',cat:'Animals'},{word:'KITCHEN',cat:'Home'},
      {word:'VOLCANO',cat:'Nature'},{word:'PENGUIN',cat:'Animals'},{word:'TELESCOPE',cat:'Space'}
    ];

    var svg = w.querySelector('#hang-svg'), wordEl = w.querySelector('#hang-word'), catEl = w.querySelector('#hang-cat'), wrongEl = w.querySelector('#hang-wrong'), kbdEl = w.querySelector('#hang-kbd'), resetBtn = w.querySelector('#hang-reset');
    var secretObj = {}, guessed = [], wrongCount = 0, gameOver = false;
    var parts = ['#h-head', '#h-body', '#h-larm', '#h-rarm', '#h-lleg', '#h-rleg'];

    function initGame() {
      secretObj = WORDS[Math.floor(Math.random() * WORDS.length)];
      guessed = []; wrongCount = 0; gameOver = false;
      catEl.textContent = 'Category: ' + secretObj.cat;
      wrongEl.textContent = 'Wrong: 0 / 6';
      parts.forEach(function(p){ var el = svg.querySelector(p); if (el) el.style.display = 'none'; });
      renderWord();
      renderKbd();
    }

    function renderWord() {
      var display = '';
      var win = true;
      for (var i = 0; i < secretObj.word.length; i++) {
        var ch = secretObj.word[i];
        if (guessed.indexOf(ch) !== -1) display += ch + ' ';
        else { display += '_ '; win = false; }
      }
      wordEl.textContent = display.trim();

      if (win && !gameOver) {
        gameOver = true;
        wrongEl.textContent = 'YOU SAVED HIM! 🎉';
        wrongEl.style.color = '#a6e3a1';
        playTone(600, 0.3, 'sine', 0.2);
      }
    }

    function renderKbd() {
      kbdEl.innerHTML = '';
      for (var i = 65; i <= 90; i++) {
        var ch = String.fromCharCode(i);
        var btn = document.createElement('button');
        btn.textContent = ch;
        btn.style.padding = '6px'; btn.style.fontSize = '12px'; btn.style.fontWeight = 'bold';
        btn.style.border = 'none'; btn.style.borderRadius = '4px'; btn.style.cursor = 'pointer';
        btn.style.background = guessed.indexOf(ch) !== -1 ? '#313244' : '#45475a';
        btn.style.color = '#cdd6f4';
        if (guessed.indexOf(ch) !== -1) btn.disabled = true;

        (function(letter) {
          btn.onclick = function() { guess(letter); };
        })(ch);

        kbdEl.appendChild(btn);
      }
    }

    function guess(ch) {
      if (gameOver || guessed.indexOf(ch) !== -1) return;
      guessed.push(ch);

      if (secretObj.word.indexOf(ch) === -1) {
        wrongCount++;
        wrongEl.textContent = 'Wrong: ' + wrongCount + ' / 6';
        if (parts[wrongCount - 1]) {
          var el = svg.querySelector(parts[wrongCount - 1]);
          if (el) el.style.display = 'block';
        }
        playTone(200, 0.1, 'sawtooth', 0.1);
        if (wrongCount >= 6) {
          gameOver = true;
          wordEl.textContent = secretObj.word;
          wrongEl.textContent = 'GAME OVER!';
        }
      } else {
        playTone(500, 0.1, 'sine', 0.15);
      }
      renderWord();
      renderKbd();
    }

    resetBtn.onclick = initGame;
    initGame();
  });

  /* --------------------------------------------------------------------
   * 7. SIMON SAYS
   * -------------------------------------------------------------------- */
  reg('mp-simon', 'Simon Says', 'Memory sequence playback with Web Audio tones', '🔔', 'game', function(){
    var w = MWO.wm.create({id:'mp-simon-'+Date.now(), title:'Simon Says', icon:'🔔', width:360, height:420, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#0f172a;color:#fff;padding:12px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div style='display:flex;justify-content:space-between;width:100%;margin-bottom:10px'>" +
        "<div id='sim-score' style='font-size:1.1em;font-weight:bold;color:#38bdf8'>Score: 0</div>" +
        "<div id='sim-high' style='font-size:0.9em;color:#94a3b8'>Best: 0</div>" +
      "</div>" +
      "<div id='sim-grid' style='display:grid;grid-template-columns:1fr 1fr;gap:10px;width:240px;height:240px;margin-bottom:12px'>" +
        "<div id='sim-0' style='background:#15803d;border-radius:12px 0 0 0;cursor:pointer;opacity:0.7'></div>" +
        "<div id='sim-1' style='background:#b91c1c;border-radius:0 12px 0 0;cursor:pointer;opacity:0.7'></div>" +
        "<div id='sim-2' style='background:#a16207;border-radius:0 0 0 12px;cursor:pointer;opacity:0.7'></div>" +
        "<div id='sim-3' style='background:#1d4ed8;border-radius:0 0 12px 0;cursor:pointer;opacity:0.7'></div>" +
      "</div>" +
      "<button id='sim-start' style='padding:8px 20px;background:#38bdf8;color:#0f172a;font-weight:bold;border:none;border-radius:6px;cursor:pointer'>Start Game</button>" +
    "</div>";

    var FREQS = [261.6, 329.6, 392.0, 523.2];
    var scoreEl = w.querySelector('#sim-score'), highEl = w.querySelector('#sim-high'), startBtn = w.querySelector('#sim-start');
    var seq = [], playerIdx = 0, playing = false, isUserTurn = false, score = 0, highScore = 0;

    function flashQuad(id, dur) {
      var el = w.querySelector('#sim-' + id);
      if (!el) return;
      el.style.opacity = '1'; el.style.filter = 'brightness(1.5)';
      playTone(FREQS[id], (dur||300)/1000, 'sine', 0.2);
      setTimeout(function(){
        if (el) { el.style.opacity = '0.7'; el.style.filter = 'none'; }
      }, dur || 300);
    }

    function playSequence() {
      isUserTurn = false; playerIdx = 0;
      var i = 0;
      var timer = setInterval(function() {
        if (!w.isConnected) { clearInterval(timer); return; }
        flashQuad(seq[i], 350);
        i++;
        if (i >= seq.length) {
          clearInterval(timer);
          isUserTurn = true;
        }
      }, 600);
    }

    function nextRound() {
      score = seq.length;
      scoreEl.textContent = 'Score: ' + score;
      if (score > highScore) { highScore = score; highEl.textContent = 'Best: ' + highScore; }
      seq.push(Math.floor(Math.random() * 4));
      playSequence();
    }

    function handleInput(id) {
      if (!isUserTurn || !playing) return;
      flashQuad(id, 200);

      if (seq[playerIdx] === id) {
        playerIdx++;
        if (playerIdx >= seq.length) {
          isUserTurn = false;
          setTimeout(nextRound, 800);
        }
      } else {
        // Game Over
        playTone(120, 0.5, 'sawtooth', 0.3);
        scoreEl.textContent = 'GAME OVER! Score: ' + score;
        playing = false; isUserTurn = false;
        startBtn.style.display = 'block';
      }
    }

    for (var q = 0; q < 4; q++) {
      (function(id) {
        w.querySelector('#sim-' + id).onclick = function() { handleInput(id); };
      })(q);
    }

    startBtn.onclick = function() {
      seq = []; score = 0; playing = true;
      startBtn.style.display = 'none';
      nextRound();
    };
  });

''')

print("Part 4 written.")
