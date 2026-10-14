// Video AI Generator for MossyWoss OS
// Generates procedural video with canvas animation + Web Audio API music/SFX + subtitles
MWO.VideoGen = (function() {
  var win = null;
  var canvas = null;
  var ctx = null;
  var audioCtx = null;
  var scenes = [];
  var currentScene = 0;
  var sceneStartTime = 0;
  var isPlaying = false;
  var isGenerating = false;
  var totalDuration = 0; // seconds
  var elapsed = 0;
  var animationFrame = null;
  var particles = [];
  var audioNodes = [];
  var masterGain = null;
  var subtitles = [];
  var settings = {
    hours: 0, minutes: 1, seconds: 0,
    style: 'sci-fi', mood: 'epic',
    description: ''
  };
  var trackBar = null;
  var playBtn = null;
  var volSlider = null;
  var lastFrameTime = 0;
  var fps = 0;
  var frameCount = 0;
  var fpsTime = 0;

  function init(w, c) {
    win = w;
    canvas = c;
    ctx = canvas.getContext('2d');
    canvas.width = 640;
    canvas.height = 360;
  }

  function generate() {
    var hours = parseInt(document.getElementById('vg-hours').value) || 0;
    var minutes = parseInt(document.getElementById('vg-minutes').value) || 0;
    var seconds = parseInt(document.getElementById('vg-seconds').value) || 0;
    totalDuration = hours * 3600 + minutes * 60 + seconds;
    if (totalDuration < 5) { MWO.notif.show('Video Generator', 'Minimum duration is 5 seconds'); totalDuration = 5; }
    if (totalDuration > 3600) { MWO.notif.show('Video Generator', 'Maximum duration is 1 hour'); totalDuration = 3600; }

    settings.style = document.getElementById('vg-style').value;
    settings.mood = document.getElementById('vg-mood').value;
    settings.description = document.getElementById('vg-desc').value;

    isGenerating = true;
    document.getElementById('vg-generate-btn').textContent = 'Generating...';
    document.getElementById('vg-generate-btn').classList.add('disabled');

    // Build scenes
    scenes = [];
    var sceneCount = Math.max(3, Math.min(50, Math.floor(totalDuration / 8)));
    var sceneLen = totalDuration / sceneCount;

    var styles = {
      'sci-fi': ['Nebula drift', 'Stargate opening', 'Cyber City', 'Holographic Interface', 'Deep Space', 'Energy Field', 'Wormhole Transit'],
      'nature': ['Forest Canopy', 'Ocean Waves', 'Mountain Dawn', 'Desert Dunes', 'Aurora Borealis', 'Rain Forest', 'Waterfall'],
      'abstract': ['Color Bloom', 'Geometric Flow', 'Liquid Metal', 'Prismatic Wave', 'Particle Storm', 'Spiral Galaxy'],
      'cyberpunk': ['Neon Street', 'Digital Rain', 'Chrome Reflection', 'Hologram City', 'Data Stream', 'Glitch World'],
      'fantasy': ['Castle on Hill', 'Enchanted Forest', 'Dragon Sky', 'Magic Portal', 'Crystal Cave', 'Floating Islands'],
      'minimal': ['Fade to White', 'Slow Lines', 'Circle Pulsing', 'Breathing Dot', 'Gentle Waves', 'Quiet Space']
    };

    var moods = {
      'happy': ['radiant', 'bright', 'cheerful', 'warm', 'golden'],
      'sad': ['melancholic', 'fading', 'distant', 'cold', 'blue'],
      'epic': ['grand', 'powerful', 'sweeping', 'majestic', 'towering'],
      'calm': ['serene', 'peaceful', 'gentle', 'soft', 'flowing'],
      'mysterious': ['shadowed', 'enigmatic', 'hidden', 'veiled', 'dark'],
      'energetic': ['explosive', 'dynamic', 'pulsing', 'vibrant', 'electric']
    };

    var styleList = styles[settings.style] || styles['sci-fi'];
    var moodList = moods[settings.mood] || moods['epic'];

    for (var i = 0; i < sceneCount; i++) {
      var sceneName = styleList[i % styleList.length];
      var moodWord = moodList[i % moodList.length];
      var subtitleText = settings.description
        ? settings.description
        : (capitalise(moodWord) + ' ' + sceneName.toLowerCase());

      scenes.push({
        name: sceneName,
        mood: moodWord,
        duration: sceneLen,
        startTime: i * sceneLen,
        subtitle: subtitleText,
        bgColor: getSceneColor(settings.style, i),
        particleType: getParticleType(settings.style, i)
      });
    }

    // Build subtitles
    subtitles = scenes.map(function(s) {
      return { text: s.subtitle, start: s.startTime, end: s.startTime + s.duration };
    });

    // Update UI
    renderSubtitleTrack();
    document.getElementById('vg-generate-btn').textContent = 'Regenerate';
    document.getElementById('vg-generate-btn').classList.remove('disabled');
    isGenerating = false;

    // Auto-play
    play();
    MWO.notif.show('Video Generated', totalDuration + 's, ' + sceneCount + ' scenes');
  }

  function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function getSceneColor(style, i) {
    var palettes = {
      'sci-fi': [['#0a0a2e','#16213e','#0f3460'],['#1a0a2e','#2a1040','#3a2060'],['#001020','#023050','#0f5070']],
      'nature': [['#0a2e0a','#1a4010','#2a5020'],['#001a2e','#103040','#205060'],['#1a1a0a','#303020','#504030']],
      'abstract': [['#2e0a2e','#4a1a4a','#6a2a6a'],['#0a2e2e','#1a4a4a'],['2a6a6a'],['#2e2e0a','#4a4a1a','#6a6a2a']],
      'cyberpunk': [['#1a0a1e','#3a1450','#0f3460'],['#0a0a1e','#2a1040','#e94560'],['#1e1a0a','#503a10','#e08000']],
      'fantasy': [['#1a0a2e','#3a1a5a','#5a2a8a'],['#0a1e2a','#1a3a5a','#2a5a8a'],['#2e0a1a','#5a1a3a','#8a2a5a']],
      'minimal': [['#f0f0f0','#d0d0d0','#a0a0a0'],['#e8e8e8','#c0c0c0','#909090'],['#f5f5f5','#e0e0e0','#b0b0b0']]
    };
    var p = palettes[style] || palettes['sci-fi'];
    return p[i % p.length];
  }

  function getParticleType(style, i) {
    var types = ['stars', 'float', 'rain', 'spiral', 'burst', 'wave', 'grid', 'orbs'];
    return types[(i + style.length) % types.length];
  }

  function play() {
    if (scenes.length === 0) return;
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    isPlaying = true;
    currentScene = 0;
    sceneStartTime = performance.now();
    elapsed = 0;
    lastFrameTime = performance.now();

    if (masterGain && audioCtx) {
      masterGain = audioCtx.createGain();
      masterGain.gain.value = volSlider ? volSlider.value / 100 : 0.5;
      masterGain.connect(audioCtx.destination);
    }

    startMusic();
    animate();
    if (playBtn) playBtn.textContent = '⏸';
  }

  function pause() {
    isPlaying = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    stopMusic();
    if (playBtn) playBtn.textContent = '▶';
  }

  function togglePlay() { if (isPlaying) pause(); else play(); }

  function startMusic() {
    if (!audioCtx || !masterGain) return;
    stopMusic();

    var moodFreqs = {
      'happy': [262, 330, 392, 523, 659],
      'sad': [196, 247, 294, 392, 494],
      'epic': [131, 196, 262, 392, 523],
      'calm': [174, 220, 261, 329, 392],
      'mysterious': [147, 185, 233, 311, 392],
      'energetic': [330, 415, 494, 622, 740]
    };

    var notes = moodFreqs[settings.mood] || moodFreqs['epic'];
    var i = 0;

    function playNote() {
      if (!isPlaying || !audioCtx) return;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var freq = notes[i % notes.length];
      var sceneIdx = Math.floor(elapsed / (totalDuration / scenes.length));
      var scene = scenes[sceneIdx] || scenes[0];

      // Vary frequency by scene
      freq = freq * (1 + (sceneIdx * 0.03));

      osc.type = settings.style === 'cyberpunk' ? 'sawtooth' : (settings.style === 'nature' ? 'sine' : 'triangle');
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 1);

      audioNodes.push(osc, gain);

      // SFX whoosh on scene change
      if (i > 0 && i % Math.floor(8) === 0) {
        playSFX('whoosh');
      }

      i++;
      setTimeout(playNote, 400 + Math.random() * 200);
    }

    // Ambient drone
    var droneOsc = audioCtx.createOscillator();
    var droneGain = audioCtx.createGain();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = notes[0] / 2;
    droneGain.gain.value = 0.05;
    droneOsc.connect(droneGain);
    droneGain.connect(masterGain);
    droneOsc.start();
    audioNodes.push(droneOsc, droneGain);

    playNote();
  }

  function playSFX(type) {
    if (!audioCtx || !masterGain) return;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    if (type === 'whoosh') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    } else if (type === 'blip') {
      osc.type = 'square';
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    } else {
      osc.type = 'triangle';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    }

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
    audioNodes.push(osc, gain);
  }

  function stopMusic() {
    audioNodes.forEach(function(n) {
      try { if (n.stop) n.stop(); if (n.disconnect) n.disconnect(); } catch(e) {}
    });
    audioNodes = [];
  }

  function animate() {
    if (!isPlaying) return;
    var now = performance.now();
    var dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    elapsed += dt;

    // FPS counter
    frameCount++;
    fpsTime += dt;
    if (fpsTime >= 1) {
      fps = Math.round(frameCount / fpsTime);
      frameCount = 0; fpsTime = 0;
    }

    // Check if video ended
    if (elapsed >= totalDuration) {
      elapsed = 0;
      currentScene = 0;
      sceneStartTime = now;
      // Loop
    }

    // Current scene
    var sceneIdx = 0;
    for (var i = 0; i < scenes.length; i++) {
      if (elapsed >= scenes[i].startTime && elapsed < scenes[i].startTime + scenes[i].duration) {
        sceneIdx = i;
        break;
      }
    }

    if (sceneIdx !== currentScene) {
      currentScene = sceneIdx;
      playSFX('whoosh');
      // New particle burst on scene change
      spawnParticles(scenes[sceneIdx]);
    }

    var scene = scenes[currentScene];
    if (scene) renderScene(scene, dt);

    // Update track bar
    if (trackBar) {
      var pct = (elapsed / totalDuration) * 100;
      trackBar.style.width = pct + '%';
    }

    // Update time display
    var timeEl = document.getElementById('vg-time');
    if (timeEl) {
      timeEl.textContent = formatTime(elapsed) + ' / ' + formatTime(totalDuration);
    }

    animationFrame = requestAnimationFrame(animate);
  }

  function formatTime(s) {
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = Math.floor(s % 60);
    var str = '';
    if (h > 0) str += h + ':';
    str += (m < 10 ? '0' : '') + m + ':';
    str += (sec < 10 ? '0' : '') + sec;
    return str;
  }

  function renderScene(scene, dt) {
    var w = canvas.width, h = canvas.height;
    var colors = scene.bgColor;

    // Background gradient
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, colors[1]);
    if (colors[2]) grad.addColorStop(1, colors[2]);
    else grad.addColorStop(1, colors[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Update and render particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt;
      if (p.life <= 0 || p.x < -50 || p.x > w + 50 || p.y < -50 || p.y > h + 50) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Scene-specific rendering
    var t = elapsed * 0.5;
    ctx.save();

    switch(scene.particleType) {
      case 'stars':
        // Twinkling background
        for (var s = 0; s < 50; s++) {
          var sx = (s * 37 + t * 20) % w;
          var sy = (s * 53) % h;
          var sz = 1 + Math.sin(t + s) * 0.5;
          ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(t + s) * 0.2) + ')';
          ctx.fillRect(sx, sy, sz, sz);
        }
        break;
      case 'grid':
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (var gx = 0; gx < w; gx += 40) {
          var offY = Math.sin(t + gx * 0.05) * 10;
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx + offY, h); ctx.stroke();
        }
        for (var gy = 0; gy < h; gy += 40) {
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
        }
        break;
      case 'wave':
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        for (var wl = 0; wl < 5; wl++) {
          ctx.beginPath();
          for (var wx = 0; wx < w; wx += 2) {
            var wy = h / 2 + Math.sin(wx * 0.02 + t + wl) * 40 * (1 + wl * 0.3);
            if (wx === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
          }
          ctx.stroke();
        }
        break;
    }

    ctx.restore();

    // Subtitle overlay
    var sub = subtitles[currentScene];
    if (sub && sub.text) {
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      var lines = wrapText(sub.text, w - 80);
      var subY = h - 30 - (lines.length - 1) * 18;
      for (var li = 0; li < lines.length; li++) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(w/2 - ctx.measureText(lines[li]).width/2 - 8, subY - 16, ctx.measureText(lines[li]).width + 16, 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(lines[li], w / 2, subY);
        subY += 20;
      }
    }

    // Scene name (top left)
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('Scene ' + (currentScene + 1) + '/' + scenes.length + ': ' + scene.name, 10, 20);
    ctx.fillText('FPS: ' + fps, 10, 36);
  }

  function wrapText(text, maxWidth) {
    var words = text.split(' ');
    var lines = [];
    var line = '';
    ctx.font = '16px sans-serif';
    for (var i = 0; i < words.length; i++) {
      var test = line + (line ? ' ' : '') + words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function spawnParticles(scene) {
    var count = 30;
    var colors = ['#fff', scene.bgColor[1], '#e94560', '#0f3460', '#16a085'];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2 + (Math.random() - 0.5) * 150,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: 1 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 2 + Math.random() * 3,
        maxLife: 5
      });
    }
  }

  function renderSubtitleTrack() {
    var track = document.getElementById('vg-subtitle-track');
    if (!track || !trackBar) return;
    track.innerHTML = '';
    subtitles.forEach(function(s, i) {
      var div = document.createElement('div');
      div.style.cssText = 'position:absolute;left:' + (s.start / totalDuration * 100) + '%;width:' + (s.duration / totalDuration * 100) + '%;background:rgba(255,255,255,0.06);border-radius:3px;font-size:0.72em;padding:3px 6px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;cursor:pointer';
      div.textContent = s.text;
      div.onclick = function() { seek(s.start); };
      track.appendChild(div);
    });
  }

  function seek(time) {
    elapsed = time;
    for (var i = 0; i < scenes.length; i++) {
      if (elapsed >= scenes[i].startTime && elapsed < scenes[i].startTime + scenes[i].duration) {
        currentScene = i;
        break;
      }
    }
  }

  function setVolume(v) {
    if (masterGain && audioCtx) masterGain.gain.value = v / 100;
  }

  var exports = {
    init: init,
    generate: generate,
    play: play,
    pause: pause,
    togglePlay: togglePlay,
    seek: seek,
    setVolume: setVolume,
    getScenes: function() { return scenes; },
    getCurrentScene: function() { return currentScene; },
    getElapsed: function() { return elapsed; },
    getDuration: function() { return totalDuration; },
    setCanvas: function(c) { canvas = c; ctx = c.getContext('2d'); },
    setTrackBar: function(el) { trackBar = el; },
    setPlayBtn: function(el) { playBtn = el; },
    setVolSlider: function(el) { volSlider = el; }
  };

  return exports;
})();
