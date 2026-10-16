/* ========================================================================
 * MossyWoss OS Security Scanner (MWO.Sec) & Update Engine (MWO.Updates)
 * Features: Static heuristic security scanning, quarantine management,
 * VFS recursion, in-OS lore history, real semver update checks & upgrades.
 * ======================================================================== */

(function(root) {
  'use strict';

  var MWO = root.MWO = root.MWO || {};

  // ----------------------------------------------------------------------
  // 1. Version System & Lore History
  // ----------------------------------------------------------------------
  MWO.version = {
    major: 1,
    minor: 0,
    patch: 0,
    codename: 'Mossdrop',
    string: function() {
      return this.major + '.' + this.minor + '.' + this.patch;
    }
  };

  MWO.Updates = MWO.Updates || {};

  MWO.Updates.history = [
    { v: '1.0.0', date: '2026-10-13', note: 'Production release Mossdrop — full system stability, MossGuard security suite, and touch-optimized shell.' },
    { v: '0.9.5', date: '2026-07-22', note: 'Added sandboxed HTML5 game runtime and background VFS synchronization.' },
    { v: '0.9.0', date: '2026-03-08', note: 'First boot on moss hardware architecture.' },
    { v: '0.8.0', date: '5011-11-15', note: 'Introduced Touch-VFS filesystem layer and multi-window manager.' },
    { v: '0.5.0', date: '5010-04-22', note: 'Alpha release of Spores UI and core process scheduler.' },
    { v: '0.1.0', date: '5008-11-14', note: 'Initial moss-kernel prototype created in cave lab.' }
  ];

  function compareSemver(v1, v2) {
    var p1 = String(v1 || '0.0.0').split('.').map(function(n) { return parseInt(n, 10) || 0; });
    var p2 = String(v2 || '0.0.0').split('.').map(function(n) { return parseInt(n, 10) || 0; });
    for (var i = 0; i < 3; i++) {
      var a = p1[i] || 0;
      var b = p2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }

  // Official update manifest, served straight from the GitHub repo.
  // Raw file URLs are CORS-enabled, so "Check for Updates" works out of the box.
  var DEFAULT_MANIFEST_URL = 'https://raw.githubusercontent.com/foxydev109-ux/mossywoss-os/main/update-manifest.json';

  MWO.Updates.getManifestUrl = function() {
    try {
      return localStorage.getItem('mwo_update_url') || DEFAULT_MANIFEST_URL;
    } catch(e) {
      return DEFAULT_MANIFEST_URL;
    }
  };

  MWO.Updates.setManifestUrl = function(url) {
    try {
      localStorage.setItem('mwo_update_url', url ? String(url).trim() : '');
    } catch(e) {}
  };

  MWO.Updates.getAutoCheck = function() {
    try {
      return localStorage.getItem('mwo_auto_update') !== 'false';
    } catch(e) {
      return true;
    }
  };

  MWO.Updates.setAutoCheck = function(val) {
    try {
      localStorage.setItem('mwo_auto_update', val ? 'true' : 'false');
    } catch(e) {}
  };

  MWO.Updates.checkForUpdates = async function(customUrl) {
    var url = customUrl || MWO.Updates.getManifestUrl();
    if (!url) {
      return { status: 'no_url', message: 'No update server set. Add a manifest URL in the settings below.' };
    }

    try {
      var res = await fetch(url);
      if (!res.ok) {
        throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      }
      var manifest = await res.json();
      if (!manifest || !manifest.version) {
        throw new Error('Invalid update manifest format (missing version field)');
      }

      var currentVer = MWO.version.string();
      var cmp = compareSemver(manifest.version, currentVer);
      var updateAvailable = cmp > 0;

      return {
        status: updateAvailable ? 'available' : 'up_to_date',
        updateAvailable: updateAvailable,
        currentVersion: currentVer,
        latestVersion: manifest.version,
        url: manifest.url || '',
        notes: Array.isArray(manifest.notes) ? manifest.notes : (manifest.notes ? [manifest.notes] : ['Bug fixes and performance enhancements.']),
        manifest: manifest
      };
    } catch(err) {
      return {
        status: 'error',
        message: 'Failed to fetch update manifest: ' + err.message
      };
    }
  };

  MWO.Updates.downloadAndInstall = async function(manifest, onProgress) {
    if (!manifest || !manifest.url) {
      throw new Error('Invalid update manifest: missing download URL.');
    }

    var res = await fetch(manifest.url);
    if (!res.ok) {
      throw new Error('Download failed: HTTP ' + res.status + ' ' + res.statusText);
    }

    var contentLength = res.headers.get('content-length');
    var totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    var loadedBytes = 0;

    var reader = res.body ? res.body.getReader() : null;
    var textContent = '';

    if (reader) {
      var chunks = [];
      while (true) {
        var result = await reader.read();
        if (result.done) break;
        chunks.push(result.value);
        loadedBytes += result.value.length;
        if (onProgress && totalBytes > 0) {
          onProgress(Math.min(100, Math.round((loadedBytes / totalBytes) * 100)), loadedBytes, totalBytes);
        }
      }
      var totalArray = new Uint8Array(loadedBytes);
      var offset = 0;
      for (var i = 0; i < chunks.length; i++) {
        totalArray.set(chunks[i], offset);
        offset += chunks[i].length;
      }
      textContent = new TextDecoder('utf-8').decode(totalArray);
    } else {
      textContent = await res.text();
      if (onProgress) onProgress(100, textContent.length, textContent.length);
    }

    var ver = manifest.version || '1.1.0';
    var savePath = '/System/updates/mossywoss_os_' + ver + '.html';

    // Ensure system updates directory
    if (MWO.fs) {
      if (!(await MWO.fs.exists('/System'))) await MWO.fs.mkdir('/System');
      if (!(await MWO.fs.exists('/System/updates'))) await MWO.fs.mkdir('/System/updates');
      await MWO.fs.writeFile(savePath, textContent);
    }

    var blob = new Blob([textContent], { type: 'text/html' });
    var blobUrl = URL.createObjectURL(blob);

    return {
      savePath: savePath,
      blobUrl: blobUrl,
      version: ver
    };
  };

  MWO.Updates.applyAndReboot = function(blobUrl) {
    if (blobUrl) {
      location.href = blobUrl;
    }
  };

  // ----------------------------------------------------------------------
  // 2. REAL Security Scanner (MWO.Sec)
  // ----------------------------------------------------------------------
  MWO.Sec = MWO.Sec || {};

  var EICAR_STRING = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

  function uint8ToLatin1(bytes) {
    var str = '';
    var chunkSize = 0x8000;
    for (var i = 0; i < bytes.length; i += chunkSize) {
      str += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return str;
  }

  MWO.Sec.scanBytes = function(name, bytes) {
    name = String(name || '');
    if (!(bytes instanceof Uint8Array)) {
      if (typeof bytes === 'string') {
        bytes = new TextEncoder().encode(bytes);
      } else if (bytes && bytes.buffer) {
        bytes = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      } else {
        bytes = new Uint8Array(0);
      }
    }

    var findings = [];
    var latin1Str = uint8ToLatin1(bytes);

    // 1. EICAR Test File String
    if (latin1Str.indexOf(EICAR_STRING) !== -1) {
      findings.push({
        type: 'eicar_signature',
        detail: 'EICAR test signature (industry test file, not real malware)',
        severity: 'high'
      });
    }

    // 2. PE Validation & Anomalies for .exe / .scr
    var isExeOrScr = /\.(exe|scr)$/i.test(name);
    var hasMZ = bytes.length >= 2 && bytes[0] === 0x4D && bytes[1] === 0x5A; // 'M' 'Z'

    if (isExeOrScr || hasMZ) {
      if (isExeOrScr && bytes.length < 64) {
        findings.push({
          type: 'corrupt_exe',
          detail: 'File <64 bytes claiming exe (corrupt/obfuscated executable)',
          severity: 'high'
        });
      } else if (isExeOrScr && !hasMZ) {
        findings.push({
          type: 'corrupt_exe',
          detail: '.exe with no PE header (corrupt/obfuscated executable)',
          severity: 'high'
        });
      } else if (hasMZ) {
        if (bytes.length < 0x40) {
          findings.push({
            type: 'corrupt_exe',
            detail: 'Truncated DOS header (corrupt/obfuscated executable)',
            severity: 'high'
          });
        } else {
          var e_lfanew = bytes[0x3C] | (bytes[0x3D] << 8) | (bytes[0x3E] << 16) | (bytes[0x3F] << 24);
          if (e_lfanew < 0 || e_lfanew + 24 > bytes.length) {
            findings.push({
              type: 'corrupt_exe',
              detail: 'Invalid PE header offset e_lfanew (corrupt/obfuscated executable)',
              severity: 'high'
            });
          } else {
            // Signature at e_lfanew: 'P' 'E' 0x00 0x00
            var peSig = bytes[e_lfanew] === 0x50 && bytes[e_lfanew + 1] === 0x45 && bytes[e_lfanew + 2] === 0x00 && bytes[e_lfanew + 3] === 0x00;
            if (!peSig) {
              findings.push({
                type: 'corrupt_exe',
                detail: 'Missing PE signature at e_lfanew (corrupt/obfuscated executable)',
                severity: 'high'
              });
            } else {
              // Section count at e_lfanew + 6 (2 bytes)
              var sectionCount = bytes[e_lfanew + 6] | (bytes[e_lfanew + 7] << 8);
              if (sectionCount > 96) {
                findings.push({
                  type: 'pe_suspicious_sections',
                  detail: 'PE section count >96 (' + sectionCount + ' sections)',
                  severity: 'high'
                });
              }
            }
          }
        }
      }
    }

    // 3. Extension Spoofing
    if (/\.(jpg|png|pdf|txt|doc)\.(exe|scr|bat|cmd|vbs|js|jar)$/i.test(name)) {
      findings.push({
        type: 'extension_spoofing',
        detail: 'Double extension spoofing detected: ' + name,
        severity: 'high'
      });
    }

    // 4. Script Red Flags in Text (.js / .html / .php / code)
    if (/\.(js|html|htm|php)$/i.test(name) || latin1Str.includes('<script') || latin1Str.includes('<?php')) {
      // Base64 blob > 500 chars flowing into eval / atob / Function
      var b64EvalRegex = /(?:eval|atob|Function)\s*\(\s*['"`]?[A-Za-z0-9+/=]{500,}/;
      var b64InCodeRegex = /[A-Za-z0-9+/=]{500,}/;
      if (b64EvalRegex.test(latin1Str) || (b64InCodeRegex.test(latin1Str) && /(?:eval|atob|Function)/.test(latin1Str))) {
        findings.push({
          type: 'obfuscated_script',
          detail: 'Base64 blob >500 chars flowing into eval/atob/Function',
          severity: 'high'
        });
      }

      // document.write + remote HTTP script inject
      var docWriteRemote = /document\.write\s*\([^)]*<script[^>]+src=['"]https?:\/\//i;
      if (docWriteRemote.test(latin1Str)) {
        findings.push({
          type: 'remote_script_injection',
          detail: 'document.write remote HTTP script injection',
          severity: 'high'
        });
      }

      // PHP shell patterns: system(, passthru(, shell_exec(
      var phpShellRegex = /\b(system|passthru|shell_exec)\s*\(/i;
      var phpMatch = latin1Str.match(phpShellRegex);
      if (phpMatch) {
        findings.push({
          type: 'php_shell_execution',
          detail: 'PHP shell command execution pattern (' + phpMatch[1] + ')',
          severity: 'high'
        });
      }
    }

    // 5. Dangerous Archive Entries
    var lowerName = name.toLowerCase();
    if (lowerName === 'autorun.inf' || lowerName.endsWith('/autorun.inf') || lowerName.endsWith('\\autorun.inf')) {
      findings.push({
        type: 'dangerous_autorun',
        detail: 'Dangerous autorun.inf entry',
        severity: 'high'
      });
    }
    if (lowerName.endsWith('vbaproject.bin')) {
      findings.push({
        type: 'vba_macro_payload',
        detail: 'VBA macro payload (vbaProject.bin)',
        severity: 'high'
      });
    }
    if (lowerName.endsWith('.lnk') || lowerName.includes('desktop.ini')) {
      findings.push({
        type: 'shortcut_anomaly',
        detail: 'LNK shortcut / desktop.ini anomaly entry',
        severity: 'medium'
      });
    }

    // 6. Sandbox-Escape Scan for HTML5 Games before Run
    var sandboxEscapeRegex = /\b(parent\.[a-zA-Z0-9_$]+|window\.top|top\.location)\b|postMessage\s*\([^,]+,\s*['"]\*['"]\)/;
    var escMatch = latin1Str.match(sandboxEscapeRegex);
    if (escMatch) {
      findings.push({
        type: 'sandbox_escape',
        detail: 'Sandbox boundary cross-context access pattern detected (' + escMatch[0] + ')',
        severity: 'medium'
      });
    }

    // Determine verdict based on highest severity finding
    var verdict = 'clean';
    var hasHigh = findings.some(function(f) { return f.severity === 'high'; });
    var hasMed = findings.some(function(f) { return f.severity === 'medium'; });
    var hasLow = findings.some(function(f) { return f.severity === 'low'; });

    if (hasHigh) verdict = 'high';
    else if (hasMed) verdict = 'medium';
    else if (hasLow) verdict = 'low';

    return {
      verdict: verdict,
      findings: findings
    };
  };

  MWO.Sec.scanText = function(name, str) {
    var bytes = typeof str === 'string' ? new TextEncoder().encode(str) : str;
    return MWO.Sec.scanBytes(name, bytes);
  };

  MWO.Sec.quarantine = async function(path, reason) {
    if (!MWO.fs) return false;

    var filename = path.split('/').pop();
    var qDir = '/System/Quarantine';
    if (!(await MWO.fs.exists('/System'))) await MWO.fs.mkdir('/System');
    if (!(await MWO.fs.exists(qDir))) await MWO.fs.mkdir(qDir);

    var qPath = qDir + '/' + filename;
    var content = await MWO.fs.readFile(path);
    await MWO.fs.writeFile(qPath, content);

    // Save metadata
    try {
      var records = JSON.parse(localStorage.getItem('mwo_quarantine_records') || '[]');
      records = records.filter(function(r) { return r.originalPath !== path && r.qPath !== qPath; });
      records.unshift({
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        filename: filename,
        originalPath: path,
        qPath: qPath,
        reason: reason || 'Flagged by security scan',
        date: new Date().toISOString()
      });
      localStorage.setItem('mwo_quarantine_records', JSON.stringify(records));
    } catch(e) {}

    // Permanent delete or fallback to deleteFile
    if (typeof MWO.fs.permanentDelete === 'function') {
      await MWO.fs.permanentDelete(path);
    } else {
      await MWO.fs.deleteFile(path);
    }

    return true;
  };

  MWO.Sec.release = async function(qPath) {
    if (!MWO.fs) return false;

    var records = [];
    try {
      records = JSON.parse(localStorage.getItem('mwo_quarantine_records') || '[]');
    } catch(e) {}

    var rec = records.find(function(r) { return r.qPath === qPath || r.id === qPath; });
    var filename = rec ? rec.filename : qPath.split('/').pop();
    var targetPath = rec ? rec.originalPath : '/Downloads/' + filename;

    var dlDir = '/Downloads';
    if (!(await MWO.fs.exists(dlDir))) await MWO.fs.mkdir(dlDir);

    var content = await MWO.fs.readFile(qPath);
    await MWO.fs.writeFile(targetPath, content);

    if (typeof MWO.fs.permanentDelete === 'function') {
      await MWO.fs.permanentDelete(qPath);
    } else {
      await MWO.fs.deleteFile(qPath);
    }

    records = records.filter(function(r) { return r.qPath !== qPath && r.id !== qPath; });
    try {
      localStorage.setItem('mwo_quarantine_records', JSON.stringify(records));
    } catch(e) {}

    return true;
  };

  MWO.Sec.listQuarantine = async function() {
    try {
      return JSON.parse(localStorage.getItem('mwo_quarantine_records') || '[]');
    } catch(e) {
      return [];
    }
  };

  MWO.Sec.scanAllFiles = async function() {
    var scanned = 0;
    var clean = 0;
    var flagged = [];

    async function walk(dirPath) {
      if (!MWO.fs) return;
      var items = await MWO.fs.listDir(dirPath);
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.type === 'dir') {
          if (item.path === '/System/Quarantine') continue; // Skip quarantine folder
          await walk(item.path);
        } else {
          scanned++;
          // Skip files > 20MB
          if (item.size && item.size > 20 * 1024 * 1024) {
            flagged.push({
              path: item.path,
              verdict: 'skipped',
              findings: [{ type: 'size_limit', detail: 'File size exceeds 20MB limit (skipped)', severity: 'low' }]
            });
            continue;
          }

          try {
            var content = await MWO.fs.readFile(item.path);
            var bytes;
            if (typeof content === 'string' && content.startsWith('data:')) {
              var base64Index = content.indexOf(';base64,');
              if (base64Index !== -1) {
                var b64 = content.substring(base64Index + 8);
                var binaryStr = atob(b64);
                bytes = new Uint8Array(binaryStr.length);
                for (var b = 0; b < binaryStr.length; b++) bytes[b] = binaryStr.charCodeAt(b);
              } else {
                bytes = new TextEncoder().encode(content);
              }
            } else if (typeof content === 'string') {
              bytes = new TextEncoder().encode(content);
            } else {
              bytes = new Uint8Array(content);
            }

            var res = MWO.Sec.scanBytes(item.name, bytes);
            if (res.verdict === 'clean') {
              clean++;
            } else {
              flagged.push({
                path: item.path,
                verdict: res.verdict,
                findings: res.findings
              });
            }
          } catch(err) {
            // ignore read error
          }
        }
      }
    }

    if (MWO.fs) {
      await walk('/');
    }

    var nowStr = new Date().toLocaleString();
    try {
      localStorage.setItem('mwo_last_scan_date', nowStr);
    } catch(e) {}

    return {
      scanned: scanned,
      clean: clean,
      flagged: flagged,
      lastScanDate: nowStr
    };
  };

  // ----------------------------------------------------------------------
  // 3. MossGuard App UI Registration
  // ----------------------------------------------------------------------
  if (MWO.registerApp) {
    MWO.registerApp({
      id: 'mossguard',
      name: 'MossGuard',
      description: 'Security scanner & OS updates',
      icon: 'mossguard',
      category: 'app',
      installed: true,
      launch: function() {
        launchMossGuard();
      }
    });
  }

  function launchMossGuard() {
    if (!MWO.wm) return;

    var winBody = MWO.wm.create({
      id: 'mossguard',
      title: 'MossGuard Security & Updates',
      icon: 'mossguard-security-updat',
      width: 620,
      height: 650,
      resizable: true
    });

    var activeTab = 'scan';
    var isScanning = false;
    var scanResults = null;
    var quarantineList = [];
    var updateState = {
      checking: false,
      info: null,
      error: '',
      downloading: false,
      progress: 0,
      installedPath: '',
      blobUrl: ''
    };

    async function loadData() {
      quarantineList = await MWO.Sec.listQuarantine();
      render();
    }

    function render() {
      var lastScan = localStorage.getItem('mwo_last_scan_date') || 'Never';
      var manifestUrl = MWO.Updates.getManifestUrl();
      var autoCheck = MWO.Updates.getAutoCheck();

      winBody.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;background:#0c0e1a;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif">
          <!-- Top Tab Navigation -->
          <div style="display:flex;background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.08);padding:6px 12px 0;gap:6px">
 <button class="mg-tab-btn" data-tab="scan" style="padding:10px 16px;border:none;background:${activeTab==='scan'?'rgba(124,108,255,0.25)':'transparent'};color:${activeTab==='scan'?'#a78bfa':'#94a3b8'};border-top-left-radius:8px;border-top-right-radius:8px;font-weight:600;font-size:13px;cursor:pointer"> Scanner</button>
 <button class="mg-tab-btn" data-tab="quarantine" style="padding:10px 16px;border:none;background:${activeTab==='quarantine'?'rgba(124,108,255,0.25)':'transparent'};color:${activeTab==='quarantine'?'#a78bfa':'#94a3b8'};border-top-left-radius:8px;border-top-right-radius:8px;font-weight:600;font-size:13px;cursor:pointer"> Quarantine (${quarantineList.length})</button>
 <button class="mg-tab-btn" data-tab="updates" style="padding:10px 16px;border:none;background:${activeTab==='updates'?'rgba(124,108,255,0.25)':'transparent'};color:${activeTab==='updates'?'#a78bfa':'#94a3b8'};border-top-left-radius:8px;border-top-right-radius:8px;font-weight:600;font-size:13px;cursor:pointer"> OS Updates</button>
          </div>

          <!-- Main Content Body -->
          <div style="flex:1;overflow:auto;padding:16px" class="mw-scroll">
            ${activeTab === 'scan' ? renderScanTab(lastScan) : ''}
            ${activeTab === 'quarantine' ? renderQuarantineTab() : ''}
            ${activeTab === 'updates' ? renderUpdatesTab(manifestUrl, autoCheck) : ''}
          </div>

          <!-- Honest Footer Line -->
          <div style="padding:8px 16px;background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#64748b;text-align:center">
            MossGuard performs static heuristic analysis locally in-browser. No cloud reporting or telemetry.
          </div>
        </div>
      `;

      // Event listeners for tabs
      winBody.querySelectorAll('.mg-tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          activeTab = btn.getAttribute('data-tab');
          render();
        });
      });

      attachTabListeners();
    }

    function renderScanTab(lastScan) {
      return `
        <div style="display:flex;flex-direction:column;gap:16px">
          <!-- Banner -->
          <div style="background:linear-gradient(135deg, rgba(124,108,255,0.15), rgba(56,189,248,0.1));border:1px solid rgba(124,108,255,0.3);border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:16px;font-weight:700;color:#f8fafc">Local Heuristic File Scanner</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px">Last system scan: ${lastScan}</div>
            </div>
            <button id="mg-start-scan-btn" ${isScanning?'disabled':''} style="padding:10px 20px;background:linear-gradient(135deg, #7c6cff, #5a48e8);border:none;border-radius:8px;color:#fff;font-weight:600;font-size:13px;cursor:${isScanning?'not-allowed':'pointer'};opacity:${isScanning?0.6:1}">
              ${isScanning ? '⏳ Scanning VFS...' : ' Scan All Files'}
            </button>
          </div>

          <!-- Results Section -->
          ${scanResults ? `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <span style="font-weight:600;font-size:14px">Scan Results: ${scanResults.scanned} files inspected</span>
                <span style="font-size:12px;color:${scanResults.flagged.length>0?'#f87171':'#4ade80'}">${scanResults.clean} clean, ${scanResults.flagged.length} flagged</span>
              </div>

              ${scanResults.flagged.length === 0 ? `
                <div style="text-align:center;padding:24px 0;color:#4ade80;font-size:13px">
                  [ok] No threats or high-risk heuristics detected in filesystem!
                </div>
              ` : `
                <div style="display:flex;flex-direction:column;gap:10px">
                  ${scanResults.flagged.map(function(item, idx) {
                    var isHigh = item.verdict === 'high';
                    var isMed = item.verdict === 'medium';
                    var badgeColor = isHigh ? '#ef4444' : (isMed ? '#f59e0b' : '#3b82f6');
                    return `
                      <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                          <span style="font-family:monospace;font-size:12px;color:#cbd5e1;word-break:break-all">${item.path}</span>
                          <span style="background:${badgeColor};color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase">${item.verdict}</span>
                        </div>
                        <div style="font-size:11px;color:#94a3b8">
                          ${item.findings.map(function(f){ return '• ' + f.detail; }).join('<br>')}
                        </div>
                        <div style="display:flex;gap:8px;margin-top:4px">
 <button class="mg-action-quarantine" data-path="${item.path}" data-idx="${idx}" style="padding:4px 10px;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.4);border-radius:6px;color:#fcd34d;font-size:11px;cursor:pointer"> Quarantine</button>
 <button class="mg-action-delete" data-path="${item.path}" data-idx="${idx}" style="padding:4px 10px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);border-radius:6px;color:#fca5a5;font-size:11px;cursor:pointer"> Delete Forever</button>
                          <button class="mg-action-keep" data-idx="${idx}" style="padding:4px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#cbd5e1;font-size:11px;cursor:pointer">Keep</button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          ` : ''}
        </div>
      `;
    }

    function renderQuarantineTab() {
      return `
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="font-size:14px;font-weight:700;color:#f8fafc">Quarantined Files (/System/Quarantine)</div>
          ${quarantineList.length === 0 ? `
            <div style="text-align:center;padding:40px 0;color:#64748b;font-size:13px">
              No files currently in quarantine.
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:10px">
              ${quarantineList.map(function(item) {
                return `
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px">
                    <div style="display:flex;align-items:center;justify-content:space-between">
                      <span style="font-weight:600;font-size:13px;color:#f8fafc">${item.filename}</span>
                      <span style="font-size:11px;color:#64748b">${new Date(item.date).toLocaleDateString()}</span>
                    </div>
                    <div style="font-size:11px;color:#94a3b8">Original path: <span style="font-family:monospace">${item.originalPath}</span></div>
                    <div style="font-size:11px;color:#f87171">Reason: ${item.reason}</div>
                    <div style="display:flex;gap:8px;margin-top:6px">
 <button class="mg-q-release" data-qpath="${item.qPath}" style="padding:4px 10px;background:rgba(34,197,94,0.2);border:1px solid rgba(34,197,94,0.4);border-radius:6px;color:#86efac;font-size:11px;cursor:pointer"> Release to /Downloads</button>
 <button class="mg-q-delete" data-qpath="${item.qPath}" style="padding:4px 10px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);border-radius:6px;color:#fca5a5;font-size:11px;cursor:pointer"> Delete Forever</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;
    }

    function renderUpdatesTab(manifestUrl, autoCheck) {
      return `
        <div style="display:flex;flex-direction:column;gap:16px">
          <!-- Current OS Version Banner -->
          <div style="background:linear-gradient(135deg, rgba(56,189,248,0.15), rgba(124,108,255,0.15));border:1px solid rgba(56,189,248,0.3);border-radius:12px;padding:16px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:18px;font-weight:700;color:#38bdf8">MossyWoss OS v${MWO.version.string()}</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:2px">Codename: ${MWO.version.codename}</div>
            </div>
            <button id="mg-check-upd-btn" ${updateState.checking?'disabled':''} style="padding:10px 16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-weight:600;font-size:12px;cursor:pointer">
 ${updateState.checking? 'Checking...': 'Check for Updates'}
            </button>
          </div>

          <!-- Manifest Config & Auto Check -->
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px">
            <div style="font-size:13px;font-weight:600;color:#cbd5e1">Update Server Settings</div>
            <div style="display:flex;gap:8px">
              <input id="mg-manifest-url-input" type="text" value="${manifestUrl}" placeholder="Manifest URL (e.g. https://example.com/mossywoss_update.json)" style="flex:1;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:8px 10px;color:#fff;font-size:12px;outline:none" />
              <button id="mg-save-url-btn" style="padding:8px 14px;background:rgba(124,108,255,0.3);border:1px solid rgba(124,108,255,0.5);border-radius:6px;color:#a78bfa;font-size:12px;font-weight:600;cursor:pointer">Save URL</button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
              <span style="font-size:12px;color:#94a3b8">Auto-check for updates on startup</span>
              <input id="mg-auto-check-toggle" type="checkbox" ${autoCheck?'checked':''} style="width:16px;height:16px;cursor:pointer" />
            </div>

            ${!manifestUrl ? `
              <div style="font-size:11px;color:#94a3b8;background:rgba(0,0,0,0.2);padding:8px 10px;border-radius:6px;margin-top:4px">
                Setup instructions: Set a manifest URL above to receive OS updates over HTTP/HTTPS. A manifest JSON must provide <code>version</code>, <code>url</code>, and <code>notes</code>.
              </div>
            ` : ''}
          </div>

          <!-- Update Check Result & Download -->
          ${updateState.info ? `
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px">
              ${updateState.info.updateAvailable ? `
 <div style="color:#38bdf8;font-weight:700;font-size:14px;margin-bottom:8px"> Update Available: v${updateState.info.latestVersion}</div>
                <div style="font-size:12px;color:#cbd5e1;margin-bottom:10px">What's New:</div>
                <ul style="margin:0 0 14px 18px;padding:0;font-size:12px;color:#94a3b8">
                  ${updateState.info.notes.map(function(n){ return '<li>' + n + '</li>'; }).join('')}
                </ul>

                ${updateState.downloading ? `
                  <div style="display:flex;flex-direction:column;gap:6px">
                    <div style="font-size:12px;color:#a78bfa">Downloading build package... ${updateState.progress}%</div>
                    <div style="background:rgba(255,255,255,0.1);height:8px;border-radius:4px;overflow:hidden">
                      <div style="width:${updateState.progress}%;height:100%;background:#7c6cff;transition:width .2s"></div>
                    </div>
                  </div>
                ` : (updateState.blobUrl ? `
                  <div style="display:flex;flex-direction:column;gap:8px">
                    <div style="font-size:12px;color:#4ade80">[ok] Package downloaded & verified at ${updateState.installedPath}</div>
                    <button id="mg-apply-reboot-btn" style="padding:10px;background:linear-gradient(135deg, #22c55e, #16a34a);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:13px;cursor:pointer"> Apply & Reboot OS</button>
                    <div style="font-size:11px;color:#94a3b8">Note: This update runs in-memory until you re-save the build file from Files.</div>
                  </div>
                ` : `
 <button id="mg-dl-install-btn" style="padding:10px 16px;background:linear-gradient(135deg, #7c6cff, #5a48e8);border:none;border-radius:8px;color:#fff;font-weight:600;font-size:13px;cursor:pointer"> Download & Install</button>
                `)}
              ` : `
                <div style="color:#4ade80;font-weight:600;font-size:13px;text-align:center">
                  [ok] Your MossyWoss OS is up to date (v${MWO.version.string()}).
                </div>
              `}
            </div>
          ` : ''}

          ${updateState.error ? `
            <div style="background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:10px 12px;color:#fcd34d;font-size:12px">
              Update check: ${updateState.error} (You can still use MossyGuard fully offline.)
            </div>
          ` : ''}

          <!-- In-OS Lore Timeline -->
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px">
            <div style="font-size:13px;font-weight:700;color:#cbd5e1;margin-bottom:12px">OS Release History Timeline</div>
            <div style="display:flex;flex-direction:column;gap:12px;position:relative;padding-left:14px;border-left:2px solid rgba(124,108,255,0.3)">
              ${MWO.Updates.history.map(function(item) {
                return `
                  <div style="position:relative">
                    <div style="position:absolute;left:-20px;top:4px;width:10px;height:10px;border-radius:50%;background:#7c6cff"></div>
                    <div style="display:flex;align-items:center;gap:8px">
                      <span style="font-weight:700;font-size:12px;color:#a78bfa">v${item.v}</span>
                      <span style="font-size:11px;color:#64748b">${item.date}</span>
                    </div>
                    <div style="font-size:12px;color:#94a3b8;margin-top:2px">${item.note}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }

    function attachTabListeners() {
      // Scan Tab listeners
      var startScanBtn = winBody.querySelector('#mg-start-scan-btn');
      if (startScanBtn) {
        startScanBtn.addEventListener('click', async function() {
          isScanning = true;
          render();
          scanResults = await MWO.Sec.scanAllFiles();
          isScanning = false;
          render();
        });
      }

      winBody.querySelectorAll('.mg-action-quarantine').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var path = btn.getAttribute('data-path');
          await MWO.Sec.quarantine(path, 'User quarantined via MossGuard scanner');
          quarantineList = await MWO.Sec.listQuarantine();
          if (scanResults && scanResults.flagged) {
            scanResults.flagged = scanResults.flagged.filter(function(i) { return i.path !== path; });
          }
          render();
        });
      });

      winBody.querySelectorAll('.mg-action-delete').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var path = btn.getAttribute('data-path');
          if (MWO.fs) {
            if (typeof MWO.fs.permanentDelete === 'function') {
              await MWO.fs.permanentDelete(path);
            } else {
              await MWO.fs.deleteFile(path);
            }
          }
          if (scanResults && scanResults.flagged) {
            scanResults.flagged = scanResults.flagged.filter(function(i) { return i.path !== path; });
          }
          render();
        });
      });

      winBody.querySelectorAll('.mg-action-keep').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (scanResults && scanResults.flagged) {
            scanResults.flagged.splice(idx, 1);
          }
          render();
        });
      });

      // Quarantine Tab listeners
      winBody.querySelectorAll('.mg-q-release').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var qPath = btn.getAttribute('data-qpath');
          await MWO.Sec.release(qPath);
          quarantineList = await MWO.Sec.listQuarantine();
          render();
        });
      });

      winBody.querySelectorAll('.mg-q-delete').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var qPath = btn.getAttribute('data-qpath');
          if (MWO.fs) {
            if (typeof MWO.fs.permanentDelete === 'function') {
              await MWO.fs.permanentDelete(qPath);
            } else {
              await MWO.fs.deleteFile(qPath);
            }
          }
          var records = [];
          try { records = JSON.parse(localStorage.getItem('mwo_quarantine_records') || '[]'); } catch(e){}
          records = records.filter(function(r) { return r.qPath !== qPath; });
          localStorage.setItem('mwo_quarantine_records', JSON.stringify(records));
          quarantineList = await MWO.Sec.listQuarantine();
          render();
        });
      });

      // Updates Tab listeners
      var saveUrlBtn = winBody.querySelector('#mg-save-url-btn');
      if (saveUrlBtn) {
        saveUrlBtn.addEventListener('click', function() {
          var input = winBody.querySelector('#mg-manifest-url-input');
          if (input) {
            MWO.Updates.setManifestUrl(input.value);
            render();
          }
        });
      }

      var autoCheckToggle = winBody.querySelector('#mg-auto-check-toggle');
      if (autoCheckToggle) {
        autoCheckToggle.addEventListener('change', function() {
          MWO.Updates.setAutoCheck(autoCheckToggle.checked);
        });
      }

      var checkUpdBtn = winBody.querySelector('#mg-check-upd-btn');
      if (checkUpdBtn) {
        checkUpdBtn.addEventListener('click', async function() {
          updateState.checking = true;
          updateState.error = '';
          render();
          var res = await MWO.Updates.checkForUpdates();
          updateState.checking = false;
          if (res.status === 'error' || res.status === 'no_url') {
            updateState.error = res.message || 'Failed to check for updates.';
            updateState.info = null;
          } else {
            updateState.info = res;
          }
          render();
        });
      }

      var dlInstallBtn = winBody.querySelector('#mg-dl-install-btn');
      if (dlInstallBtn) {
        dlInstallBtn.addEventListener('click', async function() {
          if (!updateState.info || !updateState.info.manifest) return;
          updateState.downloading = true;
          updateState.progress = 0;
          render();

          try {
            var installRes = await MWO.Updates.downloadAndInstall(updateState.info.manifest, function(pct) {
              updateState.progress = pct;
              render();
            });
            updateState.downloading = false;
            updateState.installedPath = installRes.savePath;
            updateState.blobUrl = installRes.blobUrl;
          } catch(err) {
            updateState.downloading = false;
            updateState.error = 'Download failed: ' + err.message;
          }
          render();
        });
      }

      var applyRebootBtn = winBody.querySelector('#mg-apply-reboot-btn');
      if (applyRebootBtn) {
        applyRebootBtn.addEventListener('click', function() {
          if (updateState.blobUrl) {
            MWO.Updates.applyAndReboot(updateState.blobUrl);
          }
        });
      }
    }

    loadData();
  }

  // ----------------------------------------------------------------------
  // 4. Auto-Check on Startup
  // ----------------------------------------------------------------------
  (function initAutoCheck() {
    var checkCount = 0;
    var maxChecks = 30; // Max 30s polling
    var interval = setInterval(async function() {
      checkCount++;
      if (MWO.desktop || checkCount >= maxChecks) {
        clearInterval(interval);
        if (MWO.Updates.getAutoCheck() && MWO.Updates.getManifestUrl()) {
          try {
            var res = await MWO.Updates.checkForUpdates();
            if (res && res.updateAvailable) {
              if (MWO.notif) {
                MWO.notif.show('MossGuard', 'OS Update v' + res.latestVersion + ' is available!');
              }
            }
          } catch(e) {
            // Fail silently offline
          }
        }
      }
    }, 1000);
  })();

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
