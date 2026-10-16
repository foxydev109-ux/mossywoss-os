# MossyWoss OS v1.1.1 - Creative Update

## New (all real, no placeholders)
- Animation Studio Brush tool: freeform drawing on the canvas. Every stroke is
  captured as a real shape (your exact pointer points) that you can select,
  move, keyframe and animate - draw a fox, animate it.
- Code Studio - Import GLB: pick a real .glb/.gltf file; its bytes are stored in
  the OS at /Models and working 3D viewer code is inserted (renders your actual
  model with three.js when Run online).
- Code Studio - Import Frames: pick real image files; each becomes a frame of a
  working sprite animation (your exact images embedded, plays on Run).
- Code Studio - Insert Image: real image import into HTML/CSS/JS code.

## Fixes
- Fixed a crash that disabled app registration during load (canvas listeners
  now attach at launch, safely retried).

## Verified
- 87/87 apps working, fresh-boot 15/15, second-boot 12/12, publisher 4/4,
  Game Builder 9/9, APK install check 15/15 (CI).
