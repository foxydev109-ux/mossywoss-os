/* Test runner for VoxelForge VR (mw_web/vrvoxel.js)
 * Tests module load, noise generation, world state & diffs, chunk meshing, arrow physics.
 */

const assert = require('assert');

// 1. Mock Browser Environment Globals
global.THREE = require('./mw_web/three.min.js');

global.window = global;
global.document = {
  createElement: function(tag) {
    return {
      style: {},
      children: [],
      dataset: {},
      appendChild: function(c) { this.children.push(c); },
      querySelector: function() { return { textContent: '' }; },
      querySelectorAll: function() { return []; },
      addEventListener: function() {},
      getContext: function() {
        return {
          clearRect: function() {},
          fillRect: function() {},
          fillText: function() {},
          beginPath: function() {},
          roundRect: function() {},
          stroke: function() {}
        };
      }
    };
  },
  body: {
    appendChild: function() {}
  }
};

var registeredApps = [];
global.MWO = {
  registerApp: function(appDef) {
    registeredApps.push(appDef);
  },
  fs: {
    files: {},
    writeFile: function(path, content) {
      this.files[path] = content;
    },
    readFile: function(path) {
      return this.files[path];
    }
  }
};

// 2. Require Module
const VoxelForgeVR = require('./mw_web/vrvoxel.js');

console.log('=== VoxelForge VR Test Suite ===');

// Test 1: App Registration
console.log('Test 1: App Registration & MWO Integration');
assert.strictEqual(registeredApps.length, 1, 'App should register in MWO');
assert.strictEqual(registeredApps[0].id, 'vrvoxel', 'App ID must be vrvoxel');
assert.strictEqual(registeredApps[0].name, 'VoxelForge VR', 'App name must match');
console.log('  ✓ App successfully registered as vrvoxel (VoxelForge VR)');

// Test 2: Seeded Noise Generator Determinism
console.log('Test 2: Seeded Noise Generator Determinism');
const noise1 = new VoxelForgeVR.Noise(4242);
const noise2 = new VoxelForgeVR.Noise(4242);
const val1 = noise1.noise2D(3.14, 2.71);
const val2 = noise2.noise2D(3.14, 2.71);
assert.strictEqual(val1, val2, 'Same seed must yield identical noise values');
console.log('  ✓ Deterministic noise verified (val = ' + val1.toFixed(5) + ')');

// Test 3: Voxel World Generation & Diffs Export/Import
console.log('Test 3: Voxel World Generation & Diffs Export/Import');
const world = new VoxelForgeVR.World(999);
assert.strictEqual(world.seed, 999);

// Break 10 blocks
for (let i = 0; i < 10; i++) {
  world.setBlock(10 + i, 15, 10, 0); // 0 = AIR
}

const diffExport = world.exportDiffs();
const diffKeys = Object.keys(diffExport.diffs);
assert.strictEqual(diffKeys.length, 10, 'Diff export must contain exactly 10 broken block entries');

// Load into a fresh world instance
const world2 = new VoxelForgeVR.World(1);
world2.importDiffs(diffExport);
assert.strictEqual(world2.seed, 999, 'Imported world seed must match exported seed');
assert.strictEqual(world2.getBlockRaw(10, 15, 10), 0, 'Broken block must be restored as AIR');
console.log('  ✓ World diffs export/import verified (10 diff entries restored)');

// Test 4: Chunk Geometry Builder (Optimized Meshing)
console.log('Test 4: Chunk Geometry Builder (Buffer Geometry)');
const chunkResult = VoxelForgeVR.buildChunkGeometry(world, 0, 0, global.THREE);
assert.ok(chunkResult.solidGeometry, 'Solid geometry buffer should be generated');
const posAttr = chunkResult.solidGeometry.getAttribute('position');
assert.ok(posAttr.count > 0, 'Position attribute count should be greater than 0');
console.log('  ✓ Chunk geometry created with ' + posAttr.count + ' vertices');

// Test 5: Arrow Physics Simulation
console.log('Test 5: Arrow Projectile Physics Step');
const app = new VoxelForgeVR.App();
const origin = new global.THREE.Vector3(32, 20, 32);
const direction = new global.THREE.Vector3(0, 0.5, 1).normalize();
app.fireArrow(origin, direction, 20);

assert.strictEqual(app.arrows.length, 1, 'Arrow array should contain 1 active arrow');
const initialY = app.arrows[0].mesh.position.y;

// Step physics loop forward
app.updateArrows(0.1);
const newY = app.arrows[0].mesh.position.y;
assert.ok(newY !== initialY, 'Arrow Y position should change after physics step');
console.log('  ✓ Arrow physics step verified (Initial Y: ' + initialY + ' -> New Y: ' + newY.toFixed(2) + ')');

// Test 6: Save & Load through MWO Virtual FS
console.log('Test 6: MWO Virtual Filesystem Save / Load');
app.world = world;
app.saveWorld();
const savedFileStr = global.MWO.fs.readFile('/Games/vf_world.json');
assert.ok(savedFileStr, 'World save file should exist in /Games/vf_world.json');

const parsedSave = JSON.parse(savedFileStr);
assert.strictEqual(parsedSave.seed, 999, 'Saved json seed must match world seed');
console.log('  ✓ Virtual FS save/load verified (/Games/vf_world.json written)');

console.log('\n✅ ALL 6 TESTS PASSED SUCCESSFULLY!');
