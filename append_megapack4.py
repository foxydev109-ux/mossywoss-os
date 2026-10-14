import os, subprocess

with open('mw_web/megapack.js', 'a', encoding='utf-8') as f:
    f.write('''
  /* --------------------------------------------------------------------
   * 8. TYPING SPEED TEST
   * -------------------------------------------------------------------- */
  reg('mp-typing', 'Typing Speed Test', 'Live WPM & accuracy test with live highlighting', '⌨️', 'game', function(){
    var w = MWO.wm.create({id:'mp-type-'+Date.now(), title:'Typing Test', icon:'⌨️', width:520, height:380, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;height:100%;background:#0d1117;color:#c9d1d9;padding:12px;box-sizing:border-box;font-family:monospace'>" +
      "<div style='display:flex;justify-content:space-between;margin-bottom:10px;background:#161b22;padding:8px 12px;border-radius:6px'>" +
        "<div>Timer: <span id='typ-timer' style='color:#58a6ff;font-weight:bold'>60s</span></div>" +
        "<div>WPM: <span id='typ-wpm' style='color:#3fb950;font-weight:bold'>0</span></div>" +
        "<div>Accuracy: <span id='typ-acc' style='color:#f0883e;font-weight:bold'>100%</span></div>" +
      "</div>" +
      "<div id='typ-sample' style='flex:1;background:#161b22;padding:12px;border-radius:6px;font-size:1.1em;line-height:1.6;overflow-y:auto;white-space:pre-wrap;'></div>" +
      "<input id='typ-input' type='text' placeholder='Start typing here...' style='margin-top:10px;padding:10px;background:#0d1117;border:1px solid #30363d;color:#fff;border-radius:6px;font-family:monospace;font-size:1em;'/>" +
      "<button id='typ-reset' style='margin-top:8px;padding:6px;background:#238636;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold'>Restart Test</button>" +
    "</div>";

    var SAMPLES = [
      "The quick brown fox jumps over the lazy dog. Technology empowers human imagination and creativity.",
      "MossyWoss OS is a virtual web operating system designed for speed, beauty, and complete self-containment.",
      "JavaScript continues to be one of the most flexible and widely deployed programming languages in history."
    ];

    var timerEl = w.querySelector('#typ-timer'), wpmEl = w.querySelector('#typ-wpm'), accEl = w.querySelector('#typ-acc'), sampleEl = w.querySelector('#typ-sample'), inputEl = w.querySelector('#typ-input'), resetBtn = w.querySelector('#typ-reset');

    var text = '', timeLeft = 60, timer = null, started = false, correctChars = 0, totalTyped = 0;

    function initTest() {
      if (timer) clearInterval(timer);
      text = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
      timeLeft = 60; started = false; correctChars = 0; totalTyped = 0;
      timerEl.textContent = '60s'; wpmEl.textContent = '0'; accEl.textContent = '100%';
      inputEl.value = ''; inputEl.disabled = false;
      renderSample('');
      inputEl.focus();
    }

    function renderSample(typed) {
      sampleEl.innerHTML = '';
      correctChars = 0;
      for (var i = 0; i < text.length; i++) {
        var span = document.createElement('span');
        span.textContent = text[i];
        if (i < typed.length) {
          if (typed[i] === text[i]) {
            span.style.color = '#3fb950'; // green
            correctChars++;
          } else {
            span.style.color = '#f85149'; // red
            span.style.textDecoration = 'underline';
          }
        } else if (i === typed.length) {
          span.style.background = '#58a6ff'; // cursor
          span.style.color = '#0d1117';
        }
        sampleEl.appendChild(span);
      }
    }

    inputEl.oninput = function() {
      var typed = inputEl.value;
      totalTyped = typed.length;
      if (!started && totalTyped > 0) {
        started = true;
        timer = setInterval(function() {
          if (!w.isConnected) { clearInterval(timer); return; }
          timeLeft--;
          timerEl.textContent = timeLeft + 's';
          var elapsed = (60 - timeLeft) / 60;
          var wpm = Math.round((correctChars / 5) / elapsed);
          var acc = Math.round((correctChars / (totalTyped || 1)) * 100);
          wpmEl.textContent = isNaN(wpm) ? '0' : wpm;
          accEl.textContent = isNaN(acc) ? '100%' : acc + '%';

          if (timeLeft <= 0) {
            clearInterval(timer);
            inputEl.disabled = true;
            playTone(600, 0.3, 'sine', 0.2);
          }
        }, 1000);
      }

      renderSample(typed);
    };

    resetBtn.onclick = initTest;
    initTest();
  });

  /* --------------------------------------------------------------------
   * 9. FLASHCARDS
   * -------------------------------------------------------------------- */
  reg('mp-flashcards', 'Flashcards', 'Create, study, and flip card decks saved to VFS', '🎴', 'app', function(){
    var w = MWO.wm.create({id:'mp-flash-'+Date.now(), title:'Flashcards', icon:'🎴', width:480, height:400, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;height:100%;background:#1e1e2e;color:#cdd6f4;padding:12px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px'>" +
        "<div style='font-size:1.1em;font-weight:bold;color:#89b4fa'>Flashcard Decks</div>" +
        "<button id='fl-save' style='padding:4px 10px;background:#a6e3a1;color:#11111b;border:none;border-radius:4px;cursor:pointer;font-weight:bold'>Save Deck</button>" +
      "</div>" +
      "<div id='fl-card' style='flex:1;background:#313244;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;cursor:pointer;text-align:center;box-shadow:0 4px 10px rgba(0,0,0,0.3);margin-bottom:10px'>" +
        "<div id='fl-side' style='font-size:0.8em;color:#f5c2e7;margin-bottom:8px'>FRONT (Click to Flip)</div>" +
        "<div id='fl-text' style='font-size:1.3em;font-weight:bold'>Loading deck...</div>" +
      "</div>" +
      "<div style='display:flex;justify-content:space-between;align-items:center'>" +
        "<button id='fl-prev' style='padding:6px 12px;background:#45475a;color:#fff;border:none;border-radius:4px;cursor:pointer'>◄ Prev</button>" +
        "<div id='fl-count' style='font-size:0.9em;color:#a6adc8'>1 / 3</div>" +
        "<button id='fl-next' style='padding:6px 12px;background:#45475a;color:#fff;border:none;border-radius:4px;cursor:pointer'>Next ►</button>" +
      "</div>" +
    "</div>";

    var cardEl = w.querySelector('#fl-card'), sideEl = w.querySelector('#fl-side'), textEl = w.querySelector('#fl-text'), countEl = w.querySelector('#fl-count'), prevBtn = w.querySelector('#fl-prev'), nextBtn = w.querySelector('#fl-next'), saveBtn = w.querySelector('#fl-save');

    var defaultDeck = [
      {front: 'What is Web Audio API?', back: 'A high-level JS API for processing and synthesizing audio in web applications.'},
      {front: 'What is VFS?', back: 'Virtual File System simulating directories and files in browser storage.'},
      {front: 'What is IndexedDB?', back: 'A low-level API for client-side storage of significant amounts of structured data.'}
    ];

    var deck = defaultDeck, curIdx = 0, isFront = true;

    async function loadDeck() {
      try {
        var content = await MWO.fs.readFile('/Documents/decks.json');
        deck = JSON.parse(content);
      } catch(e) {
        deck = defaultDeck;
      }
      curIdx = 0; isFront = true;
      renderCard();
    }

    function renderCard() {
      if (!deck || deck.length === 0) return;
      var card = deck[curIdx];
      sideEl.textContent = isFront ? 'FRONT (Click to Flip)' : 'BACK (Answer)';
      textEl.textContent = isFront ? card.front : card.back;
      countEl.textContent = (curIdx + 1) + ' / ' + deck.length;
    }

    cardEl.onclick = function() {
      isFront = !isFront;
      playTone(400, 0.05, 'sine', 0.1);
      renderCard();
    };

    prevBtn.onclick = function() {
      if (curIdx > 0) { curIdx--; isFront = true; renderCard(); }
    };

    nextBtn.onclick = function() {
      if (curIdx < deck.length - 1) { curIdx++; isFront = true; renderCard(); }
    };

    saveBtn.onclick = async function() {
      await MWO.fs.writeFile('/Documents/decks.json', JSON.stringify(deck, null, 2));
      MWO.notif.show('Flashcards', 'Deck saved to /Documents/decks.json');
    };

    loadDeck();
  });

  /* --------------------------------------------------------------------
   * 10. POMODORO TIMER
   * -------------------------------------------------------------------- */
  reg('mp-pomodoro', 'Pomodoro Timer', '25/5 work/break timer with canvas arc ring & Web Audio chime', '⏱️', 'app', function(){
    var w = MWO.wm.create({id:'mp-pomo-'+Date.now(), title:'Pomodoro Timer', icon:'⏱️', width:340, height:420, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#181825;color:#cdd6f4;padding:12px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div id='pm-mode' style='font-size:1.1em;font-weight:bold;color:#f38ba8;margin-bottom:8px'>WORK SESSION</div>" +
      "<canvas id='pm-cv' width='200' height='200' style='margin-bottom:12px'></canvas>" +
      "<div style='display:flex;gap:10px;margin-bottom:10px'>" +
        "<button id='pm-start' style='padding:8px 16px;background:#a6e3a1;color:#11111b;border:none;border-radius:6px;cursor:pointer;font-weight:bold'>Start</button>" +
        "<button id='pm-pause' style='padding:8px 16px;background:#f9e2af;color:#11111b;border:none;border-radius:6px;cursor:pointer;font-weight:bold'>Pause</button>" +
        "<button id='pm-reset' style='padding:8px 16px;background:#f38ba8;color:#11111b;border:none;border-radius:6px;cursor:pointer;font-weight:bold'>Reset</button>" +
      "</div>" +
      "<div id='pm-count' style='font-size:0.85em;color:#a6adc8'>Completed Pomodoros: 🍅 0</div>" +
    "</div>";

    var cv = w.querySelector('#pm-cv'), cx = cv.getContext('2d'), modeEl = w.querySelector('#pm-mode'), countEl = w.querySelector('#pm-count'), startBtn = w.querySelector('#pm-start'), pauseBtn = w.querySelector('#pm-pause'), resetBtn = w.querySelector('#pm-reset');

    var workTime = 25 * 60, breakTime = 5 * 60, totalTime = workTime, timeLeft = workTime, isWork = true, running = false, timer = null, sessions = 0;

    function renderArc() {
      cx.clearRect(0,0,200,200);
      var cxCenter = 100, cyCenter = 100, radius = 80;

      // Background track
      cx.beginPath(); cx.arc(cxCenter, cyCenter, radius, 0, Math.PI * 2);
      cx.strokeStyle = '#313244'; cx.lineWidth = 12; cx.stroke();

      // Progress arc
      var pct = timeLeft / totalTime;
      cx.beginPath(); cx.arc(cxCenter, cyCenter, radius, -Math.PI/2, -Math.PI/2 + (pct * Math.PI * 2), false);
      cx.strokeStyle = isWork ? '#f38ba8' : '#89b4fa'; cx.lineWidth = 12; cx.lineCap = 'round'; cx.stroke();

      // Time Text
      var m = Math.floor(timeLeft / 60), s = timeLeft % 60;
      var str = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      cx.fillStyle = '#cdd6f4'; cx.font = 'bold 32px monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(str, cxCenter, cyCenter);
    }

    function startTimer() {
      if (running) return;
      running = true;
      timer = setInterval(function() {
        if (!w.isConnected) { clearInterval(timer); return; }
        if (timeLeft > 0) {
          timeLeft--;
          renderArc();
        } else {
          clearInterval(timer); running = false;
          playTone(800, 0.5, 'sine', 0.3);
          if (isWork) {
            sessions++;
            countEl.textContent = 'Completed Pomodoros: 🍅 ' + sessions;
            MWO.notif.show('Pomodoro', 'Work phase done! Take a break.');
            isWork = false; totalTime = breakTime; timeLeft = breakTime;
            modeEl.textContent = 'BREAK TIME'; modeEl.style.color = '#89b4fa';
          } else {
            MWO.notif.show('Pomodoro', 'Break done! Back to work.');
            isWork = true; totalTime = workTime; timeLeft = workTime;
            modeEl.textContent = 'WORK SESSION'; modeEl.style.color = '#f38ba8';
          }
          renderArc();
        }
      }, 1000);
    }

    startBtn.onclick = startTimer;
    pauseBtn.onclick = function() { clearInterval(timer); running = false; };
    resetBtn.onclick = function() {
      clearInterval(timer); running = false;
      isWork = true; totalTime = workTime; timeLeft = workTime;
      modeEl.textContent = 'WORK SESSION'; modeEl.style.color = '#f38ba8';
      renderArc();
    };

    renderArc();
  });

''')

print("Part 5 written.")
