/* VoxelForge VR — Flagship WebXR Voxel Survival Game for MossyWoss OS
 * Features: Procedural Voxel World, Hand Motion Controls (Swing Break, Punch, Bow Draw/Fire),
 * WebXR Controller & Hand Tracking Support, Desktop / Mobile Touch Fallback.
 * No external assets required. Uses global THREE.js r147.
 */

(function(root) {
  'use strict';

  var THREE = root.THREE;
  if (!THREE && typeof require === 'function') {
    try {
      THREE = require('./three.min.js');
    } catch (e) {
      try {
        THREE = require('three');
      } catch (e2) {}
    }
  }

  // Ensure MWO global namespace
  var MWO = root.MWO = root.MWO || {};

  // ==========================================
  // 1. SEEDABLE NOISE GENERATOR
  // ==========================================
  function SeededNoise(seed) {
    this.seed = seed || 12345;
    var p = new Uint8Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    var s = this.seed;
    for (var i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      var j = Math.floor((s / 2147483647) * (i + 1));
      var t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    for (var k = 0; k < 512; k++) this.perm[k] = p[k & 255];
  }

  SeededNoise.prototype.noise2D = function(xin, yin) {
    var perm = this.perm;
    var X = Math.floor(xin) & 255;
    var Y = Math.floor(yin) & 255;
    var x = xin - Math.floor(xin);
    var y = yin - Math.floor(yin);
    var u = x * x * x * (x * (x * 6 - 15) + 10);
    var v = y * y * y * (y * (y * 6 - 15) + 10);

    var A = perm[X] + Y, B = perm[X + 1] + Y;

    function grad(hash, gx, gy) {
      var h = hash & 7;
      var u_val = h < 4 ? gx : gy;
      var v_val = h < 4 ? gy : gx;
      return ((h & 1) === 0 ? u_val : -u_val) + ((h & 2) === 0 ? v_val : -v_val);
    }

    function lerp(t, a, b) { return a + t * (b - a); }

    var g00 = grad(perm[A], x, y);
    var g10 = grad(perm[B], x - 1, y);
    var g01 = grad(perm[A + 1], x, y - 1);
    var g11 = grad(perm[B + 1], x - 1, y - 1);

    return lerp(v, lerp(u, g00, g10), lerp(u, g01, g11));
  };

  // ==========================================
  // 2. CONSTANTS & BLOCK DEFINITIONS
  // ==========================================
  var BLOCKS = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    SAND: 4,
    WATER: 5,
    WOOD: 6,
    LEAVES: 7,
    ORE: 8
  };

  var BLOCK_DEFS = {
    0: { name: 'Air', solid: false, transparent: true },
    1: { name: 'Grass', solid: true, color: 0x4a7c3a, sideColor: 0x664422 },
    2: { name: 'Dirt', solid: true, color: 0x795548 },
    3: { name: 'Stone', solid: true, color: 0x757575 },
    4: { name: 'Sand', solid: true, color: 0xdec68b },
    5: { name: 'Water', solid: false, transparent: true, opacity: 0.65, color: 0x2196f3 },
    6: { name: 'Wood', solid: true, color: 0x5d4037 },
    7: { name: 'Leaves', solid: true, transparent: true, opacity: 0.85, color: 0x2e7d32 },
    8: { name: 'Ore', solid: true, color: 0xffb300 }
  };

  var WORLD_SIZE_X = 64;
  var WORLD_SIZE_Z = 64;
  var WORLD_SIZE_Y = 32;
  var CHUNK_SIZE = 8;
  var WATER_LEVEL = 8;

  // ==========================================
  // 3. CORE GAME LOGIC / WORLD DATA MODEL
  // ==========================================
  function VoxelWorld(seed) {
    this.seed = seed || Math.floor(Math.random() * 90000) + 10000;
    this.noise = new SeededNoise(this.seed);
    this.blocks = new Uint8Array(WORLD_SIZE_X * WORLD_SIZE_Y * WORLD_SIZE_Z);
    this.diffs = {}; // Key: 'x,y,z' -> blockTypeId (0 for broken)
    this.generate();
  }

  VoxelWorld.prototype.getIndex = function(x, y, z) {
    return (x * WORLD_SIZE_Y + y) * WORLD_SIZE_Z + z;
  };

  VoxelWorld.prototype.getBlockRaw = function(x, y, z) {
    if (x < 0 || x >= WORLD_SIZE_X || y < 0 || y >= WORLD_SIZE_Y || z < 0 || z >= WORLD_SIZE_Z) {
      return BLOCKS.AIR;
    }
    var key = x + ',' + y + ',' + z;
    if (this.diffs.hasOwnProperty(key)) {
      return this.diffs[key];
    }
    return this.blocks[this.getIndex(x, y, z)];
  };

  VoxelWorld.prototype.setBlock = function(x, y, z, type) {
    if (x < 0 || x >= WORLD_SIZE_X || y < 0 || y >= WORLD_SIZE_Y || z < 0 || z >= WORLD_SIZE_Z) {
      return false;
    }
    var key = x + ',' + y + ',' + z;
    this.diffs[key] = type;
    return true;
  };

  VoxelWorld.prototype.generate = function() {
    for (var x = 0; x < WORLD_SIZE_X; x++) {
      for (var z = 0; z < WORLD_SIZE_Z; z++) {
        var nx = x * 0.04;
        var nz = z * 0.04;
        var height = Math.floor(12 + this.noise.noise2D(nx, nz) * 8 + this.noise.noise2D(nx * 2, nz * 2) * 3);
        height = Math.max(2, Math.min(WORLD_SIZE_Y - 4, height));

        for (var y = 0; y < WORLD_SIZE_Y; y++) {
          var idx = this.getIndex(x, y, z);
          if (y > height) {
            if (y <= WATER_LEVEL) {
              this.blocks[idx] = BLOCKS.WATER;
            } else {
              this.blocks[idx] = BLOCKS.AIR;
            }
          } else if (y === height) {
            if (y <= WATER_LEVEL + 1) {
              this.blocks[idx] = BLOCKS.SAND;
            } else {
              this.blocks[idx] = BLOCKS.GRASS;
            }
          } else if (y >= height - 3) {
            this.blocks[idx] = BLOCKS.DIRT;
          } else {
            // Check for ore placement
            var oreVal = this.noise.noise2D(x * 0.2 + y * 0.2, z * 0.2);
            if (oreVal > 0.45 && y < height - 5) {
              this.blocks[idx] = BLOCKS.ORE;
            } else {
              this.blocks[idx] = BLOCKS.STONE;
            }
          }
        }

        // Tree generation
        if (height > WATER_LEVEL + 1 && (x % 7 === 0) && (z % 7 === 0)) {
          var treeRnd = Math.abs(this.noise.noise2D(x * 0.5, z * 0.5));
          if (treeRnd > 0.3) {
            var trunkHeight = 4 + Math.floor(treeRnd * 3);
            for (var ty = 1; ty <= trunkHeight; ty++) {
              if (height + ty < WORLD_SIZE_Y) {
                this.blocks[this.getIndex(x, height + ty, z)] = BLOCKS.WOOD;
              }
            }
            var leafTop = height + trunkHeight;
            for (var lx = -2; lx <= 2; lx++) {
              for (var lz = -2; lz <= 2; lz++) {
                for (var ly = -1; ly <= 2; ly++) {
                  if (Math.abs(lx) + Math.abs(lz) + Math.abs(ly) <= 3) {
                    var px = x + lx;
                    var pz = z + lz;
                    var py = leafTop + ly;
                    if (px >= 0 && px < WORLD_SIZE_X && pz >= 0 && pz < WORLD_SIZE_Z && py < WORLD_SIZE_Y) {
                      var pidx = this.getIndex(px, py, pz);
                      if (this.blocks[pidx] === BLOCKS.AIR) {
                        this.blocks[pidx] = BLOCKS.LEAVES;
                      }
                    }
                  }
                }
              }
            }
          }
        }

      }
    }
  };

  VoxelWorld.prototype.exportDiffs = function() {
    return {
      seed: this.seed,
      diffs: this.diffs
    };
  };

  VoxelWorld.prototype.importDiffs = function(data) {
    if (data && data.seed !== undefined) {
      this.seed = data.seed;
      this.noise = new SeededNoise(this.seed);
      this.generate();
    }
    if (data && data.diffs) {
      this.diffs = data.diffs;
    }
  };

  // ==========================================
  // 4. CHUNK GEOMETRY BUILDER (OPTIMIZED MESHING)
  // ==========================================
  function buildChunkGeometry(world, chunkX, chunkZ, THREE_Ref) {
    var T = THREE_Ref || THREE;
    var startX = chunkX * CHUNK_SIZE;
    var startZ = chunkZ * CHUNK_SIZE;
    var endX = startX + CHUNK_SIZE;
    var endZ = startZ + CHUNK_SIZE;

    var positions = [];
    var normals = [];
    var colors = [];
    var indices = [];
    var vertCount = 0;

    var waterPositions = [];
    var waterNormals = [];
    var waterColors = [];
    var waterIndices = [];
    var waterVertCount = 0;

    // Face offsets and vertices
    var faces = [
      { dir: [1, 0, 0], norm: [1, 0, 0], verts: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], shade: 0.9 }, // +X
      { dir: [-1, 0, 0], norm: [-1, 0, 0], verts: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], shade: 0.8 }, // -X
      { dir: [0, 1, 0], norm: [0, 1, 0], verts: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], shade: 1.0 }, // +Y (Top)
      { dir: [0, -1, 0], norm: [0, -1, 0], verts: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], shade: 0.5 }, // -Y (Bottom)
      { dir: [0, 0, 1], norm: [0, 0, 1], verts: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], shade: 0.85 }, // +Z
      { dir: [0, 0, -1], norm: [0, 0, -1], verts: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], shade: 0.75 }  // -Z
    ];

    for (var x = startX; x < endX; x++) {
      for (var z = startZ; z < endZ; z++) {
        for (var y = 0; y < WORLD_SIZE_Y; y++) {
          var blockType = world.getBlockRaw(x, y, z);
          if (blockType === BLOCKS.AIR) continue;

          var def = BLOCK_DEFS[blockType] || BLOCK_DEFS[1];
          var isWater = (blockType === BLOCKS.WATER);

          for (var f = 0; f < 6; f++) {
            var face = faces[f];
            var nx = x + face.dir[0];
            var ny = y + face.dir[1];
            var nz = z + face.dir[2];
            var neighborType = world.getBlockRaw(nx, ny, nz);
            var neighborDef = BLOCK_DEFS[neighborType] || BLOCK_DEFS[0];

            var drawFace = false;
            if (isWater) {
              drawFace = (neighborType === BLOCKS.AIR && f === 2); // Top face of water only
            } else if (!neighborDef.solid || neighborDef.transparent) {
              drawFace = (neighborType !== blockType);
            }

            if (drawFace) {
              var hexColor = def.color;
              if (blockType === BLOCKS.GRASS && f !== 2 && def.sideColor) {
                hexColor = def.sideColor;
              }
              var r = ((hexColor >> 16) & 255) / 255 * face.shade;
              var g = ((hexColor >> 8) & 255) / 255 * face.shade;
              var b = (hexColor & 255) / 255 * face.shade;

              var pArr = isWater ? waterPositions : positions;
              var nArr = isWater ? waterNormals : normals;
              var cArr = isWater ? waterColors : colors;
              var iArr = isWater ? waterIndices : indices;
              var baseVert = isWater ? waterVertCount : vertCount;

              for (var v = 0; v < 4; v++) {
                var pt = face.verts[v];
                pArr.push(x + pt[0], y + pt[1], z + pt[2]);
                nArr.push(face.norm[0], face.norm[1], face.norm[2]);
                cArr.push(r, g, b);
              }

              iArr.push(baseVert, baseVert + 1, baseVert + 2, baseVert, baseVert + 2, baseVert + 3);

              if (isWater) {
                waterVertCount += 4;
              } else {
                vertCount += 4;
              }
            }
          }
        }
      }
    }

    var createGeom = function(pos, norm, col, ind) {
      if (pos.length === 0) return null;
      var geom = new T.BufferGeometry();
      geom.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geom.setAttribute('normal', new T.Float32BufferAttribute(norm, 3));
      geom.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      geom.setIndex(ind);
      return geom;
    };

    return {
      solidGeometry: createGeom(positions, normals, colors, indices),
      waterGeometry: createGeom(waterPositions, waterNormals, waterColors, waterIndices)
    };
  }

  // ==========================================
  // 5. APP CONTROLLER & MAIN GAME CLASS
  // ==========================================
  function VoxelForgeVRApp() {
    this.container = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.cameraRig = null;
    this.world = null;
    this.chunkMeshes = {}; // Key: 'cx,cz' -> { solidMesh, waterMesh }

    // Session & XR state
    this.xrSession = null;
    this.xrStatusText = 'Checking VR capability...';
    this.vrSupported = false;
    this.controllers = [];
    this.controllerGrips = [];
    this.handTrackers = [];
    this.prevControllerPos = [new THREE.Vector3(), new THREE.Vector3()];

    // Gameplay & Player state
    this.playerPos = new THREE.Vector3(32, 16, 32);
    this.playerVel = new THREE.Vector3(0, 0, 0);
    this.playerYaw = 0;
    this.playerPitch = 0;
    this.health = 100;
    this.hunger = 100;
    this.energy = 100;
    this.inventory = { 1: 30, 2: 30, 3: 30, 4: 20, 6: 20, 7: 20, 8: 10, bow: 1, food: 8 };
    this.hotbar = [1, 2, 3, 4, 6, 7, 8, 5, 'bow'];
    this.selectedHotbarIdx = 0;
    this.onGround = false;

    // Bow mechanics
    this.isDrawingBow = false;
    this.bowDrawProgress = 0;
    this.bowMesh = null;
    this.stringLine = null;
    this.nockedArrowMesh = null;
    this.arrows = []; // Active arrow projectiles

    // Mobs
    this.mobs = [];

    // Cooldown timers
    this.lastSwingBreakTime = [0, 0];
    this.lastPlaceTime = 0;
    this.lastDamageTime = 0;
    this.snapTurnDebounce = false;

    // Non-VR controls
    this.keys = {};
    this.mouseLocked = false;
    this.touchState = { moveX: 0, moveY: 0, looking: false, lastTouchX: 0, lastTouchY: 0 };

    // VR HUD Sprite
    this.hudSprite = null;
    this.hudCanvas = null;
    this.hudCtx = null;
    this.hudTexture = null;

    // UI elements
    this.statusElem = null;
    this.enterVrBtn = null;
  }

  VoxelForgeVRApp.prototype.launch = function(containerElem) {
    var self = this;
    if (typeof document === 'undefined') return;

    // 1. Create window via MWO.wm if available
    var winBody = containerElem;
    if (!winBody && MWO.wm && MWO.wm.create) {
      winBody = MWO.wm.create({
        id: 'vrvoxel',
        title: 'VoxelForge VR',
        icon: '🥽',
        width: 960,
        height: 600,
        resizable: true
      });
    }

    if (!winBody) {
      winBody = document.createElement('div');
      winBody.style.width = '100vw';
      winBody.style.height = '100vh';
      document.body.appendChild(winBody);
    }

    winBody.innerHTML = '';
    winBody.style.display = 'flex';
    winBody.style.flexDirection = 'column';
    winBody.style.position = 'relative';
    winBody.style.overflow = 'hidden';
    winBody.style.backgroundColor = '#111';

    this.container = winBody;

    // 2. Build DOM layout
    this.buildUI();

    // 3. Initialize Three.js Scene
    this.initThree();

    if (this.webglFailed) return; // WebGL unavailable on this browser/device — honest stop

    // 4. Initialize World & Mobs
    this.initGameWorld();

    // 5. Setup WebXR Features
    this.initWebXR();

    // 6. Setup Non-VR Event Listeners
    this.initInputs();

    // 7. Start Animation Loop
    this.renderer.setAnimationLoop(function(timestamp, frame) {
      self.update(timestamp, frame);
      self.render();
    });

    // 8. Autosave timer (60s)
    setInterval(function() {
      self.saveWorld();
    }, 60000);
  };

  VoxelForgeVRApp.prototype.buildUI = function() {
    var self = this;

    // Top Header Bar
    var header = document.createElement('div');
    header.style.cssText = 'height: 42px; background: rgba(20,20,30,0.95); display: flex; align-items: center; justify-content: space-between; padding: 0 12px; font-family: sans-serif; font-size: 13px; color: #fff; z-index: 10; border-bottom: 1px solid #334;';

    var leftGroup = document.createElement('div');
    leftGroup.style.display = 'flex';
    leftGroup.style.alignItems = 'center';
    leftGroup.style.gap = '10px';

    var titleSpan = document.createElement('span');
    titleSpan.style.fontWeight = 'bold';
    titleSpan.style.color = '#4fc3f7';
    titleSpan.textContent = '🥽 VoxelForge VR';

    this.statusElem = document.createElement('span');
    this.statusElem.style.cssText = 'padding: 3px 8px; border-radius: 4px; background: #333; color: #aaa; font-size: 12px;';
    this.statusElem.textContent = 'Detecting WebXR...';

    leftGroup.appendChild(titleSpan);
    leftGroup.appendChild(this.statusElem);

    var rightGroup = document.createElement('div');
    rightGroup.style.display = 'flex';
    rightGroup.style.alignItems = 'center';
    rightGroup.style.gap = '8px';

    this.enterVrBtn = document.createElement('button');
    this.enterVrBtn.style.cssText = 'background: #2b5c8f; border: 1px solid #4fc3f7; color: #fff; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background 0.2s;';
    this.enterVrBtn.textContent = '🥽 Enter VR';
    this.enterVrBtn.disabled = true;
    this.enterVrBtn.onclick = function() { self.requestVRSession(); };

    var saveBtn = document.createElement('button');
    saveBtn.style.cssText = 'background: #2e7d32; border: 1px solid #81c784; color: #fff; padding: 5px 10px; border-radius: 4px; cursor: pointer;';
    saveBtn.textContent = '💾 Save World';
    saveBtn.onclick = function() { self.saveWorld(); };

    rightGroup.appendChild(this.enterVrBtn);
    rightGroup.appendChild(saveBtn);

    header.appendChild(leftGroup);
    header.appendChild(rightGroup);
    this.container.appendChild(header);

    // Canvas Container
    var canvasWrap = document.createElement('div');
    canvasWrap.style.cssText = 'flex: 1; position: relative; width: 100%; height: 100%; overflow: hidden;';
    this.container.appendChild(canvasWrap);
    this.canvasWrap = canvasWrap;

    // Crosshair for Non-VR mode
    var crosshair = document.createElement('div');
    crosshair.style.cssText = 'position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; margin-top: -4px; margin-left: -4px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.8); pointer-events: none; z-index: 5;';
    canvasWrap.appendChild(crosshair);

    // Overlay HUD for Desktop / Non-VR
    var hudDiv = document.createElement('div');
    hudDiv.style.cssText = 'position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; z-index: 6; font-family: sans-serif;';

    // Stats Bar (Health, Hunger)
    var statsBar = document.createElement('div');
    statsBar.style.cssText = 'display: flex; gap: 16px; background: rgba(0,0,0,0.6); padding: 6px 14px; border-radius: 20px; color: #fff; font-size: 13px; font-weight: bold;';
    statsBar.innerHTML = '<span id="vf-hp">❤️ HP: 100</span><span id="vf-hunger">🍖 Hunger: 100</span>';
    hudDiv.appendChild(statsBar);

    // Hotbar Strip
    var hotbarStrip = document.createElement('div');
    hotbarStrip.style.cssText = 'display: flex; gap: 4px; background: rgba(0,0,0,0.7); padding: 4px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);';
    for (var i = 0; i < 9; i++) {
      var slot = document.createElement('div');
      slot.className = 'vf-hotbar-slot';
      slot.dataset.idx = i;
      slot.style.cssText = 'width: 38px; height: 38px; border: 2px solid #555; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #fff; background: #222;';
      hotbarStrip.appendChild(slot);
    }
    hudDiv.appendChild(hotbarStrip);
    canvasWrap.appendChild(hudDiv);

    this.desktopHud = {
      hpElem: statsBar.querySelector('#vf-hp'),
      hungerElem: statsBar.querySelector('#vf-hunger'),
      slots: hotbarStrip.children
    };

    // Mobile Touch Controls
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.buildTouchControls(canvasWrap);
    }
  };

  VoxelForgeVRApp.prototype.buildTouchControls = function(parent) {
    var self = this;
    var touchLayer = document.createElement('div');
    touchLayer.style.cssText = 'position: absolute; inset: 0; pointer-events: auto; z-index: 7; display: flex; justify-content: space-between; align-items: flex-end; padding: 20px;';

    // Left joystick area
    var joyArea = document.createElement('div');
    joyArea.style.cssText = 'width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3); position: relative; touch-action: none;';
    var knob = document.createElement('div');
    knob.style.cssText = 'width: 50px; height: 50px; border-radius: 50%; background: rgba(255,255,255,0.5); position: absolute; top: 35px; left: 35px; pointer-events: none;';
    joyArea.appendChild(knob);

    joyArea.addEventListener('touchstart', function(e) {
      var t = e.touches[0];
      joyArea.dataset.startX = t.clientX;
      joyArea.dataset.startY = t.clientY;
    });

    joyArea.addEventListener('touchmove', function(e) {
      var t = e.touches[0];
      var dx = t.clientX - parseFloat(joyArea.dataset.startX);
      var dy = t.clientY - parseFloat(joyArea.dataset.startY);
      var dist = Math.sqrt(dx * dx + dy * dy);
      var maxR = 35;
      if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
      knob.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      self.touchState.moveX = dx / maxR;
      self.touchState.moveY = dy / maxR;
    });

    var resetJoy = function() {
      knob.style.transform = 'translate(0px, 0px)';
      self.touchState.moveX = 0;
      self.touchState.moveY = 0;
    };
    joyArea.addEventListener('touchend', resetJoy);
    joyArea.addEventListener('touchcancel', resetJoy);

    // Right Action Buttons
    var btnArea = document.createElement('div');
    btnArea.style.cssText = 'display: flex; flex-direction: column; gap: 10px; align-items: flex-end;';

    var btnBreak = document.createElement('button');
    btnBreak.style.cssText = 'width: 60px; height: 60px; border-radius: 50%; background: #d32f2f; color: #fff; font-weight: bold; border: none; font-size: 14px;';
    btnBreak.textContent = '⛏️ Break';
    btnBreak.onclick = function() { self.performAction('break'); };

    var btnPlace = document.createElement('button');
    btnPlace.style.cssText = 'width: 60px; height: 60px; border-radius: 50%; background: #388e3c; color: #fff; font-weight: bold; border: none; font-size: 14px;';
    btnPlace.textContent = '🧱 Place';
    btnPlace.onclick = function() { self.performAction('place'); };

    var btnBow = document.createElement('button');
    btnBow.style.cssText = 'width: 65px; height: 65px; border-radius: 50%; background: #f57c00; color: #fff; font-weight: bold; border: none; font-size: 14px;';
    btnBow.textContent = '🏹 Bow';
    btnBow.addEventListener('touchstart', function() { self.isDrawingBow = true; });
    btnBow.addEventListener('touchend', function() {
      if (self.isDrawingBow) {
        self.fireBowNonVR(1.0);
        self.isDrawingBow = false;
      }
    });

    btnArea.appendChild(btnBreak);
    btnArea.appendChild(btnPlace);
    btnArea.appendChild(btnBow);

    touchLayer.appendChild(joyArea);
    touchLayer.appendChild(btnArea);
    parent.appendChild(touchLayer);
  };

  VoxelForgeVRApp.prototype.initThree = function() {
    var width = (this.canvasWrap ? this.canvasWrap.clientWidth : 960) || 960;
    var height = (this.canvasWrap ? this.canvasWrap.clientHeight : 560) || 560;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 200);

    this.cameraRig = new THREE.Group();
    this.cameraRig.position.copy(this.playerPos);
    this.cameraRig.add(this.camera);
    this.scene.add(this.cameraRig);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (glErr) {
      // WebGL is genuinely unavailable (e.g. no GPU context in this environment)
      this.webglFailed = true;
      if (this.canvasWrap) {
        this.canvasWrap.innerHTML = '<div style="padding:24px;color:#fff;font-family:sans-serif;text-align:center">\uD83E\uDD64 WebGL is not available in this browser, so the 3D world cannot render. Open MossyWoss OS in a browser with WebGL support to play (and enter VR from a VR-capable browser).</div>';
      }
      return;
    }
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = false; // Optimize for mobile VR
    if (this.canvasWrap) this.canvasWrap.appendChild(this.renderer.domElement);

    // Sun & Sky Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 0.8);
    this.sunLight.position.set(50, 80, 50);
    this.scene.add(this.sunLight);

    // Create 3D VR HUD panel
    this.createVRHUD();

    // Resize listener
    var self = this;
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', function() {
        if (!self.canvasWrap) return;
        var w = self.canvasWrap.clientWidth;
        var h = self.canvasWrap.clientHeight;
        if (w > 0 && h > 0) {
          self.camera.aspect = w / h;
          self.camera.updateProjectionMatrix();
          self.renderer.setSize(w, h);
        }
      });
    }
  };

  VoxelForgeVRApp.prototype.createVRHUD = function() {
    if (typeof document === 'undefined') return;
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.width = 512;
    this.hudCanvas.height = 256;
    this.hudCtx = this.hudCanvas.getContext('2d');

    this.hudTexture = new THREE.CanvasTexture(this.hudCanvas);
    var mat = new THREE.SpriteMaterial({ map: this.hudTexture, transparent: true, opacity: 0.95 });
    this.hudSprite = new THREE.Sprite(mat);
    this.hudSprite.scale.set(0.6, 0.3, 1);
    this.hudSprite.position.set(0, -0.35, -0.8);
    this.camera.add(this.hudSprite);

    this.renderVRHUD();
  };

  VoxelForgeVRApp.prototype.renderVRHUD = function() {
    if (!this.hudCtx) return;
    var ctx = this.hudCtx;
    ctx.clearRect(0, 0, 512, 256);

    // Panel background
    ctx.fillStyle = 'rgba(15, 20, 30, 0.85)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(10, 10, 492, 236, 16) : ctx.rect(10, 10, 492, 236);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#4fc3f7';
    ctx.stroke();

    // HP Bar
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('❤️ HEALTH', 30, 50);
    ctx.fillStyle = '#333';
    ctx.fillRect(180, 30, 290, 24);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(180, 30, Math.max(0, (this.health / 100) * 290), 24);

    // Hunger Bar
    ctx.fillStyle = '#fff';
    ctx.fillText('🍖 HUNGER', 30, 95);
    ctx.fillStyle = '#333';
    ctx.fillRect(180, 75, 290, 24);
    ctx.fillStyle = '#fb8c00';
    ctx.fillRect(180, 75, Math.max(0, (this.hunger / 100) * 290), 24);

    // Selected Item Info
    var activeItem = this.hotbar[this.selectedHotbarIdx];
    var itemName = activeItem === 'bow' ? '🏹 Bow & Arrow' : (BLOCK_DEFS[activeItem] ? BLOCK_DEFS[activeItem].name : 'Item');
    var count = activeItem === 'bow' ? '∞' : (this.inventory[activeItem] || 0);

    ctx.fillStyle = '#81c784';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Equipped: ' + itemName + ' (x' + count + ')', 30, 155);

    // VR Controls Hint
    ctx.fillStyle = '#b0bec5';
    ctx.font = '18px sans-serif';
    ctx.fillText('Right Swing: Break/Punch | Right Grip: Draw Bow', 30, 195);
    ctx.fillText('Left Ray: Aim/Place | Left Stick: Move | A/X: Cycle Item', 30, 222);

    this.hudTexture.needsUpdate = true;

    // Also update Desktop HUD UI
    if (this.desktopHud) {
      this.desktopHud.hpElem.textContent = '❤️ HP: ' + Math.ceil(this.health);
      this.desktopHud.hungerElem.textContent = '🍖 Hunger: ' + Math.ceil(this.hunger);
      for (var i = 0; i < 9; i++) {
        var slot = this.desktopHud.slots[i];
        if (!slot) continue;
        var item = this.hotbar[i];
        var isSel = (i === this.selectedHotbarIdx);
        slot.style.borderColor = isSel ? '#4fc3f7' : '#555';
        slot.style.transform = isSel ? 'scale(1.15)' : 'scale(1)';

        if (item === 'bow') {
          slot.textContent = '🏹';
        } else {
          var bDef = BLOCK_DEFS[item];
          slot.textContent = bDef ? bDef.name.substring(0, 3) : '';
          if (bDef && bDef.color) {
            slot.style.backgroundColor = '#' + bDef.color.toString(16).padStart(6, '0');
          }
        }
      }
    }
  };

  VoxelForgeVRApp.prototype.initGameWorld = function() {
    var self = this;
    this.world = new VoxelWorld();

    // Load saved world if present
    this.loadWorld();

    // Render Chunks
    this.rebuildAllChunks();

    // Spawn Player safely above heightmap
    var spawnY = this.findSurfaceHeight(32, 32) + 2;
    this.playerPos.set(32, spawnY, 32);
    if (this.cameraRig) this.cameraRig.position.copy(this.playerPos);

    // Spawn Mobs
    this.spawnMobs();
  };

  VoxelForgeVRApp.prototype.findSurfaceHeight = function(x, z) {
    for (var y = WORLD_SIZE_Y - 1; y >= 0; y--) {
      var b = this.world.getBlockRaw(x, y, z);
      if (b !== BLOCKS.AIR && b !== BLOCKS.WATER) return y;
    }
    return 10;
  };

  VoxelForgeVRApp.prototype.rebuildAllChunks = function() {
    var chunksX = WORLD_SIZE_X / CHUNK_SIZE;
    var chunksZ = WORLD_SIZE_Z / CHUNK_SIZE;

    for (var cx = 0; cx < chunksX; cx++) {
      for (var cz = 0; cz < chunksZ; cz++) {
        this.rebuildChunk(cx, cz);
      }
    }
  };

  VoxelForgeVRApp.prototype.rebuildChunk = function(cx, cz) {
    var key = cx + ',' + cz;

    if (this.chunkMeshes[key] && this.scene) {
      if (this.chunkMeshes[key].solid) this.scene.remove(this.chunkMeshes[key].solid);
      if (this.chunkMeshes[key].water) this.scene.remove(this.chunkMeshes[key].water);
    }

    var result = buildChunkGeometry(this.world, cx, cz, THREE);
    var meshGroup = {};

    if (result.solidGeometry) {
      var solidMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.FrontSide });
      var solidMesh = new THREE.Mesh(result.solidGeometry, solidMat);
      if (this.scene) this.scene.add(solidMesh);
      meshGroup.solid = solidMesh;
    }

    if (result.waterGeometry) {
      var waterMat = new THREE.MeshLambertMaterial({
        color: 0x2196f3,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      var waterMesh = new THREE.Mesh(result.waterGeometry, waterMat);
      if (this.scene) this.scene.add(waterMesh);
      meshGroup.water = waterMesh;
    }

    this.chunkMeshes[key] = meshGroup;
  };

  VoxelForgeVRApp.prototype.rebuildChunkAtBlock = function(x, y, z) {
    var cx = Math.floor(x / CHUNK_SIZE);
    var cz = Math.floor(z / CHUNK_SIZE);
    this.rebuildChunk(cx, cz);

    // Rebuild adjacent chunks if block lies on chunk boundary
    if (x % CHUNK_SIZE === 0 && cx > 0) this.rebuildChunk(cx - 1, cz);
    if (x % CHUNK_SIZE === CHUNK_SIZE - 1 && cx < (WORLD_SIZE_X / CHUNK_SIZE) - 1) this.rebuildChunk(cx + 1, cz);
    if (z % CHUNK_SIZE === 0 && cz > 0) this.rebuildChunk(cx, cz - 1);
    if (z % CHUNK_SIZE === CHUNK_SIZE - 1 && cz < (WORLD_SIZE_Z / CHUNK_SIZE) - 1) this.rebuildChunk(cx, cz + 1);
  };

  VoxelForgeVRApp.prototype.spawnMobs = function() {
    // Spawn 4 pigs, 3 zombies, 3 sheep
    var mobTypes = ['pig', 'pig', 'pig', 'pig', 'zombie', 'zombie', 'zombie', 'sheep', 'sheep', 'sheep'];
    for (var i = 0; i < mobTypes.length; i++) {
      var rx = 10 + Math.floor(Math.random() * 44);
      var rz = 10 + Math.floor(Math.random() * 44);
      var ry = this.findSurfaceHeight(rx, rz) + 1;
      this.createMob(mobTypes[i], rx, ry, rz);
    }
  };

  VoxelForgeVRApp.prototype.createMob = function(type, x, y, z) {
    var group = new THREE.Group();
    group.position.set(x, y, z);

    var mainMat = new THREE.MeshLambertMaterial({ color: type === 'pig' ? 0xf8bbd0 : (type === 'zombie' ? 0x388e3c : 0xf5f5f5) });
    var bodyGeom = new THREE.BoxGeometry(0.8, 0.6, 1.0);
    var bodyMesh = new THREE.Mesh(bodyGeom, mainMat);
    bodyMesh.position.y = 0.5;
    group.add(bodyMesh);

    var headGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    var headMesh = new THREE.Mesh(headGeom, mainMat);
    headMesh.position.set(0, 0.9, 0.6);
    group.add(headMesh);

    // Legs
    var legs = [];
    var legGeom = new THREE.BoxGeometry(0.2, 0.4, 0.2);
    var legOffsets = [[-0.3, 0.2, 0.3], [0.3, 0.2, 0.3], [-0.3, 0.2, -0.3], [0.3, 0.2, -0.3]];
    for (var l = 0; l < 4; l++) {
      var leg = new THREE.Mesh(legGeom, mainMat);
      leg.position.set(legOffsets[l][0], legOffsets[l][1], legOffsets[l][2]);
      group.add(leg);
      legs.push(leg);
    }

    if (this.scene) this.scene.add(group);

    this.mobs.push({
      type: type,
      group: group,
      legs: legs,
      position: group.position,
      velocity: new THREE.Vector3(),
      health: type === 'zombie' ? 40 : 20,
      fleeTimer: 0,
      attackTimer: 0,
      moveTimer: Math.random() * 3
    });
  };

  // ==========================================
  // 6. REAL WEBXR INTEGRATION (SESSION & CONTROLLERS)
  // ==========================================
  VoxelForgeVRApp.prototype.initWebXR = function() {
    var self = this;
    if (typeof navigator === 'undefined' || !navigator.xr) {
      this.xrStatusText = 'WebXR unavailable on this browser';
      this.updateVRStatusUI();
      return;
    }

    if (this.renderer && this.renderer.xr) {
      this.renderer.xr.enabled = true;
    }

    // Feature Detection check
    navigator.xr.isSessionSupported('immersive-vr').then(function(supported) {
      self.vrSupported = supported;
      if (supported) {
        self.xrStatusText = '✓ VR ready — Enter VR';
        if (self.enterVrBtn) {
          self.enterVrBtn.disabled = false;
          self.enterVrBtn.style.background = '#2e7d32';
        }
      } else {
        self.xrStatusText = 'VR not detected — playing on screen';
        if (self.enterVrBtn) self.enterVrBtn.disabled = true;
      }
      self.updateVRStatusUI();
    }).catch(function() {
      self.vrSupported = false;
      self.xrStatusText = 'VR not detected — playing on screen';
      self.updateVRStatusUI();
    });

    if (!this.renderer || !this.renderer.xr) return;

    // Setup 2 XR Controllers
    for (var i = 0; i < 2; i++) {
      var controller = this.renderer.xr.getController(i);
      var grip = this.renderer.xr.getControllerGrip(i);

      controller.userData.index = i;
      controller.userData.handedness = null;

      // Controller Ray Line
      var rayGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-4)]);
      var rayMat = new THREE.LineBasicMaterial({ color: 0x4fc3f7, linewidth: 2, transparent: true, opacity: 0.7 });
      var rayLine = new THREE.Line(rayGeom, rayMat);
      rayLine.name = 'rayLine';
      controller.add(rayLine);

      // Grip Visual Mesh (Simple Box Model)
      var gripGeom = new THREE.BoxGeometry(0.06, 0.08, 0.16);
      var gripMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
      var gripMesh = new THREE.Mesh(gripGeom, gripMat);
      grip.add(gripMesh);

      controller.addEventListener('connected', function(evt) {
        var inputSource = evt.data;
        this.userData.handedness = inputSource.handedness; // 'left' or 'right'
        this.userData.inputSource = inputSource;
        this.visible = true;
      });

      controller.addEventListener('disconnected', function() {
        this.userData.handedness = null;
        this.userData.inputSource = null;
        this.visible = false;
      });

      if (this.cameraRig) {
        this.cameraRig.add(controller);
        this.cameraRig.add(grip);
      }

      this.controllers.push(controller);
      this.controllerGrips.push(grip);
    }

    // Bow visual attached to right controller
    this.createBowMesh();
  };

  VoxelForgeVRApp.prototype.updateVRStatusUI = function() {
    if (this.statusElem) {
      this.statusElem.textContent = this.xrStatusText;
      if (this.vrSupported) {
        this.statusElem.style.background = '#1b5e20';
        this.statusElem.style.color = '#81c784';
      } else {
        this.statusElem.style.background = '#333';
        this.statusElem.style.color = '#bbb';
      }
    }
  };

  VoxelForgeVRApp.prototype.requestVRSession = function() {
    var self = this;
    if (!navigator.xr) return;

    var sessionInit = {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
    };

    navigator.xr.requestSession('immersive-vr', sessionInit).then(function(session) {
      self.xrSession = session;
      if (self.renderer && self.renderer.xr) {
        self.renderer.xr.setSession(session);
        self.renderer.xr.setReferenceSpaceType('local-floor');

        if (typeof self.renderer.xr.setFramebufferScaleFactor === 'function') {
          self.renderer.xr.setFramebufferScaleFactor(0.8);
        }
      }

      session.addEventListener('end', function() {
        self.xrSession = null;
        self.xrStatusText = '✓ VR ready — Enter VR';
        self.updateVRStatusUI();
      });

      self.xrStatusText = '🥽 VR Active';
      self.updateVRStatusUI();

    }).catch(function(err) {
      console.warn('WebXR session error:', err);
      if (MWO.notif && MWO.notif.show) {
        MWO.notif.show('VR Error', err.message || 'Could not launch WebXR session');
      }
    });
  };

  VoxelForgeVRApp.prototype.createBowMesh = function() {
    // Bow Group
    this.bowMesh = new THREE.Group();

    // Curved wood arc
    var arcGeom = new THREE.TorusGeometry(0.35, 0.02, 8, 24, Math.PI * 0.8);
    var woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    var arcMesh = new THREE.Mesh(arcGeom, woodMat);
    arcMesh.rotation.z = Math.PI * 0.1;
    this.bowMesh.add(arcMesh);

    // Dynamic String Line
    var stringGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.35, 0)
    ]);
    var stringMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    this.stringLine = new THREE.Line(stringGeom, stringMat);
    this.bowMesh.add(this.stringLine);

    // Nocked Arrow Mesh
    var arrowGroup = new THREE.Group();
    var shaftGeom = new THREE.CylinderGeometry(0.008, 0.008, 0.6);
    var shaftMat = new THREE.MeshLambertMaterial({ color: 0x795548 });
    var shaft = new THREE.Mesh(shaftGeom, shaftMat);
    shaft.rotation.x = Math.PI / 2;
    arrowGroup.add(shaft);

    var headGeom = new THREE.ConeGeometry(0.025, 0.08, 4);
    var headMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
    var head = new THREE.Mesh(headGeom, headMat);
    head.rotation.x = -Math.PI / 2;
    head.position.z = -0.3;
    arrowGroup.add(head);

    this.nockedArrowMesh = arrowGroup;
    this.nockedArrowMesh.visible = false;
    this.bowMesh.add(this.nockedArrowMesh);

    this.bowMesh.visible = false;
    if (this.scene) this.scene.add(this.bowMesh);
  };

  // ==========================================
  // 7. INPUT HANDLING & FRAME UPDATES
  // ==========================================
  VoxelForgeVRApp.prototype.initInputs = function() {
    var self = this;
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', function(e) {
      self.keys[e.key.toLowerCase()] = true;

      // Hotbar key selection (1-9)
      if (e.key >= '1' && e.key <= '9') {
        var idx = parseInt(e.key) - 1;
        self.selectedHotbarIdx = idx;
        self.renderVRHUD();
      }
      if (e.key.toLowerCase() === 'e') {
        self.eatFood();
      }
    });

    window.addEventListener('keyup', function(e) {
      self.keys[e.key.toLowerCase()] = false;
    });

    // Pointer lock for desktop mouse look
    if (this.canvasWrap) {
      this.canvasWrap.addEventListener('click', function() {
        if (!self.xrSession && self.canvasWrap.requestPointerLock) {
          self.canvasWrap.requestPointerLock();
        }
      });

      document.addEventListener('pointerlockchange', function() {
        self.mouseLocked = (document.pointerLockElement === self.canvasWrap);
      });

      window.addEventListener('mousemove', function(e) {
        if (self.mouseLocked) {
          self.playerYaw -= e.movementX * 0.0025;
          self.playerPitch -= e.movementY * 0.0025;
          self.playerPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, self.playerPitch));
          if (self.camera) self.camera.rotation.set(self.playerPitch, self.playerYaw, 0, 'YXZ');
        }
      });

      window.addEventListener('mousedown', function(e) {
        if (self.mouseLocked) {
          if (e.button === 0) { // Left Click = Break / Punch / Fire Bow
            if (self.hotbar[self.selectedHotbarIdx] === 'bow') {
              self.fireBowNonVR(1.0);
            } else {
              self.performAction('break');
            }
          } else if (e.button === 2) { // Right Click = Place Block
            self.performAction('place');
          }
        }
      });

      // Context menu prevent for right click place block
      this.canvasWrap.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    }
  };

  VoxelForgeVRApp.prototype.eatFood = function() {
    if (this.inventory.food && this.inventory.food > 0) {
      this.inventory.food--;
      this.hunger = Math.min(100, this.hunger + 30);
      this.health = Math.min(100, this.health + 15);
      this.renderVRHUD();
      if (MWO.notif && MWO.notif.show) MWO.notif.show('VoxelForge VR', 'Ate food (+30 Hunger, +15 HP)');
    }
  };

  VoxelForgeVRApp.prototype.triggerHaptic = function(gamepad, intensity, duration) {
    if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0] && typeof gamepad.hapticActuators[0].pulse === 'function') {
      try {
        gamepad.hapticActuators[0].pulse(intensity || 0.8, duration || 100);
      } catch (e) {}
    }
  };

  VoxelForgeVRApp.prototype.update = function(timestamp, frame) {
    var dt = 0.016; // Standard frame step

    // 1. Day / Night Cycle
    var dayTime = (timestamp || 0) * 0.0001;
    var sunAngle = dayTime % (Math.PI * 2);
    if (this.sunLight) this.sunLight.position.set(Math.cos(sunAngle) * 60 + 32, Math.sin(sunAngle) * 60, 32);

    var dayFactor = Math.max(0, Math.sin(sunAngle));
    var skyColor = new THREE.Color().setHSL(0.58, 0.6, 0.2 + dayFactor * 0.5);
    if (this.scene) {
      this.scene.background.copy(skyColor);
      if (this.scene.fog) this.scene.fog.color.copy(skyColor);
    }
    if (this.ambientLight) this.ambientLight.intensity = 0.2 + dayFactor * 0.6;

    // 2. VR Input Logic & Motion Mechanics
    if (this.xrSession) {
      this.updateVRInputs(frame, dt);
    } else {
      this.updateNonVRInputs(dt);
    }

    // 3. Arrow Physics Simulation
    this.updateArrows(dt);

    // 4. Mob AI Simulation
    this.updateMobs(dt);

    // 5. Hunger drain
    if (Math.random() < 0.001) {
      this.hunger = Math.max(0, this.hunger - 1);
      if (this.hunger === 0) this.health = Math.max(0, this.health - 2);
      this.renderVRHUD();
    }
  };

  VoxelForgeVRApp.prototype.updateVRInputs = function(frame, dt) {
    var session = this.xrSession;
    if (!session || !session.inputSources) return;

    var leftController = null, rightController = null;
    var leftGrip = null, rightGrip = null;
    var leftGamepad = null, rightGamepad = null;

    for (var i = 0; i < this.controllers.length; i++) {
      var ctrl = this.controllers[i];
      var grip = this.controllerGrips[i];
      var handed = ctrl.userData.handedness;
      var src = ctrl.userData.inputSource;

      if (handed === 'left') {
        leftController = ctrl; leftGrip = grip; leftGamepad = src ? src.gamepad : null;
      } else if (handed === 'right') {
        rightController = ctrl; rightGrip = grip; rightGamepad = src ? src.gamepad : null;
      }

      // Hand Tracking check
      if (src && src.hand && frame && typeof frame.getJointPose === 'function') {
        this.updateHandTracking(src, frame);
      }
    }

    // A. VR Locomotion (Left Thumbstick) & Snap Turn (Right Thumbstick)
    if (leftGamepad && leftGamepad.axes) {
      var lx = leftGamepad.axes[2] || leftGamepad.axes[0] || 0;
      var ly = leftGamepad.axes[3] || leftGamepad.axes[1] || 0;
      if (Math.abs(lx) > 0.15 || Math.abs(ly) > 0.15) {
        var cameraDir = new THREE.Vector3();
        if (this.camera) this.camera.getWorldDirection(cameraDir);
        cameraDir.y = 0;
        cameraDir.normalize();

        var sideDir = new THREE.Vector3().crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).negate();
        var moveVec = new THREE.Vector3();
        moveVec.addScaledVector(cameraDir, -ly * 3.0 * dt);
        moveVec.addScaledVector(sideDir, lx * 3.0 * dt);

        if (this.cameraRig) this.cameraRig.position.add(moveVec);
      }
    }

    if (rightGamepad && rightGamepad.axes) {
      var rx = rightGamepad.axes[2] || rightGamepad.axes[0] || 0;
      if (Math.abs(rx) > 0.6) {
        if (!this.snapTurnDebounce) {
          var turnAngle = (rx > 0 ? -Math.PI / 6 : Math.PI / 6);
          if (this.cameraRig) this.cameraRig.rotateY(turnAngle);
          this.snapTurnDebounce = true;
          this.triggerHaptic(rightGamepad, 0.4, 50);
        }
      } else {
        this.snapTurnDebounce = false;
      }

      // Cycle Hotbar item (A/X button: index 4)
      if (rightGamepad.buttons[4] && rightGamepad.buttons[4].pressed) {
        if (!this.buttonADebounce) {
          this.selectedHotbarIdx = (this.selectedHotbarIdx + 1) % 9;
          this.renderVRHUD();
          this.triggerHaptic(rightGamepad, 0.5, 40);
          this.buttonADebounce = true;
        }
      } else {
        this.buttonADebounce = false;
      }
    }

    // B. SWING-BREAK & PUNCH (Velocity check on controllers)
    var now = Date.now();
    for (var c = 0; c < 2; c++) {
      var ctrl = this.controllers[c];
      if (!ctrl || !ctrl.visible) continue;

      var currentPos = new THREE.Vector3();
      ctrl.getWorldPosition(currentPos);
      var prevPos = this.prevControllerPos[c];
      var distMoved = currentPos.distanceTo(prevPos);
      var speed = distMoved / dt; // Velocity m/s
      this.prevControllerPos[c].copy(currentPos);

      if (speed > 2.2 && (now - this.lastSwingBreakTime[c] > 250)) {
        // Swing detection
        var hitBlock = this.checkVRSwingHitBlock(currentPos, 1.2);
        if (hitBlock) {
          this.world.setBlock(hitBlock.x, hitBlock.y, hitBlock.z, BLOCKS.AIR);
          this.rebuildChunkAtBlock(hitBlock.x, hitBlock.y, hitBlock.z);
          this.lastSwingBreakTime[c] = now;
          var gp = (ctrl.userData.handedness === 'left' ? leftGamepad : rightGamepad);
          this.triggerHaptic(gp, 0.9, 100);
          this.inventory[hitBlock.type] = (this.inventory[hitBlock.type] || 0) + 1;
          this.renderVRHUD();
        }

        // Punch Mob check
        var hitMob = this.checkVRSwingHitMob(currentPos, 1.5);
        if (hitMob) {
          hitMob.health -= 25;
          hitMob.fleeTimer = 4.0;
          var knockDir = hitMob.position.clone().sub(currentPos).normalize();
          hitMob.velocity.addScaledVector(knockDir, 6.0);
          this.lastSwingBreakTime[c] = now;
          var gp = (ctrl.userData.handedness === 'left' ? leftGamepad : rightGamepad);
          this.triggerHaptic(gp, 1.0, 120);
        }
      }
    }

    // C. BOW MECHANIC (Hold Squeeze on Right Controller)
    var isBowEquipped = (this.hotbar[this.selectedHotbarIdx] === 'bow');
    var isRightSqueeze = rightGamepad && rightGamepad.buttons[1] && rightGamepad.buttons[1].pressed;
    var isRightTrigger = rightGamepad && rightGamepad.buttons[0] && rightGamepad.buttons[0].pressed;

    if (isBowEquipped && isRightSqueeze && rightGrip) {
      if (this.bowMesh) this.bowMesh.visible = true;
      var rPos = new THREE.Vector3();
      var rQuat = new THREE.Quaternion();
      rightGrip.getWorldPosition(rPos);
      rightGrip.getWorldQuaternion(rQuat);

      if (this.bowMesh) {
        this.bowMesh.position.copy(rPos);
        this.bowMesh.quaternion.copy(rQuat);
      }

      var pullDist = 0.2;
      if (leftGrip) {
        var lPos = new THREE.Vector3();
        leftGrip.getWorldPosition(lPos);
        pullDist = rPos.distanceTo(lPos);
        pullDist = Math.min(0.8, Math.max(0.2, pullDist));
      }

      // Dynamically draw string and nocked arrow
      if (this.nockedArrowMesh) {
        this.nockedArrowMesh.visible = true;
        this.nockedArrowMesh.position.set(0, 0, pullDist * 0.5);
      }

      if (this.isDrawingBow && !isRightTrigger && this.prevRightTrigger) {
        // Trigger released -> Fire Arrow!
        var fireDir = new THREE.Vector3(0, 0, -1).applyQuaternion(rQuat);
        this.fireArrow(rPos, fireDir, pullDist * 32);
        this.triggerHaptic(rightGamepad, 1.0, 150);
        this.isDrawingBow = false;
        if (this.nockedArrowMesh) this.nockedArrowMesh.visible = false;
      }

      if (isRightTrigger) {
        this.isDrawingBow = true;
      }
      this.prevRightTrigger = isRightTrigger;

    } else {
      if (this.bowMesh) this.bowMesh.visible = false;
      if (this.nockedArrowMesh) this.nockedArrowMesh.visible = false;
      this.isDrawingBow = false;
    }

    // D. BLOCK PLACE (Aim ray from Left Controller + Squeeze button)
    var isLeftSqueeze = leftGamepad && leftGamepad.buttons[1] && leftGamepad.buttons[1].pressed;
    if (isLeftSqueeze && leftController && (now - this.lastPlaceTime > 300)) {
      var rayPos = new THREE.Vector3();
      var rayDir = new THREE.Vector3();
      leftController.getWorldPosition(rayPos);
      leftController.getWorldDirection(rayDir);
      rayDir.negate();

      var placeHit = this.raycastWorld(rayPos, rayDir, 3.5);
      if (placeHit && placeHit.emptyPos) {
        var activeBlock = this.hotbar[this.selectedHotbarIdx];
        if (activeBlock !== 'bow' && (this.inventory[activeBlock] || 0) > 0) {
          this.world.setBlock(placeHit.emptyPos.x, placeHit.emptyPos.y, placeHit.emptyPos.z, activeBlock);
          this.rebuildChunkAtBlock(placeHit.emptyPos.x, placeHit.emptyPos.y, placeHit.emptyPos.z);
          this.inventory[activeBlock]--;
          this.lastPlaceTime = now;
          this.triggerHaptic(leftGamepad, 0.7, 80);
          this.renderVRHUD();
        }
      }
    }
  };

  VoxelForgeVRApp.prototype.updateHandTracking = function(inputSource, frame) {
    if (!inputSource.hand || !this.renderer || !this.renderer.xr) return;
    var refSpace = this.renderer.xr.getReferenceSpace();
    if (!refSpace) return;

    var indexTip = inputSource.hand.get('index-finger-tip');
    if (indexTip) {
      var pose = frame.getJointPose(indexTip, refSpace);
      if (pose) {
        var jointPos = new THREE.Vector3().copy(pose.transform.position);
        if (this.cameraRig) jointPos.add(this.cameraRig.position);
      }
    }
  };

  VoxelForgeVRApp.prototype.updateNonVRInputs = function(dt) {
    var moveDir = new THREE.Vector3();

    if (this.keys['w']) moveDir.z -= 1;
    if (this.keys['s']) moveDir.z += 1;
    if (this.keys['a']) moveDir.x -= 1;
    if (this.keys['d']) moveDir.x += 1;

    // Mobile touch joystick input
    if (this.touchState.moveX !== 0 || this.touchState.moveY !== 0) {
      moveDir.x += this.touchState.moveX;
      moveDir.z += this.touchState.moveY;
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      var speed = (this.keys['shift'] ? 7.0 : 4.0);

      var cameraYawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.playerYaw);
      moveDir.applyQuaternion(cameraYawQuat);

      this.playerPos.addScaledVector(moveDir, speed * dt);
      if (this.cameraRig) this.cameraRig.position.copy(this.playerPos);
    }
  };

  VoxelForgeVRApp.prototype.checkVRSwingHitBlock = function(handPos, maxDist) {
    if (!this.world) return null;
    var bx = Math.floor(handPos.x);
    var by = Math.floor(handPos.y);
    var bz = Math.floor(handPos.z);

    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        for (var dz = -1; dz <= 1; dz++) {
          var cx = bx + dx;
          var cy = by + dy;
          var cz = bz + dz;
          var bType = this.world.getBlockRaw(cx, cy, cz);
          if (bType !== BLOCKS.AIR && bType !== BLOCKS.WATER) {
            var center = new THREE.Vector3(cx + 0.5, cy + 0.5, cz + 0.5);
            if (center.distanceTo(handPos) <= maxDist) {
              return { x: cx, y: cy, z: cz, type: bType };
            }
          }
        }
      }
    }
    return null;
  };

  VoxelForgeVRApp.prototype.checkVRSwingHitMob = function(handPos, maxDist) {
    for (var i = 0; i < this.mobs.length; i++) {
      var mob = this.mobs[i];
      if (mob.health > 0 && mob.position.distanceTo(handPos) <= maxDist) {
        return mob;
      }
    }
    return null;
  };

  VoxelForgeVRApp.prototype.raycastWorld = function(origin, direction, maxDistance) {
    if (!this.world) return null;
    var step = 0.1;
    var pos = origin.clone();
    var prevPos = pos.clone();

    for (var d = 0; d < maxDistance; d += step) {
      pos.addScaledVector(direction, step);
      var bx = Math.floor(pos.x);
      var by = Math.floor(pos.y);
      var bz = Math.floor(pos.z);

      var bType = this.world.getBlockRaw(bx, by, bz);
      if (bType !== BLOCKS.AIR && bType !== BLOCKS.WATER) {
        return {
          hitBlock: { x: bx, y: by, z: bz, type: bType },
          emptyPos: { x: Math.floor(prevPos.x), y: Math.floor(prevPos.y), z: Math.floor(prevPos.z) }
        };
      }
      prevPos.copy(pos);
    }
    return null;
  };

  VoxelForgeVRApp.prototype.performAction = function(actionType) {
    if (!this.camera) return;
    var camPos = new THREE.Vector3();
    var camDir = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);
    this.camera.getWorldDirection(camDir);

    var hit = this.raycastWorld(camPos, camDir, 4.0);
    if (!hit) return;

    if (actionType === 'break' && hit.hitBlock) {
      this.world.setBlock(hit.hitBlock.x, hit.hitBlock.y, hit.hitBlock.z, BLOCKS.AIR);
      this.rebuildChunkAtBlock(hit.hitBlock.x, hit.hitBlock.y, hit.hitBlock.z);
      this.inventory[hit.hitBlock.type] = (this.inventory[hit.hitBlock.type] || 0) + 1;
      this.renderVRHUD();
    } else if (actionType === 'place' && hit.emptyPos) {
      var activeItem = this.hotbar[this.selectedHotbarIdx];
      if (activeItem !== 'bow' && (this.inventory[activeItem] || 0) > 0) {
        this.world.setBlock(hit.emptyPos.x, hit.emptyPos.y, hit.emptyPos.z, activeItem);
        this.rebuildChunkAtBlock(hit.emptyPos.x, hit.emptyPos.y, hit.emptyPos.z);
        this.inventory[activeItem]--;
        this.renderVRHUD();
      }
    }
  };

  VoxelForgeVRApp.prototype.fireBowNonVR = function(power) {
    var origin = new THREE.Vector3();
    var dir = new THREE.Vector3();
    if (this.camera) {
      this.camera.getWorldPosition(origin);
      this.camera.getWorldDirection(dir);
    } else {
      origin.copy(this.playerPos);
      dir.set(0, 0, -1);
    }
    this.fireArrow(origin, dir, 25 * power);
  };

  VoxelForgeVRApp.prototype.fireArrow = function(origin, direction, speed) {
    var arrowGroup = new THREE.Group();
    var shaftGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.7);
    var shaftMat = new THREE.MeshLambertMaterial({ color: 0x795548 });
    var shaft = new THREE.Mesh(shaftGeom, shaftMat);
    shaft.rotation.x = Math.PI / 2;
    arrowGroup.add(shaft);

    var headGeom = new THREE.ConeGeometry(0.03, 0.1, 4);
    var headMat = new THREE.MeshLambertMaterial({ color: 0x616161 });
    var head = new THREE.Mesh(headGeom, headMat);
    head.rotation.x = -Math.PI / 2;
    head.position.z = -0.35;
    arrowGroup.add(head);

    arrowGroup.position.copy(origin);
    if (this.scene) this.scene.add(arrowGroup);

    var vel = direction.clone().normalize().multiplyScalar(speed);

    this.arrows.push({
      mesh: arrowGroup,
      velocity: vel,
      stuck: false,
      life: 0
    });
  };

  VoxelForgeVRApp.prototype.updateArrows = function(dt) {
    for (var i = this.arrows.length - 1; i >= 0; i--) {
      var arrow = this.arrows[i];
      arrow.life += dt;

      if (arrow.stuck) {
        if (arrow.life > 10.0) {
          if (this.scene) this.scene.remove(arrow.mesh);
          this.arrows.splice(i, 1);
        }
        continue;
      }

      // Gravity arc simulation step
      arrow.velocity.y -= 9.8 * dt;
      arrow.mesh.position.addScaledVector(arrow.velocity, dt);

      // Point arrow in motion direction
      var targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1), arrow.velocity.clone().normalize());
      arrow.mesh.quaternion.copy(targetQuat);

      var pos = arrow.mesh.position;
      var bx = Math.floor(pos.x);
      var by = Math.floor(pos.y);
      var bz = Math.floor(pos.z);

      // Block collision check
      if (this.world) {
        var bType = this.world.getBlockRaw(bx, by, bz);
        if (bType !== BLOCKS.AIR && bType !== BLOCKS.WATER) {
          arrow.stuck = true;
          continue;
        }
      }

      // Mob collision check
      for (var m = 0; m < this.mobs.length; m++) {
        var mob = this.mobs[m];
        if (mob.health > 0 && mob.position.distanceTo(pos) < 0.9) {
          mob.health -= 35;
          mob.fleeTimer = 5.0;
          mob.velocity.addScaledVector(arrow.velocity.clone().normalize(), 8.0);
          if (this.scene) this.scene.remove(arrow.mesh);
          this.arrows.splice(i, 1);
          break;
        }
      }
    }
  };

  VoxelForgeVRApp.prototype.updateMobs = function(dt) {
    for (var i = this.mobs.length - 1; i >= 0; i--) {
      var mob = this.mobs[i];

      if (mob.health <= 0) {
        // Drop food item on mob defeat
        this.inventory.food = (this.inventory.food || 0) + 2;
        if (this.scene) this.scene.remove(mob.group);
        this.mobs.splice(i, 1);
        this.renderVRHUD();
        continue;
      }

      // Gravity & Terrain Ground Check
      mob.velocity.y -= 9.8 * dt;
      var targetGroundY = this.findSurfaceHeight(Math.floor(mob.position.x), Math.floor(mob.position.z)) + 1;
      if (mob.position.y <= targetGroundY) {
        mob.position.y = targetGroundY;
        mob.velocity.y = 0;
      }

      // AI Logic & Movement
      var playerTargetPos = this.cameraRig ? this.cameraRig.position : this.playerPos;
      if (mob.fleeTimer > 0) {
        mob.fleeTimer -= dt;
        var fleeDir = mob.position.clone().sub(playerTargetPos);
        fleeDir.y = 0;
        fleeDir.normalize();
        mob.position.addScaledVector(fleeDir, 5.0 * dt);
      } else if (mob.type === 'zombie') {
        var distToPlayer = mob.position.distanceTo(playerTargetPos);
        if (distToPlayer < 12.0) {
          var approachDir = playerTargetPos.clone().sub(mob.position);
          approachDir.y = 0;
          approachDir.normalize();
          mob.position.addScaledVector(approachDir, 2.8 * dt);

          if (distToPlayer < 1.4 && Date.now() - this.lastDamageTime > 1000) {
            this.health = Math.max(0, this.health - 12);
            this.lastDamageTime = Date.now();
            this.renderVRHUD();
          }
        }
      } else {
        mob.moveTimer -= dt;
        if (mob.moveTimer <= 0) {
          mob.moveTimer = 3 + Math.random() * 4;
          mob.heading = Math.random() * Math.PI * 2;
        }
        if (mob.heading !== undefined) {
          var moveDir = new THREE.Vector3(Math.cos(mob.heading), 0, Math.sin(mob.heading));
          mob.position.addScaledVector(moveDir, 1.2 * dt);
        }
      }

      // Leg Walking Animation
      for (var l = 0; l < mob.legs.length; l++) {
        mob.legs[l].rotation.x = Math.sin(Date.now() * 0.008 + l) * 0.4;
      }

      // Apply residual knockback velocity
      mob.position.addScaledVector(mob.velocity, dt);
      mob.velocity.multiplyScalar(0.85);
    }
  };

  VoxelForgeVRApp.prototype.saveWorld = function() {
    if (!this.world) return;
    var diffData = this.world.exportDiffs();
    var saveData = {
      seed: diffData.seed,
      diffs: diffData.diffs,
      inventory: this.inventory,
      health: this.health,
      hunger: this.hunger
    };
    var jsonStr = JSON.stringify(saveData);

    if (MWO.fs && typeof MWO.fs.writeFile === 'function') {
      try {
        MWO.fs.writeFile('/Games/vf_world.json', jsonStr);
        if (MWO.notif && MWO.notif.show) MWO.notif.show('VoxelForge VR', 'World saved to OS Virtual Filesystem');
      } catch (e) {
        console.warn('FS save error:', e);
      }
    } else if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('vf_world_save', jsonStr);
      } catch (e) {}
    }
  };

  VoxelForgeVRApp.prototype.loadWorld = function() {
    var jsonStr = null;
    if (MWO.fs && typeof MWO.fs.readFile === 'function') {
      try {
        jsonStr = MWO.fs.readFile('/Games/vf_world.json');
      } catch (e) {}
    }
    if (!jsonStr && typeof localStorage !== 'undefined') {
      try {
        jsonStr = localStorage.getItem('vf_world_save');
      } catch (e) {}
    }

    if (jsonStr) {
      try {
        var saveData = JSON.parse(jsonStr);
        if (this.world) this.world.importDiffs(saveData);
        if (saveData.inventory) this.inventory = saveData.inventory;
        if (saveData.health !== undefined) this.health = saveData.health;
        if (saveData.hunger !== undefined) this.hunger = saveData.hunger;
        return true;
      } catch (e) {
        console.warn('FS load error:', e);
      }
    }
    return false;
  };

  VoxelForgeVRApp.prototype.render = function() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  // Expose App Module
  MWO.VoxelForgeVR = {
    App: VoxelForgeVRApp,
    World: VoxelWorld,
    Noise: SeededNoise,
    buildChunkGeometry: buildChunkGeometry,
    launch: function(container) {
      var app = new VoxelForgeVRApp();
      app.launch(container);
      return app;
    }
  };

  // Register OS App
  if (typeof MWO.registerApp === 'function') {
    MWO.registerApp({
      id: 'vrvoxel',
      name: 'VoxelForge VR',
      description: 'Voxel survival in VR — swing, punch, draw your bow (WebXR)',
      icon: '🥽',
      category: 'game',
      installed: false,
      launch: function() {
        MWO.VoxelForgeVR.launch();
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MWO.VoxelForgeVR;
  }

})(typeof window !== 'undefined' ? window : global);
