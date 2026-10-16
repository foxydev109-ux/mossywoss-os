// Code Studio — Multi-language code editor for MossyWoss OS
// Supports: C, C++, C#, HTML, CSS, JavaScript, JSON
MWO.CodeStudio = (function() {
  var winBody = null;
  var textarea = null;
  var preview = null;
  var currentLang = 'javascript';
  var currentFile = null;
  var lineCount = 1;
  
  var languages = {
    'c':        { name: 'C',         ext: '.c',   icon: '\u2699', comment: '//', template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
    'cpp':      { name: 'C++',       ext: '.cpp', icon: '\u2699', comment: '//', template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
    'csharp':   { name: 'C#',        ext: '.cs',  icon: '\u25B7', comment: '//', template: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}' },
    'html':     { name: 'HTML',      ext: '.html',icon: '\u{1F310}', comment: '<!--', template: '<!DOCTYPE html>\n<html>\n<head><title>Page</title></head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>' },
    'css':      { name: 'CSS',       ext: '.css', icon: '\u{1F3A8}', comment: '/*', template: 'body {\n    background: #1a1a2e;\n    color: #eee;\n    font-family: sans-serif;\n}' },
    'javascript':{ name: 'JavaScript',ext: '.js', icon: '\u{1F4DC}', comment: '//', template: 'console.log("Hello, World!");' },
    'json':     { name: 'JSON',      ext: '.json',icon: '\u{1F4CB}', comment: '//', template: '{\n    "name": "MossyWoss",\n    "version": "1.0.0"\n}' }
  };
  
  function launch() {
    var w = MWO.wm.create({
      id: 'codestudio-win',
      title: 'Code Studio',
      icon: 'code-studio',
      width: 800, height: 600,
      x: 80, y: 40,
      resizable: true
    });
    winBody = w;
    render();
  }
  
  function render() {
    winBody.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%">
        <div style="display:flex;align-items:center;padding:6px 8px;gap:6px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.2)">
          <select id="cs-lang" style="padding:6px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#eee;font-size:0.82em">
            ${Object.keys(languages).map(k => `<option value="${k}" ${k===currentLang?'selected':''}>${languages[k].name}</option>`).join('')}
          </select>
          <button class="mw-btn" onclick="MWO.CodeStudio.newFile()" style="font-size:0.78em;padding:6px 12px">New</button>
          <button class="mw-btn" onclick="MWO.CodeStudio.openFile()" style="font-size:0.78em;padding:6px 12px">Open</button>
          <button class="mw-btn" onclick="MWO.CodeStudio.saveFile()" style="font-size:0.78em;padding:6px 12px">Save</button>
          <button class="mw-btn" onclick="MWO.CodeStudio.insertImage()" style="font-size:0.78em;padding:6px 12px">Insert Image</button>
          <button class="mw-btn primary" onclick="MWO.CodeStudio.run()" style="font-size:0.78em;padding:6px 14px">Run</button> <button class="mw-btn primary" onclick="MWO.CodeStudio.publish()" style="font-size:0.78em;padding:6px 14px;background:#2e7d4f">Build zip + Publish</button>
          <div style="flex:1"></div>
          <span id="cs-status" style="font-size:0.72em;color:var(--text2)">Line 1, Col 1 | 1 lines | C/C++/C# run on the real built-in interpreter; JS/HTML/CSS run in the preview</span>
        </div>
        <div style="display:flex;flex:1;overflow:hidden">
          <div style="display:flex;flex:1;overflow:hidden">
            <div id="cs-gutter" style="padding:8px 6px;text-align:right;font-family:var(--mono);font-size:0.78em;color:#555;line-height:1.5;user-select:none;background:rgba(0,0,0,0.15);overflow:hidden;min-width:36px">1</div>
            <textarea id="cs-editor" spellcheck="false" style="flex:1;padding:8px;background:transparent;color:#d4d4d4;font-family:'Courier New',monospace;font-size:0.82em;line-height:1.5;resize:none;border:none;white-space:pre;overflow:auto;tab-size:2" placeholder="Type your code here..."></textarea>
          </div>
          <div id="cs-preview" style="width:45%;border-left:1px solid rgba(255,255,255,0.06);background:#0a0a1a;display:none;flex-direction:column">
            <div style="padding:6px 10px;font-size:0.72em;color:var(--text2);border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.2)">Output Preview</div>
            <iframe id="cs-iframe" style="flex:1;border:none;background:#0a0a1a" sandbox="allow-scripts"></iframe>
            <div id="cs-stdin-box" style="border-top:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.2)">
              <div style="padding:4px 8px;font-size:0.72em;color:var(--text2)">Program Input (stdin):</div>
              <textarea id="cs-stdin" rows="2" style="width:100%;box-sizing:border-box;background:#111;color:#eee;font-family:monospace;font-size:0.76em;padding:4px 8px;border:none;border-top:1px solid rgba(255,255,255,0.04);resize:vertical" placeholder="Input for scanf / cin / ReadLine..."></textarea>
            </div>
            <div id="cs-console" style="padding:8px;font-family:var(--mono);font-size:0.76em;color:#4f4;background:rgba(0,0,0,0.3);max-height:120px;overflow:auto;white-space:pre-wrap"></div>
          </div>
        </div>
      </div>
    `;
    
    textarea = winBody.querySelector('#cs-editor');
    var gutter = winBody.querySelector('#cs-gutter');
    var langSel = winBody.querySelector('#cs-lang');
    var status = winBody.querySelector('#cs-status');
    var preview = winBody.querySelector('#cs-preview');
    var iframe = winBody.querySelector('#cs-iframe');
    var consoleEl = winBody.querySelector('#cs-console');
    
    langSel.onchange = function() {
      var prevLang = currentLang;
      currentLang = this.value;
      var empty = !textarea.value || textarea.value.match(/^\s*$/);
      var wasStarter = textarea.value === languages[prevLang].template;
      if (empty || wasStarter) {
        // starter template: swap it for the new language's starter
        textarea.value = languages[currentLang].template;
        updateGutter();
      } else if (prevLang !== currentLang) {
        // user code: keep it, but tell them what language they are now in
        try { if (MWO.notif && MWO.notif.show) MWO.notif.show('Code Studio', 'Language set to ' + languages[currentLang].name + '. Your code was kept. Clear the editor to load the ' + languages[currentLang].name + ' starter template.'); } catch (e) {}
      }
      updateStatus();
    };
    
    textarea.oninput = function() { updateGutter(); updateStatus(); };
    textarea.onkeydown = function(e) { handleKeys(e); };
    textarea.onclick = function() { updateStatus(); };
    textarea.onkeyup = function() { updateStatus(); };
    
    // Tab key
    textarea.onkeydown = function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = textarea.selectionStart;
        var end = textarea.selectionEnd;
        textarea.value = textarea.value.substr(0, start) + '  ' + textarea.value.substr(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        updateGutter();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        run();
      }
    };
    
    function updateGutter() {
      var lines = textarea.value.split('\n').length;
      var html = '';
      for (var i = 1; i <= lines; i++) html += i + '\n';
      gutter.textContent = html;
      lineCount = lines;
    }
    
    function updateStatus() {
      var pos = textarea.selectionStart;
      var before = textarea.value.substr(0, pos);
      var line = before.split('\n').length;
      var col = pos - before.lastIndexOf('\n');
      status.textContent = `Line ${line}, Col ${col} | ${lineCount} lines | ${currentLang} (practical subset interpreter)`;
    }
    
    // Set template if empty
    if (!textarea.value) {
      textarea.value = languages[currentLang].template;
      updateGutter();
    }
    
    // Scroll gutter with textarea
    textarea.onscroll = function() {
      gutter.scrollTop = textarea.scrollTop;
    };
  }
  
  function handleKeys(e) {
    // Additional keyboard shortcuts handled here
  }
  
  function newFile() {
    if (textarea) {
      textarea.value = languages[currentLang].template;
      var gutter = winBody.querySelector('#cs-gutter');
      if (gutter) {
        var lines = textarea.value.split('\n').length;
        var html = '';
        for (var i = 1; i <= lines; i++) html += i + '\n';
        gutter.textContent = html;
      }
    }
    currentFile = null;
  }
  
  function openFile() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.c,.cpp,.cs,.html,.css,.js,.json,.txt';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        if (textarea) {
          textarea.value = ev.target.result;
          var gutter = winBody.querySelector('#cs-gutter');
          if (gutter) {
            var lines = textarea.value.split('\n').length;
            var html = '';
            for (var i = 1; i <= lines; i++) html += i + '\n';
            gutter.textContent = html;
          }
        }
        currentFile = file.name;
        var ext = file.name.split('.').pop().toLowerCase();
        var langMap = { 'c':'c', 'cpp':'cpp', 'cc':'cpp', 'cxx':'cpp', 'h':'c', 'hpp':'cpp', 'cs':'csharp', 'html':'html', 'htm':'html', 'css':'css', 'js':'javascript', 'json':'json' };
        if (langMap[ext]) {
          currentLang = langMap[ext];
          var langSel = winBody.querySelector('#cs-lang');
          if (langSel) langSel.value = currentLang;
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
  
  function insertImage() {
    if (!textarea) return;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = function(e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      if (!files.length) return;
      files.forEach(function(f) {
        var rd = new FileReader();
        rd.onload = function(ev) {
          var uri = ev.target.result;
          // keep a copy inside the OS so it persists
          try {
            MWO.fs.mkdir('/Pictures').then(function() {
              return MWO.fs.writeFile('/Pictures/' + (f.name || ('img-' + Date.now() + '.png')), uri);
            }).catch(function() {});
          } catch (err) {}
          var snippet;
          if (currentLang === 'html') {
            snippet = '<img src="' + uri + '" alt="image">';
          } else if (currentLang === 'css') {
            snippet = 'background-image: url("' + uri + '");';
          } else if (currentLang === 'javascript' || currentLang === 'json') {
            snippet = 'var img = new Image(); img.src = "' + uri + '";';
          } else {
            snippet = '// image "' + (f.name || 'image') + '" imported to /Pictures (binary data cannot be embedded in ' + currentLang + ' source)';
          }
          var start = textarea.selectionStart || textarea.value.length;
          var end = textarea.selectionEnd || start;
          var before = textarea.value.slice(0, start);
          var after = textarea.value.slice(end);
          textarea.value = before + snippet + '\n' + after;
          textarea.selectionStart = textarea.selectionEnd = start + snippet.length + 1;
        };
        rd.readAsDataURL(f);
      });
    };
    input.click();
  }

  function saveFile() {
    if (!textarea) return;
    var ext = languages[currentLang].ext;
    var filename = currentFile || ('untitled' + ext);
    var content = textarea.value;
    var path = '/Documents/' + filename;
    MWO.fs.writeFile(path, content).then(function() {
      MWO.notif.show('Code Studio', 'Saved to ' + path);
    }).catch(function() {
      var blob = new Blob([content], { type: 'text/plain' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    });
  }
  
  function run() {
    if (!textarea) return;
    var code = textarea.value;
    var preview = winBody.querySelector('#cs-preview');
    var iframe = winBody.querySelector('#cs-iframe');
    var consoleEl = winBody.querySelector('#cs-console');
    
    if (currentLang === 'html') {
      preview.style.display = 'flex';
      iframe.srcdoc = code;
      consoleEl.innerHTML = '<span style="color:#888">HTML rendered in preview</span>';
    } else if (currentLang === 'css') {
      preview.style.display = 'flex';
      var html = '<!DOCTYPE html><html><head><style>' + code + '</style></head><body><div style="padding:20px"><h1>Styled Text</h1><p>This is a paragraph.</p><button>Button</button><ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul><input placeholder="Input field"></div></body></html>';
      iframe.srcdoc = html;
      consoleEl.innerHTML = '<span style="color:#888">CSS applied to preview</span>';
    } else if (currentLang === 'javascript') {
      preview.style.display = 'flex';
      var jsHtml = '<!DOCTYPE html><html><head><style>body{font-family:monospace;padding:10px;background:#1a1a2e;color:#4f4}#out{white-space:pre-wrap}</style></head><body><div id="out"></div><script>var out=document.getElementById("out");console.log=function(){var args=[];for(var i=0;i<arguments.length;i++)args.push(String(arguments[i]));out.textContent+=args.join(" ")+"\\n";};try{' + code + '}catch(e){out.textContent+="Error: "+e.message+"\\n";}<\/script></body></html>';
      iframe.srcdoc = jsHtml;
      consoleEl.innerHTML = '<span style="color:#888">JS executed in preview</span>';
    } else if (currentLang === 'json') {
      preview.style.display = 'flex';
      try {
        var parsed = JSON.parse(code);
        var pretty = JSON.stringify(parsed, null, 2);
        var html = '<!DOCTYPE html><html><head><style>body{font-family:monospace;padding:16px;background:#1a1a2e;color:#e0e0e0;white-space:pre}</style></head><body>' + escapeHtml(pretty) + '</body></html>';
        iframe.srcdoc = html;
        consoleEl.innerHTML = '<span style="color:#4f4">Valid JSON [ok]</span>';
      } catch(e) {
        consoleEl.innerHTML = '<span style="color:#f44">Invalid JSON: ' + escapeHtml(e.message) + '</span>';
      }
    } else if (currentLang === 'c' || currentLang === 'cpp' || currentLang === 'csharp') {
      preview.style.display = 'flex';
      if (!MWO.CInterp) {
        consoleEl.innerHTML = '<span style="color:#f44">Error: MWO.CInterp real interpreter is missing.</span>';
        return;
      }
      var stdinEl = winBody.querySelector('#cs-stdin');
      var stdinText = stdinEl ? stdinEl.value : '';
      
      var res = MWO.CInterp.run(code, currentLang, stdinText);
      var html = '<!DOCTYPE html><html><head><style>body{font-family:"Courier New",monospace;padding:16px;background:#0a0a1a;color:#d4d4d4;white-space:pre-wrap;font-size:13px;line-height:1.6;margin:0}</style></head><body>' + escapeHtml(res.output) + '</body></html>';
      iframe.srcdoc = html;
      
      if (res.ok) {
        consoleEl.innerHTML = '<span style="color:#4f4">Execution finished (real interpreter) — exit 0</span>';
      } else {
        var errHtml = res.errors.map(escapeHtml).join('<br>');
        consoleEl.innerHTML = '<span style="color:#f44">Execution aborted — see output</span><br><span style="color:#f66">' + errHtml + '</span>';
      }
    }
  }
  
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  
  return {
    launch: launch,
    insertImage: insertImage,
    newFile: newFile,
    openFile: openFile,
    saveFile: saveFile,
    run: run,
    publish: function() {
      var src = textarea ? textarea.value : '';
      if (!src.trim()) { alert('Write some code first.'); return; }
      if (currentLang !== 'html' && currentLang !== 'javascript') {
        alert('Publishing to the MWO Store supports HTML/CSS/JS projects. For C/C++/C# code, use Run to execute it here.');
        return;
      }
      try {
        var html = currentLang === 'html' ? src
          : '<!DOCTYPE html><html><head></head><body style="background:#0d1117;color:#e8e8e8;font-family:monospace;padding:12px"><script>\n' +
            src.replace(/<\//g, '<\\/') + '\n<\/script></body></html>';
        var bytes = new TextEncoder().encode(html);
        MWO.ZipBuilder.buildZip([{ name: 'index.html', bytes: bytes }]).then(function(buf) {
          var f = new File([buf], 'codestudio_project.zip', { type: 'application/zip' });
          MWO.Publisher.openWithZip(f);
          alert('Real zip built in-OS. Complete the MossGuard scan, rules, and disclaimer in Publish Studio to publish it to the MWO Store.');
        });
      } catch (e) { alert('Publish failed: ' + e.message); }
    }
  };
})();
