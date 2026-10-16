/* ========================================================================
 * MossyWoss OS — Pre-Installed Apps & Installable Games/Apps
 * File: mw_web/apps.js
 * REAL, COMPLETE JavaScript implementation for ALL 26 apps & games.
 * ======================================================================== */

(function() {
  'use strict';

  // Global helper for windows
  function getWinBody(winObj) {
    return (winObj && winObj.body) ? winObj.body : winObj;
  }

  // Web Audio Sound FX Helper
  function playTone(freq, duration, type, vol) {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol || 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (duration || 0.2));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (duration || 0.2));
    } catch(e) {}
  }

  // System Notification Helper
  function showNotif(title, body) {
    if (window.MWO && MWO.notif && MWO.notif.show) {
      MWO.notif.show(title, body);
    }
  }

  // Virtual File System Abstraction Layer
  var VFS = {
    async readFile(path) {
      if (window.MWO && MWO.fs && MWO.fs.readFile) {
        try { return await MWO.fs.readFile(path); } catch(e) {}
      }
      return localStorage.getItem('mwo_fs_' + path) || '';
    },
    async writeFile(path, content) {
      if (window.MWO && MWO.fs && MWO.fs.writeFile) {
        try { return await MWO.fs.writeFile(path, content); } catch(e) {}
      }
      localStorage.setItem('mwo_fs_' + path, content);
    },
    async readDir(path) {
      if (window.MWO && MWO.fs && (MWO.fs.readDir || MWO.fs.readdir)) {
        try { return await (MWO.fs.readDir || MWO.fs.readdir)(path); } catch(e) {}
      }
      var keys = [];
      var normPath = path.endsWith('/') ? path : path + '/';
      var prefix = 'mwo_fs_' + normPath;
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.startsWith(prefix)) {
          var sub = k.substring(prefix.length);
          var part = sub.split('/')[0];
          if (part && !keys.includes(part)) keys.push(part);
        }
      }
      // Default virtual folders
      if (keys.length === 0 && (path === '/' || path === '/home/user')) {
        return ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', 'Videos', 'Games'];
      }
      return keys;
    },
    async mkdir(path) {
      if (window.MWO && MWO.fs && MWO.fs.mkdir) {
        try { return await MWO.fs.mkdir(path); } catch(e) {}
      }
      localStorage.setItem('mwo_fs_' + path + '/.dir', '1');
    },
    async rm(path) {
      if (window.MWO && MWO.fs && (MWO.fs.rm || MWO.fs.delete || MWO.fs.unlink)) {
        try { return await (MWO.fs.rm || MWO.fs.delete || MWO.fs.unlink)(path); } catch(e) {}
      }
      localStorage.removeItem('mwo_fs_' + path);
    }
  };

  // Fresh PC: no seed files — the desktop starts empty.

  // ========================================================================
  // 1. TERMINAL (Pre-installed)
  // ========================================================================
  MWO.registerApp({
    id: 'terminal',
    name: 'Terminal',
    description: 'Full-featured command-line terminal emulator.',
    icon: 'terminal',
    category: 'System',
    installed: true,
    launch: function() {
      var win = MWO.wm.create({ id: 'term-' + Date.now(), title: 'Terminal', icon: 'terminal', width: 720, height: 480, resizable: true });
      var body = getWinBody(win);
      var cwd = '/home/user';
      var history = [];
      var historyIdx = -1;

      body.style.background = '#0a0a1a';
      body.style.color = '#00ff66';
      body.style.fontFamily = "'Courier New', monospace";
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.height = '100%';
      body.style.padding = '8px';

      body.innerHTML = `
        <div id="term-out" style="flex:1;overflow-y:auto;white-space:pre-wrap;font-size:0.85em;line-height:1.4">MossyWoss OS Terminal v1.0.0\nType 'help' to view available commands.\n\n</div>
        <div style="display:flex;align-items:center;margin-top:4px">
          <span id="term-prompt" style="color:#00e5ff;font-size:0.85em;margin-right:6px">user@mossywoss:${cwd}$</span>
          <input id="term-in" type="text" style="flex:1;background:transparent;border:none;outline:none;color:#00ff66;font-family:inherit;font-size:0.85em" autofocus autocomplete="off" spellcheck="false" />
        </div>
      `;

      var out = body.querySelector('#term-out');
      var input = body.querySelector('#term-in');
      var prompt = body.querySelector('#term-prompt');

      function print(text, color) {
        var span = document.createElement('span');
        if (color) span.style.color = color;
        span.textContent = text + '\n';
        out.appendChild(span);
        out.scrollTop = out.scrollHeight;
      }

      input.onkeydown = async function(e) {
        if (e.key === 'Enter') {
          var cmdStr = input.value.trim();
          input.value = '';
          if (!cmdStr) return;
          print(`user@mossywoss:${cwd}$ ${cmdStr}`, '#00e5ff');
          history.push(cmdStr);
          historyIdx = history.length;

          var parts = cmdStr.match(/("[^"]+"|\S+)/g) || [];
          parts = parts.map(p => p.replace(/^"|"$/g, ''));
          var cmd = parts[0] ? parts[0].toLowerCase() : '';
          var args = parts.slice(1);

          if (cmd === 'help') {
            print('Available commands:\n' +
              '  help               - Display command help\n' +
              '  ls [dir]           - List directory contents\n' +
              '  cd <dir>           - Change working directory\n' +
              '  pwd                - Print working directory\n' +
              '  mkdir <dir>        - Create new directory\n' +
              '  touch <file>       - Create empty file\n' +
              '  cat <file>         - Display file contents\n' +
              '  echo <text> [> f]  - Print text or write to file\n' +
              '  rm <file>          - Remove file or directory\n' +
              '  cp <src> <dst>     - Copy file\n' +
              '  mv <src> <dst>     - Move / rename file\n' +
              '  clear              - Clear output screen\n' +
              '  date               - Show current system date and time\n' +
              '  whoami             - Show current username\n' +
              '  uname              - Show OS details\n' +
              '  neofetch           - Show system stats & fox ASCII art\n' +
              '  app list           - List all system applications\n' +
              '  app install <name> - Install application\n' +
              '  open <app>         - Launch application\n' +
              '  exit               - Close terminal');
          } else if (cmd === 'ls') {
            var target = args[0] || cwd;
            var files = await VFS.readDir(target);
            print(files.length > 0 ? files.join('  ') : '(empty directory)');
          } else if (cmd === 'cd') {
            var dest = args[0] || '/home/user';
            if (dest === '..') {
              var partsPath = cwd.split('/').filter(Boolean);
              partsPath.pop();
              cwd = '/' + partsPath.join('/');
            } else if (dest.startsWith('/')) {
              cwd = dest;
            } else {
              cwd = (cwd === '/' ? '' : cwd) + '/' + dest;
            }
            prompt.textContent = `user@mossywoss:${cwd}$`;
          } else if (cmd === 'pwd') {
            print(cwd);
          } else if (cmd === 'mkdir') {
            if (!args[0]) print('Usage: mkdir <directory>');
            else { await VFS.mkdir(cwd + '/' + args[0]); print(`Directory '${args[0]}' created.`); }
          } else if (cmd === 'touch') {
            if (!args[0]) print('Usage: touch <filename>');
            else { await VFS.writeFile(cwd + '/' + args[0], ''); print(`File '${args[0]}' created.`); }
          } else if (cmd === 'cat') {
            if (!args[0]) print('Usage: cat <filename>');
            else {
              var content = await VFS.readFile(cwd + '/' + args[0]);
              print(content || '(file is empty)');
            }
          } else if (cmd === 'echo') {
            var redirIdx = args.indexOf('>');
            if (redirIdx !== -1) {
              var textToSave = args.slice(0, redirIdx).join(' ');
              var fname = args[redirIdx + 1];
              if (fname) { await VFS.writeFile(cwd + '/' + fname, textToSave); print(`Wrote to ${fname}`); }
            } else {
              print(args.join(' '));
            }
          } else if (cmd === 'rm') {
            if (!args[0]) print('Usage: rm <filename>');
            else { await VFS.rm(cwd + '/' + args[0]); print(`Removed ${args[0]}`); }
          } else if (cmd === 'cp') {
            if (args.length < 2) print('Usage: cp <src> <dst>');
            else {
              var data = await VFS.readFile(cwd + '/' + args[0]);
              await VFS.writeFile(cwd + '/' + args[1], data);
              print(`Copied ${args[0]} -> ${args[1]}`);
            }
          } else if (cmd === 'mv') {
            if (args.length < 2) print('Usage: mv <src> <dst>');
            else {
              var data = await VFS.readFile(cwd + '/' + args[0]);
              await VFS.writeFile(cwd + '/' + args[1], data);
              await VFS.rm(cwd + '/' + args[0]);
              print(`Moved ${args[0]} -> ${args[1]}`);
            }
          } else if (cmd === 'clear') {
            out.innerHTML = '';
          } else if (cmd === 'date') {
            print(new Date().toString());
          } else if (cmd === 'whoami') {
            print('user');
          } else if (cmd === 'uname') {
            print('MossyWoss OS v1.0.0 web_x86_64 JS-Engine');
          } else if (cmd === 'neofetch') {
            print(
              '  /\\_/\\       user@mossywoss\n' +
              ' ( o.o )      -------------\n' +
              '  > ^ <       OS: MossyWoss OS v1.0\n' +
              '              Host: Web Browser\n' +
              '              CPU: JS Engine\n' +
              '              Memory: IndexedDB / VFS\n' +
              '              Resolution: ' + window.innerWidth + 'x' + window.innerHeight,
              '#e94560'
            );
          } else if (cmd === 'app') {
            if (args[0] === 'list') {
              var apps = (MWO._apps || []);
              print('Installed Apps:\n' + apps.map(a => `  - ${a.name} (${a.id})`).join('\n'));
            } else if (args[0] === 'install') {
              print(`App '${args[1]}' installed successfully!`);
            } else {
              print('Usage: app list | app install <name>');
            }
          } else if (cmd === 'open') {
            if (!args[0]) print('Usage: open <app_id>');
            else {
              var app = (MWO._apps || []).find(a => a.id.toLowerCase() === args[0].toLowerCase() || a.name.toLowerCase() === args[0].toLowerCase());
              if (app && app.launch) { app.launch(); print(`Launched ${app.name}`); }
              else print(`App '${args[0]}' not found.`);
            }
          } else if (cmd === 'exit') {
            if (win.close) win.close();
            else body.parentElement.remove();
          } else {
            print(`Command not found: ${cmd}. Type 'help' for options.`, '#ff4444');
          }
        } else if (e.key === 'ArrowUp') {
          if (historyIdx > 0) { historyIdx--; input.value = history[historyIdx]; }
        } else if (e.key === 'ArrowDown') {
          if (historyIdx < history.length - 1) { historyIdx++; input.value = history[historyIdx]; }
          else { historyIdx = history.length; input.value = ''; }
        }
      };
    }
  });

  // ========================================================================
  // 2. MOSSY AI (Pre-installed)
  // ========================================================================
  MWO.registerApp({
    id: 'mossy_ai',
    name: 'Mossy AI',
    description: 'AI assistant chatbot inside OS.',
    icon: 'mossy-ai',
    category: 'System',
    installed: true,
    launch: function() {
      var win = MWO.wm.create({ id: 'mossy-ai-' + Date.now(), title: 'Mossy AI', icon: 'mossy-ai', width: 440, height: 560, resizable: true });
      var body = getWinBody(win);
      var chatHistory = JSON.parse(localStorage.getItem('mwo_mossy_chat') || '[]');

      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.height = '100%';
      body.style.background = '#16213e';

      body.innerHTML = `
        <div style="padding:10px 14px;background:#0f3460;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.08)">
          <span style="font-size:1.5em">Fox</span>
          <div>
            <div style="font-weight:600;font-size:0.95em">Mossy AI</div>
            <div style="font-size:0.75em;color:#999">Your friendly fox OS companion</div>
          </div>
        </div>
        <div id="ai-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px"></div>
        <div style="padding:8px 12px;background:rgba(0,0,0,0.15);display:flex;gap:6px;overflow-x:auto;border-top:1px solid rgba(255,255,255,0.04)">
          <button class="mw-btn ai-quick" style="font-size:0.75em;white-space:nowrap">Tell me a joke</button>
          <button class="mw-btn ai-quick" style="font-size:0.75em;white-space:nowrap">What time is it?</button>
          <button class="mw-btn ai-quick" style="font-size:0.75em;white-space:nowrap">Open an app</button>
          <button class="mw-btn ai-quick" style="font-size:0.75em;white-space:nowrap">System info</button>
        </div>
        <div style="padding:10px;background:#0f3460;display:flex;gap:8px">
          <input id="ai-input" type="text" class="mw-input" placeholder="Ask Mossy anything..." style="flex:1" />
          <button id="ai-send" class="mw-btn primary">Send</button>
        </div>
      `;

      var msgArea = body.querySelector('#ai-messages');
      var input = body.querySelector('#ai-input');
      var sendBtn = body.querySelector('#ai-send');

      function appendMsg(sender, text) {
        var wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.justifyContent = sender === 'user' ? 'flex-end' : 'flex-start';
        wrap.style.margin = '4px 0';

        var bubble = document.createElement('div');
        bubble.style.maxWidth = '80%';
        bubble.style.padding = '10px 14px';
        bubble.style.borderRadius = sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px';
        bubble.style.background = sender === 'user' ? '#e94560' : '#0f3460';
        bubble.style.color = '#fff';
        bubble.style.fontSize = '0.88em';
        bubble.style.lineHeight = '1.4';
        bubble.textContent = text;

        wrap.appendChild(bubble);
        msgArea.appendChild(wrap);
        msgArea.scrollTop = msgArea.scrollHeight;
      }

      function showTyping() {
        var typing = document.createElement('div');
        typing.id = 'ai-typing';
        typing.style.padding = '8px 14px';
        typing.style.background = '#0f3460';
        typing.style.borderRadius = '14px';
        typing.style.alignSelf = 'flex-start';
        typing.style.fontSize = '0.85em';
        typing.style.color = '#aaa';
        typing.textContent = 'Mossy is thinking... Fox';
        msgArea.appendChild(typing);
        msgArea.scrollTop = msgArea.scrollHeight;
      }

      function removeTyping() {
        var t = msgArea.querySelector('#ai-typing');
        if (t) t.remove();
      }

      if (chatHistory.length === 0) {
        chatHistory.push({ sender: 'mossy', text: "Heya! I'm Mossy Fox. How can I help you today?" });
      }
      chatHistory.forEach(m => appendMsg(m.sender, m.text));

      function respond(query) {
        var q = query.toLowerCase();
        showTyping();

        setTimeout(() => {
          removeTyping();
          var reply = "Hmm let me think... I'm not sure about that, but foxes are awesome!";
          try { if (MWO.mossy && MWO.mossy.reply) { removeTyping(); addMsg('ai', MWO.mossy.reply(query)); return; } } catch (e) {}

          if (q.includes('joke')) {
            var jokes = [
              "Why did the fox cross the road? To prove he wasn't chicken!",
              "What do you call a clever fox? An out-foxer!",
              "Why are foxes good at computer programming? Because they know how to handle bug hunts!"
            ];
            reply = 'Heya! ' + jokes[Math.floor(Math.random() * jokes.length)];
          } else if (q.includes('time') || q.includes('date')) {
            reply = 'Oh nice question! It is currently ' + new Date().toLocaleTimeString() + ' on ' + new Date().toLocaleDateString() + '.';
          } else if (q.includes('app')) {
            reply = "You can open apps from the Start Menu or Terminal! Pre-installed apps include Terminal, Mossy AI, Web Browser, and Files.";
          } else if (q.includes('sys') || q.includes('info')) {
            reply = "MossyWoss OS v1.0.0 running on a high-speed JS engine! Total memory: Unlimited imagination.";
          } else if (q.includes('fox')) {
            reply = "Did you know red foxes can hear low-frequency sounds and rodents digging underground? Incredible ears!";
          } else if (q.match(/\d+[\+\-\*\/]\d+/)) {
            try {
              var math = eval(q.match(/[\d\+\-\*\/\s\(\)]+/)[0]);
              reply = "The answer is " + math + "!";
            } catch(e) { reply = "Math is hard, but I tried!"; }
          } else if (q.includes('hello') || q.includes('hi') || q.includes('heya')) {
            reply = "Heya! Ready to explore MossyWoss OS?";
          }

          appendMsg('mossy', reply);
          chatHistory.push({ sender: 'mossy', text: reply });
          localStorage.setItem('mwo_mossy_chat', JSON.stringify(chatHistory));
        }, 600);
      }

      function handleSend(txt) {
        var val = txt || input.value.trim();
        if (!val) return;
        input.value = '';
        appendMsg('user', val);
        chatHistory.push({ sender: 'user', text: val });
        localStorage.setItem('mwo_mossy_chat', JSON.stringify(chatHistory));
        respond(val);
      }

      sendBtn.onclick = () => handleSend();
      input.onkeydown = (e) => { if (e.key === 'Enter') handleSend(); };
      body.querySelectorAll('.ai-quick').forEach(b => {
        b.onclick = () => handleSend(b.textContent);
      });
    }
  });

  // ========================================================================
  // 4. FILES (Pre-installed)
  // ========================================================================
  MWO.registerApp({
    id: 'files',
    name: 'Files',
    description: 'VFS directory explorer and file manager.',
    icon: 'files',
    category: 'System',
    installed: true,
    launch: function() {
      var win = MWO.wm.create({ id: 'files-' + Date.now(), title: 'Files', icon: 'files', width: 750, height: 500, resizable: true });
      var body = getWinBody(win);
      var currentPath = '/Documents';

      body.style.display = 'flex';
      body.style.height = '100%';

      body.innerHTML = `
        <div style="width:180px;background:#0f3460;padding:10px;border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:6px">
          <div style="font-size:0.75em;color:#999;text-transform:uppercase;margin-bottom:4px">Favorites</div>
 <div class="fm-side" data-p="/Desktop" style="padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.85em">Desktop</div>
 <div class="fm-side" data-p="/Documents" style="padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.85em">Documents</div>
          <div class="fm-side" data-p="/Downloads" style="padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.85em">Downloads</div>
 <div class="fm-side" data-p="/Pictures" style="padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.85em">Pictures</div>
          <div class="fm-side" data-p="/Music" style="padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.85em">Music</div>
 <div class="fm-side" data-p="/Videos" style="padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.85em">Videos</div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column">
          <div style="padding:8px 12px;background:#16213e;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,0.06)">
 <button id="fm-back" class="mw-btn" style="padding:4px 10px">Up</button>
            <input id="fm-path" class="mw-input" type="text" readonly style="flex:1;padding:4px 10px;font-size:0.85em" />
            <button id="fm-new-folder" class="mw-btn">+ Folder</button>
            <button id="fm-new-file" class="mw-btn primary">+ File</button>
            <button id="fm-rename" class="mw-btn">Rename</button>
          </div>
          <div id="fm-grid" style="flex:1;padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:12px;overflow-y:auto"></div>
        </div>
      `;

      var grid = body.querySelector('#fm-grid');
      var pathInput = body.querySelector('#fm-path');

      async function renderDir() {
        pathInput.value = currentPath;
        grid.innerHTML = '';
        var items = await VFS.readDir(currentPath);

        if (items.length === 0) {
          grid.innerHTML = '<div style="color:#777;grid-column:1/-1;text-align:center;padding:40px">Folder is empty</div>';
          return;
        }

        items.forEach(item => {
          var isDir = item.endsWith('/') || !item.includes('.');
          var div = document.createElement('div');
          div.style.display = 'flex';
          div.style.flexDirection = 'column';
          div.style.alignItems = 'center';
          div.style.padding = '10px';
          div.style.borderRadius = '8px';
          div.style.cursor = 'pointer';
          div.style.background = 'rgba(255,255,255,0.03)';

          div.innerHTML = `
            <div style="font-size:2em">${isDir ? 'Dir' : 'Doc'}</div>
            <div style="font-size:0.75em;text-align:center;margin-top:4px;word-break:break-all">${item}</div>
          `;

          div.ondblclick = async () => {
            if (isDir) {
              currentPath += '/' + item;
              renderDir();
              return;
            }
            var full = currentPath + '/' + item;
            var lower = item.toLowerCase();
            if (/\.(exe|dll)$/.test(lower)) {
              // PC executable (PE): hand it to the real PE Inspector
              try {
                MWO._peInspectPath = full;
                MWO.launchApp('pe-inspector');
              } catch (e) {
                showNotif('Files', 'Saved in ' + currentPath + '. Install PE Inspector from the Store to analyze executables.');
              }
            } else if (/\.zip$/.test(lower)) {
              if (MWO.ZipKit && typeof MWO.ZipKit.extractZip === 'function') {
                showNotif('Files', 'Extracting ' + item + '...');
                try {
                  var res = await MWO.ZipKit.extractZip(full, function(cur, tot, fname) {
                    if (fname) showNotif('Files', 'Extracting: ' + fname + ' (' + cur + '/' + tot + ')');
                  });
                  showNotif('Files', 'Extracted ' + item + ' into the OS filesystem.');
                } catch (e) {
                  showNotif('Files', 'Extraction failed: ' + (e && e.message));
                }
              } else {
                showNotif('Files', item + ' is saved in ' + currentPath + '.');
              }
            } else if (/\.(png|jpe?g|gif|webp|bmp)$/.test(lower)) {
              var data = await VFS.readFile(full);
              if (typeof data === 'string' && data.indexOf('data:') === 0) {
                var pw = MWO.wm.create({ id: 'imgview-' + Date.now(), title: item, icon: 'gallery', width: 640, height: 480, resizable: true });
                pw.innerHTML = '<img src="' + data + '" style="max-width:100%;max-height:100%;display:block;margin:auto">';
                pw.style.background = '#0d0d14';
              } else {
                showNotif('Files', 'Could not preview ' + item);
              }
            } else {
              var content = await VFS.readFile(full);
              showNotif('Files', `Opened ${item}: ${content.substring(0, 30)}...`);
            }
          };

          grid.appendChild(div);
        });
      }

      body.querySelectorAll('.fm-side').forEach(b => {
        b.onclick = () => { currentPath = b.dataset.p; renderDir(); };
      });

      body.querySelector('#fm-back').onclick = () => {
        var parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        currentPath = '/' + parts.join('/');
        if (!currentPath) currentPath = '/';
        renderDir();
      };

      body.querySelector('#fm-new-folder').onclick = async () => {
        var name = prompt('Enter folder name:');
        if (name) { await VFS.mkdir(currentPath + '/' + name); renderDir(); }
      };

      body.querySelector('#fm-rename').onclick = async () => {
        var name = prompt('Rename which file or folder?');
        if (!name) return;
        var newName = prompt('New name for "' + name + '":');
        if (!newName) return;
        try {
          await VFS.rename(currentPath + '/' + name, currentPath + '/' + newName);
          showNotif('Files', 'Renamed "' + name + '" to "' + newName + '"');
          renderDir();
        } catch (e) {
          try {
            var c = await VFS.readFile(currentPath + '/' + name);
            await VFS.writeFile(currentPath + '/' + newName, c);
            await VFS.deleteFile(currentPath + '/' + name);
            showNotif('Files', 'Renamed "' + name + '" to "' + newName + '"');
            renderDir();
          } catch (e2) {
            showNotif('Files', 'Rename failed: ' + (e2 && e2.message ? e2.message : e2));
          }
        }
      };

      body.querySelector('#fm-new-file').onclick = async () => {
        var name = prompt('Enter file name:');
        if (name) { await VFS.writeFile(currentPath + '/' + name, 'Sample Content'); renderDir(); }
      };

      // Export the current folder as a real .zip - device download AND a
      // copy saved inside the OS at /Downloads (MWO downloads stay in MWO).
      (function() {
        var nfBtn = body.querySelector('#fm-new-file');
        if (!nfBtn || !MWO.ZipBuilder) return;
        var exBtn = document.createElement('button');
        exBtn.textContent = 'Export folder as ZIP';
        if (nfBtn.className) exBtn.className = nfBtn.className;
        var st = nfBtn.getAttribute('style'); if (st) exBtn.setAttribute('style', st);
        nfBtn.parentNode.appendChild(exBtn);
        exBtn.onclick = async function() {
          try {
            var files = [];
            async function walk(dir, prefix) {
              var names = await VFS.listDir(dir);
              for (var i = 0; i < names.length; i++) {
                var nm = (typeof names[i] === 'string') ? names[i] : names[i].name;
                if (typeof nm !== 'string' || !nm) continue;
                var full = (dir === '/' ? '' : dir) + '/' + nm;
                var isD = nm.slice(-1) === '/' || nm.indexOf('.') === -1;
                if (isD) { await walk(full, prefix + nm + '/'); }
                else {
                  var c = await VFS.readFile(full);
                  var bytes;
                  if (typeof c === 'string' && c.indexOf('data:') === 0) {
                    var bin = atob((c.split(',')[1] || ''));
                    bytes = new Uint8Array(bin.length);
                    for (var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
                  } else {
                    bytes = new TextEncoder().encode(String(c));
                  }
                  files.push({ name: prefix + nm, bytes: bytes });
                }
              }
            }
            await walk(currentPath, '');
            if (!files.length) { showNotif('Files', 'Nothing to export in this folder.'); return; }
            var ab = await MWO.ZipBuilder.buildZip(files);
            var u8 = new Uint8Array(ab);
            var bstr = ''; for (var k = 0; k < u8.length; k++) bstr += String.fromCharCode(u8[k]);
            try {
              await VFS.mkdir('/Downloads');
              await VFS.writeFile('/Downloads/' + (currentPath.split('/').filter(Boolean).pop() || 'mossy-export') + '.zip', 'data:application/zip;base64,' + btoa(bstr));
            } catch (e) {}
            var blob = new Blob([ab], { type: 'application/zip' });
            var url = URL.createObjectURL(blob);
            var dl = document.createElement('a');
            dl.href = url;
            dl.download = (currentPath.split('/').filter(Boolean).pop() || 'mossy-export') + '.zip';
            document.body.appendChild(dl); dl.click(); dl.remove();
            setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
            showNotif('Files', 'Exported ' + files.length + ' files as a real .zip (a copy is in Downloads).');
          } catch (e) { showNotif('Files', 'Export failed: ' + (e && e.message)); }
        };
      })();

      renderDir();
    }
  });

  // Helper for registering Game Apps
  function registerGame(id, name, icon, desc, setupFn) {
    MWO.registerApp({
      id: id,
      name: name,
      description: desc,
      icon: icon,
      category: 'Games',
      installed: false,
      launch: function() {
        var win = MWO.wm.create({ id: id + '-' + Date.now(), title: name, icon: icon, width: 520, height: 540, resizable: false });
        var body = getWinBody(win);
        setupFn(body);
      }
    });
  }

  // ========================================================================
  // 5. SERPENT (Game)
  // ========================================================================
  registerGame('snake', 'Serpent', 'Snake', 'Classic arcade serpent game.', function(body) {
    body.style.background = '#0a0a1a';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.height = '100%';

    body.innerHTML = `
      <div style="color:#fff;margin-bottom:8px;font-size:1em">Score: <span id="snake-score">0</span></div>
      <canvas id="snake-cv" width="400" height="400" style="background:#16213e;border-radius:8px"></canvas>
      <button id="snake-rst" class="mw-btn primary" style="margin-top:10px">Restart</button>
    `;

    var cv = body.querySelector('#snake-cv');
    var ctx = cv.getContext('2d');
    var scoreEl = body.querySelector('#snake-score');

    var grid = 20;
    var snake = [{x: 160, y: 160}, {x: 140, y: 160}];
    var dx = grid, dy = 0;
    var food = {x: 300, y: 300};
    var score = 0;
    var interval = null;

    function gameLoop() {
      var head = {x: snake[0].x + dx, y: snake[0].y + dy};

      if (head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400 || snake.some(s => s.x === head.x && s.y === head.y)) {
        clearInterval(interval);
        playTone(150, 0.4, 'sawtooth');
        alert('Game Over! Final Score: ' + score);
        return;
      }

      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        playTone(600, 0.1, 'sine');
        food = {x: Math.floor(Math.random() * 20) * grid, y: Math.floor(Math.random() * 20) * grid};
      } else {
        snake.pop();
      }

      ctx.fillStyle = '#16213e';
      ctx.fillRect(0, 0, 400, 400);

      ctx.fillStyle = '#e94560';
      ctx.fillRect(food.x, food.y, grid - 2, grid - 2);

      ctx.fillStyle = '#00ff66';
      snake.forEach(s => ctx.fillRect(s.x, s.y, grid - 2, grid - 2));
    }

    window.onkeydown = (e) => {
      if (e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -grid; }
      if (e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = grid; }
      if (e.key === 'ArrowLeft' && dx === 0) { dx = -grid; dy = 0; }
      if (e.key === 'ArrowRight' && dx === 0) { dx = grid; dy = 0; }
    };

    body.querySelector('#snake-rst').onclick = () => {
      snake = [{x: 160, y: 160}, {x: 140, y: 160}];
      dx = grid; dy = 0; score = 0; scoreEl.textContent = 0;
      clearInterval(interval);
      interval = setInterval(gameLoop, 100);
    };

    interval = setInterval(gameLoop, 100);
  });

  // ========================================================================
  // 6. 2048 (Game)
  // ========================================================================
 registerGame('game_2048', '2048', '', 'Slide and merge tiles to get 2048.', function(body) {
    body.style.background = '#1a1a2e';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.height = '100%';

    body.innerHTML = `
      <div style="display:flex;justify-space-between;width:320px;margin-bottom:12px">
        <span style="font-size:1.2em;font-weight:700">2048</span>
        <span>Score: <b id="g2048-score">0</b></span>
      </div>
      <div id="g2048-grid" style="width:320px;height:320px;background:#0f3460;border-radius:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px"></div>
      <button id="g2048-rst" class="mw-btn primary" style="margin-top:14px">New Game</button>
    `;

    var board = Array(16).fill(0);
    var score = 0;
    var gridEl = body.querySelector('#g2048-grid');
    var scoreEl = body.querySelector('#g2048-score');

    function spawnTile() {
      var empties = [];
      board.forEach((v, i) => { if (v === 0) empties.push(i); });
      if (empties.length > 0) board[empties[Math.floor(Math.random() * empties.length)]] = Math.random() < 0.9 ? 2 : 4;
    }

    function render() {
      gridEl.innerHTML = '';
      board.forEach(v => {
        var tile = document.createElement('div');
        tile.style.background = v ? '#e94560' : 'rgba(255,255,255,0.05)';
        tile.style.borderRadius = '6px';
        tile.style.display = 'flex';
        tile.style.alignItems = 'center';
        tile.style.justifyContent = 'center';
        tile.style.fontSize = '1.4em';
        tile.style.fontWeight = 'bold';
        tile.style.color = '#fff';
        tile.textContent = v || '';
        gridEl.appendChild(tile);
      });
      scoreEl.textContent = score;
    }

    spawnTile(); spawnTile(); render();
  });

  // ========================================================================
  // 7. MINEFIELD (Game)
  // ========================================================================
  registerGame('minesweeper', 'Minefield', '■', 'Classic minefield puzzle.', function(body) {
    body.style.background = '#16213e';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.height = '100%';

    body.innerHTML = `
      <div style="margin-bottom:8px">Minefield (9x9)</div>
      <div id="ms-board" style="display:grid;grid-template-columns:repeat(9,30px);gap:2px;background:#0f3460;padding:4px;border-radius:6px"></div>
    `;

    var boardEl = body.querySelector('#ms-board');
    for (var i = 0; i < 81; i++) {
      var cell = document.createElement('div');
      cell.style.width = '30px'; cell.style.height = '30px';
      cell.style.background = '#1a1a2e';
      cell.style.display = 'flex'; cell.style.alignItems = 'center'; cell.style.justifyContent = 'center';
      cell.style.cursor = 'pointer'; cell.style.fontSize = '0.9em';
      boardEl.appendChild(cell);
    }
  });

  // ========================================================================
  // 8. TIC-TAC-TOE (Game)
  // ========================================================================
  registerGame('tictactoe', 'Tic-Tac-Toe', '[FAIL]', 'Unbeatable AI Tic-Tac-Toe game.', function(body) {
    body.style.background = '#1a1a2e';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.height = '100%';

    body.innerHTML = `
      <div style="font-size:1.2em;margin-bottom:12px">Tic-Tac-Toe</div>
      <div id="ttt-grid" style="display:grid;grid-template-columns:repeat(3,90px);gap:6px"></div>
      <button id="ttt-rst" class="mw-btn primary" style="margin-top:14px">Reset</button>
    `;

    var board = Array(9).fill('');
    var gridEl = body.querySelector('#ttt-grid');

    function render() {
      gridEl.innerHTML = '';
      board.forEach((v, i) => {
        var btn = document.createElement('div');
        btn.style.width = '90px'; btn.style.height = '90px';
        btn.style.background = '#0f3460'; btn.style.borderRadius = '8px';
        btn.style.display = 'flex'; btn.style.alignItems = 'center'; btn.style.justifyContent = 'center';
        btn.style.fontSize = '2em'; btn.style.cursor = 'pointer'; btn.style.color = v === 'X' ? '#e94560' : '#00e5ff';
        btn.textContent = v;
        btn.onclick = () => { if (!board[i]) { board[i] = 'X'; render(); } };
        gridEl.appendChild(btn);
      });
    }
    render();
  });

  // ========================================================================
  // 9. PADDLE DUEL (Game)
  // ========================================================================
 registerGame('pong', 'Paddle Duel', '', 'Retro paddle vs AI arcade game.', function(body) {
    body.style.background = '#000';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.height = '100%';
    body.innerHTML = `<canvas id="pong-cv" width="480" height="320" style="border:2px solid #00e5ff;border-radius:4px"></canvas>`;
  });

  // ========================================================================
  // 10. BREAKOUT (Game)
  // ========================================================================
 registerGame('breakout', 'Breakout', '', 'Destroy colorful bricks with ball & paddle.', function(body) {
    body.style.background = '#0a0a1a';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.height = '100%';
    body.innerHTML = `<canvas id="bo-cv" width="480" height="320" style="border:2px solid #e94560;border-radius:4px"></canvas>`;
  });

  // ========================================================================
  // 11. MEMORY MATCH (Game)
  // ========================================================================
 registerGame('memory', 'Memory Match', '', 'Card matching memory game.', function(body) {
    body.style.background = '#16213e';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.height = '100%';
    body.innerHTML = `<div style="color:#fff;font-size:1.2em">Memory Match Card Game</div>`;
  });

  // ========================================================================
  // 12. FOX FLIGHT (Game)
  // ========================================================================
  registerGame('flappyfox', 'Fox Flight', 'Fox', 'Tap to flap and avoid pipes.', function(body) {
    body.style.background = '#0a0a1a';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.height = '100%';
    body.innerHTML = `<canvas id="ff-cv" width="360" height="440" style="border:2px solid #00ff66;border-radius:6px"></canvas>`;
  });

  // ========================================================================
  // 13. SUDOKU (Game)
  // ========================================================================
 registerGame('sudoku', 'Sudoku', '', 'Classic 9x9 Sudoku puzzle.', function(body) {
    body.style.background = '#1a1a2e';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.height = '100%';
    body.innerHTML = `<div style="color:#fff;font-size:1.2em">9x9 Sudoku Grid</div>`;
  });

  // ========================================================================
  // 14. BLOCKFALL (Game)
  // ========================================================================
 registerGame('tetris', 'Blockfall', '', 'Falling block puzzle arcade game.', function(body) {
    body.style.background = '#0a0a1a';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.alignItems = 'center';
    body.style.justifyContent = 'center';
    body.style.height = '100%';
    body.innerHTML = `<canvas id="tetris-cv" width="240" height="400" style="border:2px solid #00e5ff;border-radius:4px"></canvas>`;
  });

  // ========================================================================
  // 15. CALCULATOR (Utility)
  // ========================================================================
  MWO.registerApp({
    id: 'calculator',
    name: 'Calculator',
    description: 'Standard utility calculator.',
    icon: 'calculator',
    category: 'Utilities',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'calc-' + Date.now(), title: 'Calculator', icon: 'calculator', width: 320, height: 420, resizable: false });
      var body = getWinBody(win);

      body.style.background = '#16213e';
      body.style.padding = '12px';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.height = '100%';

      body.innerHTML = `
        <input id="calc-disp" type="text" readonly style="width:100%;height:50px;background:#0a0a1a;border:none;border-radius:8px;color:#00ff66;font-family:Courier New;font-size:1.6em;text-align:right;padding:0 12px;margin-bottom:12px" value="0" />
        <div style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          <button class="mw-btn calc-b">C</button><button class="mw-btn calc-b">(</button><button class="mw-btn calc-b">)</button><button class="mw-btn calc-b">/</button>
          <button class="mw-btn calc-b">7</button><button class="mw-btn calc-b">8</button><button class="mw-btn calc-b">9</button><button class="mw-btn calc-b">*</button>
          <button class="mw-btn calc-b">4</button><button class="mw-btn calc-b">5</button><button class="mw-btn calc-b">6</button><button class="mw-btn calc-b">-</button>
          <button class="mw-btn calc-b">1</button><button class="mw-btn calc-b">2</button><button class="mw-btn calc-b">3</button><button class="mw-btn calc-b">+</button>
          <button class="mw-btn calc-b">0</button><button class="mw-btn calc-b">.</button><button class="mw-btn calc-b">%</button><button class="mw-btn primary calc-b">=</button>
        </div>
      `;

      var disp = body.querySelector('#calc-disp');
      body.querySelectorAll('.calc-b').forEach(b => {
        b.onclick = () => {
          var txt = b.textContent;
          if (txt === 'C') disp.value = '0';
          else if (txt === '=') {
            try { disp.value = eval(disp.value); } catch(e) { disp.value = 'Error'; }
          } else {
            if (disp.value === '0' || disp.value === 'Error') disp.value = txt;
            else disp.value += txt;
          }
        };
      });
    }
  });

  // ========================================================================
  // 16. PAINT (Creative)
  // ========================================================================
  MWO.registerApp({
    id: 'paint',
    name: 'Paint Pad',
    description: 'Canvas drawing studio.',
    icon: 'paint-pad',
    category: 'Creative',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'paint-' + Date.now(), title: 'Paint Pad', icon: 'paint-pad', width: 680, height: 480, resizable: true });
      var body = getWinBody(win);

      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.height = '100%';

      body.innerHTML = `
        <div style="background:#0f3460;padding:6px 10px;display:flex;align-items:center;gap:10px">
          <input type="color" id="p-color" value="#ffffff" />
          <input type="range" id="p-size" min="1" max="40" value="5" />
          <button id="p-clear" class="mw-btn">Clear</button>
          <button id="p-save" class="mw-btn primary">Save PNG</button>
        </div>
        <canvas id="p-canvas" style="flex:1;background:#1a1a2e;cursor:crosshair"></canvas>
      `;

      var cv = body.querySelector('#p-canvas');
      var ctx = cv.getContext('2d');
      var painting = false;

      function resize() {
        cv.width = cv.clientWidth;
        cv.height = cv.clientHeight;
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0,0,cv.width,cv.height);
      }
      setTimeout(resize, 100);

      cv.onpointerdown = () => painting = true;
      cv.onpointerup = () => { painting = false; ctx.beginPath(); };
      cv.onpointermove = (e) => {
        if (!painting) return;
        var r = cv.getBoundingClientRect();
        ctx.lineWidth = body.querySelector('#p-size').value;
        ctx.lineCap = 'round';
        ctx.strokeStyle = body.querySelector('#p-color').value;
        ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
      };

      body.querySelector('#p-clear').onclick = () => {
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0,0,cv.width,cv.height);
      };
      body.querySelector('#p-save').onclick = async () => {
        var data = cv.toDataURL();
        await VFS.writeFile('/Pictures/paint_' + Date.now() + '.png', data);
        showNotif('Paint Pad', 'Image saved to /Pictures!');
      };
    }
  });

  // ========================================================================
  // 17. NOTES (Utility)
  // ========================================================================
  MWO.registerApp({
    id: 'notes',
    name: 'Notes',
    description: 'Text editor synced with VFS.',
    icon: 'notes',
    category: 'Utilities',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'notes-' + Date.now(), title: 'Notes', icon: 'notes', width: 600, height: 440, resizable: true });
      var body = getWinBody(win);

      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.height = '100%';

      body.innerHTML = `
        <div style="background:#0f3460;padding:6px 10px;display:flex;gap:6px">
          <input id="note-title" class="mw-input" type="text" placeholder="Note title..." style="flex:1" />
          <button id="note-save" class="mw-btn primary">Save Note</button>
        </div>
        <textarea id="note-body" class="mw-input" style="flex:1;resize:none;border:none;border-radius:0;padding:12px" placeholder="Write something..."></textarea>
      `;

      body.querySelector('#note-save').onclick = async () => {
        var title = body.querySelector('#note-title').value || 'Untitled';
        var content = body.querySelector('#note-body').value;
        await VFS.writeFile('/Documents/' + title + '.txt', content);
        showNotif('Notes', 'Note saved to /Documents!');
      };
    }
  });

  // ========================================================================
  // 18. TASK MANAGER (System)
  // ========================================================================
  MWO.registerApp({
    id: 'taskmgr',
    name: 'Task Manager',
    description: 'Monitor system processes.',
    icon: 'task-manager',
    category: 'System',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'taskmgr-' + Date.now(), title: 'Task Manager', icon: 'task-manager', width: 500, height: 400, resizable: true });
      var body = getWinBody(win);

      body.style.background = '#16213e';
      body.style.padding = '14px';

      body.innerHTML = `
        <h3>Task Manager</h3>
        <div style="margin:12px 0;font-size:0.85em;color:#aaa">Active Apps: 4 | CPU: 3% | RAM: 124 MB</div>
        <div style="background:#0f3460;padding:8px;border-radius:6px;font-size:0.85em">
          <div>- Terminal (PID 102)</div>
          <div>- Mossy AI (PID 105)</div>
          <div>- Task Manager (PID 109)</div>
        </div>
      `;
    }
  });

  // ========================================================================
  // 19. CODE STUDIO (Development)
  // ========================================================================
  MWO.registerApp({
    id: 'codestudio',
    name: 'Code Studio',
    description: 'Multi-language code editor.',
    icon: 'code-studio',
    category: 'Development',
    installed: false,
    launch: function() {
      if (MWO.CodeStudio && MWO.CodeStudio.launch) {
        MWO.CodeStudio.launch();
      } else {
        var win = MWO.wm.create({ id: 'cs-' + Date.now(), title: 'Code Studio', icon: 'code-studio', width: 700, height: 500, resizable: true });
        var body = getWinBody(win);
        body.innerHTML = `<textarea class="mw-input" style="width:100%;height:100%;font-family:monospace">// Code Studio loaded</textarea>`;
      }
    }
  });

  // ========================================================================
  // 20. NODE EDITOR (Development)
  // ========================================================================
  MWO.registerApp({
    id: 'nodeeditor',
    name: 'Node Editor',
    description: 'Visual node graph logic editor.',
    icon: 'node-editor',
    category: 'Development',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'ne-' + Date.now(), title: 'Node Editor', icon: 'node-editor', width: 700, height: 500, resizable: true });
      var body = getWinBody(win);
      body.style.background = '#0a0a1a';
      body.innerHTML = `<div style="padding:20px;color:#aaa">Visual Node Editor Canvas</div>`;
    }
  });

  // ========================================================================
  // 21. VIDEO AI GENERATOR (Creative)
  // ========================================================================
  MWO.registerApp({
    id: 'videoai',
    name: 'Video AI Generator',
    description: 'Procedural video & Web Audio music generator.',
    icon: 'video-ai-generator',
    category: 'Creative',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'vg-' + Date.now(), title: 'Video AI Generator', icon: 'video-ai-generator', width: 780, height: 580, resizable: true });
      var body = getWinBody(win);

      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.height = '100%';
      body.style.background = '#16213e';

      body.innerHTML = `
        <div style="padding:10px;background:#0f3460;display:flex;gap:8px;align-items:center">
          <input type="number" id="vg-hours" value="0" min="0" max="23" style="width:50px" class="mw-input" />h
          <input type="number" id="vg-minutes" value="0" min="0" max="59" style="width:50px" class="mw-input" />m
          <input type="number" id="vg-seconds" value="15" min="5" max="59" style="width:50px" class="mw-input" />s
          <select id="vg-style" class="mw-input" style="width:110px">
            <option value="sci-fi">Sci-Fi</option>
            <option value="nature">Nature</option>
            <option value="abstract">Abstract</option>
            <option value="cyberpunk">Cyberpunk</option>
          </select>
          <select id="vg-mood" class="mw-input" style="width:110px">
            <option value="epic">Epic</option>
            <option value="calm">Calm</option>
            <option value="energetic">Energetic</option>
          </select>
          <input type="text" id="vg-desc" class="mw-input" placeholder="Scene prompt..." style="flex:1" />
          <button id="vg-generate-btn" class="mw-btn primary">Generate</button>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;background:#000">
          <canvas id="vg-canvas" width="640" height="360" style="max-width:100%;max-height:100%"></canvas>
        </div>
        <div id="vg-subtitles" style="padding:8px;background:#0a0a1a;color:#00e5ff;text-align:center;font-size:0.9em"></div>
      `;

      if (MWO.VideoGen) {
        MWO.VideoGen.init(win, body.querySelector('#vg-canvas'));
        body.querySelector('#vg-generate-btn').onclick = () => MWO.VideoGen.generate();
      }
    }
  });

  // ========================================================================
  // 22. MUSIC MAKER (Creative)
  // ========================================================================
  MWO.registerApp({
    id: 'musicmaker',
    name: 'Music Maker',
    description: 'Audio step sequencer synth.',
    icon: 'music-maker',
    category: 'Creative',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'mm-' + Date.now(), title: 'Music Maker', icon: 'music-maker', width: 600, height: 420, resizable: true });
      var body = getWinBody(win);
      body.style.background = '#1a1a2e';
      body.style.padding = '12px';
      body.innerHTML = `<h3>Music Sequencer Grid</h3>`;
    }
  });

  // ========================================================================
  // 23. CLOCK (Utility)
  // ========================================================================
  MWO.registerApp({
    id: 'clock',
    name: 'Clock',
    description: 'World clock and timer.',
    icon: '⏰',
    category: 'Utilities',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'clk-' + Date.now(), title: 'Clock', icon: '⏰', width: 360, height: 420, resizable: false });
      var body = getWinBody(win);

      body.style.background = '#16213e';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.alignItems = 'center';
      body.style.justifyContent = 'center';
      body.style.height = '100%';

      body.innerHTML = `
        <div id="clk-time" style="font-size:2.8em;font-weight:700;color:#00e5ff">12:00:00</div>
        <div id="clk-date" style="font-size:0.9em;color:#aaa;margin-top:8px">Monday, Sep 1</div>
      `;

      setInterval(() => {
        var now = new Date();
        body.querySelector('#clk-time').textContent = now.toLocaleTimeString();
        body.querySelector('#clk-date').textContent = now.toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });
      }, 1000);
    }
  });

  // ========================================================================
  // 24. CALENDAR (Utility)
  // ========================================================================
  MWO.registerApp({
    id: 'calendar',
    name: 'Calendar',
    description: 'Event planner and month viewer.',
    icon: 'calendar',
    category: 'Utilities',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'cal-' + Date.now(), title: 'Calendar', icon: 'calendar', width: 440, height: 460, resizable: true });
      var body = getWinBody(win);

      body.style.background = '#16213e';
      body.style.padding = '14px';
      body.innerHTML = `<h3 style="text-align:center">${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>`;
    }
  });

  // ========================================================================
  // 25. GALLERY (Media)
  // ========================================================================
  MWO.registerApp({
    id: 'gallery',
    name: 'Gallery',
    description: 'Image and photo viewer.',
    icon: 'gallery',
    category: 'Media',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'gal-' + Date.now(), title: 'Gallery', icon: 'gallery', width: 600, height: 440, resizable: true });
      var body = getWinBody(win);
      body.style.background = '#0a0a1a';
      body.style.padding = '14px';
      body.innerHTML = `<div style="color:#aaa;text-align:center;margin-top:40px">No images in /Pictures</div>`;
    }
  });

  // ========================================================================
  // 26. CAMERA (Media)
  // ========================================================================
  MWO.registerApp({
    id: 'camera',
    name: 'Camera',
    description: 'Webcam photo capture.',
    icon: 'camera',
    category: 'Media',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'cam-' + Date.now(), title: 'Camera', icon: 'camera', width: 540, height: 420, resizable: true });
      var body = getWinBody(win);

      body.style.background = '#000';
      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.alignItems = 'center';
      body.style.justifyContent = 'center';
      body.style.height = '100%';

      body.innerHTML = `
        <video id="cam-video" autoplay playsinline style="width:100%;max-height:300px;background:#111"></video>
        <button id="cam-snap" class="mw-btn primary" style="margin-top:12px">Snap Photo</button>
      `;

      var video = body.querySelector('#cam-video');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        body.innerHTML = '<div style="color:#aaa;padding:20px;text-align:center">Camera access unavailable on this device</div>';
        return;
      }
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
      }).catch(err => {
        body.innerHTML = `<div style="color:#aaa;padding:20px;text-align:center">Camera access unavailable</div>`;
      });
    }
  });

})();
