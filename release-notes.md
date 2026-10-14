MossyWoss OS - latest build (auto-built from main)

DOWNLOADS (attached to this release):
- mossywoss.apk - Android 7.0+ app (WebView shell over the web OS; secure in-app origin so saves and the virtual file system work)
- mossywoss-os-windows.zip - Windows 10/11: extract, open mossywoss_os.html in a browser. Nothing is installed to your PC.
- mossywoss-os-linux.zip - any Linux distro: extract, then "chmod +x install.sh && ./install.sh" (installs to ~/.local only, adds the mossywoss command + app-menu entry; uninstall.sh included)
- mossywoss-os-web.zip - the raw single file for any other device
- mossywoss_os.html - the same single file, unpackaged

WHAT IT IS (honest scope):
A fully functional web-based OS in one HTML file: desktop, window manager,
taskbar, start menu, virtual file system (IndexedDB), a Store with 80+ real
apps and games, Publish Studio (publish your own zips with mandatory rules,
disclaimer, and MossGuard scanning), MossGuard local security scanning, a
real OS update system, a WebXR voxel survival game (real controller
tracking; full non-VR mode), a real built-in C/C++/C#-subset interpreter,
HTML/CSS/JS live preview, 2D/3D animation tools, and an AI-chat platform.
The built-in Browser app really browses (iframe-based, real URLs). It runs
in the browser sandbox - not a native bootable OS and does not run desktop
programs. Everything inside works for real: downloads really download into
the virtual file system, zips really extract (deflate), the interpreter
really executes code.

STORE + PUBLISH STUDIO (tested end to end):
Users upload a real zip (game, app, web game, VR app) through Publish
Studio: MossGuard scans it, mandatory rules and disclaimer boxes must be
checked, title/description/icon are entered, and it publishes live to the
Store where it can be installed and run. Honest limit: the OS is local-first
with no servers, so each published item lives on the publisher's device -
to share with other users, send them the zip file itself and they publish
it the same way. No fake cross-user server is claimed.

DEVICE SEPARATION:
Everything is stored in the browser's site storage - the OS never reads or
modifies your device's files unless you import them yourself. Windows:
nothing installed, delete the folder and it is gone. Linux: user-level only
(~/.local), uninstall.sh removes exactly what was added. Android: WebView
sandbox, only INTERNET/CAMERA/MICROPHONE permissions (camera/mic for the
OS's camera and recorder apps, requested at first use).

CHANGELOG (final for this release cycle):
- OS Lab: boot chooser offering real third-party open-source OSes - v86
  in-browser (Alpine, Arch, TinyCore, KolibriOS, FreeDOS, Minix 3, Haiku),
  WebVM Debian, JSLinux; plus SerenityOS, Redox OS, RISC OS Open, Plan 9
  directory (official sites only, rights to owners, nothing redistributed)
- On-Android section: Winlator (Wine + Box64 + Turnip/Zink, no root) and
  PojavLauncher (real Minecraft Java on Android, EULA-legal) with honest
  capability notes
- Pure-CSS icon tiles everywhere: zero emoji, zero SVG, zero image files
- True responsiveness: 320px phones to 4K, orientation handling, phone
  windows open maximized, full-screen start menu on small screens
- Publish Studio (real zip upload, MossGuard scan, rules, Store publishing),
  real zip extraction/downloads, C/C++/C#-subset interpreter, WebXR voxel VR
- Game Builder Kit (store-downloadable): code games/apps in-OS, test-run
  them live, build REAL zips in-OS (CRC32 + deflate) and publish through
  Publish Studio; Code Studio gained the same publish handoff; user-published
  items show "Developer: <username>", pre-made store items show none
- New automated end-to-end tests: publisher/store contract (4/4) and
  game builder zip round-trip (9/9) - all green
- APK 1.1: v1+v2+v3 signing, uncompressed resources.arsc, WebViewAssetLoader
  secure origin (Android 7.0+)
- Shell cleanup: removed ~2,500 lines of duplicated dead code
- Docs: architecture deep-dive with ASCII diagrams, CONTRIBUTING, honest
  ROADMAP, Android PC-compat container DESIGN doc, MIT LICENSE + NOTICE,
  reproducible Dockerfile build/test
- Tests: 84/84 apps, 15/15 fresh-PC, 11/11 browser zip/download, 10/10
  second boot, 11/11 interpreter, 6/6 VR engine, 4/4 publisher-store - all green

DISCLAIMER:
PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. In no
event shall the author be liable for any claim, damages, or other liability
arising from its use. For personal use. Published items are user content
under user responsibility; MossGuard performs local static analysis only and
no scanner can guarantee 100% detection. Back up anything you care about -
browser storage can be cleared at any time.

Free, offline, local-first. No paywalls, no accounts, no servers.
