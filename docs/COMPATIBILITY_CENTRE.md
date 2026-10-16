# MWO Compatibility Centre - Seven Targets, Real Status (17 Oct 2026)

Statuses used (no skipping): Not investigated / Research completed /
Architecture designed / Implementation in progress / Built but untested /
Launch tested / Functionality tested / Verified on target hardware /
Blocked by documented limitation.

## The honest headline
A browser-only OS cannot run ANY of the seven targets inside itself. Browser
security forbids native execution. The genuine path is the MWO native host
(host/mwo_host.py, built but UNTESTED on real hardware) + a real PC.

## 1. Unity Editor - RESEARCH COMPLETED, ARCHITECTURE DESIGNED
- Route: native Linux editor (Unity 6 line; officially supported Ubuntu
  configurations, x64 CPU, ~8GB+ RAM, compatible GPU drivers). Also native
  Windows editor.
- MWO integration: Host Link requests launch of the allowlisted editor; real
  host reports status/exit code. File exchange via approved folders.
- Blocker: requires a real x64 Linux or Windows PC. Not launched by MWO yet.
- Next task: run host test matrix (Notepad), then add Unity Hub + Editor.

## 2. Unreal Engine 5 Editor - RESEARCH COMPLETED, ARCHITECTURE DESIGNED
- Route: native Linux editor (Epic-documented; recommended 32GB RAM, dedicated
  GPU 8GB+ VRAM, Vulkan drivers) or native Windows editor.
- MWO integration: same Host Link path. Same blockers. Same next task.

## 3. Roblox Player - RESEARCH COMPLETED
- Official support: Windows and macOS only. No native Linux client; Wine
  routes are NOT guaranteed (anti-cheat). No browser client.
- Route: real Windows host (or officially supported device). Untested.
- Next task: host test matrix on Windows, then Roblox Player trial.

## 4. Roblox Studio - RESEARCH COMPLETED
- Official support: Windows and macOS only. Same route and caveats as Player.

## 5-7. The Sims 1 / 2 / 3 - RESEARCH COMPLETED (three independent projects)
- All are Windows-native games (direct descendants differ: Sims 1 = Win9x-era
  DirectDraw/Direct3D; Sims 2 = early DX9; Sims 3 = DX9-era, GPU-bound).
- Legal copies only (user-owned discs/store versions); an archive of files is
  NOT a licence. MWO will not fetch game copies.
- Route: real Windows host, or Linux + compatibility layer (untested, no
  guarantees). Each game/version must be tested separately and recorded.
- Next task: obtain hardware + legal copies, then per-game test logs here.

## Linux-under-MWO investigation (approaches A-G)
- A. Browser emulator (x86-in-browser): REAL kernel boots in the browser tab,
  no GPU, slow, light software only. Available today via OS Lab deep links.
- B. WASM userspace (WebVM-style): real userland, no GPU/no systemd kernel,
  single-process. Available today via OS Lab deep link.
- C. Real Linux VM: needs host hardware + virtualization; NOT possible
  inside a browser tab.
- D. Real Linux install on a PC: fully real; MWO links official distros.
- E. Native MWO host (built, UNTESTED): allowlisted launch + status only,
  no shell, no arbitrary filesystem access.
- F. Remote PC connection (designed, not built): streaming would require a
  real streaming stack (e.g. open-source game-stream servers) on the PC.
- G. Honest summary: a terminal emulator != userspace != VM != real install.
  MWO (browser) can host A and B today; C-F need hardware we don't have yet.

## What MWO genuinely does today without any host
Files (create/rename/copy/move/search/import/export), real ZIP create+extract,
IndexedDB persistence + backups, Code Studio (C/C++/C# interpreter, HTML/CSS/
JS), Animation Studio + Smart Bones + image/GMB frames, Game Builder, Store,
live web + Wikipedia search with real Google button, 88 apps, all tested.

## Delivery rules
Nothing here is marked Launch tested / Functionality tested / Verified until
it actually is, in the intended environment. This file IS the evidence log.
