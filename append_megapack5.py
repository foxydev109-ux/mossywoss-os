import os, subprocess

with open('mw_web/megapack.js', 'a', encoding='utf-8') as f:
    f.write('''
  /* --------------------------------------------------------------------
   * 11. METRONOME
   * -------------------------------------------------------------------- */
  reg('mp-metronome', 'Metronome', 'BPM slider, tap tempo, visual pendulum & Web Audio click', '🎵', 'app', function(){
    var w = MWO.wm.create({id:'mp-metro-'+Date.now(), title:'Metronome', icon:'🎵', width:340, height:380, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#111827;color:#f9fafb;padding:12px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div style='font-size:2em;font-weight:bold;color:#60a5fa;' id='met-bpm-txt'>120 BPM</div>" +
      "<canvas id='met-cv' width='200' height='120' style='margin:8px 0;'></canvas>" +
      "<input id='met-slider' type='range' min='40' max='240' value='120' style='width:80%;margin-bottom:10px'/>" +
      "<div style='display:flex;gap:10px;margin-bottom:10px'>" +
        "<button id='met-tap' style='padding:6px 12px;background:#374151;color:#fff;border:none;border-radius:4px;cursor:pointer'>Tap Tempo</button>" +
        "<select id='met-sig' style='padding:6px;background:#374151;color:#fff;border:none;border-radius:4px'>" +
          "<option value='2'>2/4</option><option value='3'>3/4</option><option value='4' selected>4/4</option><option value='6'>6/8</option>" +
        "</select>" +
      "</div>" +
      "<button id='met-toggle' style='padding:10px 24px;background:#2563eb;color:#fff;font-weight:bold;border:none;border-radius:6px;cursor:pointer;font-size:1.1em;'>START</button>" +
    "</div>";

    var cv = w.querySelector('#met-cv'), cx = cv.getContext('2d'), bpmTxt = w.querySelector('#met-bpm-txt'), slider = w.querySelector('#met-slider'), tapBtn = w.querySelector('#met-tap'), sigSel = w.querySelector('#met-sig'), toggleBtn = w.querySelector('#met-toggle');

    var bpm = 120, playing = false, beat = 0, timeSig = 4, timer = null, tapTimes = [], angle = 0, dir = 1;

    function renderPendulum() {
      cx.clearRect(0,0,200,120);
      // Pivot
      cx.beginPath(); cx.arc(100, 10, 6, 0, Math.PI*2); cx.fillStyle = '#9ca3af'; cx.fill();
      // Arm
      var x = 100 + Math.sin(angle) * 80;
      var y = 10 + Math.cos(angle) * 80;
      cx.beginPath(); cx.moveTo(100, 10); cx.lineTo(x, y); cx.strokeStyle = '#60a5fa'; cx.lineWidth = 4; cx.stroke();
      // Weight
      cx.beginPath(); cx.arc(x, y, 10, 0, Math.PI*2); cx.fillStyle = '#ef4444'; cx.fill();
    }

    function tick() {
      if (!w.isConnected) { clearInterval(timer); return; }
      beat = (beat % timeSig) + 1;
      playTone(beat === 1 ? 800 : 400, 0.05, 'sine', 0.2);
      angle = dir * 0.4;
      dir *= -1;
      renderPendulum();
    }

    function startMetro() {
      if (timer) clearInterval(timer);
      beat = 0;
      timer = setInterval(tick, (60 / bpm) * 1000);
      playing = true;
      toggleBtn.textContent = 'STOP'; toggleBtn.style.background = '#dc2626';
    }

    function stopMetro() {
      if (timer) clearInterval(timer);
      playing = false;
      toggleBtn.textContent = 'START'; toggleBtn.style.background = '#2563eb';
      angle = 0; renderPendulum();
    }

    slider.oninput = function() {
      bpm = parseInt(slider.value);
      bpmTxt.textContent = bpm + ' BPM';
      if (playing) startMetro();
    };

    sigSel.onchange = function() {
      timeSig = parseInt(sigSel.value);
      beat = 0;
    };

    tapBtn.onclick = function() {
      var now = Date.now();
      tapTimes.push(now);
      if (tapTimes.length > 4) tapTimes.shift();
      if (tapTimes.length > 1) {
        var diffs = 0;
        for (var i = 1; i < tapTimes.length; i++) diffs += tapTimes[i] - tapTimes[i-1];
        var avg = diffs / (tapTimes.length - 1);
        bpm = Math.min(240, Math.max(40, Math.round(60000 / avg)));
        slider.value = bpm;
        bpmTxt.textContent = bpm + ' BPM';
        if (playing) startMetro();
      }
    };

    toggleBtn.onclick = function() {
      if (playing) stopMetro(); else startMetro();
    };

    renderPendulum();
  });

  /* --------------------------------------------------------------------
   * 12. UNIT CONVERTER
   * -------------------------------------------------------------------- */
  reg('mp-converter', 'Unit Converter', 'Length, mass, temp, speed, volume, data live converter', '📐', 'utility', function(){
    var w = MWO.wm.create({id:'mp-conv-'+Date.now(), title:'Unit Converter', icon:'📐', width:420, height:360, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;height:100%;background:#0f172a;color:#f8fafc;padding:12px;box-sizing:border-box;font-family:sans-serif'>" +
      "<select id='cnv-cat' style='padding:8px;background:#1e293b;color:#38bdf8;border:1px solid #334155;border-radius:6px;font-weight:bold;margin-bottom:12px'>" +
        "<option value='length'>Length (Meters, Miles, Feet...)</option>" +
        "<option value='mass'>Mass (Kg, Pounds, Ounces...)</option>" +
        "<option value='temp'>Temperature (C, F, Kelvin)</option>" +
        "<option value='data'>Data (Bytes, MB, GB, TB)</option>" +
      "</select>" +
      "<div style='display:flex;gap:10px;align-items:center;margin-bottom:12px'>" +
        "<input id='cnv-val' type='number' value='1' style='flex:1;padding:10px;background:#1e293b;border:1px solid #334155;color:#fff;border-radius:6px;font-size:1.1em;'/>" +
        "<select id='cnv-from' style='padding:10px;background:#1e293b;color:#fff;border:1px solid #334155;border-radius:6px'></select>" +
      "</div>" +
      "<div style='text-align:center;font-size:1.2em;color:#94a3b8;margin-bottom:12px'>=</div>" +
      "<div style='display:flex;gap:10px;align-items:center'>" +
        "<input id='cnv-out' type='text' readonly style='flex:1;padding:10px;background:#020617;border:1px solid #334155;color:#38bdf8;border-radius:6px;font-size:1.1em;font-weight:bold;'/>" +
        "<select id='cnv-to' style='padding:10px;background:#1e293b;color:#fff;border:1px solid #334155;border-radius:6px'></select>" +
      "</div>" +
    "</div>";

    var UNITS = {
      length: { 'Meters': 1, 'Kilometers': 1000, 'Centimeters': 0.01, 'Miles': 1609.34, 'Feet': 0.3048, 'Inches': 0.0254 },
      mass: { 'Kilograms': 1, 'Grams': 0.001, 'Pounds': 0.453592, 'Ounces': 0.0283495 },
      data: { 'Bytes': 1, 'KB': 1024, 'MB': 1048576, 'GB': 1073741824, 'TB': 1099511627776 }
    };

    var catSel = w.querySelector('#cnv-cat'), valIn = w.querySelector('#cnv-val'), fromSel = w.querySelector('#cnv-from'), toSel = w.querySelector('#cnv-to'), outIn = w.querySelector('#cnv-out');

    function populateUnits() {
      var cat = catSel.value;
      fromSel.innerHTML = ''; toSel.innerHTML = '';
      if (cat === 'temp') {
        ['Celsius', 'Fahrenheit', 'Kelvin'].forEach(function(u){
          fromSel.innerHTML += "<option value='" + u + "'>" + u + "</option>";
          toSel.innerHTML += "<option value='" + u + "'>" + u + "</option>";
        });
        toSel.selectedIndex = 1;
      } else {
        Object.keys(UNITS[cat]).forEach(function(u, idx){
          fromSel.innerHTML += "<option value='" + u + "'>" + u + "</option>";
          toSel.innerHTML += "<option value='" + u + "'>" + u + "</option>";
        });
        if (toSel.options.length > 1) toSel.selectedIndex = 1;
      }
      convert();
    }

    function convert() {
      var cat = catSel.value;
      var val = parseFloat(valIn.value) || 0;
      var f = fromSel.value, t = toSel.value;

      if (cat === 'temp') {
        var cVal = val;
        if (f === 'Fahrenheit') cVal = (val - 32) * 5 / 9;
        else if (f === 'Kelvin') cVal = val - 273.15;

        var res = cVal;
        if (t === 'Fahrenheit') res = (cVal * 9 / 5) + 32;
        else if (t === 'Kelvin') res = cVal + 273.15;
        outIn.value = res.toFixed(2) + ' °' + t[0];
      } else {
        var base = val * UNITS[cat][f];
        var res = base / UNITS[cat][t];
        outIn.value = res.toLocaleString(undefined, {maximumFractionDigits: 6});
      }
    }

    catSel.onchange = populateUnits;
    valIn.oninput = convert;
    fromSel.onchange = convert;
    toSel.onchange = convert;

    populateUnits();
  });

  /* --------------------------------------------------------------------
   * 13. DICE ROLLER
   * -------------------------------------------------------------------- */
  reg('mp-diceroller', 'Dice Roller', 'D4/D6/D8/D10/D12/D20/D100 & D&D stat roller', '🎲', 'utility', function(){
    var w = MWO.wm.create({id:'mp-dice-'+Date.now(), title:'Dice Roller', icon:'🎲', width:420, height:420, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;height:100%;background:#1e1e2e;color:#cdd6f4;padding:12px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div style='display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px'>" +
        "<button class='d-btn' data-d='4' style='padding:8px;background:#89b4fa;color:#11111b;border:none;border-radius:4px;font-weight:bold;cursor:pointer'>D4</button>" +
        "<button class='d-btn' data-d='6' style='padding:8px;background:#a6e3a1;color:#11111b;border:none;border-radius:4px;font-weight:bold;cursor:pointer'>D6</button>" +
        "<button class='d-btn' data-d='8' style='padding:8px;background:#f9e2af;color:#11111b;border:none;border-radius:4px;font-weight:bold;cursor:pointer'>D8</button>" +
        "<button class='d-btn' data-d='10' style='padding:8px;background:#fab387;color:#11111b;border:none;border-radius:4px;font-weight:bold;cursor:pointer'>D10</button>" +
        "<button class='d-btn' data-d='12' style='padding:8px;background:#cba6f7;color:#11111b;border:none;border-radius:4px;font-weight:bold;cursor:pointer'>D12</button>" +
        "<button class='d-btn' data-d='20' style='padding:8px;background:#f38ba8;color:#11111b;border:none;border-radius:4px;font-weight:bold;cursor:pointer'>D20</button>" +
        "<button class='d-btn' data-d='100' style='padding:8px;background:#94e2d5;color:#11111b;border:none;border-radius:4px;font-weight:bold;cursor:pointer'>D100</button>" +
        "<button id='d-stats' style='padding:8px;background:#f5c2e7;color:#11111b;border:none;border-radius:4px;font-weight:bold;cursor:pointer'>4d6 Drop 1</button>" +
      "</div>" +
      "<div style='display:flex;gap:10px;align-items:center;margin-bottom:10px'>" +
        "<div>Count: <input id='d-count' type='number' min='1' max='20' value='1' style='width:50px;padding:4px;background:#313244;color:#fff;border:1px solid #45475a;border-radius:4px'/></div>" +
        "<div>Modifier: <input id='d-mod' type='number' value='0' style='width:50px;padding:4px;background:#313244;color:#fff;border:1px solid #45475a;border-radius:4px'/></div>" +
      "</div>" +
      "<div id='d-res' style='flex:1;background:#11111b;border-radius:6px;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 2px 5px rgba(0,0,0,0.5)'>" +
        "<div id='d-total' style='font-size:2.5em;font-weight:bold;color:#a6e3a1'>0</div>" +
        "<div id='d-detail' style='font-size:0.85em;color:#a6adc8;margin-top:4px'>Tap a die to roll</div>" +
      "</div>" +
    "</div>";

    var countIn = w.querySelector('#d-count'), modIn = w.querySelector('#d-mod'), totalEl = w.querySelector('#d-total'), detailEl = w.querySelector('#d-detail');

    function rollDice(sides) {
      var count = parseInt(countIn.value) || 1;
      var mod = parseInt(modIn.value) || 0;
      var rolls = [];
      for (var i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);

      var sum = rolls.reduce(function(a,b){ return a+b; }, 0) + mod;
      playTone(500, 0.1, 'triangle', 0.2);

      totalEl.textContent = sum;
      detailEl.textContent = count + 'd' + sides + ' [' + rolls.join(', ') + ']' + (mod !== 0 ? (mod > 0 ? ' +' + mod : ' ' + mod) : '');
    }

    w.querySelectorAll('.d-btn').forEach(function(btn) {
      btn.onclick = function() { rollDice(parseInt(btn.getAttribute('data-d'))); };
    });

    w.querySelector('#d-stats').onclick = function() {
      var stats = [];
      for (var s = 0; s < 6; s++) {
        var r = [Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1];
        r.sort(); r.shift();
        stats.push(r.reduce(function(a,b){return a+b;},0));
      }
      playTone(600, 0.2, 'sine', 0.2);
      totalEl.textContent = stats.join(', ');
      detailEl.textContent = 'D&D 6 Stats (4d6 drop lowest)';
    };
  });

''')

print("Part 6 written.")
