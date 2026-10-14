import os, subprocess

with open('mw_web/megapack.js', 'a', encoding='utf-8') as f:
    f.write('''
  /* --------------------------------------------------------------------
   * 4. SOLITAIRE (Klondike)
   * -------------------------------------------------------------------- */
  reg('mp-solitaire', 'Solitaire', 'Klondike Solitaire card game with drag & tap', '🃏', 'game', function(){
    var w = MWO.wm.create({id:'mp-sol-'+Date.now(), title:'Solitaire', icon:'🃏', width:620, height:480, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;height:100%;background:#065f46;color:#fff;padding:10px;box-sizing:border-box;font-family:sans-serif;user-select:none'>" +
      "<div style='display:flex;justify-content:space-between;margin-bottom:10px'>" +
        "<div style='display:flex;gap:10px'>" +
          "<div id='sol-stock' style='width:50px;height:70px;border:2px dashed #047857;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#064e3b'>🂠</div>" +
          "<div id='sol-waste' style='width:50px;height:70px;border:1px solid #047857;border-radius:4px;display:flex;align-items:center;justify-content:center;'></div>" +
        "</div>" +
        "<div id='sol-status' style='font-size:0.9em;color:#fde047;align-self:center;font-weight:bold'>Tap cards to move</div>" +
        "<div style='display:flex;gap:8px'>" +
          "<div id='sol-f0' class='sol-f' style='width:50px;height:70px;border:2px dashed #047857;border-radius:4px;display:flex;align-items:center;justify-content:center;'>♠</div>" +
          "<div id='sol-f1' class='sol-f' style='width:50px;height:70px;border:2px dashed #047857;border-radius:4px;display:flex;align-items:center;justify-content:center;'>♥</div>" +
          "<div id='sol-f2' class='sol-f' style='width:50px;height:70px;border:2px dashed #047857;border-radius:4px;display:flex;align-items:center;justify-content:center;'>♣</div>" +
          "<div id='sol-f3' class='sol-f' style='width:50px;height:70px;border:2px dashed #047857;border-radius:4px;display:flex;align-items:center;justify-content:center;'>♦</div>" +
        "</div>" +
      "</div>" +
      "<div id='sol-tableau' style='flex:1;display:grid;grid-template-columns:repeat(7,1fr);gap:6px;'></div>" +
      "<button id='sol-reset' style='align-self:center;padding:4px 12px;background:#047857;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-top:4px'>New Deal</button>" +
    "</div>";

    var stockEl = w.querySelector('#sol-stock'), wasteEl = w.querySelector('#sol-waste'), statusEl = w.querySelector('#sol-status'), resetBtn = w.querySelector('#sol-reset'), tableauEl = w.querySelector('#sol-tableau');

    var SUITS = ['S','H','C','D'], SUIT_SYM = {'S':'♠','H':'♥','C':'♣','D':'♦'}, RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    var deck = [], stock = [], waste = [], foundations = [[],[],[],[]], tableau = [[],[],[],[],[],[],[]];
    var selCard = null, selLoc = null;

    function buildDeck() {
      var d = [];
      SUITS.forEach(function(s) {
        RANKS.forEach(function(r, idx) {
          d.push({suit: s, rank: idx + 1, rankStr: r, color: (s==='H'||s==='D')?'red':'black', faceUp: false});
        });
      });
      for (var i = d.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = d[i]; d[i] = d[j]; d[j] = temp;
      }
      return d;
    }

    function initGame() {
      deck = buildDeck(); stock = []; waste = [];
      foundations = [[],[],[],[]];
      tableau = [[],[],[],[],[],[],[]];
      selCard = null; selLoc = null;

      for (var col = 0; col < 7; col++) {
        for (var row = 0; row <= col; row++) {
          var card = deck.pop();
          if (row === col) card.faceUp = true;
          tableau[col].push(card);
        }
      }
      stock = deck;
      render();
    }

    function createCardEl(card, isSel) {
      var el = document.createElement('div');
      el.style.width = '48px'; el.style.height = '68px'; el.style.borderRadius = '4px';
      el.style.display = 'flex'; el.style.flexDirection = 'column'; el.style.alignItems = 'center'; el.style.justifyContent = 'center';
      el.style.fontWeight = 'bold'; el.style.fontSize = '12px'; el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';

      if (!card.faceUp) {
        el.style.background = 'linear-gradient(135deg, #1e3a8a, #3b82f6)';
        el.style.border = '1px solid #60a5fa';
        el.textContent = '🂠';
      } else {
        el.style.background = '#ffffff';
        el.style.color = card.color === 'red' ? '#dc2626' : '#111827';
        el.style.border = isSel ? '2px solid #facc15' : '1px solid #d1d5db';
        el.innerHTML = "<div>" + card.rankStr + "</div><div>" + SUIT_SYM[card.suit] + "</div>";
      }
      return el;
    }

    function render() {
      // Stock & Waste
      stockEl.textContent = stock.length > 0 ? '🂠 (' + stock.length + ')' : '🔄';
      wasteEl.innerHTML = '';
      if (waste.length > 0) {
        var topW = waste[waste.length - 1];
        var isWsel = selLoc && selLoc.type === 'waste';
        wasteEl.appendChild(createCardEl(topW, isWsel));
      }

      // Foundations
      for (var f = 0; f < 4; f++) {
        var fEl = w.querySelector('#sol-f' + f);
        fEl.innerHTML = '';
        var fPile = foundations[f];
        if (fPile.length > 0) {
          var topF = fPile[fPile.length - 1];
          fEl.appendChild(createCardEl(topF, false));
        } else {
          fEl.textContent = SUIT_SYM[SUITS[f]];
        }
      }

      // Tableau
      tableauEl.innerHTML = '';
      for (var c = 0; c < 7; c++) {
        var colDiv = document.createElement('div');
        colDiv.style.display = 'flex'; colDiv.style.flexDirection = 'column'; colDiv.style.gap = '-45px';
        colDiv.style.minHeight = '120px'; colDiv.style.border = '1px dashed rgba(255,255,255,0.1)'; colDiv.style.borderRadius = '4px';

        var colPile = tableau[c];
        if (colPile.length === 0) {
          (function(colIdx) {
            colDiv.onclick = function() { onEmptyTableauClick(colIdx); };
          })(c);
        } else {
          colPile.forEach(function(card, cardIdx) {
            var isSel = selLoc && selLoc.type === 'tab' && selLoc.col === c && selLoc.idx === cardIdx;
            var cEl = createCardEl(card, isSel);
            cEl.style.marginTop = cardIdx === 0 ? '0' : '-45px';
            (function(colIdx, cIdx, cd) {
              cEl.onclick = function(e) {
                e.stopPropagation();
                onTableauCardClick(colIdx, cIdx, cd);
              };
            })(c, cardIdx, card);
            colDiv.appendChild(cEl);
          });
        }
        tableauEl.appendChild(colDiv);
      }
    }

    stockEl.onclick = function() {
      if (stock.length > 0) {
        var card = stock.pop(); card.faceUp = true; waste.push(card);
      } else {
        while (waste.length > 0) {
          var c = waste.pop(); c.faceUp = false; stock.push(c);
        }
      }
      selCard = null; selLoc = null;
      render();
    };

    function onTableauCardClick(col, idx, card) {
      if (!card.faceUp) return;

      if (selCard) {
        // Try move to this card
        if (card.color !== selCard.color && card.rank === selCard.rank + 1) {
          moveSelectedToTableau(col);
          return;
        }
      }

      // Select this card
      selCard = card;
      selLoc = {type: 'tab', col: col, idx: idx};
      render();
    }

    function onEmptyTableauClick(col) {
      if (selCard && selCard.rank === 13) { // King
        moveSelectedToTableau(col);
      }
    }

    function moveSelectedToTableau(destCol) {
      if (!selLoc) return;
      var cardsToMove = [];
      if (selLoc.type === 'waste') {
        cardsToMove.push(waste.pop());
      } else if (selLoc.type === 'tab') {
        cardsToMove = tableau[selLoc.col].splice(selLoc.idx);
        if (tableau[selLoc.col].length > 0) {
          tableau[selLoc.col][tableau[selLoc.col].length - 1].faceUp = true;
        }
      }

      cardsToMove.forEach(function(c) { tableau[destCol].push(c); });
      selCard = null; selLoc = null;
      playTone(350, 0.1, 'sine', 0.1);
      render();
    }

    // Foundation tap support
    for (var f = 0; f < 4; f++) {
      (function(fIdx) {
        w.querySelector('#sol-f' + fIdx).onclick = function() {
          if (!selCard) return;
          var fPile = foundations[fIdx];
          var requiredRank = fPile.length === 0 ? 1 : fPile[fPile.length - 1].rank + 1;
          var requiredSuit = SUITS[fIdx];

          if (selCard.suit === requiredSuit && selCard.rank === requiredRank) {
            if (selLoc.type === 'waste') waste.pop();
            else if (selLoc.type === 'tab') {
              tableau[selLoc.col].pop();
              if (tableau[selLoc.col].length > 0) tableau[selLoc.col][tableau[selLoc.col].length - 1].faceUp = true;
            }
            fPile.push(selCard);
            selCard = null; selLoc = null;
            playTone(550, 0.15, 'triangle', 0.15);
            render();
            checkWin();
          }
        };
      })(f);
    }

    function checkWin() {
      var total = foundations.reduce(function(acc, p){ return acc + p.length; }, 0);
      if (total === 52) {
        statusEl.textContent = 'YOU WIN SOLITAIRE! 🎉';
        playTone(800, 0.5, 'sine', 0.2);
      }
    }

    resetBtn.onclick = initGame;
    initGame();
  });

  /* --------------------------------------------------------------------
   * 5. WORDLE CLONE
   * -------------------------------------------------------------------- */
  reg('mp-wordle', 'Wordle', '5-letter word guess game with dynamic keyboard', '🟩', 'game', function(){
    var w = MWO.wm.create({id:'mp-wordle-'+Date.now(), title:'Wordle', icon:'🟩', width:380, height:480, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#121213;color:#fff;padding:10px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div style='font-size:1.2em;font-weight:bold;letter-spacing:2px;margin-bottom:8px'>WORDLE</div>" +
      "<div id='wd-grid' style='display:grid;grid-template-rows:repeat(6,1fr);gap:4px;margin-bottom:10px'></div>" +
      "<div id='wd-msg' style='font-size:0.85em;color:#e94560;height:20px;font-weight:bold'></div>" +
      "<div id='wd-kbd' style='display:flex;flex-direction:column;gap:4px;width:100%'></div>" +
      "<button id='wd-reset' style='margin-top:auto;padding:6px 12px;background:#538d4e;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold'>New Game</button>" +
    "</div>";

    var WORDS = ['APPLE','BREAD','CRANE','DRIVE','EAGLE','FLAME','GRAPE','HOUSE','IMAGE','JUICE','KNIFE','LEMON','MUSIC','NIGHT','OCEAN','PIANO','QUEEN','RIVER','STORM','TRAIN','UNION','VOICE','WATER','YOUTH','ZEBRA','CLOUD','LIGHT','HEART','EARTH','SMART','CANDY','DREAM','GHOST','MAGIC','POWER','SMILE','WORLD','TIGER','SHARK','BEACH'];
    var gridEl = w.querySelector('#wd-grid'), kbdEl = w.querySelector('#wd-kbd'), msgEl = w.querySelector('#wd-msg'), resetBtn = w.querySelector('#wd-reset');

    var secret = '', guesses = [], curGuess = '', gameOver = false, keyStates = {};

    function initGame() {
      secret = WORDS[Math.floor(Math.random() * WORDS.length)];
      guesses = []; curGuess = ''; gameOver = false; keyStates = {};
      msgEl.textContent = '';
      renderGrid();
      renderKbd();
    }

    function renderGrid() {
      gridEl.innerHTML = '';
      for (var r = 0; r < 6; r++) {
        var row = document.createElement('div');
        row.style.display = 'grid'; row.style.gridTemplateColumns = 'repeat(5,42px)'; row.style.gap = '4px';
        var g = guesses[r] || (r === guesses.length ? curGuess : '');
        for (var c = 0; c < 5; c++) {
          var tile = document.createElement('div');
          tile.style.width = '42px'; tile.style.height = '42px'; tile.style.border = '2px solid #3a3a3c';
          tile.style.display = 'flex'; tile.style.alignItems = 'center'; tile.style.justifyContent = 'center';
          tile.style.fontSize = '18px'; tile.style.fontWeight = 'bold'; tile.style.textTransform = 'uppercase';

          var ch = g[c] || '';
          tile.textContent = ch;

          if (r < guesses.length) {
            var color = '#3a3a3c'; // Gray
            if (secret[c] === ch) color = '#538d4e'; // Green
            else if (secret.includes(ch)) color = '#b59f3b'; // Yellow
            tile.style.background = color;
            tile.style.borderColor = color;
          }
          row.appendChild(tile);
        }
        gridEl.appendChild(row);
      }
    }

    var LAYOUT = [['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['ENTER','Z','X','C','V','B','N','M','BACK']];

    function renderKbd() {
      kbdEl.innerHTML = '';
      LAYOUT.forEach(function(row) {
        var rDiv = document.createElement('div');
        rDiv.style.display = 'flex'; rDiv.style.justifyContent = 'center'; rDiv.style.gap = '3px';
        row.forEach(function(k) {
          var btn = document.createElement('button');
          btn.textContent = k;
          btn.style.padding = '8px 6px'; btn.style.fontSize = k.length > 1 ? '10px' : '12px'; btn.style.fontWeight = 'bold';
          btn.style.border = 'none'; btn.style.borderRadius = '4px'; btn.style.cursor = 'pointer';
          btn.style.background = keyStates[k] || '#818384'; btn.style.color = '#fff';

          btn.onclick = function() { handleKey(k); };
          rDiv.appendChild(btn);
        });
        kbdEl.appendChild(rDiv);
      });
    }

    function handleKey(k) {
      if (gameOver) return;
      if (k === 'ENTER') {
        if (curGuess.length < 5) { msgEl.textContent = 'Not enough letters!'; return; }
        msgEl.textContent = '';
        guesses.push(curGuess);

        // Update key states
        for (var i = 0; i < 5; i++) {
          var ch = curGuess[i];
          if (secret[i] === ch) keyStates[ch] = '#538d4e';
          else if (secret.includes(ch) && keyStates[ch] !== '#538d4e') keyStates[ch] = '#b59f3b';
          else if (!keyStates[ch]) keyStates[ch] = '#3a3a3c';
        }

        if (curGuess === secret) {
          gameOver = true;
          msgEl.style.color = '#538d4e';
          msgEl.textContent = 'SPLENDID! You guessed it!';
          playTone(600, 0.3, 'sine', 0.2);
        } else if (guesses.length === 6) {
          gameOver = true;
          msgEl.textContent = 'GAME OVER! Secret was ' + secret;
        }

        curGuess = '';
        renderGrid();
        renderKbd();
      } else if (k === 'BACK' || k === 'BACKSPACE') {
        curGuess = curGuess.slice(0, -1);
        renderGrid();
      } else if (/^[A-Z]$/.test(k) && curGuess.length < 5) {
        curGuess += k;
        renderGrid();
      }
    }

    function onKeydown(e) {
      if (!w.isConnected) { document.removeEventListener('keydown', onKeydown); return; }
      var k = e.key.toUpperCase();
      if (k === 'ENTER') handleKey('ENTER');
      else if (k === 'BACKSPACE') handleKey('BACK');
      else if (/^[A-Z]$/.test(k)) handleKey(k);
    }
    document.addEventListener('keydown', onKeydown);

    resetBtn.onclick = initGame;
    initGame();
  });

''')

print("Part 3 written.")
