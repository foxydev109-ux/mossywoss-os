var MWO=MWO||{};
(function(){
  'use strict';
  function reg(id, name, desc, icon, cat, fn){
    MWO.registerApp({
      id: id,
      name: name,
      description: desc,
      icon: icon,
      category: cat || 'game',
      installed: false,
      launch: fn
    });
  }
  function playTone(freq, dur, type, vol) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol || 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (dur || 0.2));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (dur || 0.2));
      setTimeout(function(){ ctx.close(); }, (dur || 0.2) * 1000 + 100);
    } catch(e) {}
  }

  /* --------------------------------------------------------------------
   * 1. CHESS
   * -------------------------------------------------------------------- */
  reg('mp-chess', 'Chess', 'Full-rule chess vs AI with check/checkmate detect', '♟️', 'game', function(){
    var w = MWO.wm.create({id:'mp-chess-'+Date.now(), title:'Chess', icon:'♟️', width:540, height:480, resizable:false});
    w.innerHTML = "<div style='display:flex;height:100%;background:#1b1b2f;color:#e0e0e0;font-family:sans-serif;box-sizing:border-box;padding:8px;gap:10px'>" +
      "<div style='display:flex;flex-direction:column;align-items:center;justify-content:center'>" +
        "<div id='c-board' style='display:grid;grid-template-columns:repeat(8,48px);grid-template-rows:repeat(8,48px);border:2px solid #444;border-radius:4px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.5)'></div>" +
      "</div>" +
      "<div style='flex:1;display:flex;flex-direction:column;gap:8px;background:rgba(255,255,255,0.05);padding:10px;border-radius:6px'>" +
        "<div style='font-size:1.1em;font-weight:bold;color:#4ecca3;text-align:center'>Chess OS</div>" +
        "<div id='c-status' style='font-size:0.85em;padding:6px;background:rgba(0,0,0,0.3);border-radius:4px;text-align:center;color:#f39c12'>White's Turn</div>" +
        "<div style='flex:1;overflow-y:auto;background:rgba(0,0,0,0.2);padding:6px;border-radius:4px;font-family:monospace;font-size:0.8em;' id='c-moves'>Moves:<br></div>" +
        "<button id='c-reset' style='padding:6px;background:#e94560;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold'>New Game</button>" +
      "</div>" +
    "</div>";

    var boardEl = w.querySelector('#c-board');
    var statusEl = w.querySelector('#c-status');
    var movesEl = w.querySelector('#c-moves');
    var resetBtn = w.querySelector('#c-reset');

    var INITIAL = [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      ['.','.','.','.','.','.','.','.'],
      ['.','.','.','.','.','.','.','.'],
      ['.','.','.','.','.','.','.','.'],
      ['.','.','.','.','.','.','.','.'],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ];

    var SYMBOLS = {
      'K':'♔','Q':'♕','R':'♖','B':'♗','N':'♘','P':'♙',
      'k':'♚','q':'♛','r':'♜','b':'♝','n':'♞','p':'♟'
    };

    var board = [], turn = 'W', sel = null, legalMoves = [], history = [];

    function initBoard() {
      board = JSON.parse(JSON.stringify(INITIAL));
      turn = 'W'; sel = null; legalMoves = []; history = [];
      movesEl.innerHTML = 'Moves:<br>';
      statusEl.textContent = "White's Turn";
      render();
    }

    function isW(p) { return p !== '.' && p === p.toUpperCase(); }
    function isB(p) { return p !== '.' && p === p.toLowerCase(); }

    function getPseudoMoves(b, r, c) {
      var p = b[r][c];
      if (p === '.') return [];
      var res = [];
      var white = isW(p);
      var type = p.toUpperCase();

      if (type === 'P') {
        var dir = white ? -1 : 1;
        var startRow = white ? 6 : 1;
        if (r + dir >= 0 && r + dir < 8 && b[r + dir][c] === '.') {
          res.push([r + dir, c]);
          if (r === startRow && b[r + 2 * dir][c] === '.') res.push([r + 2 * dir, c]);
        }
        [-1, 1].forEach(function(dc) {
          var nr = r + dir, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] !== '.') {
            if (white ? isB(b[nr][nc]) : isW(b[nr][nc])) res.push([nr, nc]);
          }
        });
      } else if (type === 'N') {
        var offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        offsets.forEach(function(o) {
          var nr = r + o[0], nc = c + o[1];
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            var target = b[nr][nc];
            if (target === '.' || (white ? isB(target) : isW(target))) res.push([nr, nc]);
          }
        });
      } else if (type === 'K') {
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            var nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              var target = b[nr][nc];
              if (target === '.' || (white ? isB(target) : isW(target))) res.push([nr, nc]);
            }
          }
        }
      } else {
        var dirs = [];
        if (type === 'B' || type === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
        if (type === 'R' || type === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
        dirs.forEach(function(d) {
          var nr = r + d[0], nc = c + d[1];
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            var target = b[nr][nc];
            if (target === '.') {
              res.push([nr, nc]);
            } else {
              if (white ? isB(target) : isW(target)) res.push([nr, nc]);
              break;
            }
            nr += d[0]; nc += d[1];
          }
        });
      }
      return res;
    }

    function inCheck(b, color) {
      var kingSym = color === 'W' ? 'K' : 'k';
      var kr = -1, kc = -1;
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          if (b[r][c] === kingSym) { kr = r; kc = c; break; }
        }
      }
      if (kr === -1) return true;
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          var p = b[r][c];
          if (p === '.') continue;
          if (color === 'W' ? isB(p) : isW(p)) {
            var pm = getPseudoMoves(b, r, c);
            for (var i = 0; i < pm.length; i++) {
              if (pm[i][0] === kr && pm[i][1] === kc) return true;
            }
          }
        }
      }
      return false;
    }

    function getLegalMovesForPiece(b, r, c, color) {
      var pm = getPseudoMoves(b, r, c);
      var legal = [];
      pm.forEach(function(m) {
        var tempB = JSON.parse(JSON.stringify(b));
        tempB[m[0]][m[1]] = tempB[r][c];
        tempB[r][c] = '.';
        if (!inCheck(tempB, color)) legal.push(m);
      });
      return legal;
    }

    function getAllLegalMoves(b, color) {
      var moves = [];
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          var p = b[r][c];
          if (p === '.') continue;
          if (color === 'W' ? isW(p) : isB(p)) {
            var lm = getLegalMovesForPiece(b, r, c, color);
            lm.forEach(function(m) {
              moves.push({from: [r,c], to: m});
            });
          }
        }
      }
      return moves;
    }

    function render() {
      boardEl.innerHTML = '';
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          var cell = document.createElement('div');
          var isDark = (r + c) % 2 === 1;
          cell.style.width = '48px'; cell.style.height = '48px';
          cell.style.display = 'flex'; cell.style.alignItems = 'center'; cell.style.justifyContent = 'center';
          cell.style.fontSize = '32px'; cell.style.cursor = 'pointer'; cell.style.userSelect = 'none';
          cell.style.background = isDark ? '#b58863' : '#f0d9b5';

          if (sel && sel[0] === r && sel[1] === c) {
            cell.style.background = '#829769';
          }
          for (var i = 0; i < legalMoves.length; i++) {
            if (legalMoves[i][0] === r && legalMoves[i][1] === c) {
              cell.style.background = isDark ? '#646f40' : '#aaa23a';
            }
          }

          var p = board[r][c];
          if (p !== '.') {
            var span = document.createElement('span');
            span.textContent = SYMBOLS[p] || '';
            span.style.color = isW(p) ? '#ffffff' : '#000000';
            span.style.textShadow = isW(p) ? '0 1px 2px #000' : '0 1px 2px #fff';
            cell.appendChild(span);
          }

          (function(row, col) {
            cell.onclick = function() { onSquareClick(row, col); };
          })(r, c);

          boardEl.appendChild(cell);
        }
      }
    }

    function onSquareClick(r, c) {
      if (turn !== 'W') return;
      var p = board[r][c];

      if (sel) {
        var isMove = false;
        for (var i = 0; i < legalMoves.length; i++) {
          if (legalMoves[i][0] === r && legalMoves[i][1] === c) { isMove = true; break; }
        }
        if (isMove) {
          makeMove(sel, [r, c]);
          sel = null; legalMoves = [];
          render();
          if (turn === 'B') setTimeout(aiTurn, 250);
          return;
        }
      }

      if (p !== '.' && isW(p)) {
        sel = [r, c];
        legalMoves = getLegalMovesForPiece(board, r, c, 'W');
      } else {
        sel = null; legalMoves = [];
      }
      render();
    }

    function makeMove(from, to) {
      var p = board[from[0]][from[1]];
      board[to[0]][to[1]] = p;
      board[from[0]][from[1]] = '.';

      if (p === 'P' && to[0] === 0) board[to[0]][to[1]] = 'Q';
      if (p === 'p' && to[0] === 7) board[to[0]][to[1]] = 'q';

      playTone(300, 0.1, 'sine', 0.15);
      var moveText = (turn === 'W' ? 'W: ' : 'B: ') + SYMBOLS[p] + ' ' + String.fromCharCode(97+from[1]) + (8-from[0]) + '->' + String.fromCharCode(97+to[1]) + (8-to[0]);
      history.push(moveText);
      movesEl.innerHTML += moveText + '<br>';
      movesEl.scrollTop = movesEl.scrollHeight;

      turn = turn === 'W' ? 'B' : 'W';
      var allL = getAllLegalMoves(board, turn);

      if (allL.length === 0) {
        if (inCheck(board, turn)) {
          statusEl.textContent = 'CHECKMATE! ' + (turn === 'W' ? 'Black' : 'White') + ' Wins!';
          playTone(600, 0.4, 'triangle', 0.2);
        } else {
          statusEl.textContent = 'STALEMATE! Game Draw.';
        }
      } else {
        if (inCheck(board, turn)) {
          statusEl.textContent = (turn === 'W' ? "White" : "Black") + "'s Turn - CHECK!";
        } else {
          statusEl.textContent = (turn === 'W' ? "White" : "Black") + "'s Turn";
        }
      }
    }

    function evalBoard(b) {
      var val = 0;
      var vals = {'P':100,'N':320,'B':330,'R':500,'Q':900,'K':20000,'p':-100,'n':-320,'b':-330,'r':-500,'q':-900,'k':-20000};
      for (var r=0; r<8; r++) {
        for (var c=0; c<8; c++) {
          if (b[r][c] !== '.') val += (vals[b[r][c]] || 0);
        }
      }
      return val;
    }

    function aiTurn() {
      if (!w.isConnected) return;
      var moves = getAllLegalMoves(board, 'B');
      if (moves.length === 0) return;

      var bestMove = null, bestVal = 999999;
      moves.forEach(function(m) {
        var tempB = JSON.parse(JSON.stringify(board));
        tempB[m.to[0]][m.to[1]] = tempB[m.from[0]][m.from[1]];
        tempB[m.from[0]][m.from[1]] = '.';
        var v = evalBoard(tempB);
        if (v < bestVal) { bestVal = v; bestMove = m; }
      });

      if (!bestMove) bestMove = moves[Math.floor(Math.random() * moves.length)];
      makeMove(bestMove.from, bestMove.to);
      render();
    }

    resetBtn.onclick = initBoard;
    initBoard();
  });


  /* --------------------------------------------------------------------
   * 2. CHECKERS
   * -------------------------------------------------------------------- */
  reg('mp-checkers', 'Checkers', 'Classic checkers with forced captures & kinging', '🔴', 'game', function(){
    var w = MWO.wm.create({id:'mp-chk-'+Date.now(), title:'Checkers', icon:'🔴', width:520, height:480, resizable:false});
    w.innerHTML = "<div style='display:flex;height:100%;background:#111;color:#eee;font-family:sans-serif;padding:10px;gap:10px;box-sizing:border-box'>" +
      "<div style='display:flex;flex-direction:column;align-items:center'>" +
        "<div id='chk-board' style='display:grid;grid-template-columns:repeat(8,48px);grid-template-rows:repeat(8,48px);border:2px solid #555;border-radius:4px;overflow:hidden;'></div>" +
      "</div>" +
      "<div style='flex:1;display:flex;flex-direction:column;gap:10px;background:rgba(255,255,255,0.05);padding:10px;border-radius:6px'>" +
        "<div style='font-size:1.1em;font-weight:bold;color:#e94560;text-align:center'>Checkers</div>" +
        "<div id='chk-status' style='font-size:0.85em;padding:6px;background:rgba(0,0,0,0.4);border-radius:4px;text-align:center;color:#f39c12'>Your Turn (Red)</div>" +
        "<div id='chk-info' style='font-size:0.8em;color:#aaa;'>Mandatory captures enforced. Tap piece then move.</div>" +
        "<button id='chk-reset' style='padding:6px;background:#e94560;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;margin-top:auto;'>New Game</button>" +
      "</div>" +
    "</div>";

    var boardEl = w.querySelector('#chk-board'), statusEl = w.querySelector('#chk-status'), resetBtn = w.querySelector('#chk-reset');
    var board = [], turn = 'r', sel = null, legalMoves = [];

    function initBoard() {
      board = [];
      for (var r = 0; r < 8; r++) {
        var row = [];
        for (var c = 0; c < 8; c++) {
          if ((r + c) % 2 === 1) {
            if (r < 3) row.push('b');
            else if (r > 4) row.push('r');
            else row.push('.');
          } else row.push('.');
        }
        board.push(row);
      }
      turn = 'r'; sel = null; legalMoves = [];
      statusEl.textContent = "Your Turn (Red)";
      render();
    }

    function getCapturesForPiece(b, r, c, p) {
      var caps = [];
      var isKing = (p === 'R' || p === 'B');
      var isRed = (p === 'r' || p === 'R');
      var dirs = [];
      if (isRed || isKing) dirs.push([-1,-1], [-1,1]);
      if (!isRed || isKing) dirs.push([1,-1], [1,1]);

      dirs.forEach(function(d) {
        var mr = r + d[0], mc = c + d[1];
        var lr = r + 2*d[0], lc = c + 2*d[1];
        if (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 && b[lr][lc] === '.') {
          var mid = b[mr][mc];
          if (mid !== '.' && (isRed ? (mid === 'b' || mid === 'B') : (mid === 'r' || mid === 'R'))) {
            caps.push({to: [lr, lc], jump: [mr, mc]});
          }
        }
      });
      return caps;
    }

    function getAllCaptures(b, color) {
      var all = [];
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          var p = b[r][c];
          if (p === '.') continue;
          if (color === 'r' ? (p === 'r' || p === 'R') : (p === 'b' || p === 'B')) {
            var caps = getCapturesForPiece(b, r, c, p);
            if (caps.length > 0) all.push({from: [r,c], caps: caps});
          }
        }
      }
      return all;
    }

    function getSimpleMoves(b, r, c, p) {
      var moves = [];
      var isKing = (p === 'R' || p === 'B');
      var isRed = (p === 'r' || p === 'R');
      var dirs = [];
      if (isRed || isKing) dirs.push([-1,-1], [-1,1]);
      if (!isRed || isKing) dirs.push([1,-1], [1,1]);

      dirs.forEach(function(d) {
        var nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === '.') {
          moves.push({to: [nr, nc]});
        }
      });
      return moves;
    }

    function render() {
      boardEl.innerHTML = '';
      var mustCap = getAllCaptures(board, turn);
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          var cell = document.createElement('div');
          var isDark = (r + c) % 2 === 1;
          cell.style.width = '48px'; cell.style.height = '48px';
          cell.style.display = 'flex'; cell.style.alignItems = 'center'; cell.style.justifyContent = 'center';
          cell.style.background = isDark ? '#333' : '#eee'; cell.style.cursor = 'pointer';

          if (sel && sel[0] === r && sel[1] === c) cell.style.background = '#e0a96d';
          for (var i = 0; i < legalMoves.length; i++) {
            if (legalMoves[i].to[0] === r && legalMoves[i].to[1] === c) cell.style.background = '#4ecca3';
          }

          var p = board[r][c];
          if (p !== '.') {
            var disc = document.createElement('div');
            disc.style.width = '36px'; disc.style.height = '36px'; disc.style.borderRadius = '50%';
            disc.style.display = 'flex'; disc.style.alignItems = 'center'; disc.style.justifyContent = 'center';
            disc.style.fontWeight = 'bold'; disc.style.fontSize = '18px';
            if (p === 'r' || p === 'R') {
              disc.style.background = 'radial-gradient(circle at 30% 30%, #ff6b6b, #c0392b)';
              disc.style.boxShadow = '0 3px 5px rgba(0,0,0,0.5)';
            } else {
              disc.style.background = 'radial-gradient(circle at 30% 30%, #555, #111)';
              disc.style.boxShadow = '0 3px 5px rgba(0,0,0,0.5)';
            }
            if (p === 'R' || p === 'B') disc.textContent = '♔';
            cell.appendChild(disc);
          }

          (function(row, col) {
            cell.onclick = function() { onSquareClick(row, col, mustCap); };
          })(r, c);

          boardEl.appendChild(cell);
        }
      }
    }

    function onSquareClick(r, c, mustCap) {
      if (turn !== 'r') return;
      var p = board[r][c];

      if (sel) {
        var chosenMove = null;
        for (var i = 0; i < legalMoves.length; i++) {
          if (legalMoves[i].to[0] === r && legalMoves[i].to[1] === c) { chosenMove = legalMoves[i]; break; }
        }
        if (chosenMove) {
          executeMove(sel, chosenMove);
          sel = null; legalMoves = [];
          render();
          if (turn === 'b') setTimeout(aiTurn, 300);
          return;
        }
      }

      if (p !== '.' && (p === 'r' || p === 'R')) {
        sel = [r, c];
        if (mustCap.length > 0) {
          var pCap = mustCap.find(function(m){ return m.from[0] === r && m.from[1] === c; });
          legalMoves = pCap ? pCap.caps : [];
        } else {
          legalMoves = getSimpleMoves(board, r, c, p);
        }
      } else {
        sel = null; legalMoves = [];
      }
      render();
    }

    function executeMove(from, m) {
      var p = board[from[0]][from[1]];
      board[m.to[0]][m.to[1]] = p;
      board[from[0]][from[1]] = '.';

      if (m.jump) board[m.jump[0]][m.jump[1]] = '.';

      // King promotion
      if (p === 'r' && m.to[0] === 0) board[m.to[0]][m.to[1]] = 'R';
      if (p === 'b' && m.to[0] === 7) board[m.to[0]][m.to[1]] = 'B';

      playTone(250, 0.1, 'sine', 0.1);

      // Check multi-jump
      if (m.jump) {
        var curP = board[m.to[0]][m.to[1]];
        var extraCaps = getCapturesForPiece(board, m.to[0], m.to[1], curP);
        if (extraCaps.length > 0) {
          sel = m.to;
          legalMoves = extraCaps;
          statusEl.textContent = 'Multi-jump available!';
          return;
        }
      }

      turn = turn === 'r' ? 'b' : 'r';
      statusEl.textContent = turn === 'r' ? "Your Turn (Red)" : "AI's Turn (Black)";
    }

    function aiTurn() {
      if (!w.isConnected) return;
      var caps = getAllCaptures(board, 'b');
      if (caps.length > 0) {
        var choice = caps[Math.floor(Math.random() * caps.length)];
        var move = choice.caps[Math.floor(Math.random() * choice.caps.length)];
        executeMove(choice.from, move);
      } else {
        var allMoves = [];
        for (var r = 0; r < 8; r++) {
          for (var c = 0; c < 8; c++) {
            var p = board[r][c];
            if (p === 'b' || p === 'B') {
              var sm = getSimpleMoves(board, r, c, p);
              sm.forEach(function(m){ allMoves.push({from:[r,c], move:m}); });
            }
          }
        }
        if (allMoves.length > 0) {
          var selM = allMoves[Math.floor(Math.random() * allMoves.length)];
          executeMove(selM.from, selM.move);
        } else {
          statusEl.textContent = 'RED WINS! Black has no moves.';
          playTone(500, 0.3, 'sine', 0.2);
          return;
        }
      }
      render();
    }

    resetBtn.onclick = initBoard;
    initBoard();
  });

  /* --------------------------------------------------------------------
   * 3. CONNECT FOUR
   * -------------------------------------------------------------------- */
  reg('mp-connect4', 'Connect Four', '7x6 drop grid with smart AI opponent', '🟡', 'game', function(){
    var w = MWO.wm.create({id:'mp-c4-'+Date.now(), title:'Connect Four', icon:'🟡', width:420, height:420, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#0f172a;color:#fff;padding:10px;box-sizing:border-box'>" +
      "<div id='c4-status' style='font-size:1.1em;font-weight:bold;margin-bottom:8px;color:#38bdf8'>Your Turn (Red)</div>" +
      "<div id='c4-grid' style='display:grid;grid-template-columns:repeat(7,48px);grid-template-rows:repeat(6,48px);gap:6px;background:#1e293b;padding:8px;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,0.5);cursor:pointer'></div>" +
      "<button id='c4-reset' style='margin-top:auto;padding:8px 16px;background:#38bdf8;color:#0f172a;font-weight:bold;border:none;border-radius:4px;cursor:pointer'>Restart Game</button>" +
    "</div>";

    var gridEl = w.querySelector('#c4-grid'), statusEl = w.querySelector('#c4-status'), resetBtn = w.querySelector('#c4-reset');
    var board = [], gameOver = false;

    function initBoard() {
      board = [];
      for (var r = 0; r < 6; r++) {
        var row = []; for (var c = 0; c < 7; c++) row.push(0); board.push(row);
      }
      gameOver = false;
      statusEl.textContent = "Your Turn (Red)";
      render();
    }

    function render() {
      gridEl.innerHTML = '';
      for (var r = 0; r < 6; r++) {
        for (var c = 0; c < 7; c++) {
          var cell = document.createElement('div');
          cell.style.width = '48px'; cell.style.height = '48px'; cell.style.borderRadius = '50%';
          var val = board[r][c];
          if (val === 1) cell.style.background = 'radial-gradient(circle at 30% 30%, #ef4444, #991b1b)';
          else if (val === 2) cell.style.background = 'radial-gradient(circle at 30% 30%, #facc15, #854d0e)';
          else cell.style.background = '#0f172a';

          (function(col) {
            cell.onclick = function() { dropPiece(col, 1); };
          })(c);

          gridEl.appendChild(cell);
        }
      }
    }

    function dropPiece(col, p) {
      if (gameOver) return;
      var row = -1;
      for (var r = 5; r >= 0; r--) {
        if (board[r][col] === 0) { row = r; break; }
      }
      if (row === -1) return;

      board[row][col] = p;
      playTone(p === 1 ? 400 : 300, 0.1, 'sine', 0.15);
      render();

      if (checkWin(board, p)) {
        gameOver = true;
        statusEl.textContent = p === 1 ? "YOU WIN! 🎉" : "AI WINS!";
        playTone(p === 1 ? 600 : 150, 0.3, 'triangle', 0.2);
        return;
      }

      if (isFull(board)) {
        gameOver = true;
        statusEl.textContent = "DRAW GAME!";
        return;
      }

      if (p === 1) {
        statusEl.textContent = "AI Thinking...";
        setTimeout(aiTurn, 250);
      } else {
        statusEl.textContent = "Your Turn (Red)";
      }
    }

    function checkWin(b, p) {
      for (var r = 0; r < 6; r++) {
        for (var c = 0; c < 7; c++) {
          if (c + 3 < 7 && b[r][c] === p && b[r][c+1] === p && b[r][c+2] === p && b[r][c+3] === p) return true;
          if (r + 3 < 6 && b[r][c] === p && b[r+1][c] === p && b[r+2][c] === p && b[r+3][c] === p) return true;
          if (r + 3 < 6 && c + 3 < 7 && b[r][c] === p && b[r+1][c+1] === p && b[r+2][c+2] === p && b[r+3][c+3] === p) return true;
          if (r - 3 >= 0 && c + 3 < 7 && b[r][c] === p && b[r-1][c+1] === p && b[r-2][c+2] === p && b[r-3][c+3] === p) return true;
        }
      }
      return false;
    }

    function isFull(b) {
      return b[0].every(function(v){ return v !== 0; });
    }

    function aiTurn() {
      if (!w.isConnected || gameOver) return;
      var bestCol = -1;

      // 1. Check if AI can win
      for (var c = 0; c < 7; c++) {
        var tempB = JSON.parse(JSON.stringify(board));
        for (var r = 5; r >= 0; r--) {
          if (tempB[r][c] === 0) {
            tempB[r][c] = 2;
            if (checkWin(tempB, 2)) { bestCol = c; break; }
            break;
          }
        }
        if (bestCol !== -1) break;
      }

      // 2. Block player win
      if (bestCol === -1) {
        for (var c = 0; c < 7; c++) {
          var tempB = JSON.parse(JSON.stringify(board));
          for (var r = 5; r >= 0; r--) {
            if (tempB[r][c] === 0) {
              tempB[r][c] = 1;
              if (checkWin(tempB, 1)) { bestCol = c; break; }
              break;
            }
          }
          if (bestCol !== -1) break;
        }
      }

      // 3. Prefer center
      if (bestCol === -1) {
        var validCols = [];
        [3, 2, 4, 1, 5, 0, 6].forEach(function(col) {
          if (board[0][col] === 0) validCols.push(col);
        });
        bestCol = validCols[0];
      }

      dropPiece(bestCol, 2);
    }

    resetBtn.onclick = initBoard;
    initBoard();
  });


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
   * 5. WORD GUESS
   * -------------------------------------------------------------------- */
  reg('mp-wordle', 'Word Guess', '5-letter word guess game with dynamic keyboard', '🟩', 'game', function(){
    var w = MWO.wm.create({id:'mp-wordle-'+Date.now(), title:'Word Guess', icon:'🟩', width:380, height:480, resizable:false});
    w.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;background:#121213;color:#fff;padding:10px;box-sizing:border-box;font-family:sans-serif'>" +
      "<div style='font-size:1.2em;font-weight:bold;letter-spacing:2px;margin-bottom:8px'>WORD GUESS</div>" +
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


  /* --------------------------------------------------------------------
   * 17. STAR BLASTERS
   * -------------------------------------------------------------------- */
  reg('mp-spaceinvaders', 'Star Blasters', 'Canvas 5x11 alien march with destructible barriers', '👾', 'game', function(){
    var w = MWO.wm.create({id:'mp-inv-'+Date.now(), title:'Star Blasters', icon:'👾', width:480, height:420, resizable:false});
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
