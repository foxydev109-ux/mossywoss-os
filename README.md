# MossyWoss OS

A fully functional, web-based, local-first operating system in a single HTML5 file.
Built for personal use. Everything is free — no paywalls, no accounts, no servers.

## What it is

Open `mossywoss_os.html` in any modern browser (phone, tablet, desktop) and you get a
complete desktop OS: login, desktop, taskbar, start menu, window manager, virtual
file system with Recycle Bin, a Store, and 80+ real apps and games.

- **Fresh-PC start**: only Recycle Bin, Files, and Browser are installed.
  Everything else installs from the Store — installs persist across reboots.
- **Browser**: real downloads into the OS file system (never the device), real
  in-browser ZIP extraction (deflate), and downloaded HTML5 games run inside the OS.
- **Publish Studio**: publish your own apps/games to the Store from a zip or folder,
  with mandatory upload rules and a content disclaimer.
- **MossGuard**: real local security scanning (static heuristic analysis) of files,
  downloads, zip entries, and published uploads — plus a real OS update system.
- **VoxelForge VR**: WebXR voxel survival with real controller tracking — swing to
  break blocks, punch mobs, draw a bow, thumbstick locomotion — and a full non-VR mode.
- **Code Studio**: real built-in interpreter for a practical C/C++/C# subset,
  plus HTML/CSS/JS with live preview, and a visual block mode.

## Project layout

- `mw_web/` — OS source modules (JS) + `three.min.js` (MIT-licensed Three.js r147)
- `mw_assemble.py` — builds the single-file `mossywoss_os.html`
- `tests/` — Node test harnesses (smoke, fresh-PC, boot persistence, browser
  download/zip, C interpreter, VR engine)

## Build

```bash
python3 mw_assemble.py
```

## Test

```bash
cd tests && node smoketest.js
```

## Rules this project follows

- Personal, offline, local-first. Nothing is uploaded to any server.
- All content free — no paywalls, subscriptions, or commercial posting.
- No brand names or copyrighted material anywhere in the OS.
- No placeholders, mock-ups, or simulated behavior — everything is real.
