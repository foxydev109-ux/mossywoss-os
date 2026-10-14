# MossyWoss OS — Architecture

How the system actually works under the hood. Every subsystem described here is
implemented in the shipped single file — nothing is simulated or stubbed.
Honest scope first: this is a **web-based OS**: everything below runs in the
browser's JS engine and IndexedDB/localStorage sandbox. It does not touch your
hardware, boot your PC, or execute native binaries (.exe/ELF). Claims stop at
what the code does.

```
mossywoss_os.html (single file, ~2 MB)
┌────────────────────────────────────────────────────────────┐
│ core.html  boot screen · login · desktop · taskbar · CSS  │
│ core.js    shell: boot→login→desktop→wm→taskbar→start      │
│ icons.js   pure-CSS icon tiles (no emoji/SVG/images)       │
│ cinterp.js real C/C++/C#-subset interpreter               │
│ sec.js     MossGuard scanner + OS update system            │
│ publisher.js Publish Studio (zip upload→scan→rules→store)  │
│ apps.js browser.js recorder.js …  80+ working apps        │
│ games*.js megapack.js …            40+ working games       │
│ three.min.js + vrvoxel.js games3d   WebGL + WebXR engine   │
└────────────────────────────────────────────────────────────┘
```

## Boot sequence (real, measured in-browser)

```
load  → core.js defines modules (no side effects at parse time)
boot  → animated POST-style checks (IndexedDB reachability, storage quota)
login → PIN verified against PBKDF2-style hash in ZianaUser store
shell → desktop renders icon tiles → taskbar polls → start menu binds
```

## Virtual File System (VFS) — IndexedDB-backed

```
  File Manager app                IndexedDB (per-browser origin)
┌──────────────────┐    CRUD    ┌──────────────────────────────┐
│ drag/drop import ├──────────► │ record: { path, data:Blob,   │
│ rename · move    │            │            meta, timestamps }│
│ zip extract      │◄──────────►│ directory tree as path index │
└──────────────────┘            └──────────────────────────────┘
        ▲
        │ MWO.fs API: read/write/ls/mkdir/rm (all apps use this)
```

Persistence: files survive reloads and reboots because IndexedDB is durable
per-origin. Nothing ever leaves the browser.

## ZIP engine — direct Local File Header parsing

The extractor walks raw bytes of the archive; no heap-heavy intermediate
objects, filenames are read as bounded slices:

```
buffer:  [LFH][name][data] [LFH][name][data] … [CD][EOCD]
            │     │      │
            │     │      └── raw file bytes → decompress → MWO.fs
            │     └──────── filename (length-prefixed slice, ≤ 65535)
            └─────────────── sig 0x04034b50 · method · sizes · offsets
   method 0 = stored (bytes copied verbatim)
   method 8 = deflate (real inflate: fixed+dynamic Huffman blocks)
   central directory validated against local headers; mismatch = reject
```

This is the same engine behind Store installs, Publish Studio uploads, and the
Browser's download manager — one parser, four consumers.

## Icon system — pure CSS, zero assets

```
app registration:  icon: 'files'      (any descriptive key)
render sites:      desktop · taskbar · window titles · start menu · store
                  → MWO.Icon.tile(key, size)
                      ┌────────────┐
                      │ monogram   │  gradient from curated palette,
                      │ "FL"       │  geometric accent (bar/dot/notch/
                      └────────────┘  chevron) via ::before clip-path
unknown key → deterministic gradient derived from a hash of the key itself
```

No emoji, no SVG, no image files. One `<style>` block injected once.

## Responsive shell — 320px to 4K

```
width < 700px  → windows open maximized; start menu = full-screen overlay
width < 520px  → taskbar trims labels (clock keeps time only)
any resize/    → all open windows re-clamped into the viewport (debounced)
orientation    → drag clamps prevent off-screen windows
pointers:coarse→ larger touch targets (CSS media queries)
```

## MossGuard — local static analysis

```
file/download/zip-entry/published-upload
        │
        ▼
 signature-style byte scanning of known-dangerous patterns in
 HTML/JS payloads (script-injection markers, eval-payload shapes),
 MIME/extension mismatch checks, size ceilings
        │
 verdict → clean (install/publish) | flagged (blocked + reason shown)
```

Honest limit: static heuristics only. No scanner catches everything.

## C interpreter — real execution

`cinterp.js` is a hand-written lexer → recursive-descent parser → tree-walking
evaluator for a practical C/C++/C# subset: types, expressions, control flow,
functions, arrays, pointer arithmetic, console I/O. It executes your code in
the browser; it is not a hosted optimizing compiler and does not link against
system libraries.

## Publishing pipeline

```
Publish Studio: pick HTML/JS game or app → real zip upload
  → MossGuard scan (mandatory) → upload rules acknowledged (mandatory)
  → disclaimer shown (mandatory) → Store listing → install/uninstall
```

## Android app (APK)

The APK is a WebView shell over the same single file, served through
WebViewAssetLoader on `https://appassets.androidplatform.net` — a secure
in-app origin so localStorage/IndexedDB behave exactly like the browser build.
Signed v1+v2+v3, `resources.arsc` stored uncompressed, minSdk 24.

## CI

Every push to main: rebuild HTML → build packages → rebuild APK →
refresh the `latest` GitHub release. The download links in the README
(`/releases/latest/download/...`) never go stale.

---

## Changelog of the current cycle

- Icon overhaul: pure-CSS monogram tiles; 800+ emoji and all SVG removed
- Responsive shell: full phone→4K adaptation (maximized phone windows,
  full-screen start menu, viewport clamping, orientation handling)
- APK 1.1: v1+v2+v3 signing, uncompressed resources.arsc, auto-fetched
  androidx libs in CI
- Publish Studio + MossGuard + real zip uploads/downloads end to end
- Shell cleanup: removed ~2,500-line duplicated dead region in core.js
- Visual block editor wires moved from SVG to canvas
- Packages: Windows zip (no install), Linux zip (user-level installer +
  menu entry + `mossywoss` command), web zip
- Docs: honest scope, device-separation notes, disclaimer
- Tests: 83/83 apps, 15/15 fresh-PC, 11/11 browser zip/download,
  10/10 second boot, 11/11 interpreter, 6/6 VR engine — all green
