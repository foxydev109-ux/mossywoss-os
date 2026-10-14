// Voxely 3D — A 3D voxel survival game for MossyWoss OS
// Uses Three.js (loaded from CDN inside the HTML) for 3D rendering
MWO.Voxely3D = (function() {
  var scene, camera, renderer, player, world = {};
  var chunks = {};
  var blocks = {};
  var inventory = { wood: 0, stone: 0, dirt: 0, food: 0, diamond: 0 };
  var health = 100, hunger = 100, energy = 100;
  var keys = {};
  var mouseLocked = false;
  var touchControls = { moveX: 0, moveY: 0, look: false };
  var animationId = null;
  var blockSize = 1;
  var renderDistance = 4; // chunks
  var chunkSize = 16;
  var worldSeed = 0;
  var time = 0; // game time 0-1 (day/night cycle)
  var sun, ambient;
  var mobs = [];
  var placedBlocks = {};
  var removedBlocks = {};
  var winBody = null;
  var canvas = null;
  var lastTime = 0;
  var playerVel = { x: 0, y: 0, z: 0 };
  var onGround = false;
  var gravity = -30;
  var jumpVel = 10;
  var moveSpeed = 5;
  var selectedBlock = 1; // 1=dirt, 2=stone, 3=wood
  var hotbar = [1, 2, 3, 4, 5]; // block types
  var hotbarIndex = 0;

  // Block types
  var blockTypes = {
    0: { name: 'Air', solid: false },
    1: { name: 'Grass', color: 0x4a7c3a, solid: true },
    2: { name: 'Dirt', color: 0x8b5a2b, solid: true },
    3: { name: 'Stone', color: 0x808080, solid: true },
    4: { name: 'Wood', color: 0x6b4226, solid: true },
    5: { name: 'Leaves', color: 0x3a6a1a, solid: true },
    6: { name: 'Sand', color: 0xe0d090, solid: true },
    7: { name: 'Water', color: 0x3060a0, solid: false },
    8: { name: 'Diamond', color: 0x50e0e0, solid: true },
    9: { name: 'Bedrock', color: 0x202020, solid: true }
  };

  function launch() {
    var w = MWO.wm.create({
      id: 'voxely3d-' + Date.now(),
      title: 'Voxely 3D',
      icon: 'voxely-3d',
      width: 900, height: 620,
      x: 40, y: 20,
      resizable: true
    });
    winBody = w;
    
    winBody.innerHTML = `
      <div style="position:relative;width:100%;height:100%;background:#87ceeb;overflow:hidden" id="voxely-container">
        <canvas id="voxely-canvas" style="display:block;width:100%;height:100%"></canvas>
        <div id="voxely-hud" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;font-family:sans-serif;font-size:12px">
          <!-- Top HUD: Health/Hunger/Energy -->
          <div style="position:absolute;top:10px;right:10px;text-align:right;background:rgba(0,0,0,0.5);padding:8px 12px;border-radius:6px;color:#fff">
            <div style="margin-bottom:4px">Heart <div style="display:inline-block;width:100px;height:12px;background:#333;border-radius:6px;vertical-align:middle"><div id="vx-health-bar" style="height:100%;width:100%;background:#e44;border-radius:6px;transition:width .3s"></div></div></div>
 <div style="margin-bottom:4px"> <div style="display:inline-block;width:100px;height:12px;background:#333;border-radius:6px;vertical-align:middle"><div id="vx-hunger-bar" style="height:100%;width:100%;background:#ec4;border-radius:6px;transition:width.3s"></div></div></div>
 <div> <div style="display:inline-block;width:100px;height:12px;background:#333;border-radius:6px;vertical-align:middle"><div id="vx-energy-bar" style="height:100%;width:100%;background:#4e4;border-radius:6px;transition:width.3s"></div></div></div>
          </div>
          <!-- Crosshair -->
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;pointer-events:none">
            <div style="position:absolute;top:50%;left:0;width:100%;height:1px;background:rgba(255,255,255,0.6)"></div>
            <div style="position:absolute;left:50%;top:0;width:1px;height:100%;background:rgba(255,255,255,0.6)"></div>
          </div>
          <!-- Hotbar -->
          <div id="vx-hotbar" style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:4px;pointer-events:auto">
            ${hotbar.map((b,i) => `<div class="vx-slot" data-idx="${i}" style="width:44px;height:44px;background:rgba(0,0,0,0.5);border:2px solid ${i===0?'#fff':'rgba(255,255,255,0.2)'};border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;color:#fff">${getBlockIcon(b)}</div>`).join('')}
          </div>
          <!-- Inventory display -->
          <div style="position:absolute;bottom:60px;left:10px;background:rgba(0,0,0,0.5);padding:6px 10px;border-radius:6px;color:#fff;font-size:11px">
 Wood: <span id="vx-wood">0</span> | Stone: <span id="vx-stone">0</span> | Dirt: <span id="vx-dirt">0</span> | Gem Diamond: <span id="vx-diamond">0</span>
          </div>
          <!-- Time of day -->
          <div style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.5);padding:6px 10px;border-radius:6px;color:#fff;font-size:11px">
 <span id="vx-time"> Day</span> | FPS: <span id="vx-fps">60</span>
          </div>
          <!-- Touch controls for mobile -->
          <div id="vx-touch-controls" style="position:absolute;bottom:0;left:0;right:0;display:none;pointer-events:auto">
            <div style="position:absolute;bottom:70px;left:20px;width:120px;height:120px;background:rgba(0,0,0,0.3);border-radius:60px;border:1px solid rgba(255,255,255,0.2)">
              <div id="vx-joystick" style="position:relative;width:50px;height:50px;background:rgba(255,255,255,0.3);border-radius:25px;top:35px;left:35px;transition:none"></div>
            </div>
            <div style="position:absolute;bottom:80px;right:20px;display:flex;flex-direction:column;gap:8px">
 <div id="vx-jump-btn" style="width:60px;height:60px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);border-radius:30px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;cursor:pointer"></div>
 <div id="vx-break-btn" style="width:60px;height:60px;background:rgba(255,100,100,0.2);border:1px solid rgba(255,100,100,0.3);border-radius:30px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;cursor:pointer"></div>
 <div id="vx-place-btn" style="width:60px;height:60px;background:rgba(100,255,100,0.2);border:1px solid rgba(100,255,100,0.3);border-radius:30px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;cursor:pointer"></div>
            </div>
          </div>
          <!-- Start message -->
          <div id="vx-start-msg" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);padding:20px 32px;border-radius:10px;color:#fff;text-align:center;pointer-events:auto;cursor:pointer">
 <div style="font-size:18px;font-weight:700;margin-bottom:8px"> Voxely 3D</div>
            <div style="font-size:13px;color:#ccc;margin-bottom:12px">Click to play</div>
            <div style="font-size:11px;color:#999">WASD move | Space jump | Mouse look | Left click break | Right click place | 1-5 select block</div>
 <div style="font-size:11px;color:#999;margin-top:4px">Touch: Joystick move | jump | break | place | Drag screen to look</div>
          </div>
        </div>
      </div>
    `;

    canvas = winBody.querySelector('#voxely-canvas');
    
    // Detect touch device
    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouch) {
      winBody.querySelector('#vx-touch-controls').style.display = 'block';
    }
    
    // Hotbar selection
    var slots = winBody.querySelectorAll('.vx-slot');
    slots.forEach(function(slot) {
      slot.onclick = function() {
        hotbarIndex = parseInt(slot.dataset.idx);
        selectedBlock = hotbar[hotbarIndex];
        slots.forEach(function(s) { s.style.borderColor = 'rgba(255,255,255,0.2)'; });
        slot.style.borderColor = '#fff';
      };
    });
    
    // Start message click
    var startMsg = winBody.querySelector('#vx-start-msg');
    startMsg.onclick = function() {
      startMsg.style.display = 'none';
      initGame();
    };
  }

  function getBlockIcon(type) {
 var icons = { 1:'', 2:'', 3:'', 4:'', 5:'▲', 6:'', 7:'', 8:'Gem', 9:'' };
    return icons[type] || '?';
  }

  function initGame() {
    // Simple pseudo-3D voxel renderer using canvas 2D
    // Since we can't rely on Three.js being loaded, we'll do our own 3D projection
    worldSeed = Math.floor(Math.random() * 1000000);
    
    // Player position
    player = { x: 0, y: 40, z: 0, rotX: 0, rotY: 0 };
    
    // Generate initial chunks
    for (var cx = -renderDistance; cx <= renderDistance; cx++) {
      for (var cz = -renderDistance; cz <= renderDistance; cz++) {
        generateChunk(cx, cz);
      }
    }
    
    // Setup input
    setupInput();
    
    // Start game loop
    lastTime = performance.now();
    time = 0.3; // start in morning
    gameLoop();
  }

  // Simple noise function (no external dependency)
  function noise2D(x, z, seed) {
    var n = Math.sin(x * 0.1 + seed * 0.001) * Math.cos(z * 0.1 + seed * 0.002) * 20;
    n += Math.sin(x * 0.05 + seed * 0.003) * Math.cos(z * 0.05 + seed * 0.004) * 40;
    n += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 10;
    return n;
  }

  function generateChunk(cx, cz) {
    var key = cx + ',' + cz;
    if (chunks[key]) return;
    
    var chunk = new Uint8Array(chunkSize * 64 * chunkSize);
    
    for (var x = 0; x < chunkSize; x++) {
      for (var z = 0; z < chunkSize; z++) {
        var worldX = cx * chunkSize + x;
        var worldZ = cz * chunkSize + z;
        var height = Math.floor(noise2D(worldX, worldZ, worldSeed) + 32);
        height = Math.max(1, Math.min(60, height));
        
        for (var y = 0; y < 64; y++) {
          var idx = x + y * chunkSize + z * chunkSize * 64;
          if (y === 0) {
            chunk[idx] = 9; // Bedrock
          } else if (y < height - 4) {
            chunk[idx] = 3; // Stone
          } else if (y < height) {
            chunk[idx] = 2; // Dirt
          } else if (y === height) {
            chunk[idx] = 1; // Grass
          } else if (y < height + 1 && Math.random() < 0.01) {
            // Trees
            chunk[idx] = 4;
          } else if (y <= 20) {
            chunk[idx] = 7; // Water
          } else {
            chunk[idx] = 0; // Air
          }
        }
        
        // Tree generation
        if (Math.random() < 0.02 && height > 25) {
          var trunkH = 3 + Math.floor(Math.random() * 2);
          for (var t = 1; t <= trunkH; t++) {
            var treeY = height + t;
            if (treeY < 64) {
              chunk[x + treeY * chunkSize + z * chunkSize * 64] = 4; // Wood trunk
            }
          }
          // Leaves
          for (var lx = -2; lx <= 2; lx++) {
            for (var lz = -2; lz <= 2; lz++) {
              for (var ly = 0; ly <= 1; ly++) {
                var tx = x + lx, tz = z + lz, ty = height + trunkH + ly;
                if (tx >= 0 && tx < chunkSize && tz >= 0 && tz < chunkSize && ty < 64) {
                  if (Math.abs(lx) + Math.abs(lz) + ly <= 3) {
                    var tIdx = tx + ty * chunkSize + tz * chunkSize * 64;
                    if (chunk[tIdx] === 0) chunk[tIdx] = 5; // Leaves
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Apply player modifications
    var modKey = key;
    if (placedBlocks[modKey]) {
      placedBlocks[modKey].forEach(function(mod) {
        var idx = mod.x + mod.y * chunkSize + mod.z * chunkSize * 64;
        if (idx >= 0 && idx < chunk.length) chunk[idx] = mod.type;
      });
    }
    if (removedBlocks[modKey]) {
      removedBlocks[modKey].forEach(function(mod) {
        var idx = mod.x + mod.y * chunkSize + mod.z * chunkSize * 64;
        if (idx >= 0 && idx < chunk.length) chunk[idx] = 0;
      });
    }
    
    chunks[key] = chunk;
  }

  function getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= 64) return 0;
    var cx = Math.floor(wx / chunkSize);
    var cz = Math.floor(wz / chunkSize);
    var key = cx + ',' + cz;
    if (!chunks[key]) return 0;
    var lx = wx - cx * chunkSize;
    var lz = wz - cz * chunkSize;
    if (lx < 0 || lx >= chunkSize || lz < 0 || lz >= chunkSize) return 0;
    var idx = lx + wy * chunkSize + lz * chunkSize * 64;
    return chunks[key][idx];
  }

  function setBlock(wx, wy, wz, type) {
    if (wy < 0 || wy >= 64) return;
    var cx = Math.floor(wx / chunkSize);
    var cz = Math.floor(wz / chunkSize);
    var key = cx + ',' + cz;
    if (!chunks[key]) generateChunk(cx, cz);
    if (!chunks[key]) return;
    var lx = wx - cx * chunkSize;
    var lz = wz - cz * chunkSize;
    var idx = lx + wy * chunkSize + lz * chunkSize * 64;
    chunks[key][idx] = type;
  }

  function setupInput() {
    var container = winBody.querySelector('#voxely-container');
    
    // Keyboard
    function keyDown(e) { keys[e.key.toLowerCase()] = true; 
      if (e.key >= '1' && e.key <= '5') { hotbarIndex = parseInt(e.key)-1; selectedBlock = hotbar[hotbarIndex]; updateHotbar(); }
      if (e.key === ' ') e.preventDefault();
    }
    function keyUp(e) { keys[e.key.toLowerCase()] = false; }
    
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    
    // Mouse look (pointer lock)
    canvas.addEventListener('click', function() {
      if (!mouseLocked) canvas.requestPointerLock();
    });
    
    document.addEventListener('mousemove', function(e) {
      if (mouseLocked) {
        player.rotY += e.movementX * 0.002;
        player.rotX += e.movementY * 0.002;
        player.rotX = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.rotX));
      }
    });
    
    document.addEventListener('pointerlockchange', function() {
      mouseLocked = document.pointerLockElement === canvas;
    });
    
    // Mouse click to break/place
    canvas.addEventListener('mousedown', function(e) {
      if (!mouseLocked) return;
      if (e.button === 0) breakBlock();
      if (e.button === 2) placeBlock();
    });
    canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    
    // Touch controls
    var joystick = winBody.querySelector('#vx-joystick');
    var joyActive = false;
    var joyStart = { x: 0, y: 0 };
    var joyCenter = { x: 55, y: 55 };
    
    var joyArea = winBody.querySelector('#vx-touch-controls');
    if (joyArea) {
      var joyBase = joyArea.querySelector('div > div'); // joystick base
      joyBase.addEventListener('touchstart', function(e) {
        e.preventDefault();
        joyActive = true;
        var touch = e.touches[0];
        joyStart = { x: touch.clientX, y: touch.clientY };
      }, { passive: false });
      
      joyBase.addEventListener('touchmove', function(e) {
        e.preventDefault();
        if (!joyActive) return;
        var touch = e.touches[0];
        var dx = touch.clientX - joyStart.x;
        var dy = touch.clientY - joyStart.y;
        var len = Math.sqrt(dx*dx + dy*dy);
        if (len > 30) { dx = dx/len * 30; dy = dy/len * 30; }
        joystick.style.left = (35 + dx) + 'px';
        joystick.style.top = (35 + dy) + 'px';
        touchControls.moveX = dx / 30;
        touchControls.moveY = dy / 30;
      }, { passive: false });
      
      joyBase.addEventListener('touchend', function(e) {
        joyActive = false;
        joystick.style.left = '35px';
        joystick.style.top = '35px';
        touchControls.moveX = 0;
        touchControls.moveY = 0;
      });
      
      // Jump
      var jumpBtn = winBody.querySelector('#vx-jump-btn');
      jumpBtn.addEventListener('touchstart', function(e) { e.preventDefault(); keys[' '] = true; }, { passive: false });
      jumpBtn.addEventListener('touchend', function(e) { e.preventDefault(); keys[' '] = false; }, { passive: false });
      
      // Break
      var breakBtn = winBody.querySelector('#vx-break-btn');
      breakBtn.addEventListener('touchstart', function(e) { e.preventDefault(); breakBlock(); }, { passive: false });
      
      // Place
      var placeBtn = winBody.querySelector('#vx-place-btn');
      placeBtn.addEventListener('touchstart', function(e) { e.preventDefault(); placeBlock(); }, { passive: false });
      
      // Touch look (drag on right side of screen)
      canvas.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
          touchControls.look = true;
          touchControls.lookX = e.touches[0].clientX;
          touchControls.lookY = e.touches[0].clientY;
        }
      }, { passive: true });
      
      canvas.addEventListener('touchmove', function(e) {
        if (touchControls.look && e.touches.length === 1) {
          var dx = e.touches[0].clientX - touchControls.lookX;
          var dy = e.touches[0].clientY - touchControls.lookY;
          player.rotY += dx * 0.005;
          player.rotX += dy * 0.005;
          player.rotX = Math.max(-Math.PI/2, Math.min(Math.PI/2, player.rotX));
          touchControls.lookX = e.touches[0].clientX;
          touchControls.lookY = e.touches[0].clientY;
        }
      }, { passive: true });
      
      canvas.addEventListener('touchend', function() { touchControls.look = false; }, { passive: true });
    }
  }

  function updateHotbar() {
    var slots = winBody.querySelectorAll('.vx-slot');
    slots.forEach(function(s, i) {
      s.style.borderColor = (i === hotbarIndex) ? '#fff' : 'rgba(255,255,255,0.2)';
    });
  }

  function raycast() {
    // Simple voxel raycast from player position
    var dir = getLookDir();
    var px = player.x, py = player.y + 1.6, pz = player.z; // eye height
    var step = 0.05;
    var maxDist = 6;
    
    for (var d = 0; d < maxDist; d += step) {
      var bx = Math.floor(px + dir.x * d);
      var by = Math.floor(py + dir.y * d);
      var bz = Math.floor(pz + dir.z * d);
      var block = getBlock(bx, by, bz);
      if (block > 0 && blockTypes[block] && blockTypes[block].solid) {
        return { x: bx, y: by, z: bz, type: block };
      }
    }
    return null;
  }

  function getLookDir() {
    var cosX = Math.cos(player.rotX);
    return {
      x: Math.sin(player.rotY) * cosX,
      y: -Math.sin(player.rotX),
      z: -Math.cos(player.rotY) * cosX
    };
  }

  function breakBlock() {
    var hit = raycast();
    if (!hit) return;
    var type = hit.type;
    setBlock(hit.x, hit.y, hit.z, 0);
    
    // Add to inventory
    if (type === 4 || type === 5) { inventory.wood++; updateInventory(); }
    else if (type === 3) { inventory.stone++; updateInventory(); }
    else if (type === 1 || type === 2) { inventory.dirt++; updateInventory(); }
    else if (type === 8) { inventory.diamond++; updateInventory(); }
    else if (type === 6) { inventory.food += 2; updateInventory(); }
  }

  function placeBlock() {
    var hit = raycast();
    if (!hit) return;
    // Place adjacent to the hit face
    var dir = getLookDir();
    var px = hit.x + (dir.x > 0 ? 1 : dir.x < 0 ? -1 : 0);
    var py = hit.y + (dir.y > 0 ? 1 : dir.y < 0 ? -1 : 0);
    var pz = hit.z + (dir.z > 0 ? 1 : dir.z < 0 ? -1 : 0);
    
    // Don't place inside player
    if (Math.floor(player.x) === px && Math.floor(player.z) === pz && 
        (Math.floor(player.y) === py || Math.floor(player.y + 1) === py)) return;
    
    var existing = getBlock(px, py, pz);
    if (existing === 0) {
      setBlock(px, py, pz, hotbar[hotbarIndex]);
    }
  }

  function updateInventory() {
    var el = winBody.querySelector('#vx-wood'); if (el) el.textContent = inventory.wood;
    el = winBody.querySelector('#vx-stone'); if (el) el.textContent = inventory.stone;
    el = winBody.querySelector('#vx-dirt'); if (el) el.textContent = inventory.dirt;
    el = winBody.querySelector('#vx-diamond'); if (el) el.textContent = inventory.diamond;
  }

  function updateBars() {
    var el = winBody.querySelector('#vx-health-bar'); if (el) el.style.width = health + '%';
    el = winBody.querySelector('#vx-hunger-bar'); if (el) el.style.width = hunger + '%';
    el = winBody.querySelector('#vx-energy-bar'); if (el) el.style.width = energy + '%';
    el = winBody.querySelector('#vx-time');
    if (el) {
      if (time < 0.25 || time > 0.75) el.textContent = 'Moon Night';
 else if (time < 0.3) el.textContent = ' Dawn';
 else if (time > 0.7) el.textContent = ' Dusk';
 else el.textContent = ' Day';
    }
  }

  function updatePhysics(dt) {
    // Movement
    var cosY = Math.cos(player.rotY);
    var sinY = Math.sin(player.rotY);
    var forward = { x: -sinY, z: -cosY };
    var right = { x: cosY, z: -sinY };
    
    var mx = 0, mz = 0;
    if (keys['w']) { mx += forward.x; mz += forward.z; }
    if (keys['s']) { mx -= forward.x; mz -= forward.z; }
    if (keys['a']) { mx -= right.x; mz -= right.z; }
    if (keys['d']) { mx += right.x; mz += right.z; }
    
    // Touch movement
    if (touchControls.moveX !== 0 || touchControls.moveY !== 0) {
      mx += forward.x * touchControls.moveY + right.x * touchControls.moveX;
      mz += forward.z * touchControls.moveY + right.z * touchControls.moveX;
    }
    
    var len = Math.sqrt(mx*mx + mz*mz);
    if (len > 0) { mx = mx/len * moveSpeed; mz = mz/len * moveSpeed; }
    
    playerVel.x = mx;
    playerVel.z = mz;
    
    // Gravity
    playerVel.y += gravity * dt;
    
    // Jump
    if (keys[' '] && onGround) {
      playerVel.y = jumpVel;
      onGround = false;
    }
    
    // Apply movement with collision
    var newX = player.x + playerVel.x * dt;
    var newZ = player.z + playerVel.z * dt;
    var newY = player.y + playerVel.y * dt;
    
    // X collision
    if (!checkCollision(newX, player.y, player.z)) player.x = newX;
    // Z collision
    if (!checkCollision(player.x, player.y, newZ)) player.z = newZ;
    // Y collision
    if (checkCollision(player.x, newY, player.z)) {
      if (playerVel.y < 0) onGround = true;
      playerVel.y = 0;
    } else {
      player.y = newY;
      onGround = false;
    }
    
    // Prevent falling through world
    if (player.y < -10) { player.y = 40; player.x = 0; player.z = 0; playerVel.y = 0; }
    
    // Hunger and energy
    if (len > 0) {
      hunger -= dt * 0.5;
      energy -= dt * 0.3;
    } else {
      energy += dt * 0.5;
    }
    hunger = Math.max(0, Math.min(100, hunger));
    energy = Math.max(0, Math.min(100, energy));
    
    if (hunger <= 0) health -= dt * 2;
    if (hunger > 50 && health < 100) health += dt * 0.5;
    health = Math.max(0, Math.min(100, health));
    
    // Day/night cycle
    time += dt * 0.005;
    if (time > 1) time = 0;
    
    // Generate chunks around player
    var pcx = Math.floor(player.x / chunkSize);
    var pcz = Math.floor(player.z / chunkSize);
    for (var dx = -renderDistance; dx <= renderDistance; dx++) {
      for (var dz = -renderDistance; dz <= renderDistance; dz++) {
        generateChunk(pcx + dx, pcz + dz);
      }
    }
  }

  function checkCollision(x, y, z) {
    // Check player bounding box (0.6 wide, 1.8 tall)
    var box = [
      { x: x - 0.3, z: z - 0.3, y: y },
      { x: x + 0.3, z: z - 0.3, y: y },
      { x: x - 0.3, z: z + 0.3, y: y },
      { x: x + 0.3, z: z + 0.3, y: y },
      { x: x - 0.3, z: z - 0.3, y: y + 1.7 },
      { x: x + 0.3, z: z + 0.3, y: y + 1.7 }
    ];
    for (var i = 0; i < box.length; i++) {
      var b = box[i];
      var blk = getBlock(Math.floor(b.x), Math.floor(b.y), Math.floor(b.z));
      if (blk > 0 && blockTypes[blk] && blockTypes[blk].solid) return true;
    }
    return false;
  }

  // Software 3D renderer using canvas 2D
  function render() {
    var ctx = canvas.getContext('2d');
    var cw = canvas.width = canvas.offsetWidth;
    var ch = canvas.height = canvas.offsetHeight;
    
    // Sky color based on time of day
    var skyColor = getSkyColor(time);
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, cw, ch);
    
    // Sun position
    var sunY = Math.sin(time * Math.PI * 2) * ch * 0.5 + ch * 0.5;
    var sunX = time * cw;
    if (time > 0.25 && time < 0.75) {
      ctx.fillStyle = 'rgba(255, 240, 200, 0.4)';
      ctx.beginPath();
      ctx.arc(sunX, ch - sunY, 30, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Moon
      ctx.fillStyle = 'rgba(200, 200, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(cw - sunX, sunY, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Render visible blocks with simple projection
    var blocks = collectVisibleBlocks();
    
    // Sort blocks by distance (far to near)
    var dir = getLookDir();
    blocks.sort(function(a, b) {
      var da = (a.wx - player.x) * dir.x + (a.wy - player.y) * dir.y + (a.wz - player.z) * dir.z;
      var db = (b.wx - player.x) * dir.x + (b.wy - player.y) * dir.y + (b.wz - player.z) * dir.z;
      return db - da;
    });
    
    var fov = 70 * Math.PI / 180;
    var halfFov = fov / 2;
    var aspect = cw / ch;
    
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      // Only render visible faces (faces exposed to air)
      var faces = getVisibleFaces(b);
      var proj = project3D(b.wx + 0.5, b.wy + 0.5, b.wz + 0.5, cw, ch, fov, aspect);
      if (!proj) continue;
      
      // Face culling
      for (var f = 0; f < faces.length; f++) {
        var face = faces[f];
        var corners = face.map(function(c) {
          return project3D(b.wx + c[0], b.wy + c[1], b.wz + c[2], cw, ch, fov, aspect);
        });
        if (corners.some(function(c) { return !c; })) continue;
        
        // Lighting based on face normal and time of day
        var lightLevel = getFaceLight(face, b.wy, time);
        var color = blockTypes[b.type].color;
        var r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, bl = color & 0xff;
        r = Math.floor(r * lightLevel);
        g = Math.floor(g * lightLevel);
        bl = Math.floor(bl * lightLevel);
        
        ctx.fillStyle = 'rgb(' + Math.min(255,r) + ',' + Math.min(255,g) + ',' + Math.min(255,bl) + ')';
        
        ctx.beginPath();
        ctx.moveTo(corners[0].sx, corners[0].sy);
        for (var c = 1; c < corners.length; c++) {
          ctx.lineTo(corners[c].sx, corners[c].sy);
        }
        ctx.closePath();
        ctx.fill();
        
        // Edge
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    
    // Render block highlight (what player is looking at)
    var hit = raycast();
    if (hit) {
      var proj = project3D(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, cw, ch, fov, aspect);
      if (proj) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        var s = 0.5;
        var corners = [
          [-s, -s, -s], [s, -s, -s], [s, -s, s], [-s, -s, s],
          [-s, s, -s], [s, s, -s], [s, s, s], [-s, s, s]
        ].map(function(c) {
          return project3D(hit.x + c[0], hit.y + c[1], hit.z + c[2], cw, ch, fov, aspect);
        });
        if (corners.every(function(c) { return c; })) {
          var edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
          edges.forEach(function(e) {
            ctx.beginPath();
            ctx.moveTo(corners[e[0]].sx, corners[e[0]].sy);
            ctx.lineTo(corners[e[1]].sx, corners[e[1]].sy);
            ctx.stroke();
          });
        }
      }
    }
  }

  function getSkyColor(t) {
    if (t < 0.2 || t > 0.8) return '#0a0a20';
    if (t < 0.3) {
      var f = (t - 0.2) / 0.1;
      return 'rgb(' + Math.floor(10 + f * 120) + ',' + Math.floor(10 + f * 60) + ',' + Math.floor(32 + f * 80) + ')';
    }
    if (t < 0.7) return '#87ceeb';
    if (t < 0.8) {
      var f = (t - 0.7) / 0.1;
      return 'rgb(' + Math.floor(135 - f * 125) + ',' + Math.floor(206 - f * 196) + ',' + Math.floor(235 - f * 203) + ')';
    }
    return '#0a0a20';
  }

  function getFaceLight(face, y, time) {
    // Base light from time of day
    var baseLight = 0.3;
    if (time > 0.25 && time < 0.75) {
      baseLight = 0.7 + Math.sin((time - 0.25) * Math.PI * 2) * 0.1;
    } else {
      baseLight = 0.2;
    }
    
    // Face normal determines brightness
    // Top faces brightest, sides medium, bottom dark
    if (face[0][1] === face[1][1] && face[2][1] === face[3][1] && face[0][1] > 0) return baseLight; // Top
    if (face[0][1] === face[1][1] && face[2][1] === face[3][1] && face[0][1] === 0) return baseLight * 0.4; // Bottom
    return baseLight * 0.65; // Sides
  }

  function project3D(wx, wy, wz, sw, sh, fov, aspect) {
    // Transform to camera space
    var dx = wx - player.x;
    var dy = wy - (player.y + 1.6);
    var dz = wz - player.z;
    
    // Rotate Y (yaw)
    var cosY = Math.cos(player.rotY);
    var sinY = Math.sin(player.rotY);
    var rx = dx * cosY - dz * sinY;
    var rz = dx * sinY + dz * cosY;
    
    // Rotate X (pitch)
    var cosX = Math.cos(player.rotX);
    var sinX = Math.sin(player.rotX);
    var ry = dy * cosX - rz * sinX;
    var rz2 = dy * sinX + rz * cosX;
    
    // Behind camera?
    if (rz2 <= 0.1) return null;
    
    // Perspective projection
    var halfFov = fov / 2;
    var scale = sh / (2 * Math.tan(halfFov));
    var sx = sw / 2 + rx / rz2 * scale;
    var sy = sh / 2 - ry / rz2 * scale;
    
    return { sx: sx, sy: sy, depth: rz2 };
  }

  function collectVisibleBlocks() {
    var visible = [];
    var pcx = Math.floor(player.x / chunkSize);
    var pcz = Math.floor(player.z / chunkSize);
    var py = Math.floor(player.y);
    
    for (var cx = pcx - renderDistance; cx <= pcx + renderDistance; cx++) {
      for (var cz = pcz - renderDistance; cz <= pcz + renderDistance; cz++) {
        var chunk = chunks[cx + ',' + cz];
        if (!chunk) continue;
        
        for (var x = 0; x < chunkSize; x++) {
          for (var z = 0; z < chunkSize; z++) {
            for (var y = Math.max(0, py - 10); y < Math.min(64, py + 20); y++) {
              var idx = x + y * chunkSize + z * chunkSize * 64;
              var type = chunk[idx];
              if (type === 0) continue;
              
              var wx = cx * chunkSize + x;
              var wz = cz * chunkSize + z;
              
              // Check if block has at least one exposed face
              if (getBlock(wx+1, y, wz) === 0 || getBlock(wx-1, y, wz) === 0 ||
                  getBlock(wx, y+1, wz) === 0 || getBlock(wx, y-1, wz) === 0 ||
                  getBlock(wx, y, wz+1) === 0 || getBlock(wx, y, wz-1) === 0) {
                visible.push({ wx: wx, wy: y, wz: wz, type: type });
              }
            }
          }
        }
      }
    }
    
    return visible;
  }

  function getVisibleFaces(b) {
    var s = 0.5;
    var faces = [];
    
    // Top
    if (getBlock(b.wx, b.wy + 1, b.wz) === 0) {
      faces.push([[-s, s, -s], [s, s, -s], [s, s, s], [-s, s, s]]);
    }
    // Bottom
    if (getBlock(b.wx, b.wy - 1, b.wz) === 0) {
      faces.push([[-s, -s, -s], [-s, -s, s], [s, -s, s], [s, -s, -s]]);
    }
    // Front
    if (getBlock(b.wx, b.wy, b.wz + 1) === 0) {
      faces.push([[-s, -s, s], [-s, s, s], [s, s, s], [s, -s, s]]);
    }
    // Back
    if (getBlock(b.wx, b.wy, b.wz - 1) === 0) {
      faces.push([[s, -s, -s], [s, s, -s], [-s, s, -s], [-s, -s, -s]]);
    }
    // Right
    if (getBlock(b.wx + 1, b.wy, b.wz) === 0) {
      faces.push([[s, -s, -s], [s, s, -s], [s, s, s], [s, -s, s]]);
    }
    // Left
    if (getBlock(b.wx - 1, b.wy, b.wz) === 0) {
      faces.push([[-s, -s, -s], [-s, s, -s], [-s, s, s], [-s, -s, s]]);
    }
    
    return faces;
  }

  function gameLoop() {
    if (!winBody || !winBody.isConnected) {
      if (animationId) cancelAnimationFrame(animationId);
      return;
    }
    
    var now = performance.now();
    var dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    
    updatePhysics(dt);
    render();
    updateBars();
    
    // FPS
    var fpsEl = winBody.querySelector('#vx-fps');
    if (fpsEl) fpsEl.textContent = Math.round(1 / dt);
    
    animationId = requestAnimationFrame(gameLoop);
  }

  return {
    launch: launch
  };
})();

// Register Voxely 3D as a real app (runs before apps.js/games.js, so the stub guard skips)
if (MWO.registerApp) {
  MWO.registerApp({
    id: 'voxely3d',
    name: 'Voxely 3D',
    description: '3D voxel survival game — mine, craft & build',
    icon: 'voxely-3d',
    category: 'game',
    installed: false,
    launch: function() { MWO.Voxely3D.launch(); }
  });
}
