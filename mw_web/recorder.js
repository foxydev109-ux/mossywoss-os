/* ========================================================================
 * MossyWoss OS — Screen & Media Recorder
 * File: mw_web/recorder.js
 * Production-grade Screen, Camera & Game Canvas recorder with tap overlay.
 * ======================================================================== */

var MWO = MWO || {};

MWO.Recorder = (function() {
  'use strict';

  // Inject CSS animations for click/tap ripples and cursor trail
  function injectStyles() {
    if (document.getElementById('mwo-recorder-styles')) return;
    const style = document.createElement('style');
    style.id = 'mwo-recorder-styles';
    style.textContent = `
      @keyframes mwoRecRippleAnim {
        0% { transform: scale(0.2); opacity: 1; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      @keyframes mwoRecPulse {
        0% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.3); opacity: 1; }
        100% { transform: scale(1); opacity: 0.9; }
      }
      .mwo-rec-ripple {
        position: fixed;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 45, 85, 0.85) 0%, rgba(255, 149, 0, 0.5) 60%, rgba(255, 0, 0, 0) 100%);
        border: 2px solid #ff2d55;
        box-shadow: 0 0 12px rgba(255, 45, 85, 0.8);
        pointer-events: none;
        z-index: 999999;
        animation: mwoRecRippleAnim 0.6s ease-out forwards;
      }
      .mwo-rec-dot {
        position: fixed;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #ff2d55;
        box-shadow: 0 0 8px #ff2d55, 0 0 16px rgba(255,45,85,0.6);
        pointer-events: none;
        z-index: 999998;
        transform: translate(-50%, -50%);
        animation: mwoRecPulse 1.2s infinite ease-in-out;
      }
      .mwo-rec-pulsing {
        animation: mwoRecPulse 1s infinite alternate;
        background: #e74c3c !important;
        color: #fff !important;
      }
    `;
    document.head.appendChild(style);
  }

  let activeRecorder = null;
  let activeStream = null;
  let activeMicStream = null;
  let audioContext = null;
  let timerInterval = null;
  let pointerDownHandler = null;
  let pointerMoveHandler = null;
  let cursorDotEl = null;

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getQualityResolution(quality) {
    switch (quality) {
      case '1080p': return { width: 1920, height: 1080 };
      case '480p': return { width: 854, height: 480 };
      case '720p':
      default: return { width: 1280, height: 720 };
    }
  }

  function launch() {
    injectStyles();

    const win = MWO.wm.create({
      id: 'recorder-' + Date.now(),
      title: 'Screen & Media Recorder',
      icon: '⏺',
      width: 680,
      height: 520,
      resizable: true
    });

    const body = (win && win.body) ? win.body : (win && win.element ? win.element.querySelector('.w-body') : win);
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.background = '#121224';
    body.style.color = '#e0e0e0';
    body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    body.style.padding = '14px';
    body.style.gap = '12px';
    body.style.overflowY = 'auto';

    body.innerHTML = `
      <div style="display:flex;gap:12px;flex-wrap:wrap;background:#1a1a36;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);">
        <div style="flex:1;min-width:180px;display:flex;flex-direction:column;gap:4px">
          <label style="font-size:0.8em;color:#aaa;font-weight:600">RECORD SOURCE</label>
          <select id="rec-source" class="mw-input" style="padding:6px;background:#252548;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:6px;">
            <option value="screen">This Screen / Display</option>
            <option value="camera">Camera</option>
            <option value="game">Game Window / Canvas</option>
          </select>
        </div>

        <div id="rec-game-select-wrap" style="flex:1;min-width:180px;display:none;flex-direction:column;gap:4px">
          <label style="font-size:0.8em;color:#aaa;font-weight:600">TARGET WINDOW</label>
          <select id="rec-game-win" class="mw-input" style="padding:6px;background:#252548;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:6px;">
          </select>
        </div>

        <div style="width:130px;display:flex;flex-direction:column;gap:4px">
          <label style="font-size:0.8em;color:#aaa;font-weight:600">QUALITY</label>
          <select id="rec-quality" class="mw-input" style="padding:6px;background:#252548;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:6px;">
            <option value="1080p">1080p (FHD)</option>
            <option value="720p" selected>720p (HD)</option>
            <option value="480p">480p (SD)</option>
          </select>
        </div>
      </div>

      <div style="display:flex;gap:16px;align-items:center;background:#1a1a36;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.88em">
          <input type="checkbox" id="rec-click-overlay" checked style="accent-color:#ff2d55"> Show taps & clicks overlay
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.88em">
          <input type="checkbox" id="rec-mic" checked style="accent-color:#ff2d55"> Record voice (mic)
        </label>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;background:#16162d;padding:14px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.06)">
        <div style="display:flex;align-items:center;gap:16px">
          <button id="rec-main-btn" class="mw-btn" style="padding:10px 24px;font-size:1.1em;font-weight:bold;background:#e74c3c;color:#fff;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(231,76,60,0.4)">
            <span style="font-size:1.2em">⏺</span> REC
          </button>
          <div style="display:flex;flex-direction:column">
            <span id="rec-timer-display" style="font-size:1.4em;font-weight:bold;font-family:monospace;color:#00ff99">00:00</span>
            <span id="rec-size-display" style="font-size:0.75em;color:#aaa">Est. Size: 0 B</span>
          </div>
        </div>
        <div id="rec-status-msg" style="font-size:0.85em;color:#aaa;max-width:240px;text-align:right">
          Ready to record
        </div>
      </div>

      <div id="rec-notice-box" style="display:none;background:rgba(255,149,0,0.15);border:1px solid #ff9500;color:#ffcc00;padding:10px;border-radius:8px;font-size:0.85em">
      </div>

      <video id="rec-preview-video" autoplay muted style="display:none;width:100%;max-height:220px;background:#000;border-radius:8px;border:1px solid rgba(255,255,255,0.1)"></video>

      <div style="flex:1;display:flex;flex-direction:column;gap:8px;margin-top:4px">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:6px">
          <span style="font-weight:bold;font-size:0.9em;color:#4dedea">📹 RECORDINGS LIBRARY (/Videos)</span>
          <button id="rec-refresh-btn" class="mw-btn" style="padding:2px 8px;font-size:0.75em">🔄 Refresh</button>
        </div>
        <div id="rec-list-container" style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto;padding-right:4px">
          <div style="color:#777;font-size:0.85em;text-align:center;padding:20px">Loading recordings...</div>
        </div>
      </div>
    `;

    const sourceSelect = body.querySelector('#rec-source');
    const gameSelectWrap = body.querySelector('#rec-game-select-wrap');
    const gameSelect = body.querySelector('#rec-game-win');
    const qualitySelect = body.querySelector('#rec-quality');
    const clickOverlayCheck = body.querySelector('#rec-click-overlay');
    const micCheck = body.querySelector('#rec-mic');
    const mainBtn = body.querySelector('#rec-main-btn');
    const timerDisplay = body.querySelector('#rec-timer-display');
    const sizeDisplay = body.querySelector('#rec-size-display');
    const statusMsg = body.querySelector('#rec-status-msg');
    const noticeBox = body.querySelector('#rec-notice-box');
    const previewVideo = body.querySelector('#rec-preview-video');
    const listContainer = body.querySelector('#rec-list-container');
    const refreshBtn = body.querySelector('#rec-refresh-btn');

    let recordingStartTime = 0;
    let recordedChunks = [];
    let accumulatedBytes = 0;
    let isRecording = false;

    // Populate game window picker
    function populateGameWindows() {
      gameSelect.innerHTML = '';
      const wins = document.querySelectorAll('#desktop .window');
      let count = 0;
      wins.forEach(w => {
        const titleEl = w.querySelector('.w-title');
        const title = titleEl ? titleEl.textContent.trim() : 'Window ' + w.id;
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = title;
        gameSelect.appendChild(opt);
        count++;
      });
      if (count === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No open windows found';
        gameSelect.appendChild(opt);
      }
    }

    sourceSelect.onchange = () => {
      noticeBox.style.display = 'none';
      if (sourceSelect.value === 'game') {
        gameSelectWrap.style.display = 'flex';
        populateGameWindows();
      } else {
        gameSelectWrap.style.display = 'none';
      }
      if (sourceSelect.value === 'camera') {
        statusMsg.textContent = 'Camera live preview mode';
      } else {
        previewVideo.style.display = 'none';
        if (previewVideo.srcObject) {
          previewVideo.srcObject.getTracks().forEach(t => t.stop());
          previewVideo.srcObject = null;
        }
      }
    };

    // Refresh recordings library list
    async function refreshRecordingsList() {
      listContainer.innerHTML = '<div style="color:#777;font-size:0.85em;text-align:center;padding:10px">Loading recordings...</div>';
      try {
        await MWO.fs.mkdir('/Videos');
        const files = await MWO.fs.listDir('/Videos');
        const videoFiles = files.filter(f => f.name.match(/\.(webm|mp4|mkv|ogg)$/i) || f.path.startsWith('/Videos/recording_'));

        if (videoFiles.length === 0) {
          listContainer.innerHTML = '<div style="color:#666;font-size:0.85em;text-align:center;padding:14px">No recordings yet in /Videos</div>';
          return;
        }

        listContainer.innerHTML = '';
        videoFiles.sort((a, b) => new Date(b.modified || 0) - new Date(a.modified || 0));

        videoFiles.forEach(file => {
          const itemDiv = document.createElement('div');
          itemDiv.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:#1f1f3d;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);font-size:0.85em';
          
          const dateStr = file.modified ? new Date(file.modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
          const sizeStr = formatBytes(file.size || 0);

          itemDiv.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;overflow:hidden">
              <span style="font-size:1.2em">🎬</span>
              <div style="display:flex;flex-direction:column;overflow:hidden">
                <span style="font-weight:600;white-space:nowrap;text-overflow:ellipsis;overflow:hidden">${file.name}</span>
                <span style="font-size:0.75em;color:#888">${sizeStr} ${dateStr ? '• ' + dateStr : ''}</span>
              </div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="mw-btn rec-play-btn" style="padding:4px 8px;font-size:0.75em;background:#2ecc71;color:#fff;border:none;border-radius:4px;cursor:pointer">▶ Play</button>
              <button class="mw-btn rec-del-btn" style="padding:4px 8px;font-size:0.75em;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer">🗑 Delete</button>
            </div>
          `;

          itemDiv.querySelector('.rec-play-btn').onclick = async () => {
            try {
              const dataUrl = await MWO.fs.readFile(file.path);
              previewVideo.style.display = 'block';
              previewVideo.controls = true;
              previewVideo.src = dataUrl;
              previewVideo.play();
              statusMsg.textContent = `Playing ${file.name}`;
            } catch (err) {
              MWO.notif.show('Recorder', 'Failed to open video file');
            }
          };

          itemDiv.querySelector('.rec-del-btn').onclick = async () => {
            await MWO.fs.deleteFile(file.path);
            MWO.notif.show('Recorder', 'Deleted ' + file.name);
            refreshRecordingsList();
          };

          listContainer.appendChild(itemDiv);
        });
      } catch (e) {
        listContainer.innerHTML = '<div style="color:#e74c3c;font-size:0.85em;text-align:center;padding:10px">Error reading /Videos</div>';
      }
    }

    refreshBtn.onclick = refreshRecordingsList;
    refreshRecordingsList();

    // Enable pointer overlay tracking during recording
    function startClickOverlay() {
      if (pointerDownHandler) return;

      pointerDownHandler = function(e) {
        if (!isRecording) return;
        const ripple = document.createElement('div');
        ripple.className = 'mwo-rec-ripple';
        ripple.style.left = (e.clientX - 22) + 'px';
        ripple.style.top = (e.clientY - 22) + 'px';
        document.body.appendChild(ripple);
        setTimeout(() => {
          if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
        }, 600);
      };

      cursorDotEl = document.createElement('div');
      cursorDotEl.className = 'mwo-rec-dot';
      cursorDotEl.style.left = '-100px';
      cursorDotEl.style.top = '-100px';
      document.body.appendChild(cursorDotEl);

      pointerMoveHandler = function(e) {
        if (cursorDotEl) {
          cursorDotEl.style.left = e.clientX + 'px';
          cursorDotEl.style.top = e.clientY + 'px';
        }
      };

      document.addEventListener('pointerdown', pointerDownHandler, true);
      document.addEventListener('pointermove', pointerMoveHandler, true);
    }

    function stopClickOverlay() {
      if (pointerDownHandler) {
        document.removeEventListener('pointerdown', pointerDownHandler, true);
        pointerDownHandler = null;
      }
      if (pointerMoveHandler) {
        document.removeEventListener('pointermove', pointerMoveHandler, true);
        pointerMoveHandler = null;
      }
      if (cursorDotEl && cursorDotEl.parentNode) {
        cursorDotEl.parentNode.removeChild(cursorDotEl);
        cursorDotEl = null;
      }
    }

    // Stop recording handler
    async function stopRecording() {
      if (!isRecording) return;
      isRecording = false;

      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      stopClickOverlay();

      if (activeRecorder && activeRecorder.state !== 'inactive') {
        activeRecorder.stop();
      }

      mainBtn.innerHTML = '<span style="font-size:1.2em">⏺</span> REC';
      mainBtn.classList.remove('mwo-rec-pulsing');
      mainBtn.style.background = '#e74c3c';
      statusMsg.textContent = 'Saving recording...';
    }

    // Start recording handler
    async function startRecording() {
      noticeBox.style.display = 'none';
      noticeBox.textContent = '';
      recordedChunks = [];
      accumulatedBytes = 0;
      const res = getQualityResolution(qualitySelect.value);

      let videoStream = null;
      const srcMode = sourceSelect.value;

      try {
        if (srcMode === 'screen') {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            throw new Error('getDisplayMedia unsupported');
          }
          videoStream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 30, width: { ideal: res.width }, height: { ideal: res.height } },
            audio: true
          });
        } else if (srcMode === 'camera') {
          videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: res.width }, height: { ideal: res.height } },
            audio: true
          });
          previewVideo.style.display = 'block';
          previewVideo.controls = false;
          previewVideo.srcObject = videoStream;
        } else if (srcMode === 'game') {
          const targetWinId = gameSelect.value;
          const targetWinEl = document.getElementById(targetWinId);
          let canvas = targetWinEl ? targetWinEl.querySelector('canvas') : null;

          if (!canvas) {
            // Search all canvases in desktop if specific target missing
            const canvases = document.querySelectorAll('#desktop canvas');
            if (canvases.length > 0) canvas = canvases[0];
          }

          if (canvas && typeof canvas.captureStream === 'function') {
            videoStream = canvas.captureStream(30);
            noticeBox.style.display = 'block';
            noticeBox.textContent = 'Recording game canvas. (Note: Click overlay is captured in Screen mode; Game Window records canvas directly).';
          } else {
            noticeBox.style.display = 'block';
            noticeBox.textContent = 'This app has no recordable canvas. Please switch Source to "This Screen" mode to record this window.';
            statusMsg.textContent = 'No canvas found';
            return;
          }
        }
      } catch (err) {
        noticeBox.style.display = 'block';
        noticeBox.textContent = `Screen/Media capture unavailable or denied (${err.message}). Try "Game Window" or "Camera" mode.`;
        statusMsg.textContent = 'Capture failed';
        return;
      }

      if (!videoStream || videoStream.getVideoTracks().length === 0) {
        statusMsg.textContent = 'No video track';
        return;
      }

      activeStream = videoStream;

      // Handle Microphone audio merging
      let micStream = null;
      if (micCheck.checked) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          activeMicStream = micStream;
        } catch (mErr) {
          console.warn('Microphone access denied:', mErr);
        }
      }

      // Merge audio tracks
      let combinedAudioTracks = [];
      const videoAudioTracks = videoStream.getAudioTracks();
      const micAudioTracks = micStream ? micStream.getAudioTracks() : [];

      if (videoAudioTracks.length > 0 && micAudioTracks.length > 0) {
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const dest = audioContext.createMediaStreamDestination();
          const src1 = audioContext.createMediaStreamSource(new MediaStream(videoAudioTracks));
          const src2 = audioContext.createMediaStreamSource(new MediaStream(micAudioTracks));
          src1.connect(dest);
          src2.connect(dest);
          combinedAudioTracks = dest.stream.getAudioTracks();
        } catch (aErr) {
          combinedAudioTracks = [...videoAudioTracks, ...micAudioTracks];
        }
      } else if (micAudioTracks.length > 0) {
        combinedAudioTracks = micAudioTracks;
      } else if (videoAudioTracks.length > 0) {
        combinedAudioTracks = videoAudioTracks;
      }

      const finalStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...combinedAudioTracks
      ]);

      // Select mimeType
      let mimeType = 'video/webm';
      let ext = 'webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
          ext = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
          ext = 'webm';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
          ext = 'webm';
        }
      }

      try {
        activeRecorder = new MediaRecorder(finalStream, { mimeType: mimeType });
      } catch (rErr) {
        activeRecorder = new MediaRecorder(finalStream);
      }

      activeRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
          accumulatedBytes += e.data.size;
          sizeDisplay.textContent = 'Est. Size: ' + formatBytes(accumulatedBytes);
        }
      };

      activeRecorder.onstop = async () => {
        if (activeStream) {
          activeStream.getTracks().forEach(t => t.stop());
          activeStream = null;
        }
        if (activeMicStream) {
          activeMicStream.getTracks().forEach(t => t.stop());
          activeMicStream = null;
        }
        if (audioContext) {
          audioContext.close();
          audioContext = null;
        }

        if (recordedChunks.length > 0) {
          const blob = new Blob(recordedChunks, { type: mimeType });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const dataUrl = reader.result;
            const filename = `/Videos/recording_${Date.now()}.${ext}`;
            try {
              await MWO.fs.mkdir('/Videos');
              await MWO.fs.writeFile(filename, dataUrl);
              MWO.notif.show('Recorder', 'Saved ' + filename.split('/').pop());
              statusMsg.textContent = 'Recording saved!';
              refreshRecordingsList();
            } catch (fsErr) {
              MWO.notif.show('Recorder', 'Failed to save recording');
              statusMsg.textContent = 'Save error';
            }
          };
          reader.readAsDataURL(blob);
        }
      };

      // Listen for track ending (e.g. user stops display share via browser bar)
      videoStream.getVideoTracks()[0].onended = () => {
        if (isRecording) stopRecording();
      };

      if (clickOverlayCheck.checked && srcMode === 'screen') {
        startClickOverlay();
      }

      activeRecorder.start(1000);
      isRecording = true;
      recordingStartTime = Date.now();

      mainBtn.innerHTML = '<span style="font-size:1.2em">⏹</span> STOP';
      mainBtn.classList.add('mwo-rec-pulsing');
      statusMsg.textContent = '● RECORDING LIVE';

      timerInterval = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTime) / 1000;
        timerDisplay.textContent = formatTime(elapsed);
      }, 1000);
    }

    mainBtn.onclick = () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    // Cleanup on window close
    if (win && win.element) {
      const closeBtn = win.element.querySelector('.w-btn.close');
      if (closeBtn) {
        const origClose = closeBtn.onclick;
        closeBtn.onclick = (e) => {
          stopRecording();
          if (origClose) origClose.call(closeBtn, e);
        };
      }
    }
  }

  // Register app in MossyWoss OS Store
  if (window.MWO && MWO.registerApp) {
    MWO.registerApp({
      id: 'recorder',
      name: 'Recorder',
      description: 'Record screen, games & apps with click/tap overlay',
      icon: '⏺',
      category: 'app',
      installed: false,
      launch: launch
    });
  }

  return {
    launch: launch
  };
})();
