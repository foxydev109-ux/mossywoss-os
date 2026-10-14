import os, subprocess

with open('mw_web/megapack.js', 'a', encoding='utf-8') as f:
    f.write('''
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

''')

print("Part 2 written.")
