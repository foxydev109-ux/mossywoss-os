# Android PC-Compatibility Container — Engineering Design

Status: **DESIGN / SPECIFICATION — NOT BUILT.** This document describes the
proven architecture used by real, shipping, no-root projects (Winlator,
PojavLauncher) so contributors can understand and (in the future, as a
separate companion app) build it. MossyWoss OS itself does not claim any of
this capability today. No placeholder code is shipped in this repo.

Goal: a standalone Android APK that runs x86_64/x86 Windows binaries
(.exe, older 3D games, Blender-class tools) on Android 15 / ARM64 tablets
(e.g. Samsung Galaxy Tab with Snapdragon/Exynos), with strict host
separation and zero root.

## 1. Sandbox & isolation model (bricking is impossible by construction)

```
Android 15 (ARM64)
└── App sandbox (uid-isolated, no root, normal APK permissions)
    └── PRoot user-space container (ptrace-based, no kernel modules)
        ├── guest rootfs (Ubuntu/Debian userspace, packaged as asset)
        ├── Box86/Box64 ──────► x86/x86_64 → ARM64 dynamic recompiler
        ├── Wine (staging) ───► Win32 → Linux syscall translation
        │     └── DXVK ───────► Direct3D 9/10/11 → Vulkan calls
        └── Mesa + Zink ───────► OpenGL 4.6 → Vulkan
                                  (Turnip driver = Adreno Vulkan; VirGL fallback)
```

Nothing here touches the Linux kernel, boot, partitions, or other apps: the
guest runs as an ordinary untrusted Android process. Worst case is a process
crash. That is the entire point of the architecture.

## 2. Component responsibilities

| Component | Role | Real upstream |
|---|---|---|
| PRoot | user-space container, zero root | proot-upstream (GPL) |
| Box86/Box64 | x86 binary → ARM64 JIT translation | ptitSeb (MIT) |
| Wine | PE loading, Win32 API layer | WineHQ (LGPL) |
| DXVK | Direct3D → Vulkan | doitsujin (Zlib) |
| Mesa / Zink | OpenGL 4.x → Vulkan | Mesa project (MIT) |
| Turnip/Freedreno | Adreno Vulkan driver | Mesa project (MIT) |

Rights belong to each project; a builder must compile them from source per
their licenses and must not strip attribution.

## 3. The three foundation components (specification)

**3.1 AndroidManifest** — permissions stay minimal and sandbox-honest:
`INTERNET` (download-free operation: none — everything bundled as assets),
`android.permission.READ_MEDIA_*` only for an optional file-import picker.
`targetSdk 34+` (Android 15 compliance), `extractNativeLibs=false`,
`largeHeap` optional; storage lives in `getExternalFilesDir()` (app-scoped,
uninstall removes everything). No `REQUEST_INSTALL_PACKAGES`, no root, no
system permissions.

**3.2 Native graphics bridge** — a `SurfaceView` whose `Surface` is passed
to native code (`ANativeWindow_fromSurface`); the guest display server
(Wayland or X11 inside the container) renders into it. On
`surfaceChanged(w,h)`, recompute the display matrix:
`scale = min(w/virtW, h/virtH)` with letterbox offsets, and invert it for
input so touchscreen coordinates map to virtual-desktop mouse coordinates
(plus drag-to-move, tap-to-click, pinch-to-scroll gestures). Runs on the
UI thread lifecycle (`onResume`/`onPause`/`onDestroy` — full stop, since
omitting lifecycle handling crashes real devices).

**3.3 Build pipeline** — Gradle + externalNativeBuild CMake that pulls and
compiles, in CI (Docker/Actions, never on the user's device): Box64, Wine
(from source), Mesa/Zink/Turnip (meson), then packs the guest rootfs as a
compressed APK asset. This makes multi-GB builds reproducible and keeps
`docker build`-style hygiene: the user installs one APK; nothing is
downloaded at runtime, nothing is compiled on-device.

## 4. What it can honestly run (expectations on an Android 15 tablet)

- Older/light Windows apps and 2D games: genuinely usable
- Sims 1 / Sims 2: community-reported playable on strong hardware
- Sims 3, modern AAA: far beyond realistic — ARM translation + mobile GPU
- Blender: launches in community projects; performance is a fraction of a PC
- Minecraft Java: use PojavLauncher (purpose-built, better than via Wine)
- Minecraft Bedrock: native Android version (official)

Use only software you legally own. This design and MossyWoss OS claim no
affiliation with any upstream project.

## 5. Relationship to MossyWoss OS

MossyWoss OS remains a web OS (browser/WebView sandbox). This design is a
candidate companion-app track for contributors, tracked in ROADMAP.md
(Phase 4). Until something in this document actually exists as code, no
capability from it may be advertised anywhere in this repository.
