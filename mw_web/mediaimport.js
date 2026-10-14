/* ========================================================================
 * MossyWoss OS — Media Import & Drag-Drop File Manager Upgrade
 * File: mw_web/mediaimport.js
 * Modern OS style Drag & Drop file import, routing, and VFS file management.
 * ======================================================================== */

var MWO = MWO || {};

MWO.MediaImport = (function() {
  'use strict';

  // Identify category folder from filename and MIME type
  function getCategoryFolder(file) {
    const name = file.name.toLowerCase();
    const type = file.type || '';

    if (type.startsWith('image/') || name.match(/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i)) {
      return '/Pictures';
    }
    if (type.startsWith('video/') || name.match(/\.(mp4|webm|mkv|avi|mov|wmv|flv)$/i)) {
      return '/Videos';
    }
    if (type.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|flac|m4a|aac|wma)$/i)) {
      return '/Music';
    }
    if (type.startsWith('text/') || type.includes('json') || type.includes('javascript') ||
        name.match(/\.(txt|md|js|html?|css|json|py|csv|xml|c|cpp|h|java|php)$/i)) {
      return '/Documents';
    }
    return '/Downloads';
  }

  // Read a single File object using FileReader
  function readFileData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const isText = file.type.startsWith('text/') ||
                     file.type.includes('json') ||
                     file.type.includes('javascript') ||
                     file.name.match(/\.(txt|md|js|html?|css|json|py|csv|xml)$/i);

      reader.onload = () => resolve({ content: reader.result, isText });
      reader.onerror = (err) => reject(err);

      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  }

  // Import an array of File objects into VFS
  async function importFiles(files, targetFolderOverride = null) {
    if (!files || files.length === 0) return 0;

    let importedCount = 0;
    for (const file of files) {
      try {
        const folder = targetFolderOverride || getCategoryFolder(file);
        const fileData = await readFileData(file);

        await MWO.fs.mkdir(folder);
        const cleanName = file.name.replace(/[^a-zA-Z0-9_.\-\s]/g, '_');
        const destPath = folder === '/' ? '/' + cleanName : folder + '/' + cleanName;

        await MWO.fs.writeFile(destPath, fileData.content);
        importedCount++;
      } catch (err) {
        console.error('Failed to import file:', file.name, err);
      }
    }

    if (importedCount > 0 && MWO.notif && MWO.notif.show) {
      MWO.notif.show('Files', `Imported ${importedCount} file(s) into MossyWoss OS`);
    }

    refreshOpenFilesWindows();
    return importedCount;
  }

  // Trigger refresh on active Files app windows
  function refreshOpenFilesWindows() {
    const windows = document.querySelectorAll('#desktop .window');
    windows.forEach(win => {
      if (win.id.startsWith('files-') || (win.querySelector('.w-title') && win.querySelector('.w-title').textContent.trim() === 'Files')) {
        const sideActive = win.querySelector('.fm-side.active') || win.querySelector('.fm-side');
        if (sideActive) {
          sideActive.click();
        } else {
          const pathInput = win.querySelector('#fm-path');
          if (pathInput) pathInput.dispatchEvent(new Event('change'));
        }
      }
    });
  }

  // Open file picker dialog
  function pick(targetFolder = null) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '*/*';
    input.style.display = 'none';

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length > 0) {
        await importFiles(files, targetFolder);
      }
      if (input.parentNode) input.parentNode.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  }

  // Create drop overlay indicator
  function showDropOverlay() {
    let overlay = document.getElementById('mwo-global-drop-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'mwo-global-drop-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 200, 120, 0.18);
        border: 4px dashed #00ff88;
        box-shadow: inset 0 0 30px rgba(0,255,136,0.3);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        backdrop-filter: blur(4px);
        transition: opacity 0.2s ease;
      `;
      overlay.innerHTML = `
        <div style="font-size:4.5em;margin-bottom:12px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.4))">In</div>
        <div style="font-size:1.6em;font-weight:bold;color:#ffffff;text-shadow:0 2px 10px rgba(0,0,0,0.8);font-family:system-ui,sans-serif">Drop files to import into MossyWoss OS</div>
 <div style="font-size:0.95em;color:#d0f8e0;margin-top:8px;text-shadow:0 1px 4px rgba(0,0,0,0.8);font-family:system-ui,sans-serif">Photos /Pictures | Videos /Videos | Music /Music | Documents /Documents</div>
      `;
      document.body.appendChild(overlay);
    }
    overlay.style.opacity = '1';
    overlay.style.display = 'flex';
  }

  function hideDropOverlay() {
    const overlay = document.getElementById('mwo-global-drop-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.display = 'none';
    }
  }

  // Attach global desktop drop handlers
  function initGlobalDesktopDrop() {
    let dragCounter = 0;

    document.addEventListener('dragenter', (e) => {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounter++;
        showDropOverlay();
      }
    }, false);

    document.addEventListener('dragover', (e) => {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    }, false);

    document.addEventListener('dragleave', (e) => {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounter--;
        if (dragCounter <= 0) {
          dragCounter = 0;
          hideDropOverlay();
        }
      }
    }, false);

    document.addEventListener('drop', async (e) => {
      dragCounter = 0;
      hideDropOverlay();

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        await importFiles(files);
      }
    }, false);
  }

  // Upgrade Files app windows with drag-drop and import capabilities
  function enhanceFiles(winBody) {
    if (!winBody) return;

    const pathInput = winBody.querySelector('#fm-path');
    const grid = winBody.querySelector('#fm-grid');
    const toolbar = pathInput ? pathInput.parentNode : null;

    if (!toolbar) return;

    // 1. Inject Import Button in toolbar if missing
    if (!winBody.querySelector('.mw-import-btn')) {
      const importBtn = document.createElement('button');
      importBtn.className = 'mw-btn primary mw-import-btn';
      importBtn.style.cssText = 'padding:4px 10px;font-size:0.85em;background:#00b894;color:#fff;border:none;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:4px';
      importBtn.innerHTML = 'In Import';

      importBtn.onclick = () => {
        const currentFolder = pathInput ? pathInput.value : '/Documents';
        pick(currentFolder);
      };

      toolbar.appendChild(importBtn);
    }

    // 2. Enhance Sidebar & Grid items
    const sideItems = winBody.querySelectorAll('.fm-side');
    sideItems.forEach(side => {
      const folderPath = side.getAttribute('data-p');
      if (!folderPath) return;

      side.ondragover = (e) => {
        e.preventDefault();
        side.style.outline = '2px dashed #00ff88';
        side.style.background = 'rgba(0,255,136,0.2)';
      };

      side.ondragleave = () => {
        side.style.outline = '';
        side.style.background = '';
      };

      side.ondrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        side.style.outline = '';
        side.style.background = '';

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await importFiles(Array.from(e.dataTransfer.files), folderPath);
        } else {
          const rawData = e.dataTransfer.getData('application/json');
          if (rawData) {
            try {
              const info = JSON.parse(rawData);
              if (info.type === 'mwo-file' && info.srcPath) {
                const srcPath = info.srcPath;
                const fileName = srcPath.split('/').pop();
                const destPath = folderPath === '/' ? '/' + fileName : folderPath + '/' + fileName;

                if (srcPath !== destPath) {
                  const content = await MWO.fs.readFile(srcPath);
                  await MWO.fs.writeFile(destPath, content);
                  await MWO.fs.deleteFile(srcPath);
                  MWO.notif.show('Files', `Moved ${fileName} to ${folderPath}`);
                  refreshOpenFilesWindows();
                }
              }
            } catch (err) {}
          }
        }
      };
    });

    // 3. Make Grid files/folders draggable and drop targets
    if (grid) {
      grid.ondragover = (e) => {
        e.preventDefault();
        grid.style.outline = '2px dashed #00ff88';
        grid.style.outlineOffset = '-4px';
      };

      grid.ondragleave = (e) => {
        if (e.target === grid) {
          grid.style.outline = '';
        }
      };

      grid.ondrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        grid.style.outline = '';

        const currentFolder = pathInput ? pathInput.value : '/Documents';

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await importFiles(Array.from(e.dataTransfer.files), currentFolder);
        } else {
          const rawData = e.dataTransfer.getData('application/json');
          if (rawData) {
            try {
              const info = JSON.parse(rawData);
              if (info.type === 'mwo-file' && info.srcPath) {
                const srcPath = info.srcPath;
                const fileName = srcPath.split('/').pop();
                const destPath = currentFolder === '/' ? '/' + fileName : currentFolder + '/' + fileName;

                if (srcPath !== destPath) {
                  const content = await MWO.fs.readFile(srcPath);
                  await MWO.fs.writeFile(destPath, content);
                  await MWO.fs.deleteFile(srcPath);
                  MWO.notif.show('Files', `Moved ${fileName} to ${currentFolder}`);
                  refreshOpenFilesWindows();
                }
              }
            } catch (err) {}
          }
        }
      };

      // Set draggable on individual grid items
      const items = grid.children;
      Array.from(items).forEach(child => {
        const titleDiv = child.querySelector('div:last-child');
        const fileName = titleDiv ? titleDiv.textContent.trim() : '';
        const currentFolder = pathInput ? pathInput.value : '/Documents';
        if (!fileName) return;

        const filePath = currentFolder === '/' ? '/' + fileName : currentFolder + '/' + fileName;
        child.draggable = true;

        child.ondragstart = (e) => {
          e.stopPropagation();
          e.dataTransfer.setData('text/plain', filePath);
          e.dataTransfer.setData('application/json', JSON.stringify({ type: 'mwo-file', srcPath: filePath }));
          child.style.opacity = '0.5';
        };

        child.ondragend = () => {
          child.style.opacity = '1';
        };
      });
    }
  }

  // Hook Files App using MutationObserver
  function hookFilesApp() {
    initGlobalDesktopDrop();

    const desktop = document.getElementById('desktop') || document.body;
    const observer = new MutationObserver(() => {
      const windows = desktop.querySelectorAll('.window');
      windows.forEach(win => {
        const titleEl = win.querySelector('.w-title');
        if (titleEl && titleEl.textContent.trim() === 'Files') {
          const body = win.querySelector('.w-body');
          if (body) enhanceFiles(body);
        }
      });
    });

    observer.observe(desktop, { childList: true, subtree: true });
  }

  // Auto-init on boot/script load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(hookFilesApp, 500);
  } else {
    document.addEventListener('DOMContentLoaded', hookFilesApp);
  }

  // Register app in store
  if (window.MWO && MWO.registerApp) {
    MWO.registerApp({
      id: 'importer',
      name: 'Import Files',
      description: 'Import photos, videos, music & documents',
      icon: 'import-files',
      category: 'app',
      installed: true,
      launch: function() { pick(); }
    });
  }

  return {
    pick: pick,
    importFiles: importFiles,
    enhanceFiles: enhanceFiles,
    hookFilesApp: hookFilesApp
  };
})();
