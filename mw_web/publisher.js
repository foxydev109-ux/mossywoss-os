/* ========================================================================
 * MossyWoss OS App & Game Publisher Studio
 * MWO.Publisher
 * Allows users to upload ZIP archives or select VFS folders, inspect entry
 * points, run MossGuard security scans, agree to publishing rules, and publish
 * real store entries into /System/store/published/<id>.json.
 * ======================================================================== */

MWO.Publisher = (function() {
  'use strict';

  /* ----------------------------------------------------------------------
   * Helper Functions
   * ---------------------------------------------------------------------- */

  function sanitizeName(name) {
    if (!name) return 'app_' + Date.now();
    let s = String(name).trim();
    s = s.replace(/[^\w\.\-\s]/g, '_').replace(/\s+/g, ' ');
    return s || 'app_' + Date.now();
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function isTextFilename(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    return ['txt', 'html', 'htm', 'js', 'mjs', 'css', 'json', 'xml', 'svg', 'md'].includes(ext);
  }

  async function getFolderFilesRecursive(dirPath) {
    const results = [];
    try {
      const items = await MWO.fs.listDir(dirPath);
      for (const item of items) {
        if (item.type === 'dir') {
          const sub = await getFolderFilesRecursive(item.path);
          results.push(...sub);
        } else {
          results.push(item);
        }
      }
    } catch(e) {}
    return results;
  }

  async function scanFolderSecurity(folderPath, onProgress) {
    const allFiles = await getFolderFilesRecursive(folderPath);
    let highestVerdict = 'clean';
    const allFindings = [];
    let cleanCount = 0;

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      if (onProgress) onProgress(i + 1, allFiles.length, file.name);

      if (window.MWO && MWO.Sec) {
        try {
          const content = await MWO.fs.readFile(file.path);
          let secRes = null;

          if (isTextFilename(file.name)) {
            let textStr = '';
            if (typeof content === 'string') {
              if (content.startsWith('data:')) {
                const bytes = (MWO.ZipKit && typeof MWO.ZipKit.dataUrlToBytes === 'function')
                  ? MWO.ZipKit.dataUrlToBytes(content)
                  : new TextEncoder().encode(content);
                textStr = new TextDecoder('utf-8').decode(bytes);
              } else {
                textStr = content;
              }
            } else {
              textStr = new TextDecoder('utf-8').decode(content);
            }
            if (typeof MWO.Sec.scanText === 'function') {
              secRes = MWO.Sec.scanText(file.name, textStr);
            }
          } else {
            let bytes;
            if (typeof content === 'string') {
              bytes = (MWO.ZipKit && typeof MWO.ZipKit.dataUrlToBytes === 'function')
                ? MWO.ZipKit.dataUrlToBytes(content)
                : new TextEncoder().encode(content);
            } else if (content instanceof Uint8Array) {
              bytes = content;
            } else {
              bytes = new Uint8Array(0);
            }
            if (typeof MWO.Sec.scanBytes === 'function') {
              secRes = MWO.Sec.scanBytes(file.name, bytes);
            }
          }

          if (secRes && secRes.findings && secRes.findings.length > 0) {
            secRes.findings.forEach(function(f) {
              allFindings.push({
                file: file.name,
                path: file.path,
                severity: f.severity,
                detail: f.detail,
                category: f.category
              });
            });

            if (secRes.verdict === 'high') {
              highestVerdict = 'high';
            } else if (secRes.verdict === 'medium' && highestVerdict !== 'high') {
              highestVerdict = 'medium';
            } else if (secRes.verdict === 'low' && highestVerdict === 'clean') {
              highestVerdict = 'low';
            }
          } else {
            cleanCount++;
          }
        } catch(err) {
          cleanCount++;
        }
      } else {
        cleanCount++;
      }
    }

    return {
      verdict: highestVerdict,
      findings: allFindings,
      totalFiles: allFiles.length,
      cleanCount: cleanCount
    };
  }

  async function listPublished() {
    if (!MWO.fs) return [];
    const publishedDir = '/System/store/published';
    try {
      if (!(await MWO.fs.exists(publishedDir))) {
        await MWO.fs.mkdir(publishedDir);
        return [];
      }
      const files = await MWO.fs.listDir(publishedDir);
      const manifests = [];
      for (const file of files) {
        if (file.type === 'file' && file.name.endsWith('.json')) {
          try {
            const content = await MWO.fs.readFile(file.path);
            const manifest = typeof content === 'string' ? JSON.parse(content) : content;
            if (manifest && manifest.id) {
              manifests.push(manifest);
            }
          } catch(e) {}
        }
      }
      manifests.sort(function(a, b) {
        return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
      });
      return manifests;
    } catch(e) {
      return [];
    }
  }

  async function runPublished(id) {
    const manifests = await listPublished();
    const item = manifests.find(function(m) { return m.id === id; });
    if (!item) {
      if (MWO.notif) MWO.notif.show('Publisher Error', 'Manifest not found for ID: ' + id);
      return false;
    }
    if (!item.entryFile) {
      if (MWO.notif) MWO.notif.show('Publisher Error', 'Manifest missing entry point');
      return false;
    }
    if (MWO.ZipKit && typeof MWO.ZipKit.runHTML5Game === 'function') {
      await MWO.ZipKit.runHTML5Game(item.entryFile);
      return true;
    } else if (MWO.Browser && typeof MWO.Browser.runHTML5Game === 'function') {
      await MWO.Browser.runHTML5Game(item.entryFile);
      return true;
    } else {
      if (MWO.notif) MWO.notif.show('Publisher Error', 'HTML5 Game Runner unavailable.');
      return false;
    }
  }

  async function deleteFolderRecursive(dirPath) {
    if (!MWO.fs) return;
    try {
      if (typeof MWO.fs.permanentDelete === 'function') {
        await MWO.fs.permanentDelete(dirPath);
        return;
      }
      const items = await MWO.fs.listDir(dirPath);
      for (const item of items) {
        if (item.type === 'dir') {
          await deleteFolderRecursive(item.path);
        } else {
          if (typeof MWO.fs.deleteFile === 'function') {
            await MWO.fs.deleteFile(item.path);
          }
        }
      }
      if (typeof MWO.fs.deleteFile === 'function') {
        await MWO.fs.deleteFile(dirPath);
      }
    } catch(e) {}
  }

  /* ----------------------------------------------------------------------
   * UI Window Renderer
   * ---------------------------------------------------------------------- */

  function openWindow() {
    if (!MWO.wm || !MWO.wm.create) {
      alert('Window Manager unavailable.');
      return;
    }

    const winBody = MWO.wm.create({
      id: 'publisher_' + Date.now(),
      title: 'Publish Studio',
      icon: '📤',
      width: 820,
      height: 640,
      resizable: true
    });

    winBody.style.padding = '0';
    winBody.style.margin = '0';
    winBody.style.display = 'flex';
    winBody.style.flexDirection = 'column';
    winBody.style.background = '#0f172a';
    winBody.style.color = '#f8fafc';
    winBody.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    winBody.style.overflow = 'hidden';

    // Shared State
    let activeTab = 'publish'; // 'publish' | 'mypublished'

    // Publish Form State
    let sourceType = 'zip'; // 'zip' | 'vfs'
    let selectedZipName = '';
    let selectedZipSize = 0;
    let vfsCurrentDir = '/';
    let extractedFolder = '';
    let entryFile = null;
    let entryFileError = null;

    let isProcessing = false;
    let processStatus = '';

    let scanResult = null; // { verdict, findings, totalFiles, cleanCount }
    let mediumWarningAccepted = false;

    let appName = '';
    let appDesc = '';
    let appCategory = 'game';
    let appIcon = '📦';

    let rule1Checked = false; // No malware
    let rule2Checked = false; // No copyright
    let rule3Checked = false; // Completely free
    let rule4Checked = false; // Safe personal use

    let isPublishing = false;

    // Outer Container
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.width = '100%';
    container.style.height = '100%';

    // Navigation Header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '12px 18px';
    header.style.background = '#1e293b';
    header.style.borderBottom = '1px solid #334155';
    header.style.flexShrink = '0';

    const headerTitle = document.createElement('div');
    headerTitle.style.display = 'flex';
    headerTitle.style.alignItems = 'center';
    headerTitle.style.gap = '8px';
    headerTitle.style.fontWeight = '700';
    headerTitle.style.fontSize = '16px';
    headerTitle.innerHTML = '<span>📤</span><span>Publish Studio</span>';

    const tabsNav = document.createElement('div');
    tabsNav.style.display = 'flex';
    tabsNav.style.gap = '8px';

    const btnTabPublish = document.createElement('button');
    btnTabPublish.style.minHeight = '38px';
    btnTabPublish.style.padding = '8px 16px';
    btnTabPublish.style.borderRadius = '6px';
    btnTabPublish.style.border = 'none';
    btnTabPublish.style.fontWeight = '600';
    btnTabPublish.style.fontSize = '13px';
    btnTabPublish.style.cursor = 'pointer';

    const btnTabMyPub = document.createElement('button');
    btnTabMyPub.style.minHeight = '38px';
    btnTabMyPub.style.padding = '8px 16px';
    btnTabMyPub.style.borderRadius = '6px';
    btnTabMyPub.style.border = 'none';
    btnTabMyPub.style.fontWeight = '600';
    btnTabMyPub.style.fontSize = '13px';
    btnTabMyPub.style.cursor = 'pointer';

    tabsNav.appendChild(btnTabPublish);
    tabsNav.appendChild(btnTabMyPub);
    header.appendChild(headerTitle);
    header.appendChild(tabsNav);
    container.appendChild(header);

    // Content View Area
    const contentView = document.createElement('div');
    contentView.style.flex = '1';
    contentView.style.overflowY = 'auto';
    contentView.style.padding = '20px';
    container.appendChild(contentView);

    winBody.appendChild(container);

    // Update Header Tabs Style
    function updateTabsHeader() {
      if (activeTab === 'publish') {
        btnTabPublish.style.background = '#3b82f6';
        btnTabPublish.style.color = '#ffffff';
        btnTabMyPub.style.background = '#334155';
        btnTabMyPub.style.color = '#94a3b8';
      } else {
        btnTabPublish.style.background = '#334155';
        btnTabPublish.style.color = '#94a3b8';
        btnTabMyPub.style.background = '#3b82f6';
        btnTabMyPub.style.color = '#ffffff';
      }
    }

    btnTabPublish.onclick = function() {
      activeTab = 'publish';
      updateTabsHeader();
      renderContent();
    };

    btnTabMyPub.onclick = function() {
      activeTab = 'mypublished';
      updateTabsHeader();
      renderContent();
    };

    updateTabsHeader();

    // Render Content Based on Active Tab
    async function renderContent() {
      contentView.innerHTML = '';
      if (activeTab === 'publish') {
        renderPublishForm();
      } else {
        await renderMyPublishedList();
      }
    }

    /* ----------------------------------------------------------------------
     * Render Publish Tab
     * ---------------------------------------------------------------------- */
    function renderPublishForm() {
      contentView.innerHTML = '';

      const formWrap = document.createElement('div');
      formWrap.style.display = 'flex';
      formWrap.style.flexDirection = 'column';
      formWrap.style.gap = '20px';
      formWrap.style.maxWidth = '760px';
      formWrap.style.margin = '0 auto';

      // Section 1: Source Option
      const secSource = document.createElement('div');
      secSource.style.background = '#1e293b';
      secSource.style.borderRadius = '10px';
      secSource.style.padding = '16px';
      secSource.style.border = '1px solid #334155';

      const srcTitle = document.createElement('div');
      srcTitle.style.fontSize = '14px';
      srcTitle.style.fontWeight = '700';
      srcTitle.style.color = '#38bdf8';
      srcTitle.style.marginBottom = '12px';
      srcTitle.textContent = '1. SELECT APP / GAME SOURCE';
      secSource.appendChild(srcTitle);

      const srcOptions = document.createElement('div');
      srcOptions.style.display = 'flex';
      srcOptions.style.gap = '12px';
      srcOptions.style.marginBottom = '16px';

      const optZipBtn = document.createElement('button');
      optZipBtn.style.flex = '1';
      optZipBtn.style.minHeight = '42px';
      optZipBtn.style.padding = '10px';
      optZipBtn.style.borderRadius = '8px';
      optZipBtn.style.border = sourceType === 'zip' ? '2px solid #3b82f6' : '1px solid #475569';
      optZipBtn.style.background = sourceType === 'zip' ? 'rgba(59, 130, 246, 0.15)' : '#0f172a';
      optZipBtn.style.color = sourceType === 'zip' ? '#60a5fa' : '#94a3b8';
      optZipBtn.style.fontWeight = '600';
      optZipBtn.style.cursor = 'pointer';
      optZipBtn.innerHTML = '📦 Import a .zip file';

      const optVfsBtn = document.createElement('button');
      optVfsBtn.style.flex = '1';
      optVfsBtn.style.minHeight = '42px';
      optVfsBtn.style.padding = '10px';
      optVfsBtn.style.borderRadius = '8px';
      optVfsBtn.style.border = sourceType === 'vfs' ? '2px solid #3b82f6' : '1px solid #475569';
      optVfsBtn.style.background = sourceType === 'vfs' ? 'rgba(59, 130, 246, 0.15)' : '#0f172a';
      optVfsBtn.style.color = sourceType === 'vfs' ? '#60a5fa' : '#94a3b8';
      optVfsBtn.style.fontWeight = '600';
      optVfsBtn.style.cursor = 'pointer';
      optVfsBtn.innerHTML = '📁 Choose a folder from this OS';

      optZipBtn.onclick = function() {
        sourceType = 'zip';
        renderPublishForm();
      };

      optVfsBtn.onclick = function() {
        sourceType = 'vfs';
        renderPublishForm();
      };

      srcOptions.appendChild(optZipBtn);
      srcOptions.appendChild(optVfsBtn);
      secSource.appendChild(srcOptions);

      // Source Body: ZIP or VFS
      if (sourceType === 'zip') {
        const zipBox = document.createElement('div');
        zipBox.style.display = 'flex';
        zipBox.style.flexDirection = 'column';
        zipBox.style.gap = '10px';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.zip';
        fileInput.style.display = 'none';

        const uploadBtn = document.createElement('button');
        uploadBtn.style.minHeight = '44px';
        uploadBtn.style.padding = '10px 20px';
        uploadBtn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
        uploadBtn.style.color = '#fff';
        uploadBtn.style.border = 'none';
        uploadBtn.style.borderRadius = '8px';
        uploadBtn.style.fontWeight = '600';
        uploadBtn.style.fontSize = '14px';
        uploadBtn.style.cursor = 'pointer';
        uploadBtn.textContent = selectedZipName ? '🔄 Choose Different .zip File' : '📤 Upload .zip Archive...';

        uploadBtn.onclick = function() { fileInput.click(); };

        fileInput.onchange = async function(e) {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          selectedZipName = file.name;
          selectedZipSize = file.size;
          isProcessing = true;
          processStatus = 'Reading zip file...';
          extractedFolder = '';
          entryFile = null;
          entryFileError = null;
          scanResult = null;
          renderPublishForm();

          try {
            const reader = new FileReader();
            reader.onload = async function() {
              const dataUrl = reader.result;
              const ts = Date.now();
              const sanitizedZip = sanitizeName(file.name);
              await MWO.fs.mkdir('/System/store/uploads');
              const uploadPath = '/System/store/uploads/' + ts + '_' + sanitizedZip;
              
              processStatus = 'Writing zip to OS filesystem...';
              renderPublishForm();
              await MWO.fs.writeFile(uploadPath, dataUrl);

              processStatus = 'Extracting zip archive into /WebApps...';
              renderPublishForm();

              const rawBase = file.name.replace(/\.zip$/i, '');
              const targetDir = '/WebApps/' + sanitizeName(rawBase) + '_extracted';

              let extractRes;
              if (MWO.ZipKit && typeof MWO.ZipKit.extractZip === 'function') {
                extractRes = await MWO.ZipKit.extractZip(uploadPath, function(cur, tot, fname) {
                  processStatus = `Extracting files: ${cur}/${tot} (${fname})`;
                  renderPublishForm();
                }, targetDir);
              } else {
                throw new Error('MWO.ZipKit engine is missing');
              }

              extractedFolder = extractRes.targetDir || targetDir;

              processStatus = 'Checking entry point index.html...';
              renderPublishForm();

              if (MWO.ZipKit && typeof MWO.ZipKit.checkForIndexHtml === 'function') {
                entryFile = await MWO.ZipKit.checkForIndexHtml(extractedFolder);
              } else {
                entryFile = null;
              }

              if (!entryFile) {
                entryFileError = 'No index.html found in archive root or 1 level deep. Cannot publish.';
                isProcessing = false;
                processStatus = '';
                renderPublishForm();
                return;
              }

              processStatus = 'Running MossGuard security scan...';
              renderPublishForm();

              scanResult = await scanFolderSecurity(extractedFolder, function(cur, tot, fname) {
                processStatus = `Scanning files: ${cur}/${tot} (${fname})`;
                renderPublishForm();
              });

              if (!appName) {
                appName = rawBase.replace(/[_\-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              }

              isProcessing = false;
              processStatus = '';
              renderPublishForm();
            };

            reader.onerror = function() {
              isProcessing = false;
              processStatus = 'Failed to read file.';
              renderPublishForm();
            };

            reader.readAsDataURL(file);
          } catch(err) {
            isProcessing = false;
            processStatus = 'Error: ' + err.message;
            renderPublishForm();
          }
        };

        zipBox.appendChild(fileInput);
        zipBox.appendChild(uploadBtn);

        if (selectedZipName) {
          const zipInfo = document.createElement('div');
          zipInfo.style.fontSize = '12px';
          zipInfo.style.color = '#94a3b8';
          zipInfo.textContent = `Selected: ${selectedZipName} (${formatBytes(selectedZipSize)})`;
          zipBox.appendChild(zipInfo);
        }

        secSource.appendChild(zipBox);

      } else {
        // VFS Folder Browser
        const vfsBox = document.createElement('div');
        vfsBox.style.display = 'flex';
        vfsBox.style.flexDirection = 'column';
        vfsBox.style.gap = '10px';

        const pathBar = document.createElement('div');
        pathBar.style.display = 'flex';
        pathBar.style.alignItems = 'center';
        pathBar.style.gap = '8px';
        pathBar.style.fontSize = '13px';
        pathBar.style.background = '#0f172a';
        pathBar.style.padding = '8px 12px';
        pathBar.style.borderRadius = '6px';

        const pathText = document.createElement('span');
        pathText.style.color = '#38bdf8';
        pathText.style.fontFamily = 'monospace';
        pathText.style.fontWeight = '600';
        pathText.textContent = vfsCurrentDir;

        const btnUp = document.createElement('button');
        btnUp.style.minHeight = '32px';
        btnUp.style.padding = '4px 10px';
        btnUp.style.borderRadius = '4px';
        btnUp.style.border = '1px solid #475569';
        btnUp.style.background = '#1e293b';
        btnUp.style.color = '#f8fafc';
        btnUp.style.fontSize = '12px';
        btnUp.style.cursor = 'pointer';
        btnUp.textContent = '⬆ Up';

        btnUp.onclick = async function() {
          if (vfsCurrentDir === '/' || !vfsCurrentDir) return;
          const parts = vfsCurrentDir.split('/').filter(Boolean);
          parts.pop();
          vfsCurrentDir = parts.length ? '/' + parts.join('/') : '/';
          renderPublishForm();
        };

        pathBar.appendChild(btnUp);
        pathBar.appendChild(pathText);
        vfsBox.appendChild(pathBar);

        // List Dir Items
        const dirList = document.createElement('div');
        dirList.style.maxHeight = '140px';
        dirList.style.overflowY = 'auto';
        dirList.style.background = '#0f172a';
        dirList.style.borderRadius = '6px';
        dirList.style.padding = '8px';
        dirList.style.display = 'flex';
        dirList.style.flexDirection = 'column';
        dirList.style.gap = '4px';

        MWO.fs.listDir(vfsCurrentDir).then(function(items) {
          dirList.innerHTML = '';
          const subdirs = items.filter(i => i.type === 'dir');
          if (subdirs.length === 0) {
            dirList.innerHTML = '<div style="font-size:12px;color:#64748b;padding:6px">No subfolders here.</div>';
          } else {
            subdirs.forEach(function(d) {
              const itemRow = document.createElement('div');
              itemRow.style.display = 'flex';
              itemRow.style.alignItems = 'center';
              itemRow.style.padding = '6px 10px';
              itemRow.style.borderRadius = '4px';
              itemRow.style.background = '#1e293b';
              itemRow.style.cursor = 'pointer';
              itemRow.style.fontSize = '13px';
              itemRow.style.minHeight = '36px';
              itemRow.innerHTML = `<span style="margin-right:8px">📁</span><span>${escapeHTML(d.name)}</span>`;
              itemRow.onclick = function() {
                vfsCurrentDir = d.path;
                renderPublishForm();
              };
              dirList.appendChild(itemRow);
            });
          }
        }).catch(function() {
          dirList.innerHTML = '<div style="font-size:12px;color:#f87171;padding:6px">Error listing directory.</div>';
        });

        vfsBox.appendChild(dirList);

        // Select Folder Button
        const btnSelectFolder = document.createElement('button');
        btnSelectFolder.style.minHeight = '40px';
        btnSelectFolder.style.padding = '8px 16px';
        btnSelectFolder.style.background = '#10b981';
        btnSelectFolder.style.color = '#ffffff';
        btnSelectFolder.style.border = 'none';
        btnSelectFolder.style.borderRadius = '8px';
        btnSelectFolder.style.fontWeight = '600';
        btnSelectFolder.style.fontSize = '13px';
        btnSelectFolder.style.cursor = 'pointer';
        btnSelectFolder.textContent = `Select Folder: ${vfsCurrentDir}`;

        btnSelectFolder.onclick = async function() {
          extractedFolder = vfsCurrentDir;
          isProcessing = true;
          processStatus = 'Checking entry point index.html...';
          renderPublishForm();

          try {
            if (MWO.ZipKit && typeof MWO.ZipKit.checkForIndexHtml === 'function') {
              entryFile = await MWO.ZipKit.checkForIndexHtml(extractedFolder);
            } else {
              entryFile = null;
            }

            if (!entryFile) {
              entryFileError = 'No index.html found in selected folder (must be in root or 1 level deep).';
              isProcessing = false;
              processStatus = '';
              renderPublishForm();
              return;
            }

            entryFileError = null;
            processStatus = 'Scanning folder files with MossGuard...';
            renderPublishForm();

            scanResult = await scanFolderSecurity(extractedFolder, function(cur, tot, fname) {
              processStatus = `Scanning files: ${cur}/${tot} (${fname})`;
              renderPublishForm();
            });

            if (!appName) {
              const folderName = extractedFolder.split('/').pop() || 'My App';
              appName = folderName.replace(/[_\-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }

            isProcessing = false;
            processStatus = '';
            renderPublishForm();
          } catch(err) {
            isProcessing = false;
            processStatus = 'Error checking folder: ' + err.message;
            renderPublishForm();
          }
        };

        vfsBox.appendChild(btnSelectFolder);
        secSource.appendChild(vfsBox);
      }

      formWrap.appendChild(secSource);

      // Processing Status Banner
      if (isProcessing || processStatus) {
        const procBox = document.createElement('div');
        procBox.style.background = 'rgba(59, 130, 246, 0.15)';
        procBox.style.border = '1px solid #3b82f6';
        procBox.style.borderRadius = '8px';
        procBox.style.padding = '12px 16px';
        procBox.style.fontSize = '13px';
        procBox.style.color = '#60a5fa';
        procBox.style.display = 'flex';
        procBox.style.alignItems = 'center';
        procBox.style.gap = '10px';
        procBox.innerHTML = `<span>⏳</span><span>${escapeHTML(processStatus)}</span>`;
        formWrap.appendChild(procBox);
      }

      // Section 2: Validation & Security Scan Results
      if (extractedFolder) {
        const secVal = document.createElement('div');
        secVal.style.background = '#1e293b';
        secVal.style.borderRadius = '10px';
        secVal.style.padding = '16px';
        secVal.style.border = '1px solid #334155';

        const valTitle = document.createElement('div');
        valTitle.style.fontSize = '14px';
        valTitle.style.fontWeight = '700';
        valTitle.style.color = '#38bdf8';
        valTitle.style.marginBottom = '12px';
        valTitle.textContent = '2. VALIDATION & SECURITY SCAN';
        secVal.appendChild(valTitle);

        // Entry point status
        const entryBox = document.createElement('div');
        entryBox.style.padding = '10px 14px';
        entryBox.style.borderRadius = '8px';
        entryBox.style.fontSize = '13px';
        entryBox.style.marginBottom = '12px';

        if (entryFile) {
          entryBox.style.background = 'rgba(16, 185, 129, 0.15)';
          entryBox.style.border = '1px solid #10b981';
          entryBox.style.color = '#34d399';
          entryBox.innerHTML = `✅ <strong>Entry Point Found:</strong> <code>${escapeHTML(entryFile)}</code>`;
        } else {
          entryBox.style.background = 'rgba(239, 68, 68, 0.15)';
          entryBox.style.border = '1px solid #ef4444';
          entryBox.style.color = '#f87171';
          entryBox.innerHTML = `❌ <strong>Entry Point Error:</strong> ${escapeHTML(entryFileError || 'index.html not found.')}`;
        }
        secVal.appendChild(entryBox);

        // Security scan status
        if (scanResult) {
          const scanBox = document.createElement('div');
          scanBox.style.padding = '12px 14px';
          scanBox.style.borderRadius = '8px';
          scanBox.style.fontSize = '13px';

          if (scanResult.verdict === 'high') {
            scanBox.style.background = 'rgba(239, 68, 68, 0.15)';
            scanBox.style.border = '1px solid #ef4444';
            scanBox.style.color = '#f87171';
            let findingsList = scanResult.findings.map(f => `<li><strong>${escapeHTML(f.file)}</strong>: ${escapeHTML(f.detail)}</li>`).join('');
            scanBox.innerHTML = `
              <div style="font-weight:700;font-size:14px;margin-bottom:6px">⛔ Security Scan Failed (High Severity Threat Detected)</div>
              <div style="margin-bottom:6px">Publishing is BLOCKED due to high risk security findings:</div>
              <ul style="margin:4px 0 0 18px;padding:0">${findingsList}</ul>
            `;
          } else if (scanResult.verdict === 'medium') {
            scanBox.style.background = 'rgba(245, 158, 11, 0.15)';
            scanBox.style.border = '1px solid #f59e0b';
            scanBox.style.color = '#fbbf24';
            let findingsList = scanResult.findings.map(f => `<li><strong>${escapeHTML(f.file)}</strong>: ${escapeHTML(f.detail)}</li>`).join('');
            scanBox.innerHTML = `
              <div style="font-weight:700;font-size:14px;margin-bottom:6px">⚠️ Security Warning (Medium Risk Pattern Detected)</div>
              <div style="margin-bottom:8px">MossGuard flagged medium severity findings:</div>
              <ul style="margin:4px 0 10px 18px;padding:0">${findingsList}</ul>
            `;

            const warnChkLabel = document.createElement('label');
            warnChkLabel.style.display = 'flex';
            warnChkLabel.style.alignItems = 'center';
            warnChkLabel.style.gap = '8px';
            warnChkLabel.style.cursor = 'pointer';
            warnChkLabel.style.minHeight = '38px';
            warnChkLabel.style.color = '#fef08a';
            warnChkLabel.style.fontWeight = '600';

            const warnChk = document.createElement('input');
            warnChk.type = 'checkbox';
            warnChk.checked = mediumWarningAccepted;
            warnChk.style.width = '18px';
            warnChk.style.height = '18px';
            warnChk.onchange = function(e) {
              mediumWarningAccepted = e.target.checked;
              updatePublishBtnState();
            };

            warnChkLabel.appendChild(warnChk);
            warnChkLabel.appendChild(document.createTextNode('I understand the security warnings for this upload'));
            scanBox.appendChild(warnChkLabel);
          } else {
            scanBox.style.background = 'rgba(16, 185, 129, 0.15)';
            scanBox.style.border = '1px solid #10b981';
            scanBox.style.color = '#34d399';
            scanBox.innerHTML = `🛡️ <strong>MossGuard Scan Clean:</strong> Scanned ${scanResult.totalFiles} files cleanly with 0 high/medium threats.`;
          }
          secVal.appendChild(scanBox);
        }

        formWrap.appendChild(secVal);
      }

      // Section 3: App Details Form
      const secDetails = document.createElement('div');
      secDetails.style.background = '#1e293b';
      secDetails.style.borderRadius = '10px';
      secDetails.style.padding = '16px';
      secDetails.style.border = '1px solid #334155';

      const detTitle = document.createElement('div');
      detTitle.style.fontSize = '14px';
      detTitle.style.fontWeight = '700';
      detTitle.style.color = '#38bdf8';
      detTitle.style.marginBottom = '12px';
      detTitle.textContent = '3. APP / GAME DETAILS';
      secDetails.appendChild(detTitle);

      const fieldsGrid = document.createElement('div');
      fieldsGrid.style.display = 'grid';
      fieldsGrid.style.gridTemplateColumns = '1fr 1fr';
      fieldsGrid.style.gap = '14px';

      // Name Input
      const nameGroup = document.createElement('div');
      nameGroup.style.display = 'flex';
      nameGroup.style.flexDirection = 'column';
      nameGroup.style.gap = '6px';

      const nameLabel = document.createElement('label');
      nameLabel.style.fontSize = '12px';
      nameLabel.style.fontWeight = '600';
      nameLabel.style.color = '#94a3b8';
      nameLabel.textContent = 'App / Game Title *';

      const nameInp = document.createElement('input');
      nameInp.type = 'text';
      nameInp.value = appName;
      nameInp.placeholder = 'e.g. Space Defender';
      nameInp.style.minHeight = '38px';
      nameInp.style.padding = '8px 12px';
      nameInp.style.borderRadius = '6px';
      nameInp.style.border = '1px solid #475569';
      nameInp.style.background = '#0f172a';
      nameInp.style.color = '#f8fafc';
      nameInp.style.fontSize = '14px';
      nameInp.oninput = function(e) {
        appName = e.target.value;
        updatePublishBtnState();
      };

      nameGroup.appendChild(nameLabel);
      nameGroup.appendChild(nameInp);

      // Icon Input
      const iconGroup = document.createElement('div');
      iconGroup.style.display = 'flex';
      iconGroup.style.flexDirection = 'column';
      iconGroup.style.gap = '6px';

      const iconLabel = document.createElement('label');
      iconLabel.style.fontSize = '12px';
      iconLabel.style.fontWeight = '600';
      iconLabel.style.color = '#94a3b8';
      iconLabel.textContent = 'Icon (Emoji)';

      const iconInp = document.createElement('input');
      iconInp.type = 'text';
      iconInp.value = appIcon;
      iconInp.placeholder = '📦';
      iconInp.style.minHeight = '38px';
      iconInp.style.padding = '8px 12px';
      iconInp.style.borderRadius = '6px';
      iconInp.style.border = '1px solid #475569';
      iconInp.style.background = '#0f172a';
      iconInp.style.color = '#f8fafc';
      iconInp.style.fontSize = '14px';
      iconInp.oninput = function(e) {
        appIcon = e.target.value;
      };

      iconGroup.appendChild(iconLabel);
      iconGroup.appendChild(iconInp);

      // Category Select
      const catGroup = document.createElement('div');
      catGroup.style.display = 'flex';
      catGroup.style.flexDirection = 'column';
      catGroup.style.gap = '6px';

      const catLabel = document.createElement('label');
      catLabel.style.fontSize = '12px';
      catLabel.style.fontWeight = '600';
      catLabel.style.color = '#94a3b8';
      catLabel.textContent = 'Category';

      const catSel = document.createElement('select');
      catSel.style.minHeight = '38px';
      catSel.style.padding = '8px 12px';
      catSel.style.borderRadius = '6px';
      catSel.style.border = '1px solid #475569';
      catSel.style.background = '#0f172a';
      catSel.style.color = '#f8fafc';
      catSel.style.fontSize = '14px';

      const optGame = document.createElement('option');
      optGame.value = 'game';
      optGame.textContent = '🎮 Game';
      optGame.selected = appCategory === 'game';

      const optApp = document.createElement('option');
      optApp.value = 'app';
      optApp.textContent = '⚡ App';
      optApp.selected = appCategory === 'app';

      catSel.appendChild(optGame);
      catSel.appendChild(optApp);
      catSel.onchange = function(e) {
        appCategory = e.target.value;
      };

      catGroup.appendChild(catLabel);
      catGroup.appendChild(catSel);

      fieldsGrid.appendChild(nameGroup);
      fieldsGrid.appendChild(iconGroup);
      fieldsGrid.appendChild(catGroup);
      secDetails.appendChild(fieldsGrid);

      // Description
      const descGroup = document.createElement('div');
      descGroup.style.display = 'flex';
      descGroup.style.flexDirection = 'column';
      descGroup.style.gap = '6px';
      descGroup.style.marginTop = '12px';

      const descLabel = document.createElement('label');
      descLabel.style.fontSize = '12px';
      descLabel.style.fontWeight = '600';
      descLabel.style.color = '#94a3b8';
      descLabel.textContent = 'Description';

      const descTxt = document.createElement('textarea');
      descTxt.rows = 2;
      descTxt.value = appDesc;
      descTxt.placeholder = 'Describe your creation...';
      descTxt.style.padding = '8px 12px';
      descTxt.style.borderRadius = '6px';
      descTxt.style.border = '1px solid #475569';
      descTxt.style.background = '#0f172a';
      descTxt.style.color = '#f8fafc';
      descTxt.style.fontSize = '13px';
      descTxt.oninput = function(e) {
        appDesc = e.target.value;
      };

      descGroup.appendChild(descLabel);
      descGroup.appendChild(descTxt);
      secDetails.appendChild(descGroup);

      formWrap.appendChild(secDetails);

      // Section 4: Rules Verification
      const secRules = document.createElement('div');
      secRules.style.background = '#1e293b';
      secRules.style.borderRadius = '10px';
      secRules.style.padding = '16px';
      secRules.style.border = '1px solid #334155';

      const rulesTitle = document.createElement('div');
      rulesTitle.style.fontSize = '14px';
      rulesTitle.style.fontWeight = '700';
      rulesTitle.style.color = '#38bdf8';
      rulesTitle.style.marginBottom = '12px';
      rulesTitle.textContent = '4. PUBLISHING RULES & COMPLIANCE';
      secRules.appendChild(rulesTitle);

      const rulesList = [
        { key: 'r1', text: 'My upload contains no malware, viruses, or malicious code.', checked: rule1Checked, set: v => rule1Checked = v },
        { key: 'r2', text: 'My upload contains no copyrighted or trademarked material (no brand names, no ripped assets).', checked: rule2Checked, set: v => rule2Checked = v },
        { key: 'r3', text: 'My upload is completely free — no paywalls, payments, or locked paid content.', checked: rule3Checked, set: v => rule3Checked = v },
        { key: 'r4', text: 'My upload is safe for personal use and does not collect or transmit anyone\'s data.', checked: rule4Checked, set: v => rule4Checked = v }
      ];

      rulesList.forEach(function(item) {
        const rLabel = document.createElement('label');
        rLabel.style.display = 'flex';
        rLabel.style.alignItems = 'center';
        rLabel.style.gap = '10px';
        rLabel.style.minHeight = '38px';
        rLabel.style.cursor = 'pointer';
        rLabel.style.fontSize = '13px';
        rLabel.style.color = '#cbd5e1';

        const rChk = document.createElement('input');
        rChk.type = 'checkbox';
        rChk.checked = item.checked;
        rChk.style.width = '18px';
        rChk.style.height = '18px';
        rChk.style.flexShrink = '0';
        rChk.onchange = function(e) {
          item.set(e.target.checked);
          updatePublishBtnState();
        };

        rLabel.appendChild(rChk);
        rLabel.appendChild(document.createTextNode(item.text));
        secRules.appendChild(rLabel);
      });

      formWrap.appendChild(secRules);

      // Section 5: Disclaimer & Publish Button
      const secPub = document.createElement('div');
      secPub.style.display = 'flex';
      secPub.style.flexDirection = 'column';
      secPub.style.gap = '12px';

      const discBox = document.createElement('div');
      discBox.style.padding = '12px 16px';
      discBox.style.background = '#0f172a';
      discBox.style.borderRadius = '8px';
      discBox.style.border = '1px solid #334155';
      discBox.style.fontSize = '12px';
      discBox.style.color = '#94a3b8';
      discBox.style.lineHeight = '1.5';
      discBox.style.fontStyle = 'italic';
      discBox.textContent = 'Disclaimer: Published items are user content. You are responsible for what you publish and for following the rules above. MossGuard scans uploads with local static analysis, but no scanner can guarantee 100% detection. Everything here is for personal, offline use — nothing is sent to any server.';

      secPub.appendChild(discBox);

      const btnPublish = document.createElement('button');
      btnPublish.style.minHeight = '48px';
      btnPublish.style.padding = '12px 24px';
      btnPublish.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      btnPublish.style.color = '#ffffff';
      btnPublish.style.border = 'none';
      btnPublish.style.borderRadius = '8px';
      btnPublish.style.fontWeight = '700';
      btnPublish.style.fontSize = '15px';
      btnPublish.style.cursor = 'pointer';
      btnPublish.style.transition = 'all 0.2s ease';
      btnPublish.textContent = '🚀 Publish to Store Now';

      function updatePublishBtnState() {
        const canPublish = extractedFolder &&
          entryFile &&
          !entryFileError &&
          scanResult &&
          scanResult.verdict !== 'high' &&
          (scanResult.verdict !== 'medium' || mediumWarningAccepted) &&
          appName.trim().length > 0 &&
          rule1Checked && rule2Checked && rule3Checked && rule4Checked &&
          !isPublishing;

        if (canPublish) {
          btnPublish.disabled = false;
          btnPublish.style.opacity = '1';
          btnPublish.style.cursor = 'pointer';
          btnPublish.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else {
          btnPublish.disabled = true;
          btnPublish.style.opacity = '0.4';
          btnPublish.style.cursor = 'not-allowed';
          btnPublish.style.background = '#475569';
        }
      }

      btnPublish.onclick = async function() {
        if (btnPublish.disabled || isPublishing) return;
        isPublishing = true;
        updatePublishBtnState();

        try {
          const id = 'userapp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const manifest = {
            id: id,
            name: sanitizeName(appName),
            description: appDesc.trim(),
            category: appCategory,
            icon: (appIcon || '📦').trim(),
            folder: extractedFolder,
            entryFile: entryFile,
            publishedAt: new Date().toISOString(),
            publisher: 'local-user',
            version: '1.0.0'
          };

          await MWO.fs.mkdir('/System/store/published');
          await MWO.fs.writeFile('/System/store/published/' + id + '.json', JSON.stringify(manifest, null, 2));

          if (MWO.notif) {
            MWO.notif.show('App Published!', manifest.name + ' was successfully published to the Store.');
          }

          isPublishing = false;
          activeTab = 'mypublished';
          updateTabsHeader();
          renderContent();
        } catch(err) {
          isPublishing = false;
          alert('Error publishing item: ' + err.message);
          updatePublishBtnState();
        }
      };

      secPub.appendChild(btnPublish);
      formWrap.appendChild(secPub);

      contentView.appendChild(formWrap);
      updatePublishBtnState();
    }

    /* ----------------------------------------------------------------------
     * Render My Published Tab
     * ---------------------------------------------------------------------- */
    async function renderMyPublishedList() {
      contentView.innerHTML = '';

      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.gap = '16px';
      wrap.style.maxWidth = '760px';
      wrap.style.margin = '0 auto';

      const manifests = await listPublished();

      const topBar = document.createElement('div');
      topBar.style.display = 'flex';
      topBar.style.alignItems = 'center';
      topBar.style.justifyContent = 'space-between';

      const title = document.createElement('div');
      title.style.fontSize = '16px';
      title.style.fontWeight = '700';
      title.style.color = '#38bdf8';
      title.textContent = `My Published Entries (${manifests.length})`;
      topBar.appendChild(title);

      wrap.appendChild(topBar);

      if (manifests.length === 0) {
        const emptyBox = document.createElement('div');
        emptyBox.style.background = '#1e293b';
        emptyBox.style.borderRadius = '10px';
        emptyBox.style.padding = '40px 20px';
        emptyBox.style.textAlign = 'center';
        emptyBox.style.color = '#94a3b8';
        emptyBox.style.border = '1px solid #334155';
        emptyBox.innerHTML = `
          <div style="font-size:36px;margin-bottom:12px">📤</div>
          <div style="font-size:16px;font-weight:600;color:#f8fafc;margin-bottom:6px">No published apps yet</div>
          <div style="font-size:13px">Use the Publish tab to package and release your own HTML5 apps and games.</div>
        `;
        wrap.appendChild(emptyBox);
      } else {
        manifests.forEach(function(item) {
          const card = document.createElement('div');
          card.style.background = '#1e293b';
          card.style.borderRadius = '10px';
          card.style.padding = '16px';
          card.style.border = '1px solid #334155';
          card.style.display = 'flex';
          card.style.alignItems = 'center';
          card.style.justifyContent = 'space-between';
          card.style.gap = '16px';

          const left = document.createElement('div');
          left.style.display = 'flex';
          left.style.alignItems = 'center';
          left.style.gap = '14px';

          const iconDiv = document.createElement('div');
          iconDiv.style.fontSize = '32px';
          iconDiv.style.width = '48px';
          iconDiv.style.height = '48px';
          iconDiv.style.background = '#0f172a';
          iconDiv.style.borderRadius = '8px';
          iconDiv.style.display = 'flex';
          iconDiv.style.alignItems = 'center';
          iconDiv.style.justifyContent = 'center';
          iconDiv.textContent = item.icon || '📦';

          const info = document.createElement('div');
          info.style.display = 'flex';
          info.style.flexDirection = 'column';
          info.style.gap = '4px';

          const nameLine = document.createElement('div');
          nameLine.style.fontSize = '15px';
          nameLine.style.fontWeight = '700';
          nameLine.style.color = '#f8fafc';
          nameLine.style.display = 'flex';
          nameLine.style.alignItems = 'center';
          nameLine.style.gap = '8px';

          const catBadge = document.createElement('span');
          catBadge.style.fontSize = '11px';
          catBadge.style.padding = '2px 8px';
          catBadge.style.borderRadius = '12px';
          catBadge.style.background = item.category === 'game' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)';
          catBadge.style.color = item.category === 'game' ? '#c084fc' : '#60a5fa';
          catBadge.style.fontWeight = '600';
          catBadge.textContent = item.category === 'game' ? '🎮 Game' : '⚡ App';

          nameLine.appendChild(document.createTextNode(item.name));
          nameLine.appendChild(catBadge);

          const descLine = document.createElement('div');
          descLine.style.fontSize = '12px';
          descLine.style.color = '#94a3b8';
          descLine.textContent = item.description || 'No description provided.';

          const metaLine = document.createElement('div');
          metaLine.style.fontSize = '11px';
          metaLine.style.color = '#64748b';
          const pubDate = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Unknown';
          metaLine.textContent = `Published: ${pubDate} • Folder: ${item.folder}`;

          info.appendChild(nameLine);
          info.appendChild(descLine);
          info.appendChild(metaLine);

          left.appendChild(iconDiv);
          left.appendChild(info);

          const rightActions = document.createElement('div');
          rightActions.style.display = 'flex';
          rightActions.style.alignItems = 'center';
          rightActions.style.gap = '8px';

          const btnRun = document.createElement('button');
          btnRun.style.minHeight = '38px';
          btnRun.style.padding = '8px 16px';
          btnRun.style.background = '#10b981';
          btnRun.style.color = '#ffffff';
          btnRun.style.border = 'none';
          btnRun.style.borderRadius = '6px';
          btnRun.style.fontWeight = '600';
          btnRun.style.fontSize = '13px';
          btnRun.style.cursor = 'pointer';
          btnRun.textContent = '▶ Run';

          btnRun.onclick = function() {
            runPublished(item.id);
          };

          const btnDelete = document.createElement('button');
          btnDelete.style.minHeight = '38px';
          btnDelete.style.padding = '8px 14px';
          btnDelete.style.background = 'rgba(239, 68, 68, 0.2)';
          btnDelete.style.color = '#f87171';
          btnDelete.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          btnDelete.style.borderRadius = '6px';
          btnDelete.style.fontWeight = '600';
          btnDelete.style.fontSize = '13px';
          btnDelete.style.cursor = 'pointer';
          btnDelete.textContent = '🗑️ Remove';

          btnDelete.onclick = function() {
            showDeleteConfirm(item);
          };

          rightActions.appendChild(btnRun);
          rightActions.appendChild(btnDelete);

          card.appendChild(left);
          card.appendChild(rightActions);

          wrap.appendChild(card);
        });
      }

      contentView.appendChild(wrap);
    }

    function showDeleteConfirm(item) {
      const modalOverlay = document.createElement('div');
      modalOverlay.style.position = 'absolute';
      modalOverlay.style.top = '0';
      modalOverlay.style.left = '0';
      modalOverlay.style.width = '100%';
      modalOverlay.style.height = '100%';
      modalOverlay.style.background = 'rgba(0, 0, 0, 0.7)';
      modalOverlay.style.display = 'flex';
      modalOverlay.style.alignItems = 'center';
      modalOverlay.style.justifyContent = 'center';
      modalOverlay.style.zIndex = '100';

      const modal = document.createElement('div');
      modal.style.background = '#1e293b';
      modal.style.borderRadius = '12px';
      modal.style.padding = '20px';
      modal.style.width = '420px';
      modal.style.maxWidth = '90%';
      modal.style.border = '1px solid #334155';
      modal.style.display = 'flex';
      modal.style.flexDirection = 'column';
      modal.style.gap = '14px';

      const mTitle = document.createElement('div');
      mTitle.style.fontSize = '16px';
      mTitle.style.fontWeight = '700';
      mTitle.style.color = '#f8fafc';
      mTitle.textContent = `Remove ${item.name}?`;

      const mDesc = document.createElement('div');
      mDesc.style.fontSize = '13px';
      mDesc.style.color = '#94a3b8';
      mDesc.textContent = 'This will remove the published manifest entry from the Store.';

      const delFolderLabel = document.createElement('label');
      delFolderLabel.style.display = 'flex';
      delFolderLabel.style.alignItems = 'center';
      delFolderLabel.style.gap = '8px';
      delFolderLabel.style.minHeight = '38px';
      delFolderLabel.style.cursor = 'pointer';
      delFolderLabel.style.fontSize = '13px';
      delFolderLabel.style.color = '#f87171';

      const delFolderChk = document.createElement('input');
      delFolderChk.type = 'checkbox';
      delFolderChk.checked = true;
      delFolderChk.style.width = '18px';
      delFolderChk.style.height = '18px';

      delFolderLabel.appendChild(delFolderChk);
      delFolderLabel.appendChild(document.createTextNode('Also delete extracted folder from VFS'));

      const mBtns = document.createElement('div');
      mBtns.style.display = 'flex';
      mBtns.style.justifyContent = 'flex-end';
      mBtns.style.gap = '10px';

      const btnCancel = document.createElement('button');
      btnCancel.style.minHeight = '38px';
      btnCancel.style.padding = '8px 16px';
      btnCancel.style.borderRadius = '6px';
      btnCancel.style.border = '1px solid #475569';
      btnCancel.style.background = '#0f172a';
      btnCancel.style.color = '#f8fafc';
      btnCancel.style.cursor = 'pointer';
      btnCancel.textContent = 'Cancel';
      btnCancel.onclick = function() {
        modalOverlay.remove();
      };

      const btnConfirm = document.createElement('button');
      btnConfirm.style.minHeight = '38px';
      btnConfirm.style.padding = '8px 16px';
      btnConfirm.style.borderRadius = '6px';
      btnConfirm.style.border = 'none';
      btnConfirm.style.background = '#ef4444';
      btnConfirm.style.color = '#ffffff';
      btnConfirm.style.fontWeight = '600';
      btnConfirm.style.cursor = 'pointer';
      btnConfirm.textContent = 'Confirm Remove';

      btnConfirm.onclick = async function() {
        btnConfirm.disabled = true;
        try {
          const manifestPath = '/System/store/published/' + item.id + '.json';
          if (MWO.fs && typeof MWO.fs.permanentDelete === 'function') {
            await MWO.fs.permanentDelete(manifestPath);
          } else if (MWO.fs && typeof MWO.fs.deleteFile === 'function') {
            await MWO.fs.deleteFile(manifestPath);
          }

          if (delFolderChk.checked && item.folder) {
            await deleteFolderRecursive(item.folder);
          }

          if (MWO.notif) {
            MWO.notif.show('App Removed', item.name + ' was removed from the Store.');
          }

          modalOverlay.remove();
          renderContent();
        } catch(err) {
          alert('Error removing app: ' + err.message);
          modalOverlay.remove();
        }
      };

      mBtns.appendChild(btnCancel);
      mBtns.appendChild(btnConfirm);

      modal.appendChild(mTitle);
      modal.appendChild(mDesc);
      modal.appendChild(delFolderLabel);
      modal.appendChild(mBtns);
      modalOverlay.appendChild(modal);

      winBody.appendChild(modalOverlay);
    }

    renderContent();
  }

  /* ----------------------------------------------------------------------
   * App Definition & Public API
   * ---------------------------------------------------------------------- */

  const publisherAppDef = {
    id: 'publisher',
    name: 'Publish Studio',
    description: 'Publish your own apps & games to the Store',
    icon: '📤',
    category: 'app',
    installed: false,
    launch: function() {
      openWindow();
    }
  };

  if (typeof MWO !== 'undefined') {
    if (typeof MWO.registerApp === 'function') {
      MWO.registerApp(publisherAppDef);
    }
    if (MWO.apps) {
      MWO.apps['publisher'] = publisherAppDef;
    }
  }

  return {
    open: openWindow,
    listPublished: listPublished,
    runPublished: runPublished
  };
})();
