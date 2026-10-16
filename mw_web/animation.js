// Animation Studio for MossyWoss OS
// Production-grade 2D & 3D Animation Studio with Timeline, Keyframes, Interpolation, & MediaRecorder Export
MWO.Animation = (function() {
  var winBody = null;
  var canvas = null;
  var ctx = null;
  var animFrameId = null;

  // Application State
  var layers = [];
  var activeLayerId = null;
  var activeShapeId = null;
  var activeTool = 'select'; // 'select', 'rect', 'ellipse', 'line', 'text', 'star', 'orbit'
  var is3D = false;
  var onionSkin = false;
  var bonesMode = false;
  var currentTime = 0; // seconds
  var duration = 10; // seconds
  var fps = 60;
  var isPlaying = false;
  var isLooping = true;
  var lastAnimTime = 0;

  // Default Shape Style
  var currentFill = '#4a90e2';
  var currentStroke = '#ffffff';
  var currentStrokeWidth = 2;
  var currentOpacity = 1;

  // Viewport & 3D Camera State
  var zoom = 1;
  var panX = 0;
  var panY = 0;
  var camera3D = {
    x: 0, y: 0, z: -400,
    rotX: 0.3, rotY: 0.4,
    fov: 400
  };

  // Interaction State
  var isDragging = false;
  var dragAction = null; // 'draw', 'move', 'handle', 'pan', 'orbit'
  var dragHandle = null;
  var dragStartPos = { x: 0, y: 0 };
  var dragStartShape = null;
  var tempDrawShape = null;
  var dragKeyframeData = null;

  // Touch tracking for multi-touch pinch/pan
  var initialPinchDist = 0;
  var initialZoom = 1;

  // Helper Math & Utilities
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    a = (a !== undefined && a !== null) ? Number(a) : 0;
    b = (b !== undefined && b !== null) ? Number(b) : 0;
    return a + (b - a) * t;
  }

  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function(c) { return c + c; }).join('');
    var num = parseInt(hex, 16);
    if (isNaN(num)) return { r: 0, g: 0, b: 0 };
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    r = clamp(Math.round(r), 0, 255);
    g = clamp(Math.round(g), 0, 255);
    b = clamp(Math.round(b), 0, 255);
    var hr = r.toString(16); if (hr.length === 1) hr = '0' + hr;
    var hg = g.toString(16); if (hg.length === 1) hg = '0' + hg;
    var hb = b.toString(16); if (hb.length === 1) hb = '0' + hb;
    return '#' + hr + hg + hb;
  }

  function lerpColor(c1, c2, t) {
    var rgb1 = hexToRgb(c1);
    var rgb2 = hexToRgb(c2);
    var r = lerp(rgb1.r, rgb2.r, t);
    var g = lerp(rgb1.g, rgb2.g, t);
    var b = lerp(rgb1.b, rgb2.b, t);
    return rgbToHex(r, g, b);
  }

  function createShape(type, layerId, x, y, w, h) {
    return {
      id: 'shape_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
      layerId: layerId,
      type: type,
      x: x,
      y: y,
      z: 0,
      w: w,
      h: h,
      d: Math.max(20, Math.min(w, h)),
      fill: currentFill,
      stroke: currentStroke,
      strokeWidth: currentStrokeWidth,
      rotation: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      opacity: currentOpacity,
      text: type === 'text' ? 'Text' : '',
      points: type === 'star' ? 5 : 5,
      keyframes: []
    };
  }

  function createLayer(name) {
    var id = 'layer_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    return {
      id: id,
      name: name || ('Layer ' + (layers.length + 1)),
      visible: true,
      locked: false,
      shapes: []
    };
  }

  function getInterpolated(shape, time) {
    if (!shape.keyframes || shape.keyframes.length === 0) {
      return {
        id: shape.id,
        layerId: shape.layerId,
        type: shape.type,
        text: shape.text,
        points: shape.points,
        x: shape.x,
        y: shape.y,
        z: shape.z || 0,
        w: shape.w,
        h: shape.h,
        d: shape.d !== undefined ? shape.d : 50,
        rotation: shape.rotation || 0,
        rotationX: shape.rotationX || 0,
        rotationY: shape.rotationY || 0,
        rotationZ: shape.rotationZ || 0,
        opacity: shape.opacity !== undefined ? shape.opacity : 1,
        fill: shape.fill || '#4a90e2',
        stroke: shape.stroke || '#ffffff',
        strokeWidth: shape.strokeWidth !== undefined ? shape.strokeWidth : 2
      };
    }

    var kfs = shape.keyframes.slice().sort(function(a, b) { return a.time - b.time; });

    if (time <= kfs[0].time) {
      return Object.assign({}, kfs[0], { id: shape.id, layerId: shape.layerId, type: shape.type, text: shape.text, points: shape.points });
    }
    if (time >= kfs[kfs.length - 1].time) {
      return Object.assign({}, kfs[kfs.length - 1], { id: shape.id, layerId: shape.layerId, type: shape.type, text: shape.text, points: shape.points });
    }

    var k1 = kfs[0], k2 = kfs[kfs.length - 1];
    for (var i = 0; i < kfs.length - 1; i++) {
      if (time >= kfs[i].time && time <= kfs[i + 1].time) {
        k1 = kfs[i];
        k2 = kfs[i + 1];
        break;
      }
    }

    var span = k2.time - k1.time;
    var t = span > 0 ? (time - k1.time) / span : 0;
    t = clamp(t, 0, 1);

    return {
      id: shape.id,
      layerId: shape.layerId,
      type: shape.type,
      text: shape.text,
      points: shape.points,
      x: lerp(k1.x, k2.x, t),
      y: lerp(k1.y, k2.y, t),
      z: lerp(k1.z !== undefined ? k1.z : 0, k2.z !== undefined ? k2.z : 0, t),
      w: lerp(k1.w, k2.w, t),
      h: lerp(k1.h, k2.h, t),
      d: lerp(k1.d !== undefined ? k1.d : 50, k2.d !== undefined ? k2.d : 50, t),
      rotation: lerp(k1.rotation || 0, k2.rotation || 0, t),
      rotationX: lerp(k1.rotationX || 0, k2.rotationX || 0, t),
      rotationY: lerp(k1.rotationY || 0, k2.rotationY || 0, t),
      rotationZ: lerp(k1.rotationZ || 0, k2.rotationZ || 0, t),
      opacity: lerp(k1.opacity !== undefined ? k1.opacity : 1, k2.opacity !== undefined ? k2.opacity : 1, t),
      fill: lerpColor(k1.fill || '#4a90e2', k2.fill || '#4a90e2', t),
      stroke: lerpColor(k1.stroke || '#ffffff', k2.stroke || '#ffffff', t),
      strokeWidth: lerp(k1.strokeWidth !== undefined ? k1.strokeWidth : 2, k2.strokeWidth !== undefined ? k2.strokeWidth : 2, t)
    };
  }

  function setKeyframeForShape(shape, t) {
    if (!shape) return;
    t = parseFloat(t.toFixed(2));
    if (!shape.keyframes) shape.keyframes = [];

    var newKf = {
      time: t,
      x: shape.x,
      y: shape.y,
      z: shape.z || 0,
      w: shape.w,
      h: shape.h,
      d: shape.d !== undefined ? shape.d : 50,
      rotation: shape.rotation || 0,
      rotationX: shape.rotationX || 0,
      rotationY: shape.rotationY || 0,
      rotationZ: shape.rotationZ || 0,
      opacity: shape.opacity !== undefined ? shape.opacity : 1,
      fill: shape.fill || '#4a90e2',
      stroke: shape.stroke || '#ffffff',
      strokeWidth: shape.strokeWidth !== undefined ? shape.strokeWidth : 2
    };

    var existingIdx = -1;
    for (var i = 0; i < shape.keyframes.length; i++) {
      if (Math.abs(shape.keyframes[i].time - t) < 0.04) {
        existingIdx = i;
        break;
      }
    }

    if (existingIdx >= 0) {
      shape.keyframes[existingIdx] = newKf;
    } else {
      shape.keyframes.push(newKf);
      shape.keyframes.sort(function(a, b) { return a.time - b.time; });
    }
  }

  function findShapeById(id) {
    for (var i = 0; i < layers.length; i++) {
      for (var j = 0; j < layers[i].shapes.length; j++) {
        if (layers[i].shapes[j].id === id) {
          return { shape: layers[i].shapes[j], layer: layers[i] };
        }
      }
    }
    return null;
  }

  function getActiveShape() {
    if (!activeShapeId) return null;
    var found = findShapeById(activeShapeId);
    return found ? found.shape : null;
  }

  // Launch Function & App Setup
  function launch() {
    var w = MWO.wm.create({
      id: 'animation-' + Date.now(),
      title: 'Animation Studio',
      icon: 'animation-studio',
      width: 980,
      height: 660,
      x: 40,
      y: 20,
      resizable: true
    });
    winBody = w;

    // Reset default project
    layers = [];
    var defaultLayer = createLayer('Layer 1');
    layers.push(defaultLayer);
    activeLayerId = defaultLayer.id;
    activeShapeId = null;
    currentTime = 0;
    duration = 10;
    fps = 60;
    isPlaying = false;
    is3D = false;
    onionSkin = false;

    // Create default shape
    var demoShape = createShape('rect', defaultLayer.id, 350, 180, 140, 100);
    demoShape.fill = '#4a90e2';
    demoShape.stroke = '#ffffff';
    defaultLayer.shapes.push(demoShape);
    activeShapeId = demoShape.id;

    // Add sample keyframes for immediate tweening demonstration
    setKeyframeForShape(demoShape, 0);
    demoShape.x = 550;
    demoShape.rotation = 90;
    demoShape.fill = '#e74c3c';
    setKeyframeForShape(demoShape, 3);
    demoShape.x = 350;
    demoShape.rotation = 0;
    demoShape.fill = '#4a90e2';

    renderAppHTML();
    initCanvas();
    attachBrushTool();
    brushMode = false;
    updateTimelineUI();
    updatePropsPanel();
    startRenderLoop();
  }

  function renderAppHTML() {
    winBody.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#14161f;color:#eee;font-family:var(--font, sans-serif);user-select:none;overflow:hidden">
        <!-- TOP TOOLBAR -->
        <div style="display:flex;align-items:center;padding:6px 12px;gap:8px;background:#1e2230;border-bottom:1px solid rgba(255,255,255,0.08);flex-wrap:wrap">
 <span style="font-weight:bold;font-size:0.95em;margin-right:6px;display:flex;align-items:center;gap:4px"> Animation Studio</span>
          <button class="mw-btn" id="anim-btn-new" style="font-size:0.78em;padding:4px 10px">New</button>
          <button class="mw-btn" id="anim-btn-open" style="font-size:0.78em;padding:4px 10px">Dir Open</button>
 <button class="mw-btn" id="anim-btn-save" style="font-size:0.78em;padding:4px 10px"> Save</button>
 <button class="mw-btn primary" id="anim-btn-export" style="font-size:0.78em;padding:4px 12px">Export Video</button>
          <button class="mw-btn" id="anim-btn-export-png" style="font-size:0.78em;padding:4px 10px">Export Frame PNG</button>
          <button class="mw-btn" id="anim-btn-import-imgs" style="font-size:0.78em;padding:4px 10px">Import Image Frames</button>
          <div style="height:18px;border-left:1px solid rgba(255,255,255,0.12);margin:0 4px"></div>
 <button class="mw-btn" id="anim-btn-mode3d" style="font-size:0.78em;padding:4px 10px;background:rgba(255,255,255,0.06)"> Mode: 2D</button>
 <button class="mw-btn" id="anim-btn-bones" style="font-size:0.78em;padding:4px 10px">Bones: OFF</button>
        <button class="mw-btn" id="anim-btn-onionskin" style="font-size:0.78em;padding:4px 10px">Onion Skin: OFF</button>
<button class="mw-btn" id="anim-tool-brush" style="font-size:0.78em;padding:4px 10px">Brush: OFF</button>
          <button class="mw-btn" id="anim-btn-resetview" style="font-size:0.78em;padding:4px 8px"> Reset View</button>
        </div>

        <!-- MAIN WORKSPACE -->
        <div style="display:flex;flex:1;overflow:hidden;position:relative">
          <!-- LEFT TOOLBAR -->
          <div style="width:48px;background:#181a26;border-right:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;align-items:center;padding:8px 2px;gap:6px;z-index:2">
 <button class="anim-tool-btn active" id="tool-select" title="Select / Transform (Arrow)" style="width:36px;height:36px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.12);color:#fff;cursor:pointer;font-size:1.1em"></button>
 <button class="anim-tool-btn" id="tool-rect" title="Rectangle" style="width:36px;height:36px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);background:transparent;color:#ccc;cursor:pointer;font-size:1.1em"></button>
 <button class="anim-tool-btn" id="tool-ellipse" title="Ellipse / Circle" style="width:36px;height:36px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);background:transparent;color:#ccc;cursor:pointer;font-size:1.1em"></button>
 <button class="anim-tool-btn" id="tool-line" title="Line" style="width:36px;height:36px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);background:transparent;color:#ccc;cursor:pointer;font-size:1.1em"></button>
 <button class="anim-tool-btn" id="tool-text" title="Text" style="width:36px;height:36px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);background:transparent;color:#ccc;cursor:pointer;font-size:1.1em"></button>
            <button class="anim-tool-btn" id="tool-star" title="Star" style="width:36px;height:36px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);background:transparent;color:#ccc;cursor:pointer;font-size:1.1em">Star</button>
            <button class="anim-tool-btn" id="tool-orbit" title="3D Orbit Camera" style="width:36px;height:36px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);background:transparent;color:#ccc;cursor:pointer;font-size:1.1em;display:none"></button>
          </div>

          <!-- CENTER STAGE / CANVAS -->
          <div id="anim-stage-container" style="flex:1;background:#0d0e15;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;touch-action:none">
            <div id="anim-stage-badge" style="position:absolute;top:10px;left:10px;padding:4px 10px;background:rgba(0,0,0,0.6);border-radius:12px;font-size:0.72em;color:#aaa;pointer-events:none;z-index:3;backdrop-filter:blur(4px)">2D Stage | 800x480</div>
            <canvas id="anim-canvas" style="background:#11131c;box-shadow:0 0 25px rgba(0,0,0,0.7);cursor:crosshair;touch-action:none"></canvas>
          </div>

          <!-- RIGHT PROPERTIES PANEL -->
          <div style="width:230px;background:#181a26;border-left:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;overflow-y:auto;padding:10px;gap:10px;font-size:0.8em;z-index:2">
            <div style="font-weight:bold;color:var(--accent,#4a90e2);border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:4px;display:flex;align-items:center;justify-content:space-between">
              <span>Properties</span>
              <span id="anim-prop-type" style="font-weight:normal;color:#aaa;font-size:0.9em"></span>
            </div>

            <div id="anim-props-content" style="display:flex;flex-direction:column;gap:8px">
              <!-- Dynamically populated properties -->
              <div style="color:#888;font-style:italic;padding:10px 0;text-align:center">No shape selected</div>
            </div>
          </div>
        </div>

        <!-- BOTTOM TIMELINE PANEL -->
        <div style="height:210px;background:#161823;border-top:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;z-index:2">
          <!-- TIMELINE CONTROLS -->
          <div style="padding:6px 12px;background:#1c1f2e;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.06);flex-wrap:wrap">
            <button class="mw-btn primary" id="anim-play-btn" style="font-size:0.8em;padding:4px 12px;min-width:65px">Run Play</button>
            <button class="mw-btn" id="anim-stop-btn" style="font-size:0.8em;padding:4px 10px">⏹ Stop</button>
 <button class="mw-btn" id="anim-loop-btn" style="font-size:0.8em;padding:4px 10px;background:rgba(255,255,255,0.1)"> Loop: ON</button>
 <button class="mw-btn" id="anim-keyframe-btn" title="Set Keyframe for selected shape at current time" style="font-size:0.8em;padding:4px 10px;background:#2d3550;color:#50e0e0;border:1px solid #50e0e0"> Keyframe</button>
            
            <div style="height:16px;border-left:1px solid rgba(255,255,255,0.12)"></div>
            <span id="anim-time-display" style="font-family:var(--mono,monospace);font-size:0.82em;color:#4f4;min-width:140px">0.0s / 10.0s (F: 0)</span>

            <div style="height:16px;border-left:1px solid rgba(255,255,255,0.12)"></div>
            <label style="font-size:0.75em;color:#aaa;display:flex;align-items:center;gap:4px">
              Dur: <input type="number" id="anim-input-duration" value="10" min="1" max="120" step="1" style="width:45px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:2px 4px;font-size:0.9em">s
            </label>

            <button class="mw-btn" id="anim-add-layer-btn" style="font-size:0.78em;padding:4px 10px;margin-left:auto">+ Add Layer</button>
          </div>

          <!-- TIMELINE BODY (LAYERS + TRACKS) -->
          <div style="flex:1;display:flex;overflow:hidden;position:relative">
            <!-- LAYERS LIST -->
            <div id="anim-layer-list" style="width:190px;background:#181a26;border-right:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;overflow-y:auto;overflow-x:hidden">
              <div style="padding:4px 8px;font-size:0.72em;color:#888;background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.06);font-weight:bold">LAYERS</div>
              <div id="anim-layer-rows" style="display:flex;flex-direction:column"></div>
            </div>

            <!-- TRACKS AREA -->
            <div id="anim-track-area" style="flex:1;display:flex;flex-direction:column;overflow-x:auto;overflow-y:auto;position:relative;background:#131520">
              <!-- RULER TRACK -->
              <div id="anim-ruler-track" style="height:24px;background:#1a1d2c;border-bottom:1px solid rgba(255,255,255,0.08);position:relative;min-width:600px;cursor:pointer">
                <canvas id="anim-ruler-canvas" style="width:100%;height:100%"></canvas>
              </div>

              <!-- TRACK ROWS CONTAINER -->
              <div id="anim-track-rows" style="display:flex;flex-direction:column;position:relative;min-width:600px;flex:1">
                <!-- PLAYHEAD OVERLAY LINE -->
                <div id="anim-playhead-line" style="position:absolute;top:0;bottom:0;width:2px;background:#ff3366;z-index:5;pointer-events:none;left:0">
                  <div style="width:10px;height:10px;background:#ff3366;transform:rotate(45deg);margin-left:-4px;margin-top:-5px"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindUIEvents();
  }

  function bindUIEvents() {
    // Toolbar buttons
    document.getElementById('anim-btn-new').onclick = function() {
      if (confirm('Create new project? Unsaved changes will be lost.')) launch();
    };
    document.getElementById('anim-btn-open').onclick = openProject;
    document.getElementById('anim-btn-save').onclick = saveProject;
    document.getElementById('anim-btn-export').onclick = exportVideo;

    // props panel is re-rendered on every selection: delegate the frame-duration field
    document.getElementById('anim-props-content').addEventListener('change', function(e) {
      if (e.target && e.target.id === 'prop-framedur') {
        var shape = getActiveShape();
        if (!shape) return;
        var v = parseFloat(e.target.value);
        if (isFinite(v) && v >= 0.02) {
          shape.frameDur = v;
          MWO.notif.show('Animation Studio', 'Frame duration: ' + v + 's (' + Math.round(1 / v) + ' fps).');
        }
      }
    });

    // Export the CURRENT frame as a PNG (device download + copy in /Pictures)
    document.getElementById('anim-btn-export-png').onclick = function() {
      try {
        var data = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = data;
        a.download = 'mwo-frame-' + Math.round(currentTime * 1000) + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        MWO.fs.mkdir('/Pictures').then(function() {
          return MWO.fs.writeFile('/Pictures/frame-' + Date.now() + '.png', data);
        }).then(function() {
          MWO.notif.show('Animation Studio', 'Frame exported to your device (also saved in Pictures).');
        }).catch(function() {
          MWO.notif.show('Animation Studio', 'Frame exported to your device.');
        });
      } catch (e) {
        MWO.notif.show('Animation Studio', 'Export failed: ' + e.message);
      }
    };

    // Import images as ANIMATION FRAMES: every selected image becomes one
    // frame of an image-sequence shape, played back on the timeline.
    // Onion skin shows the neighbouring frames as ghosts while you edit.
    document.getElementById('anim-btn-import-imgs').onclick = function() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = function(ev) {
        var files = Array.prototype.slice.call(ev.target.files || []);
        if (!files.length) return;
        var layer = layers.find(function(l) { return l.id === activeLayerId; }) || layers[0];
        if (!layer) return;
        var seqShape = null;
        for (var i = 0; i < layer.shapes.length; i++) {
          if (layer.shapes[i].type === 'image' && layer.shapes[i].imgs && layer.shapes[i].imgs.length) { seqShape = layer.shapes[i]; break; }
        }
        if (!seqShape) {
          seqShape = createShape('image', layer.id, 200, 140, 320, 240);
          seqShape.type = 'image';
          seqShape.fill = 'none';
          seqShape.stroke = 'none';
          seqShape.imgs = [];
          seqShape.frameDur = 0.12; // seconds per frame (adjustable in the props panel)
          layer.shapes.push(seqShape);
          activeShapeId = seqShape.id;
        }
        var target = seqShape.imgs;
        var done = 0;
        files.forEach(function(f, idx) {
          var rd = new FileReader();
          rd.onload = function(e2) {
            var img = new Image();
            img.onload = function() {
              target[idx] = img;
              done++;
              if (!seqShape.imgW && img.width) { seqShape.imgW = img.width; seqShape.imgH = img.height; seqShape.w = img.width; seqShape.h = img.height; seqShape.x = Math.max(20, (canvas.width - img.width) / 2); seqShape.y = Math.max(20, (canvas.height - img.height) / 2); }
              if (done === files.length) {
                duration = Math.max(duration, Math.ceil(seqShape.imgs.length * (seqShape.frameDur || 0.12) * 10) / 10);
                updateTimelineUI();
                updatePropsPanel();
                MWO.notif.show('Animation Studio', done + ' frame(s) imported. Each image = 1 frame at ' + (1 / (seqShape.frameDur || 0.12)).toFixed(0) + ' fps. Turn on Onion Skin to see neighbours while you work.');
              }
            };
            img.src = e2.target.result;
          };
          rd.readAsDataURL(f);
        });
      };
      input.click();
    };

    document.getElementById('anim-btn-mode3d').onclick = function() {
      is3D = !is3D;
 this.textContent = is3D? ' Mode: 3D': ' Mode: 2D';
      this.style.background = is3D ? '#3d2e50' : 'rgba(255,255,255,0.06)';
      document.getElementById('tool-orbit').style.display = is3D ? 'block' : 'none';
      document.getElementById('anim-stage-badge').textContent = is3D ? '3D Stage | Orbit: Right-Drag or Orbit Tool' : '2D Stage | 800x480';
      updatePropsPanel();
      renderCanvas();
    };

    document.getElementById('anim-btn-onionskin').onclick = function() {
      onionSkin = !onionSkin;
 this.textContent = onionSkin ? 'Onion Skin: ON' : 'Onion Skin: OFF';
      this.style.background = onionSkin ? '#2d4530' : 'transparent';
      renderCanvas();
    };

    document.getElementById('anim-btn-resetview').onclick = function() {
      zoom = 1;
      panX = 0;
      panY = 0;
      camera3D = { x: 0, y: 0, z: -400, rotX: 0.3, rotY: 0.4, fov: 400 };
      renderCanvas();
    };

    // Tools
    var tools = ['select', 'rect', 'ellipse', 'line', 'text', 'star', 'orbit'];
    tools.forEach(function(t) {
      var btn = document.getElementById('tool-' + t);
      if (btn) {
        btn.onclick = function() {
          activeTool = t;
          tools.forEach(function(ot) {
            var ob = document.getElementById('tool-' + ot);
            if (ob) {
              ob.classList.remove('active');
              ob.style.background = 'transparent';
              ob.style.borderColor = 'rgba(255,255,255,0.05)';
            }
          });
          btn.classList.add('active');
          btn.style.background = 'rgba(255,255,255,0.12)';
          btn.style.borderColor = 'rgba(255,255,255,0.1)';
        };
      }
    });

    // Timeline Controls
    var playBtn = document.getElementById('anim-play-btn');
    playBtn.onclick = function() {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    };

    document.getElementById('anim-stop-btn').onclick = function() {
      pause();
      currentTime = 0;
      updateTimeDisplay();
      renderCanvas();
      updatePlayheadPosition();
    };

    var loopBtn = document.getElementById('anim-loop-btn');
    loopBtn.onclick = function() {
      isLooping = !isLooping;
 loopBtn.textContent = isLooping? ' Loop: ON': ' Loop: OFF';
      loopBtn.style.background = isLooping ? 'rgba(255,255,255,0.1)' : 'transparent';
    };

    document.getElementById('anim-keyframe-btn').onclick = function() {
      var s = getActiveShape();
      if (s) {
        setKeyframeForShape(s, currentTime);
        MWO.notif.show('Keyframe Set', 'Set keyframe at ' + currentTime.toFixed(1) + 's');
        updateTimelineUI();
        updatePropsPanel();
        renderCanvas();
      } else {
        MWO.notif.show('Keyframe', 'Select a shape first to add a keyframe');
      }
    };

    document.getElementById('anim-input-duration').onchange = function() {
      var val = parseFloat(this.value);
      if (val && val >= 1 && val <= 300) {
        duration = val;
        if (currentTime > duration) currentTime = duration;
        updateTimeDisplay();
        updateTimelineUI();
        renderCanvas();
      }
    };

    document.getElementById('anim-add-layer-btn').onclick = function() {
      var layer = createLayer('Layer ' + (layers.length + 1));
      layers.push(layer);
      activeLayerId = layer.id;
      updateTimelineUI();
      renderCanvas();
    };

    // Keyboard shortcuts
    var winKeyHandler = function(e) {
      if (!winBody || !winBody.isConnected) {
        window.removeEventListener('keydown', winKeyHandler);
        return;
      }
      var tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) pause(); else play();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        var s = getActiveShape();
        if (s) {
          e.preventDefault();
          deleteActiveShape();
        }
      }
    };
    window.addEventListener('keydown', winKeyHandler);
  }

  function deleteActiveShape() {
    if (!activeShapeId) return;
    for (var i = 0; i < layers.length; i++) {
      var idx = layers[i].shapes.findIndex(function(s) { return s.id === activeShapeId; });
      if (idx >= 0) {
        layers[i].shapes.splice(idx, 1);
        activeShapeId = null;
        updatePropsPanel();
        updateTimelineUI();
        renderCanvas();
        MWO.notif.show('Animation Studio', 'Deleted shape');
        break;
      }
    }
  }

  // Canvas Setup & Pointer Interaction
  
  // ---- Bones tool: click-drag to add a bone; each new bone's parent is the previous one ----
  function attachBonesTool() {
    if (!canvas || canvas.__bonesBound) { if (!canvas) setTimeout(attachBonesTool, 300); return; }
    canvas.__bonesBound = true;
    var btn = document.getElementById('anim-btn-bones');
    if (btn) btn.onclick = function() {
      bonesMode = !bonesMode;
      this.style.background = bonesMode ? '#2d4530' : 'transparent';
      this.textContent = bonesMode ? 'Bones: ON' : 'Bones: OFF';
    };
    var startPt = null, lastBoneId = null;
    canvas.addEventListener('pointerdown', function(e) {
      if (!bonesMode) return;
      e.stopPropagation();
      startPt = getCanvasCoords(e);
    }, true);
    canvas.addEventListener('pointerup', function(e) {
      if (!bonesMode || !startPt) { startPt = null; return; }
      e.stopPropagation();
      var endPt = getCanvasCoords(e);
      var dx = endPt.x - startPt.x, dy = endPt.y - startPt.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 12) { startPt = null; return; }
      var layer = layers.find(function(l) { return l.id === activeLayerId; });
      if (!layer) { startPt = null; return; }
      var bone = { id: 'shape_' + Date.now() + '_' + Math.floor(Math.random() * 1000), type: 'bone', x: startPt.x, y: startPt.y, w: 8, h: 8, rotation: Math.atan2(dy, dx), length: len, parent: lastBoneId, fill: 'none', stroke: '#f4d35e', strokeWidth: 5, keyframes: [] };
      setKeyframeForShape(bone, 0);
      layer.shapes.push(bone);
      activeShapeId = bone.id;
      lastBoneId = bone.id;
      startPt = null;
      updateTimelineUI(); updatePropsPanel();
    }, true);
  }

  function attachBrushTool() {
    if (!canvas) { setTimeout(attachBrushTool, 300); return; }
    if (canvas.__brushBound) return;
    canvas.__brushBound = true;
    var brushMode = false, brushing = false, brushPoints = [];
    var brushBtn = document.getElementById('anim-tool-brush');
    if (brushBtn) brushBtn.onclick = function() {
      brushMode = !brushMode;
      this.textContent = brushMode ? 'Brush: ON' : 'Brush: OFF';
      this.style.background = brushMode ? '#2d4530' : 'transparent';
      MWO.notif.show('Animation Studio', brushMode ? 'Brush on: drag on the canvas to draw a real shape you can animate.' : 'Brush off.');
    };
    canvas.addEventListener('pointerdown', function(e) {
      if (!brushMode) return;
      e.stopPropagation(); e.preventDefault();
      brushing = true; brushPoints = [];
      var c = getCanvasCoords(e);
      brushPoints.push({ x: c.x, y: c.y });
    }, true);
    canvas.addEventListener('pointermove', function(e) {
      if (!brushing) return;
      e.stopPropagation();
      var c = getCanvasCoords(e);
      brushPoints.push({ x: c.x, y: c.y });
      ctx.save();
      ctx.strokeStyle = '#4a90e2'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(brushPoints[0].x, brushPoints[0].y);
      for (var i = 1; i < brushPoints.length; i++) ctx.lineTo(brushPoints[i].x, brushPoints[i].y);
      ctx.stroke(); ctx.restore();
    }, true);
    canvas.addEventListener('pointerup', function(e) {
      if (!brushing) return;
      e.stopPropagation();
      brushing = false;
      if (brushPoints.length < 2) { brushPoints = []; return; }
      var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
      brushPoints.forEach(function(p) { minx = Math.min(minx, p.x); miny = Math.min(miny, p.y); maxx = Math.max(maxx, p.x); maxy = Math.max(maxy, p.y); });
      var rel = brushPoints.map(function(p) { return { x: p.x - minx, y: p.y - miny }; });
      var lay = layers.find(function(l) { return l.id === activeLayerId; }) || layers[0];
      var brushShape = {
        id: 'shape_' + Date.now(), type: 'path',
        x: minx, y: miny, w: Math.max(1, maxx - minx), h: Math.max(1, maxy - miny),
        fill: 'none', stroke: '#ffffff', strokeWidth: 3, rotation: 0, opacity: 1,
        points: rel, keyframes: []
      };
      lay.shapes.push(brushShape);
      setKeyframeForShape(brushShape, 0);
      activeShapeId = brushShape.id;
      updatePropsPanel();
      MWO.notif.show('Animation Studio', 'Stroke captured (' + brushPoints.length + ' points). Set keyframes on it to animate.');
      brushPoints = [];
    }, true);
  }
  attachBrushTool();

  function initCanvas() {
    canvas = document.getElementById('anim-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();

    var stageContainer = document.getElementById('anim-stage-container');
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function() { resizeCanvas(); });
      ro.observe(stageContainer);
    }

    // Pointer Events for Drawing / Moving / Resizing / Orbiting
    canvas.onpointerdown = handlePointerDown;
    canvas.onpointermove = handlePointerMove;
    canvas.onpointerup = handlePointerUp;
    canvas.onpointercancel = handlePointerUp;

    // Wheel zoom
    canvas.onwheel = function(e) {
      e.preventDefault();
      var zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      if (is3D) {
        camera3D.fov = clamp(camera3D.fov * zoomFactor, 100, 2000);
      } else {
        zoom = clamp(zoom * zoomFactor, 0.2, 5);
      }
      renderCanvas();
    };

    // Touch events for pinch zoom
    canvas.ontouchstart = function(e) {
      if (e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.sqrt(dx * dx + dy * dy);
        initialZoom = zoom;
      }
    };

    canvas.ontouchmove = function(e) {
      if (e.touches.length === 2 && initialPinchDist > 0) {
        e.preventDefault();
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var scale = dist / initialPinchDist;
        zoom = clamp(initialZoom * scale, 0.2, 5);
        renderCanvas();
      }
    };
  }

  function resizeCanvas() {
    var stageContainer = document.getElementById('anim-stage-container');
    if (!stageContainer || !canvas) return;
    canvas.width = Math.max(300, stageContainer.clientWidth - 20);
    canvas.height = Math.max(200, stageContainer.clientHeight - 20);
    renderCanvas();
  }

  function getCanvasCoords(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    var clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    var x = (clientX - rect.left) * (canvas.width / rect.width);
    var y = (clientY - rect.top) * (canvas.height / rect.height);

    if (!is3D) {
      x = (x - canvas.width / 2 - panX) / zoom + canvas.width / 2;
      y = (y - canvas.height / 2 - panY) / zoom + canvas.height / 2;
    }
    return { x: x, y: y };
  }

  function handlePointerDown(e) {
    canvas.setPointerCapture(e.pointerId);
    var pos = getCanvasCoords(e);
    dragStartPos = pos;
    isDragging = true;

    // Right click or Orbit tool -> Orbit 3D camera
    if (e.button === 2 || activeTool === 'orbit' || (is3D && e.shiftKey)) {
      dragAction = 'orbit';
      return;
    }

    if (activeTool === 'select') {
      var selShape = getActiveShape();
      if (selShape && !is3D) {
        var interp = getInterpolated(selShape, currentTime);
        var handle = hitTestHandles(interp, pos.x, pos.y);
        if (handle) {
          dragAction = 'handle';
          dragHandle = handle;
          dragStartShape = Object.assign({}, selShape);
          return;
        }
      }

      // Hit test shape
      var hit = hitTestShapes(pos.x, pos.y);
      if (hit) {
        activeShapeId = hit.id;
        activeLayerId = hit.layerId;
        dragAction = 'move';
        dragStartShape = Object.assign({}, hit);
        updatePropsPanel();
        updateTimelineUI();
      } else {
        activeShapeId = null;
        dragAction = 'pan';
        updatePropsPanel();
      }
      renderCanvas();
    } else if (['rect', 'ellipse', 'line', 'text', 'star'].includes(activeTool)) {
      var actLayer = layers.find(function(l) { return l.id === activeLayerId; });
      if (!actLayer) {
        if (layers.length === 0) layers.push(createLayer('Layer 1'));
        actLayer = layers[0];
        activeLayerId = actLayer.id;
      }
      if (actLayer.locked) {
        MWO.notif.show('Layer Locked', 'Unlock layer to draw shapes');
        return;
      }

      dragAction = 'draw';
      tempDrawShape = createShape(activeTool, actLayer.id, pos.x, pos.y, 10, 10);
      if (activeTool === 'text') {
        var txt = prompt('Enter text:', 'Animation Studio');
        if (txt) tempDrawShape.text = txt;
      }
    }
  }

  function handlePointerMove(e) {
    if (!isDragging) return;
    var pos = getCanvasCoords(e);
    var dx = pos.x - dragStartPos.x;
    var dy = pos.y - dragStartPos.y;

    if (dragAction === 'orbit') {
      camera3D.rotY += (e.movementX || 0) * 0.01;
      camera3D.rotX += (e.movementY || 0) * 0.01;
      renderCanvas();
      return;
    }

    if (dragAction === 'pan') {
      panX += (e.movementX || 0);
      panY += (e.movementY || 0);
      renderCanvas();
      return;
    }

    if (dragAction === 'draw' && tempDrawShape) {
      tempDrawShape.w = Math.max(10, Math.abs(dx));
      tempDrawShape.h = Math.max(10, Math.abs(dy));
      tempDrawShape.x = Math.min(dragStartPos.x, pos.x);
      tempDrawShape.y = Math.min(dragStartPos.y, pos.y);
      tempDrawShape.d = Math.max(10, Math.min(tempDrawShape.w, tempDrawShape.h));
      renderCanvas();
      return;
    }

    var selShape = getActiveShape();
    if (!selShape) return;

    if (dragAction === 'move') {
      selShape.x = dragStartShape.x + dx;
      selShape.y = dragStartShape.y + dy;
      
      // If keyframe exists at currentTime, update it automatically
      var existingKf = (selShape.keyframes || []).find(function(k) { return Math.abs(k.time - currentTime) < 0.04; });
      if (existingKf) {
        existingKf.x = selShape.x;
        existingKf.y = selShape.y;
      }
      updatePropsPanel();
      renderCanvas();
    } else if (dragAction === 'handle' && dragHandle) {
      if (dragHandle === 'rot') {
        var cx = dragStartShape.x + dragStartShape.w / 2;
        var cy = dragStartShape.y + dragStartShape.h / 2;
        var angle = Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI) + 90;
        selShape.rotation = Math.round(angle % 360);
      } else {
        if (dragHandle.includes('e')) selShape.w = Math.max(10, dragStartShape.w + dx);
        if (dragHandle.includes('s')) selShape.h = Math.max(10, dragStartShape.h + dy);
        if (dragHandle.includes('w')) {
          var nw = Math.max(10, dragStartShape.w - dx);
          selShape.x = dragStartShape.x + (dragStartShape.w - nw);
          selShape.w = nw;
        }
        if (dragHandle.includes('n')) {
          var nh = Math.max(10, dragStartShape.h - dy);
          selShape.y = dragStartShape.y + (dragStartShape.h - nh);
          selShape.h = nh;
        }
      }
      var existingKf = (selShape.keyframes || []).find(function(k) { return Math.abs(k.time - currentTime) < 0.04; });
      if (existingKf) {
        existingKf.w = selShape.w;
        existingKf.h = selShape.h;
        existingKf.rotation = selShape.rotation;
      }
      updatePropsPanel();
      renderCanvas();
    }
  }

  function handlePointerUp(e) {
    if (isDragging && dragAction === 'draw' && tempDrawShape) {
      var actLayer = layers.find(function(l) { return l.id === activeLayerId; });
      if (actLayer) {
        actLayer.shapes.push(tempDrawShape);
        activeShapeId = tempDrawShape.id;
        // Auto set initial keyframe at 0s
        setKeyframeForShape(tempDrawShape, 0);
        updateTimelineUI();
        updatePropsPanel();
      }
      tempDrawShape = null;
      activeTool = 'select';
      var selectBtn = document.getElementById('tool-select');
      if (selectBtn) selectBtn.click();
    }

    isDragging = false;
    dragAction = null;
    dragHandle = null;
    renderCanvas();
  }

  // Hit Testing Helpers
  function hitTestShapes(x, y) {
    for (var i = layers.length - 1; i >= 0; i--) {
      if (!layers[i].visible || layers[i].locked) continue;
      for (var j = layers[i].shapes.length - 1; j >= 0; j--) {
        var rawShape = layers[i].shapes[j];
        var s = getInterpolated(rawShape, currentTime);

        if (!is3D) {
          // Unrotate point around shape center
          var cx = s.x + s.w / 2;
          var cy = s.y + s.h / 2;
          var rad = (-s.rotation * Math.PI) / 180;
          var rx = (x - cx) * Math.cos(rad) - (y - cy) * Math.sin(rad) + cx;
          var ry = (x - cx) * Math.sin(rad) + (y - cy) * Math.cos(rad) + cy;

          if (rx >= s.x && rx <= s.x + s.w && ry >= s.y && ry <= s.y + s.h) {
            return rawShape;
          }
        } else {
          // Bounding box hit test in 3D projection
          if (x >= s.x - 20 && x <= s.x + s.w + 20 && y >= s.y - 20 && y <= s.y + s.h + 20) {
            return rawShape;
          }
        }
      }
    }
    return null;
  }

  function hitTestHandles(s, x, y) {
    var handles = getHandlePositions(s);
    for (var h in handles) {
      var hp = handles[h];
      if (Math.abs(x - hp.x) <= 8 && Math.abs(y - hp.y) <= 8) {
        return h;
      }
    }
    return null;
  }

  function getHandlePositions(s) {
    var cx = s.x + s.w / 2;
    var cy = s.y + s.h / 2;
    var rad = (s.rotation * Math.PI) / 180;

    var rotatePoint = function(px, py) {
      var rx = (px - cx) * Math.cos(rad) - (py - cy) * Math.sin(rad) + cx;
      var ry = (px - cx) * Math.sin(rad) + (py - cy) * Math.cos(rad) + cy;
      return { x: rx, y: ry };
    };

    return {
      nw: rotatePoint(s.x, s.y),
      n:  rotatePoint(s.x + s.w / 2, s.y),
      ne: rotatePoint(s.x + s.w, s.y),
      e:  rotatePoint(s.x + s.w, s.y + s.h / 2),
      se: rotatePoint(s.x + s.w, s.y + s.h),
      s:  rotatePoint(s.x + s.w / 2, s.y + s.h),
      sw: rotatePoint(s.x, s.y + s.h),
      w:  rotatePoint(s.x, s.y + s.h / 2),
      rot: rotatePoint(s.x + s.w / 2, s.y - 25)
    };
  }

  // RENDERING PIPELINE
  // ---- Smart bones (Moho-style): rotating a parent bone moves its children ----
  function boneChainAngle(shape) {
    var ang = (shape.rotation || 0);
    var p = shape.parent ? findShapeById(shape.parent) : null;
    var guard = 0;
    while (p && guard < 24) {
      ang += (p.rotation || 0);
      p = p.parent ? findShapeById(p.parent) : null;
      guard++;
    }
    return ang;
  }

  function renderCanvas() {
    if (!ctx || !canvas) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Viewport Pan & Zoom
    if (!is3D) {
      ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);
      ctx.scale(zoom, zoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Draw stage background paper
      ctx.fillStyle = '#1e2230';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#0f111a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      draw3DGrid();
    }

    // ONION SKINNING PASS
    if (onionSkin) {
      var ghostTimes = [currentTime - 0.2, currentTime - 0.1, currentTime + 0.1, currentTime + 0.2];
      var ghostAlphas = [0.12, 0.25, 0.25, 0.12];
      ghostTimes.forEach(function(gt, idx) {
        if (gt >= 0 && gt <= duration && Math.abs(gt - currentTime) > 0.02) {
          if (!is3D) {
            render2DScene(gt, true, ghostAlphas[idx]);
          } else {
            render3DScene(gt, true, ghostAlphas[idx]);
          }
        }
      });
    }

    // CURRENT FRAME PASS
    if (!is3D) {
      render2DScene(currentTime, false, 1.0);
    } else {
      render3DScene(currentTime, false, 1.0);
    }

    // TEMP DRAW PREVIEW
    if (tempDrawShape) {
      renderSingle2DShape(tempDrawShape, false);
    }

    ctx.restore();
  }

  function render2DScene(time, isGhost, alphaMult) {
    layers.forEach(function(layer) {
      if (!layer.visible) return;
      layer.shapes.forEach(function(rawShape) {
        var s = getInterpolated(rawShape, time);
        // image sequences: pick the frame for this point in time
        if (rawShape.type === 'bone' && rawShape.parent) {
          var par = findShapeById(rawShape.parent);
          var chain = 0, gp = par, gguard = 0;
          while (gp && gguard < 24) { chain += (gp.rotation || 0); gp = gp.parent ? findShapeById(gp.parent) : null; gguard++; }
          s.rotation = (s.rotation || 0) + chain;
        }
        if (rawShape.type === 'image' && rawShape.imgs && rawShape.imgs.length) {
          var fd = rawShape.frameDur || 0.12;
          var cyc = rawShape.imgs.length * fd;
          var fi = Math.floor((time % cyc) / fd);
          s.frameIndex = Math.min(rawShape.imgs.length - 1, Math.max(0, fi));
        }
        renderSingle2DShape(s, isGhost, alphaMult, rawShape.id === activeShapeId);
      });
    });
  }

  function renderSingle2DShape(s, isGhost, alphaMult, isSelected) {
    ctx.save();
    ctx.globalAlpha = (s.opacity !== undefined ? s.opacity : 1) * (alphaMult || 1);

    var cx = s.x + s.w / 2;
    var cy = s.y + s.h / 2;

    ctx.translate(cx, cy);
    ctx.rotate(((s.rotation || 0) * Math.PI) / 180);

    var halfW = s.w / 2;
    var halfH = s.h / 2;

    if (s.type === 'image') {
      var imgs = s.imgs || [];
      var im = imgs[s.frameIndex !== undefined ? s.frameIndex : 0];
      if (im && im.complete && im.naturalWidth) {
        if (isGhost) ctx.globalAlpha *= 0.9;
        ctx.drawImage(im, -halfW, -halfH, s.w, s.h);
      }
    } else if (s.type === 'path') {
      ctx.strokeStyle = s.stroke || '#fff';
      ctx.lineWidth = Math.max(1, s.strokeWidth || 3);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      if (s.points && s.points.length) {
        ctx.moveTo(s.points[0].x - s.w/2, s.points[0].y - s.h/2);
        for (var pi = 1; pi < s.points.length; pi++) ctx.lineTo(s.points[pi].x - s.w/2, s.points[pi].y - s.h/2);
      }
      ctx.stroke();
    } else if (s.type === 'bone') {
      ctx.strokeStyle = s.stroke || '#f4d35e';
      ctx.lineWidth = Math.max(2, s.strokeWidth || 5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s.w / 2, -s.h / 2);
      ctx.lineTo(-s.w / 2 + (s.length || 60), -s.h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s.w / 2, -s.h / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = s.stroke || '#f4d35e';
      ctx.fill();
    } else if (s.type === 'rect') {
      ctx.fillStyle = isGhost ? '#88aaff' : s.fill;
      ctx.fillRect(-halfW, -halfH, s.w, s.h);
      if (s.strokeWidth > 0) {
        ctx.strokeStyle = isGhost ? '#5588cc' : s.stroke;
        ctx.lineWidth = s.strokeWidth;
        ctx.strokeRect(-halfW, -halfH, s.w, s.h);
      }
    } else if (s.type === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1, Math.abs(halfW)), Math.max(1, Math.abs(halfH)), 0, 0, Math.PI * 2);
      ctx.fillStyle = isGhost ? '#88aaff' : s.fill;
      ctx.fill();
      if (s.strokeWidth > 0) {
        ctx.strokeStyle = isGhost ? '#5588cc' : s.stroke;
        ctx.lineWidth = s.strokeWidth;
        ctx.stroke();
      }
    } else if (s.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(-halfW, -halfH);
      ctx.lineTo(halfW, halfH);
      ctx.strokeStyle = isGhost ? '#88aaff' : (s.stroke || s.fill);
      ctx.lineWidth = Math.max(1, s.strokeWidth || 2);
      ctx.stroke();
    } else if (s.type === 'text') {
      var fontSize = Math.max(10, Math.round(s.h));
      ctx.font = fontSize + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isGhost ? '#88aaff' : s.fill;
      ctx.fillText(s.text || 'Text', 0, 0);
      if (s.strokeWidth > 0) {
        ctx.strokeStyle = isGhost ? '#5588cc' : s.stroke;
        ctx.lineWidth = s.strokeWidth;
        ctx.strokeText(s.text || 'Text', 0, 0);
      }
    } else if (s.type === 'star') {
      var pts = s.points || 5;
      var outerR = Math.min(Math.abs(s.w), Math.abs(s.h)) / 2;
      var innerR = outerR * 0.4;
      ctx.beginPath();
      for (var p = 0; p < pts * 2; p++) {
        var r = (p % 2 === 0) ? outerR : innerR;
        var a = (p * Math.PI) / pts - Math.PI / 2;
        var px = Math.cos(a) * r;
        var py = Math.sin(a) * r;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = isGhost ? '#88aaff' : s.fill;
      ctx.fill();
      if (s.strokeWidth > 0) {
        ctx.strokeStyle = isGhost ? '#5588cc' : s.stroke;
        ctx.lineWidth = s.strokeWidth;
        ctx.stroke();
      }
    }

    ctx.restore();

    // Render Selection Handles
    if (isSelected && !isGhost) {
      drawSelectionOutlineAndHandles(s);
    }
  }

  function drawSelectionOutlineAndHandles(s) {
    ctx.save();
    var cx = s.x + s.w / 2;
    var cy = s.y + s.h / 2;
    var rad = ((s.rotation || 0) * Math.PI) / 180;

    ctx.translate(cx, cy);
    ctx.rotate(rad);

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);

    // Rotation line
    ctx.beginPath();
    ctx.moveTo(0, -s.h / 2);
    ctx.lineTo(0, -s.h / 2 - 25);
    ctx.stroke();

    ctx.restore();

    // Draw handle boxes in world coordinates
    var handles = getHandlePositions(s);
    ctx.fillStyle = '#00e5ff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    for (var h in handles) {
      var hp = handles[h];
      if (h === 'rot') {
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(hp.x - 4, hp.y - 4, 8, 8);
        ctx.strokeRect(hp.x - 4, hp.y - 4, 8, 8);
      }
    }
  }

  // 3D Grid & 3D Software Renderer
  function draw3DGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;

    for (var x = -500; x <= 500; x += 100) {
      var p1 = project3D(x, 0, -500);
      var p2 = project3D(x, 0, 500);
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
    for (var z = -500; z <= 500; z += 100) {
      var p1 = project3D(-500, 0, z);
      var p2 = project3D(500, 0, z);
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function project3D(wx, wy, wz) {
    var cx0 = wx - camera3D.x;
    var cy0 = wy - camera3D.y;
    var cz0 = wz - camera3D.z;

    var cRotX = camera3D.rotX;
    var cRotY = camera3D.rotY;

    var cx1 = cx0 * Math.cos(cRotY) - cz0 * Math.sin(cRotY);
    var cz1 = cx0 * Math.sin(cRotY) + cz0 * Math.cos(cRotY);
    var cy1 = cy0;

    var cy2 = cy1 * Math.cos(cRotX) - cz1 * Math.sin(cRotX);
    var cz2 = cy1 * Math.sin(cRotX) + cz1 * Math.cos(cRotX);
    var cx2 = cx1;

    var dist = cz2 + 500;
    if (dist < 10) return null;
    var focal = camera3D.fov;
    var px = canvas.width / 2 + (cx2 * focal) / dist;
    var py = canvas.height / 2 + (cy2 * focal) / dist;

    return { x: px, y: py, z: cz2 };
  }

  function render3DScene(time, isGhost, alphaMult) {
    var faces = [];

    var lx = 0.4, ly = 0.9, lz = -0.6;
    var lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
    lx /= lLen; ly /= lLen; lz /= lLen;

    layers.forEach(function(layer) {
      if (!layer.visible) return;
      layer.shapes.forEach(function(rawShape) {
        var s = getInterpolated(rawShape, time);
        var rawFaces = build3DFacesForShape(s);

        rawFaces.forEach(function(face) {
          var worldVerts = [];
          var camVerts = [];
          var projVerts = [];

          face.verts.forEach(function(v) {
            var rx = v.x, ry = v.y, rz = v.z;
            var radX = ((s.rotationX || 0) * Math.PI) / 180;
            var radY = ((s.rotationY || 0) * Math.PI) / 180;
            var radZ = ((s.rotationZ || s.rotation || 0) * Math.PI) / 180;

            var x1 = rx * Math.cos(radZ) - ry * Math.sin(radZ);
            var y1 = rx * Math.sin(radZ) + ry * Math.cos(radZ);
            var z1 = rz;

            var x2 = x1 * Math.cos(radY) + z1 * Math.sin(radY);
            var y2 = y1;
            var z2 = -x1 * Math.sin(radY) + z1 * Math.cos(radY);

            var x3 = x2;
            var y3 = y2 * Math.cos(radX) - z2 * Math.sin(radX);
            var z3 = y2 * Math.sin(radX) + z2 * Math.cos(radX);

            var wx = x3 + (s.x + s.w / 2);
            var wy = y3 + (s.y + s.h / 2);
            var wz = z3 + (s.z || 0);

            worldVerts.push({ x: wx, y: wy, z: wz });

            var p = project3D(wx, wy, wz);
            if (p) {
              camVerts.push({ z: p.z });
              projVerts.push(p);
            }
          });

          if (worldVerts.length >= 3 && projVerts.length === face.verts.length) {
            var v0 = worldVerts[0], v1 = worldVerts[1], v2 = worldVerts[2];
            var ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z;
            var bx = v2.x - v0.x, by = v2.y - v0.y, bz = v2.z - v0.z;
            var nx = ay * bz - az * by;
            var ny = az * bx - ax * bz;
            var nz = ax * by - ay * bx;
            var nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nLen > 0) { nx /= nLen; ny /= nLen; nz /= nLen; }

            var dot = nx * lx + ny * ly + nz * lz;
            var brightness = clamp(0.35 + 0.65 * Math.max(0, dot), 0.2, 1.0);
            var faceColor = isGhost ? '#7799dd' : lerpColor('#000000', s.fill, brightness);

            var avgZ = 0;
            camVerts.forEach(function(cv) { avgZ += cv.z; });
            avgZ /= camVerts.length;

            faces.push({
              avgZ: avgZ,
              projVerts: projVerts,
              color: faceColor,
              stroke: isGhost ? '#4477bb' : s.stroke,
              strokeWidth: s.strokeWidth,
              opacity: (s.opacity !== undefined ? s.opacity : 1) * (alphaMult || 1),
              shapeId: rawShape.id
            });
          }
        });
      });
    });

    faces.sort(function(a, b) { return b.avgZ - a.avgZ; });

    faces.forEach(function(f) {
      ctx.save();
      ctx.globalAlpha = f.opacity;
      ctx.beginPath();
      f.projVerts.forEach(function(p, idx) {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = f.color;
      ctx.fill();
      if (f.strokeWidth > 0) {
        ctx.strokeStyle = f.stroke;
        ctx.lineWidth = f.strokeWidth;
        ctx.stroke();
      }
      if (f.shapeId === activeShapeId && !isGhost) {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = Math.max(2, f.strokeWidth + 1);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function build3DFacesForShape(s) {
    var hw = s.w / 2, hh = s.h / 2, hd = (s.d || 50) / 2;

    if (s.type === 'star') {
      // 3D Extruded Star
      var pts = s.points || 5;
      var outerR = Math.min(Math.abs(s.w), Math.abs(s.h)) / 2;
      var innerR = outerR * 0.4;
      var topVerts = [], botVerts = [];

      for (var p = 0; p < pts * 2; p++) {
        var r = (p % 2 === 0) ? outerR : innerR;
        var a = (p * Math.PI) / pts - Math.PI / 2;
        var px = Math.cos(a) * r;
        var py = Math.sin(a) * r;
        topVerts.push({ x: px, y: py, z: hd });
        botVerts.push({ x: px, y: py, z: -hd });
      }

      var starFaces = [{ verts: topVerts }, { verts: botVerts.slice().reverse() }];
      for (var i = 0; i < topVerts.length; i++) {
        var next = (i + 1) % topVerts.length;
        starFaces.push({
          verts: [topVerts[i], topVerts[next], botVerts[next], botVerts[i]]
        });
      }
      return starFaces;
    }

    // Default 3D Cuboid Box
    var v = [
      { x: -hw, y: -hh, z:  hd },
      { x:  hw, y: -hh, z:  hd },
      { x:  hw, y:  hh, z:  hd },
      { x: -hw, y:  hh, z:  hd },
      { x: -hw, y: -hh, z: -hd },
      { x:  hw, y: -hh, z: -hd },
      { x:  hw, y:  hh, z: -hd },
      { x: -hw, y:  hh, z: -hd }
    ];

    return [
      { verts: [v[0], v[1], v[2], v[3]] }, // Front
      { verts: [v[5], v[4], v[7], v[6]] }, // Back
      { verts: [v[4], v[5], v[1], v[0]] }, // Top
      { verts: [v[3], v[2], v[6], v[7]] }, // Bottom
      { verts: [v[1], v[5], v[6], v[2]] }, // Right
      { verts: [v[4], v[0], v[3], v[7]] }  // Left
    ];
  }

  // PROPERTIES PANEL RENDERING & BINDING
  function updatePropsPanel() {
    var container = document.getElementById('anim-props-content');
    var typeBadge = document.getElementById('anim-prop-type');
    if (!container) return;

    var shape = getActiveShape();
    if (!shape) {
      typeBadge.textContent = '';
      container.innerHTML = '<div style="color:#888;font-style:italic;padding:15px 0;text-align:center">No shape selected.<br><br>Click a shape or draw one using the left toolbar.</div>';
      return;
    }

    typeBadge.textContent = shape.type.toUpperCase();

    var seqHtml = '';
    if (shape.type === 'image' && shape.imgs && shape.imgs.length) {
      seqHtml = `
        <div style="padding:8px;background:rgba(78,158,255,0.1);border:1px solid rgba(78,158,255,0.25);border-radius:6px;display:flex;flex-direction:column;gap:6px">
          <div style="font-size:0.85em;color:#7fb3ff">Image sequence: ${shape.imgs.length} frames</div>
          <label style="color:#aaa">Seconds per frame: <input type="number" id="prop-framedur" value="${shape.frameDur || 0.12}" min="0.02" max="5" step="0.01" style="width:60px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:3px"></label>
          <div style="font-size:0.75em;color:#888">Playback: ${Math.round(1 / (shape.frameDur || 0.12))} fps. Onion Skin ghosts show neighbouring frames.</div>
        </div>`;
    }

    var html = `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${seqHtml}
        <!-- Position -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <label style="color:#aaa">X: <input type="number" id="prop-x" value="${Math.round(shape.x)}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:3px"></label>
          <label style="color:#aaa">Y: <input type="number" id="prop-y" value="${Math.round(shape.y)}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:3px"></label>
        </div>
        ${is3D ? `
        <label style="color:#aaa">Z: <input type="number" id="prop-z" value="${Math.round(shape.z || 0)}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:3px"></label>
        ` : ''}

        <!-- Size -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <label style="color:#aaa">W: <input type="number" id="prop-w" value="${Math.round(shape.w)}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:3px"></label>
          <label style="color:#aaa">H: <input type="number" id="prop-h" value="${Math.round(shape.h)}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:3px"></label>
        </div>
        ${is3D ? `
        <label style="color:#aaa">Depth D: <input type="number" id="prop-d" value="${Math.round(shape.d || 50)}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:3px"></label>
        ` : ''}

        <!-- Rotation -->
        ${!is3D ? `
        <label style="color:#aaa">Rotation: <input type="number" id="prop-rot" value="${Math.round(shape.rotation || 0)}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:3px">°</label>
        ` : `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px">
          <label style="color:#aaa">Rx: <input type="number" id="prop-rx" value="${Math.round(shape.rotationX || 0)}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:2px"></label>
          <label style="color:#aaa">Ry: <input type="number" id="prop-ry" value="${Math.round(shape.rotationY || 0)}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:2px"></label>
          <label style="color:#aaa">Rz: <input type="number" id="prop-rz" value="${Math.round(shape.rotationZ || 0)}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:2px"></label>
        </div>
        `}

        <!-- Colors & Opacity -->
        <div style="display:flex;align-items:center;justify-content:space-between">
          <label style="color:#aaa">Fill: <input type="color" id="prop-fill" value="${shape.fill}"></label>
          <label style="color:#aaa">Stroke: <input type="color" id="prop-stroke" value="${shape.stroke}"></label>
        </div>

        <label style="color:#aaa">Stroke Width: 
          <input type="range" id="prop-strokewidth" min="0" max="20" value="${shape.strokeWidth}" style="width:100%">
        </label>

        <label style="color:#aaa">Opacity: <span id="prop-opacity-val">${Math.round(shape.opacity * 100)}%</span>
          <input type="range" id="prop-opacity" min="0" max="1" step="0.05" value="${shape.opacity}" style="width:100%">
        </label>

        ${shape.type === 'text' ? `
        <label style="color:#aaa">Text String:
          <input type="text" id="prop-text" value="${shape.text}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:4px">
        </label>
        ` : ''}

        ${shape.type === 'star' ? `
        <label style="color:#aaa">Star Points:
          <input type="number" id="prop-points" min="3" max="20" value="${shape.points || 5}" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:4px;padding:4px">
        </label>
        ` : ''}

        <div style="display:flex;gap:6px;margin-top:10px">
 <button class="mw-btn" id="prop-btn-setkf" style="flex:1;font-size:0.8em;padding:6px;background:#2d3550;color:#50e0e0;border:1px solid #50e0e0"> Set Keyframe</button>
 <button class="mw-btn danger" id="prop-btn-del" style="font-size:0.8em;padding:6px"></button>
        </div>

        <!-- Keyframes List -->
        <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px">
          <div style="font-weight:bold;color:#aaa;font-size:0.9em;margin-bottom:4px">Keyframes (${(shape.keyframes || []).length}):</div>
          <div style="display:flex;flex-direction:column;gap:3px;max-height:100px;overflow-y:auto">
            ${(shape.keyframes || []).map(function(kf) {
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.2);padding:2px 6px;border-radius:4px;font-family:var(--mono,monospace)">
 <span style="cursor:pointer" onclick="MWO.Animation.seekTime(${kf.time})">⏱ ${kf.time.toFixed(1)}s</span>
                  <button class="mw-btn danger" style="padding:0 4px;font-size:0.7em" onclick="MWO.Animation.deleteKeyframe('${shape.id}', ${kf.time})">Close</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Bind property input listeners
    var bindNum = function(id, prop) {
      var el = document.getElementById(id);
      if (el) {
        el.oninput = function() {
          var val = parseFloat(this.value) || 0;
          shape[prop] = val;
          currentFill = shape.fill;
          currentStroke = shape.stroke;
          var kf = (shape.keyframes || []).find(function(k) { return Math.abs(k.time - currentTime) < 0.04; });
          if (kf) kf[prop] = val;
          renderCanvas();
        };
      }
    };

    bindNum('prop-x', 'x');
    bindNum('prop-y', 'y');
    bindNum('prop-z', 'z');
    bindNum('prop-w', 'w');
    bindNum('prop-h', 'h');
    bindNum('prop-d', 'd');
    bindNum('prop-rot', 'rotation');
    bindNum('prop-rx', 'rotationX');
    bindNum('prop-ry', 'rotationY');
    bindNum('prop-rz', 'rotationZ');

    var fillEl = document.getElementById('prop-fill');
    if (fillEl) fillEl.oninput = function() {
      shape.fill = this.value;
      currentFill = this.value;
      var kf = (shape.keyframes || []).find(function(k) { return Math.abs(k.time - currentTime) < 0.04; });
      if (kf) kf.fill = this.value;
      renderCanvas();
    };

    var strokeEl = document.getElementById('prop-stroke');
    if (strokeEl) strokeEl.oninput = function() {
      shape.stroke = this.value;
      currentStroke = this.value;
      var kf = (shape.keyframes || []).find(function(k) { return Math.abs(k.time - currentTime) < 0.04; });
      if (kf) kf.stroke = this.value;
      renderCanvas();
    };

    var strokeWEl = document.getElementById('prop-strokewidth');
    if (strokeWEl) strokeWEl.oninput = function() {
      shape.strokeWidth = parseInt(this.value);
      currentStrokeWidth = shape.strokeWidth;
      var kf = (shape.keyframes || []).find(function(k) { return Math.abs(k.time - currentTime) < 0.04; });
      if (kf) kf.strokeWidth = shape.strokeWidth;
      renderCanvas();
    };

    var opacityEl = document.getElementById('prop-opacity');
    if (opacityEl) opacityEl.oninput = function() {
      shape.opacity = parseFloat(this.value);
      currentOpacity = shape.opacity;
      document.getElementById('prop-opacity-val').textContent = Math.round(shape.opacity * 100) + '%';
      var kf = (shape.keyframes || []).find(function(k) { return Math.abs(k.time - currentTime) < 0.04; });
      if (kf) kf.opacity = shape.opacity;
      renderCanvas();
    };

    var textEl = document.getElementById('prop-text');
    if (textEl) textEl.oninput = function() {
      shape.text = this.value;
      renderCanvas();
    };

    var ptsEl = document.getElementById('prop-points');
    if (ptsEl) ptsEl.oninput = function() {
      shape.points = parseInt(this.value) || 5;
      renderCanvas();
    };

    document.getElementById('prop-btn-setkf').onclick = function() {
      setKeyframeForShape(shape, currentTime);
      updateTimelineUI();
      updatePropsPanel();
      renderCanvas();
    };

    document.getElementById('prop-btn-del').onclick = deleteActiveShape;
  }

  // TIMELINE RENDERING & RULER SCRUBBING
  function updateTimelineUI() {
    renderLayerRows();
    renderTrackRows();
    renderRuler();
    updatePlayheadPosition();
  }

  function renderLayerRows() {
    var container = document.getElementById('anim-layer-rows');
    if (!container) return;

    container.innerHTML = layers.map(function(layer) {
      var isAct = layer.id === activeLayerId;
      return `
        <div style="display:flex;align-items:center;padding:4px 6px;gap:4px;height:32px;background:${isAct ? '#23283b' : 'transparent'};border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.78em">
 <button class="mw-btn" style="padding:0 3px;font-size:0.9em;background:transparent;border:none" onclick="MWO.Animation.toggleLayerVis('${layer.id}')">${layer.visible? '': ''}</button>
          <button class="mw-btn" style="padding:0 3px;font-size:0.9em;background:transparent;border:none" onclick="MWO.Animation.toggleLayerLock('${layer.id}')">${layer.locked ? 'Lock' : ''}</button>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:${isAct ? '#50e0e0' : '#eee'}" onclick="MWO.Animation.selectLayer('${layer.id}')">${layer.name}</span>
          <button class="mw-btn" style="padding:0 2px;font-size:0.7em" onclick="MWO.Animation.moveLayer('${layer.id}', -1)">▲</button>
          <button class="mw-btn" style="padding:0 2px;font-size:0.7em" onclick="MWO.Animation.moveLayer('${layer.id}', 1)">▼</button>
 <button class="mw-btn danger" style="padding:0 3px;font-size:0.7em" onclick="MWO.Animation.deleteLayer('${layer.id}')"></button>
        </div>
      `;
    }).join('');
  }

  function renderTrackRows() {
    var container = document.getElementById('anim-track-rows');
    if (!container) return;

    var playheadLine = document.getElementById('anim-playhead-line');
    container.innerHTML = '';
    if (playheadLine) container.appendChild(playheadLine);

    layers.forEach(function(layer) {
      var trackRow = document.createElement('div');
      trackRow.style.cssText = 'height:32px;border-bottom:1px solid rgba(255,255,255,0.05);position:relative;background:rgba(255,255,255,0.01)';

      // Gather keyframes for shapes on this layer
      layer.shapes.forEach(function(shape) {
        (shape.keyframes || []).forEach(function(kf) {
          var pct = (kf.time / duration) * 100;
          var diamond = document.createElement('div');
          diamond.style.cssText = `position:absolute;left:${pct}%;top:8px;width:14px;height:14px;background:${shape.id === activeShapeId ? '#50e0e0' : '#ff9900'};transform:translateX(-50%) rotate(45deg);cursor:grab;border:1px solid #000;z-index:4`;
          diamond.title = `${shape.type} @ ${kf.time.toFixed(1)}s (Drag to move, Alt+Click to delete)`;

          diamond.onpointerdown = function(e) {
            e.stopPropagation();
            if (e.altKey || e.button === 2) {
              deleteKeyframe(shape.id, kf.time);
              return;
            }
            activeShapeId = shape.id;
            activeLayerId = layer.id;
            dragKeyframeData = { shape: shape, keyframe: kf };
            diamond.setPointerCapture(e.pointerId);

            diamond.onpointermove = function(pe) {
              if (!dragKeyframeData) return;
              var trackRect = container.getBoundingClientRect();
              var relX = pe.clientX - trackRect.left;
              var newTime = clamp((relX / trackRect.width) * duration, 0, duration);
              dragKeyframeData.keyframe.time = parseFloat(newTime.toFixed(2));
              diamond.style.left = ((dragKeyframeData.keyframe.time / duration) * 100) + '%';
              seekTime(dragKeyframeData.keyframe.time);
            };

            diamond.onpointerup = function() {
              dragKeyframeData = null;
              diamond.onpointermove = null;
              diamond.onpointerup = null;
              shape.keyframes.sort(function(a, b) { return a.time - b.time; });
              updateTimelineUI();
            };
          };

          trackRow.appendChild(diamond);
        });
      });

      container.appendChild(trackRow);
    });
  }

  function renderRuler() {
    var rCanvas = document.getElementById('anim-ruler-canvas');
    if (!rCanvas) return;
    var rCtx = rCanvas.getContext('2d');
    rCanvas.width = rCanvas.parentElement.clientWidth;
    rCanvas.height = 24;

    rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);
    rCtx.fillStyle = '#1c1f2e';
    rCtx.fillRect(0, 0, rCanvas.width, rCanvas.height);

    rCtx.strokeStyle = 'rgba(255,255,255,0.2)';
    rCtx.fillStyle = '#aaa';
    rCtx.font = '10px monospace';

    for (var sec = 0; sec <= duration; sec++) {
      var x = (sec / duration) * rCanvas.width;
      rCtx.beginPath();
      rCtx.moveTo(x, 12);
      rCtx.lineTo(x, 24);
      rCtx.stroke();
      rCtx.fillText(sec + 's', x + 2, 11);

      // Sub-ticks
      for (var sub = 1; sub < 5; sub++) {
        var sx = ((sec + sub * 0.2) / duration) * rCanvas.width;
        if (sx < rCanvas.width) {
          rCtx.beginPath();
          rCtx.moveTo(sx, 18);
          rCtx.lineTo(sx, 24);
          rCtx.stroke();
        }
      }
    }

    // Ruler click scrubbing
    var rulerTrack = document.getElementById('anim-ruler-track');
    rulerTrack.onpointerdown = function(e) {
      rulerTrack.setPointerCapture(e.pointerId);
      var scrub = function(pe) {
        var rect = rulerTrack.getBoundingClientRect();
        var relX = pe.clientX - rect.left;
        var t = clamp((relX / rect.width) * duration, 0, duration);
        seekTime(t);
      };
      scrub(e);
      rulerTrack.onpointermove = scrub;
      rulerTrack.onpointerup = function() {
        rulerTrack.onpointermove = null;
        rulerTrack.onpointerup = null;
      };
    };
  }

  function updatePlayheadPosition() {
    var line = document.getElementById('anim-playhead-line');
    var trackArea = document.getElementById('anim-track-area');
    if (!line || !trackArea) return;

    var pct = (currentTime / duration) * 100;
    line.style.left = pct + '%';
  }

  function seekTime(t) {
    currentTime = clamp(t, 0, duration);
    updateTimeDisplay();
    updatePlayheadPosition();
    updatePropsPanel();
    renderCanvas();
  }

  function updateTimeDisplay() {
    var disp = document.getElementById('anim-time-display');
    if (disp) {
      var currentFrame = Math.round(currentTime * fps);
      disp.textContent = `${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s (F: ${currentFrame})`;
    }
  }

  // PLAYBACK ANIMATION LOOP
  function play() {
    if (currentTime >= duration) currentTime = 0;
    isPlaying = true;
    lastAnimTime = performance.now();

    var playBtn = document.getElementById('anim-play-btn');
    if (playBtn) {
      playBtn.textContent = '⏸ Pause';
      playBtn.classList.remove('primary');
    }
  }

  function pause() {
    isPlaying = false;
    var playBtn = document.getElementById('anim-play-btn');
    if (playBtn) {
      playBtn.textContent = 'Run Play';
      playBtn.classList.add('primary');
    }
  }

  function startRenderLoop() {
    function loop(timestamp) {
      if (!winBody || !winBody.isConnected) {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        return;
      }

      if (isPlaying) {
        var dt = (timestamp - lastAnimTime) / 1000;
        lastAnimTime = timestamp;
        currentTime += dt;

        if (currentTime >= duration) {
          if (isLooping) {
            currentTime = 0;
          } else {
            currentTime = duration;
            pause();
          }
        }
        updateTimeDisplay();
        updatePlayheadPosition();
        renderCanvas();
      }

      animFrameId = requestAnimationFrame(loop);
    }
    animFrameId = requestAnimationFrame(loop);
  }

  // VIDEO EXPORT VIA MEDIARECORDER
  function exportVideo() {
    pause();
    var mimeType = 'video/webm';
    var ext = 'webm';

    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4'; ext = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9'; ext = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm'; ext = 'webm';
      }
    }

    MWO.notif.show('Video Export', 'Recording animation pass (' + ext + ')...');

    var stream = canvas.captureStream(30);
    var recorder = new MediaRecorder(stream, { mimeType: mimeType });
    var chunks = [];

    recorder.ondataavailable = function(e) {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = function() {
      var blob = new Blob(chunks, { type: mimeType });
      var reader = new FileReader();

      reader.onloadend = function() {
        var dataUrl = reader.result;
        var filePath = '/Videos/animation_' + Date.now() + '.' + ext;

        MWO.fs.writeFile(filePath, dataUrl).then(function() {
          MWO.notif.show('Export Complete!', 'Saved video to ' + filePath);

          // Direct browser download prompt
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'animation_' + Date.now() + '.' + ext;
          a.click();
        }).catch(function(err) {
          MWO.notif.show('Export Error', 'Failed to save to VFS: ' + err.message);
        });
      };

      reader.readAsDataURL(blob);
    };

    // Frame-by-frame export recording pass
    currentTime = 0;
    renderCanvas();
    recorder.start();

    var exportFps = 30;
    var stepTime = 1 / exportFps;

    var exportInterval = setInterval(function() {
      currentTime += stepTime;
      if (currentTime >= duration) {
        currentTime = duration;
        renderCanvas();
        clearInterval(exportInterval);
        recorder.stop();
      } else {
        renderCanvas();
        updatePlayheadPosition();
        updateTimeDisplay();
      }
    }, 1000 / exportFps);
  }

  // PROJECT SAVE & LOAD (VFS JSON)
  function saveProject() {
    var projData = {
      version: 1,
      duration: duration,
      fps: fps,
      is3D: is3D,
      camera3D: camera3D,
      layers: layers
    };

    var jsonStr = JSON.stringify(projData, null, 2);
    var filePath = '/Documents/animation_project_' + Date.now() + '.json';

    MWO.fs.writeFile(filePath, jsonStr).then(function() {
      MWO.notif.show('Project Saved', 'Saved project to ' + filePath);
    }).catch(function(err) {
      MWO.notif.show('Error', 'Failed to save project: ' + err.message);
    });
  }

  function openProject() {
    MWO.fs.listDir('/Documents').then(function(items) {
      var jsonFiles = (items || []).filter(function(item) {
        return item.name && item.name.endsWith('.json');
      });

      if (jsonFiles.length === 0) {
        MWO.notif.show('Open Project', 'No saved .json project files found in /Documents');
        return;
      }

      var modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999';
      modal.innerHTML = `
        <div style="background:#1e2230;border:1px solid rgba(255,255,255,0.1);padding:16px;border-radius:8px;min-width:300px;max-width:450px;color:#fff">
          <h3 style="margin-top:0">Open Project</h3>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;margin:10px 0">
            ${jsonFiles.map(function(f) {
              return `<button class="mw-btn" style="text-align:left;padding:6px 10px" onclick="MWO.Animation.loadProjectFile('${f.path}');this.closest('.modal-bg').remove()">${f.name}</button>`;
            }).join('')}
          </div>
          <button class="mw-btn danger" style="width:100%" onclick="this.parentElement.parentElement.remove()">Cancel</button>
        </div>
      `;
      modal.className = 'modal-bg';
      document.body.appendChild(modal);
    }).catch(function(err) {
      MWO.notif.show('Error', 'Could not read /Documents: ' + err.message);
    });
  }

  function loadProjectFile(path) {
    MWO.fs.readFile(path).then(function(content) {
      var proj = JSON.parse(content);
      if (proj && proj.layers) {
        layers = proj.layers;
        duration = proj.duration || 10;
        fps = proj.fps || 60;
        is3D = !!proj.is3D;
        if (proj.camera3D) camera3D = proj.camera3D;

        activeLayerId = layers.length > 0 ? layers[0].id : null;
        activeShapeId = null;
        currentTime = 0;

        document.getElementById('anim-input-duration').value = duration;
 document.getElementById('anim-btn-mode3d').textContent = is3D? ' Mode: 3D': ' Mode: 2D';

        updateTimelineUI();
        updatePropsPanel();
        renderCanvas();
        MWO.notif.show('Project Loaded', 'Loaded ' + path);
      }
    }).catch(function(err) {
      MWO.notif.show('Error', 'Failed to read project: ' + err.message);
    });
  }

  // LAYER ACTIONS
  function toggleLayerVis(layerId) {
    var l = layers.find(function(item) { return item.id === layerId; });
    if (l) { l.visible = !l.visible; updateTimelineUI(); renderCanvas(); }
  }

  function toggleLayerLock(layerId) {
    var l = layers.find(function(item) { return item.id === layerId; });
    if (l) { l.locked = !l.locked; updateTimelineUI(); }
  }

  function selectLayer(layerId) {
    activeLayerId = layerId;
    updateTimelineUI();
  }

  function moveLayer(layerId, dir) {
    var idx = layers.findIndex(function(l) { return l.id === layerId; });
    if (idx < 0) return;
    var target = idx + dir;
    if (target >= 0 && target < layers.length) {
      var temp = layers[idx];
      layers[idx] = layers[target];
      layers[target] = temp;
      updateTimelineUI();
      renderCanvas();
    }
  }

  function deleteLayer(layerId) {
    if (layers.length <= 1) {
      MWO.notif.show('Layer', 'Cannot delete the only remaining layer');
      return;
    }
    layers = layers.filter(function(l) { return l.id !== layerId; });
    if (activeLayerId === layerId) activeLayerId = layers[0].id;
    activeShapeId = null;
    updateTimelineUI();
    updatePropsPanel();
    renderCanvas();
  }

  function deleteKeyframe(shapeId, time) {
    var found = findShapeById(shapeId);
    if (found && found.shape.keyframes) {
      found.shape.keyframes = found.shape.keyframes.filter(function(k) { return Math.abs(k.time - time) >= 0.02; });
      updateTimelineUI();
      updatePropsPanel();
      renderCanvas();
    }
  }

  // PUBLIC API EXPOSED ON MWO.Animation
  return {
    launch: launch,
    seekTime: seekTime,
    deleteKeyframe: deleteKeyframe,
    toggleLayerVis: toggleLayerVis,
    toggleLayerLock: toggleLayerLock,
    selectLayer: selectLayer,
    moveLayer: moveLayer,
    deleteLayer: deleteLayer,
    loadProjectFile: loadProjectFile
  };
})();

// Register App with MossyWoss OS
MWO.registerApp({
  id: 'animation',
  name: 'Animation Studio',
  description: '2D & 3D animation — timeline, keyframes, tweening',
  icon: 'animation-studio',
  category: 'app',
  installed: false,
  launch: function() { MWO.Animation.launch(); }
});
