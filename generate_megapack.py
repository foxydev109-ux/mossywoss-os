import os, subprocess

os.makedirs('mw_web', exist_ok=True)

with open('mw_web/megapack.js', 'w', encoding='utf-8') as f:
    f.write('''var MWO=MWO||{};
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

''')

print("Part 1 written.")
