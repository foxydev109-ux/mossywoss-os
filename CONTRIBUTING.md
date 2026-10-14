# Contributing to MossyWoss OS

MossyWoss OS is a single-file, local-first web OS (desktop, window manager,
VFS, Store with 80+ apps/games, MossGuard, Publish Studio, OS Lab, WebXR
voxel game, C interpreter). It is free, personal, offline-first — no servers,
no accounts, no paywalls. Help is welcome in every area below.

## Quick start

```bash
git clone https://github.com/foxydev109-ux/mossywoss-os.git
cd mossywoss-os
python3 mw_assemble.py          # builds mossywoss_os.html from mw_web/
npm ci                           # jsdom (test-only dependency)
node tests/smoketest.js          # 84 app-launch checks
```

Or with Docker (nothing installed on your machine):
```bash
docker build -t mwo-build .
docker run --rm -v "$PWD":/app mwo-build
```

## How you can pitch in

- **Apps and games** — every Store app lives in `mw_web/` and registers via
  `MWO.registerApp({ id, name, icon, launch })`. App icons are pure-CSS tile
  keys (see `mw_web/icons.js`); add a curated key or rely on the automatic
  fallback. New apps must actually work: no mock-ups, no placeholder UI.
- **Icon tiles and themes** — design new curated tile palettes in
  `mw_web/icons.js` or extend the theme system in `mw_web/core.html`.
- **Responsive shell** — the shell adapts from 320px phones to 4K
  (`mw_web/core.js` wm + taskbar). Found a screen size that breaks? That is a
  real, high-value bug to fix.
- **MossGuard rules** — add static-analysis signatures in `mw_web/sec.js`.
  Honest scope: local heuristics only.
- **OS Lab catalog** — extend `mw_web/linuxlab.js` with genuinely free,
  open-source OSes (official sites only, rights-and-owner line required,
  nothing bundled or redistributed).
- **Publish Studio and the zip engine** — the extractor in the Browser/Store
  path parses ZIP Local File Headers directly and inflates real deflate
  streams; edge-case archive fixes are welcome.
- **Native track (advanced)** — see ROADMAP.md for the proposed kernel phases
  (Multiboot2, memory management, drivers, scheduler, VFS, ZIP/PE parsing).
  Nothing there is built yet — it is an honest roadmap for contributors who
  want to start it. No fake implementations.

## Ground rules

1. No emoji, no SVG, no image files anywhere in the shipped UI.
2. No brand names or copyrighted material.
3. No placeholders, demos, or simulated behavior — everything must work.
4. Run the full battery before opening a PR:
   `node tests/smoketest.js`, `tests/freshtest.js`, `tests/secondboot.js`,
   `tests/browsertest.js`, `tests/cinterp_test.js`, `tests/vrvoxel_test.js`.
5. Keep the final product a single assembled HTML file
   (`python3 mw_assemble.py` must stay the one-command build).
6. MIT license; third-party notices live in NOTICE. Add attribution lines
   for anything you reference.

Every module should keep its own test so CI can prove it still works.
