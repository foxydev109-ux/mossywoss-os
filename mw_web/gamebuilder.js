/* ==========================================================================
   MossyWoss OS — Game Builder Kit (Store-downloadable)
   Code a game/app inside the OS (HTML/CSS/JS), test-run it live, then build a
   REAL zip (CRC32 + stored/deflate entries) and hand it to Publish Studio
   (MossGuard scan + mandatory rules/disclaimer) so it publishes to the MWO
   Store as user content with a Developer tag. Nothing touches the user's
   device — files live in the OS's own virtual file system.
   ========================================================================== */
(function(MWO) {
  'use strict';

  /* --- Real CRC32 (needed for valid zip entries) --- */
  var CRC_TABLE = (function() {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* --- Real zip writer: stored (method 0), or deflate-raw (method 8) when
       the platform provides CompressionStream. Produces genuine archives the
       OS's own extractor (and any desktop unzip) can open. --- */
  function buildZip(files) {
    // files: [{ name, bytes(Uint8Array) }]
    var enc = new TextEncoder();
    var chunks = [], central = [], offset = 0;
    var totalC = 0;
    var parts = [];
    files.forEach(function(f) { parts.push(f); });
    return (async function() {
      for (var i = 0; i < parts.length; i++) {
        var nameBytes = enc.encode(parts[i].name);
        var data = parts[i].bytes;
        var method = 0;
        var stored = data;
        if (typeof CompressionStream === 'function') {
          try {
            var stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
            var buf = new Uint8Array(await new Response(stream).arrayBuffer());
            if (buf.length < data.length) { stored = buf; method = 8; }
          } catch (e) { /* stored fallback */ }
        }
        var crc = crc32(data);
        var lh = new Uint8Array(30 + nameBytes.length);
        var dv = new DataView(lh.buffer);
        dv.setUint32(0, 0x04034b50, true);
        dv.setUint16(4, 20, true);       // version needed
        dv.setUint16(6, 0x0800, true);   // UTF-8 flag
        dv.setUint16(8, method, true);
        dv.setUint32(14, crc, true);
        dv.setUint32(18, stored.length, true);
        dv.setUint32(22, data.length, true);
        dv.setUint16(26, nameBytes.length, true);
        lh.set(nameBytes, 30);
        chunks.push(lh, stored);
        central.push({ nameBytes: nameBytes, crc: crc, method: method,
          compSize: stored.length, size: data.length, offset: offset });
        offset += lh.length + stored.length;
      }
      central.forEach(function(e) {
        var ch = new Uint8Array(46 + e.nameBytes.length);
        var dv = new DataView(ch.buffer);
        dv.setUint32(0, 0x02014b50, true);
        dv.setUint16(4, 20, true);
        dv.setUint16(6, 20, true);
        dv.setUint16(8, 0x0800, true);
        dv.setUint16(10, e.method, true);
        dv.setUint32(16, e.crc, true);
        dv.setUint32(20, e.compSize, true);
        dv.setUint32(24, e.size, true);
        dv.setUint16(28, e.nameBytes.length, true);
        dv.setUint32(42, e.offset, true);
        ch.set(e.nameBytes, 46);
        chunks.push(ch);
        totalC += ch.length;
      });
      var eocd = new Uint8Array(22);
      var dv = new DataView(eocd.buffer);
      dv.setUint32(0, 0x06054b50, true);
      dv.setUint16(8, central.length, true);
      dv.setUint16(10, central.length, true);
      dv.setUint32(12, totalC, true);
      dv.setUint32(16, offset, true);
      chunks.push(eocd);
      return await new Blob(chunks).arrayBuffer();
    })();
  }

  MWO.ZipBuilder = { buildZip: buildZip, crc32: crc32 };

  /* --- App --- */
  MWO.registerApp({
    id: 'game-builder',
    name: 'Game Builder Kit',
    icon: 'maker',
    width: 860, height: 560,
    category: 'Developer',
    description: 'Code games and apps in-OS, test-run them live, and publish to the MWO Store (MossGuard + rules + disclaimer)',
    installed: false,
    launch: function() {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;height:100%;background:#0d1117;color:#e8e8e8;font-family:inherit';

      const bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:8px;align-items:center;padding:8px 10px;background:#161b22;border-bottom:1px solid #21262d;flex-wrap:wrap';
      const nameIn = document.createElement('input');
      nameIn.placeholder = 'Game title';
      nameIn.value = '';
      nameIn.style.cssText = 'padding:8px 10px;border-radius:8px;border:1px solid #2c3346;background:#0d1117;color:#e8e8e8;min-width:160px';
      const runBtn = mkBtn('Test Run', '#238636');
      const pubBtn = mkBtn('Build zip + Publish', '#2e7d4f');
      const status = document.createElement('span');
      status.style.cssText = 'font-size:0.78em;opacity:0.7;flex:1;min-width:120px';
      bar.appendChild(nameIn); bar.appendChild(runBtn); bar.appendChild(pubBtn); bar.appendChild(status);

      const code = document.createElement('textarea');
      code.spellcheck = false;
      code.style.cssText = 'flex:1;resize:none;border:none;background:#0d1117;color:#c9d1d9;padding:12px;font-family:monospace;font-size:13px;outline:none';
      code.value = '<!DOCTYPE html>\n<html>\n<head><style>\n  body { margin:0; font-family:sans-serif; background:#10151c; color:#e8e8e8; display:flex; align-items:center; justify-content:center; height:100vh; flex-direction:column; }\n  #score { font-size:2em; margin-bottom:12px; }\n  #btn { padding:14px 30px; border-radius:10px; border:none; background:#2e7d4f; color:#fff; font-weight:700; cursor:pointer; }\n</style></head>\n<body>\n  <div id="score">Score: 0</div>\n  <button id="btn">Click me</button>\n  <script>\n    let s = 0;\n    document.getElementById("btn").onclick = () => {\n      s++;\n      document.getElementById("score").textContent = "Score: " + s;\n    };\n  <\/script>\n</body>\n</html>';

      const preview = document.createElement('div');
      preview.style.cssText = 'display:none;height:100%;background:#fff';
      const frame = document.createElement('iframe');
      frame.style.cssText = 'width:100%;height:100%;border:none;background:#fff';
      preview.appendChild(frame);

      const body = document.createElement('div');
      body.style.cssText = 'flex:1;display:flex;min-height:0;position:relative';
      body.appendChild(code); body.appendChild(preview);
      wrap.appendChild(bar); wrap.appendChild(body);

      function mkBtn(label, color) {
        const b = document.createElement('button');
        b.textContent = label;
        b.style.cssText = 'padding:8px 14px;border-radius:8px;border:1px solid ' + color + ';background:' + color + ';color:#fff;font-weight:600;cursor:pointer';
        return b;
      }

      runBtn.onclick = () => {
        code.style.display = 'none';
        preview.style.display = 'block';
        frame.srcdoc = code.value;
        status.textContent = 'Test running';
      };

      pubBtn.onclick = async () => {
        const title = (nameIn.value || '').trim() || 'My Game';
        try {
          const bytes = new TextEncoder().encode(code.value);
          const zipBuf = await buildZip([{ name: 'index.html', bytes: bytes }]);
          const fName = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'my_game';
          const fileObj = new File([zipBuf], fName + '.zip', { type: 'application/zip' });
          // Hand the real zip to Publish Studio: MossGuard scan, mandatory
          // rules + disclaimer, then live Store publishing with a Developer tag.
          MWO.Publisher.openWithZip(fileObj);
          status.textContent = 'Zip built (' + Math.round(zipBuf.byteLength / 1024) + ' KB) - finish publishing in Publish Studio';
          MWO.notif.show('Game Builder Kit', 'Real zip built in-OS. Complete the rules + disclaimer in Publish Studio to publish.');
        } catch (e) {
          status.textContent = 'Build failed: ' + e.message;
        }
      };

      MWO.wm.create({ id: 'game-builder', title: 'Game Builder Kit', icon: 'maker', width: 860, height: 560, content: wrap });
    }
  });
})(MWO);
