/* Host Link: real client for the optional Windows host app (host/mwo_host.py).
   Honest scope: connect, authenticate, view the host's allowlist, REQUEST a
   launch (the person at the PC consents), status + disconnect. No fake runs. */
(function(MWO) {
  MWO.registerApp({
    id: 'hostlink',
    name: 'Host Link',
    description: 'Connect to the optional Windows host app on your PC to request allowlisted programs. The host shows a consent prompt on the PC for every launch. Host source: host/mwo_host.py in the repo.',
    icon: 'terminal',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'hostlink-' + Date.now(), title: 'Host Link', icon: 'terminal', width: 460, height: 520, resizable: true });
      win.innerHTML =
        '<div style="padding:12px;font-size:0.85em;display:flex;flex-direction:column;gap:8px">' +
        '<div id="hl-status" style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.05)">Status: disconnected</div>' +
        '<input id="hl-url" placeholder="ws://192.168.1.10:8765" style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#fff">' +
        '<input id="hl-token" placeholder="Token from the host console" style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#fff">' +
        '<button id="hl-connect" class="mw-btn primary" style="padding:8px">Connect</button>' +
        '<button id="hl-disconnect" class="mw-btn" style="padding:8px;display:none">Disconnect</button>' +
        '<div style="color:#8a99ad">Programs the host allows:</div>' +
        '<div id="hl-apps" style="display:flex;flex-direction:column;gap:6px"></div>' +
        '<div style="color:#8a99ad;font-size:0.85em">Every launch request must be approved (y/n) by someone at the PC. The browser can never run shell commands or browse PC files.</div>' +
        '</div>';
      var ws = null;
      var status = win.querySelector('#hl-status');
      var list = win.querySelector('#hl-apps');
      win.querySelector('#hl-connect').onclick = function() {
        var url = win.querySelector('#hl-url').value.trim();
        var tok = win.querySelector('#hl-token').value.trim();
        if (!url || !tok) { status.textContent = 'Status: enter host URL and token'; return; }
        try { ws = new WebSocket(url); } catch (e) { status.textContent = 'Status: cannot open socket (' + e.message + ')'; return; }
        ws.onopen = function() { ws.send(JSON.stringify({ type: 'auth', token: tok })); };
        ws.onmessage = function(ev) {
          var m = {};
          try { m = JSON.parse(ev.data); } catch (e) {}
          if (m.type === 'status') { status.textContent = 'Status: connected (approved by host)'; win.querySelector('#hl-disconnect').style.display = ''; }
          if (m.type === 'allowlist') {
            list.innerHTML = '';
            (m.apps || []).forEach(function(a) {
              var row = document.createElement('div');
              row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px;border-radius:8px;background:rgba(255,255,255,0.05)';
              row.innerHTML = '<span>' + a.name + '</span>';
              var b = document.createElement('button');
              b.className = 'mw-btn'; b.textContent = 'Request launch'; b.style.padding = '5px 10px';
              b.onclick = function() {
                b.textContent = 'Requested...';
                ws.send(JSON.stringify({ type: 'launch', appId: a.id }));
              };
              row.appendChild(b); list.appendChild(row);
            });
            if (!(m.apps || []).length) list.innerHTML = '<div style="color:#8a99ad">Host allowlist is empty (see host/allowlist.json on the PC)</div>';
          }
          if (m.type === 'launch_result') {
            status.textContent = m.ok ? 'Status: host launched the program' : 'Status: launch failed (' + (m.error || 'unknown') + ')';
          }
          if (m.type === 'error') { status.textContent = 'Status: ' + (m.error || 'error') + ' - check the token'; }
        };
        ws.onclose = function() { status.textContent = 'Status: disconnected'; };
        ws.onerror = function() { status.textContent = 'Status: connection failed (host running? firewall?)'; };
      };
      win.querySelector('#hl-disconnect').onclick = function() { if (ws) ws.close(); };
    }
  });
})(MWO);
