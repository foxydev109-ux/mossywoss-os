/* PE Inspector: genuinely parses Windows PE executables (.exe/.dll) stored
   in the VFS. Reads the DOS MZ header, PE signature, machine type, sections
   and import table from the real file bytes. Static inspection only - it is
   honest about the fact that Windows programs cannot execute in this OS. */
(function(MWO) {
  'use strict';
  function bytesFromVFS(content) {
    if (typeof content === 'string' && content.indexOf('data:') === 0) {
      var b64 = content.split(',')[1] || '';
      var bin = atob(b64);
      var u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return u;
    }
    return null;
  }
  function parsePE(u) {
    var dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
    if (u.length < 0x40 || dv.getUint16(0, true) !== 0x5A4D) return { error: 'No DOS MZ header (not a Windows executable).' };
    var e_lfanew = dv.getUint32(0x3C, true);
    if (e_lfanew + 24 > u.length || dv.getUint32(e_lfanew, true) !== 0x00004550) return { error: 'PE signature not found (not a valid PE).' };
    var pe = e_lfanew;
    var machine = dv.getUint16(pe + 4, true);
    var numSections = dv.getUint16(pe + 6, true);
    var timestamp = new Date(dv.getUint32(pe + 8, true) * 1000);
    var optSize = dv.getUint16(pe + 20, true);
    var magic = dv.getUint16(pe + 24, true);
    var isPlus = (magic === 0x20b);
    var subsystem = dv.getUint16(pe + 24 + 68, true);
    var MACHINES = { 0x14c: 'x86 (32-bit)', 0x8664: 'x64 (64-bit)', 0x1c0: 'ARM Thumb', 0xAA64: 'ARM64', 0x1c4: 'ARMNT' };
    var SUBSYS = { 1: 'Native', 2: 'GUI (windowed)', 3: 'Console', 5: 'OS/2', 7: 'POSIX', 10: 'EFI app' };
    var sections = [];
    var secOff = pe + 24 + optSize;
    for (var s = 0; s < numSections && s < 96; s++) {
      var o = secOff + s * 40;
      if (o + 40 > u.length) break;
      var name = '';
      for (var c = 0; c < 8; c++) { var ch = u[o + c]; if (!ch) break; name += String.fromCharCode(ch); }
      sections.push({ name: name, virtSize: dv.getUint32(o + 8, true), rawSize: dv.getUint32(o + 16, true), rawPtr: dv.getUint32(o + 20, true), flags: dv.getUint32(o + 36, true) });
    }
    // imports: data dir entry index 1
    var ddOff = pe + 24 + (isPlus ? 112 : 96);
    var imports = [];
    if (ddOff + 16 <= u.length) {
      var impRVA = dv.getUint32(ddOff + 8, true);
      var impSize = dv.getUint32(ddOff + 12, true);
      if (impRVA && impSize) {
        // need VirtualAddress: re-read from section table
        var secVAs = [];
        for (var i = 0; i < sections.length; i++) { secVAs.push(null); }
        for (var i = 0; i < numSections && i < 96; i++) {
          var o2 = secOff + i * 40;
          secVAs[i] = dv.getUint32(o2 + 12, true);
        }
        function rvaToOff2(rva) {
          for (var i = 0; i < sections.length; i++) {
            var vs = sections[i].virtSize || sections[i].rawSize;
            if (rva >= secVAs[i] && rva < secVAs[i] + vs) return sections[i].rawPtr + (rva - secVAs[i]);
          }
          return 0;
        }
        var impOff = rvaToOff2(impRVA);
        var guard = 0;
        while (impOff && impOff + 20 <= u.length && guard++ < 64) {
          var nameRVA = dv.getUint32(impOff + 12, true);
          if (!nameRVA && !dv.getUint32(impOff, true)) break;
          var nameOff = rvaToOff2(nameRVA);
          var dll = '';
          if (nameOff && nameOff < u.length) {
            for (var c = nameOff; c < Math.min(u.length, nameOff + 64) && u[c]; c++) dll += String.fromCharCode(u[c]);
          }
          if (dll) imports.push(dll);
          impOff += 20;
        }
      }
    }
    return {
      machine: MACHINES[machine] || ('unknown (0x' + machine.toString(16) + ')'),
      format: isPlus ? 'PE32+ (64-bit optional header)' : (magic === 0x10b ? 'PE32 (32-bit optional header)' : 'unknown (0x' + magic.toString(16) + ')'),
      sections: sections, numSections: numSections,
      timestamp: timestamp.toUTCString(),
      subsystem: SUBSYS[subsystem] || ('other (' + subsystem + ')'),
      imports: imports
    };
  }
  MWO.registerApp({
    id: 'pe-inspector',
    name: 'PE Inspector',
    description: 'Parse real Windows .exe/.dll files: headers, sections and imports. Honest static inspection.',
    icon: 'binary',
    category: 'app',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({ id: 'peinsp-' + Date.now(), title: 'PE Inspector', icon: 'binary', width: 620, height: 520, resizable: true });
      var body = win;
      body.style.cssText = 'background:#12151f;color:#dfe4f0;font-size:13px;padding:12px;overflow:auto';
      body.innerHTML = `
        <div style="font-weight:bold;margin-bottom:6px">PE Inspector</div>
        <div style="color:#9aa4b8;margin-bottom:10px">Pick a file from your Downloads to analyze it as a real Windows executable.</div>
        <div id="pe-list" style="margin-bottom:10px"></div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input id="pe-path" class="mw-input" placeholder="or type a full VFS path, e.g. /Downloads/program.exe" style="flex:1" />
          <button id="pe-open" class="mw-btn primary">Analyze</button>
        </div>
        <div id="pe-out"></div>
      `;
      var out = body.querySelector('#pe-out');
      function render(res, name) {
        if (res.error) {
          out.innerHTML = '<div style="padding:10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);border-radius:8px">' + res.error + '</div>';
          return;
        }
        var secs = res.sections.map(function(s) {
          return '<tr><td style="padding:3px 8px">' + s.name + '</td><td>' + s.rawSize + ' B</td><td>0x' + s.rawPtr.toString(16) + '</td></tr>';
        }).join('');
        var imps = res.imports.length ? res.imports.map(function(d) { return '<li>' + d + '</li>'; }).join('') : '<li>none found</li>';
        out.innerHTML = `
          <div style="padding:12px;background:#1a1f2e;border-radius:10px">
            <div style="font-weight:bold;margin-bottom:8px">Valid PE executable: ${name}</div>
            <div>Machine: <b>${res.machine}</b> | Format: <b>${res.format}</b></div>
            <div>Subsystem: <b>${res.subsystem}</b> | Built: ${res.timestamp}</div>
            <div style="margin-top:8px;font-weight:600">Sections (${res.numSections})</div>
            <table style="border-collapse:collapse;font-size:12px"><tr><th style="text-align:left;padding:3px 8px">Name</th><th>Raw size</th><th>File offset</th></tr>${secs}</table>
            <div style="margin-top:8px;font-weight:600">Imports (DLLs)</div>
            <ul style="margin:4px 0 0 18px">${imps}</ul>
            <div style="margin-top:10px;color:#9aa4b8;font-size:11px">Static inspection only. A browser OS cannot run Windows programs - this reads the real bytes of the file, it does not execute them.</div>
          </div>`;
      }
      body.querySelector('#pe-open').onclick = async function() {
        var path = body.querySelector('#pe-path').value.trim();
        if (!path) return;
        try {
          var content = await MWO.fs.readFile(path);
          var u = bytesFromVFS(content);
          if (!u) { render({ error: 'That file is stored as text, not as binary data. Download it via the Browser first.' }, path); return; }
          render(parsePE(u), path.split('/').pop());
        } catch (e) { render({ error: 'Could not read ' + path + ': ' + e.message }, path); }
      };
      (async function() {
        try {
          var names = await MWO.fs.listDir('/Downloads');
          var el = body.querySelector('#pe-list');
          el.innerHTML = '<div style="color:#9aa4b8;margin-bottom:4px">In /Downloads:</div>';
          var count = 0;
          for (var i = 0; i < names.length && count < 12; i++) {
            var nm = (typeof names[i] === 'string') ? names[i] : names[i].name;
            if (typeof nm !== 'string') continue;
            if (/\.exe$|\.dll$/i.test(nm)) {
              count++;
              var b = document.createElement('button');
              b.textContent = nm;
              b.style.cssText = 'margin:2px 6px 2px 0;padding:4px 10px;border-radius:6px;border:1px solid #2e3a55;background:#1a2033;color:#cfe0ff;cursor:pointer;font-size:12px';
              var p = document.createElement('span');
              (function(p, nm) {
                b.onclick = function() { body.querySelector('#pe-path').value = '/Downloads/' + nm; body.querySelector('#pe-open').click(); };
              })(p, nm);
              el.appendChild(b);
            }
          }
          if (!count) el.innerHTML += '<div style="color:#667">No .exe or .dll files yet - download one with the Browser (e.g. from a trusted open-source project).</div>';
        } catch (e) {}
      })();
      return win;
    }
  });
})(MWO);
