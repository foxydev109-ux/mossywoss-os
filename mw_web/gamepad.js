/* Game Pad: on-screen controller for keyboard-only games.
   Dispatches genuine KeyboardEvents on document, so every game that
   listens for keydown/keyup (Serpent, Blockfall, Paddle Duel, the
   MegaPack games, ...) becomes playable on touch devices. */
(function(MWO) {
  'use strict';
  MWO.registerApp({
    id: 'gamepad',
    name: 'Game Pad',
    description: 'On-screen D-pad + buttons for games without touch controls. Open it next to any game.',
    icon: 'gamepad',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'gamepad-' + Date.now(), title: 'Game Pad', icon: 'gamepad', width: 400, height: 460, resizable: true });
      var body = win;
      body.style.background = '#141826';
      body.innerHTML = `
        <div style="padding:10px 14px;font-size:0.8em;color:#9aa4b8">
          Works with any game that uses keyboard controls. Hold buttons like you would hold keys.
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 18px 8px 18px">
          <div style="position:relative;width:150px;height:150px" id="gp-dpad">
            <button class="gp-b" data-key="ArrowUp" data-code="ArrowUp" style="position:absolute;left:50px;top:0;width:50px;height:50px">^</button>
            <button class="gp-b" data-key="ArrowLeft" data-code="ArrowLeft" style="position:absolute;left:0;top:50px;width:50px;height:50px">&lt;</button>
            <button class="gp-b" data-key="ArrowDown" data-code="ArrowDown" style="position:absolute;left:50px;top:100px;width:50px;height:50px">v</button>
            <button class="gp-b" data-key="ArrowRight" data-code="ArrowRight" style="position:absolute;left:100px;top:50px;width:50px;height:50px">&gt;</button>
          </div>
          <div style="position:relative;width:140px;height:170px">
            <button class="gp-b" data-key=" " data-code="Space" style="position:absolute;left:35px;top:0;width:70px;height:50px;border-radius:40px">SPACE</button>
            <button class="gp-b" data-key="z" data-code="KeyZ" style="position:absolute;left:0;top:60px;width:60px;height:50px;border-radius:50%">Z</button>
            <button class="gp-b" data-key="x" data-code="KeyX" style="position:absolute;left:75px;top:60px;width:60px;height:50px;border-radius:50%">X</button>
            <button class="gp-b" data-key="Enter" data-code="Enter" style="position:absolute;left:30px;top:120px;width:80px;height:38px">ENTER</button>
          </div>
        </div>
        <div style="text-align:center;padding-top:6px">
          <label style="font-size:0.75em;color:#9aa4b8"><input type="checkbox" id="gp-sticky" /> hold-drag mode (keys stay pressed while your finger is down)</label>
        </div>
      `;
      var styleEl = document.createElement('style');
      styleEl.textContent = '.gp-b{background:#232a3f;border:1px solid #3a4460;color:#e7ecf7;border-radius:10px;font-size:15px;font-weight:bold;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}'
        + '.gp-b:active,.gp-b.pressed{background:#2e7d4f;border-color:#2e7d4f;color:#fff}';
      body.appendChild(styleEl);
      body.querySelectorAll('.gp-b').forEach(function(b) {
        var fire = function(type) {
          document.dispatchEvent(new KeyboardEvent(type, { key: b.getAttribute('data-key'), code: b.getAttribute('data-code'), bubbles: true, cancelable: true }));
        };
        var down = function(e) { e.preventDefault(); b.classList.add('pressed'); fire('keydown'); };
        var up = function(e) { if (e) e.preventDefault(); b.classList.remove('pressed'); fire('keyup'); };
        b.addEventListener('touchstart', down, { passive: false });
        b.addEventListener('touchend', up);
        b.addEventListener('touchcancel', up);
        b.addEventListener('mousedown', down);
        b.addEventListener('mouseup', up);
        b.addEventListener('mouseleave', function() { if (b.classList.contains('pressed')) up(); });
      });
      return win;
    }
  });
})(MWO);
