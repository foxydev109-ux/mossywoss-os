/* ========================================================================
 * MossyWoss OS Web Browser App
 * Features: Multi-tab browsing, live web search, real file downloader,
 * in-browser ZIP extraction, HTML5 game OS runner, PE inspector, media preview.
 * ======================================================================== */

MWO.Browser = (function() {
  'use strict';

  /* ----------------------------------------------------------------------
   * Helper Functions
   * ---------------------------------------------------------------------- */

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function stripHTML(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '');
  }

  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function sanitizeFilename(filename) {
    if (!filename) return 'download.bin';
    let name = String(filename).trim();
    name = name.replace(/\\/g, '/');
    name = name.split('/').pop();
    name = name.replace(/^\.+/, '');
    name = name.replace(/[^\w\.\-\s]/g, '_');
    return name || 'download.bin';
  }

  function getMimeType(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const map = {
      'html': 'text/html', 'htm': 'text/html',
      'js': 'text/javascript', 'mjs': 'text/javascript',
      'css': 'text/css',
      'json': 'application/json',
      'xml': 'application/xml',
      'svg': 'image/svg+xml',
      'png': 'image/png',
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'ico': 'image/x-icon',
      'mp3': 'audio/mpeg',
      'ogg': 'audio/ogg',
      'wav': 'audio/wav',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'zip': 'application/zip',
      'exe': 'application/x-msdownload'
    };
    return map[ext] || 'application/octet-stream';
  }

  function isTextLike(mime, filename) {
    if (mime) {
      const m = mime.toLowerCase();
      if (m.startsWith('text/') || m.includes('json') || m.includes('xml') || m.includes('javascript') || m.includes('svg')) {
        return true;
      }
    }
    if (filename) {
      const ext = (filename.split('.').pop() || '').toLowerCase();
      if (['txt', 'html', 'htm', 'js', 'css', 'json', 'xml', 'svg', 'md'].includes(ext)) {
        return true;
      }
    }
    return false;
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function uint8ArrayToDataURL(uint8Array, mimeType = 'application/octet-stream') {
    let binary = '';
    const len = uint8Array.byteLength;
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(null, uint8Array.subarray(i, i + chunkSize));
    }
    return 'data:' + mimeType + ';base64,' + btoa(binary);
  }

  function dataURLToUint8Array(dataUrl) {
    if (typeof dataUrl !== 'string') return new Uint8Array(0);
    const base64Index = dataUrl.indexOf(';base64,');
    if (base64Index !== -1) {
      const b64 = dataUrl.substring(base64Index + 8);
      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes;
    }
    return new TextEncoder().encode(dataUrl);
  }

  async function ensureDir(dirPath) {
    const parts = dirPath.split('/').filter(Boolean);
    let current = '';
    for (const p of parts) {
      current += '/' + p;
      if (!(await MWO.fs.exists(current))) {
        await MWO.fs.mkdir(current);
      }
    }
  }

  async function fsDelete(path) {
    if (MWO.fs && typeof MWO.fs.permanentDelete === 'function') {
      return await MWO.fs.permanentDelete(path);
    }
    if (MWO.fs && typeof MWO.fs.deleteFile === 'function') {
      return await MWO.fs.deleteFile(path);
    }
    return false;
  }

  /* ----------------------------------------------------------------------
   * Bookmarks Storage
   * ---------------------------------------------------------------------- */

  function getBookmarks() {
    try {
      const data = localStorage.getItem('mwo_browser_bookmarks');
      return data ? JSON.parse(data) : [];
    } catch(e) {
      return [];
    }
  }

  function saveBookmarks(list) {
    try {
      localStorage.setItem('mwo_browser_bookmarks', JSON.stringify(list));
    } catch(e) {}
  }

  function addBookmark(title, url) {
    if (!url) return;
    const list = getBookmarks();
    if (!list.some(b => b.url === url)) {
      list.push({ id: 'bm_' + Date.now(), title: title || url, url: url });
      saveBookmarks(list);
    }
  }

  function removeBookmark(id) {
    const list = getBookmarks().filter(b => b.id !== id && b.url !== id);
    saveBookmarks(list);
  }

  function isBookmarked(url) {
    return getBookmarks().some(b => b.url === url);
  }


  /* ----------------------------------------------------------------------
   * Downloads Manager Engine
   * ---------------------------------------------------------------------- */

  const downloadsList = [];
  let downloadsUIUpdateFn = null;

  async function initDownloadsFromFS() {
    try {
      await MWO.fs.mkdir('/Downloads');
      const items = await MWO.fs.listDir('/Downloads');
      for (const item of items) {
        if (item.type === 'file' && !downloadsList.some(d => d.name === item.name)) {
          downloadsList.push({
            id: 'fs_' + item.name,
            url: '/Downloads/' + item.name,
            name: item.name,
            size: item.size || 0,
            loaded: item.size || 0,
            total: item.size || 0,
            status: 'completed',
            errorMsg: ''
          });
        }
      }
      if (downloadsUIUpdateFn) downloadsUIUpdateFn();
    } catch(e) {}
  }

  async function startDownload(url, customFilename) {
    if (!url) return;
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const controller = new AbortController();
    let filename = sanitizeFilename(customFilename || targetUrl.split('/').pop().split('?')[0]);
    if (!filename || filename === 'download.bin') {
      try {
        const u = new URL(targetUrl);
        const p = u.pathname.split('/').pop();
        if (p) filename = sanitizeFilename(decodeURIComponent(p));
      } catch(e) {}
    }

    const dl = {
      id: 'dl_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      url: targetUrl,
      name: filename,
      size: 0,
      loaded: 0,
      total: 0,
      status: 'downloading',
      errorMsg: '',
      abortController: controller
    };

    downloadsList.unshift(dl);
    if (downloadsUIUpdateFn) downloadsUIUpdateFn();

    try {
      const res = await fetch(targetUrl, { signal: controller.signal });
      if (!res.ok) {
        throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      }

      const contentLength = res.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      const contentType = res.headers.get('content-type') || getMimeType(filename);
      dl.total = totalBytes;

      if (!customFilename) {
        const cdHeader = res.headers.get('content-disposition');
        if (cdHeader && cdHeader.includes('filename=')) {
          const match = cdHeader.match(/filename=["']?([^"';]+)["']?/i);
          if (match && match[1]) filename = sanitizeFilename(match[1]);
        }
      }
      dl.name = filename;

      const reader = res.body.getReader();
      const chunks = [];
      let loadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loadedBytes += value.length;
        dl.loaded = loadedBytes;
        dl.size = loadedBytes;
        if (downloadsUIUpdateFn) downloadsUIUpdateFn();
      }

      const blob = new Blob(chunks, { type: contentType });
      const arrayBuf = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let textStr = null;
      if (isTextLike(contentType, filename)) {
        textStr = new TextDecoder('utf-8').decode(bytes);
      }

      let scanResult = { verdict: 'clean', findings: [] };
      if (window.MWO && MWO.Sec && typeof MWO.Sec.scanBytes === 'function') {
        scanResult = MWO.Sec.scanBytes(filename, bytes);
      }

      if (scanResult.verdict === 'high') {
        const qDir = '/System/Quarantine';
        await ensureDir(qDir);
        const qPath = qDir + '/' + filename;
        if (textStr !== null) {
          await MWO.fs.writeFile(qPath, textStr);
        } else {
          const dataUrl = uint8ArrayToDataURL(bytes, contentType);
          await MWO.fs.writeFile(qPath, dataUrl);
        }

        const firstFinding = scanResult.findings[0] ? scanResult.findings[0].detail : 'High risk file detected';
        try {
          const records = JSON.parse(localStorage.getItem('mwo_quarantine_records') || '[]');
          records.unshift({
            id: 'q_' + Date.now(),
            filename: filename,
            originalPath: '/Downloads/' + filename,
            qPath: qPath,
            reason: firstFinding,
            date: new Date().toISOString()
          });
          localStorage.setItem('mwo_quarantine_records', JSON.stringify(records));
        } catch(e) {}

        dl.status = 'blocked';
        dl.errorMsg = 'Blocked: ' + firstFinding;
        dl.scanFindings = scanResult.findings;
        if (MWO.notif) MWO.notif.show('Security Warning', 'Blocked high risk download: ' + filename);
      } else if (scanResult.verdict === 'medium') {
        await MWO.fs.mkdir('/Downloads');
        if (textStr !== null) {
          await MWO.fs.writeFile('/Downloads/' + filename, textStr);
        } else {
          const dataUrl = uint8ArrayToDataURL(bytes, contentType);
          await MWO.fs.writeFile('/Downloads/' + filename, dataUrl);
        }

        dl.status = 'warning';
        dl.warningMsg = scanResult.findings.map(f => f.detail).join('; ');
        dl.scanFindings = scanResult.findings;
        if (MWO.notif) MWO.notif.show('Security Warning', 'Medium risk file downloaded: ' + filename);
      } else {
        await MWO.fs.mkdir('/Downloads');
        if (textStr !== null) {
          await MWO.fs.writeFile('/Downloads/' + filename, textStr);
        } else {
          const dataUrl = uint8ArrayToDataURL(bytes, contentType);
          await MWO.fs.writeFile('/Downloads/' + filename, dataUrl);
        }

        dl.status = 'completed';
        if (MWO.notif) MWO.notif.show('Download Complete', filename + ' saved to /Downloads');
      }
    } catch(err) {
      if (err.name === 'AbortError') {
        dl.status = 'cancelled';
        dl.errorMsg = 'Download cancelled by user.';
      } else {
        dl.status = 'error';
        dl.errorMsg = 'This server blocks cross-site downloads (CORS error or network failure).';
      }
    }

    if (downloadsUIUpdateFn) downloadsUIUpdateFn();
  }


  /* ----------------------------------------------------------------------
   * In-Browser ZIP Extraction Engine
   * ---------------------------------------------------------------------- */

  async function extractZip(filename, onProgress, targetDirOverride) {
    const filePath = (typeof filename === 'string' && filename.startsWith('/')) ? filename : ('/Downloads/' + filename);
    if (!(await MWO.fs.exists(filePath))) {
      throw new Error('File not found: ' + filePath);
    }

    const content = await MWO.fs.readFile(filePath);
    const fileBytes = dataURLToUint8Array(content);
    const len = fileBytes.length;

    if (len < 22) throw new Error('Invalid ZIP archive (file too short)');

    // 1. Find End of Central Directory Record (EOCD)
    let eocdOffset = -1;
    const searchLimit = Math.max(0, len - 65557);
    for (let i = len - 22; i >= searchLimit; i--) {
      if (fileBytes[i] === 0x50 && fileBytes[i+1] === 0x4b && fileBytes[i+2] === 0x05 && fileBytes[i+3] === 0x06) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error('Invalid ZIP archive (End of Central Directory signature not found)');
    }

    const eocdView = new DataView(fileBytes.buffer, fileBytes.byteOffset + eocdOffset, 22);
    const totalEntries = eocdView.getUint16(10, true);
    const cdOffset = eocdView.getUint32(16, true);

    if (cdOffset === 0xFFFFFFFF || totalEntries === 0xFFFF) {
      throw new Error('Zip64 archives (>4GB) are not supported.');
    }

    // 2. Parse Central Directory entries
    const entries = [];
    let cdPtr = cdOffset;
    let totalUncompSize = 0;

    for (let i = 0; i < totalEntries; i++) {
      if (cdPtr + 46 > len) break;
      if (fileBytes[cdPtr] !== 0x50 || fileBytes[cdPtr+1] !== 0x4b || fileBytes[cdPtr+2] !== 0x01 || fileBytes[cdPtr+3] !== 0x02) {
        break;
      }

      const cdView = new DataView(fileBytes.buffer, fileBytes.byteOffset + cdPtr, 46);
      const flags = cdView.getUint16(6, true);
      const method = cdView.getUint16(10, true);
      const compSize = cdView.getUint32(20, true);
      const uncompSize = cdView.getUint32(24, true);
      const filenameLen = cdView.getUint16(28, true);
      const extraLen = cdView.getUint16(30, true);
      const commentLen = cdView.getUint16(32, true);
      const localOffset = cdView.getUint32(42, true);

      const nameBytes = fileBytes.subarray(cdPtr + 46, cdPtr + 46 + filenameLen);
      const isUtf8 = (flags & 0x0800) !== 0;
      let rawName = isUtf8 ? new TextDecoder('utf-8').decode(nameBytes) : String.fromCharCode.apply(null, nameBytes);
      rawName = rawName.replace(/\\/g, '/');

      entries.push({
        name: rawName,
        method: method,
        compSize: compSize,
        uncompSize: uncompSize,
        localOffset: localOffset
      });

      totalUncompSize += uncompSize;
      cdPtr += 46 + filenameLen + extraLen + commentLen;
    }

    if (totalUncompSize > 200 * 1024 * 1024) {
      throw new Error('Extraction aborted: total decompressed size exceeds 200MB safety limit.');
    }

    // Target folder name
    const rawName = typeof filename === 'string' ? filename.split('/').pop() : filename;
    const zipBaseName = rawName.replace(/\.zip$/i, '');
    const targetDir = targetDirOverride || ((filePath.startsWith('/System/store/uploads') || filePath.startsWith('/WebApps'))
      ? '/WebApps/' + sanitizeFilename(zipBaseName) + '_extracted'
      : '/Downloads/' + sanitizeFilename(zipBaseName) + '_extracted');
    await ensureDir(targetDir);

    let extractedCount = 0;
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (onProgress) onProgress(i + 1, entries.length, entry.name);

      // Path safety checks
      if (entry.name.includes('..') || entry.name.startsWith('/') || /^[a-zA-Z]:/.test(entry.name)) {
        errors.push('Skipped unsafe path: ' + entry.name);
        continue;
      }

      // Skip directory entries
      if (entry.name.endsWith('/')) {
        await ensureDir(targetDir + '/' + entry.name);
        continue;
      }

      // Read local header
      const lhOff = entry.localOffset;
      if (lhOff + 30 > len) {
        errors.push('Invalid local header offset for ' + entry.name);
        continue;
      }

      if (fileBytes[lhOff] !== 0x50 || fileBytes[lhOff+1] !== 0x4b || fileBytes[lhOff+2] !== 0x03 || fileBytes[lhOff+3] !== 0x04) {
        errors.push('Local header signature mismatch for ' + entry.name);
        continue;
      }

      const lhView = new DataView(fileBytes.buffer, fileBytes.byteOffset + lhOff, 30);
      const lhNameLen = lhView.getUint16(26, true);
      const lhExtraLen = lhView.getUint16(28, true);
      const dataStart = lhOff + 30 + lhNameLen + lhExtraLen;

      if (dataStart + entry.compSize > len) {
        errors.push('Compressed data out of bounds for ' + entry.name);
        continue;
      }

      let decompressedBytes = null;

      if (entry.method === 0) { // Store
        decompressedBytes = fileBytes.subarray(dataStart, dataStart + entry.compSize);
      } else if (entry.method === 8) { // Deflate
        if (typeof DecompressionStream === 'undefined') {
          throw new Error('This browser lacks native zip decompression (DecompressionStream unavailable).');
        }
        try {
          const compSlice = fileBytes.subarray(dataStart, dataStart + entry.compSize);
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(compSlice);
          writer.close();
          const buffer = await new Response(ds.readable).arrayBuffer();
          decompressedBytes = new Uint8Array(buffer);
        } catch(defErr) {
          errors.push('Failed to decompress ' + entry.name + ': ' + defErr.message);
          continue;
        }
      } else {
        errors.push('Unsupported compression method (' + entry.method + ') for ' + entry.name);
        continue;
      }

      // Scan decompressed entry
      if (window.MWO && MWO.Sec && typeof MWO.Sec.scanBytes === 'function') {
        const secRes = MWO.Sec.scanBytes(entry.name, decompressedBytes);
        if (secRes && secRes.verdict === 'high') {
          const detail = secRes.findings[0] ? secRes.findings[0].detail : 'High severity threat detected';
          errors.push('Skipped high-risk zip entry: ' + entry.name + ' (' + detail + ')');
          continue;
        }
      }

      // Write decompressed file
      const outPath = targetDir + '/' + entry.name;
      const parentDir = outPath.substring(0, outPath.lastIndexOf('/'));
      if (parentDir) await ensureDir(parentDir);

      const mime = getMimeType(entry.name);
      if (isTextLike(mime, entry.name)) {
        const textContent = new TextDecoder('utf-8').decode(decompressedBytes);
        await MWO.fs.writeFile(outPath, textContent);
      } else {
        const dataUrl = uint8ArrayToDataURL(decompressedBytes, mime);
        await MWO.fs.writeFile(outPath, dataUrl);
      }

      extractedCount++;
    }

    return {
      targetDir: targetDir,
      extractedCount: extractedCount,
      totalEntries: entries.length,
      errors: errors
    };
  }

  async function checkForIndexHtml(extractedDir) {
    try {
      const items = await MWO.fs.listDir(extractedDir);
      const rootIndex = items.find(i => i.name.toLowerCase() === 'index.html' || i.name.toLowerCase() === 'index.htm');
      if (rootIndex) return rootIndex.path;

      const subdirs = items.filter(i => i.type === 'dir');
      if (subdirs.length === 1) {
        const subItems = await MWO.fs.listDir(subdirs[0].path);
        const subIndex = subItems.find(i => i.name.toLowerCase() === 'index.html' || i.name.toLowerCase() === 'index.htm');
        if (subIndex) return subIndex.path;
      }
    } catch(e) {}
    return null;
  }


  /* ----------------------------------------------------------------------
   * Run HTML5 Games in OS
   * ---------------------------------------------------------------------- */

  async function getFolderFilesRecursive(dirPath) {
    const results = [];
    const items = await MWO.fs.listDir(dirPath);
    for (const item of items) {
      if (item.type === 'dir') {
        const sub = await getFolderFilesRecursive(item.path);
        results.push(...sub);
      } else {
        results.push(item);
      }
    }
    return results;
  }

  async function runHTML5Game(indexPath) {
    const gameRootDir = indexPath.substring(0, indexPath.lastIndexOf('/'));
    const allFiles = await getFolderFilesRecursive(gameRootDir);

    const mappings = [];
    const createdObjectUrls = [];

    for (const fileItem of allFiles) {
      const content = await MWO.fs.readFile(fileItem.path);
      const mime = getMimeType(fileItem.name);
      let blob;

      if (typeof content === 'string' && content.startsWith('data:')) {
        const uint8 = dataURLToUint8Array(content);
        blob = new Blob([uint8], { type: mime });
      } else {
        blob = new Blob([content], { type: mime });
      }

      const objUrl = URL.createObjectURL(blob);
      createdObjectUrls.push(objUrl);

      let relPath = fileItem.path;
      if (relPath.startsWith(gameRootDir + '/')) {
        relPath = relPath.substring(gameRootDir.length + 1);
      } else if (relPath.startsWith(gameRootDir)) {
        relPath = relPath.substring(gameRootDir.length);
      }

      mappings.push({
        relPath: relPath,
        objUrl: objUrl,
        fileItem: fileItem
      });
    }

    // Read index.html content
    const indexContent = await MWO.fs.readFile(indexPath);
    let indexText = typeof indexContent === 'string' && indexContent.startsWith('data:')
      ? new TextDecoder('utf-8').decode(dataURLToUint8Array(indexContent))
      : String(indexContent);

    // Sort mappings longest path first
    mappings.sort((a, b) => b.relPath.length - a.relPath.length);

    // Replace relative paths in indexText
    for (const m of mappings) {
      const p = m.relPath;
      const url = m.objUrl;
      indexText = indexText.split('./' + p).join(url);
      indexText = indexText.split('/' + p).join(url);
      indexText = indexText.split(p).join(url);
    }

    // Security scan on index.html before launch
    let secFindings = [];
    if (window.MWO && MWO.Sec && typeof MWO.Sec.scanText === 'function') {
      const secRes = MWO.Sec.scanText(indexPath, indexText);
      if (secRes && secRes.findings) {
        secFindings = secRes.findings;
      }
    }

    // Extract title
    let gameTitle = 'HTML5 Game';
    const titleMatch = indexText.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      gameTitle = stripHTML(titleMatch[1]).trim() || gameTitle;
    } else {
      gameTitle = gameRootDir.split('/').pop().replace('_extracted', '');
    }

    // Open OS window for game
    const winBody = MWO.wm.create({
      id: 'game_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      title: gameTitle,
      icon: 'game',
      width: 900,
      height: 640,
      resizable: true,
      onClose: () => {
        createdObjectUrls.forEach(u => URL.revokeObjectURL(u));
      }
    });

    winBody.style.padding = '0';
    winBody.style.margin = '0';
    winBody.style.overflow = 'hidden';
    winBody.style.background = '#000';

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-pointer-lock');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.srcdoc = indexText;

    if (secFindings.length > 0) {
      const infoDiv = document.createElement('div');
      infoDiv.style.background = 'rgba(234, 179, 8, 0.15)';
      infoDiv.style.color = '#eab308';
      infoDiv.style.padding = '6px 12px';
      infoDiv.style.fontSize = '12px';
      infoDiv.style.borderBottom = '1px solid rgba(234, 179, 8, 0.3)';
      infoDiv.style.flexShrink = '0';
      infoDiv.textContent = 'ℹ Security Note: ' + secFindings.map(f => f.detail).join('; ');
      winBody.appendChild(infoDiv);
    }
    winBody.appendChild(iframe);
    if (MWO.notif) MWO.notif.show('Game Launched', 'Running ' + gameTitle + ' inside MossyWoss OS');
  }


  /* ----------------------------------------------------------------------
   * PE Executable Inspector
   * ---------------------------------------------------------------------- */

  async function inspectPE(filename) {
    const filePath = '/Downloads/' + filename;
    if (!(await MWO.fs.exists(filePath))) return;

    const content = await MWO.fs.readFile(filePath);
    const bytes = dataURLToUint8Array(content);

    let peInfo = null;
    let parseError = '';

    try {
      if (bytes.length < 64) throw new Error('File is too short to be an MS-DOS / PE executable.');
      if (bytes[0] !== 0x4d || bytes[1] !== 0x5a) {
        throw new Error('Invalid MZ signature (Not an MS-DOS / PE executable file).');
      }

      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const e_lfanew = view.getUint32(0x3C, true);

      if (e_lfanew + 24 > bytes.length) {
        throw new Error('Invalid PE offset (e_lfanew points past end of file).');
      }

      const peSig = view.getUint32(e_lfanew, true);
      if (peSig !== 0x00004550) { // 'PE\0\0'
        throw new Error('Invalid PE header signature.');
      }

      const machineVal = view.getUint16(e_lfanew + 4, true);
      let machine = '0x' + machineVal.toString(16);
      if (machineVal === 0x14c) machine = 'x86 (32-bit)';
      else if (machineVal === 0x8664) machine = 'x64 (64-bit)';
      else if (machineVal === 0xaa64) machine = 'ARM64';

      const numberOfSections = view.getUint16(e_lfanew + 6, true);
      const timeDateStamp = view.getUint32(e_lfanew + 8, true);
      const timeStr = new Date(timeDateStamp * 1000).toUTCString();
      const characteristics = '0x' + view.getUint16(e_lfanew + 22, true).toString(16);

      let magicStr = 'Unknown';
      let subsystemStr = 'Unknown';

      if (e_lfanew + 24 + 70 <= bytes.length) {
        const magic = view.getUint16(e_lfanew + 24, true);
        if (magic === 0x10b) magicStr = 'PE32 (32-bit)';
        else if (magic === 0x20b) magicStr = 'PE32+ (64-bit)';

        const sub = view.getUint16(e_lfanew + 24 + 68, true);
        if (sub === 1) subsystemStr = 'Native / Driver';
        else if (sub === 2) subsystemStr = 'GUI application';
        else if (sub === 3) subsystemStr = 'Console application';
        else subsystemStr = 'Subsystem ' + sub;
      }

      peInfo = {
        machine: machine,
        numberOfSections: numberOfSections,
        timeStr: timeStr,
        characteristics: characteristics,
        magicStr: magicStr,
        subsystemStr: subsystemStr,
        fileSize: formatBytes(bytes.length)
      };
    } catch(e) {
      parseError = e.message;
    }

    const winBody = MWO.wm.create({
      id: 'pe_' + Date.now(),
      title: 'PE Inspector - ' + filename,
      icon: 'pe-inspector',
      width: 520,
      height: 420,
      resizable: true
    });

    winBody.style.padding = '16px';
    winBody.style.background = '#111425';
    winBody.style.color = '#fff';
    winBody.style.fontFamily = 'system-ui, sans-serif';

    if (parseError) {
      winBody.innerHTML = `
        <h3 style="color:#ff5555;margin-top:0">PE Inspection Error</h3>
        <p>${escapeHTML(parseError)}</p>
      `;
      return;
    }

    winBody.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px">
        <div style="font-size:32px"></div>
        <div>
          <div style="font-weight:bold;font-size:16px;color:#4e9eff">${escapeHTML(filename)}</div>
          <div style="font-size:12px;color:#aaa">PE Executable Metadata</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
        <tr><td style="padding:6px;color:#aaa;border-bottom:1px solid rgba(255,255,255,0.05);width:140px">Target Architecture:</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);font-weight:bold">${escapeHTML(peInfo.machine)}</td></tr>
        <tr><td style="padding:6px;color:#aaa;border-bottom:1px solid rgba(255,255,255,0.05)">Executable Type:</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);font-weight:bold">${escapeHTML(peInfo.magicStr)}</td></tr>
        <tr><td style="padding:6px;color:#aaa;border-bottom:1px solid rgba(255,255,255,0.05)">Subsystem:</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);font-weight:bold">${escapeHTML(peInfo.subsystemStr)}</td></tr>
        <tr><td style="padding:6px;color:#aaa;border-bottom:1px solid rgba(255,255,255,0.05)">Compile Timestamp:</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05)">${escapeHTML(peInfo.timeStr)}</td></tr>
        <tr><td style="padding:6px;color:#aaa;border-bottom:1px solid rgba(255,255,255,0.05)">Number of Sections:</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05)">${peInfo.numberOfSections}</td></tr>
        <tr><td style="padding:6px;color:#aaa;border-bottom:1px solid rgba(255,255,255,0.05)">Characteristics:</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05);font-family:monospace">${escapeHTML(peInfo.characteristics)}</td></tr>
        <tr><td style="padding:6px;color:#aaa;border-bottom:1px solid rgba(255,255,255,0.05)">File Size:</td><td style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.05)">${peInfo.fileSize}</td></tr>
      </table>

      <div style="background:rgba(255, 170, 0, 0.12);border:1px solid rgba(255, 170, 0, 0.3);border-radius:8px;padding:12px;font-size:13px;line-height:1.4;color:#ffe082">
 ℹ <strong>Honest Notice:</strong> PC programs (.exe) cannot execute inside a browser OS. Download the HTML5/JS build instead - those run right here with Run.
      </div>
    `;
  }


  /* ----------------------------------------------------------------------
   * Media Preview Window
   * ---------------------------------------------------------------------- */

  async function previewFile(filename) {
    const filePath = '/Downloads/' + filename;
    if (!(await MWO.fs.exists(filePath))) return;

    const content = await MWO.fs.readFile(filePath);
    const mime = getMimeType(filename);

    const winBody = MWO.wm.create({
      id: 'prev_' + Date.now(),
      title: 'Preview - ' + filename,
      icon: 'preview',
      width: 640,
      height: 480,
      resizable: true
    });

    winBody.style.padding = '0';
    winBody.style.margin = '0';
    winBody.style.background = '#0a0d18';
    winBody.style.display = 'flex';
    winBody.style.alignItems = 'center';
    winBody.style.justifyContent = 'center';

    let src = content;
    if (typeof content === 'string' && !content.startsWith('data:')) {
      if (!isTextLike(mime, filename)) {
        src = uint8ArrayToDataURL(dataURLToUint8Array(content), mime);
      }
    }

    if (mime.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = src;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      winBody.appendChild(img);
    } else if (mime.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      winBody.appendChild(video);
    } else if (mime.startsWith('audio/')) {
      const audioDiv = document.createElement('div');
      audioDiv.style.textAlign = 'center';
      audioDiv.style.padding = '20px';
      audioDiv.style.color = '#fff';
      audioDiv.innerHTML = `<h3 style="margin-bottom:16px">${escapeHTML(filename)}</h3>`;
      const audio = document.createElement('audio');
      audio.src = src;
      audio.controls = true;
      audio.autoplay = true;
      audioDiv.appendChild(audio);
      winBody.appendChild(audioDiv);
    } else {
      // Text / Code preview capped at 100KB
      winBody.style.display = 'block';
      let textStr = String(content);
      if (textStr.startsWith('data:')) {
        textStr = new TextDecoder('utf-8').decode(dataURLToUint8Array(textStr));
      }
      if (textStr.length > 102400) {
        textStr = textStr.substring(0, 102400) + '\n\n... [Content truncated at 100KB]';
      }

      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordBreak = 'break-all';
      pre.style.padding = '14px';
      pre.style.margin = '0';
      pre.style.color = '#00ffcc';
      pre.style.fontFamily = 'monospace';
      pre.style.fontSize = '13px';
      pre.style.height = '100%';
      pre.style.overflow = 'auto';
      pre.style.boxSizing = 'border-box';
      pre.textContent = textStr;
      winBody.appendChild(pre);
    }
  }


  /* ----------------------------------------------------------------------
   * Browser Main Application Window & Tab Manager
   * ---------------------------------------------------------------------- */

  function launchBrowser(initialUrl) {
    initDownloadsFromFS();

    const winId = 'browser_' + Date.now();
    const winBody = MWO.wm.create({
      id: winId,
      title: 'Browser',
      icon: 'browser',
      width: 900,
      height: 600,
      resizable: true
    });

    winBody.style.padding = '0';
    winBody.style.margin = '0';
    winBody.style.display = 'flex';
    winBody.style.flexDirection = 'column';
    winBody.style.background = '#0f111a';
    winBody.style.color = '#fff';
    winBody.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    winBody.style.position = 'relative';
    winBody.style.overflow = 'hidden';

    // Build Browser Shell Structure
    winBody.innerHTML = `
      <!-- Tabs Bar -->
      <div id="mwb-tabs-bar" style="display:flex;align-items:center;background:#16192b;border-bottom:1px solid rgba(255,255,255,0.08);padding:4px 6px 0 6px;gap:4px;overflow-x:auto;min-height:42px;user-select:none">
        <div id="mwb-tabs-list" style="display:flex;gap:4px;flex:1;align-items:flex-end"></div>
        <button id="mwb-add-tab-btn" title="New Tab" style="height:36px;width:38px;min-width:38px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:18px;cursor:pointer;margin-bottom:2px">＋</button>
      </div>

      <!-- Toolbar -->
      <div id="mwb-toolbar" style="display:flex;align-items:center;background:#1f2338;padding:6px 10px;gap:8px;border-bottom:1px solid rgba(255,255,255,0.08);min-height:48px">
        <button id="mwb-back" title="Back" style="height:38px;width:38px;min-width:38px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:15px;cursor:pointer">◀</button>
        <button id="mwb-forward" title="Forward" style="height:38px;width:38px;min-width:38px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:15px;cursor:pointer">▶</button>
 <button id="mwb-reload" title="Reload" style="height:38px;width:38px;min-width:38px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:15px;cursor:pointer">↻</button>
 <button id="mwb-home" title="Home Page" style="height:38px;min-width:38px;padding:0 8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:13px;cursor:pointer">Home</button>

        <!-- URL Input Container -->
        <div style="flex:1;height:38px;display:flex;align-items:center;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:0 10px;gap:8px">
          <span id="mwb-scheme-icon" style="font-size:14px;color:#8a99ad"></span>
          <input id="mwb-url-input" type="text" placeholder="Search the web or type URL..." style="flex:1;background:transparent;border:none;color:#fff;font-size:14px;outline:none" />
          <button id="mwb-go-btn" style="background:var(--accent, #4e9eff);border:none;border-radius:6px;color:#fff;padding:4px 10px;font-size:12px;font-weight:bold;cursor:pointer">Go</button>
        </div>

        <button id="mwb-star" title="Bookmark Page" style="height:38px;width:38px;min-width:38px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:16px;cursor:pointer">Star</button>
        <button id="mwb-external" title="Open this page in a new tab (works for sites that refuse embedding)" style="height:38px;padding:0 12px;display:flex;align-items:center;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:12px;font-weight:bold;cursor:pointer">↗ New Tab</button>
        <button id="mwb-downloads-toggle" title="Downloads" style="height:38px;padding:0 12px;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:14px;cursor:pointer;position:relative">
          <span style="font-size:12px;font-weight:bold">Downloads</span>
          <span id="mwb-dl-badge" style="background:#ff3b30;color:#fff;border-radius:10px;padding:1px 6px;font-size:11px;font-weight:bold;display:none">0</span>
        </button>
      </div>

      <!-- Main Tab Content Area -->
      <div id="mwb-content-area" style="flex:1;position:relative;overflow:hidden;background:#0f111a"></div>

      <!-- Slide-Up Downloads Panel -->
      <div id="mwb-downloads-panel" style="position:absolute;bottom:0;left:0;right:0;max-height:55%;background:#161829;border-top:2px solid var(--accent, #4e9eff);box-shadow:0 -6px 20px rgba(0,0,0,0.6);display:none;flex-direction:column;z-index:100">
        <div style="padding:10px 14px;background:#1f223a;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08)">
          <div style="font-weight:bold;font-size:14px;display:flex;align-items:center;gap:8px">
            <span>Downloads Manager</span>
          </div>
          <div style="display:flex;gap:8px">
            <button id="mwb-new-dl-toggle" style="background:var(--accent, #4e9eff);border:none;border-radius:6px;color:#fff;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;height:34px">＋ New Download</button>
            <button id="mwb-dl-close" style="background:rgba(255,255,255,0.1);border:none;border-radius:6px;color:#fff;padding:6px 10px;font-size:14px;cursor:pointer;height:34px">Close</button>
          </div>
        </div>

        <!-- Inline New Download Form -->
        <div id="mwb-new-dl-form" style="padding:12px 14px;background:#131524;border-bottom:1px solid rgba(255,255,255,0.08);display:none;flex-direction:column;gap:8px">
          <div style="display:flex;gap:8px">
            <input id="mwb-dl-url-input" type="text" placeholder="Paste file URL (e.g. https://example.com/game.zip)" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;color:#fff;font-size:13px;outline:none" />
            <input id="mwb-dl-name-input" type="text" placeholder="Filename (optional)" style="width:180px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px 10px;color:#fff;font-size:13px;outline:none" />
            <button id="mwb-dl-start-btn" style="background:#00c853;border:none;border-radius:6px;color:#fff;padding:8px 16px;font-size:13px;font-weight:bold;cursor:pointer">Start</button>
          </div>
        </div>

        <!-- Downloads Items Container -->
        <div id="mwb-dl-list" style="flex:1;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:8px"></div>
      </div>
    `;

    // References
    const tabsListEl = winBody.querySelector('#mwb-tabs-list');
    const addTabBtn = winBody.querySelector('#mwb-add-tab-btn');
    const backBtn = winBody.querySelector('#mwb-back');
    const forwardBtn = winBody.querySelector('#mwb-forward');
    const reloadBtn = winBody.querySelector('#mwb-reload');
    const homeBtn = winBody.querySelector('#mwb-home');
    const urlInput = winBody.querySelector('#mwb-url-input');
    const goBtn = winBody.querySelector('#mwb-go-btn');
    const starBtn = winBody.querySelector('#mwb-star');
    const schemeIcon = winBody.querySelector('#mwb-scheme-icon');
    const downloadsToggleBtn = winBody.querySelector('#mwb-downloads-toggle');
    const dlBadge = winBody.querySelector('#mwb-dl-badge');
    const downloadsPanel = winBody.querySelector('#mwb-downloads-panel');
    const dlCloseBtn = winBody.querySelector('#mwb-dl-close');
    const newDlToggleBtn = winBody.querySelector('#mwb-new-dl-toggle');
    const newDlForm = winBody.querySelector('#mwb-new-dl-form');
    const dlUrlInput = winBody.querySelector('#mwb-dl-url-input');
    const dlNameInput = winBody.querySelector('#mwb-dl-name-input');
    const dlStartBtn = winBody.querySelector('#mwb-dl-start-btn');
    const dlListEl = winBody.querySelector('#mwb-dl-list');
    const contentAreaEl = winBody.querySelector('#mwb-content-area');

    // Tab state management
    const tabs = [];
    let activeTabId = null;

    function createTab(initialNavUrl) {
      const tabId = 'tab_' + Date.now() + '_' + Math.floor(Math.random()*1000);
      const tab = {
        id: tabId,
        url: initialNavUrl || 'about:home',
        title: 'New Tab',
        historyStack: [initialNavUrl || 'about:home'],
        historyIndex: 0,
        containerEl: null,
        iframeEl: null,
        overlayEl: null,
        loadTimeoutTimer: null
      };

      // Create Tab Container inside content area
      const tabContainer = document.createElement('div');
      tabContainer.style.width = '100%';
      tabContainer.style.height = '100%';
      tabContainer.style.position = 'relative';
      tabContainer.style.display = 'none';

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.background = '#fff';

      // Create Overlay View
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.background = '#0f111a';
      overlay.style.overflowY = 'auto';
      overlay.style.zIndex = '10';
      overlay.style.padding = '20px';
      overlay.style.display = 'none';

      tabContainer.appendChild(iframe);
      tabContainer.appendChild(overlay);
      contentAreaEl.appendChild(tabContainer);

      tab.containerEl = tabContainer;
      tab.iframeEl = iframe;
      tab.overlayEl = overlay;

      tabs.push(tab);
      switchTab(tabId);
      navigateTab(tab, tab.url, false);
    }

    function closeTab(tabId, e) {
      if (e) e.stopPropagation();
      if (tabs.length <= 1) {
        // If last tab closed, open a new home tab
        const idx = tabs.findIndex(t => t.id === tabId);
        if (idx !== -1) {
          contentAreaEl.removeChild(tabs[idx].containerEl);
          tabs.splice(idx, 1);
        }
        createTab('about:home');
        return;
      }

      const idx = tabs.findIndex(t => t.id === tabId);
      if (idx !== -1) {
        contentAreaEl.removeChild(tabs[idx].containerEl);
        tabs.splice(idx, 1);
      }

      if (activeTabId === tabId) {
        const newActive = tabs[Math.max(0, idx - 1)];
        switchTab(newActive.id);
      } else {
        renderTabsHeader();
      }
    }

    function switchTab(tabId) {
      activeTabId = tabId;
      tabs.forEach(t => {
        if (t.id === tabId) {
          t.containerEl.style.display = 'block';
        } else {
          t.containerEl.style.display = 'none';
        }
      });
      renderTabsHeader();
      updateToolbarUI();
    }

    function getActiveTab() {
      return tabs.find(t => t.id === activeTabId);
    }

    function renderTabsHeader() {
      tabsListEl.innerHTML = '';
      tabs.forEach(t => {
        const tabEl = document.createElement('div');
        const isActive = t.id === activeTabId;

        tabEl.style.padding = '6px 10px';
        tabEl.style.height = '36px';
        tabEl.style.minWidth = '110px';
        tabEl.style.maxWidth = '180px';
        tabEl.style.display = 'flex';
        tabEl.style.alignItems = 'center';
        tabEl.style.gap = '6px';
        tabEl.style.fontSize = '12px';
        tabEl.style.cursor = 'pointer';
        tabEl.style.borderRadius = '8px 8px 0 0';

        if (isActive) {
          tabEl.style.background = '#1f2338';
          tabEl.style.border = '1px solid rgba(255,255,255,0.12)';
          tabEl.style.borderBottom = 'none';
          tabEl.style.color = '#fff';
          tabEl.style.fontWeight = 'bold';
        } else {
          tabEl.style.background = 'rgba(255,255,255,0.04)';
          tabEl.style.border = '1px solid transparent';
          tabEl.style.color = '#a0a5c0';
        }

        tabEl.onclick = () => switchTab(t.id);

        const iconSpan = document.createElement('span');
 iconSpan.textContent = t.url === 'about:home' || t.url.startsWith('mossy:')? '': '';

        const titleSpan = document.createElement('span');
        titleSpan.style.flex = '1';
        titleSpan.style.whiteSpace = 'nowrap';
        titleSpan.style.overflow = 'hidden';
        titleSpan.style.textOverflow = 'ellipsis';
        titleSpan.textContent = t.title || t.url;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.padding = '2px 6px';
        closeBtn.style.borderRadius = '50%';
        closeBtn.style.border = 'none';
        closeBtn.style.background = 'transparent';
        closeBtn.style.color = isActive ? '#aaa' : '#666';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '12px';
        closeBtn.onclick = (e) => closeTab(t.id, e);

        tabEl.appendChild(iconSpan);
        tabEl.appendChild(titleSpan);
        tabEl.appendChild(closeBtn);
        tabsListEl.appendChild(tabEl);
      });
    }

    function updateToolbarUI() {
      const tab = getActiveTab();
      if (!tab) return;

      urlInput.value = tab.url;
      backBtn.disabled = tab.historyIndex <= 0;
      backBtn.style.opacity = tab.historyIndex <= 0 ? '0.4' : '1';
      forwardBtn.disabled = tab.historyIndex >= tab.historyStack.length - 1;
      forwardBtn.style.opacity = tab.historyIndex >= tab.historyStack.length - 1 ? '0.4' : '1';

      if (isBookmarked(tab.url)) {
        starBtn.style.color = '#ffd700';
      } else {
        starBtn.style.color = '#ffffff';
      }

      if (tab.url.startsWith('https://')) {
        schemeIcon.textContent = 'Lock';
        schemeIcon.style.color = '#00c853';
      } else if (tab.url === 'about:home' || tab.url.startsWith('mossy:')) {
 schemeIcon.textContent = '';
        schemeIcon.style.color = '#4e9eff';
      } else {
        schemeIcon.textContent = '';
        schemeIcon.style.color = '#8a99ad';
      }
    }

    function navigateTab(tab, targetUrl, pushHistory = true) {
      if (!targetUrl) return;
      let url = targetUrl.trim();

      if (tab.loadTimeoutTimer) {
        clearTimeout(tab.loadTimeoutTimer);
        tab.loadTimeoutTimer = null;
      }

      if (pushHistory) {
        tab.historyStack = tab.historyStack.slice(0, tab.historyIndex + 1);
        tab.historyStack.push(url);
        tab.historyIndex = tab.historyStack.length - 1;
      }

      tab.url = url;
      updateToolbarUI();

      if (url === 'about:home' || url === 'mossy://home') {
        tab.title = 'Home';
        renderHomePage(tab);
        renderTabsHeader();
        return;
      }

      if (url.startsWith('mossy:search?q=')) {
        const q = decodeURIComponent(url.split('q=')[1] || '');
        tab.title = 'Search: ' + q;
        renderSearchResults(tab, q);
        renderTabsHeader();
        return;
      }

      // External Web Navigation
      tab.title = url.replace(/^https?:\/\//, '');
      renderTabsHeader();

      tab.overlayEl.style.display = 'none';
      tab.iframeEl.style.display = 'block';

      let loadedFired = false;
      tab.iframeEl.onload = () => {
        loadedFired = true;
        if (tab.loadTimeoutTimer) clearTimeout(tab.loadTimeoutTimer);
      };

      tab.iframeEl.src = url;

      // 4-second Fallback Timer for Non-Embeddable Sites
      tab.loadTimeoutTimer = setTimeout(() => {
        if (!loadedFired) {
          renderFallbackNotice(tab, url);
        }
      }, 4000);
    }

    /* ----------------------------------------------------------------------
     * Render Home Page View
     * ---------------------------------------------------------------------- */

    function renderHomePage(tab) {
      tab.iframeEl.style.display = 'none';
      tab.overlayEl.style.display = 'block';

      const bookmarks = getBookmarks();

      let bookmarksHtml = '';
      if (bookmarks.length === 0) {
        bookmarksHtml = `
          <div style="grid-column: 1/-1; padding:20px; text-align:center; color:#7a829e; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.1); border-radius:10px; font-size:13px">
            No bookmarks saved yet. Star any website or add one below!
          </div>
        `;
      } else {
        bookmarks.forEach(bm => {
          bookmarksHtml += `
            <div class="mwb-bm-card" data-url="${escapeHTML(bm.url)}" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all 0.2s;position:relative">
              <div style="font-size:20px;background:rgba(78,158,255,0.15);width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#4e9eff;font-weight:bold">
                ${escapeHTML(bm.title.charAt(0).toUpperCase())}
              </div>
              <div style="flex:1;overflow:hidden">
                <div style="font-weight:bold;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(bm.title)}</div>
                <div style="font-size:11px;color:#8a99ad;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(bm.url)}</div>
              </div>
              <button class="mwb-bm-del" data-id="${bm.id}" style="background:transparent;border:none;color:#ff5555;font-size:14px;cursor:pointer;padding:4px;border-radius:4px" title="Remove Bookmark">Close</button>
            </div>
          `;
        });
      }

      tab.overlayEl.innerHTML = `
        <div style="max-width:800px;margin:30px auto;display:flex;flex-direction:column;align-items:center;gap:24px">
          <!-- Big Logo / Header -->
          <div style="text-align:center">
            <div style="font-size:48px;margin-bottom:8px"></div>
            <h1 style="margin:0;font-size:26px;font-weight:bold;background:linear-gradient(135deg, #4e9eff, #00c853);-webkit-background-clip:text;-webkit-text-fill-color:transparent">MossyWoss Browser</h1>
            <p style="margin:6px 0 0 0;font-size:13px;color:#8a99ad">Browse the web, download files, unzip & run HTML5 games in-OS</p>
          </div>

          <!-- Big Search Box -->
          <div style="width:100%;display:flex;gap:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:6px 12px;box-shadow:0 8px 24px rgba(0,0,0,0.3)">
            <span style="font-size:18px;color:#8a99ad;align-self:center"></span>
            <input id="mwb-home-search-input" type="text" placeholder="Search the web or type URL..." style="flex:1;background:transparent;border:none;color:#fff;font-size:15px;padding:8px;outline:none" />
            <button id="mwb-home-search-btn" style="background:var(--accent, #4e9eff);border:none;border-radius:8px;color:#fff;padding:8px 20px;font-weight:bold;cursor:pointer;font-size:14px">Search</button>
          </div>

          <!-- Quick Action Buttons -->
          <div style="display:flex;gap:12px;width:100%;justify-content:center">
            <button id="mwb-quick-dl" style="flex:1;max-width:180px;height:44px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-size:13px">
              <span>In</span> Downloads
            </button>
            <button id="mwb-quick-unzip" style="flex:1;max-width:180px;height:44px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-size:13px">
              <span>Box</span> Extract a ZIP
            </button>
            <button id="mwb-quick-help" style="flex:1;max-width:180px;height:44px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-size:13px">
 <span></span> Help
            </button>
          </div>

          <!-- Bookmarks Grid -->
          <div style="width:100%">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px">
              <span style="font-weight:bold;font-size:14px;color:#a0a5c0">Star Bookmarks</span>
              <button id="mwb-add-bm-btn" style="background:rgba(255,255,255,0.08);border:none;border-radius:6px;color:#4e9eff;padding:4px 10px;font-size:12px;font-weight:bold;cursor:pointer">＋ Add Bookmark</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:12px">
              ${bookmarksHtml}
            </div>
          </div>
        </div>
      `;

      // Home Search Bindings
      const homeSearchInput = tab.overlayEl.querySelector('#mwb-home-search-input');
      const homeSearchBtn = tab.overlayEl.querySelector('#mwb-home-search-btn');

      function triggerHomeSearch() {
        const val = homeSearchInput.value.trim();
        if (!val) return;
        if (val.includes('.') || val.startsWith('http://') || val.startsWith('https://')) {
          let u = val;
          if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
          navigateTab(tab, u);
        } else {
          navigateTab(tab, 'mossy:search?q=' + encodeURIComponent(val));
        }
      }

      homeSearchBtn.onclick = triggerHomeSearch;
      homeSearchInput.onkeydown = (e) => { if (e.key === 'Enter') triggerHomeSearch(); };

      // Quick Actions
      tab.overlayEl.querySelector('#mwb-quick-dl').onclick = () => {
        downloadsPanel.style.display = 'flex';
      };
      tab.overlayEl.querySelector('#mwb-quick-unzip').onclick = () => {
        downloadsPanel.style.display = 'flex';
        newDlForm.style.display = 'flex';
      };
      tab.overlayEl.querySelector('#mwb-quick-help').onclick = () => {
        if (MWO.dialog) {
          MWO.dialog.confirm(
            'MossyWoss Browser Help',
            '• Enter URLs or search topics in the address bar.\n' +
            '• Search query results come from a public encyclopedia API.\n' +
            '• Downloads stay strictly in MossyWoss OS virtual filesystem (/Downloads).\n' +
            '• Downloaded ZIP files can be extracted in-browser without external tools.\n' +
            '• Downloaded HTML5 games run inside sandboxed OS windows!\n' +
            '• EXE files can be inspected for PE header details.',
            null, null
          );
        }
      };

      // Bookmark Clicks & Deletes
      tab.overlayEl.querySelectorAll('.mwb-bm-card').forEach(card => {
        card.onclick = (e) => {
          if (e.target.classList.contains('mwb-bm-del')) return;
          const url = card.getAttribute('data-url');
          if (url) navigateTab(tab, url);
        };
      });

      tab.overlayEl.querySelectorAll('.mwb-bm-del').forEach(delBtn => {
        delBtn.onclick = (e) => {
          e.stopPropagation();
          const id = delBtn.getAttribute('data-id');
          removeBookmark(id);
          renderHomePage(tab);
        };
      });

      tab.overlayEl.querySelector('#mwb-add-bm-btn').onclick = () => {
        const urlPrompt = prompt('Enter website URL:');
        if (urlPrompt) {
          let clean = urlPrompt.trim();
          if (!clean.startsWith('http://') && !clean.startsWith('https://')) clean = 'https://' + clean;
          const titlePrompt = prompt('Enter title for bookmark:', clean) || clean;
          addBookmark(titlePrompt, clean);
          renderHomePage(tab);
          updateToolbarUI();
        }
      };
    }

    /* ----------------------------------------------------------------------
     * Render Web Search Results View
     * ---------------------------------------------------------------------- */

    async function renderSearchResults(tab, query) {
      tab.iframeEl.style.display = 'none';
      tab.overlayEl.style.display = 'block';

      tab.overlayEl.innerHTML = `
        <div style="max-width:820px;margin:20px auto">
          <h2 style="margin:0 0 6px 0;font-size:20px;color:#4e9eff">Searching the web for "${escapeHTML(query)}"...</h2>
          <div style="font-size:13px;color:#8a99ad">Asking web search engines (live internet search)</div>
        </div>
      `;

      const ddgP = fetch('https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1')
        .then(r => r.ok ? r.json() : null).catch(() => null);
      const wikiP = fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(query) + '&format=json&origin=*&srlimit=10')
        .then(r => r.ok ? r.json() : null).catch(() => null);

      const [ddgRes, wikiRes] = await Promise.allSettled([ddgP, wikiP]);
      const ddg = ddgRes.status === 'fulfilled' ? ddgRes.value : null;
      const wiki = wikiRes.status === 'fulfilled' ? wikiRes.value : null;

      const ddgAbstract = ddg && ddg.AbstractText ? { text: ddg.AbstractText, url: ddg.AbstractURL, source: ddg.AbstractSource } : null;
      let ddgTopics = [];
      if (ddg && Array.isArray(ddg.RelatedTopics)) {
        ddg.RelatedTopics.forEach(function(t) {
          if (ddgTopics.length >= 8) return;
          if (t && t.FirstURL && t.Text) {
            ddgTopics.push({ url: t.FirstURL, text: t.Text });
          } else if (t && Array.isArray(t.Topics)) {
            t.Topics.forEach(function(s) {
              if (ddgTopics.length < 8 && s && s.FirstURL && s.Text) ddgTopics.push({ url: s.FirstURL, text: s.Text });
            });
          }
        });
      }
      const wikiResults = (wiki && wiki.query && wiki.query.search) ? wiki.query.search : [];
      const googleLink = 'https://www.google.com/search?q=' + encodeURIComponent(query);
      const ddgLink = 'https://duckduckgo.com/?q=' + encodeURIComponent(query);

      const nothingFound = !ddgAbstract && ddgTopics.length === 0 && wikiResults.length === 0;

      let html = `
        <div style="max-width:820px;margin:20px auto">
          <div style="margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <div>
              <h2 style="margin:0 0 4px 0;font-size:20px;color:#4e9eff">Search Results</h2>
              <div style="font-size:13px;color:#8a99ad">Web + encyclopedia results for "${escapeHTML(query)}"</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="mwb-ext-search" data-link="${escapeHTML(googleLink)}" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);border-radius:8px;color:#fff;padding:6px 12px;font-size:12px;cursor:pointer">Open web results (new tab)</button>
              <button class="mwb-ext-search" data-link="${escapeHTML(ddgLink)}" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);border-radius:8px;color:#fff;padding:6px 12px;font-size:12px;cursor:pointer">Open alternate web results (new tab)</button>
            </div>
          </div>
      `;

      if (nothingFound) {
        html += `
          <div style="padding:20px;background:rgba(255,255,255,0.03);border-radius:10px;text-align:center;color:#8a99ad;margin-bottom:16px">
            ${ddg || wiki ? 'No results found for that.' : 'Could not reach the search services (offline?).'} Use the buttons above to search in a new tab.
          </div>
        `;
      }

      if (ddgAbstract) {
        html += `
          <div style="background:rgba(78,158,255,0.08);border:1px solid rgba(78,158,255,0.25);border-radius:12px;padding:16px;margin-bottom:18px">
            <div style="font-size:12px;color:#4e9eff;font-weight:bold;margin-bottom:6px">Instant answer (${ddgAbstract.source ? ' / ' + escapeHTML(ddgAbstract.source) : ''})</div>
            <div style="font-size:14px;line-height:1.55;color:#e6e9f0">${escapeHTML(ddgAbstract.text)}</div>
            ${ddgAbstract.url ? `<div class="mwb-sr-item" data-url="${escapeHTML(ddgAbstract.url)}" style="margin-top:10px;font-size:12px;color:#4e9eff;cursor:pointer;text-decoration:underline">Read the full source</div>` : ''}
          </div>
        `;
      }

      if (ddgTopics.length) {
        html += `<div style="font-size:13px;color:#8a99ad;font-weight:bold;margin:14px 0 10px 0">Web results</div>`;
        ddgTopics.forEach(t => {
          html += `
            <div class="mwb-sr-item" data-url="${escapeHTML(t.url)}" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:13px 14px;cursor:pointer;margin-bottom:10px">
              <div style="font-size:15px;color:#9fc4ff;margin-bottom:3px">${escapeHTML(t.text.split(' - ')[0])}</div>
              <div style="font-size:12px;color:#a8b3c7;line-height:1.4">${escapeHTML(t.text)}</div>
              <div style="font-size:11px;color:#8a99ad;margin-top:5px">${escapeHTML(t.url)}</div>
            </div>
          `;
        });
      }

      if (wikiResults.length) {
        html += `<div style="font-size:13px;color:#8a99ad;font-weight:bold;margin:14px 0 10px 0">Encyclopedia</div>`;
        wikiResults.forEach(item => {
          const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`;
          html += `
            <div class="mwb-sr-item" data-url="${escapeHTML(wikiUrl)}" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:13px 14px;cursor:pointer;margin-bottom:10px">
              <div style="font-size:15px;font-weight:bold;color:#4e9eff;margin-bottom:3px">${escapeHTML(item.title)}</div>
              <div style="font-size:12px;color:#c2c8d4;line-height:1.4">${escapeHTML(stripHTML(item.snippet))}...</div>
            </div>
          `;
        });
      }

      html += `
          <div style="margin-top:22px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#666;text-align:center">
            Live web and encyclopedia results. Sites that refuse embedding open via the New Tab button.
          </div>
        </div>
      `;

      tab.overlayEl.innerHTML = html;
      tab.overlayEl.querySelectorAll('.mwb-sr-item').forEach(el => {
        el.onclick = () => {
          const url = el.getAttribute('data-url');
          if (url) navigateTab(tab, url);
        };
      });
      tab.overlayEl.querySelectorAll('.mwb-ext-search').forEach(el => {
        el.onclick = () => {
          const link = el.getAttribute('data-link');
          if (link) { try { window.open(link, '_blank'); } catch (e) {} }
        };
      });
    }

    /* ----------------------------------------------------------------------
     * Render Embedding Fallback Notice
     * ---------------------------------------------------------------------- */

    function renderFallbackNotice(tab, url) {
      tab.iframeEl.style.display = 'none';
      tab.overlayEl.style.display = 'block';

      tab.overlayEl.innerHTML = `
        <div style="max-width:650px;margin:40px auto;background:#16192e;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,0.5)">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
            <div style="font-size:36px;background:rgba(255, 170, 0, 0.15);width:50px;height:50px;border-radius:12px;display:flex;align-items:center;justify-content:center">Lock</div>
            <div>
              <h3 style="margin:0;font-size:18px;color:#ffe082">Embedding Restricted</h3>
              <div style="font-size:12px;color:#8a99ad;margin-top:2px">${escapeHTML(url)}</div>
            </div>
          </div>

          <p style="font-size:14px;line-height:1.5;color:#e0e0e0;margin-bottom:20px">
 This site does not allow embedding. You can still download files from it — paste the file link in Downloads New download.
          </p>

          <div style="display:flex;gap:10px;justify-content:flex-end">
            <button id="mwb-fb-open-dl" style="background:var(--accent, #4e9eff);border:none;border-radius:8px;color:#fff;padding:8px 16px;font-weight:bold;cursor:pointer;font-size:13px;height:38px">
              Open Downloads
            </button>
            <button id="mwb-fb-home" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;padding:8px 16px;cursor:pointer;font-size:13px;height:38px">
              Back to Home
            </button>
          </div>
        </div>
      `;

      tab.overlayEl.querySelector('#mwb-fb-open-dl').onclick = () => {
        downloadsPanel.style.display = 'flex';
        newDlForm.style.display = 'flex';
        dlUrlInput.value = url;
      };
      tab.overlayEl.querySelector('#mwb-fb-home').onclick = () => {
        navigateTab(tab, 'about:home');
      };
    }

    /* ----------------------------------------------------------------------
     * Downloads UI Update
     * ---------------------------------------------------------------------- */

    function renderDownloadsUI() {
      const activeCount = downloadsList.filter(d => d.status === 'downloading').length;
      if (activeCount > 0) {
        dlBadge.textContent = activeCount;
        dlBadge.style.display = 'inline-block';
      } else {
        dlBadge.style.display = 'none';
      }

      if (downloadsList.length === 0) {
        dlListEl.innerHTML = `
          <div style="padding:20px;text-align:center;color:#666;font-size:13px">
            No downloads yet. Click '＋ New Download' to start fetching a file!
          </div>
        `;
        return;
      }

      let html = '';
      downloadsList.forEach(dl => {
        const isZip = dl.name.toLowerCase().endsWith('.zip');
        const isExe = dl.name.toLowerCase().endsWith('.exe');

        if (dl.status === 'downloading') {
          const pct = dl.total ? Math.min(100, Math.round((dl.loaded / dl.total) * 100)) : 0;
          const progText = dl.total ? `${formatBytes(dl.loaded)} / ${formatBytes(dl.total)} (${pct}%)` : `${formatBytes(dl.loaded)}`;

          html += `
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:6px">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="font-weight:bold;font-size:13px;color:#fff">${escapeHTML(dl.name)}</span>
                <button class="mwb-dl-cancel-btn" data-id="${dl.id}" style="background:rgba(255,85,85,0.2);border:none;border-radius:4px;color:#ff5555;padding:4px 8px;font-size:12px;cursor:pointer">Cancel</button>
              </div>
              <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:var(--accent, #4e9eff);transition:width 0.2s"></div>
              </div>
              <div style="font-size:11px;color:#8a99ad;display:flex;justify-content:space-between">
                <span>${progText}</span>
                <span>Downloading...</span>
              </div>
            </div>
          `;
        } else if (dl.status === 'completed') {
          html += `
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px">
              <div style="flex:1;overflow:hidden">
                <div style="font-weight:bold;font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(dl.name)}</div>
                <div style="font-size:11px;color:#00c853">${formatBytes(dl.size || dl.loaded)} • Saved in /Downloads</div>
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                ${isZip ? `<button class="mwb-dl-unzip-btn" data-name="${escapeHTML(dl.name)}" style="background:#00c853;border:none;border-radius:6px;color:#fff;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;height:36px">Box Extract</button>` : ''}
                ${isExe ? `<button class="mwb-dl-inspect-btn" data-name="${escapeHTML(dl.name)}" style="background:#ff9800;border:none;border-radius:6px;color:#fff;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;height:36px"> Inspect</button>` : ''}
                <button class="mwb-dl-open-btn" data-name="${escapeHTML(dl.name)}" style="background:var(--accent, #4e9eff);border:none;border-radius:6px;color:#fff;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;height:36px">Run Open</button>
                <button class="mwb-dl-show-btn" data-name="${escapeHTML(dl.name)}" title="Show in Downloads" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:6px;color:#fff;padding:6px 10px;font-size:12px;cursor:pointer;height:36px">Dir Show in Downloads</button>
                <button class="mwb-dl-del-btn" data-id="${dl.id}" data-name="${escapeHTML(dl.name)}" style="background:rgba(255,85,85,0.2);border:none;border-radius:6px;color:#ff5555;padding:6px 10px;font-size:12px;cursor:pointer;height:36px">Close</button>
              </div>
            </div>
          `;
        } else if (dl.status === 'blocked') {
          html += `
            <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between">
              <div>
                <div style="font-weight:bold;font-size:13px;color:#fca5a5">${escapeHTML(dl.name)}</div>
                <div style="font-size:11px;color:#f87171;margin-top:2px">${escapeHTML(dl.errorMsg || 'Blocked high risk file')}</div>
              </div>
              <button class="mwb-dl-del-btn" data-id="${dl.id}" data-name="${escapeHTML(dl.name)}" style="background:rgba(255,85,85,0.2);border:none;border-radius:6px;color:#ff5555;padding:6px 10px;font-size:12px;cursor:pointer;height:34px">Close</button>
            </div>
          `;
        } else if (dl.status === 'warning') {
          html += `
            <div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px">
              <div style="flex:1;overflow:hidden">
                <div style="font-weight:bold;font-size:13px;color:#fef08a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHTML(dl.name)}</div>
                <div style="font-size:11px;color:#fbbf24;margin-top:2px"> Medium risk: ${escapeHTML(dl.warningMsg || 'Scan findings detected')}</div>
              </div>
              <div style="display:flex;gap:6px;align-items:center">
 <button class="mwb-dl-quarantine-btn" data-name="${escapeHTML(dl.name)}" style="background:#f59e0b;border:none;border-radius:6px;color:#000;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;height:36px"> Quarantine</button>
                ${isZip ? `<button class="mwb-dl-unzip-btn" data-name="${escapeHTML(dl.name)}" style="background:#00c853;border:none;border-radius:6px;color:#fff;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;height:36px">Box Extract</button>` : ''}
                <button class="mwb-dl-open-btn" data-name="${escapeHTML(dl.name)}" style="background:var(--accent, #4e9eff);border:none;border-radius:6px;color:#fff;padding:6px 12px;font-size:12px;font-weight:bold;cursor:pointer;height:36px">Run Open</button>
                <button class="mwb-dl-del-btn" data-id="${dl.id}" data-name="${escapeHTML(dl.name)}" style="background:rgba(255,85,85,0.2);border:none;border-radius:6px;color:#ff5555;padding:6px 10px;font-size:12px;cursor:pointer;height:36px">Close</button>
              </div>
            </div>
          `;
        } else {
          // Error or Cancelled
          html += `
            <div style="background:rgba(255,85,85,0.08);border:1px solid rgba(255,85,85,0.2);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between">
              <div>
                <div style="font-weight:bold;font-size:13px;color:#ff8888">${escapeHTML(dl.name)}</div>
                <div style="font-size:11px;color:#ffaaaa;margin-top:2px">${escapeHTML(dl.errorMsg || 'Download failed.')}</div>
              </div>
              <button class="mwb-dl-del-btn" data-id="${dl.id}" data-name="${escapeHTML(dl.name)}" style="background:rgba(255,85,85,0.2);border:none;border-radius:6px;color:#ff5555;padding:6px 10px;font-size:12px;cursor:pointer;height:34px">Close</button>
            </div>
          `;
        }
      });

      dlListEl.innerHTML = html;

      // Event Bindings
      dlListEl.querySelectorAll('.mwb-dl-quarantine-btn').forEach(btn => {
        btn.onclick = async () => {
          const name = btn.getAttribute('data-name');
          if (name && window.MWO && MWO.Sec && typeof MWO.Sec.quarantine === 'function') {
            await MWO.Sec.quarantine('/Downloads/' + name, 'User quarantined medium risk download');
            if (MWO.notif) MWO.notif.show('Quarantined', name + ' moved to /System/Quarantine');
            const dl = downloadsList.find(d => d.name === name);
            if (dl) dl.status = 'quarantined';
            renderDownloadsUI();
          }
        };
      });

      dlListEl.querySelectorAll('.mwb-dl-cancel-btn').forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute('data-id');
          const item = downloadsList.find(d => d.id === id);
          if (item && item.abortController) item.abortController.abort();
        };
      });

      dlListEl.querySelectorAll('.mwb-dl-open-btn').forEach(btn => {
        btn.onclick = () => {
          const name = btn.getAttribute('data-name');
          if (name) previewFile(name);
        };
      });

      dlListEl.querySelectorAll('.mwb-dl-show-btn').forEach(btn => {
        btn.onclick = () => {
          if (MWO.apps && MWO.apps['files'] && typeof MWO.apps['files'].launch === 'function') {
            MWO.apps['files'].launch();
          } else if (MWO.launchApp) {
            MWO.launchApp('files');
          }
        };
      });

      dlListEl.querySelectorAll('.mwb-dl-del-btn').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          const idx = downloadsList.findIndex(d => d.id === id);
          if (idx !== -1) downloadsList.splice(idx, 1);
          if (name) {
            await fsDelete('/Downloads/' + name);
          }
          renderDownloadsUI();
        };
      });

      dlListEl.querySelectorAll('.mwb-dl-inspect-btn').forEach(btn => {
        btn.onclick = () => {
          const name = btn.getAttribute('data-name');
          if (name) inspectPE(name);
        };
      });

      dlListEl.querySelectorAll('.mwb-dl-unzip-btn').forEach(btn => {
        btn.onclick = async () => {
          const name = btn.getAttribute('data-name');
          if (!name) return;

          btn.disabled = true;
          btn.textContent = 'Extracting...';

          try {
            const res = await extractZip(name, (current, total, entryName) => {
              btn.textContent = `Extracted ${current}/${total}…`;
            });

            const indexFile = await checkForIndexHtml(res.targetDir);
            renderDownloadsUI();

            if (indexFile) {
              if (MWO.dialog) {
                MWO.dialog.confirm(
                  'ZIP Extracted Successfully',
                  `Extracted ${res.extractedCount} files to ${res.targetDir}.\nAn HTML5 game entry point (index.html) was found! Would you like to run it inside MossyWoss OS now?`,
                  () => runHTML5Game(indexFile),
                  null
                );
              } else {
                runHTML5Game(indexFile);
              }
            } else {
              if (MWO.notif) MWO.notif.show('ZIP Extracted', `Extracted ${res.extractedCount} files to ${res.targetDir}`);
            }
          } catch(err) {
            btn.disabled = false;
            btn.textContent = 'Box Extract';
            alert('ZIP Extraction Failed: ' + err.message);
          }
        };
      });
    }

    downloadsUIUpdateFn = renderDownloadsUI;

    // Control Bindings
    addTabBtn.onclick = () => createTab('about:home');

    backBtn.onclick = () => {
      const tab = getActiveTab();
      if (tab && tab.historyIndex > 0) {
        tab.historyIndex--;
        navigateTab(tab, tab.historyStack[tab.historyIndex], false);
      }
    };

    forwardBtn.onclick = () => {
      const tab = getActiveTab();
      if (tab && tab.historyIndex < tab.historyStack.length - 1) {
        tab.historyIndex++;
        navigateTab(tab, tab.historyStack[tab.historyIndex], false);
      }
    };

    reloadBtn.onclick = () => {
      const tab = getActiveTab();
      if (tab) navigateTab(tab, tab.url, false);
    };

    homeBtn.onclick = () => {
      const tab = getActiveTab();
      if (tab) navigateTab(tab, 'about:home');
    };

    function triggerNavInput() {
      const tab = getActiveTab();
      if (!tab) return;
      const val = urlInput.value.trim();
      if (!val) return;

      if (val === 'about:home' || val === 'mossy://home') {
        navigateTab(tab, 'about:home');
      } else if (val.includes('.') || val.startsWith('http://') || val.startsWith('https://')) {
        let u = val;
        if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
        navigateTab(tab, u);
      } else {
        navigateTab(tab, 'mossy:search?q=' + encodeURIComponent(val));
      }
    }

    goBtn.onclick = triggerNavInput;

    const externalBtn = winBody.querySelector('#mwb-external');
    if (externalBtn) {
      externalBtn.onclick = () => {
        const tab = getActiveTab();
        if (!tab || !tab.url || tab.url === 'about:home') return;
        try { window.open(tab.url, '_blank'); } catch (e) {}
      };
    }
    urlInput.onkeydown = (e) => { if (e.key === 'Enter') triggerNavInput(); };

    starBtn.onclick = () => {
      const tab = getActiveTab();
      if (!tab) return;
      if (isBookmarked(tab.url)) {
        removeBookmark(tab.url);
      } else {
        addBookmark(tab.title || tab.url, tab.url);
      }
      updateToolbarUI();
      if (tab.url === 'about:home') renderHomePage(tab);
    };

    downloadsToggleBtn.onclick = () => {
      if (downloadsPanel.style.display === 'none' || !downloadsPanel.style.display) {
        downloadsPanel.style.display = 'flex';
        renderDownloadsUI();
      } else {
        downloadsPanel.style.display = 'none';
      }
    };

    dlCloseBtn.onclick = () => { downloadsPanel.style.display = 'none'; };

    newDlToggleBtn.onclick = () => {
      newDlForm.style.display = newDlForm.style.display === 'none' || !newDlForm.style.display ? 'flex' : 'none';
    };

    dlStartBtn.onclick = () => {
      const u = dlUrlInput.value.trim();
      const fn = dlNameInput.value.trim();
      if (u) {
        startDownload(u, fn);
        dlUrlInput.value = '';
        dlNameInput.value = '';
        newDlForm.style.display = 'none';
      }
    };

    // Initialize first tab
    createTab(initialUrl || 'about:home');
  }

  if (typeof MWO !== 'undefined') {
    MWO.ZipKit = {
      extractZip: extractZip,
      runHTML5Game: runHTML5Game,
      checkForIndexHtml: checkForIndexHtml,
      dataUrlToBytes: dataURLToUint8Array
    };
  }

  return {
    launch: launchBrowser,
    startDownload: startDownload,
    extractZip: extractZip,
    runHTML5Game: runHTML5Game,
    inspectPE: inspectPE,
    previewFile: previewFile
  };
})();

/* ----------------------------------------------------------------------
 * Register Browser App in MossyWoss OS
 * ---------------------------------------------------------------------- */

const browserAppDef = {
  id: 'browser',
  name: 'Browser',
  description: 'Browse the web, download files, unzip & run HTML5 games in-OS',
  icon: 'browser',
  category: 'app',
  installed: true,
  launch: function(initialUrl) {
    MWO.Browser.launch(initialUrl);
  }
};

if (typeof MWO !== 'undefined') {
  if (typeof MWO.registerApp === 'function') {
    MWO.registerApp(browserAppDef);
  }
  if (MWO.apps) {
    MWO.apps['browser'] = browserAppDef;
  }
}
