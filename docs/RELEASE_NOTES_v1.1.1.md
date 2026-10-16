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

## Browser (v1.1.1 hotfix)
- Search now shows live web results (real clickable links from a public web
  index) alongside Wikipedia - not wiki-only pages anymore.
- New Google button in the toolbar: does a real Google lookup of the URL bar
  text in a new tab.

## Animation Studio - Smart Bones (Moho-style, real)
- Bones tool: toggle Bones ON, drag on the canvas to add a bone segment.
  Each new bone parents to the previous one - rotating a parent bone
  moves the whole chain (accumulated parent transforms, keyframeable).
- Bones are real shapes: select them, set rotation keyframes across the
  timeline, and the chain animates (that is the core of rig-based
  animation, honest scope: rig motion, not mesh deformation).

## Files - the remaining gaps, closed
- Copy, Move (with path prompt) and live recursive Search across the
  whole VFS (type 2+ chars in the search box; results are clickable).

## Desktop
- Two new original retro wallpapers (Retro Teal, Retro Fields) - original
  art, no copyrighted artwork, no Clippy.

## Windows Host milestone (architecture + real code, untested on hardware yet)
- host/mwo_host.py: real Windows host (Python 3.9+, pip install websockets):
  one-time token auth, allowlist.json-only launches, y/n consent at the PC,
  no shell, no filesystem access exposed to the browser.
- hostlink.js: real browser-side Host Link app (connect, status, allowlist
  view, request launch, disconnect) - installs from the Store.
- docs/WINDOWS_HOST_ARCHITECTURE.md: ASCII diagrams, security model, honest
  limitations (no display streaming yet; mixed-content rule), test matrix
  starting with Notepad, and requirement 9: Roblox/Unity/Unreal are NOT
  claimed until individually tested on real Windows hardware.

## OS Lab - free-OS expansion (no Windows PC needed to browse; real PC needed to run)
- 8 new official, free, open-source choices for a real PC: tiny hardened,
  universal community, rolling advanced, green friendly, declarative,
  Windows-compatible open-source OS (GPL), and the Windows-program
  compatibility layer on Linux (LGPL).
- New honest hardware-truth section: Unity Editor and Unreal 5 have native
  Linux versions that genuinely run free on any Linux PC; Roblox has no
  native Linux/browser client (compatibility layer only, untested);
  Sims 1/2/3 are proprietary PC games (official stores only).
- Disclaimers restated in-app: every project belongs to its owners; MWO is
  not affiliated with, endorsed by, or redistributing any of them.
