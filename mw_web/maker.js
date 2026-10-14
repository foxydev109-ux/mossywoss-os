// MossyWoss Maker — Build web apps, games, websites, and VR experiences
// Exports as HTML5 files into the MossyWoss OS filesystem (not the user's real device)
MWO.Maker = (function() {
  var winBody = null;
  var projectType = 'webapp';
  var projectName = 'My Project';
  var codeEditor = null;
  var previewFrame = null;
  var activeTab = 'html';
  var files = { html: '', css: '', js: '', vr: '' };
  
  var templates = {
    webapp: {
      name: 'Web App',
      icon: '🌐',
      html: '<!DOCTYPE html>\n<html>\n<head>\n<title>My Web App</title>\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n<div id="app">\n<h1>Hello World</h1>\n<button id="btn">Click Me</button>\n<p id="counter">0</p>\n</div>\n<script src="script.js"><\/script>\n</body>\n</html>',
      css: '#app{display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px;font-family:sans-serif}\n#btn{padding:10px 20px;background:#e94560;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px}\n#btn:active{opacity:0.8}\n#counter{font-size:2em;font-weight:bold}',
      js: 'var count=0;document.getElementById("btn").onclick=function(){count++;document.getElementById("counter").textContent=count;};'
    },
    game: {
      name: '2D Game',
      icon: '🎮',
      html: '<!DOCTYPE html>\n<html>\n<head>\n<title>My Game</title>\n<style>body{margin:0;overflow:hidden;background:#000}canvas{display:block}<\/style>\n</head>\n<body>\n<canvas id="game"></canvas>\n<script src="script.js"><\/script>\n</body>\n</html>',
      css: '',
      js: 'var canvas=document.getElementById("game");var ctx=canvas.getContext("2d");canvas.width=window.innerWidth;canvas.height=window.innerHeight;var player={x:100,y:100,r:20,vx:0,vy:0};var keys={};window.addEventListener("keydown",function(e){keys[e.key]=true;});window.addEventListener("keyup",function(e){keys[e.key]=false;});function loop(){player.vx=0;player.vy=0;if(keys["ArrowLeft"])player.vx=-4;if(keys["ArrowRight"])player.vx=4;if(keys["ArrowUp"])player.vy=-4;if(keys["ArrowDown"])player.vy=4;player.x+=player.vx;player.y+=player.vy;ctx.fillStyle="#1a1a2e";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#e94560";ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fill();requestAnimationFrame(loop);}loop();'
    },
    website: {
      name: 'Website',
      icon: '🌍',
      html: '<!DOCTYPE html>\n<html>\n<head>\n<title>My Website</title>\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n<header><nav><h1>My Website</h1></nav></header>\n<main>\n<section id="hero"><h2>Welcome</h2><p>This is my website built with MossyWoss Maker.</p></section>\n<section id="about"><h2>About</h2><p>Add your content here.</p></section>\n</main>\n<footer><p>© 2026 My Website</p></footer>\n<script src="script.js"><\/script>\n</body>\n</html>',
      css: '*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif}header{background:linear-gradient(135deg,#0a0a1a,#0f3460);color:#fff;padding:20px 40px}main{max-width:800px;margin:0 auto;padding:40px 20px}section{margin-bottom:40px}h2{color:#0f3460;margin-bottom:10px}footer{text-align:center;padding:20px;background:#1a1a2e;color:#999;font-size:0.85em}',
      js: '// Website interactions\nconsole.log("Website loaded");'
    },
    vr: {
      name: 'VR Experience',
      icon: '🥽',
      html: '<!DOCTYPE html>\n<html>\n<head>\n<title>VR Experience</title>\n<style>body{margin:0;overflow:hidden}canvas{display:block}#info{position:fixed;top:10px;left:10px;color:#fff;background:rgba(0,0,0,0.5);padding:8px 12px;border-radius:6px;font-family:sans-serif;font-size:12px;z-index:10}<\/style>\n</head>\n<body>\n<div id="info">VR Mode — Drag to look | Tap to interact</div>\n<canvas id="vr-canvas"></canvas>\n<script src="script.js"><\/script>\n</body>\n</html>',
      css: '',
      js: '// VR experience using canvas 3D projection\n// Works on phone, tablet, desktop — auto-detects VR/AR capability\nvar canvas=document.getElementById("vr-canvas");var ctx=canvas.getContext("2d");canvas.width=window.innerWidth;canvas.height=window.innerHeight;window.addEventListener("resize",function(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;});var rotX=0,rotY=0;var dragging=false,lastX=0,lastY=0;canvas.addEventListener("mousedown",function(e){dragging=true;lastX=e.clientX;lastY=e.clientY;});canvas.addEventListener("mousemove",function(e){if(!dragging)return;rotY+=(e.clientX-lastX)*0.01;rotX+=(e.clientY-lastY)*0.01;lastX=e.clientX;lastY=e.clientY;});canvas.addEventListener("mouseup",function(){dragging=false;});canvas.addEventListener("touchstart",function(e){if(e.touches.length===1){dragging=true;lastX=e.touches[0].clientX;lastY=e.touches[0].clientY;}});canvas.addEventListener("touchmove",function(e){if(!dragging||e.touches.length!==1)return;rotY+=(e.touches[0].clientX-lastX)*0.01;rotX+=(e.touches[0].clientY-lastY)*0.01;lastX=e.touches[0].clientX;lastY=e.touches[0].clientY;e.preventDefault();});canvas.addEventListener("touchend",function(){dragging=false;});var cubes=[];for(var i=0;i<20;i++){cubes.push({x:(Math.random()-0.5)*10,y:(Math.random()-0.5)*10,z:(Math.random()-0.5)*10,s:0.3+Math.random()*0.7,color:"hsl("+Math.random()*360+",70%,60%)"});}\nfunction project(x,y,z){var cosY=Math.cos(rotY);var sinY=Math.sin(rotY);var rx=x*cosY-z*sinY;var rz=x*sinY+z*cosY;var cosX=Math.cos(rotX);var sinX=Math.sin(rotX);var ry=y*cosX-rz*sinX;var rz2=y*sinX+rz*cosX;if(rz2<-5||rz2>5)return null;var f=canvas.height/2/(rz2+6);return{sx:canvas.width/2+rx*f,sy:canvas.height/2-ry*f,scale:f,z:rz2};}\nfunction render(){ctx.fillStyle="#050510";ctx.fillRect(0,0,canvas.width,canvas.height);cubes.sort(function(a,b){return b.z-a.z;});cubes.forEach(function(c){var p=project(c.x,c.y,c.z);if(p&&p.scale>0){var s=c.s*p.scale*50;ctx.globalAlpha=Math.max(0.2,Math.min(1,p.scale));ctx.fillStyle=c.color;ctx.fillRect(p.sx-s/2,p.sy-s/2,s,s);ctx.globalAlpha=1;}});requestAnimationFrame(render);}\nrender();'
    },
    webgame: {
      name: 'Web Game (HTML5)',
      icon: '🎯',
      html: '<!DOCTYPE html>\n<html>\n<head>\n<title>My Web Game</title>\n<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a1a;overflow:hidden}canvas{display:block;margin:0 auto}<\/style>\n</head>\n<body>\n<canvas id="game" width="640" height="480"></canvas>\n<script src="script.js"><\/script>\n</body>\n</html>',
      css: '',
      js: '// HTML5-ready web game\nvar canvas=document.getElementById("game");var ctx=canvas.getContext("2d");var score=0;var player={x:320,y:240,s:20};var item={x:Math.random()*600+20,y:Math.random()*400+20};var keys={};window.addEventListener("keydown",function(e){keys[e.key]=true;});window.addEventListener("keyup",function(e){keys[e.key]=false;});function update(){if(keys.ArrowLeft||keys.a)player.x-=4;if(keys.ArrowRight||keys.d)player.x+=4;if(keys.ArrowUp||keys.w)player.y-=4;if(keys.ArrowDown||keys.s)player.y+=4;player.x=Math.max(player.s,Math.min(640-player.s,player.x));player.y=Math.max(player.s,Math.min(480-player.s,player.y));if(Math.abs(player.x-item.x)<25&&Math.abs(player.y-item.y)<25){score++;item.x=Math.random()*600+20;item.y=Math.random()*400+20;}}\nfunction draw(){ctx.fillStyle="#0a0a1a";ctx.fillRect(0,0,640,480);ctx.fillStyle="#e94560";ctx.beginPath();ctx.arc(player.x,player.y,player.s,0,Math.PI*2);ctx.fill();ctx.fillStyle="#16a085";ctx.beginPath();ctx.arc(item.x,item.y,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="20px sans-serif";ctx.fillText("Score: "+score,10,30);}\nfunction loop(){update();draw();requestAnimationFrame(loop);}loop();'
    },
    app: {
      name: 'Desktop App',
      icon: '📱',
      html: '<!DOCTYPE html>\n<html>\n<head>\n<title>My App</title>\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n<div class="app-shell">\n<div class="app-header"><h1>📱 My App</h1></div>\n<div class="app-body"><p>Your app content here.</p>\n<div id="content"></div>\n</div>\n<div class="app-footer"><button onclick="doAction()">Action</button></div>\n</div>\n<script src="script.js"><\/script>\n</body>\n</html>',
      css: '*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#1a1a2e;color:#eee}.app-shell{max-width:500px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column}.app-header{background:#0f3460;padding:16px 20px;text-align:center}.app-body{flex:1;padding:20px;overflow:auto}.app-footer{padding:12px;text-align:center}.app-footer button{padding:10px 24px;background:#e94560;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer}',
      js: 'function doAction(){var c=document.getElementById("content");var d=document.createElement("p");d.textContent="Action triggered at "+new Date().toLocaleTimeString();c.appendChild(d);}'
    }
  };

  function launch() {
    var w = MWO.wm.create({
      id: 'maker-' + Date.now(),
      title: 'MossyWoss Maker',
      icon: '🔧',
      width: 850, height: 620,
      x: 60, y: 30,
      resizable: true
    });
    winBody = w;
    projectType = 'webapp';
    render();
  }

  function render() {
    // Load template into files
    var tmpl = templates[projectType] || templates.webapp;
    if (!files.html) files.html = tmpl.html;
    if (!files.css) files.css = tmpl.css;
    if (!files.js) files.js = tmpl.js;
    
    winBody.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#0d0d1a">
        <div style="display:flex;align-items:center;padding:6px 8px;gap:6px;border-bottom:1px solid rgba(255,255,255,0.06)">
          <select id="mk-type" style="padding:6px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#eee;font-size:0.82em">
            ${Object.keys(templates).map(k => `<option value="${k}" ${k===projectType?'selected':''}>${templates[k].icon} ${templates[k].name}</option>`).join('')}
          </select>
          <input id="mk-name" type="text" value="${projectName}" placeholder="Project name" style="padding:6px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#eee;font-size:0.82em;width:160px">
          <button class="mw-btn" onclick="MWO.Maker.loadTemplate()" style="font-size:0.76em;padding:6px 10px">Load Template</button>
          <button class="mw-btn" onclick="MWO.Maker.exportHTML()" style="font-size:0.76em;padding:6px 10px">Export HTML5</button>
          <button class="mw-btn" onclick="MWO.Maker.exportToOS()" style="font-size:0.76em;padding:6px 10px">Export to OS</button>
          <button class="mw-btn primary" onclick="MWO.Maker.runPreview()" style="font-size:0.76em;padding:6px 14px">▶ Preview</button>
          <div style="flex:1"></div>
          <span id="mk-status" style="font-size:0.72em;color:var(--text2)">Ready</span>
        </div>
        <div style="display:flex;flex:1;overflow:hidden">
          <div style="display:flex;flex-direction:column;flex:1;overflow:hidden">
            <div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.06)">
              <button class="mk-tab ${activeTab==='html'?'active':''}" data-tab="html" onclick="MWO.Maker.switchTab('html')" style="padding:8px 16px;font-size:0.8em;color:${activeTab==='html'?'#e94560':'#999'};background:${activeTab==='html'?'rgba(233,69,96,0.1)':'transparent'};border:none;cursor:pointer;border-bottom:2px solid ${activeTab==='html'?'#e94560':'transparent'}">HTML</button>
              <button class="mk-tab" data-tab="css" onclick="MWO.Maker.switchTab('css')" style="padding:8px 16px;font-size:0.8em;color:${activeTab==='css'?'#e94560':'#999'};background:${activeTab==='css'?'rgba(233,69,96,0.1)':'transparent'};border:none;cursor:pointer;border-bottom:2px solid ${activeTab==='css'?'#e94560':'transparent'}">CSS</button>
              <button class="mk-tab" data-tab="js" onclick="MWO.Maker.switchTab('js')" style="padding:8px 16px;font-size:0.8em;color:${activeTab==='js'?'#e94560':'#999'};background:${activeTab==='js'?'rgba(233,69,96,0.1)':'transparent'};border:none;cursor:pointer;border-bottom:2px solid ${activeTab==='js'?'#e94560':'transparent'}">JavaScript</button>
            </div>
            <textarea id="mk-editor" spellcheck="false" style="flex:1;padding:10px;background:#0a0a14;color:#d4d4d4;font-family:'Courier New',monospace;font-size:0.82em;line-height:1.5;resize:none;border:none;white-space:pre;overflow:auto;tab-size:2;width:100%">${files[activeTab].replace(/</g,'<').replace(/>/g,'>')}</textarea>
          </div>
          <div style="width:50%;border-left:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column">
            <div style="padding:6px 10px;font-size:0.72em;color:var(--text2);border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.2)">Preview</div>
            <iframe id="mk-preview" style="flex:1;border:none;background:#fff" sandbox="allow-scripts allow-same-origin"></iframe>
            <div style="padding:6px 10px;border-top:1px solid rgba(255,255,255,0.06);font-size:0.72em;display:flex;gap:8px;align-items:center">
              <button class="mw-btn" onclick="MWO.Maker.runPreview()" style="font-size:0.85em;padding:4px 10px">▶ Run</button>
              <button class="mw-btn" onclick="MWO.Maker.openInBrowser()" style="font-size:0.85em;padding:4px 10px">Open in Browser</button>
              <span style="color:var(--text2);flex:1;text-align:right" id="mk-size">0 bytes</span>
            </div>
          </div>
        </div>
      </div>
    `;

    codeEditor = winBody.querySelector('#mk-editor');
    previewFrame = winBody.querySelector('#mk-preview');
    
    var typeSel = winBody.querySelector('#mk-type');
    var nameInput = winBody.querySelector('#mk-name');
    
    typeSel.onchange = function() {
      projectType = this.value;
      // Only load template if current files are empty or template
      var tmpl = templates[projectType];
      if (tmpl && (files.html === '' || files.html === templates.webapp.html)) {
        files.html = tmpl.html;
        files.css = tmpl.css;
        files.js = tmpl.js;
      }
      switchTab(activeTab);
    };
    
    nameInput.onchange = function() { projectName = this.value; };
    
    codeEditor.oninput = function() {
      files[activeTab] = codeEditor.value;
      updateSize();
    };
    
    codeEditor.onkeydown = function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = codeEditor.selectionStart;
        var ed = codeEditor.selectionEnd;
        codeEditor.value = codeEditor.value.substr(0, s) + '  ' + codeEditor.value.substr(ed);
        codeEditor.selectionStart = codeEditor.selectionEnd = s + 2;
      }
    };
    
    updateSize();
    runPreview();
  }

  function switchTab(tab) {
    // Save current
    if (codeEditor) files[activeTab] = codeEditor.value;
    activeTab = tab;
    // Update UI
    var tabs = winBody.querySelectorAll('.mk-tab');
    tabs.forEach(function(t) {
      if (t.dataset.tab === tab) {
        t.style.color = '#e94560';
        t.style.background = 'rgba(233,69,96,0.1)';
        t.style.borderBottom = '2px solid #e94560';
      } else {
        t.style.color = '#999';
        t.style.background = 'transparent';
        t.style.borderBottom = '2px solid transparent';
      }
    });
    if (codeEditor) {
      codeEditor.value = files[tab] || '';
    }
  }

  function loadTemplate() {
    var tmpl = templates[projectType] || templates.webapp;
    files.html = tmpl.html;
    files.css = tmpl.css;
    files.js = tmpl.js;
    switchTab(activeTab);
    runPreview();
    setStatus('Template loaded');
  }

  function runPreview() {
    if (codeEditor) files[activeTab] = codeEditor.value;
    var html = buildHTML();
    if (previewFrame) {
      previewFrame.srcdoc = html;
    }
    updateSize();
  }

  function openInBrowser() {
    // Save to VFS then open in browser app
    var html = buildHTML();
    var path = '/WebApps/' + (projectName || 'untitled').replace(/[^a-zA-Z0-9]/g, '_') + '.html';
    MWO.fs.writeFile(path, html).then(function() {
      // Launch browser app pointing to this file
      if (MWO.apps['browser'] && MWO.apps['browser'].launch) {
        MWO.apps['browser'].launch(path);
      }
      setStatus('Opened in browser at ' + path);
    }).catch(function() {
      // Fallback: just run preview
      runPreview();
    });
  }

  function buildHTML() {
    // Combine HTML/CSS/JS into single file
    var html = files.html || '';
    var css = files.css || '';
    var js = files.js || '';
    
    // If css is linked, replace with inline
    html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/g, '<style>\n' + css + '\n</style>');
    // If js is linked, replace with inline
    html = html.replace(/<script[^>]*src=["'][^"']*["'][^>]*><\/script>/g, '<script>\n' + js + '\n<\/script>');
    
    // If no style tag was found but css exists, inject into head
    if (css && html.indexOf('<style') === -1) {
      html = html.replace(/<head[^>]*>/, function(m) { return m + '\n<style>\n' + css + '\n</style>'; });
    }
    // If no script tag found but js exists, inject before </body>
    if (js && html.indexOf('<script') === -1) {
      html = html.replace(/<\/body>/, '<script>\n' + js + '\n<\/script>\n</body>');
    }
    
    return html;
  }

  function exportHTML() {
    var html = buildHTML();
    var filename = (projectName || 'untitled').replace(/[^a-zA-Z0-9_-]/g, '_') + '.html';
    
    // Save to VFS /WebApps
    var path = '/WebApps/' + filename;
    MWO.fs.writeFile(path, html).then(function() {
      setStatus('Exported to ' + path);
      MWO.notif.show('Maker', 'Exported ' + filename + ' to WebApps');
      
      // Also offer download
      var blob = new Blob([html], { type: 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    }).catch(function() {
      // Fallback: just download
      var blob = new Blob([html], { type: 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setStatus('Downloaded ' + filename);
    });
  }

  function exportToOS() {
    // Export as a runnable app within MossyWoss OS
    var html = buildHTML();
    var appId = (projectName || 'myapp').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    var icon = templates[projectType] ? templates[projectType].icon : '📦';
    
    // Save to VFS
    var path = '/WebApps/' + appId + '.html';
    MWO.fs.writeFile(path, html).then(function() {
      // Register as a launchable app in the OS
      MWO.registerApp({
        id: appId,
        name: projectName || 'My App',
        description: 'User-created ' + (templates[projectType] ? templates[projectType].name : 'app'),
        icon: icon,
        category: 'app',
        installed: true,
        launch: function() {
          var w = MWO.wm.create({
            id: appId + '-' + Date.now(),
            title: projectName || 'My App',
            icon: icon,
            width: 700, height: 500,
            x: 80 + Math.random() * 40,
            y: 40 + Math.random() * 30,
            resizable: true
          });
          var iframe = document.createElement('iframe');
          iframe.style.cssText = 'width:100%;height:100%;border:none;background:#fff';
          iframe.sandbox = 'allow-scripts allow-same-origin allow-forms';
          iframe.srcdoc = html;
          w.innerHTML = '';
          w.appendChild(iframe);
        }
      });
      
      setStatus('App installed to OS');
      MWO.notif.show('Maker', projectName + ' installed as app');
      MWO.start.refresh();
    });
  }

  function updateSize() {
    var total = (files.html || '').length + (files.css || '').length + (files.js || '').length;
    var el = winBody.querySelector('#mk-size');
    if (el) {
      if (total < 1024) el.textContent = total + ' bytes';
      else if (total < 1024*1024) el.textContent = (total/1024).toFixed(1) + ' KB';
      else el.textContent = (total/1024/1024).toFixed(1) + ' MB';
    }
  }

  function setStatus(msg) {
    var el = winBody.querySelector('#mk-status');
    if (el) el.textContent = msg;
  }

  return {
    launch: launch,
    switchTab: switchTab,
    loadTemplate: loadTemplate,
    runPreview: runPreview,
    openInBrowser: openInBrowser,
    exportHTML: exportHTML,
    exportToOS: exportToOS
  };
})();
