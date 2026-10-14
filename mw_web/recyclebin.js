/* ========================================================================
 * MossyWoss OS — Recycle Bin Subsystem & App (mw_web/recyclebin.js)
 * ======================================================================== */

var MWO = MWO || {};

(function(MWO) {
  'use strict';

  function formatSize(bytes) {
    if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function getFileIcon(name, type) {
    if (type === 'dir') return 'Dir';
    const ext = (name || '').split('.').pop().toLowerCase();
    switch (ext) {
      case 'txt': case 'md': case 'log': return 'Doc';
 case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': return '';
      case 'mp3': case 'wav': case 'ogg': case 'flac': return '~';
 case 'mp4': case 'webm': case 'mkv': case 'avi': return '';
 case 'js': case 'html': case 'css': case 'json': case 'py': return '';
      case 'zip': case 'rar': case 'tar': case 'gz': return 'Box';
 case 'pdf': return '';
      default: return 'Doc';
    }
  }

  MWO.Bin = {
    async items() {
      const files = await MWO.db.getAll('files', 'mwo-filesystem');
      return (files || [])
        .filter(item => item && (item.trashed === true || (item.path && item.path.startsWith('/RecycleBin/'))))
        .sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
    },

    async restore(record) {
      if (!record) return false;
      if (typeof record === 'string') {
        record = await MWO.db.get('files', record, 'mwo-filesystem');
      }
      if (!record || !record.originalPath) return false;

      const originalPath = record.originalPath;
      const parent = originalPath.substring(0, originalPath.lastIndexOf('/')) || '/';

      if (parent !== '/' && !(await MWO.fs.exists(parent))) {
        const parts = parent.split('/').filter(Boolean);
        let curr = '';
        for (const p of parts) {
          curr += '/' + p;
          if (!(await MWO.fs.exists(curr))) {
            await MWO.fs.mkdir(curr);
          }
        }
      }

      await MWO.fs.writeFile(originalPath, record.content !== undefined ? record.content : '');
      await MWO.db.delete('files', record.path, 'mwo-filesystem');
      return true;
    },

    async deleteForever(record) {
      if (!record) return false;
      const pathKey = typeof record === 'string' ? record : record.path;
      if (!pathKey) return false;
      return await MWO.db.delete('files', pathKey, 'mwo-filesystem');
    },

    async empty() {
      const list = await this.items();
      for (const item of list) {
        await MWO.db.delete('files', item.path, 'mwo-filesystem');
      }
      return true;
    },

    async restoreAll() {
      const list = await this.items();
      for (const item of list) {
        await this.restore(item);
      }
      return true;
    },

    openWindow() {
      const winBody = MWO.wm.create({
        id: 'bin-' + Date.now(),
        title: 'Recycle Bin',
        icon: 'recycle-bin',
        width: 650,
        height: 480,
        resizable: true
      });

      if (!winBody) return;

      winBody.style.display = 'flex';
      winBody.style.flexDirection = 'column';
      winBody.style.height = '100%';
      winBody.style.background = 'var(--bg1, #1e1e2e)';
      winBody.style.color = 'var(--text1, #cdd6f4)';
      winBody.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      winBody.style.userSelect = 'none';

      const toolbar = document.createElement('div');
      toolbar.style.display = 'flex';
      toolbar.style.justifyContent = 'space-between';
      toolbar.style.alignItems = 'center';
      toolbar.style.padding = '10px 14px';
      toolbar.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
      toolbar.style.background = 'rgba(0,0,0,0.2)';
      toolbar.style.flexWrap = 'wrap';
      toolbar.style.gap = '8px';

      const statsEl = document.createElement('div');
      statsEl.style.fontSize = '0.9em';
      statsEl.style.color = 'var(--text2, #a6adc8)';
      statsEl.style.fontWeight = '500';

      const btnGroup = document.createElement('div');
      btnGroup.style.display = 'flex';
      btnGroup.style.gap = '8px';

      const restoreAllBtn = document.createElement('button');
 restoreAllBtn.textContent = ' Restore All';
      restoreAllBtn.className = 'btn';
      restoreAllBtn.style.padding = '6px 12px';
      restoreAllBtn.style.borderRadius = '6px';
      restoreAllBtn.style.border = 'none';
      restoreAllBtn.style.background = 'var(--accent, #89b4fa)';
      restoreAllBtn.style.color = '#fff';
      restoreAllBtn.style.cursor = 'pointer';
      restoreAllBtn.style.fontSize = '0.85em';
      restoreAllBtn.style.fontWeight = '600';

      const emptyBtn = document.createElement('button');
 emptyBtn.textContent = ' Empty Bin';
      emptyBtn.className = 'btn';
      emptyBtn.style.padding = '6px 12px';
      emptyBtn.style.borderRadius = '6px';
      emptyBtn.style.border = 'none';
      emptyBtn.style.background = '#f38ba8';
      emptyBtn.style.color = '#fff';
      emptyBtn.style.cursor = 'pointer';
      emptyBtn.style.fontSize = '0.85em';
      emptyBtn.style.fontWeight = '600';

      const refreshBtn = document.createElement('button');
 refreshBtn.textContent = ' Refresh';
      refreshBtn.className = 'btn';
      refreshBtn.style.padding = '6px 12px';
      refreshBtn.style.borderRadius = '6px';
      refreshBtn.style.border = '1px solid rgba(255,255,255,0.2)';
      refreshBtn.style.background = 'transparent';
      refreshBtn.style.color = '#fff';
      refreshBtn.style.cursor = 'pointer';
      refreshBtn.style.fontSize = '0.85em';

      btnGroup.appendChild(restoreAllBtn);
      btnGroup.appendChild(emptyBtn);
      btnGroup.appendChild(refreshBtn);

      toolbar.appendChild(statsEl);
      toolbar.appendChild(btnGroup);
      winBody.appendChild(toolbar);

      const contentArea = document.createElement('div');
      contentArea.style.flex = '1';
      contentArea.style.overflowY = 'auto';
      contentArea.style.padding = '12px';
      winBody.appendChild(contentArea);

      const renderList = async () => {
        const list = await MWO.Bin.items();
        contentArea.innerHTML = '';

        const totalBytes = list.reduce((sum, item) => sum + (item.size || (item.content ? item.content.length : 0)), 0);
        statsEl.textContent = `${list.length} item${list.length === 1 ? '' : 's'} (${formatSize(totalBytes)})`;

        if (list.length === 0) {
          const emptyMsg = document.createElement('div');
          emptyMsg.style.display = 'flex';
          emptyMsg.style.flexDirection = 'column';
          emptyMsg.style.alignItems = 'center';
          emptyMsg.style.justifyContent = 'center';
          emptyMsg.style.height = '100%';
          emptyMsg.style.color = 'var(--text2, #a6adc8)';
          emptyMsg.style.fontSize = '1.1em';
          emptyMsg.style.gap = '10px';
 emptyMsg.innerHTML = '<div style="font-size:3em;"></div><div>Recycle Bin is empty</div>';
          contentArea.appendChild(emptyMsg);
          return;
        }

        const table = document.createElement('div');
        table.style.display = 'flex';
        table.style.flexDirection = 'column';
        table.style.gap = '6px';

        list.forEach(item => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.padding = '8px 12px';
          row.style.borderRadius = '8px';
          row.style.background = 'rgba(255,255,255,0.05)';
          row.style.gap = '12px';
          row.style.flexWrap = 'wrap';

          const icon = document.createElement('div');
          icon.style.fontSize = '1.5em';
          icon.textContent = getFileIcon(item.trashName || item.name, item.type);

          const meta = document.createElement('div');
          meta.style.flex = '1';
          meta.style.minWidth = '160px';

          const nameEl = document.createElement('div');
          nameEl.style.fontWeight = 'bold';
          nameEl.style.fontSize = '0.95em';
          nameEl.textContent = item.trashName || item.name || 'Untitled';

          const pathEl = document.createElement('div');
          pathEl.style.fontSize = '0.78em';
          pathEl.style.color = 'var(--text2, #a6adc8)';
          pathEl.textContent = `Original: ${item.originalPath || 'Unknown'}`;

          meta.appendChild(nameEl);
          meta.appendChild(pathEl);

          const sizeEl = document.createElement('div');
          sizeEl.style.fontSize = '0.85em';
          sizeEl.style.color = 'var(--text2, #a6adc8)';
          sizeEl.style.minWidth = '70px';
          sizeEl.textContent = formatSize(item.size || (item.content ? item.content.length : 0));

          const dateEl = document.createElement('div');
          dateEl.style.fontSize = '0.8em';
          dateEl.style.color = 'var(--text2, #a6adc8)';
          dateEl.style.minWidth = '130px';
          dateEl.textContent = item.deletedAt ? new Date(item.deletedAt).toLocaleString() : '';

          const actions = document.createElement('div');
          actions.style.display = 'flex';
          actions.style.gap = '6px';

          const restoreBtn = document.createElement('button');
          restoreBtn.textContent = 'Restore';
          restoreBtn.className = 'btn';
          restoreBtn.style.padding = '4px 8px';
          restoreBtn.style.borderRadius = '4px';
          restoreBtn.style.border = 'none';
          restoreBtn.style.background = 'var(--accent, #89b4fa)';
          restoreBtn.style.color = '#fff';
          restoreBtn.style.cursor = 'pointer';
          restoreBtn.style.fontSize = '0.8em';
          restoreBtn.onclick = async () => {
            await MWO.Bin.restore(item);
            await renderList();
          };

          const delBtn = document.createElement('button');
          delBtn.textContent = 'Close Delete forever';
          delBtn.className = 'btn';
          delBtn.style.padding = '4px 8px';
          delBtn.style.borderRadius = '4px';
          delBtn.style.border = 'none';
          delBtn.style.background = 'rgba(243, 139, 168, 0.2)';
          delBtn.style.color = '#f38ba8';
          delBtn.style.cursor = 'pointer';
          delBtn.style.fontSize = '0.8em';
          delBtn.onclick = async () => {
            await MWO.Bin.deleteForever(item);
            await renderList();
          };

          actions.appendChild(restoreBtn);
          actions.appendChild(delBtn);

          row.appendChild(icon);
          row.appendChild(meta);
          row.appendChild(sizeEl);
          row.appendChild(dateEl);
          row.appendChild(actions);

          table.appendChild(row);
        });

        contentArea.appendChild(table);
      };

      restoreAllBtn.onclick = async () => {
        if ((await MWO.Bin.items()).length === 0) return;
        MWO.dialog.confirm(
          'Restore All Files',
          'Are you sure you want to restore all items to their original locations?',
          async () => {
            await MWO.Bin.restoreAll();
            await renderList();
          }
        );
      };

      emptyBtn.onclick = async () => {
        if ((await MWO.Bin.items()).length === 0) return;
        MWO.dialog.confirm(
          'Empty Recycle Bin',
          'Are you sure you want to permanently delete all items in the Recycle Bin?',
          async () => {
            await MWO.Bin.empty();
            await renderList();
          }
        );
      };

      refreshBtn.onclick = () => renderList();

      renderList();
    }
  };

  if (typeof MWO.registerApp === 'function') {
    MWO.registerApp({
      id: 'bin',
      name: 'Recycle Bin',
      description: 'Deleted files live here until restored or emptied',
      icon: 'recycle-bin',
      category: 'app',
      installed: true,
      launch: function() {
        MWO.Bin.openWindow();
      }
    });
  }
})(MWO);
